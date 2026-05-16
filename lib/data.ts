import historyJson from "@/data/history.json";
import { loadUserSuppliedHkHistory } from "@/data/hk-history";
import type { HistoryEntry, RawHistoryEntry } from "@/types";
import { parseHistory } from "./parser";

let cached: HistoryEntry[] | null = null;

/**
 * Load and cache the parsed history. Safe to call from server and client
 * components since the JSON/table data is statically bundled at build time.
 */
export function loadHistory(): HistoryEntry[] {
  if (cached) return cached;

  const userSuppliedHk = loadUserSuppliedHkHistory();
  const fallbackSample = historyJson as RawHistoryEntry[];

  // Prefer the larger user-supplied HK table. Keep JSON fallback for demos/tests.
  cached = parseHistory(userSuppliedHk.length > 0 ? userSuppliedHk : fallbackSample);
  return cached;
}
