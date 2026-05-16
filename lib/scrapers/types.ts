export type LiveMarket = "SGP" | "HK" | "SDY";

export type LiveDrawResult = {
  market: LiveMarket;
  game: string;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  ok: boolean;
  supported4D: boolean;
  date: string | null;
  result: string | null;
  numbers?: string[];
  message?: string;
  error?: string;
};

export type LiveSourceConfig = {
  market: LiveMarket;
  game: string;
  source: string;
  sourceUrl: string;
  supported4D: boolean;
  note: string;
};

export const LIVE_MARKETS: LiveMarket[] = ["SGP", "HK", "SDY"];
