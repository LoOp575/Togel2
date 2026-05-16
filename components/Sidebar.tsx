"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/prediction", label: "Prediction" },
  { href: "/backtest", label: "Backtest" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="border-b border-bg-border bg-bg-soft md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:flex-col md:items-stretch md:gap-6 md:py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
            4D
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-100">Probability Engine</div>
            <div className="text-[11px] text-gray-400">Statistical ranking</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-accent/15 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
