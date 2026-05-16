"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveDrawCard } from "@/components/LiveDrawCard";
import { PageHeader } from "@/components/PageHeader";
import type { LiveDrawResult, LiveMarket } from "@/lib/scrapers/types";
import { LIVE_MARKETS } from "@/lib/scrapers/types";

type LiveState = Record<LiveMarket, LiveDrawResult | null>;
type LoadingState = Record<LiveMarket, boolean>;

const initialLive: LiveState = { SGP: null, HK: null, SDY: null };
const initialLoading: LoadingState = { SGP: false, HK: false, SDY: false };

export default function LivePage() {
  const [live, setLive] = useState<LiveState>(initialLive);
  const [loading, setLoading] = useState<LoadingState>(initialLoading);

  const refresh = useCallback(async (market: LiveMarket) => {
    setLoading((current) => ({ ...current, [market]: true }));
    try {
      const response = await fetch(`/api/draws/live?market=${market}`, { cache: "no-store" });
      const json = (await response.json()) as { data?: LiveDrawResult; error?: string };
      if (json.data) {
        setLive((current) => ({ ...current, [market]: json.data ?? null }));
      } else {
        setLive((current) => ({
          ...current,
          [market]: {
            market,
            game: `${market} Live Draw`,
            source: "Unknown",
            sourceUrl: "",
            fetchedAt: new Date().toISOString(),
            ok: false,
            supported4D: false,
            date: null,
            result: null,
            error: json.error ?? "Live API returned no data.",
          },
        }));
      }
    } catch (error) {
      setLive((current) => ({
        ...current,
        [market]: {
          market,
          game: `${market} Live Draw`,
          source: "Unknown",
          sourceUrl: "",
          fetchedAt: new Date().toISOString(),
          ok: false,
          supported4D: false,
          date: null,
          result: null,
          error: error instanceof Error ? error.message : "Unknown live API error",
        },
      }));
    } finally {
      setLoading((current) => ({ ...current, [market]: false }));
    }
  }, []);

  useEffect(() => {
    LIVE_MARKETS.forEach((market) => void refresh(market));
  }, [refresh]);

  return (
    <>
      <PageHeader
        title="Live Draw"
        description="Fetch latest public draw data when a trusted source is available. Verify the source before adding any live result to permanent history."
        actions={
          <button
            className="btn-primary"
            onClick={() => LIVE_MARKETS.forEach((market) => void refresh(market))}
          >
            Refresh all
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {LIVE_MARKETS.map((market) => (
          <LiveDrawCard
            key={market}
            market={market}
            data={live[market]}
            loading={loading[market]}
            onRefresh={refresh}
          />
        ))}
      </div>

      <div className="card text-sm text-gray-400">
        <h2 className="mb-2 font-semibold text-gray-200">How to use this safely</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>SGP uses the official Singapore Pools 4D public results page.</li>
          <li>HK official source is Mark Six, not 4D, so it is shown as unsupported instead of inventing a 4D result.</li>
          <li>SDY official Australian lottery pages do not match the common Sydney 4D aggregator format.</li>
          <li>For permanent history, copy verified results into data/history.json or add a database later.</li>
        </ul>
      </div>
    </>
  );
}
