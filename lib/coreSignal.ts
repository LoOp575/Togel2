import type { HistoryEntry, RankedCandidate } from "@/types";
import { dayIndexFromDate, getNextDrawContext } from "./dayOfWeek";

export type CoreDigitItem = {
  digit: number;
  score: number;
  globalSupport: number;
  recentSupport: number;
  daySupport: number;
  candidateSupport: number;
  reason: string;
};

export type CoreSignal = {
  coreDigits: CoreDigitItem[];
  warningDigits: CoreDigitItem[];
  mainCandidate: RankedCandidate | null;
  backupCandidates: RankedCandidate[];
  nextDrawDay: string | null;
};

type BuildCoreSignalParams = {
  history: HistoryEntry[];
  ranked: RankedCandidate[];
  coreLimit?: number;
  warningLimit?: number;
  backupLimit?: number;
};

function normalize(values: number[]) {
  const max = Math.max(...values, 0);
  if (max <= 0) return values.map(() => 0);
  return values.map((value) => (value / max) * 100);
}

function countDigits(rows: HistoryEntry[]) {
  const counts = Array.from({ length: 10 }, () => 0);
  for (const row of rows) {
    for (const digit of row.digits) counts[digit]++;
  }
  return counts;
}

function candidateDigitSupport(ranked: RankedCandidate[], limit = 30) {
  const counts = Array.from({ length: 10 }, () => 0);
  for (const candidate of ranked.slice(0, limit)) {
    const rankWeight = Math.max(1, limit + 1 - candidate.rank);
    for (const char of candidate.number) {
      counts[Number(char)] += rankWeight;
    }
  }
  return counts;
}

function uniqueDigitCount(candidate: RankedCandidate, coreSet: Set<number>) {
  return new Set(candidate.number.split("").map(Number).filter((digit) => coreSet.has(digit))).size;
}

function warningDigitCount(candidate: RankedCandidate, warningSet: Set<number>) {
  return candidate.number.split("").map(Number).filter((digit) => warningSet.has(digit)).length;
}

function pickCandidates(
  ranked: RankedCandidate[],
  coreDigits: number[],
  warningDigits: number[],
  backupLimit: number
) {
  const coreSet = new Set(coreDigits);
  const warningSet = new Set(warningDigits);

  const preferred = ranked.filter((candidate) => {
    const coreHits = uniqueDigitCount(candidate, coreSet);
    const warningHits = warningDigitCount(candidate, warningSet);
    return coreHits >= 3 && warningHits === 0;
  });

  const fallback = ranked.filter((candidate) => {
    const coreHits = uniqueDigitCount(candidate, coreSet);
    const warningHits = warningDigitCount(candidate, warningSet);
    return coreHits >= 2 && warningHits <= 1;
  });

  const pool = preferred.length > 0 ? preferred : fallback.length > 0 ? fallback : ranked;
  const mainCandidate = pool[0] ?? ranked[0] ?? null;
  const backupCandidates = pool
    .filter((candidate) => candidate.number !== mainCandidate?.number)
    .slice(0, backupLimit);

  return { mainCandidate, backupCandidates };
}

export function buildCoreSignal({
  history,
  ranked,
  coreLimit = 5,
  warningLimit = 1,
  backupLimit = 4,
}: BuildCoreSignalParams): CoreSignal {
  const globalCounts = countDigits(history);
  const recentCounts = countDigits(history.slice(-30));
  const dayContext = getNextDrawContext(history);
  const dayRows =
    dayContext.nextDayIndex === null
      ? []
      : history.filter((entry) => dayIndexFromDate(entry.date) === dayContext.nextDayIndex);
  const dayCounts = countDigits(dayRows);
  const rankedCounts = candidateDigitSupport(ranked, 30);

  const globalSupport = normalize(globalCounts);
  const recentSupport = normalize(recentCounts);
  const daySupport = normalize(dayCounts);
  const candidateSupport = normalize(rankedCounts);

  const items: CoreDigitItem[] = Array.from({ length: 10 }, (_, digit) => {
    const score =
      globalSupport[digit] * 0.2 +
      recentSupport[digit] * 0.25 +
      daySupport[digit] * 0.25 +
      candidateSupport[digit] * 0.3;

    const strongest = [
      { label: "global", value: globalSupport[digit] },
      { label: "recent", value: recentSupport[digit] },
      { label: "day", value: daySupport[digit] },
      { label: "candidate", value: candidateSupport[digit] },
    ].sort((a, b) => b.value - a.value)[0];

    return {
      digit,
      score,
      globalSupport: globalSupport[digit],
      recentSupport: recentSupport[digit],
      daySupport: daySupport[digit],
      candidateSupport: candidateSupport[digit],
      reason:
        strongest.value <= 0
          ? "low support across the engine"
          : `strongest ${strongest.label} support`,
    };
  }).sort((a, b) => b.score - a.score);

  const coreDigits = items.slice(0, coreLimit);
  const warningDigits = [...items].sort((a, b) => a.score - b.score).slice(0, warningLimit);
  const picked = pickCandidates(
    ranked,
    coreDigits.map((item) => item.digit),
    warningDigits.map((item) => item.digit),
    backupLimit
  );

  return {
    coreDigits,
    warningDigits,
    mainCandidate: picked.mainCandidate,
    backupCandidates: picked.backupCandidates,
    nextDrawDay: dayContext.nextDayName,
  };
}
