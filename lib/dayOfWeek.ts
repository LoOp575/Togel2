import type { HistoryEntry } from "@/types";
import { buildPatternStats, patternScoreRaw, sumScoreRaw } from "./patterns";
import { buildProbabilityStats, chainScoreRaw, positionScoreRaw } from "./probability";

export const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

export type DayName = (typeof DAY_NAMES)[number];

export interface DayContext {
  latestDraw: HistoryEntry | null;
  latestDayIndex: number | null;
  nextDayIndex: number | null;
  nextDayName: DayName | null;
}

export interface DayOfWeekStats {
  targetDayIndex: number | null;
  targetDayName: DayName | null;
  historyForDay: HistoryEntry[];
}

export function dayIndexFromDate(date: string): number | null {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDay();
}

export function getNextDrawContext(history: HistoryEntry[]): DayContext {
  const latestDraw = history.length > 0 ? history[history.length - 1] : null;
  const latestDayIndex = latestDraw ? dayIndexFromDate(latestDraw.date) : null;
  const nextDayIndex = latestDayIndex === null ? null : (latestDayIndex + 1) % 7;
  const nextDayName = nextDayIndex === null ? null : DAY_NAMES[nextDayIndex];
  return { latestDraw, latestDayIndex, nextDayIndex, nextDayName };
}

export function buildDayOfWeekStats(history: HistoryEntry[]): DayOfWeekStats {
  const ctx = getNextDrawContext(history);
  const historyForDay =
    ctx.nextDayIndex === null
      ? []
      : history.filter((entry) => dayIndexFromDate(entry.date) === ctx.nextDayIndex);

  return {
    targetDayIndex: ctx.nextDayIndex,
    targetDayName: ctx.nextDayName,
    historyForDay,
  };
}

/**
 * Day score blends same-day position, chain, sum, and pattern behavior.
 * It intentionally stays neutral when the same-day sample is too small.
 */
export function dayScoreRaw(stats: DayOfWeekStats, digits: [number, number, number, number]): number {
  if (stats.historyForDay.length < 4) return 0.5;

  const probability = buildProbabilityStats(stats.historyForDay);
  const pattern = buildPatternStats(stats.historyForDay);

  const pos = positionScoreRaw(probability, digits);
  const chain = chainScoreRaw(probability, digits);
  const sum = sumScoreRaw(pattern, digits);
  const shape = patternScoreRaw(pattern, digits);

  return pos * 0.45 + chain * 0.25 + sum * 0.2 + shape * 0.1;
}
