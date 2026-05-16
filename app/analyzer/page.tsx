import { DigitBars } from "@/components/DigitBars";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { analyze } from "@/lib/analyzer";
import { loadHistory } from "@/lib/data";

export default function AnalyzerPage() {
  const history = loadHistory();
  const stats = analyze(history);

  const totalSlots = stats.totalDraws * 4;
  const repeatTotal =
    stats.repeatPattern.allSame +
    stats.repeatPattern.threeSame +
    stats.repeatPattern.pair +
    stats.repeatPattern.allUnique || 1;

  const topOE = Object.entries(stats.oddEvenPattern).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topBS = Object.entries(stats.bigSmallPattern).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const topPairs = Object.entries(stats.pairFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const sumKeys = Object.keys(stats.sumDistribution)
    .map(Number)
    .sort((a, b) => a - b);
  const maxSum = Math.max(1, ...sumKeys.map((k) => stats.sumDistribution[k]));

  return (
    <>
      <PageHeader
        title="Analyzer"
        description="Frequency, position, transitions, and shape patterns aggregated across all draws."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Draws" value={stats.totalDraws.toLocaleString()} tone="accent" />
        <StatCard label="Digit Slots" value={totalSlots.toLocaleString()} hint="totalDraws × 4" />
        <StatCard
          label="Hot Digits"
          value={<span className="mono text-good">{stats.hotDigits.join(" · ")}</span>}
          tone="good"
        />
        <StatCard
          label="Cold Digits"
          value={<span className="mono text-bad">{stats.coldDigits.join(" · ")}</span>}
          tone="bad"
        />
      </div>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-200">Digit frequency (0–9)</h2>
        <DigitBars values={stats.digitFrequency} highlight={stats.hotDigits} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.positionFrequency.map((row, idx) => (
          <div key={idx} className="card space-y-2">
            <h3 className="text-sm font-semibold text-gray-200">Position {idx + 1}</h3>
            <DigitBars
              values={row}
              highlight={row
                .map((v, i) => ({ v, i }))
                .sort((a, b) => b.v - a.v)
                .slice(0, 2)
                .map((x) => x.i)}
            />
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">
            Top adjacent pairs / Markov transitions
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {topPairs.map(([key, count]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-bg-border bg-bg-soft px-3 py-2"
              >
                <span className="mono text-base font-semibold text-white">
                  {key[0]}→{key[1]}
                </span>
                <span className="mono text-sm text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-gray-200">Repeat shape</h2>
          <Bar label="All unique (e.g. 1234)" count={stats.repeatPattern.allUnique} total={repeatTotal} />
          <Bar label="One pair" count={stats.repeatPattern.pair} total={repeatTotal} />
          <Bar label="Three same" count={stats.repeatPattern.threeSame} total={repeatTotal} />
          <Bar label="All same (e.g. 8888)" count={stats.repeatPattern.allSame} total={repeatTotal} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-gray-200">Top odd/even patterns</h2>
          {topOE.map(([key, count]) => (
            <Bar
              key={key}
              label={<span className="mono">{key}</span>}
              count={count}
              total={stats.totalDraws}
            />
          ))}
        </div>
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-gray-200">Top big/small patterns</h2>
          {topBS.map(([key, count]) => (
            <Bar
              key={key}
              label={<span className="mono">{key}</span>}
              count={count}
              total={stats.totalDraws}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold text-gray-200">Sum distribution</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Sum</th>
                <th>Count</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {sumKeys.map((s) => {
                const c = stats.sumDistribution[s];
                const pct = (c / maxSum) * 100;
                return (
                  <tr key={s}>
                    <td className="mono w-16">{s}</td>
                    <td className="mono w-20">{c}</td>
                    <td>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-soft">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Bar({
  label,
  count,
  total,
}: {
  label: React.ReactNode;
  count: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className="mono text-gray-400">
          {count} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
