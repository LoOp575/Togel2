import type { HistoryEntry, RankedCandidate, ScoreWeights } from "@/types";
import { analyze } from "@/lib/analyzer";
import type { AiInsightPayload } from "./types";

function topEntries<T extends Record<string, number>>(record: T, limit: number) {
  return Object.entries(record)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildInsightPayload(params: {
  market: string;
  history: HistoryEntry[];
  ranked: RankedCandidate[];
  weights: ScoreWeights;
  topLimit?: number;
}): AiInsightPayload {
  const { market, history, ranked, weights, topLimit = 50 } = params;
  const stats = analyze(history);
  const latestDraw = history.length > 0 ? history[history.length - 1] : null;

  const topPairs = topEntries(stats.pairFrequency, 12).map((x) => ({
    pair: x.key,
    count: x.count,
  }));

  const topSums = Object.entries(stats.sumDistribution)
    .map(([sum, count]) => ({ sum: Number(sum), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const oddEvenTop = topEntries(stats.oddEvenPattern, 8).map((x) => ({
    pattern: x.key,
    count: x.count,
  }));

  const bigSmallTop = topEntries(stats.bigSmallPattern, 8).map((x) => ({
    pattern: x.key,
    count: x.count,
  }));

  return {
    market,
    latestDraw: latestDraw
      ? {
          date: latestDraw.date,
          market: latestDraw.market,
          result: latestDraw.result,
        }
      : null,
    totalDraws: history.length,
    weights,
    topCandidates: ranked.slice(0, topLimit).map((candidate) => ({
      rank: candidate.rank,
      number: candidate.number,
      finalScore: Number(candidate.finalScore.toFixed(2)),
      positionScore: Number(candidate.positionScore.toFixed(2)),
      chainScore: Number(candidate.chainScore.toFixed(2)),
      recencyScore: Number(candidate.recencyScore.toFixed(2)),
      gapScore: Number(candidate.gapScore.toFixed(2)),
      sumScore: Number(candidate.sumScore.toFixed(2)),
      patternScore: Number(candidate.patternScore.toFixed(2)),
      confidence: candidate.confidence,
    })),
    stats: {
      hotDigits: stats.hotDigits,
      coldDigits: stats.coldDigits,
      topPairs,
      topSums,
      oddEvenTop,
      bigSmallTop,
    },
  };
}
