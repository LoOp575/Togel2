# 4D Probability Engine

A statistical probability ranking engine for 4-digit (0000–9999) draw data, built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

> **Statistical ranking only, not guaranteed prediction.** Past frequency does not guarantee future results.

## Features

- **Dashboard** — high-level stats: hot/cold digits, recent draws, top adjacent pair, last result.
- **History** — searchable table of bundled draws, with derived sum / odd-even / big-small.
- **Analyzer** — digit frequency, per-position frequency, transition pairs, sum distribution, repeat shapes, odd/even and big/small patterns.
- **Prediction** — ranks all 10,000 candidates by a weighted score. Default view shows the **Top 20**; switch to **All 10,000** for the full searchable list. Click any row to inspect that number's sub-score breakdown.
- **Backtest** — rolling backtest. Trains on past draws, evaluates the actual next draw against the ranking, and reports top-10 / top-50 / top-100 / top-500 hit rates plus average / median / best / worst rank.
- **Settings** — manual sliders for the six scoring weights (`WeightEditor`), persisted to `localStorage`.

## Scoring formula

```
finalScore = 0.35 * positionScore
           + 0.25 * chainScore
           + 0.15 * recencyScore
           + 0.10 * gapScore
           + 0.10 * sumScore
           + 0.05 * patternScore
```

Each sub-score is normalized to 0–100 across all candidates before being weighted, so contributions are directly comparable in the breakdown panel.

## Project structure

```
app/                Next.js App Router pages
  page.tsx            Dashboard
  history/            History page
  analyzer/           Analyzer page
  prediction/         Prediction page
  backtest/           Backtest page
  settings/           Settings page
  layout.tsx          Root layout (sidebar + warning banner)
  globals.css         Tailwind + custom utilities

components/         Reusable UI
  Sidebar.tsx
  WarningBanner.tsx
  PageHeader.tsx
  StatCard.tsx
  DigitBars.tsx
  CandidateTable.tsx
  ScoreBreakdown.tsx
  WeightEditor.tsx

lib/                Pure logic (no React)
  parser.ts           normalizeResult zero-pads, parseHistory sorts asc
  probability.ts      digit/position/Markov-transition stats
  recency.ts          per-position freshness curve
  gap.ts              draws-since-last-seen for each exact number
  patterns.ts         sum dist, OE/BS, repeat-shape pattern stats
  analyzer.ts         aggregates per-feature stats into AnalyzerStats
  scoring.ts          buildCombinedStats + scoreAllCandidates over 10000
  backtest.ts         rolling backtest, top10/50/100/500 hit rates
  data.ts             cached history loader
  settings.ts         localStorage weight persistence

data/history.json   Sample historical draws
types/index.ts      Shared TypeScript types + DEFAULT_WEIGHTS
scripts/smoke.mjs   Pure-Node sanity check (run: npm run smoke)
```

## Data format

`data/history.json` holds an array of:

```json
{ "date": "YYYY-MM-DD", "market": "HK", "result": "4729" }
```

Results that lose their leading zero (e.g. `123` or numeric values) are zero-padded to 4 digits by the parser.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run smoke    # quick parser + scoring + backtest sanity check
```

## Deploy to Vercel

This is a stock Next.js 14 App Router project; pushing this repo to Vercel and accepting the default settings is enough. No environment variables required — the engine runs entirely in the browser using the bundled `data/history.json`.
