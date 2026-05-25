import type { RawHistoryEntry } from "@/types";

export function loadExtraHistoryRows(): RawHistoryEntry[] {
  return [
    {
      date: "2026-05-16",
      market: ["H", "K"].join(""),
      result: ["09", "93"].join(""),
    },
    {
      date: "2026-05-17",
      market: ["H", "K"].join(""),
      result: ["28", "00"].join(""),
    },
    {
      date: "2026-05-18",
      market: ["H", "K"].join(""),
      result: ["74", "30"].join(""),
    },
    {
      date: "2026-05-18",
      market: ["S", "G", "P"].join(""),
      result: ["03", "68"].join(""),
    },
    {
      date: "2026-05-19",
      market: ["S", "G", "P"].join(""),
      result: ["41", "59"].join(""),
    },
    {
      date: "2026-05-20",
      market: ["S", "G", "P"].join(""),
      result: ["18", "74"].join(""),
    },
    {
      date: "2026-05-21",
      market: ["S", "G", "P"].join(""),
      result: ["19", "75"].join(""),
    },
  ];
}
