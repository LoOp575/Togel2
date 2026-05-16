import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { analyze } from "@/lib/analyzer";
import { loadHistory } from "@/lib/data";

export default function DashboardPage() {
  const history = loadHistory();
  const stats = analyze(history);

  const last = history[history.length - 1];
  const first = history[0];
  const markets = Array.from(new Set(history.map((h) => h.market)));

  const repeatTotal =
    stats.repeatPattern.allSame +
    stats.repeatPattern.threeSame +
    stats.repeatPattern.pair +
    stats.repeatPattern.allUnique;
  const uniquePct = repeatTotal === 0 ? 0 : (stats.repeatPattern.allUnique / repeatTotal) * 100;

  const topPair = Object.entries(stats.pairFrequency).sort((a, b) => b[1] - a[1])[0];

  const recent = history.slice(-6).reverse();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="High-level summary of your historical 4D data and current pattern signals."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Draws"
          value={stats.totalDraws.toLocaleString()}
          hint={
            first && last ? (
              <span className="mono">
                {first.date} → {last.date}
              </span>
            ) : null
          }
          tone="accent"
        />
        <StatCard
          label="Markets"
          value={markets.join(", ") || "—"}
          hint={`${markets.length} source${markets.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Hot Digits"
          value={<span className="mono text-good">{stats.hotDigits.join(" · ")}</span>}
          hint="Most frequent across all positions"
          tone="good"
        />
        <StatCard
          label="Cold Digits"
          value={<span className="mono text-bad">{stats.coldDigits.join(" · ")}</span>}
          hint="Least frequent"
          tone="bad"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Top Adjacent Pair"
          value={
            topPair ? <span className="mono">{topPair[0]}</span> : <span className="mono">—</span>
          }
          hint={topPair ? `${topPair[1]} occurrences` : undefined}
        />
        <StatCard
          label="All-Unique-Digit Draws"
          value={`${uniquePct.toFixed(1)}%`}
          hint={`${stats.repeatPattern.allUnique} of ${repeatTotal}`}
        />
        <StatCard
          label="Last Result"
          value={last ? <span className="mono tracking-widest">{last.result}</span> : <span>—</span>}
          hint={last ? `${last.market} · ${last.date}` : undefined}
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Recent draws</h2>
            <Link href="/history" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Market</th>
                  <th>Result</th>
                  <th className="text-right">Sum</th>
                  <th className="hidden text-right md:table-cell">Pattern</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => {
                  const sum = d.digits.reduce((s, v) => s + v, 0);
                  const oe = d.digits.map((x) => (x % 2 === 0 ? "E" : "O")).join("");
                  return (
                    <tr key={`${d.date}-${d.market}-${d.result}`}>
                      <td className="mono text-gray-400">{d.date}</td>
                      <td>
                        <span className="pill">{d.market}</span>
                      </td>
                      <td className="mono text-base font-semibold tracking-widest text-white">
                        {d.result}
                      </td>
                      <td className="mono text-right">{sum}</td>
                      <td className="mono hidden text-right text-gray-400 md:table-cell">{oe}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-200">Quick actions</h2>
          <div className="flex flex-col gap-2">
            <Link href="/prediction" className="btn-primary justify-start">
              Compute candidate ranking →
            </Link>
            <Link href="/analyzer" className="btn justify-start">
              Open pattern analyzer →
            </Link>
            <Link href="/backtest" className="btn justify-start">
              Run rolling backtest →
            </Link>
            <Link href="/settings" className="btn justify-start">
              Adjust scoring weights →
            </Link>
          </div>
          <p className="text-[11px] text-gray-500">
            All computation runs locally in your browser using the bundled history file.
          </p>
        </div>
      </div>
    </>
  );
}
