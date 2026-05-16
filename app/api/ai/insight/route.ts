import { NextResponse } from "next/server";
import type { AiInsightPayload, AiInsightResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const FALLBACK: AiInsightResponse = {
  summary:
    "AI insight belum tersedia. Engine matematika tetap berjalan; gunakan ranking sebagai statistik, bukan kepastian.",
  watchlist: [],
  risk: "Statistical ranking only, not guaranteed prediction.",
  suggestedAdjustment: {},
};

function extractText(json: OpenAiResponse): string {
  if (typeof json.output_text === "string") return json.output_text;
  const chunks: string[] = [];
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJson(text: string): AiInsightResponse {
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(clean) as Partial<AiInsightResponse>;
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : FALLBACK.summary,
    watchlist: Array.isArray(parsed.watchlist)
      ? parsed.watchlist
          .filter((x) => x && typeof x.number === "string" && typeof x.reason === "string")
          .slice(0, 12)
      : [],
    risk: typeof parsed.risk === "string" ? parsed.risk : FALLBACK.risk,
    suggestedAdjustment:
      parsed.suggestedAdjustment && typeof parsed.suggestedAdjustment === "object"
        ? (parsed.suggestedAdjustment as Record<string, string>)
        : {},
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI key belum dikonfigurasi. Tambahkan env var OPENAI_API_KEY di Vercel.",
        data: FALLBACK,
      },
      { status: 200 }
    );
  }

  const payload = (await request.json()) as AiInsightPayload;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const system = `You are an AI analyst for a 4-digit statistical ranking engine.\nRules:\n- Do not claim certainty or guaranteed prediction.\n- Use the supplied math-engine data only.\n- Select a small watchlist from the given topCandidates.\n- Explain patterns briefly in Indonesian casual style.\n- Return valid JSON only with keys: summary, watchlist, risk, suggestedAdjustment.\n- watchlist items must be {"number":"0000","reason":"..."}.`;

  const user = `Analyze this 4D probability-engine payload and return JSON only:\n${JSON.stringify(
    payload
  )}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_output_tokens: 900,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        {
          ok: false,
          error: `OpenAI API error ${response.status}: ${err.slice(0, 300)}`,
          data: FALLBACK,
        },
        { status: 200 }
      );
    }

    const json = (await response.json()) as OpenAiResponse;
    const text = extractText(json);
    const data = parseJson(text);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown AI insight error",
        data: FALLBACK,
      },
      { status: 200 }
    );
  }
}
