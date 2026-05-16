import historyJson from "@/data/history.json";
import type { HistoryEntry, RawHistoryEntry } from "@/types";
import { parseHistory } from "./parser";

let cached: HistoryEntry[] | null = null;

/**
 * Load and cache the parsed history. Safe to call from server and client
 * components since the JSON is statically bundled at build time.
 */
export function loadHistory(): HistoryEntry[] {
  if (cached) return cached;
  cached = parseHistory(historyJson as RawHistoryEntry[]);
  return cached;
}
