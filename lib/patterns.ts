import type { HistoryEntry } from "@/types";

/**
 * Sum-distribution and shape-pattern statistics: odd/even, big/small, repeat.
 * These power both the sumScore and patternScore sub-scores.
 */
export interface PatternStats {
  totalDraws: number;
  /** sum (0..36) -> count */
  sumDistribution: Record<number, number>;
  /** Normalized 0..1 score for a given sum (count / max count). */
  sumNormalized: number[];
  /** "OEEO" -> count */
  oddEvenPattern: Record<string, number>;
  /** "BSBS" -> count */
  bigSmallPattern: Record<string, number>;
  repeatPattern: {
    allSame: number;
    threeSame: number;
    pair: number;
    allUnique: number;
  };
}

export type RepeatShape = "allSame" | "threeSame" | "pair" | "allUnique";

export function buildPatternStats(history: HistoryEntry[]): PatternStats {
  const sumDistribution: Record<number, number> = {};
  const oddEvenPattern: Record<string, number> = {};
  const bigSmallPattern: Record<string, number> = {};
  const repeatPattern = { allSame: 0, threeSame: 0, pair: 0, allUnique: 0 };

  for (const entry of history) {
    const [a, b, c, d] = entry.digits;

    const sum = a + b + c + d;
    sumDistribution[sum] = (sumDistribution[sum] ?? 0) + 1;

    const oe = entry.digits.map((x) => (x % 2 === 0 ? "E" : "O")).join("");
    oddEvenPattern[oe] = (oddEvenPattern[oe] ?? 0) + 1;

    const bs = entry.digits.map((x) => (x >= 5 ? "B" : "S")).join("");
    bigSmallPattern[bs] = (bigSmallPattern[bs] ?? 0) + 1;

    repeatPattern[classifyRepeat(entry.digits)]++;
  }

  // Normalize sum distribution to 0..1
  const sumNormalized: number[] = [];
  let maxCount = 0;
  for (let s = 0; s <= 36; s++) {
    const c = sumDistribution[s] ?? 0;
    if (c > maxCount) maxCount = c;
    sumNormalized[s] = c;
  }
  for (let s = 0; s <= 36; s++) {
    sumNormalized[s] = maxCount === 0 ? 0 : sumNormalized[s] / maxCount;
  }

  return {
    totalDraws: history.length,
    sumDistribution,
    sumNormalized,
    oddEvenPattern,
    bigSmallPattern,
    repeatPattern,
  };
}

export function classifyRepeat(digits: [number, number, number, number]): RepeatShape {
  const counts = new Map<number, number>();
  for (const x of digits) counts.set(x, (counts.get(x) ?? 0) + 1);
  if (counts.size === 1) return "allSame";
  const values = Array.from(counts.values());
  if (values.some((v) => v === 3)) return "threeSame";
  if (counts.size === 4) return "allUnique";
  return "pair";
}

export function sumScoreRaw(
  stats: PatternStats,
  digits: [number, number, number, number]
): number {
  const sum = digits[0] + digits[1] + digits[2] + digits[3];
  return stats.sumNormalized[sum] ?? 0;
}

/**
 * patternScore raw value: blend of historical OE / BS / repeat-shape rates
 * for this candidate's pattern. Returned in [0..1].
 */
export function patternScoreRaw(
  stats: PatternStats,
  digits: [number, number, number, number]
): number {
  const totalOE = sumValues(stats.oddEvenPattern) || 1;
  const totalBS = sumValues(stats.bigSmallPattern) || 1;
  const totalRepeat =
    stats.repeatPattern.allSame +
      stats.repeatPattern.threeSame +
      stats.repeatPattern.pair +
      stats.repeatPattern.allUnique || 1;

  const oeKey = digits.map((x) => (x % 2 === 0 ? "E" : "O")).join("");
  const bsKey = digits.map((x) => (x >= 5 ? "B" : "S")).join("");
  const oeProb = (stats.oddEvenPattern[oeKey] ?? 0) / totalOE;
  const bsProb = (stats.bigSmallPattern[bsKey] ?? 0) / totalBS;
  const rpProb = stats.repeatPattern[classifyRepeat(digits)] / totalRepeat;
  return (oeProb + bsProb + rpProb) / 3;
}

function sumValues(record: Record<string, number>): number {
  let total = 0;
  for (const v of Object.values(record)) total += v;
  return total;
}
