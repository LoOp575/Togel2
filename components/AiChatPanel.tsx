"use client";

import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = { context?: unknown };

export function AiChatPanel({ context }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history: messages, context }),
      });
      const json = (await response.json()) as { ok: boolean; answer?: string; error?: string };
      if (!json.ok || !json.answer) {
        setError(json.error ?? "AI chat failed.");
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: json.answer ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown chat error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="stat-label">AI Chat</p>
          <h2 className="font-semibold text-gray-100">Assistant</h2>
        </div>
        <button className="btn text-xs" onClick={() => setMessages([])} disabled={loading || messages.length === 0}>
          Clear
        </button>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-bg-border bg-bg-soft p-2">
        {messages.length === 0 ? (
          <p className="text-xs leading-relaxed text-gray-500">Kirim pertanyaan ke AI assistant.</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={`${msg.role}-${idx}`} className={`rounded-md p-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-accent/15 text-gray-100" : "bg-black/20 text-gray-300"}`}>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{msg.role === "user" ? "You" : "AI"}</div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))
        )}
        {loading ? <p className="text-xs text-gray-500">Loading...</p> : null}
      </div>

      {error ? <p className="rounded-md border border-bad/30 bg-bad/10 p-2 text-xs text-red-300">{error}</p> : null}

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ketik pesan..." className="input text-xs" disabled={loading} />
        <button onClick={() => void send()} disabled={loading || !input.trim()} className="btn-primary text-xs">Send</button>
      </div>
    </div>
  );
}
