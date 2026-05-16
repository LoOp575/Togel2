import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "accent";
}

const TONE_BORDER: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-bg-border",
  good: "border-good/40",
  warn: "border-warn/40",
  bad: "border-bad/40",
  accent: "border-accent/40",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className={`card-tight border ${TONE_BORDER[tone]}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1 break-all">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}
