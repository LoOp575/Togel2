import type { AnalyzerStats, RankedCandidate, ScoreWeights } from "@/types";

export type AiInsightWatchlistItem = {
  number: string;
  reason: string;
};

export type AiInsightResponse = {
  summary: string;
  watchlist: AiInsightWatchlistItem[];
  risk: string;
  suggestedAdjustment: Record<string, string>;
};

export type AiInsightPayload = {
  market: string;
  nextDrawDay: string | null;
  latestDraw: {
    date: string;
    market: string;
    result: string;
  } | null;
  totalDraws: number;
  weights: ScoreWeights;
  topCandidates: Array<Pick<RankedCandidate,
    | "rank"
    | "number"
    | "finalScore"
    | "positionScore"
    | "chainScore"
    | "recencyScore"
    | "gapScore"
    | "sumScore"
    | "patternScore"
    | "dayScore"
    | "confidence"
  >>;
  stats: {
    hotDigits: AnalyzerStats["hotDigits"];
    coldDigits: AnalyzerStats["coldDigits"];
    topPairs: Array<{ pair: string; count: number }>;
    topSums: Array<{ sum: number; count: number }>;
    oddEvenTop: Array<{ pattern: string; count: number }>;
    bigSmallTop: Array<{ pattern: string; count: number }>;
  };
};