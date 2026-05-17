import historyJson from "@/data/history.json";
import { loadExtraHistoryRows } from "@/data/extra-history";
import { loadUserSuppliedHkHistory } from "@/data/hk-history";
import type { HistoryEntry, RawHistoryEntry } from "@/types";
import { parseHistory } from "./parser";

let cached: HistoryEntry[] | null = null;

function mergeRows(rows: RawHistoryEntry[]): RawHistoryEntry[] {
  const map = new Map<string, RawHistoryEntry>();
  for (const row of rows) {
    const result = String(row.result).padStart(4, "0");
    const key = `${row.date}-${row.market}-${result}`;
    map.set(key, { ...row, result });
  }
  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * Load and cache the parsed history. Safe to call from server and client
 * components since the JSON/table data is statically bundled at build time.
 */
export function loadHistory(): HistoryEntry[] {
  if (cached) return cached;

  const userSuppliedHk = loadUserSuppliedHkHistory();
  const extraRows = loadExtraHistoryRows();
  const fallbackSample = historyJson as RawHistoryEntry[];
  const baseRows = userSuppliedHk.length > 0 ? userSuppliedHk : fallbackSample;

  cached = parseHistory(mergeRows([...baseRows, ...extraRows]));
  return cached;
}
