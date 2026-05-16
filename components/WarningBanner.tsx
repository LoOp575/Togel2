export function WarningBanner() {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-amber-200"
      role="note"
    >
      <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
      <p>
        <span className="font-semibold">Statistical ranking only, not guaranteed prediction.</span>{" "}
        This tool measures historical patterns and probability scores. Past frequency does not
        guarantee future results.
      </p>
    </div>
  );
}
