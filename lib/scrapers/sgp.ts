import type { LiveDrawResult } from "./types";
import { getLiveSource } from "./sources";

function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function extractFirstPrize(text: string): string | null {
  const patterns = [
    /1st\s*Prize\D{0,80}(\d{4})/i,
    /First\s*Prize\D{0,80}(\d{4})/i,
    /1st\D{0,40}Prize\D{0,80}(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractDrawDate(text: string): string | null {
  const dateLike = text.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
  if (!dateLike?.[1]) return null;
  const parsed = new Date(dateLike[1]);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export async function fetchSgp4D(): Promise<LiveDrawResult> {
  const source = getLiveSource("SGP");
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
        message: "Singapore Pools page could not be fetched from this server. Try opening the source manually or add a fallback source.",
      };
    }

    const html = await response.text();
    const text = normalizeText(html);
    const result = extractFirstPrize(text);
    const date = extractDrawDate(text) ?? todayIso();

    if (!result) {
      return {
        ...source,
        fetchedAt,
        ok: false,
        date,
        result: null,
        error: "Parser could not find a 4-digit first prize result in the public page text.",
        message: "The official page may use dynamic rendering or changed markup. Add a fallback source if needed.",
      };
    }

    return {
      ...source,
      fetchedAt,
      ok: true,
      date,
      result,
      numbers: [result],
      message: "Fetched from official public source. Verify on source page before adding to permanent history.",
    };
  } catch (error) {
    return {
      ...source,
      fetchedAt,
      ok: false,
      date: null,
      result: null,
      error: error instanceof Error ? error.message : "Unknown fetch error",
      message: "Live fetch failed. Some official lottery sites block server-side fetches.",
    };
  }
}
