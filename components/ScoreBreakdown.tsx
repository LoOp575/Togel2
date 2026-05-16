"use client";

import type { RankedCandidate, ScoreWeights } from "@/types";

export interface ScoreBreakdownProps {
  candidate: RankedCandidate | null;
  weights: ScoreWeights;
}

interface Row {
  key: keyof ScoreWeights;
  label: string;
  value: number;
  weight: number;
}

export function ScoreBreakdown({ candidate, weights }: ScoreBreakdownProps) {
  if (!candidate) {
    return (
      <div className="card text-sm text-gray-400">
        Select a number from the table to view its score breakdown.
      </div>
    );
  }

  const rows: Row[] = [
    {
      key: "positionScore",
      label: "Position Score",
      value: candidate.positionScore,
      weight: weights.positionScore,
    },
    {
      key: "chainScore",
      label: "Chain Score",
      value: candidate.chainScore,
      weight: weights.chainScore,
    },
    {
      key: "recencyScore",
      label: "Recency Score",
      value: candidate.recencyScore,
      weight: weights.recencyScore,
    },
    {
      key: "gapScore",
      label: "Gap Score",
      value: candidate.gapScore,
      weight: weights.gapScore,
    },
    {
      key: "sumScore",
      label: "Sum Score",
      value: candidate.sumScore,
      weight: weights.sumScore,
    },
    {
      key: "patternScore",
      label: "Pattern Score",
      value: candidate.patternScore,
      weight: weights.patternScore,
    },
  ];

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="stat-label">Score Breakdown</div>
          <div className="mono text-2xl font-bold tracking-widest text-white">
            {candidate.number}
          </div>
        </div>
        <div className="text-right">
          <div className="stat-label">Final Score</div>
          <div className="mono text-2xl font-bold text-accent">
            {candidate.finalScore.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400">Rank #{candidate.rank}</div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => {
          const contribution = r.value * r.weight;
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">
                  {r.label}{" "}
                  <span className="text-gray-500">× {(r.weight * 100).toFixed(0)}%</span>
                </span>
                <span className="mono text-gray-400">
                  {r.value.toFixed(1)} → {contribution.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, Math.max(0, r.value))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-bg-border pt-2 text-[11px] text-gray-500">
        Final = Σ (sub-score × weight). Higher = stronger historical alignment, never a guarantee.
      </div>
    </div>
  );
}
