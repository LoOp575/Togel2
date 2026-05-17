import type { HistoryEntry } from "@/types";
import { dayIndexFromDate } from "./dayOfWeek";

const TWO_PI = Math.PI * 2;
const DAYS_IN_CYCLE = 7;
const EPSILON = 1e-9;

export type EulerPhaseResult = {
  support: number[];
  peakDayIndex: Array<number | null>;
  peakDayWeight: number[];
  nextAngle: number | null;
};

export function dayAngle(dayIndex: number): number {
  return (TWO_PI * dayIndex) / DAYS_IN_CYCLE;
}

function normalize01(values: number[]) {
  const max = Math.max(...values, 0);
  if (max <= EPSILON) return values.map(() => 0.5);
  return values.map((value) => Math.max(0, Math.min(1, value / max)));
}

/**
 * Euler phase fit for a weekly cycle.
 *
 * We map each day to an angle theta = 2*pi*day/7. For every digit, we build
 * a weighted circular vector from the days where it historically appeared.
 * The digit's peak phase is the vector angle. The fit to the next day is:
 *
 *   phaseFit = (cos(theta_next - theta_peak) + 1) / 2
 *
 * Output is normalized to 0..100 for easy blending with other supports.
 */
export function buildEulerPhaseSupport(
  history: HistoryEntry[],
  nextDayIndex: number | null
): EulerPhaseResult {
  if (nextDayIndex === null || history.length === 0) {
    return {
      support: Array.from({ length: 10 }, () => 50),
      peakDayIndex: Array.from({ length: 10 }, () => null),
      peakDayWeight: Array.from({ length: 10 }, () => 0),
      nextAngle: null,
    };
  }

  const sinSum = Array.from({ length: 10 }, () => 0);
  const cosSum = Array.from({ length: 10 }, () => 0);
  const totalWeight = Array.from({ length: 10 }, () => 0);
  const dayDigitWeight = Array.from({ length: 10 }, () =>
    Array.from({ length: DAYS_IN_CYCLE }, () => 0)
  );

  history.forEach((entry, index) => {
    const dayIndex = dayIndexFromDate(entry.date);
    if (dayIndex === null) return;

    // Gentle recency decay: newest rows slightly influence phase more than older rows.
    const age = history.length - 1 - index;
    const weight = Math.pow(0.985, age);
    const angle = dayAngle(dayIndex);

    for (const digit of entry.digits) {
      sinSum[digit] += Math.sin(angle) * weight;
      cosSum[digit] += Math.cos(angle) * weight;
      totalWeight[digit] += weight;
      dayDigitWeight[digit][dayIndex] += weight;
    }
  });

  const nextAngle = dayAngle(nextDayIndex);
  const rawSupport = Array.from({ length: 10 }, (_, digit) => {
    if (totalWeight[digit] <= EPSILON) return 0.5;

    const peakAngle = Math.atan2(sinSum[digit], cosSum[digit]);
    const phaseFit = (Math.cos(nextAngle - peakAngle) + 1) / 2;
    const strength = Math.min(1, Math.hypot(sinSum[digit], cosSum[digit]) / totalWeight[digit]);

    // Keep neutral behavior when phase direction is weak/noisy.
    return 0.5 + (phaseFit - 0.5) * strength;
  });

  const normalized = normalize01(rawSupport).map((value) => value * 100);
  const peakDayIndex = dayDigitWeight.map((weights) => {
    const best = weights.reduce(
      (acc, value, index) => (value > acc.value ? { value, index } : acc),
      { value: 0, index: -1 }
    );
    return best.index >= 0 ? best.index : null;
  });
  const peakDayWeight = dayDigitWeight.map((weights) => Math.max(...weights, 0));

  return { support: normalized, peakDayIndex, peakDayWeight, nextAngle };
}
