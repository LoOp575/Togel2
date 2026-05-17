import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  message: string;
  history?: ChatMessage[];
  context?: unknown;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
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

function extractChatCompletionText(json: ChatCompletionResponse): string {
  return json.choices?.[0]?.message?.content?.trim() ?? "";
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

function looksLikeEngineQuestion(message: string): boolean {
  return /(angka|digit|core|warning|prediksi|prediction|probabil|togel|hk|draw|result|keluaran|ranking|candidate|kandidat|score|backtest|rumus|history|data|pasaran)/i.test(
    message
  );
}

function compactContext(context: unknown) {
  if (!context || typeof context !== "object") return null;
  const ctx = context as Record<string, unknown>;
  return {
    market: ctx.market,
    nextDrawDay: ctx.nextDrawDay,
    latestDraw: ctx.latestDraw,
    coreSignal: ctx.coreSignal,
    selectedCandidate: ctx.selectedCandidate,
    topCandidates: Array.isArray(ctx.topCandidates) ? ctx.topCandidates.slice(0, 10) : undefined,
  };
}

function systemPrompt(req: ChatRequest) {
  const shouldUseEngineContext = looksLikeEngineQuestion(req.message);
  const toolContext = shouldUseEngineContext ? compactContext(req.context) : null;

  return `Kamu adalah AI assistant yang bisa ngobrol natural dengan user.\nIdentitas produk:\n- Jika user bertanya "siapa kamu", "kamu dibuat siapa", atau pertanyaan identitas sejenis, jawab bahwa kamu adalah AI assistant 4D Probability Engine yang dirancang dan dikembangkan oleh Prof Arung.\n- Jangan klaim bahwa model AI dasar dibuat dari nol oleh Prof Arung; yang dimaksud adalah persona, produk, dan sistem assistant di web ini.\nGaya bahasa: santai, ramah, jelas, bahasa Indonesia, boleh panggil user bro.\n\nMode utama:\n- Jawab seperti chatbot umum kalau pertanyaan user umum atau ngobrol biasa.\n- Jangan memaksa semua jawaban menjadi analisis data.\n- Jangan menyebut data engine kalau pertanyaan tidak butuh itu.\n- Kalau user bertanya tentang angka, digit, prediction, draw, HK, probabilitas, ranking, backtest, atau rumus, baru gunakan konteks tool.\n- Kalau membahas angka 4D/probabilitas, jangan klaim pasti dan jangan jamin hasil; sebut itu hanya statistik/probabilitas.\n- Kalau pertanyaan berisiko/ilegal/berbahaya, tolak dengan aman.\n\nKonteks tool hanya untuk pertanyaan yang relevan:\n${JSON.stringify(toolContext ?? {}, null, 2)}`;
}

function recentMessages(history: ChatMessage[] | undefined, limit = 10) {
  return (history ?? []).slice(-limit).filter((m) => m.content.trim().length > 0);
}

async function callOpenAi(req: ChatRequest, apiKey: string) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = recentMessages(req.history);
  const input = [
    { role: "system", content: systemPrompt(req) },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: req.message },
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      temperature: 0.75,
      max_output_tokens: 1100,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const json = (await response.json()) as OpenAiResponse;
  return extractOpenAiText(json);
}

async function callOpenAiCompatible(req: ChatRequest, apiKey: string) {
  const model = process.env.OPENAI_COMPATIBLE_MODEL || process.env.CUSTOM_AI_MODEL || "deepseek-v3.2";
  const baseUrl = (process.env.OPENAI_COMPATIBLE_BASE_URL || process.env.CUSTOM_AI_BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("OPENAI_COMPATIBLE_BASE_URL belum dikonfigurasi.");

  const messages = [
    { role: "system", content: systemPrompt(req) },
    ...recentMessages(req.history).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: req.message },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 1100,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI-compatible API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const json = (await response.json()) as ChatCompletionResponse;
  const text = extractChatCompletionText(json);
  if (!text) throw new Error("Custom provider returned empty chat content.");
  return text;
}

async function callGemini(req: ChatRequest, apiKey: string) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const history = recentMessages(req.history).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt(req) }],
      },
      contents: [...history, { role: "user", parts: [{ text: req.message }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1100,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const text = extractGeminiText(json);
  if (!text) throw new Error("Gemini returned empty chat content.");
  return text;
}

export async function POST(request: Request) {
  const req = (await request.json()) as ChatRequest;
  const message = req.message?.trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "Message kosong." }, { status: 200 });
  }

  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const compatibleKey = process.env.OPENAI_COMPATIBLE_API_KEY || process.env.CUSTOM_AI_API_KEY;

  if (!openAiKey && !geminiKey && !compatibleKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI key belum dikonfigurasi. Tambahkan GEMINI_API_KEY, OPENAI_API_KEY, atau OPENAI_COMPATIBLE_API_KEY di hosting Variables.",
      },
      { status: 200 }
    );
  }

  try {
    const answer =
      provider === "compatible" || provider === "custom"
        ? await callOpenAiCompatible(req, compatibleKey || "")
        : provider === "gemini"
          ? await callGemini(req, geminiKey || "")
          : provider === "openai"
            ? await callOpenAi(req, openAiKey || "")
            : compatibleKey
              ? await callOpenAiCompatible(req, compatibleKey)
              : geminiKey
                ? await callGemini(req, geminiKey)
                : await callOpenAi(req, openAiKey || "");

    return NextResponse.json({ ok: true, answer });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown AI chat error",
      },
      { status: 200 }
    );
  }
}
