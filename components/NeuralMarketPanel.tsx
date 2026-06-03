import type { NeuralMarketState } from "@/lib/neuralMarketEngine";

type Props = {
  report: NeuralMarketState;
};

function toneForState(state: NeuralMarketState["state"]) {
  if (state === "HEATING") return "text-good border-good/30 bg-good/10";
  if (state === "ACCUMULATION") return "text-accent border-accent/30 bg-accent/10";
  if (state === "ROTATION") return "text-sky-300 border-sky-400/30 bg-sky-400/10";
  if (state === "CHAOTIC") return "text-warn border-warn/30 bg-warn/10";
  if (state === "COOLING") return "text-bad border-bad/30 bg-bad/10";
  return "text-gray-200 border-bg-border bg-bg-soft";
}

function DigitCluster({ label, digits, tone = "text-white" }: { label: string; digits: number[]; tone?: string }) {
  return (
    <div className="rounded-xl border border-bg-border bg-black/20 p-3">
      <p className="stat-label mb-2">{label}</p>
      <div className={`mono text-xl font-bold tracking-widest ${tone}`}>
        {digits.length ? digits.join(" · ") : "—"}
      </div>
    </div>
  );
}

export function NeuralMarketPanel({ report }: Props) {
  return (
    <section className="card overflow-hidden border-accent/25 bg-gradient-to-br from-accent/10 via-bg-panel to-bg-panel">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="stat-label">Neural Probability Engine</p>
            <h2 className="text-lg font-semibold text-white">Formula Neuron Market State</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-400">
              Rumus tidak lagi dibaca sebagai prediksi tunggal. Setiap rumus menjadi neuron, lalu digabung untuk membaca state market, cluster dominan, cluster emerging, dan noise.
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-right ${toneForState(report.state)}`}>
            <div className="stat-label">Market State</div>
            <div className="text-xl font-bold tracking-wide">{report.state}</div>
            <div className="mt-1 text-[11px] opacity-80">Next day: {report.nextDrawDay ?? "—"}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-bg-border bg-black/20 p-3">
            <p className="stat-label mb-1">Pressure</p>
            <div className="mono text-2xl font-bold text-good">{report.pressure}%</div>
          </div>
          <div className="rounded-xl border border-bg-border bg-black/20 p-3">
            <p className="stat-label mb-1">Confidence</p>
            <div className="mono text-2xl font-bold text-accent">{report.confidence}%</div>
          </div>
          <div className="rounded-xl border border-bg-border bg-black/20 p-3">
            <p className="stat-label mb-1">Entropy</p>
            <div className="mono text-2xl font-bold text-warn">{report.entropy}%</div>
          </div>
          <div className="rounded-xl border border-bg-border bg-black/20 p-3">
            <p className="stat-label mb-1">Bias</p>
            <div className="mono text-2xl font-bold text-sky-300">{report.bias}%</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <DigitCluster label="Core Cluster" digits={report.coreCluster} tone="text-good" />
          <DigitCluster label="Emerging Cluster" digits={report.emergingCluster} tone="text-accent" />
          <DigitCluster label="Weak Cluster" digits={report.weakCluster} tone="text-bad" />
        </div>

        <div className="rounded-xl border border-bg-border bg-black/20 p-3">
          <p className="stat-label mb-2">Agent Readout</p>
          <p className="text-xs leading-relaxed text-gray-300">{report.agentRead}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report.neurons.map((neuron) => (
            <div key={neuron.key} className="rounded-xl border border-bg-border bg-bg-soft/80 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-gray-100">{neuron.label}</h3>
                  <p className="mt-1 mono text-[10px] text-accent">{neuron.formula}</p>
                </div>
                <div className="mono text-lg font-bold text-white">{neuron.score}</div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
                <div className="h-full rounded-full bg-accent" style={{ width: `${neuron.score}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-500">Confidence {neuron.confidence}%</span>
                <span className="mono text-gray-300">{neuron.topDigits.slice(0, 3).join(" · ")}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{neuron.read}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
