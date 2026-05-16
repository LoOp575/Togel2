interface DigitBarsProps {
  values: number[]; // length 10
  highlight?: number[];
  formatValue?: (v: number) => string;
}

export function DigitBars({ values, highlight = [], formatValue }: DigitBarsProps) {
  const max = Math.max(1, ...values);
  return (
    <div className="grid grid-cols-10 gap-1">
      {values.map((v, i) => {
        const pct = (v / max) * 100;
        const isHot = highlight.includes(i);
        return (
          <div key={i} className="flex flex-col items-center">
            <div className="relative flex h-24 w-full items-end overflow-hidden rounded-sm bg-bg-soft">
              <div
                className={`w-full transition-all ${isHot ? "bg-accent" : "bg-gray-600"}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <div className="mono mt-1 text-[10px] text-gray-400">{i}</div>
            <div className="mono text-[10px] text-gray-500">
              {formatValue ? formatValue(v) : v}
            </div>
          </div>
        );
      })}
    </div>
  );
}
