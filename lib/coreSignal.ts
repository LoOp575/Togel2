import type { HistoryEntry, RankedCandidate } from "@/types";
import { dayIndexFromDate, getNextDrawContext } from "./dayOfWeek";
import { buildEulerPhaseSupport } from "./eulerPhase";

const LN2 = Math.LN2;

export type FormulaSignal = {
  key: "global" | "recent" | "dayFit" | "eulerPhase" | "resonance" | "candidate";
  label: string;
  digits: number[];
  read: string;
};

export type CoreDigitItem = {
  digit: number;
  score: number;
  globalSupport: number;
  recentSupport: number;
  daySupport: number;
  phaseSupport: number;
  cycleSupport: number;
  candidateSupport: number;
  resonanceSupport: number;
  resonanceRaw: number;
  reason: string;
};

export type CoreSignal = {
  coreDigits: CoreDigitItem[];
  warningDigits: CoreDigitItem[];
  mainCandidate: RankedCandidate | null;
  backupCandidates: RankedCandidate[];
  nextDrawDay: string | null;
  formulaSignals: FormulaSignal[];
  formula: {
    name: string;
    description: string;
    weights: Record<string, number>;
    kernel: string;
    cycle: string;
    normalizer: number;
  };
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

function topDigits(values: number[], limit = 3) {
  return values
    .map((score, digit) => ({ digit, score }))
    .sort((a, b) => b.score - a.score || a.digit - b.digit)
    .slice(0, limit)
    .map((item) => item.digit);
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

function arungResonanceKernel(recent: number, cycle: number) {
  const x = Math.min(0.999, Math.max(0, recent / 100));
  const y = Math.min(0.999, Math.max(0, cycle / 100));
  const denominator = Math.max(1e-6, (1 - x * y) * (1 + x) * (1 + y) * LN2);
  return 1 / denominator;
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

function buildFormulaSignals(params: {
  globalSupport: number[];
  recentSupport: number[];
  daySupport: number[];
  phaseSupport: number[];
  resonanceSupport: number[];
  candidateSupport: number[];
}): FormulaSignal[] {
  return [
    {
      key: "global",
      label: "Global Frequency",
      digits: topDigits(params.globalSupport),
      read: "Digit yang paling kuat dari seluruh history.",
    },
    {
      key: "recent",
      label: "Recent Momentum",
      digits: topDigits(params.recentSupport),
      read: "Digit yang sedang aktif pada draw terbaru.",
    },
    {
      key: "dayFit",
      label: "Day Fit",
      digits: topDigits(params.daySupport),
      read: "Digit yang cocok dengan hari draw berikutnya.",
    },
    {
      key: "eulerPhase",
      label: "Euler Phase",
      digits: topDigits(params.phaseSupport),
      read: "Digit yang paling selaras dengan siklus hari berikutnya.",
    },
    {
      key: "resonance",
      label: "Resonance",
      digits: topDigits(params.resonanceSupport),
      read: "Digit yang kuat karena recent momentum dan cycle sama-sama mendukung.",
    },
    {
      key: "candidate",
      label: "Candidate Support",
      digits: topDigits(params.candidateSupport),
      read: "Digit yang paling sering muncul di formasi ranking atas.",
    },
  ];
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
  const phaseSupport = buildEulerPhaseSupport(history, dayContext.nextDayIndex).support;
  const cycleSupport = Array.from({ length: 10 }, (_, digit) =>
    daySupport[digit] * 0.6 + phaseSupport[digit] * 0.4
  );
  const candidateSupport = normalize(rankedCounts);
  const resonanceRaw = Array.from({ length: 10 }, (_, digit) =>
    arungResonanceKernel(recentSupport[digit], cycleSupport[digit])
  );
  const resonanceSupport = normalize(resonanceRaw);
  const formulaSignals = buildFormulaSignals({
    globalSupport,
    recentSupport,
    daySupport,
    phaseSupport,
    resonanceSupport,
    candidateSupport,
  });

  const items: CoreDigitItem[] = Array.from({ length: 10 }, (_, digit) => {
    const score =
      globalSupport[digit] * 0.15 +
      recentSupport[digit] * 0.2 +
      cycleSupport[digit] * 0.2 +
      candidateSupport[digit] * 0.25 +
      resonanceSupport[digit] * 0.2;

    const strongest = [
      { label: "global", value: globalSupport[digit] },
      { label: "recent", value: recentSupport[digit] },
      { label: "cycle", value: cycleSupport[digit] },
      { label: "phase", value: phaseSupport[digit] },
      { label: "candidate", value: candidateSupport[digit] },
      { label: "resonance", value: resonanceSupport[digit] },
    ].sort((a, b) => b.value - a.value)[0];

    return {
      digit,
      score,
      globalSupport: globalSupport[digit],
      recentSupport: recentSupport[digit],
      daySupport: daySupport[digit],
      phaseSupport: phaseSupport[digit],
      cycleSupport: cycleSupport[digit],
      candidateSupport: candidateSupport[digit],
      resonanceSupport: resonanceSupport[digit],
      resonanceRaw: resonanceRaw[digit],
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
    formulaSignals,
    formula: {
      name: "Arung Formula Mixer",
      description:
        "Setiap formula memberi sinyal terpisah, lalu mixer menggabungkan semuanya menjadi core digit dan formation.",
      weights: {
        global: 15,
        recent: 20,
        cycle: 20,
        candidateSupport: 25,
        resonance: 20,
      },
      cycle: "Cycle(d)=0.60*DayFit(d)+0.40*EulerPhaseFit(d)",
      kernel: "Resonance(d)=1/((1-Recent(d)*Cycle(d))*(1+Recent(d))*(1+Cycle(d))*ln(2))",
      normalizer: LN2,
    },
  };
}
