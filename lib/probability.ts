import type { HistoryEntry } from "@/types";

/**
 * Digit, position, and Markov-transition statistics.
 * These power the positionScore and chainScore sub-scores.
 */
export interface ProbabilityStats {
  totalDraws: number;
  /** Frequency of each digit 0..9 across ALL slots. */
  digitFrequency: number[];
  /** [position 0..3][digit 0..9] frequency at that slot. */
  positionFrequency: number[][];
  /** [position 0..3][digit 0..9] probability at that slot. */
  positionProbability: number[][];
  /** [from 0..9][to 0..9] adjacent-pair counts within a draw. */
  transitionFrequency: number[][];
  /** [from 0..9][to 0..9] = P(next = to | current = from). */
  transitionProbability: number[][];
  /** Top-3 most frequent digits across all slots. */
  hotDigits: number[];
  /** Bottom-3 least frequent digits. */
  coldDigits: number[];
  /** Adjacency pair count e.g. "47" -> n. */
  pairFrequency: Record<string, number>;
}

const UNIFORM_PRIOR = 0.1;

export function buildProbabilityStats(history: HistoryEntry[]): ProbabilityStats {
  const totalDraws = history.length;
  const digitFrequency = Array.from({ length: 10 }, () => 0);
  const positionFrequency: number[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 10 }, () => 0)
  );
  const transitionFrequency: number[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => 0)
  );
  const pairFrequency: Record<string, number> = {};

  for (const entry of history) {
    const [a, b, c, d] = entry.digits;
    digitFrequency[a]++;
    digitFrequency[b]++;
    digitFrequency[c]++;
    digitFrequency[d]++;

    positionFrequency[0][a]++;
    positionFrequency[1][b]++;
    positionFrequency[2][c]++;
    positionFrequency[3][d]++;

    const adj: Array<[number, number]> = [
      [a, b],
      [b, c],
      [c, d],
    ];
    for (const [from, to] of adj) {
      transitionFrequency[from][to]++;
      const key = `${from}${to}`;
      pairFrequency[key] = (pairFrequency[key] ?? 0) + 1;
    }
  }

  const positionProbability: number[][] = positionFrequency.map((row) =>
    row.map((c) => (totalDraws === 0 ? UNIFORM_PRIOR : c / totalDraws))
  );

  const transitionProbability: number[][] = transitionFrequency.map((row) => {
    const sum = row.reduce((s, v) => s + v, 0);
    if (sum === 0) return row.map(() => UNIFORM_PRIOR);
    return row.map((v) => v / sum);
  });

  const ranked = digitFrequency
    .map((freq, digit) => ({ digit, freq }))
    .sort((x, y) => y.freq - x.freq);
  const hotDigits = ranked.slice(0, 3).map((r) => r.digit);
  const coldDigits = ranked.slice(-3).map((r) => r.digit);

  return {
    totalDraws,
    digitFrequency,
    positionFrequency,
    positionProbability,
    transitionFrequency,
    transitionProbability,
    hotDigits,
    coldDigits,
    pairFrequency,
  };
}

/**
 * positionScore raw value: average P(digit at slot) across the 4 slots.
 * Returned in [0..1] range.
 */
export function positionScoreRaw(
  stats: ProbabilityStats,
  digits: [number, number, number, number]
): number {
  const p = stats.positionProbability;
  return (p[0][digits[0]] + p[1][digits[1]] + p[2][digits[2]] + p[3][digits[3]]) / 4;
}

/**
 * chainScore raw value: cube-root (geometric mean style) of the three
 * adjacent transition probabilities, with a tiny epsilon so a single 0 doesn't
 * obliterate the whole product. Returned in [0..1] range.
 */
export function chainScoreRaw(
  stats: ProbabilityStats,
  digits: [number, number, number, number]
): number {
  const t = stats.transitionProbability;
  const t1 = t[digits[0]][digits[1]];
  const t2 = t[digits[1]][digits[2]];
  const t3 = t[digits[2]][digits[3]];
  return Math.cbrt((t1 + 1e-6) * (t2 + 1e-6) * (t3 + 1e-6));
}
