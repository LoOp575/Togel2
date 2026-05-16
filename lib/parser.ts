import type { HistoryEntry, RawHistoryEntry } from "@/types";

/**
 * Pad a 4-digit result so leading zeroes are preserved.
 * Accepts string or number, returns a "0000".."9999" string.
 */
export function normalizeResult(raw: string | number): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  s = s.replace(/\D/g, "");
  if (s.length === 0) return "";
  if (s.length > 4) s = s.slice(-4);
  return s.padStart(4, "0");
}

/** Validate that a raw row can be parsed into a HistoryEntry. */
export function isValidRaw(entry: RawHistoryEntry): boolean {
  if (!entry) return false;
  if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
  if (typeof entry.market !== "string" || entry.market.length === 0) return false;
  const result = normalizeResult(entry.result);
  return /^\d{4}$/.test(result);
}

export function toHistoryEntry(raw: RawHistoryEntry): HistoryEntry | null {
  if (!isValidRaw(raw)) return null;
  const result = normalizeResult(raw.result);
  const digits: [number, number, number, number] = [
    Number(result[0]),
    Number(result[1]),
    Number(result[2]),
    Number(result[3]),
  ];
  return {
    date: raw.date,
    market: raw.market.toUpperCase(),
    result,
    digits,
  };
}

/** Drop invalid rows and sort ascending by date. */
export function parseHistory(raw: RawHistoryEntry[]): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryEntry[] = [];
  for (const r of raw) {
    const entry = toHistoryEntry(r);
    if (entry) out.push(entry);
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

export function filterByMarket(history: HistoryEntry[], market: string): HistoryEntry[] {
  if (!market || market.toUpperCase() === "ALL") return history;
  const m = market.toUpperCase();
  return history.filter((h) => h.market === m);
}

export function listMarkets(history: HistoryEntry[]): string[] {
  return Array.from(new Set(history.map((h) => h.market))).sort();
}

/** Convert "0123" -> [0,1,2,3]. */
export function digitsOf(num: string): [number, number, number, number] {
  return [Number(num[0]), Number(num[1]), Number(num[2]), Number(num[3])];
}

/** Format a candidate index 0..9999 -> "0000".."9999". */
export function formatCandidate(n: number): string {
  return n.toString().padStart(4, "0");
}
