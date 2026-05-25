"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  defaultMarket?: string;
  defaultDate?: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ManualDrawForm({ defaultMarket = "HK", defaultDate }: Props) {
  const router = useRouter();
  const [market, setMarket] = useState(defaultMarket);
  const [date, setDate] = useState(defaultDate || todayIso());
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("Menyimpan live draw...");

    try {
      const response = await fetch("/api/manual-draw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ market, date, result }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan result.");
      }

      setStatus("done");
      setMessage(`${data.row.market} ${data.row.date} ${data.row.result} tersimpan. Refreshing signal...`);
      setResult("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan result.");
    }
  }

  return (
    <div className="card border-accent/20 bg-gradient-to-br from-accent/10 via-bg-panel to-bg-panel">
      <div className="mb-3">
        <p className="stat-label">Manual Live Draw</p>
        <h2 className="text-sm font-semibold text-gray-100">Tambah result terbaru</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Pakai ini kalau scraper/API live belum jalan. Setelah tersimpan, rumus langsung baca data baru saat dashboard refresh.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-2 md:grid-cols-[0.8fr_1fr_1fr_auto]">
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Market</span>
          <input
            value={market}
            onChange={(event) => setMarket(event.target.value.toUpperCase())}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
            placeholder="HK"
            maxLength={20}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Result 4D</span>
          <input
            value={result}
            onChange={(event) => setResult(event.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mono w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm tracking-widest text-gray-100 outline-none focus:border-accent"
            placeholder="7430"
            inputMode="numeric"
            maxLength={4}
          />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={status === "saving"} className="btn-primary w-full whitespace-nowrap text-xs">
            {status === "saving" ? "Saving..." : "Add Draw"}
          </button>
        </div>
      </form>

      {message ? (
        <p className={status === "error" ? "mt-2 text-xs text-bad" : "mt-2 text-xs text-gray-400"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
