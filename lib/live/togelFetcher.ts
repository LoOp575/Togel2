import type { TogelLiveSource } from "./togelSources";

export type TogelLiveResult = {
  market: string;
  marketName: string;
  sourceUrl: string;
  type: string;
  day: string | null;
  period: string | null;
  result: string;
  extras: string[];
  fetchedAt: string;
};

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parseRows(html: string, source: TogelLiveSource): TogelLiveResult[] {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const out: TogelLiveResult[] = [];

  for (const row of rows) {
    const links = [...row.matchAll(/href=["']\/history\/number\/data\/(\d+)["'][^>]*>\s*(\d+)\s*<\/a>/gi)].map(
      (match) => match[2]
    );

    if (links.length === 0) continue;

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripTags(match[1]));
    const day = cells.find((cell) => /^[A-Za-zÀ-ÿ]+$/.test(cell)) ?? null;
    const period = cells.find((cell) => /^\d{2,}$/.test(cell) && !links.includes(cell)) ?? null;

    out.push({
      market: source.market,
      marketName: source.name,
      sourceUrl: source.url,
      type: source.type,
      day,
      period,
      result: links[0].padStart(source.type === "4D" ? 4 : links[0].length, "0"),
      extras: links.slice(1),
      fetchedAt: new Date().toISOString(),
    });
  }

  return out;
}

export async function fetchTogelSource(source: TogelLiveSource): Promise<TogelLiveResult[]> {
  const response = await fetch(source.url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseRows(html, source);
}

export async function fetchAllTogelSources(sources: TogelLiveSource[]) {
  const results = await Promise.allSettled(sources.map((source) => fetchTogelSource(source)));

  return results.map((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      return {
        source,
        ok: true as const,
        latest: result.value[0] ?? null,
        rows: result.value,
      };
    }

    return {
      source,
      ok: false as const,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      latest: null,
      rows: [] as TogelLiveResult[],
    };
  });
}
