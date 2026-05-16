import type { HistoryEntry } from "@/types";

/**
 * For each (position, digit), how many draws ago was that digit last seen at
 * that slot? Infinity if never seen at that slot.
 */
export interface RecencyStats {
  /** [position 0..3][digit 0..9] -> draws since last seen at that slot. */
  lastDigitSeenAtPosition: number[][];
  totalDraws: number;
}

export function buildRecencyStats(history: HistoryEntry[]): RecencyStats {
  const last: number[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 10 }, () => Infinity)
  );

  for (let pos = 0; pos < 4; pos++) {
    for (let d = 0; d < 10; d++) {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].digits[pos] === d) {
          last[pos][d] = history.length - 1 - i;
          break;
        }
      }
    }
  }
  return { lastDigitSeenAtPosition: last, totalDraws: history.length };
}

/**
 * Translate "draws since last seen" into a 0..1 freshness score per position,
 * then average across the 4 slots. The curve peaks around the digit's expected
 * return time (~10 draws under a uniform model).
 */
export function recencyScoreRaw(
  stats: RecencyStats,
  digits: [number, number, number, number]
): number {
  const last = stats.lastDigitSeenAtPosition;
  let sum = 0;
  for (let pos = 0; pos < 4; pos++) {
    sum += positionRecency(last[pos][digits[pos]]);
  }
  return sum / 4;
}

const EXPECTED_RETURN = 10;

function positionRecency(gap: number): number {
  if (!Number.isFinite(gap)) return 0.5; // never seen at this slot - neutral
  const ratio = gap / EXPECTED_RETURN;
  // Triangular-style curve: 1 at ratio=1, fading toward 0 at 0 or 2.5+.
  return Math.max(0, 1 - Math.abs(ratio - 1) / 1.5);
}
