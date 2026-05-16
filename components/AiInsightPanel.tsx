"use client";

import type { AiInsightResponse } from "@/lib/ai/types";

type Props = {
  insight: AiInsightResponse | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
};

export function AiInsightPanel({ insight, loading, error, onGenerate }: Props) {
  return (
    <div className="card space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="stat-label">AI Layer</p>
          <h2 className="font-semibold text-gray-100">AI Insight</h2>
        </div>
        <button onClick={onGenerate} disabled={loading} className="btn-primary text-xs">
          {loading ? "Thinking…" : "Generate"}
        </button>
      </div>

      {error ? <p className="rounded-md border border-bad/30 bg-bad/10 p-2 text-xs text-red-300">{error}</p> : null}

      {!insight ? (
        <p className="text-xs text-gray-400">
          Klik Generate untuk minta AI membaca Top 50 kandidat, hot/cold digit, pair aktif,
          dan pola historis. AI hanya menjelaskan dan memfilter, bukan menjamin hasil.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-300">Summary</p>
            <p className="text-xs leading-relaxed text-gray-400">{insight.summary}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-gray-300">AI Watchlist</p>
            <div className="space-y-2">
              {insight.watchlist.length === 0 ? (
                <p className="text-xs text-gray-500">Belum ada watchlist.</p>
              ) : (
                insight.watchlist.map((item) => (
                  <div key={item.number} className="rounded-md border border-bg-border bg-bg-soft p-2">
                    <div className="mono text-base font-semibold tracking-widest text-white">
                      {item.number}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">{item.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {Object.keys(insight.suggestedAdjustment).length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-300">Suggested adjustment</p>
              <ul className="space-y-1 text-xs text-gray-400">
                {Object.entries(insight.suggestedAdjustment).map(([key, value]) => (
                  <li key={key} className="flex justify-between gap-3">
                    <span>{key}</span>
                    <span className="mono text-gray-300">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="rounded-md border border-warn/30 bg-warn/10 p-2 text-[11px] text-amber-200">
            {insight.risk || "AI insight is explanatory only, not guaranteed prediction."}
          </p>
        </div>
      )}
    </div>
  );
}
