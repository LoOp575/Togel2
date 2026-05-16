import type { AnalyzerStats, HistoryEntry } from "@/types";
import { buildGapStats } from "./gap";
import { buildPatternStats } from "./patterns";
import { buildProbabilityStats } from "./probability";
import { buildRecencyStats } from "./recency";

/**
 * Aggregate every per-feature stats module into a single AnalyzerStats object
 * for the Analyzer page UI.
 */
export function analyze(history: HistoryEntry[]): AnalyzerStats {
  const probability = buildProbabilityStats(history);
  const recency = buildRecencyStats(history);
  const gap = buildGapStats(history);
  const pattern = buildPatternStats(history);

  return {
    totalDraws: probability.totalDraws,
    digitFrequency: probability.digitFrequency,
    positionFrequency: probability.positionFrequency,
    pairFrequency: probability.pairFrequency,
    transitionFrequency: probability.transitionFrequency,
    hotDigits: probability.hotDigits,
    coldDigits: probability.coldDigits,
    sumDistribution: pattern.sumDistribution,
    oddEvenPattern: pattern.oddEvenPattern,
    bigSmallPattern: pattern.bigSmallPattern,
    repeatPattern: pattern.repeatPattern,
    lastSeen: gap.lastSeen,
    lastDigitSeenAtPosition: recency.lastDigitSeenAtPosition,
  };
}
