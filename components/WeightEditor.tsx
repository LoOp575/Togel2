"use client";

import { useMemo } from "react";
import type { ScoreWeights } from "@/types";

export interface WeightEditorProps {
  weights: ScoreWeights;
  onChange: (next: ScoreWeights) => void;
  onSave?: () => void;
  onNormalize?: () => void;
  onReset?: () => void;
  savedAt?: string | null;
}

interface FieldDef {
  key: keyof ScoreWeights;
  label: string;
  description: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "positionScore",
    label: "Position Score",
    description: "How likely each digit is to appear at its specific slot.",
  },
  {
    key: "chainScore",
    label: "Chain Score",
    description: "Adjacency / Markov-transition probability between digits.",
  },
  {
    key: "recencyScore",
    label: "Recency Score",
    description: "How recently each per-position digit has appeared.",
  },
  {
    key: "gapScore",
    label: "Gap Score",
    description: "Draws since this exact 4-digit number was last seen.",
  },
  {
    key: "sumScore",
    label: "Sum Score",
    description: "How typical the digit-sum is in the historical distribution.",
  },
  {
    key: "patternScore",
    label: "Pattern Score",
    description: "Odd/even, big/small and repeat-shape blend.",
  },
];

export function WeightEditor({
  weights,
  onChange,
  onSave,
  onNormalize,
  onReset,
  savedAt,
}: WeightEditorProps) {
  const total = useMemo(
    () =>
      weights.positionScore +
      weights.chainScore +
      weights.recencyScore +
      weights.gapScore +
      weights.sumScore +
      weights.patternScore,
    [weights]
  );
  const totalPct = total * 100;

  const update = (key: keyof ScoreWeights, value: number) => {
    onChange({ ...weights, [key]: Math.max(0, value) });
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="stat-label">Total weight</div>
          <div className="mono text-lg font-semibold text-white">{totalPct.toFixed(0)}%</div>
        </div>
        <div className="text-right text-xs text-gray-400">
          {savedAt ? (
            <span className="text-good">Saved at {savedAt}</span>
          ) : (
            <span className="text-warn">Unsaved changes</span>
          )}
        </div>
      </div>

      {FIELDS.map((f) => {
        const v = weights[f.key];
        const pct = v * 100;
        return (
          <div key={f.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-100">{f.label}</div>
                <div className="text-xs text-gray-400">{f.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={1}
                  min={0}
                  max={100}
                  value={Number(pct.toFixed(1))}
                  onChange={(e) => update(f.key, Number(e.target.value) / 100)}
                  className="input mono w-20 py-1 text-right text-xs"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => update(f.key, Number(e.target.value) / 100)}
              className="w-full accent-indigo-500"
            />
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 pt-2">
        {onSave ? (
          <button onClick={onSave} className="btn-primary">
            Save weights
          </button>
        ) : null}
        {onNormalize ? (
          <button onClick={onNormalize} className="btn">
            Normalize to 100%
          </button>
        ) : null}
        {onReset ? (
          <button onClick={onReset} className="btn">
            Reset to defaults
          </button>
        ) : null}
      </div>

      {Math.abs(total - 1) > 0.001 ? (
        <p className="text-xs text-amber-300">
          Total currently sums to {totalPct.toFixed(1)}%. Hit{" "}
          <span className="text-accent">Normalize</span> to scale all weights so they sum to 100%.
        </p>
      ) : null}
    </div>
  );
}
