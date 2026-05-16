import type { ScoreWeights } from "@/types";
import { DEFAULT_WEIGHTS } from "@/types";

const STORAGE_KEY = "p4d.weights.v1";

export function loadWeights(): ScoreWeights {
  if (typeof window === "undefined") return { ...DEFAULT_WEIGHTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WEIGHTS };
    const parsed = JSON.parse(raw) as Partial<ScoreWeights>;
    return {
      positionScore: numberOr(parsed.positionScore, DEFAULT_WEIGHTS.positionScore),
      chainScore: numberOr(parsed.chainScore, DEFAULT_WEIGHTS.chainScore),
      recencyScore: numberOr(parsed.recencyScore, DEFAULT_WEIGHTS.recencyScore),
      gapScore: numberOr(parsed.gapScore, DEFAULT_WEIGHTS.gapScore),
      sumScore: numberOr(parsed.sumScore, DEFAULT_WEIGHTS.sumScore),
      patternScore: numberOr(parsed.patternScore, DEFAULT_WEIGHTS.patternScore),
    };
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
}

export function saveWeights(weights: ScoreWeights): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  } catch {
    // ignore
  }
}

export function resetWeights(): ScoreWeights {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return { ...DEFAULT_WEIGHTS };
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
}
