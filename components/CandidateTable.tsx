"use client";

import { useMemo, useState } from "react";
import type { RankedCandidate } from "@/types";

export interface CandidateTableProps {
  rows: RankedCandidate[];
  onSelect?: (row: RankedCandidate) => void;
  selectedNumber?: string | null;
  /** Initial page size. */
  pageSize?: number;
  /** Show only the first N rows (for "Top 20" view). Disables paging when set. */
  limit?: number;
  /** Hide the search/pagination controls. */
  compact?: boolean;
}

const CONFIDENCE_TONE: Record<RankedCandidate["confidence"], string> = {
  Low: "bg-bad/15 text-red-300 border-bad/30",
  Medium: "bg-warn/15 text-amber-300 border-warn/30",
  High: "bg-good/15 text-emerald-300 border-good/30",
};

export function CandidateTable({
  rows,
  onSelect,
  selectedNumber,
  pageSize = 25,
  limit,
  compact = false,
}: CandidateTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim();
    let r = rows;
    if (q && /^\d{1,4}$/.test(q)) {
      r = r.filter((row) => row.number.includes(q));
    }
    return r;
  }, [rows, query]);

  const limited = limit ? filtered.slice(0, limit) : filtered;
  const pages = limit ? 1 : Math.max(1, Math.ceil(limited.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = limit
    ? limited
    : limited.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="card overflow-hidden p-0">
      {!compact ? (
        <div className="flex flex-col gap-2 border-b border-bg-border bg-bg-soft px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-400">
            {limited.length.toLocaleString()} candidates{limit ? ` (showing top ${limit})` : ""}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search digits e.g. 472"
              className="input mono w-44 py-1 text-xs"
              inputMode="numeric"
              maxLength={4}
            />
            {!limit ? (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <button
                  className="btn px-2 py-1 text-xs"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                >
                  Prev
                </button>
                <span className="mono">
                  {safePage + 1}/{pages}
                </span>
                <button
                  className="btn px-2 py-1 text-xs"
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={safePage >= pages - 1}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={limit ? "" : "max-h-[640px] overflow-auto"}>
        <table className="table">
          <thead>
            <tr>
              <th className="w-14">Rank</th>
              <th>Number</th>
              <th className="text-right">Final</th>
              <th className="hidden text-right md:table-cell">Position</th>
              <th className="hidden text-right md:table-cell">Chain</th>
              <th className="hidden text-right md:table-cell">Recency</th>
              <th className="hidden text-right md:table-cell">Gap</th>
              <th className="hidden text-right md:table-cell">Pattern</th>
              <th className="hidden text-right md:table-cell">Day</th>
              <th className="text-right">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const isSelected = r.number === selectedNumber;
              return (
                <tr
                  key={r.number}
                  className={`cursor-pointer ${isSelected ? "bg-accent/10" : ""}`}
                  onClick={() => onSelect?.(r)}
                >
                  <td className="mono text-gray-400">#{r.rank}</td>
                  <td className="mono text-base font-semibold tracking-widest text-white">
                    {r.number}
                  </td>
                  <td className="mono text-right font-semibold text-accent">
                    {r.finalScore.toFixed(2)}
                  </td>
                  <td className="mono hidden text-right text-gray-300 md:table-cell">
                    {r.positionScore.toFixed(1)}
                  </td>
                  <td className="mono hidden text-right text-gray-300 md:table-cell">
                    {r.chainScore.toFixed(1)}
                  </td>
                  <td className="mono hidden text-right text-gray-300 md:table-cell">
                    {r.recencyScore.toFixed(1)}
                  </td>
                  <td className="mono hidden text-right text-gray-300 md:table-cell">
                    {r.gapScore.toFixed(1)}
                  </td>
                  <td className="mono hidden text-right text-gray-300 md:table-cell">
                    {r.patternScore.toFixed(1)}
                  </td>
                  <td className="mono hidden text-right text-gray-300 md:table-cell">
                    {r.dayScore.toFixed(1)}
                  </td>
                  <td className="text-right">
                    <span className={`pill border ${CONFIDENCE_TONE[r.confidence]}`}>
                      {r.confidence}
                    </span>
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-sm text-gray-500">
                  No candidates match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}