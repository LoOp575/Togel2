"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { runBacktest } from "@/lib/backtest";
import { loadHistory } from "@/lib/data";
import { listMarkets } from "@/lib/parser";
import { loadWeights } from "@/lib/settings";
import { DEFAULT_WEIGHTS, type BacktestResult, type ScoreWeights } from "@/types";

export default function BacktestPage() {
  const all = useMemo(() => loadHistory(), []);
  const markets = useMemo(() => ["ALL", ...listMarkets(all)], [all]);
  const [market, setMarket] = useState("ALL");
  const [warmup, setWarmup] = useState(20);
  const [maxEvaluations, setMaxEvaluations] = useState(40);
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  useEffect(() => {
    setWeights(loadWeights());
  }, []);

  const run = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      const filtered = market === "ALL" ? all : all.filter((h) => h.market === market);
      const r = runBacktest(filtered, weights, { warmup, maxEvaluations });
      setResult(r);
      setRunning(false);
    }, 16);
  };

  return (
    <>
      <PageHeader
        title="Backtest"
        description="Rolling backtest: train on draws up to t-1, score 0000–9999, then look up where the actual draw at t ranked."
      />

      <div className="card grid gap-3 md:grid-cols-4">
        <div>
          <label className="stat-label">Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="input mt-1 py-1 text-xs"
          >
            {markets.map((m) => (
              <option key={m} value={m}>
                {m === "ALL" ? "All markets" : m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="stat-label">Warmup draws</label>
          <input
            type="number"
            min={5}
            value={warmup}
            onChange={(e) => setWarmup(Math.max(5, Number(e.target.value) || 0))}
            className="input mono mt-1 py-1 text-xs"
          />
        </div>
        <div>
          <label className="stat-label">Max evaluations</label>
          <input
            type="number"
            min={1}
            value={maxEvaluations}
            onChange={(e) => setMaxEvaluations(Math.max(1, Number(e.target.value) || 0))}
            className="input mono mt-1 py-1 text-xs"
          />
        </div>
        <div className="flex items-end">
          <button onClick={run} disabled={running} className="btn-primary w-full">
            {running ? "Running…" : "Run backtest"}
          </button>
        </div>
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Top-10 hit rate"
              value={`${(result.buckets.top10.hitRate * 100).toFixed(2)}%`}
              hint={`${result.buckets.top10.hits} / ${result.buckets.top10.draws}`}
              tone="good"
            />
            <StatCard
              label="Top-50 hit rate"
              value={`${(result.buckets.top50.hitRate * 100).toFixed(2)}%`}
              hint={`${result.buckets.top50.hits} / ${result.buckets.top50.draws}`}
              tone="good"
            />
            <StatCard
              label="Top-100 hit rate"
              value={`${(result.buckets.top100.hitRate * 100).toFixed(2)}%`}
              hint={`${result.buckets.top100.hits} / ${result.buckets.top100.draws}`}
              tone="accent"
            />
            <StatCard
              label="Top-500 hit rate"
              value={`${(result.buckets.top500.hitRate * 100).toFixed(2)}%`}
              hint={`${result.buckets.top500.hits} / ${result.buckets.top500.draws}`}
              tone="accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Average rank"
              value={result.averageRank.toFixed(1)}
              hint="Lower is better. 5000 = random."
            />
            <StatCard label="Median rank" value={result.medianRank.toLocaleString()} />
            <StatCard label="Best rank" value={`#${result.bestRank.toLocaleString()}`} tone="good" />
            <StatCard label="Worst rank" value={`#${result.worstRank.toLocaleString()}`} tone="bad" />
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b border-bg-border bg-bg-soft px-3 py-2 text-xs text-gray-400">
              Per-draw rankings ({result.evaluatedDraws} evaluations)
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Market</th>
                    <th>Actual</th>
                    <th className="text-right">Rank</th>
                    <th className="hidden text-right md:table-cell">Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perDraw.map((d) => {
                    const bucket =
                      d.rank > 0 && d.rank <= 10
                        ? "Top 10"
                        : d.rank <= 50
                        ? "Top 50"
                        : d.rank <= 100
                        ? "Top 100"
                        : d.rank <= 500
                        ? "Top 500"
                        : "Outside";
                    const tone =
                      d.rank > 0 && d.rank <= 50
                        ? "text-emerald-300"
                        : d.rank <= 500
                        ? "text-amber-300"
                        : "text-gray-400";
                    return (
                      <tr key={`${d.date}-${d.market}`}>
                        <td className="mono text-gray-400">{d.date}</td>
                        <td>
                          <span className="pill">{d.market}</span>
                        </td>
                        <td className="mono tracking-widest text-white">{d.actual}</td>
                        <td className={`mono text-right ${tone}`}>#{d.rank.toLocaleString()}</td>
                        <td className={`mono hidden text-right md:table-cell ${tone}`}>
                          {bucket}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : running ? (
        <div className="card text-sm text-gray-400">Running rolling backtest…</div>
      ) : (
        <div className="card text-sm text-gray-400">
          Configure the parameters above and click <span className="text-accent">Run backtest</span>{" "}
          to evaluate the engine against past draws.
        </div>
      )}
    </>
  );
}
