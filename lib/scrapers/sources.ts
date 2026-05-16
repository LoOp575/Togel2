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
    game: "Hong Kong Mark Six",
    source: "Hong Kong Jockey Club Mark Six Results",
    sourceUrl: "https://bet.hkjc.com/en/marksix/results",
    supported4D: false,
    note: "Official Hong Kong lottery source is Mark Six, not a 4-digit draw. This app will not convert Mark Six into fake 4D results.",
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
