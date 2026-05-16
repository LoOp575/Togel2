// Core domain types for the 4D Probability Engine

export interface RawHistoryEntry {
  date: string;
  market: string;
  result: string | number;
}

export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  market: string;
  result: string; // always 4-digit, zero-padded
  digits: [number, number, number, number];
}

export interface AnalyzerStats {
  totalDraws: number;
  digitFrequency: number[]; // length 10, frequency of each digit 0-9 across all positions
  positionFrequency: number[][]; // [position 0..3][digit 0..9]
  pairFrequency: Record<string, number>; // "ab" -> count, position-aware adjacent
  transitionFrequency: number[][]; // [from 0..9][to 0..9] aggregated over positions
  hotDigits: number[];
  coldDigits: number[];
  sumDistribution: Record<number, number>;
  oddEvenPattern: Record<string, number>;
  bigSmallPattern: Record<string, number>;
  repeatPattern: {
    allSame: number;
    threeSame: number;
    pair: number;
    allUnique: number;
  };
  lastSeen: Record<string, number>; // 4-digit -> draws since last seen
  lastDigitSeenAtPosition: number[][]; // [position][digit] -> draws since last seen
}

export interface ScoreWeights {
  positionScore: number; // 0.35
  chainScore: number; // 0.25
  recencyScore: number; // 0.15
  gapScore: number; // 0.10
  sumScore: number; // 0.10
  patternScore: number; // 0.05
}

export interface CandidateScore {
  number: string;
  finalScore: number;
  positionScore: number;
  chainScore: number;
  recencyScore: number;
  gapScore: number;
  sumScore: number;
  patternScore: number;
  confidence: "Low" | "Medium" | "High";
}

export interface RankedCandidate extends CandidateScore {
  rank: number;
}

export interface BacktestBucketResult {
  hits: number;
  draws: number;
  hitRate: number;
}

export interface BacktestResult {
  totalDraws: number;
  evaluatedDraws: number;
  averageRank: number;
  medianRank: number;
  bestRank: number;
  worstRank: number;
  buckets: {
    top10: BacktestBucketResult;
    top50: BacktestBucketResult;
    top100: BacktestBucketResult;
    top500: BacktestBucketResult;
  };
  perDraw: Array<{
    date: string;
    market: string;
    actual: string;
    rank: number;
  }>;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  positionScore: 0.35,
  chainScore: 0.25,
  recencyScore: 0.15,
  gapScore: 0.1,
  sumScore: 0.1,
  patternScore: 0.05,
};
