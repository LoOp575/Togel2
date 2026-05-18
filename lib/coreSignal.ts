import type { HistoryEntry, RankedCandidate } from "@/types";
import { dayIndexFromDate, getNextDrawContext } from "./dayOfWeek";
import { buildEulerPhaseSupport } from "./eulerPhase";

const LN2 = Math.LN2;

type FormulaSignalKey = "global" | "recent" | "dayFit" | "eulerPhase" | "resonance" | "candidate";

export type FormulaSignal = {
  key: FormulaSignalKey;
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
  formulaSupportCount: number;
  formulaSources: string[];
  reason: string;
};

export type MixerRead = {
  consensusDigits: number[];
  coverageDigits: number[];
  weightedDigits: number[];
  finalCoreDigits: number[];
};

export type CoreSignal = {
  coreDigits: CoreDigitItem[];
  warningDigits: CoreDigitItem[];
  mainCandidate: RankedCandidate | null;
  backupCandidates: RankedCandidate[];
  nextDrawDay: string | null;
  formulaSignals: FormulaSignal[];
  mixer: MixerRead;
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
    for (const char of candidate.number) counts[Number(char)] += rankWeight;
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

function addUnique(target: number[], digit: number, limit: number) {
  if (target.length < limit && !target.includes(digit)) target.push(digit);
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
    { key: "global", label: "Global Frequency", digits: topDigits(params.globalSupport), read: "Digit yang paling kuat dari seluruh history." },
    { key: "recent", label: "Recent Momentum", digits: topDigits(params.recentSupport), read: "Digit yang sedang aktif pada draw terbaru." },
    { key: "dayFit", label: "Day Fit", digits: topDigits(params.daySupport), read: "Digit yang cocok dengan hari draw berikutnya." },
    { key: "eulerPhase", label: "Euler Phase", digits: topDigits(params.phaseSupport), read: "Digit yang paling selaras dengan siklus hari berikutnya." },
    { key: "resonance", label: "Resonance", digits: topDigits(params.resonanceSupport), read: "Digit yang kuat karena recent momentum dan cycle sama-sama mendukung." },
    { key: "candidate", label: "Candidate Support", digits: topDigits(params.candidateSupport), read: "Digit yang paling sering muncul di formasi ranking atas." },
  ];
}

function formulaSupport(formulaSignals: FormulaSignal[]) {
  const counts = Array.from({ length: 10 }, () => 0);
  const sources = Array.from({ length: 10 }, () => [] as string[]);
  for (const signal of formulaSignals) {
    for (const digit of signal.digits) {
      counts[digit]++;
      sources[digit].push(signal.label);
    }
  }
  return { counts, sources };
}

function selectCoverageCore(items: CoreDigitItem[], formulaSignals: FormulaSignal[], limit: number): MixerRead {
  const byDigit = new Map(items.map((item) => [item.digit, item]));
  const selected: number[] = [];
  const consensusRank = [...items].sort((a, b) => b.formulaSupportCount - a.formulaSupportCount || b.score - a.score || a.digit - b.digit);
  const weightedRank = [...items].sort((a, b) => b.score - a.score || a.digit - b.digit);

  for (const item of consensusRank) {
    if (item.formulaSupportCount >= 2) addUnique(selected, item.digit, Math.min(2, limit));
  }
  const consensusDigits = [...selected];

  const coverageOrder: FormulaSignalKey[] = ["global", "dayFit", "eulerPhase", "recent", "candidate", "resonance"];
  for (const key of coverageOrder) {
    if (selected.length >= limit) break;
    const formula = formulaSignals.find((item) => item.key === key);
    const candidate = formula?.digits
      .filter((digit) => !selected.includes(digit))
      .map((digit) => byDigit.get(digit))
      .filter((item): item is CoreDigitItem => Boolean(item))
      .sort((a, b) => b.formulaSupportCount - a.formulaSupportCount || b.score - a.score || a.digit - b.digit)[0];
    if (candidate) addUnique(selected, candidate.digit, limit);
  }
  const afterCoverage = [...selected];

  for (const item of consensusRank) addUnique(selected, item.digit, limit);
  for (const item of weightedRank) addUnique(selected, item.digit, limit);

  return {
    consensusDigits,
    coverageDigits: afterCoverage.filter((digit) => !consensusDigits.includes(digit)),
    weightedDigits: selected.filter((digit) => !afterCoverage.includes(digit)),
    finalCoreDigits: selected,
  };
}

function pickCandidates(ranked: RankedCandidate[], coreDigits: number[], warningDigits: number[], backupLimit: number) {
  const coreSet = new Set(coreDigits);
  const warningSet = new Set(warningDigits);
  const preferred = ranked.filter((candidate) => uniqueDigitCount(candidate, coreSet) >= 3 && warningDigitCount(candidate, warningSet) === 0);
  const fallback = ranked.filter((candidate) => uniqueDigitCount(candidate, coreSet) >= 2 && warningDigitCount(candidate, warningSet) <= 1);
  const pool = preferred.length > 0 ? preferred : fallback.length > 0 ? fallback : ranked;
  const mainCandidate = pool[0] ?? ranked[0] ?? null;
  const backupCandidates = pool.filter((candidate) => candidate.number !== mainCandidate?.number).slice(0, backupLimit);
  return { mainCandidate, backupCandidates };
}

export function buildCoreSignal({ history, ranked, coreLimit = 5, warningLimit = 1, backupLimit = 4 }: BuildCoreSignalParams): CoreSignal {
  const globalCounts = countDigits(history);
  const recentCounts = countDigits(history.slice(-30));
  const dayContext = getNextDrawContext(history);
  const dayRows = dayContext.nextDayIndex === null ? [] : history.filter((entry) => dayIndexFromDate(entry.date) === dayContext.nextDayIndex);
  const dayCounts = countDigits(dayRows);
  const rankedCounts = candidateDigitSupport(ranked, 30);

  const globalSupport = normalize(globalCounts);
  const recentSupport = normalize(recentCounts);
  const daySupport = normalize(dayCounts);
  const phaseSupport = buildEulerPhaseSupport(history, dayContext.nextDayIndex).support;
  const cycleSupport = Array.from({ length: 10 }, (_, digit) => daySupport[digit] * 0.6 + phaseSupport[digit] * 0.4);
  const candidateSupport = normalize(rankedCounts);
  const resonanceRaw = Array.from({ length: 10 }, (_, digit) => arungResonanceKernel(recentSupport[digit], cycleSupport[digit]));
  const resonanceSupport = normalize(resonanceRaw);
  const formulaSignals = buildFormulaSignals({ globalSupport, recentSupport, daySupport, phaseSupport, resonanceSupport, candidateSupport });
  const support = formulaSupport(formulaSignals);

  const allItems: CoreDigitItem[] = Array.from({ length: 10 }, (_, digit) => {
    const score = globalSupport[digit] * 0.15 + recentSupport[digit] * 0.2 + cycleSupport[digit] * 0.2 + candidateSupport[digit] * 0.25 + resonanceSupport[digit] * 0.2;
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
      formulaSupportCount: support.counts[digit],
      formulaSources: support.sources[digit],
      reason: strongest.value <= 0 ? "low support across the engine" : `strongest ${strongest.label} support`,
    };
  });

  const mixer = selectCoverageCore(allItems, formulaSignals, coreLimit);
  const itemByDigit = new Map(allItems.map((item) => [item.digit, item]));
  const coreDigits = mixer.finalCoreDigits.map((digit) => itemByDigit.get(digit)).filter((item): item is CoreDigitItem => Boolean(item));
  const warningDigits = [...allItems].sort((a, b) => a.formulaSupportCount - b.formulaSupportCount || a.score - b.score || a.digit - b.digit).slice(0, warningLimit);
  const picked = pickCandidates(ranked, coreDigits.map((item) => item.digit), warningDigits.map((item) => item.digit), backupLimit);

  return {
    coreDigits,
    warningDigits,
    mainCandidate: picked.mainCandidate,
    backupCandidates: picked.backupCandidates,
    nextDrawDay: dayContext.nextDayName,
    formulaSignals,
    mixer,
    formula: {
      name: "Arung Formula Coverage Mixer",
      description: "Setiap formula memberi sinyal terpisah. Mixer memilih core dengan konsensus, perwakilan rumus, lalu skor tertimbang.",
      weights: { global: 15, recent: 20, cycle: 20, candidateSupport: 25, resonance: 20 },
      cycle: "Cycle(d)=0.60*DayFit(d)+0.40*EulerPhaseFit(d)",
      kernel: "Resonance(d)=1/((1-Recent(d)*Cycle(d))*(1+Recent(d))*(1+Cycle(d))*ln(2))",
      normalizer: LN2,
    },
  };
}
