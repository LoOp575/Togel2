"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { loadHistory } from "@/lib/data";
import { listMarkets } from "@/lib/parser";

export default function HistoryPage() {
  const all = useMemo(() => loadHistory(), []);
  const markets = useMemo(() => ["ALL", ...listMarkets(all)], [all]);
  const [market, setMarket] = useState("ALL");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let r = market === "ALL" ? all : all.filter((x) => x.market === market);
    const q = query.trim();
    if (q) {
      if (/^\d{1,4}$/.test(q)) r = r.filter((x) => x.result.includes(q));
      else r = r.filter((x) => x.date.includes(q));
    }
    return [...r].reverse(); // newest first
  }, [all, market, query]);

  return (
    <>
      <PageHeader
        title="History"
        description="Raw draws bundled with the engine. Result strings are parsed and zero-padded."
      />

      <div className="card flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label className="stat-label">Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="input w-32 py-1 text-xs"
          >
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <label className="stat-label">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="digits or date"
            className="input py-1 text-xs"
          />
        </div>
        <div className="text-xs text-gray-400">{rows.length} rows</div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="max-h-[640px] overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-32">Date</th>
                <th>Market</th>
                <th>Result</th>
                <th className="hidden text-right md:table-cell">Digits</th>
                <th className="text-right">Sum</th>
                <th className="hidden text-right md:table-cell">O/E</th>
                <th className="hidden text-right md:table-cell">B/S</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const sum = d.digits.reduce((s, v) => s + v, 0);
                const oe = d.digits.map((x) => (x % 2 === 0 ? "E" : "O")).join("");
                const bs = d.digits.map((x) => (x >= 5 ? "B" : "S")).join("");
                return (
                  <tr key={`${d.date}-${d.market}-${d.result}`}>
                    <td className="mono text-gray-400">{d.date}</td>
                    <td>
                      <span className="pill">{d.market}</span>
                    </td>
                    <td className="mono text-base font-semibold tracking-widest text-white">
                      {d.result}
                    </td>
                    <td className="mono hidden text-right text-gray-400 md:table-cell">
                      {d.digits.join("·")}
                    </td>
                    <td className="mono text-right">{sum}</td>
                    <td className="mono hidden text-right text-gray-300 md:table-cell">{oe}</td>
                    <td className="mono hidden text-right text-gray-300 md:table-cell">{bs}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                    No matching draws.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
