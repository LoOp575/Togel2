"use client";

import type { LiveDrawResult, LiveMarket } from "@/lib/scrapers/types";

type Props = {
  market: LiveMarket;
  data: LiveDrawResult | null;
  loading: boolean;
  onRefresh: (market: LiveMarket) => void;
};

export function LiveDrawCard({ market, data, loading, onRefresh }: Props) {
  const status = loading ? "Loading" : data?.ok ? "Ready" : "Needs source";
  const tone = loading ? "text-warn" : data?.ok ? "text-good" : "text-bad";

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="stat-label">{market}</div>
          <h2 className="text-lg font-semibold text-white">{data?.game ?? "Live Draw"}</h2>
        </div>
        <span className={`pill ${tone}`}>{status}</span>
      </div>

      <div className="rounded-lg border border-bg-border bg-bg-soft p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-gray-500">Latest result</div>
        <div className="mono mt-1 text-3xl font-bold tracking-[0.35em] text-white">
          {loading ? "...." : data?.result ?? "—"}
        </div>
        <div className="mt-1 text-xs text-gray-500">{data?.date ?? "No 4D result loaded"}</div>
      </div>

      <div className="space-y-1 text-xs text-gray-400">
        <p>
          <span className="text-gray-500">Source:</span> {data?.source ?? "—"}
        </p>
        {data?.sourceUrl ? (
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-accent hover:underline"
          >
            Open source →
          </a>
        ) : null}
        <p>
          <span className="text-gray-500">Fetched:</span>{" "}
          {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : "—"}
        </p>
        {data?.message ? <p className="text-gray-500">{data.message}</p> : null}
        {data?.error ? <p className="text-bad">{data.error}</p> : null}
      </div>

      <button onClick={() => onRefresh(market)} disabled={loading} className="btn w-full">
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
