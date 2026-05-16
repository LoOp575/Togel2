import type { LiveMarket, LiveSourceConfig } from "./types";

export const LIVE_SOURCES: Record<LiveMarket, LiveSourceConfig> = {
  SGP: {
    market: "SGP",
    game: "Singapore 4D",
    source: "Singapore Pools 4D Results",
    sourceUrl: "https://www.singaporepools.com.sg/en/product/pages/4d_results.aspx",
    supported4D: true,
    note: "Official 4D source. Parser uses public page text and may fail if the site changes markup or blocks server-side fetches.",
  },
  HK: {
    market: "HK",
    game: "HK 4D",
    source: "HongKong Fun Lotto HK draw page (user supplied)",
    sourceUrl: "https://hongkongfunlotto.net/",
    supported4D: true,
    note: "User-supplied HK 4D source. Verify the fetched number against the page before adding it to permanent history.",
  },
  SDY: {
    market: "SDY",
    game: "Australia / NSW lottery results",
    source: "The Lott Results",
    sourceUrl: "https://www.thelott.com/results",
    supported4D: false,
    note: "Official Australian lottery sources do not provide the common 'Sydney 4D' aggregator format. Add a trusted 4D source before enabling parsing.",
  },
};

export function getLiveSource(market: LiveMarket) {
  return LIVE_SOURCES[market];
}
