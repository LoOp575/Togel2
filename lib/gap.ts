import type { HistoryEntry } from "@/types";

/**
 * For each exact 4-digit number that has appeared, how many draws ago did it
 * last appear? (0 = appeared in the most recent draw)
 */
export interface GapStats {
  lastSeen: Record<string, number>;
  totalDraws: number;
}

export function buildGapStats(history: HistoryEntry[]): GapStats {
  const lastSeen: Record<string, number> = {};
  for (let i = history.length - 1; i >= 0; i--) {
    const num = history[i].result;
    if (!(num in lastSeen)) {
      lastSeen[num] = history.length - 1 - i;
    }
  }
  return { lastSeen, totalDraws: history.length };
}

/**
 * gapScore raw value in [0..1]: how long since this exact number last appeared,
 * normalized by total draws. Numbers that have never appeared get 1.
 *
 * Note: for any specific 4-digit number the expected return time is ~10000
 * draws, so this score rewards numbers that haven't shown up in the recent
 * history window.
 */
export function gapScoreRaw(stats: GapStats, number: string): number {
  if (stats.totalDraws === 0) return 0;
  const gapDraws = number in stats.lastSeen ? stats.lastSeen[number] : stats.totalDraws;
  return Math.min(1, gapDraws / Math.max(1, stats.totalDraws));
}
