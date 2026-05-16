import type { LiveDrawResult, LiveMarket } from "./types";
import { getLiveSource } from "./sources";
import { fetchSgp4D } from "./sgp";

export function isLiveMarket(value: string | null): value is LiveMarket {
  return value === "SGP" || value === "HK" || value === "SDY";
}

function unsupported(market: LiveMarket): LiveDrawResult {
  const source = getLiveSource(market);
  return {
    ...source,
    fetchedAt: new Date().toISOString(),
    ok: false,
    date: null,
    result: null,
    message: source.note,
    error: "Official source is not a supported 4D draw feed.",
  };
}

export async function fetchLiveDraw(market: LiveMarket): Promise<LiveDrawResult> {
  if (market === "SGP") return fetchSgp4D();
  return unsupported(market);
}
