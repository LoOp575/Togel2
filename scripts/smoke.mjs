// Standalone smoke test for the pure logic in lib/.
// Run with: node scripts/smoke.mjs
//
// Re-implements the same algorithms in plain JS (no TS / React imports),
// loads data/history.json, and checks the parser + a small in-memory scoring
// + backtest pipeline. Intended as a fast "does the algorithm shape work?"
// sanity check, not a substitute for the real lib/ build.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ----- parser ---------------------------------------------------------------
function normalizeResult(raw) {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim().replace(/\D/g, "");
  if (!s) return "";
  if (s.length > 4) s = s.slice(-4);
  return s.padStart(4, "0");
}

function parseHistory(arr) {
  const out = [];
  for (const r of arr) {
    if (!r) continue;
    if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    if (typeof r.market !== "string" || !r.market) continue;
    const result = normalizeResult(r.result);
    if (!/^\d{4}$/.test(result)) continue;
    out.push({
      date: r.date,
      market: r.market.toUpperCase(),
      result,
      digits: [Number(result[0]), Number(result[1]), Number(result[2]), Number(result[3])],
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

function digitsOf(num) {
  return [Number(num[0]), Number(num[1]), Number(num[2]), Number(num[3])];
}

function formatCandidate(n) {
  return n.toString().padStart(4, "0");
}

// ----- mini scoring (just enough to validate ranking shape) -----------------
function scoreAll(history) {
  const total = history.length;
  if (total === 0) return [];

  const positionFreq = Array.from({ length: 4 }, () => new Array(10).fill(0));
  const transitionFreq = Array.from({ length: 10 }, () => new Array(10).fill(0));
  const lastSeen = {};
  for (let i = history.length - 1; i >= 0; i--) {
    const num = history[i].result;
    if (!(num in lastSeen)) lastSeen[num] = history.length - 1 - i;
  }

  for (const e of history) {
    const [a, b, c, d] = e.digits;
    positionFreq[0][a]++;
    positionFreq[1][b]++;
    positionFreq[2][c]++;
    positionFreq[3][d]++;
    transitionFreq[a][b]++;
    transitionFreq[b][c]++;
    transitionFreq[c][d]++;
  }

  const positionProb = positionFreq.map((row) => row.map((c) => c / total));
  const transitionProb = transitionFreq.map((row) => {
    const s = row.reduce((acc, v) => acc + v, 0);
    return s === 0 ? row.map(() => 0.1) : row.map((v) => v / s);
  });

  const candidates = [];
  let bestPos = 0;
  let bestChain = 0;
  let bestGap = 0;
  for (let n = 0; n < 10000; n++) {
    const num = formatCandidate(n);
    const [d0, d1, d2, d3] = digitsOf(num);
    const pos =
      (positionProb[0][d0] + positionProb[1][d1] + positionProb[2][d2] + positionProb[3][d3]) / 4;
    const chain = Math.cbrt(
      (transitionProb[d0][d1] + 1e-6) *
        (transitionProb[d1][d2] + 1e-6) *
        (transitionProb[d2][d3] + 1e-6)
    );
    const gapDraws = num in lastSeen ? lastSeen[num] : total;
    const gap = Math.min(1, gapDraws / total);
    if (pos > bestPos) bestPos = pos;
    if (chain > bestChain) bestChain = chain;
    if (gap > bestGap) bestGap = gap;
    candidates.push({ num, pos, chain, gap });
  }

  const safe = (x) => (x === 0 ? 1 : x);
  for (const c of candidates) {
    const positionScore = (c.pos / safe(bestPos)) * 100;
    const chainScore = (c.chain / safe(bestChain)) * 100;
    const gapScore = (c.gap / safe(bestGap)) * 100;
    // Approximation: only the three biggest weights for the smoke check
    c.finalScore = positionScore * 0.35 + chainScore * 0.25 + gapScore * 0.1;
  }
  candidates.sort((a, b) => b.finalScore - a.finalScore);
  return candidates.map((c, i) => ({ ...c, rank: i + 1 }));
}

function findRank(ranked, num) {
  for (const r of ranked) if (r.num === num) return r.rank;
  return 0;
}

// ----- assertions -----------------------------------------------------------
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok  :", msg);
  }
}

// Parser checks
const raw = JSON.parse(readFileSync(resolve(root, "data/history.json"), "utf8"));
const history = parseHistory(raw);

assert(history.length === raw.length, `parsed ${history.length} of ${raw.length} entries`);
assert(
  history.every((h) => /^\d{4}$/.test(h.result)),
  "every result is exactly 4 digits"
);
assert(
  history.find((h) => h.result === "0123") !== undefined,
  'leading-zero result "0123" preserved'
);
assert(
  history.find((h) => h.result === "0042") !== undefined,
  'leading-zero result "0042" preserved'
);
assert(normalizeResult(123) === "0123", "normalizeResult(number 123) -> '0123'");
assert(normalizeResult("1") === "0001", "normalizeResult('1') -> '0001'");
assert(normalizeResult("99999") === "9999", "normalizeResult('99999') keeps last 4 -> '9999'");
assert(normalizeResult("") === "", "normalizeResult('') -> ''");
assert(
  history.every((h, i, arr) => i === 0 || arr[i - 1].date <= h.date),
  "history sorted ascending by date"
);

// Digit slot frequency = 4 * totalDraws
const digitFreq = new Array(10).fill(0);
for (const h of history) for (const d of h.digits) digitFreq[d]++;
const totalSlots = digitFreq.reduce((s, v) => s + v, 0);
assert(totalSlots === history.length * 4, `digit slots total = ${totalSlots}`);

// Scoring + ranking checks
const ranked = scoreAll(history);
assert(ranked.length === 10000, "scoreAll returns 10000 candidates");
assert(ranked[0].rank === 1 && ranked[9999].rank === 10000, "ranks are 1..10000");
assert(
  ranked.every((c, i) => i === 0 || ranked[i - 1].finalScore >= c.finalScore),
  "candidates sorted by finalScore descending"
);
const uniqueNumbers = new Set(ranked.map((c) => c.num));
assert(uniqueNumbers.size === 10000, "all 10000 candidate numbers present, no duplicates");
assert(
  ["0000", "0001", "1234", "4729", "9999"].every((n) => uniqueNumbers.has(n)),
  "candidate set covers boundaries (0000, 0001, 9999) and known historical values"
);

// Mini rolling backtest
const train = history.slice(0, history.length - 5);
const trainedRanked = scoreAll(train);
const ranks = [];
for (let i = history.length - 5; i < history.length; i++) {
  ranks.push(findRank(trainedRanked, history[i].result));
}
assert(
  ranks.every((r) => r >= 1 && r <= 10000),
  `rolling backtest produced valid ranks: [${ranks.join(", ")}]`
);

// Final summary
const avgRank = ranks.reduce((s, v) => s + v, 0) / ranks.length;
console.log("\nhistory window:", history[0].date, "→", history[history.length - 1].date);
console.log("total draws:", history.length);
console.log("digit frequency:", digitFreq);
console.log(`mini-backtest avg rank over last 5 draws: ${avgRank.toFixed(0)} (random ~ 5000)`);
