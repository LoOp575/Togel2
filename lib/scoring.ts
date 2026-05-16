import type {
  HistoryEntry,
  RankedCandidate,
  ScoreWeights,
} from "@/types";
import { DEFAULT_WEIGHTS } from "@/types";
import { buildDayOfWeekStats, dayScoreRaw, type DayOfWeekStats } from "./dayOfWeek";
import { digitsOf, formatCandidate } from "./parser";
import {
  buildProbabilityStats,
  chainScoreRaw,
  positionScoreRaw,
  type ProbabilityStats,
} from "./probability";
import { buildRecencyStats, recencyScoreRaw, type RecencyStats } from "./recency";
import { buildGapStats, gapScoreRaw, type GapStats } from "./gap";
import {
  buildPatternStats,
  patternScoreRaw,
  sumScoreRaw,
  type PatternStats,
} from "./patterns";

/**
 * Combined statistics needed by the scoring engine.
 */
export interface CombinedStats {
  probability: ProbabilityStats;
  recency: RecencyStats;
  gap: GapStats;
  pattern: PatternStats;
  dayOfWeek: DayOfWeekStats;
}

export function buildCombinedStats(history: HistoryEntry[]): CombinedStats {
  return {
    probability: buildProbabilityStats(history),
    recency: buildRecencyStats(history),
    gap: buildGapStats(history),
    pattern: buildPatternStats(history),
    dayOfWeek: buildDayOfWeekStats(history),
  };
}

/**
 * Score every candidate from "0000" to "9999" and return them ranked.
 *
 * Final score formula v2:
 *   finalScore = 0.28 * positionScore
 *              + 0.20 * chainScore
 *              + 0.15 * recencyScore
 *              + 0.10 * gapScore
 *              + 0.10 * sumScore
 *              + 0.05 * patternScore
 *              + 0.12 * dayScore
 *
 * Each sub-score is normalized to a 0..100 scale across all 10000 candidates,
 * then combined linearly with the configured weights.
 */
export function scoreAllCandidates(
  history: HistoryEntry[],
  weights: ScoreWeights = DEFAULT_WEIGHTS
): RankedCandidate[] {
  const stats = buildCombinedStats(history);

  if (stats.probability.totalDraws === 0) {
    return emptyRanking();
  }

  // -- compute raw values -----------------------------------------------------
  const raw: Array<{
    number: string;
    pos: number;
    chain: number;
    recency: number;
    gap: number;
    sum: number;
    pattern: number;
    day: number;
  }> = new Array(10000);

  let bestPos = 0,
    bestChain = 0,
    bestRecency = 0,
    bestGap = 0,
    bestSum = 0,
    bestPattern = 0,
    bestDay = 0;

  for (let n = 0; n < 10000; n++) {
    const number = formatCandidate(n);
    const digits = digitsOf(number);

    const pos = positionScoreRaw(stats.probability, digits);
    const chain = chainScoreRaw(stats.probability, digits);
    const recency = recencyScoreRaw(stats.recency, digits);
    const gap = gapScoreRaw(stats.gap, number);
    const sum = sumScoreRaw(stats.pattern, digits);
    const pattern = patternScoreRaw(stats.pattern, digits);
    const day = dayScoreRaw(stats.dayOfWeek, digits);

    if (pos > bestPos) bestPos = pos;
    if (chain > bestChain) bestChain = chain;
    if (recency > bestRecency) bestRecency = recency;
    if (gap > bestGap) bestGap = gap;
    if (sum > bestSum) bestSum = sum;
    if (pattern > bestPattern) bestPattern = pattern;
    if (day > bestDay) bestDay = day;

    raw[n] = { number, pos, chain, recency, gap, sum, pattern, day };
  }

  const safe = (x: number) => (x === 0 ? 1 : x);

  // -- combine ----------------------------------------------------------------
  const candidates: RankedCandidate[] = raw.map((r) => {
    const positionScore = (r.pos / safe(bestPos)) * 100;
    const chainScore = (r.chain / safe(bestChain)) * 100;
    const recencyScore = (r.recency / safe(bestRecency)) * 100;
    const gapScore = (r.gap / safe(bestGap)) * 100;
    const sumScore = (r.sum / safe(bestSum)) * 100;
    const patternScore = (r.pattern / safe(bestPattern)) * 100;
    const dayScore = (r.day / safe(bestDay)) * 100;

    const finalScore =
      positionScore * weights.positionScore +
      chainScore * weights.chainScore +
      recencyScore * weights.recencyScore +
      gapScore * weights.gapScore +
      sumScore * weights.sumScore +
      patternScore * weights.patternScore +
      dayScore * weights.dayScore;

    return {
      rank: 0, // assigned after sort
      number: r.number,
      finalScore,
      positionScore,
      chainScore,
      recencyScore,
      gapScore,
      sumScore,
      patternScore,
      dayScore,
      confidence: confidenceLabel(finalScore),
    };
  });

  candidates.sort((a, b) => b.finalScore - a.finalScore);
  candidates.forEach((c, i) => {
    c.rank = i + 1;
  });
  return candidates;
}

function confidenceLabel(finalScore: number): "Low" | "Medium" | "High" {
  if (finalScore >= 75) return "High";
  if (finalScore >= 50) return "Medium";
  return "Low";
}

/** Rank (1-based) of a number in the list, or 0 if missing. */
export function findRank(ranked: RankedCandidate[], number: string): number {
  for (const r of ranked) if (r.number === number) return r.rank;
  return 0;
}

export function weightsAreValid(weights: ScoreWeights): boolean {
  const total = sumWeights(weights);
  return total > 0.99 && total < 1.01;
}

export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const total = sumWeights(weights);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  return {
    positionScore: weights.positionScore / total,
    chainScore: weights.chainScore / total,
    recencyScore: weights.recencyScore / total,
    gapScore: weights.gapScore / total,
    sumScore: weights.sumScore / total,
    patternScore: weights.patternScore / total,
    dayScore: weights.dayScore / total,
  };
}

function sumWeights(w: ScoreWeights): number {
  return (
    w.positionScore +
    w.chainScore +
    w.recencyScore +
    w.gapScore +
    w.sumScore +
    w.patternScore +
    w.dayScore
  );
}

function emptyRanking(): RankedCandidate[] {
  const out: RankedCandidate[] = [];
  for (let n = 0; n < 10000; n++) {
    out.push({
      rank: n + 1,
      number: formatCandidate(n),
      finalScore: 0,
      positionScore: 0,
      chainScore: 0,
      recencyScore: 0,
      gapScore: 0,
      sumScore: 0,
      patternScore: 0,
      dayScore: 0,
      confidence: "Low",
    });
  }
  return out;
}
