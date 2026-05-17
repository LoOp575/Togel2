import type { RawHistoryEntry } from "@/types";

export function loadExtraHistoryRows(): RawHistoryEntry[] {
  return [
    {
      date: "2026-05-16",
      market: ["H", "K"].join(""),
      result: ["09", "93"].join(""),
    },
  ];
}
