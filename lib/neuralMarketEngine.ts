import type { HistoryEntry } from "@/types";
import { dayIndexFromDate, getNextDrawContext } from "./dayOfWeek";
import { buildEulerPhaseSupport } from "./eulerPhase";

const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

export type NeuralSignal = {
  key: string;
  label: string;
  score: number;
  confidence: number;
  topDigits: number[];
  formula: string;
  read: string;
};

export type NeuralMarketState = {
  state: "ACCUMULATION" | "HEATING" | "ROTATION" | "COOLING" | "CHAOTIC" | "NEUTRAL";
  pressure: number;
  confidence: number;
  entropy: number;
  bias: number;
  coreCluster: number[];
  emergingCluster: number[];
  weakCluster: number[];
  nextDrawDay: string | null;
  neurons: NeuralSignal[];
  agentRead: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(values: number[]) {
  const max = Math.max(...values, 0);
  if (max <= 0) return values.map(() => 0);
  return values.map((value) => (value / max) * 100);
}

function topDigits(values: number[], limit = 5) {
  return values
    .map((score, digit) => ({ score, digit }))
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

function digitEntropy(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return 0;
  const entropy = counts.reduce((sum, count) => {
    if (count <= 0) return sum;
    const p = count / total;
    return sum - p * Math.log(p);
  }, 0);
  return clamp((entropy / Math.log(10)) * 100);
}

function chiSquareBias(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return 0;
  const expected = total / 10;
  const chi = counts.reduce((sum, observed) => sum + ((observed - expected) ** 2) / Math.max(expected, 1e-9), 0);
  return clamp(chi * 3.5);
}

function bayesianScores(counts: number[], alpha = 1) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const k = 10;
  return counts.map((count) => ((count + alpha) / Math.max(total + k * alpha, 1)) * 100);
}

function gapScores(history: HistoryEntry[]) {
  const scores = Array.from({ length: 10 }, () => 0);
  for (const digit of DIGITS) {
    let lastSeen = Infinity;
    for (let index = history.length - 1; index >= 0; index--) {
      if (history[index].digits.includes(digit)) {
        lastSeen = history.length - 1 - index;
        break;
      }
    }
    if (!Number.isFinite(lastSeen)) scores[digit] = 55;
    else scores[digit] = clamp((lastSeen / 12) * 100);
  }
  return scores;
}

function markovScores(history: HistoryEntry[]) {
  const transition = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 0));
  for (const row of history) {
    const [a, b, c, d] = row.digits;
    transition[a][b]++;
    transition[b][c]++;
    transition[c][d]++;
  }

  const latest = history[history.length - 1];
  const scores = Array.from({ length: 10 }, () => 0);
  if (!latest) return scores;

  for (const from of latest.digits) {
    for (const digit of DIGITS) scores[digit] += transition[from][digit];
  }
  return normalize(scores);
}

function consensusScores(neurons: NeuralSignal[]) {
  const scores = Array.from({ length: 10 }, () => 0);
  for (const neuron of neurons) {
    neuron.topDigits.slice(0, 3).forEach((digit, index) => {
      scores[digit] += (3 - index) * Math.max(0.35, neuron.confidence / 100);
    });
  }
  return normalize(scores);
}

function avgTop(values: number[], digits: number[]) {
  if (digits.length === 0) return 0;
  return digits.reduce((sum, digit) => sum + (values[digit] ?? 0), 0) / digits.length;
}

function makeNeuron(params: NeuralSignal): NeuralSignal {
  return {
    ...params,
    score: Math.round(clamp(params.score)),
    confidence: Math.round(clamp(params.confidence)),
  };
}

export function buildNeuralMarketState(history: HistoryEntry[]): NeuralMarketState {
  const sampleConfidence = clamp((history.length / 120) * 100, 25, 100);
  const recentRows = history.slice(-30);
  const dayContext = getNextDrawContext(history);
  const dayRows = dayContext.nextDayIndex === null ? [] : history.filter((entry) => dayIndexFromDate(entry.date) === dayContext.nextDayIndex);

  const globalCounts = countDigits(history);
  const recentCounts = countDigits(recentRows);
  const dayCounts = countDigits(dayRows);

  const global = normalize(globalCounts);
  const recent = normalize(recentCounts);
  const dayFit = normalize(dayCounts);
  const euler = buildEulerPhaseSupport(history, dayContext.nextDayIndex).support;
  const bayes = normalize(bayesianScores(globalCounts));
  const gap = gapScores(history);
  const markov = markovScores(history);

  const entropy = digitEntropy(recentCounts.length ? recentCounts : globalCounts);
  const bias = chiSquareBias(globalCounts);
  const momentumPressure = avgTop(recent, topDigits(recent, 3));
  const cyclePressure = avgTop(dayFit.map((value, digit) => value * 0.55 + euler[digit] * 0.45), topDigits(dayFit, 3));
  const rotationPressure = avgTop(gap, topDigits(gap, 3));

  const baseNeurons: NeuralSignal[] = [
    makeNeuron({
      key: "global",
      label: "Global Frequency Neuron",
      score: avgTop(global, topDigits(global, 3)),
      confidence: sampleConfidence,
      topDigits: topDigits(global, 5),
      formula: "P(d)=count(d)/N",
      read: "Membaca digit yang paling dominan dari seluruh history.",
    }),
    makeNeuron({
      key: "recent",
      label: "Recent Momentum Neuron",
      score: momentumPressure,
      confidence: clamp((recentRows.length / 30) * 100, 30, 100),
      topDigits: topDigits(recent, 5),
      formula: "R(d)=Σwᵢ·Iᵢ(d)",
      read: "Membaca digit yang sedang panas pada window draw terbaru.",
    }),
    makeNeuron({
      key: "dayFit",
      label: "Day Fit Neuron",
      score: avgTop(dayFit, topDigits(dayFit, 3)),
      confidence: clamp((dayRows.length / 18) * 100, 25, 100),
      topDigits: topDigits(dayFit, 5),
      formula: "D(d)=count_day(d)/N_day",
      read: "Membaca digit yang selaras dengan hari draw berikutnya.",
    }),
    makeNeuron({
      key: "euler",
      label: "Euler Phase Neuron",
      score: avgTop(euler, topDigits(euler, 3)),
      confidence: sampleConfidence,
      topDigits: topDigits(euler, 5),
      formula: "e^{ix}=cos(x)+i·sin(x)",
      read: "Mengubah siklus hari menjadi fase melingkar untuk membaca alignment digit.",
    }),
    makeNeuron({
      key: "markov",
      label: "Markov Chain Neuron",
      score: avgTop(markov, topDigits(markov, 3)),
      confidence: sampleConfidence,
      topDigits: topDigits(markov, 5),
      formula: "P(next|current)",
      read: "Membaca transisi digit dari pola pasangan berurutan.",
    }),
    makeNeuron({
      key: "gap",
      label: "Gap Rotation Neuron",
      score: rotationPressure,
      confidence: sampleConfidence,
      topDigits: topDigits(gap, 5),
      formula: "Gap=now-lastSeen(d)",
      read: "Membaca digit yang lama tidak muncul dan berpotensi rotasi.",
    }),
    makeNeuron({
      key: "bayesian",
      label: "Bayesian Stability Neuron",
      score: avgTop(bayes, topDigits(bayes, 3)),
      confidence: sampleConfidence,
      topDigits: topDigits(bayes, 5),
      formula: "P=(count+α)/(total+kα)",
      read: "Menstabilkan probabilitas agar sample kecil tidak terlalu ekstrem.",
    }),
  ];

  const consensus = consensusScores(baseNeurons);
  const coreCluster = topDigits(consensus, 5);
  const emergingCluster = topDigits(gap.map((value, digit) => value * 0.45 + euler[digit] * 0.35 + recent[digit] * 0.2), 5);
  const weakCluster = consensus
    .map((score, digit) => ({ score, digit }))
    .sort((a, b) => a.score - b.score || a.digit - b.digit)
    .slice(0, 5)
    .map((item) => item.digit);

  const resonanceScore = clamp(
    avgTop(consensus, coreCluster) * 0.38 +
      momentumPressure * 0.22 +
      cyclePressure * 0.2 +
      (100 - entropy) * 0.08 +
      bayes[coreCluster[0] ?? 0] * 0.12
  );

  const neurons = [
    ...baseNeurons,
    makeNeuron({
      key: "entropy",
      label: "Entropy / Chaos Neuron",
      score: entropy,
      confidence: sampleConfidence,
      topDigits: weakCluster,
      formula: "H=-Σp(x)log(p(x))",
      read: "Mengukur apakah distribusi digit terlalu acak atau mulai terstruktur.",
    }),
    makeNeuron({
      key: "bias",
      label: "Chi-Square Bias Neuron",
      score: bias,
      confidence: sampleConfidence,
      topDigits: topDigits(global, 5),
      formula: "χ²=Σ((O-E)²/E)",
      read: "Mendeteksi apakah frekuensi digit menyimpang dari distribusi rata.",
    }),
    makeNeuron({
      key: "resonance",
      label: "Neural Resonance Mixer",
      score: resonanceScore,
      confidence: sampleConfidence,
      topDigits: coreCluster,
      formula: "Z=Σwᵢxᵢ",
      read: "Menggabungkan semua neuron menjadi tekanan market dan core cluster.",
    }),
  ];

  let state: NeuralMarketState["state"] = "NEUTRAL";
  if (entropy > 86 && resonanceScore < 58) state = "CHAOTIC";
  else if (momentumPressure >= 70 && resonanceScore >= 62) state = "HEATING";
  else if (cyclePressure >= 68 && momentumPressure < 68) state = "ACCUMULATION";
  else if (rotationPressure >= 70 && resonanceScore >= 55) state = "ROTATION";
  else if (momentumPressure < 42) state = "COOLING";

  const confidence = clamp(sampleConfidence * 0.42 + resonanceScore * 0.38 + (100 - Math.min(entropy, 100)) * 0.2);
  const agentRead = buildAgentRead({ state, coreCluster, emergingCluster, weakCluster, resonanceScore, entropy, bias });

  return {
    state,
    pressure: Math.round(resonanceScore),
    confidence: Math.round(confidence),
    entropy: Math.round(entropy),
    bias: Math.round(bias),
    coreCluster,
    emergingCluster,
    weakCluster,
    nextDrawDay: dayContext.nextDayName,
    neurons,
    agentRead,
  };
}

function buildAgentRead(params: {
  state: NeuralMarketState["state"];
  coreCluster: number[];
  emergingCluster: number[];
  weakCluster: number[];
  resonanceScore: number;
  entropy: number;
  bias: number;
}) {
  const stateText: Record<NeuralMarketState["state"], string> = {
    ACCUMULATION: "Market angka sedang terlihat dalam fase akumulasi: cycle cukup kuat, tapi momentum belum terlalu meledak.",
    HEATING: "Market angka sedang memanas: momentum dan resonance sama-sama aktif.",
    ROTATION: "Market angka terlihat sedang rotasi: gap dan fase mulai menarik digit baru ke permukaan.",
    COOLING: "Market angka sedang mendingin: momentum terbaru belum memberi tekanan kuat.",
    CHAOTIC: "Market angka sedang chaotic: entropy tinggi, jadi sinyal perlu dibaca lebih hati-hati.",
    NEUTRAL: "Market angka masih netral: belum ada dominasi neuron yang cukup kuat.",
  };

  return [
    stateText[params.state],
    `Core cluster: ${params.coreCluster.join(" · ")}.`,
    `Emerging cluster: ${params.emergingCluster.join(" · ")}.`,
    `Weak cluster: ${params.weakCluster.join(" · ")}.`,
    `Resonance ${Math.round(params.resonanceScore)}%, entropy ${Math.round(params.entropy)}%, bias ${Math.round(params.bias)}%.`,
  ].join(" ");
}
