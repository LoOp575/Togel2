import historyJson from "@/data/history.json";
import { loadExtraHistoryRows } from "@/data/extra-history";
import { loadUserSuppliedHkHistory } from "@/data/hk-history";
import type { HistoryEntry, RawHistoryEntry } from "@/types";
import { parseHistory } from "./parser";
import { getRuntimeHistoryRows } from "./runtimeHistory";

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
 * Load and parse history. Runtime manual rows are intentionally not cached so
 * dashboard refreshes can immediately read newly added live draw inputs.
 */
export function loadHistory(): HistoryEntry[] {
  const userSuppliedHk = loadUserSuppliedHkHistory();
  const extraRows = loadExtraHistoryRows();
  const runtimeRows = getRuntimeHistoryRows();
  const fallbackSample = historyJson as RawHistoryEntry[];
  const baseRows = userSuppliedHk.length > 0 ? userSuppliedHk : fallbackSample;

  return parseHistory(mergeRows([...baseRows, ...extraRows, ...runtimeRows]));
}
