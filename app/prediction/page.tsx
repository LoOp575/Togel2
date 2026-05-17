"use client";

import { useEffect, useMemo, useState } from "react";
import { AiChatPanel } from "@/components/AiChatPanel";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { CandidateTable } from "@/components/CandidateTable";
import { PageHeader } from "@/components/PageHeader";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { StatCard } from "@/components/StatCard";
import { buildInsightPayload } from "@/lib/ai/buildInsightPayload";
import type { AiInsightResponse } from "@/lib/ai/types";
import { loadHistory } from "@/lib/data";
import { getNextDrawContext } from "@/lib/dayOfWeek";
import { listMarkets, parseHistory } from "@/lib/parser";
import { scoreAllCandidates } from "@/lib/scoring";
import { loadWeights } from "@/lib/settings";
import {
  DEFAULT_WEIGHTS,
  type HistoryEntry,
  type RankedCandidate,
  type RawHistoryEntry,
  type ScoreWeights,
} from "@/types";

type SourceMode = "bundled" | "scrapedHK";

type ScrapedHistoryPayload = {
  ok: boolean;
  data?: {
    ok: boolean;
    count: number;
    draws: RawHistoryEntry[];
    source: string;
    sourceUrl: string;
    fetchedAt: string;
    message?: string;
    error?: string;
  };
  error?: string;
};

type AiApiResponse = {
  ok: boolean;
  data?: AiInsightResponse;
  error?: string;
};

export default function PredictionPage() {
  const bundled = useMemo(() => loadHistory(), []);
  const [sourceMode, setSourceMode] = useState<SourceMode>("bundled");
  const [scrapedHistory, setScrapedHistory] = useState<HistoryEntry[]>([]);
  const [scrapeMessage, setScrapeMessage] = useState<string>("");
  const [scrapeLoading, setScrapeLoading] = useState(false);

  const all = sourceMode === "scrapedHK" && scrapedHistory.length > 0 ? scrapedHistory : bundled;
  const markets = useMemo(() => ["ALL", ...listMarkets(all)], [all]);
  const [market, setMarket] = useState("ALL");
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [view, setView] = useState<"top20" | "all">("top20");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [computing, setComputing] = useState(true);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [selected, setSelected] = useState<RankedCandidate | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsightResponse | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setWeights(loadWeights());
  }, []);

  useEffect(() => {
    if (!markets.includes(market)) setMarket("ALL");
  }, [market, markets]);

  async function fetchScrapedHKHistory() {
    setScrapeLoading(true);
    setScrapeMessage("Fetching HK draw history from configured source...");
    try {
      const response = await fetch("/api/draws/history?market=HK", { cache: "no-store" });
      const payload = (await response.json()) as ScrapedHistoryPayload;
      if (!payload.data?.draws) {
        setScrapeMessage(payload.error ?? "Scraped history API returned no data.");
        return;
      }

      const parsed = parseHistory(payload.data.draws);
      if (parsed.length === 0) {
        setScrapeMessage(payload.data.error ?? "No valid HK 4D history rows were found.");
        return;
      }

      setScrapedHistory(parsed);
      setSourceMode("scrapedHK");
      setMarket("HK");
      setScrapeMessage(
        `Loaded ${parsed.length} HK draws from ${payload.data.source}. Verify source before relying on it.`
      );
    } catch (error) {
      setScrapeMessage(error instanceof Error ? error.message : "Unknown scraped history error");
    } finally {
      setScrapeLoading(false);
    }
  }

  async function generateAiInsight() {
    setAiLoading(true);
    setAiError("");
    try {
      const filtered = market === "ALL" ? all : all.filter((h) => h.market === market);
      const payload = buildInsightPayload({
        market,
        history: filtered,
        ranked,
        weights,
        topLimit: 50,
      });

      const response = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as AiApiResponse;
      if (json.data) setAiInsight(json.data);
      if (!json.ok) setAiError(json.error ?? "AI insight gagal dibuat.");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unknown AI insight error");
    } finally {
      setAiLoading(false);
    }
  }

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
  const activeHistory = market === "ALL" ? all : all.filter((h) => h.market === market);
  const dayContext = getNextDrawContext(activeHistory);
  const activeDrawCount = activeHistory.length;
  const top10AvgScore =
    ranked.length === 0
      ? 0
      : ranked.slice(0, 10).reduce((s, r) => s + r.finalScore, 0) / 10;
  const chatContext = {
    market,
    nextDrawDay: dayContext.nextDayName,
    latestDraw: activeHistory.at(-1) ?? null,
    weights,
    selectedCandidate: selected,
    topCandidates: ranked.slice(0, 20).map((candidate) => ({
      rank: candidate.rank,
      number: candidate.number,
      finalScore: Number(candidate.finalScore.toFixed(2)),
      positionScore: Number(candidate.positionScore.toFixed(2)),
      chainScore: Number(candidate.chainScore.toFixed(2)),
      recencyScore: Number(candidate.recencyScore.toFixed(2)),
      gapScore: Number(candidate.gapScore.toFixed(2)),
      sumScore: Number(candidate.sumScore.toFixed(2)),
      patternScore: Number(candidate.patternScore.toFixed(2)),
      dayScore: Number(candidate.dayScore.toFixed(2)),
      confidence: candidate.confidence,
    })),
  };

  return (
    <>
      <PageHeader
        title="AI Prediction Terminal"
        description="Ask the AI for candidate numbers. The ranking engine runs silently in the background and only appears in Advanced Data."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={sourceMode}
              onChange={(e) => setSourceMode(e.target.value as SourceMode)}
              className="input w-44 py-1 text-xs"
            >
              <option value="bundled">Bundled history</option>
              <option value="scrapedHK" disabled={scrapedHistory.length === 0}>
                Scraped HK history
              </option>
            </select>
            <button
              onClick={fetchScrapedHKHistory}
              disabled={scrapeLoading}
              className="btn py-1 text-xs"
            >
              {scrapeLoading ? "Fetching HK..." : "Fetch HK history"}
            </button>
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
          </div>
        }
      />

      {scrapeMessage ? <div className="card-tight text-xs text-gray-400">{scrapeMessage}</div> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          label="AI Mode"
          value={computing ? "Syncing" : "Ready"}
          hint="Ask chat to reveal candidates"
          tone={computing ? "warn" : "good"}
        />
        <StatCard
          label="Next Draw Day"
          value={dayContext.nextDayName ?? "—"}
          hint={dayContext.latestDraw ? `After ${dayContext.latestDraw.result}` : "Need history"}
          tone="warn"
        />
        <StatCard
          label="Training Draws"
          value={activeDrawCount.toLocaleString()}
          hint={sourceMode === "scrapedHK" ? "Scraped source" : "Bundled data"}
        />
        <StatCard
          label="Engine Health"
          value={top10AvgScore.toFixed(2)}
          hint="Top-10 average score"
        />
        <StatCard
          label="Ranked Pool"
          value={ranked.length.toLocaleString()}
          hint="Hidden candidates"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AiChatPanel context={chatContext} />
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="stat-label">Advanced Data</p>
                <h2 className="font-semibold text-gray-100">Hidden Ranking Engine</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Tabel probabilitas disembunyikan supaya angka rekomendasi keluar lewat AI Chat.
                </p>
              </div>
              <button className="btn text-xs" onClick={() => setShowAdvanced((v) => !v)}>
                {showAdvanced ? "Hide" : "Show"}
              </button>
            </div>
            {showAdvanced ? (
              <div className="space-y-3">
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
                <CandidateTable
                  rows={ranked}
                  onSelect={setSelected}
                  selectedNumber={selected?.number ?? null}
                  limit={view === "top20" ? 20 : undefined}
                  compact={view === "top20"}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          <AiInsightPanel
            insight={aiInsight}
            loading={aiLoading}
            error={aiError}
            onGenerate={generateAiInsight}
          />
          {showAdvanced ? <ScoreBreakdown candidate={selected} weights={weights} /> : null}
          <div className="card text-xs text-gray-400">
            <p className="mb-1 font-semibold text-gray-300">Current weights</p>
            <ul className="space-y-1">
              <WeightRow label="Position" value={weights.positionScore} />
              <WeightRow label="Chain" value={weights.chainScore} />
              <WeightRow label="Recency" value={weights.recencyScore} />
              <WeightRow label="Gap" value={weights.gapScore} />
              <WeightRow label="Sum" value={weights.sumScore} />
              <WeightRow label="Pattern" value={weights.patternScore} />
              <WeightRow label="Day" value={weights.dayScore} />
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