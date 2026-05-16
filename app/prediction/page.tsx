"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidateTable } from "@/components/CandidateTable";
import { PageHeader } from "@/components/PageHeader";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { StatCard } from "@/components/StatCard";
import { loadHistory } from "@/lib/data";
import { listMarkets } from "@/lib/parser";
import { scoreAllCandidates } from "@/lib/scoring";
import { loadWeights } from "@/lib/settings";
import { DEFAULT_WEIGHTS, type RankedCandidate, type ScoreWeights } from "@/types";

export default function PredictionPage() {
  const all = useMemo(() => loadHistory(), []);
  const markets = useMemo(() => ["ALL", ...listMarkets(all)], [all]);
  const [market, setMarket] = useState("ALL");
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [view, setView] = useState<"top20" | "all">("top20");
  const [computing, setComputing] = useState(true);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [selected, setSelected] = useState<RankedCandidate | null>(null);

  useEffect(() => {
    setWeights(loadWeights());
  }, []);

  useEffect(() => {
    setComputing(true);
    const id = setTimeout(() => {
      const filtered = market === "ALL" ? all : all.filter((h) => h.market === market);
      const result = scoreAllCandidates(filtered, weights);
      setRanked(result);
      setSelected(result[0] ?? null);
      setComputing(false);
    }, 16);
    return () => clearTimeout(id);
  }, [all, market, weights]);

  const top = ranked[0];
  const top10AvgScore =
    ranked.length === 0
      ? 0
      : ranked.slice(0, 10).reduce((s, r) => s + r.finalScore, 0) / 10;

  return (
    <>
      <PageHeader
        title="Prediction"
        description="Ranked candidates 0000–9999 weighted by your scoring formula. Click any row to inspect its sub-score breakdown."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="input w-40 py-1 text-xs"
            >
              {markets.map((m) => (
                <option key={m} value={m}>
                  {m === "ALL" ? "All markets" : m}
                </option>
              ))}
            </select>
            <div className="flex rounded-md border border-bg-border bg-bg-soft p-0.5">
              <button
                onClick={() => setView("top20")}
                className={`rounded px-2.5 py-1 text-xs ${
                  view === "top20" ? "bg-accent text-white" : "text-gray-400"
                }`}
              >
                Top 20
              </button>
              <button
                onClick={() => setView("all")}
                className={`rounded px-2.5 py-1 text-xs ${
                  view === "all" ? "bg-accent text-white" : "text-gray-400"
                }`}
              >
                All 10,000
              </button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Top Candidate"
          value={top ? <span className="mono tracking-widest">{top.number}</span> : "—"}
          hint={top ? `Final score ${top.finalScore.toFixed(2)}` : undefined}
          tone="accent"
        />
        <StatCard
          label="Top-10 Avg Score"
          value={top10AvgScore.toFixed(2)}
          hint="Mean final score of the top 10"
        />
        <StatCard
          label="Candidates Ranked"
          value={ranked.length.toLocaleString()}
          hint="0000 through 9999"
        />
        <StatCard
          label="Status"
          value={computing ? "Computing…" : "Ready"}
          tone={computing ? "warn" : "good"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CandidateTable
            rows={ranked}
            onSelect={setSelected}
            selectedNumber={selected?.number ?? null}
            limit={view === "top20" ? 20 : undefined}
            compact={view === "top20"}
          />
        </div>
        <div className="space-y-3">
          <ScoreBreakdown candidate={selected} weights={weights} />
          <div className="card text-xs text-gray-400">
            <p className="mb-1 font-semibold text-gray-300">Current weights</p>
            <ul className="space-y-1">
              <WeightRow label="Position" value={weights.positionScore} />
              <WeightRow label="Chain" value={weights.chainScore} />
              <WeightRow label="Recency" value={weights.recencyScore} />
              <WeightRow label="Gap" value={weights.gapScore} />
              <WeightRow label="Sum" value={weights.sumScore} />
              <WeightRow label="Pattern" value={weights.patternScore} />
            </ul>
            <p className="mt-2 text-[11px] text-gray-500">Adjust these on the Settings page.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function WeightRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className="mono">{(value * 100).toFixed(0)}%</span>
    </li>
  );
}
