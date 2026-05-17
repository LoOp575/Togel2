"use client";

import type { CoreSignal } from "@/lib/coreSignal";

type Props = {
  signal: CoreSignal;
};

function score(value: number) {
  return value.toFixed(1);
}

export function CoreSignalPanel({ signal }: Props) {
  const main = signal.mainCandidate;

  return (
    <div className="card space-y-4 overflow-hidden border-accent/25 bg-gradient-to-br from-accent/10 via-bg-panel to-bg-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="stat-label">AI Signal</p>
          <h2 className="text-lg font-semibold text-white">Core Digit Engine</h2>
          <p className="mt-1 text-xs text-gray-400">
            Digit inti dipilih dari global support, recent trend, day fit, dan kandidat teratas.
          </p>
        </div>
        <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
          {signal.nextDrawDay ? `Next: ${signal.nextDrawDay}` : "Next: —"}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-bg-border bg-black/20 p-3">
          <p className="stat-label mb-2">Core Digits</p>
          <div className="flex flex-wrap gap-2">
            {signal.coreDigits.map((item) => (
              <div key={item.digit} className="rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-center">
                <div className="mono text-2xl font-bold text-good">{item.digit}</div>
                <div className="mono text-[10px] text-gray-400">{score(item.score)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-bg-border bg-black/20 p-3">
          <p className="stat-label mb-2">Warning Digit</p>
          <div className="flex flex-wrap gap-2">
            {signal.warningDigits.map((item) => (
              <div key={item.digit} className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-center">
                <div className="mono text-2xl font-bold text-bad">{item.digit}</div>
                <div className="mono text-[10px] text-gray-400">{score(item.score)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Warning bukan berarti mustahil, hanya support-nya paling rendah di engine saat ini.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-accent/30 bg-black/30 p-4">
        <p className="stat-label">Main Candidate</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <div className="mono text-4xl font-bold tracking-widest text-white">
              {main?.number ?? "—"}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Dipilih dari kombinasi digit inti dan difilter supaya tidak terlalu berat ke warning digit.
            </p>
          </div>
          <div className="text-right">
            <div className="stat-label">Final</div>
            <div className="mono text-2xl font-bold text-accent">
              {main ? main.finalScore.toFixed(2) : "—"}
            </div>
            <div className="text-[11px] text-gray-500">Rank #{main?.rank ?? "—"}</div>
          </div>
        </div>
      </div>

      <div>
        <p className="stat-label mb-2">Backup Candidates</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {signal.backupCandidates.map((candidate) => (
            <div key={candidate.number} className="rounded-lg border border-bg-border bg-bg-soft p-2">
              <div className="mono text-lg font-semibold tracking-widest text-gray-100">{candidate.number}</div>
              <div className="mono text-xs text-gray-500">{candidate.finalScore.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-bg-border pt-3 text-[11px] text-gray-500">
        Logic: Core Digit Score = 20% global + 25% recent + 25% day fit + 30% candidate support.
        Candidate dipilih dari angka yang memakai minimal 3 core digit dan menghindari warning digit.
      </div>
    </div>
  );
}
