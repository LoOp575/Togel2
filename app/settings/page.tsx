"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WeightEditor } from "@/components/WeightEditor";
import { normalizeWeights } from "@/lib/scoring";
import { loadWeights, resetWeights, saveWeights } from "@/lib/settings";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "@/types";

export default function SettingsPage() {
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setWeights(loadWeights());
  }, []);

  const onChange = (next: ScoreWeights) => {
    setWeights(next);
    setSavedAt(null);
  };

  const onSave = () => {
    saveWeights(weights);
    setSavedAt(new Date().toLocaleTimeString());
  };

  const onNormalize = () => {
    setWeights((w) => normalizeWeights(w));
    setSavedAt(null);
  };

  const onReset = () => {
    setWeights(resetWeights());
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Tune the scoring formula. Weights are stored in your browser only."
      />

      <WeightEditor
        weights={weights}
        onChange={onChange}
        onSave={onSave}
        onNormalize={onNormalize}
        onReset={onReset}
        savedAt={savedAt}
      />

      <div className="card text-xs text-gray-400">
        <p className="mb-2 text-sm font-semibold text-gray-200">Default formula</p>
        <pre className="mono whitespace-pre-wrap rounded-md border border-bg-border bg-bg-soft p-3 text-[12px] leading-relaxed text-gray-300">
{`finalScore =
  35% * positionScore  +
  25% * chainScore     +
  15% * recencyScore   +
  10% * gapScore       +
  10% * sumScore       +
   5% * patternScore`}
        </pre>
        <p className="mt-2 text-[11px] text-gray-500">
          Click <span className="text-accent">Reset to defaults</span> to restore the original
          weights.
        </p>
      </div>
    </>
  );
}
