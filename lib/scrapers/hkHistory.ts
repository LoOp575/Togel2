import type { RawHistoryEntry } from "@/types";
import { normalizeResult } from "@/lib/parser";
import { getLiveSource } from "./sources";

export type ScrapedHistoryResult = {
  market: "HK";
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  ok: boolean;
  draws: RawHistoryEntry[];
  count: number;
  message?: string;
  error?: string;
};

function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function rowTexts(html: string): string[] {
  const tableRows = Array.from(html.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map((m) => normalizeText(m[0]));
  const listItems = Array.from(html.matchAll(/<li[\s\S]*?<\/li>/gi)).map((m) => normalizeText(m[0]));
  const cards = Array.from(html.matchAll(/<(?:article|section|div)[^>]*(?:result|draw|hk|hong)[^>]*>[\s\S]*?<\/(?:article|section|div)>/gi)).map((m) => normalizeText(m[0]));
  return [...tableRows, ...listItems, ...cards].filter((x) => x.length > 8);
}

function parseDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const named = text.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2})/i);
  if (named?.[1]) {
    const parsed = new Date(named[1]);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function candidateNumbers(text: string): string[] {
  return Array.from(text.matchAll(/\b\d{4}\b/g))
    .map((m) => m[0])
    .filter((num) => {
      const n = Number(num);
      // Avoid years unless the surrounding row strongly suggests a draw result.
      if (n >= 2000 && n <= 2099 && !/result|draw|hasil|keluar|4d|nomor|number|prize/i.test(text)) {
        return false;
      }
      return true;
    });
}

function parseRows(html: string): RawHistoryEntry[] {
  const rows = rowTexts(html);
  const out: RawHistoryEntry[] = [];

  for (const row of rows) {
    const date = parseDate(row);
    if (!date) continue;

    const numbers = candidateNumbers(row);
    if (numbers.length === 0) continue;

    const contextScore = /hk|hong\s*kong|result|draw|hasil|keluar|4d|nomor|number|prize/i.test(row) ? 1 : 0;
    const result = normalizeResult(numbers[0]);
    if (/^\d{4}$/.test(result) && contextScore >= 0) {
      out.push({ date, market: "HK", result });
    }
  }

  return out;
}

function parseLoose(text: string): RawHistoryEntry[] {
  const out: RawHistoryEntry[] = [];
  const dateRegex = /(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2})/gi;
  const matches = Array.from(text.matchAll(dateRegex));

  for (const match of matches) {
    const rawDate = match[0];
    const index = match.index ?? 0;
    const window = text.slice(index, Math.min(text.length, index + 180));
    const date = parseDate(rawDate);
    if (!date) continue;

    const nums = candidateNumbers(window).filter((n) => n !== date.slice(0, 4));
    if (nums.length === 0) continue;

    const result = normalizeResult(nums[0]);
    if (/^\d{4}$/.test(result)) out.push({ date, market: "HK", result });
  }

  return out;
}

function dedupeAndSort(draws: RawHistoryEntry[]): RawHistoryEntry[] {
  const seen = new Map<string, RawHistoryEntry>();
  for (const draw of draws) {
    const result = normalizeResult(draw.result);
    if (!/^\d{4}$/.test(result)) continue;
    const key = `${draw.date}-${draw.market}-${result}`;
    seen.set(key, { date: draw.date, market: "HK", result });
  }
  return Array.from(seen.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export async function fetchHkHistory(): Promise<ScrapedHistoryResult> {
  const source = getLiveSource("HK");
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(source.sourceUrl, {
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 4D Probability Engine educational history fetcher",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        market: "HK",
        source: source.source,
        sourceUrl: source.sourceUrl,
        fetchedAt,
        ok: false,
        draws: [],
        count: 0,
        error: `Source returned HTTP ${response.status}`,
        message: "Could not fetch HK history source from the server.",
      };
    }

    const html = await response.text();
    const text = normalizeText(html);
    const draws = dedupeAndSort([...parseRows(html), ...parseLoose(text)]);

    if (draws.length === 0) {
      return {
        market: "HK",
        source: source.source,
        sourceUrl: source.sourceUrl,
        fetchedAt,
        ok: false,
        draws: [],
        count: 0,
        error: "No dated 4D draw rows found.",
        message: "The source may render history with JavaScript or use a layout that needs a custom parser.",
      };
    }

    return {
      market: "HK",
      source: source.source,
      sourceUrl: source.sourceUrl,
      fetchedAt,
      ok: true,
      draws,
      count: draws.length,
      message: "Scraped HK history from user-supplied source. Verify before relying on it.",
    };
  } catch (error) {
    return {
      market: "HK",
      source: source.source,
      sourceUrl: source.sourceUrl,
      fetchedAt,
      ok: false,
      draws: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown fetch error",
      message: "HK history fetch failed. The source may block server-side fetches.",
    };
  }
}
