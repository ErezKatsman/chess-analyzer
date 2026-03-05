---
name: summarize-period
description: Implement Slice 3 of the 5-slice plan — enforce aggregation window (20 games / 60 days) and add recency decay + confidence scoring to cross-game pattern aggregation. The basic features (PatternSummary, ProgressChart, WeaknessDrills) are already built.
---

## summarize-period skill

Slice 3 of the CLAUDE.md 5-slice plan. The core cross-game UI is already built; this slice adds
the window enforcement and weighted scoring that makes the weakness leaderboard meaningful.

### what is already built — do not re-implement
- `lib/analysis/patternSummary.ts` — flat gameCount per tag, sorted descending
- `components/PatternSummary.tsx` — ranked weakness list with coaching hints
- `components/ProgressChart.tsx` — dual-axis recharts: accuracy (left) + rating (right), dots by result
- `components/WeaknessDrills.tsx` — cross-game drill component from top pattern tag
- `GET /api/drills/generated` — filters by top pattern + excludes solved DrillSessions
- `GameAnalysis.accuracy: { white, black }` — stored at analysis time (chess.com formula) ✅

### what slice 3 adds

**aggregation window** (enforce in `lib/analysis/patternSummary.ts`)
- window: last 20 analyzed games OR last 60 days — whichever is smaller
- minimum 3 analyzed games required; return empty leaderboard below that threshold

**recency decay + confidence scoring**
```ts
// gameIndex 0 = most recent; games > 60 days → weight 0 regardless of index
recencyWeight = 0.9 ** gameIndex

// confidence: how strongly this game confirms the pattern
// pattern.evidenceMoves already exists on Pattern — no new schema field needed
// it holds the 1-indexed move numbers of all supporting turning points
confidence = Math.min(1, pattern.evidenceMoves.length / 3)

// final score replaces flat gameCount
score[tag] += confidence * recencyWeight
```

**tie-breaker** — tags within 0.05 score of each other:
1. prefer `selfReportedWeakness` from `UserProfile` (passed in from server)
2. else prefer higher raw `gameCount`

### accuracy formula (already implemented — do NOT change)
`103.1668 × exp(-0.04354 × avgCpLoss) - 3.1669` — caps per-move loss at 1000cp, returns 0–100.
Stored in `GameAnalysis.accuracy`. Never use the old linear formula `100 - (avgCentipawnLoss / 10)`.

### files to touch (Slice 3 only)
1. `lib/analysis/patternSummary.ts` — add `score` field to `PatternSummaryEntry`; enforce window + decay
2. `components/UserPageContent.tsx` — pass games in recency order (most recent first) + `selfReportedWeakness`
3. `components/PatternSummary.tsx` — optionally surface `score` in UI if helpful

### rules
- max 3 files / ~150 LOC per slice
- read each file before editing
- run `npm run typecheck && npm run lint` after changes
- do not change the chess.com accuracy formula
- do not add new API routes
