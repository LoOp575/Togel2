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

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const FALLBACK: AiInsightResponse = {
  summary:
    "AI insight belum tersedia. Engine matematika tetap berjalan; gunakan ranking sebagai statistik, bukan kepastian.",
  watchlist: [],
  risk: "Statistical ranking only, not guaranteed prediction.",
  suggestedAdjustment: {},
};

function extractOpenAiText(json: OpenAiResponse): string {
  if (typeof json.output_text === "string") return json.output_text;
  const chunks: string[] = [];
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function extractGeminiText(json: GeminiResponse): string {
  const chunks: string[] = [];
  for (const candidate of json.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === "string") chunks.push(part.text);
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

function buildPrompts(payload: AiInsightPayload) {
  const system = `You are an AI analyst for a 4-digit statistical ranking engine.\nRules:\n- Do not claim certainty or guaranteed prediction.\n- Use the supplied math-engine data only.\n- Select a small watchlist from the given topCandidates.\n- Explain patterns briefly in Indonesian casual style.\n- Return valid JSON only with keys: summary, watchlist, risk, suggestedAdjustment.\n- watchlist items must be {"number":"0000","reason":"..."}.`;

  const user = `Analyze this 4D probability-engine payload and return JSON only:\n${JSON.stringify(
    payload
  )}`;

  return { system, user };
}

async function callOpenAi(payload: AiInsightPayload, apiKey: string) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const { system, user } = buildPrompts(payload);

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
    throw new Error(`OpenAI API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const json = (await response.json()) as OpenAiResponse;
  return parseJson(extractOpenAiText(json));
}

async function callGemini(payload: AiInsightPayload, apiKey: string) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const { system, user } = buildPrompts(payload);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 900,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const json = (await response.json()) as GeminiResponse;
  return parseJson(extractGeminiText(json));
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AiInsightPayload;
  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openAiKey && !geminiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI key belum dikonfigurasi. Tambahkan env var GEMINI_API_KEY atau OPENAI_API_KEY di Vercel.",
        data: FALLBACK,
      },
      { status: 200 }
    );
  }

  try {
    const data =
      provider === "gemini"
        ? await callGemini(payload, geminiKey || "")
        : provider === "openai"
          ? await callOpenAi(payload, openAiKey || "")
          : geminiKey
            ? await callGemini(payload, geminiKey)
            : await callOpenAi(payload, openAiKey || "");

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
