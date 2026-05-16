import type { RawHistoryEntry } from "@/types";

/**
 * Corrected user-supplied HK draw history table.
 *
 * The user confirmed the latest known draw is:
 *   Jumat / 2026-05-15 / 3811
 *
 * The table is arranged Sen-Sel-Rab-Kam-Jum-Sab-Min. We anchor the last
 * available cell (3811) to 2026-05-15 and calculate all previous row/column
 * dates backward from that anchor, so recency/gap/backtest order stays correct.
 */
const LATEST_KNOWN_DATE = "2026-05-15"; // Jumat, result 3811
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

const HK_RAW_TABLE = `
Sen Sel Rab Kam Jum Sab Min
- - - 1498 2213 1782 7885
8593 9693 2903 9457 4288 6390 7174
3318 5242 4946 8698 1126 2389 1002
8727 6203 7990 7364 2920 2377 0697
1305 9463 0167 8533 0207 4732 6718
9155 2345 1055 6819 2244 9910 0083
1620 3626 6554 2147 7289 4925 8839
6587 3907 0705 4915 4533 6623 6440
7736 3006 6314 9675 0788 7300 4988
5501 6013 6653 6363 7754 6604 6316
0214 2674 2533 2771 1064 5240 9302
6945 6945 3907 0948 2974 3782 1054
9776 9640 8703 2524 7919 0805 7675
4733 5711 2037 6738 6548 4874 1239
4288 6764 3878 4002 8273 4503 9268
7222 7711 8900 6378 3577 5642 7183
6451 5560 7489 5125 3758 6616 5544
5668 1737 4513 5649 5452 3978 2825
9389 6134 2906 1233 0801 1977 2525
9070 9474 7880 0571 3811 - -
`;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseRows(): string[][] {
  return HK_RAW_TABLE.trim()
    .split(/\n+/)
    .slice(1)
    .map((row) => row.trim().split(/\s+/));
}

function findLatestCell(rows: string[][]): { rowIndex: number; colIndex: number } {
  for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
    for (let colIndex = DAYS.length - 1; colIndex >= 0; colIndex--) {
      if (/^\d{4}$/.test(rows[rowIndex]?.[colIndex] ?? "")) {
        return { rowIndex, colIndex };
      }
    }
  }
  return { rowIndex: 0, colIndex: 0 };
}

export function loadUserSuppliedHkHistory(): RawHistoryEntry[] {
  const rows = parseRows();
  const latest = findLatestCell(rows);
  const latestDate = new Date(`${LATEST_KNOWN_DATE}T00:00:00.000Z`);
  const draws: RawHistoryEntry[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (let colIndex = 0; colIndex < DAYS.length; colIndex++) {
      const cell = rows[rowIndex]?.[colIndex] ?? "";
      if (!/^\d{4}$/.test(cell)) continue;

      const dayOffset = (rowIndex - latest.rowIndex) * 7 + (colIndex - latest.colIndex);
      draws.push({
        date: isoDate(addDays(latestDate, dayOffset)),
        market: "HK",
        result: cell,
      });
    }
  }

  return draws.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
