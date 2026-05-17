import { DEFAULT_WEIGHTS, type HistoryEntry } from "@/types";
import { buildCoreSignal } from "./coreSignal";
import { scoreAllCandidates } from "./scoring";

export type SignalCoverage = {
  latest: HistoryEntry;
  priorCoreDigits: number[];
  priorWarningDigits: number[];
  coveredUniqueDigits: number[];
  coveredSlotCount: number;
  coveredCoreCount: number;
  totalSlots: number;
  priorMainCandidate: string | null;
  priorMainRank: number | null;
  priorMainExact: boolean;
  priorMainSamePositionCount: number;
  warningDigitAppeared: boolean;
};

function unique(values: number[]) {
  return Array.from(new Set(values));
}

export function buildSignalCoverage(history: HistoryEntry[]): SignalCoverage | null {
  if (history.length < 8) return null;

  const latest = history[history.length - 1];
  const priorHistory = history.slice(0, -1);
  const priorRanking = scoreAllCandidates(priorHistory, DEFAULT_WEIGHTS);
  const priorSignal = buildCoreSignal({ history: priorHistory, ranked: priorRanking });

  const priorCoreDigits = priorSignal.coreDigits.map((item) => item.digit);
  const priorWarningDigits = priorSignal.warningDigits.map((item) => item.digit);
  const coreSet = new Set(priorCoreDigits);
  const warningSet = new Set(priorWarningDigits);
  const latestDigits = latest.digits;
  const coveredUniqueDigits = unique(latestDigits.filter((digit) => coreSet.has(digit)));
  const coveredSlotCount = latestDigits.filter((digit) => coreSet.has(digit)).length;
  const warningDigitAppeared = latestDigits.some((digit) => warningSet.has(digit));

  const main = priorSignal.mainCandidate;
  const mainDigits = main?.number.split("").map(Number) ?? [];
  const priorMainSamePositionCount = mainDigits.filter(
    (digit, index) => digit === latestDigits[index]
  ).length;

  return {
    latest,
    priorCoreDigits,
    priorWarningDigits,
    coveredUniqueDigits,
    coveredSlotCount,
    coveredCoreCount: coveredUniqueDigits.length,
    totalSlots: latestDigits.length,
    priorMainCandidate: main?.number ?? null,
    priorMainRank: main?.rank ?? null,
    priorMainExact: main?.number === latest.result,
    priorMainSamePositionCount,
    warningDigitAppeared,
  };
}
