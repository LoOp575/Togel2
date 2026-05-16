import type {
  BacktestResult,
  HistoryEntry,
  ScoreWeights,
} from "@/types";
import { DEFAULT_WEIGHTS } from "@/types";
import { findRank, scoreAllCandidates } from "./scoring";

export interface BacktestOptions {
  /** Minimum history size before the engine starts evaluating. */
  warmup?: number;
  /** Cap evaluations to keep the UI responsive. */
  maxEvaluations?: number;
}

/**
 * Rolling backtest: walk forward through history. For each draw at index i
 * (i >= warmup), train on history[0..i-1], score 0000-9999, look up where the
 * actual draw at index i lands.
 *
 * Returns top-10 / top-50 / top-100 / top-500 hit rates and rank stats.
 */
export function runBacktest(
  history: HistoryEntry[],
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  options: BacktestOptions = {}
): BacktestResult {
  const warmup = Math.max(5, options.warmup ?? 20);
  const totalDraws = history.length;

  const empty: BacktestResult = {
    totalDraws,
    evaluatedDraws: 0,
    averageRank: 0,
    medianRank: 0,
    bestRank: 0,
    worstRank: 0,
    buckets: {
      top10: { hits: 0, draws: 0, hitRate: 0 },
      top50: { hits: 0, draws: 0, hitRate: 0 },
      top100: { hits: 0, draws: 0, hitRate: 0 },
      top500: { hits: 0, draws: 0, hitRate: 0 },
    },
    perDraw: [],
  };

  if (totalDraws <= warmup) return empty;

  let startIdx = warmup;
  if (options.maxEvaluations && totalDraws - warmup > options.maxEvaluations) {
    startIdx = totalDraws - options.maxEvaluations;
  }

  const ranks: number[] = [];
  const perDraw: BacktestResult["perDraw"] = [];

  for (let i = startIdx; i < totalDraws; i++) {
    const train = history.slice(0, i);
    const ranked = scoreAllCandidates(train, weights);
    const actual = history[i];
    const rank = findRank(ranked, actual.result);
    ranks.push(rank);
    perDraw.push({
      date: actual.date,
      market: actual.market,
      actual: actual.result,
      rank,
    });
  }

  if (ranks.length === 0) return empty;

  const evaluatedDraws = ranks.length;
  const sum = ranks.reduce((s, v) => s + v, 0);
  const sorted = [...ranks].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const inTop = (n: number) => ranks.filter((r) => r > 0 && r <= n).length;
  const top10Hits = inTop(10);
  const top50Hits = inTop(50);
  const top100Hits = inTop(100);
  const top500Hits = inTop(500);

  return {
    totalDraws,
    evaluatedDraws,
    averageRank: sum / evaluatedDraws,
    medianRank: median,
    bestRank: best,
    worstRank: worst,
    buckets: {
      top10: { hits: top10Hits, draws: evaluatedDraws, hitRate: top10Hits / evaluatedDraws },
      top50: { hits: top50Hits, draws: evaluatedDraws, hitRate: top50Hits / evaluatedDraws },
      top100: {
        hits: top100Hits,
        draws: evaluatedDraws,
        hitRate: top100Hits / evaluatedDraws,
      },
      top500: {
        hits: top500Hits,
        draws: evaluatedDraws,
        hitRate: top500Hits / evaluatedDraws,
      },
    },
    perDraw,
  };
}
