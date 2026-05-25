import type { RawHistoryEntry } from "@/types";

const KEY = "__ARUNG_RUNTIME_HISTORY__";

type RuntimeGlobal = typeof globalThis & {
  [KEY]?: RawHistoryEntry[];
};

function store(): RawHistoryEntry[] {
  const g = globalThis as RuntimeGlobal;
  if (!g[KEY]) g[KEY] = [];
  return g[KEY];
}

export function getRuntimeHistoryRows(): RawHistoryEntry[] {
  return [...store()];
}

export function addRuntimeHistoryRow(row: RawHistoryEntry): RawHistoryEntry {
  const normalized: RawHistoryEntry = {
    date: String(row.date),
    market: String(row.market || "HK").toUpperCase(),
    result: String(row.result).padStart(4, "0").slice(-4),
  };

  const rows = store();
  const key = `${normalized.date}-${normalized.market}-${normalized.result}`;
  const exists = rows.some((item) => `${item.date}-${item.market}-${String(item.result).padStart(4, "0")}` === key);

  if (!exists) rows.push(normalized);
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return normalized;
}

export function clearRuntimeHistoryRows() {
  store().length = 0;
}
