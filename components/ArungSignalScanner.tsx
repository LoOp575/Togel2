"use client";

import { useMemo, useState } from "react";
import type { CoreSignal } from "@/lib/coreSignal";
import type { HistoryEntry } from "@/types";

type Props = {
  signal: CoreSignal;
  latest: HistoryEntry | null;
};

const STEPS = [
  "Scanning historical matrix...",
  "Reading separated formula signals...",
  "Checking Euler phase alignment...",
  "Activating resonance read...",
  "Mixing final core cluster...",
  "Building signal formation...",
];

function fmt(value: number) {
  return value.toFixed(1);
}

function pickCaution(signal: CoreSignal) {
  const core = signal.coreDigits;
  if (core.length === 0) return null;

  return [...core].sort((a, b) => {
    const riskA =
      a.candidateSupport * 0.4 +
      a.recentSupport * 0.25 +
      a.resonanceSupport * 0.25 -
      a.cycleSupport * 0.1;
    const riskB =
      b.candidateSupport * 0.4 +
      b.recentSupport * 0.25 +
      b.resonanceSupport * 0.25 -
      b.cycleSupport * 0.1;
    return riskB - riskA;
  })[0];
}

export function ArungSignalScanner({ signal, latest }: Props) {
  const [status, setStatus] = useState<"idle" | "scanning" | "done">("idle");
  const [step, setStep] = useState(0);

  const caution = useMemo(() => pickCaution(signal), [signal]);
  const lowSupport = signal.warningDigits[0] ?? null;
  const main = signal.mainCandidate;

  function runScan() {
    setStatus("scanning");
    setStep(0);

    STEPS.forEach((_, index) => {
      window.setTimeout(() => setStep(index), index * 420);
    });

    window.setTimeout(() => {
      setStatus("done");
      setStep(STEPS.length - 1);
    }, STEPS.length * 420 + 250);
  }

  return (
    <div className="card overflow-hidden border-accent/25 bg-gradient-to-br from-accent/10 via-bg-panel to-bg-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="stat-label">Arung Formula Mixer</p>
          <h2 className="text-lg font-semibold text-white">Offline Probability Radar</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Local analyze mode. Tidak pakai AI credit. Setiap rumus memberi sinyal sendiri,
            lalu mixer menggabungkannya menjadi core digit dan formation.
          </p>
        </div>
        <button onClick={runScan} disabled={status === "scanning"} className="btn-primary text-xs">
          {status === "scanning" ? "Analyzing..." : "Analyze Signal"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-bg-border bg-black/25 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Scanner Status</div>
            <div className="mt-1 text-sm font-semibold text-gray-100">
              {status === "idle" ? "STANDBY" : status === "scanning" ? "SCANNING" : "ENGINE LOCKED"}
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Market: {latest?.market ?? "—"}</div>
            <div>Latest: <span className="mono text-gray-300">{latest?.result ?? "—"}</span></div>
            <div>Next: {signal.nextDrawDay ?? "—"}</div>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: status === "idle" ? "8%" : status === "scanning" ? `${((step + 1) / STEPS.length) * 100}%` : "100%" }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {status === "idle" ? "Klik Analyze Signal untuk menjalankan scanner lokal." : STEPS[step]}
        </p>
      </div>

      {status === "done" ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-bg-border bg-black/20 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="stat-label">Formula Signals</p>
                <h3 className="text-sm font-semibold text-gray-100">Each formula has its own read</h3>
              </div>
              <div className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] text-accent">
                Mixer active
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {signal.formulaSignals.map((formula) => (
                <div key={formula.key} className="rounded-lg border border-bg-border bg-bg-soft p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-200">{formula.label}</p>
                    <p className="mono text-sm text-accent">{formula.digits.join(" · ")}</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{formula.read}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-good/25 bg-good/10 p-3">
              <p className="stat-label mb-2">Final Mixer Core</p>
              <div className="flex flex-wrap gap-2">
                {signal.coreDigits.map((item) => (
                  <div key={item.digit} className="rounded-xl border border-good/30 bg-black/20 px-3 py-2 text-center">
                    <div className="mono text-2xl font-bold text-good">{item.digit}</div>
                    <div className="mono text-[10px] text-gray-400">{fmt(item.score)}</div>
                    <div className="mono text-[10px] text-sky-300">Φ {fmt(item.phaseSupport)}</div>
                    <div className="mono text-[10px] text-accent">R {fmt(item.resonanceSupport)}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Core final dipilih dari gabungan semua formula, bukan dari satu rumus saja.
              </p>
            </div>

            <div className="rounded-xl border border-warn/25 bg-warn/10 p-3">
              <p className="stat-label mb-2">Caution Digit</p>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-warn/30 bg-black/20 px-4 py-2 text-center">
                  <div className="mono text-3xl font-bold text-warn">{caution?.digit ?? "—"}</div>
                  <div className="mono text-[10px] text-gray-400">{caution ? fmt(caution.score) : "—"}</div>
                </div>
                <p className="text-xs leading-relaxed text-gray-400">
                  Digit ini kuat, tapi dominan. Pakai sebagai pendukung, jangan dijadikan poros tunggal.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-accent/30 bg-black/30 p-4 md:col-span-2">
              <p className="stat-label">Best Formation</p>
              <div className="mt-1 mono text-4xl font-bold tracking-widest text-white">
                {main?.number ?? "—"}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Formation dipilih dari ranking kandidat, core final, phase, resonance, gap, recency, dan penalty low-support.
              </p>
            </div>

            <div className="rounded-xl border border-bad/25 bg-bad/10 p-3">
              <p className="stat-label mb-2">Low Support</p>
              <div className="mono text-3xl font-bold text-bad">{lowSupport?.digit ?? "—"}</div>
              <p className="mt-2 text-xs text-gray-400">
                Digit paling lemah saat ini. Bukan mustahil keluar, tapi jangan dijadikan poros utama.
              </p>
            </div>
          </div>

          <div>
            <p className="stat-label mb-2">Backup Formation</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {signal.backupCandidates.map((candidate) => (
                <div key={candidate.number} className="rounded-lg border border-bg-border bg-bg-soft p-2">
                  <div className="mono text-lg font-semibold tracking-widest text-gray-100">{candidate.number}</div>
                  <div className="mono text-xs text-gray-500">{candidate.finalScore.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-bg-border bg-black/20 p-3 text-xs leading-relaxed text-gray-400">
            <p className="mb-1 font-semibold text-gray-200">How to Read</p>
            <p>
              Euler Phase adalah sinyal hari/siklus. Recent membaca trend terbaru. Global membaca history umum.
              Resonance membaca interaksi recent dan cycle. Candidate Support membaca digit yang kuat di formasi ranking atas.
              Final Mixer menggabungkan semua sinyal menjadi core final dan formation.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
