import type { LiveDrawResult } from "./types";
import { getLiveSource } from "./sources";

function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function extractDate(text: string): string | null {
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

function extractBySelectorHint(text: string): string | null {
  const hint = process.env.HK_LIVE_RESULT_SELECTOR_TEXT?.trim().toLowerCase();
  if (!hint) return null;
  const lower = text.toLowerCase();
  const index = lower.indexOf(hint);
  if (index === -1) return null;
  const window = text.slice(index, Math.min(text.length, index + 220));
  const match = window.match(/\b\d{4}\b/);
  return match?.[0] ?? null;
}

function scoreContextAround(text: string, index: number): number {
  const start = Math.max(0, index - 140);
  const end = Math.min(text.length, index + 140);
  const ctx = text.slice(start, end).toLowerCase();
  let score = 0;

  // Strong positive labels usually close to the actual live result.
  if (/live\s*draw|live\s*result|result\s*live|draw\s*live/.test(ctx)) score += 12;
  if (/keluaran\s*hk|hasil\s*hk|result\s*hk|hk\s*result|hongkong\s*result/.test(ctx)) score += 10;
  if (/result|draw|keluar|keluaran|hasil|nomor|number|angka/.test(ctx)) score += 6;
  if (/hk|hong\s*kong|hongkong|hkg/.test(ctx)) score += 5;
  if (/4d|4\s*digit|four\s*digit/.test(ctx)) score += 4;
  if (/1st|first|prize|utama/.test(ctx)) score += 3;
  if (/today|hari\s*ini|latest|terbaru|current|sekarang/.test(ctx)) score += 3;
  if (/date|tanggal|periode|period/.test(ctx)) score += 1;

  // Negative labels often close to contact, ads, menus, counters, or SEO text.
  if (/whatsapp|telegram|login|password|bonus|promo|deposit|slot|casino|register|daftar|copyright|admin|kontak|rekening/.test(ctx)) score -= 10;
  if (/tahun|year|copyright|since|visitor|views|online/.test(ctx)) score -= 5;

  return score;
}

function extractBestFourDigit(text: string): string | null {
  const hinted = extractBySelectorHint(text);
  if (hinted) return hinted;

  const matches = Array.from(text.matchAll(/\b\d{4}\b/g));
  if (matches.length === 0) return null;

  const candidates = matches
    .map((match) => ({
      value: match[0],
      index: match.index ?? 0,
      score: scoreContextAround(text, match.index ?? 0),
    }))
    .filter((item) => {
      const numeric = Number(item.value);
      // Avoid common years such as 2024/2025/2026 being selected as results unless context is very strong.
      const looksLikeYear = numeric >= 2000 && numeric <= 2099;
      return !looksLikeYear || item.score >= 14;
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return candidates[0]?.value ?? null;
}

export async function fetchHk4D(): Promise<LiveDrawResult> {
  const source = getLiveSource("HK");
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(source.sourceUrl, {
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 4D Probability Engine educational live-result fetcher",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        ...source,
        fetchedAt,
        ok: false,
        date: null,
        result: null,
        error: `Source returned HTTP ${response.status}`,
        message: "HK user-supplied page could not be fetched from the server. Open the source manually or add another fallback.",
      };
    }

    const html = await response.text();
    const text = normalizeText(html);
    const result = extractBestFourDigit(text);
    const date = extractDate(text) ?? todayIso();

    if (!result) {
      return {
        ...source,
        fetchedAt,
        ok: false,
        date,
        result: null,
        error: "Parser could not confidently find a 4-digit HK draw result on the page.",
        message: "The page may render results with JavaScript or use a different layout. Send a screenshot/HTML snippet if this fails.",
      };
    }

    return {
      ...source,
      fetchedAt,
      ok: true,
      date,
      result,
      numbers: [result],
      message: "Fetched from user-supplied HK source. Verify before adding to permanent history.",
    };
  } catch (error) {
    return {
      ...source,
      fetchedAt,
      ok: false,
      date: null,
      result: null,
      error: error instanceof Error ? error.message : "Unknown fetch error",
      message: "Live HK fetch failed. The source may block server-side fetches or require browser rendering.",
    };
  }
}
