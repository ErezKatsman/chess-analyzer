# chess-analyzer — claude code guide

## product goal
**chess improvement platform** — show players their weaknesses across ALL games, prove they're improving, give personalized drills. not just per-game analysis.

paywall converts when user sees their training score going up over time (ROI proof).

---

## PRODUCT PRIORITIES (read first — governs all decisions)

1. **cross-game weakness detection is the product.** per-game analysis is fuel, not the destination.
2. **first-session value matters most.** if the first 10 minutes don't deliver the core promise, nothing else matters.
3. **training score is the only metric shown to users.** the accuracy/training toggle has been removed. only training score is displayed in the dashboard. accuracy is still stored in DB for internal use.
4. **small slices only.** max 3 files per slice, ~150 LOC. read before edit. preserve existing behavior unless the change is intentional.
5. **do not add features before fixing the core loop.** the loop is: play → analyze → see weakness → drill → see progress → return.

---

## ACTIVE IMPLEMENTATION PLAN

| slice | goal | status | files |
|---|---|---|---|
| Slice A | remove metric toggle + settings tab | ✅ done | `UserPageTabs.tsx` only |
| Slice B | fix free tier: 3/month → 10 lifetime (via `GameAnalysis.countDocuments`) | ✅ done | `app/api/analyze/route.ts`, `app/api/user/quota/route.ts`, `lib/hooks/useAnalysisQuota.ts` |
| Slice C | auto-analyze 5 games after first connect → redirect to Coach tab | ✅ done | `ConnectAccount.tsx`, `UserPageTabs.tsx`, new `QuickAnalysisLoader.tsx` |
| Slice 1B | coaching-first post-analysis screen (CoachingSummary) | ✅ done | `QuickAnalysisLoader.tsx`, `UserPageTabs.tsx`, new `CoachingSummary.tsx` |
| Slice D | weekly email digest | ⏳ not started | new scheduled task + email sender |

**update this table when a slice completes.**

---

## DO NOT TOUCH YET

these are working correctly. do not modify until you have real user feedback or a specific reason:

- `lib/analysis/` — entire folder (stockfish, insights, patterns, accuracy, progressUtils, patternSummary)
- `GameReplay.tsx` — complex, works, no user complaints
- `ChessBoard.tsx` — FLIP animation is fragile; set-diff reconcile must not be changed
- `DrillPanel.tsx` + `useDrillState.ts` — Leitner SRS works
- `CoachingSummary.tsx` — first-session screen works; do not modify until after user testing
- `middleware.ts` — route protection is correct
- `lib/db/schemas.ts` — do not add fields without a specific slice requiring it
- `OnboardingModal.tsx` — overbuilt but not blocking; delay simplification until after user testing
- `app/api/explain/route.ts` + `app/api/lessons/route.ts` — AI routes work, caching is correct
- `UserQuota` collection — leave in place after Slice B (harmless, useful as fallback reference)
- Stripe code — done; only needs env vars. do not touch the code.

---

## user flows (current state)

```
FLOW 1 — anonymous browse (not signed in)
  / (Hero) → "Analyze My Games →" → OnboardingModal (6 steps)
  → openSignIn() → auth → ConnectAccount (FLOW 3)
  OR: skip modal → browse → /user?userName=X → raw games, no analysis

FLOW 2 — sign in (no profile yet)
  navbar Sign In → Clerk modal
  → auth → app/page.tsx:
      has profile  → dashboard (/)
      no profile   → ConnectAccount (/)

FLOW 3 — connect chess.com account (first-time only)
  ConnectAccount → type username → validate → POST /api/user/profile
  → sets sessionStorage['chess_quick_analysis']='1' → router.push('/') + router.refresh()
  → UserPageTabs detects flag + no analyzed games → shows QuickAnalysisLoader
  → sequential POST /api/analyze for up to 5 most recent games (90s AbortController per game)
  → QuickAnalysisLoader calls onComplete() when done (does NOT own navigation)
  → UserPageTabs.handleAnalysisComplete():
      setShowLoader(false)
      sessionStorage.setItem('chess_coaching_summary', '1')
      sessionStorage.removeItem('chess_quick_analysis')
      router.refresh()  ← re-fetches server component data (patterns, progressPoints)
  → After refresh: hasSummaryFlag=true + patternEntries arrives → showCoachingSummary=true
  → CoachingSummary renders (top weakness + drill cards + training score baseline)
  → user dismisses → clears flag → normal 4-tab dashboard
  NOTE: if coming from OnboardingModal, sessionStorage has pre-filled username
        ConnectAccount reads ONBOARDING_KEY on mount and auto-submits (same flag logic applies)
  NOTE: router.push('/') is a NO-OP when already at '/' — never use it in this flow

FLOW 4 — personal dashboard (signed in + has profile)
  / → UserPageContent basePath="/"
  → 4 tabs: Coach / Progress / Games / Profile
  → Coach: sparkline + top weakness + PatternSummary
  → Progress: ProgressChart (rating + training score over time)
  → Games: GamesTable with ✓ analyzed badges + analyze buttons
  → click Analyze → /game?... → GameReplay full analysis
  → drill practice at /drills (WeaknessDrills + per-game DrillPanel)

FLOW 5 — change username
  dashboard Profile tab → ChangeUsernameButton → DELETE /api/user/profile
  → router.push('/') → ConnectAccount (FLOW 3)

FLOW 6 — quota / paywall
  Analyze → quota hit (10 lifetime free) → PaywallModal → Stripe checkout
  → /upgrade/success → plan='paid' → unlimited
```

### routing rules
| path | protected? | who sees it |
|---|---|---|
| `/` | no | Hero (anon) · ConnectAccount (signed in, no profile) · Dashboard (signed in + profile) |
| `/user?userName=X` | no | raw browse for anyone — no personal data |
| `/game?...` | yes | signed-in users — analyze + replay |
| `/drills` | yes | signed-in users |

---

## current state — what is built

| area | status | key files |
|---|---|---|
| auth + quota | ✅ (free tier: 10 lifetime analyses via `GameAnalysis.countDocuments`) | `middleware.ts`, `PaywallModal`, `lib/hooks/useAnalysisQuota.ts` |
| chess.com fetch | ✅ | `lib/services/chesscom.ts`, `lib/db/cachedChesscom.ts` |
| stockfish pipeline | ✅ | `lib/analysis/stockfish.ts`, `insights.ts`, `patterns.ts` |
| ai explanations | ✅ | `app/api/explain/route.ts`, cached in `GameAnalysis` |
| ai lessons | ✅ | `app/api/lessons/route.ts`, `LessonCard.tsx` |
| drill UI (per-game) | ✅ | `DrillPanel.tsx`, `useDrillState.ts`, `api/drills/attempt` |
| cross-game drills | ✅ | `WeaknessDrills.tsx`, `api/drills/generated/route.ts` |
| stripe payments | ✅ code, ⚠️ needs env vars | `api/stripe/checkout`, `api/stripe/webhook` |
| animated board | ✅ | `ChessBoard.tsx` (framer-motion FLIP + set-diff reconcile) |
| game replay UI | ✅ | `GameReplay.tsx` — 3 tabs: moves / analysis / lessons |
| move annotations | ✅ | all moves marked: `??/?/?!/!/normal` via `moveQualityMap` from evals[] |
| accuracy score | ✅ stored in DB | chess.com formula in `api/analyze`, stored in `GameAnalysis.accuracy` |
| game narrative | ✅ | `buildNarrative()` in `AnalysisPanel.tsx` |
| keyboard nav | ✅ | `←→` arrow keys in `GameReplay.tsx` |
| eval graph | ✅ | `EvalGraph.tsx` — colored markers: red/orange/yellow per severity |
| games table | ✅ | `GamesTable.tsx`, `StatsBar.tsx` |
| progress chart | ✅ | `ProgressChart.tsx`, `lib/analysis/progressUtils.ts` |
| pattern summary | ✅ | `PatternSummary.tsx`, `lib/analysis/patternSummary.ts` |
| onboarding modal | ✅ | `OnboardingModal.tsx` — 6-step modal, saves to sessionStorage |
| dashboard tabs | ✅ | `UserPageTabs.tsx` — 4 tabs: Coach / Progress / Games / Profile |
| first-session loader | ✅ | `QuickAnalysisLoader.tsx` — auto-analyzes 5 games; calls `onComplete()` callback when done |
| coaching summary | ✅ | `CoachingSummary.tsx` — shown once after first-session; top weakness + drill cards + baseline score |
| profile tab | ✅ | plan badge (shows "10 lifetime analyses") + ChangeUsername + onboarding answers |
| navbar | ✅ | lucide icons + active tab highlight |
| browse mode | ✅ | Hero → `/user?userName=X` (no auth, no personal data) |

### stripe — needs 4 env vars (see NOTES.md) — do last

### training score + accuracy — two metrics stored in DB, one shown in UI
- `GameAnalysis.accuracy: { white, black }` — chess.com formula (strict, collapses ~0 at avgCpLoss ≥80cp) — stored in DB, not displayed in the dashboard
- `GameAnalysis.avgCpLoss: { white, black }` — stored alongside; used to derive training score
- **training score** = `max(0, 100 − avgCpLoss × 0.5)` — friendlier curve: 0cp→100, 100cp→50, 200cp→0
- `trainingScoreRecord` (uuid→{white,black}) computed server-side in `UserPageContent` from `avgCpLoss`
- training score is always used; the accuracy/training toggle has been removed; `accuracyRecord` still computed server-side but is not displayed
- GamesTable badge thresholds: training score green≥70 / yellow≥50 / red<50

---

## completed slices — historical record

### ~~slice 1 — unify accuracy formula~~ ✅ DONE
`lib/analysis/accuracy.ts` created; `progressUtils.ts`, `game-replay/utils.ts`, `api/analyze/route.ts` all import from it.
`buildProgressPoint` accepts optional `storedAccuracy?` to skip recomputation.

### ~~slice 2 — store all TPs; filter at display time~~ ✅ DONE
`allTurningPoints` (both sides) saved to DB; `playerTurningPoints` used only for `detectPatterns`.
`TurningPoint.bestMove?: string` (UCI) added; populated from `evalBefore.bestMove` in `insights.ts`.
`AnalysisPanel.tsx` + `GameReplay.tsx` filter by `tp.side === playerSide` at display time.
Opponent blunder count in narrative now correct.

### ~~slice 3 — aggregation window (20 games / 60 days) + recency decay~~ ✅ DONE
`Pattern.confidence` added; `patterns.ts` computes `min(1, matchingTPs/3)`; `patternSummary.ts`: 60-day window + 20-game cap + `score += confidence × 0.9^i`; `UserPageContent` passes `analyzedAt` + `selfReportedWeakness`.

### ~~slice 4 — two-box leitner SRS for drills~~ ✅ DONE
`DrillSession.nextReviewAt?: Date` + unique compound index added; attempt route sets +3d on solve, +6h on fail≥2; generated route filters snoozed sessions (`nextReviewAt > now`) + returns `dueCount`.

### ~~slice 5 — stale analysis detection + free re-analysis~~ ✅ DONE
`api/analyze/route.ts`: `force?: boolean` in body; bypasses quota when `force=true && cached.analysisVersion < CURRENT_VERSION`.
`app/game/page.tsx`: reads `analysisVersion`, passes `isStale` to `GameReplay`.
`GameReplay.tsx`: amber banner when `isStale`; "Re-analyze" button calls `handleAnalyze(force=true)`.

### other completed items
- ~~accuracy trend line in ProgressChart~~ ✅ — uses stored `GameAnalysis.accuracy[playerSide]`; gated behind ≥3 analyzed games
- ~~"practice this now" CTA~~ ✅ — "Practice now →" in AnalysisPanel when ≥1 player TP or pattern; routes to `/drills`
- **connect stripe** — add env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_APP_URL`

---

## mongodb schemas (`lib/db/schemas.ts`)
- `GameAnalysis` — (clerkUserId, gameUuid) → evals, turningPoints, patterns, explanations, lessons
  - `accuracy: { white: number; black: number }` — chess.com formula, stored at analysis time
  - `avgCpLoss: { white: number; black: number }` — stored alongside; enables training score without re-reading evals
  - `analysisVersion: number` — current = 1; bump when pipeline changes
  - `playerSide: 'white' | 'black'` — stored at analysis time
  - turningPoints: ALL TPs (both sides) stored; filter by `tp.side` at display time
- `UserQuota` — (clerkUserId, month) → usage count — collection still exists in DB; quota logic now uses `GameAnalysis.countDocuments` instead (leave collection in place, harmless)
- `DrillSession` — (clerkUserId, gameUuid, moveNumber, side)
  - `solved: boolean`, `attempts: number`
  - `nextReviewAt?: Date` + unique compound index `{ clerkUserId, gameUuid, moveNumber, side }`
- `CachedGames` — chess.com archive cache (TTL 1h)
- `UserProfile` — clerkUserId → chessUsername + plan ('free'|'paid') + stripe IDs
  - optional: targetRating, timePreference, experience, selfReportedWeakness

---

## file structure
```
app/
  api/
    analyze/route.ts              POST — stockfish + insights + cache
    explain/route.ts              POST — claude haiku explanations
    lessons/route.ts              POST — claude haiku lessons per pattern
    drills/
      attempt/route.ts            POST — save drill result
      generated/route.ts          GET  — cross-game weakness drills
    stripe/checkout/route.ts      POST — create stripe checkout session
    stripe/webhook/route.ts       POST — handle stripe events
    user/
      quota/route.ts              GET  — live quota
      profile/route.ts            GET/POST/DELETE — chess.com username linking
      check-chess-com/route.ts    GET  — validate chess.com username exists
  game/page.tsx                   server component: loads game + cached analysis
  user/page.tsx                   thin wrapper: public browse (no auth required)
  drills/page.tsx                 WeaknessDrills + drill history
  upgrade/success/page.tsx        post-payment landing

components/
  UserPageContent.tsx             shared server component — dashboard or browse
  UserPageTabs.tsx                client: 4-tab nav (Coach/Progress/Games/Profile); shows QuickAnalysisLoader on first connect
  QuickAnalysisLoader.tsx         client: first-session loader — sequential analysis, calls onComplete() callback
  CoachingSummary.tsx             client: shown once after first-session; top weakness + drill cards; onDismiss → normal tabs
  ConnectAccount.tsx              client: sole save point for chess.com username; sets chess_quick_analysis flag on first connect
  ChangeUsernameButton.tsx        client: DELETE profile → back to ConnectAccount
  Hero.tsx                        anon landing — opens OnboardingModal
  OnboardingModal.tsx             6-step framer-motion modal
  Navbar.tsx                      lucide icons + active tab (pathname='/' only)
  WeaknessDrills.tsx              cross-game drill component (phase state machine)
  ProgressChart.tsx               recharts dual-axis (rating + training score over time)
  PatternSummary.tsx              ranked weakness list with coaching hints
  game-replay/
    MovesList.tsx                 all-move annotations via moveQualityMap + auto-scroll
    AnalysisPanel.tsx             narrative + accuracy cards + errors + patterns
    types.ts                      shared types (PlyEval, AnalysisState, etc.)
    utils.ts                      computeAccuracy, computeMoveQuality, moveQualitySymbol, etc.
  drill-panel/                    useDrillState, types
  ChessBoard.tsx                  animated board (framer-motion FLIP + set-diff)
  DrillPanel.tsx                  per-game drill UI
  EvalGraph.tsx                   svg graph — colored markers (blunder/mistake/inaccuracy)
  GameReplay.tsx                  3-tab replay — keyboard nav, moveQualityMap, accuracy
  GamesTable.tsx                  games list — ✓ badges, analyze/view buttons
  LessonCard.tsx / PaywallModal.tsx / StatsBar.tsx

lib/
  analysis/                       stockfish.ts, insights.ts, patterns.ts, progressUtils.ts, patternSummary.ts
  chess/                          moves.ts, pgn.ts
  db/                             mongo.ts, schemas.ts, cachedChesscom.ts, gamesCache.ts
  hooks/useAnalysisQuota.ts
  interfaces/                     analysis.ts, games.ts
  mappers/chesscom.ts / services/chesscom.ts / userUtils.ts / utils/game.ts
```

---

## analysis output contract

### per-game deliverables (stored in `GameAnalysis`)
| field | type | description |
|---|---|---|
| `evals[]` | `PlyEval[]` | one entry per ply (0 = start); `{ ply, fen, cp, mate, bestMove }` |
| `turningPoints[]` | `TurningPoint[]` | critical moments only — see calibration section for thresholds |
| `patterns[]` | `Pattern[]` | max **4** patterns per game; `{ tag, title, coachingHint }` |
| `explanations[]` | `BlunderExplanation[]` | one per blunder/mistake; `{ id, explanation, rule }` |
| `lessons[]` | `Lesson[]` | one per pattern; generated by ai |
| `accuracy` | `{ white: number; black: number }` | chess.com formula, 0–100, 1 decimal |
| `avgCpLoss` | `{ white: number; black: number }` | avg centipawn loss per side — enables training score without re-reading evals |
| `analysisVersion` | `number` | current = **1**; bump when pipeline changes |

### critical moments format (`TurningPoint`)
```ts
{
  moveNumber: number;      // 1-indexed
  side: 'white' | 'black';
  type: 'blunder' | 'mistake' | 'inaccuracy' | 'missed_win' | 'good_defense';
  movePlayed: string;      // uci of the move played (e.g. "e2e4") — used by drill board
  bestMove?: string;       // uci best move from evals[plyBefore].bestMove
  evalBefore: number;      // cp from mover perspective (null = mate score)
  evalAfter: number;       // cp from mover perspective after move
  positionHint: string;    // fen before the move (for drill board)
  oneLineReason: string;   // ≤12 words, plain english, no engine jargon
}
// movePlayed is UCI (not SAN). bestMove is UCI.
// all TPs from both sides are stored in DB; filter at display time by tp.side === playerSide
```

### hard limits
- max **6** turning points shown per game (prune by severity, then by move order)
- variation lines in explanations: **≤ 6 ply** (3 moves each side)
- `oneLineReason`: **≤ 12 words** — must name the concrete problem, not just "eval drop"
- `explanation` (ai): **40–80 words**; `rule` (ai): **≤ 15 words**
- patterns per game: **≤ 4**; lessons per game: **≤ 4** (one per pattern)

---

## weakness taxonomy + mapping rules

### canonical weakness tags
| tag | display name | typical signal |
|---|---|---|
| `tactics` | Tactical errors | blunder/mistake with `positionHint` containing hanging piece or fork pattern |
| `opening` | Opening mistakes | mistake/inaccuracy in first 10 moves; eval swing from ≥0 to ≤-50 for mover |
| `endgame` | Endgame technique | blunder/mistake when total material ≤ 13 points (Q=9, R=5, B/N=3, P=1) |
| `king-safety` | King safety | blunder near castling zone; mover's king uncastled + eval swing ≥150cp |
| `time-trouble` | Time pressure | any error in last 30s (requires clock data — skip if unavailable) |
| `strategy` | Strategic errors | inaccuracy/mistake in quiet positions (eval before within ±100cp, no immediate captures) |

### mapping rules (applied in `lib/analysis/patterns.ts`)
1. classify each turning point by the rules above — a TP may match multiple tags; pick the **most specific** (tactics > king-safety > opening > endgame > strategy)
2. a pattern fires for a game if **≥ 2** turning points share the same tag, OR **1** blunder matches
3. `confidence = min(1, matchingTPs / 3)` — stored on `Pattern.confidence`; used for cross-game weighting
4. tie-breaker for "top weakness": highest `sum(confidence × recencyWeight)` across last 20 games within 60-day window

### decided-position suppression — keep current thresholds (product decision)
suppress blunders in positions already decided beyond `DECIDED_BLUNDER_CP = 350`. keep current behavior.
do NOT surface them as "dim markers" — keeps analysis focused on the game-deciding moment.

### recency decay
```
recencyWeight(gameIndex) = 0.9 ^ gameIndex   // 0 = most recent game
```
games older than 60 days get weight 0 regardless of index.

---

## cross-game aggregation

### window
- **last 20 analyzed games** or **last 60 days**, whichever is smaller
- minimum 3 analyzed games required before showing weakness leaderboard

### derived metrics (power the Coach + Progress tabs)
| metric | source | used in |
|---|---|---|
| weakness leaderboard | pattern tags × recency weights | Coach tab PatternSummary |
| training score trend | `GameAnalysis.avgCpLoss[playerSide]` → `computeTrainingScore()` per game × date | Progress tab ProgressChart |
| phase breakdown | pattern tag buckets: opening/middlegame/endgame | Progress tab (future) |
| openings report | first 6 moves + ECO + win/loss/draw | placeholder — not built yet |

### aggregation algorithm (`lib/analysis/patternSummary.ts`) — current implementation
```ts
// input: { patterns: Pattern[], date: number }[] — sorted most recent first
// step 1: filter to 60-day window
// step 2: cap at 20 games (most recent)
// step 3: score[tag] += pattern.confidence × 0.9^gameIndex
// step 4: sort by score desc
```

### clustering tie-breaker
if two tags within 0.05 score of each other → prefer the tag the user self-reported in onboarding (`selfReportedWeakness`), else prefer higher raw `gameCount`.

### drills — two-box leitner SRS
```
DrillSession.nextReviewAt:
  null           = new drill, include immediately
  <= now         = due for review, include
  > now          = snoozed, exclude

on solve (correct on attempt 1 or 2):  nextReviewAt = now + 3 days
on fail (still wrong after attempt 2): nextReviewAt = now + 6 hours

api/drills/generated returns dueCount = drills matching the filter (for dashboard badge)
```
drills are **free for all users** — no quota gate, no paywall. marginal cost to serve = ~$0.

---

## ai explanation/lesson style guide

### explanation template (enforce in `api/explain/route.ts` system prompt)
every explanation **must** follow this structure in order:
1. **what happened** — name the concrete mistake in ≤ 15 words ("you left your bishop on f4 undefended")
2. **why it hurts** — consequence in ≤ 15 words ("black wins a piece after ...Bxf4 Rxf4 Nxf4")
3. **best plan** — what should have been played, in plain english (≤ 20 words)
4. **short line** — ≤ 6 ply in algebraic notation, e.g. `14.Nd5 Bxd5 15.exd5 Nc5 16.Bc2`
5. **principle** — one chess principle the player should remember (≤ 15 words)

total: **40–80 words** for `explanation`; `rule` field = principle only (≤ 15 words).

### uci vs san in ai prompts
`TurningPoint.movePlayed` and `TurningPoint.bestMove` are stored as **UCI** (e.g. `"g1f3"`), not SAN.
The AI prompt passes UCI move strings and the model outputs valid SAN — no server-side conversion applied.
Known limitation: model may produce incorrect SAN for promotions, ambiguous pieces, or en passant.

### forbidden language
- never mention engine depth, nodes, multipv, stockfish, or evaluation numbers
- never say "the engine says" or "according to the computer"
- never use conditional hedging like "might be" or "could possibly" — be direct
- if the best move is unclear (mate sequences, complex sacrifices), say "the position required precise calculation" and skip the short line

### lesson template (enforce in `api/lessons/route.ts` system prompt)
lessons explain a **pattern**, not a specific move:
- **pattern name** (≤ 6 words)
- **why it costs you games** (≤ 25 words)
- **the fix** — one concrete habit or rule (≤ 25 words)
- **example** — reference the specific game moment without engine language

### caching keys + regeneration
- explanation cache key: `gameUuid + moveNumber + side` — stored in `GameAnalysis.explanations[]`
- lesson cache key: `gameUuid + pattern.tag` — stored in `GameAnalysis.lessons[]`
- **do NOT regenerate** if the cached explanation already exists (check array before calling api)
- regenerate if `analysisVersion` bumped and old explanation references a superseded turning point

---

## calibration + versioning

### current thresholds (v1 — `lib/analysis/insights.ts`)
| symbol | name | cp loss (mover perspective) | decided-position suppression |
|---|---|---|---|
| `??` | blunder | ≥ 200cp | suppress if `|evalBefore| > 350cp` |
| `?` | mistake | ≥ 100cp | suppress if `|evalBefore| > 500cp` |
| `?!` | inaccuracy | ≥ 50cp | suppress if `|evalBefore| > 500cp` |
| `!` | good | eval improves ≥ 50cp while mover was losing | — |
| (none) | normal | everything else | — |
| `missed_win` | missed win | mover had forced mate/+500cp and played ≤+100cp | — |

"decided position" = `Math.abs(moverCp) > threshold` before the move.

### `analysisVersion` field
- current version: **1**
- bump to **2** when: thresholds change, stockfish depth changes, pattern taxonomy changes
- on read: if `doc.analysisVersion < CURRENT_VERSION`, treat as stale → show "re-analyze free" banner in `GameReplay`
- do NOT auto-delete stale docs; let user trigger re-analysis
- **quota rule**: re-analysis triggered by a version bump is **free** — bypass quota when `force=true && cached.analysisVersion < CURRENT_VERSION`

### benchmark expectations
- accuracy formula tolerance: ±2% vs chess.com for the same game at same depth
- rerun stability: same PGN + same stockfish binary → stable `evals[]` within tolerance; results may differ across machines or under load. cached results are the source of truth.
- pattern detection: ≥ 80% recall on hand-labeled test games (manual spot-check only, no automated suite yet)

---

## runtime budgets

### latency targets
| operation | p50 target | p95 target |
|---|---|---|
| `/api/analyze` (cold, 40-move game) | 25s | 45s |
| `/api/analyze` (cache hit) | 200ms | 500ms |
| `/api/explain` (cold, 3 blunders) | 3s | 6s |
| `/api/explain` (cache hit) | 100ms | 300ms |
| dashboard load (server component) | 800ms | 2s |

### stockfish limits (per position, `lib/analysis/stockfish.ts`)
- `movetime`: **500ms** per position (current default)
- do NOT use depth-limit mode — movetime gives predictable latency
- max positions per game: **no hard limit**, but warn if > 150 plies (very long games)
- parallel games: **1 at a time** per server process (stockfish is single-threaded per instance)

### caching strategy
| layer | what | TTL |
|---|---|---|
| `CachedGames` (mongo) | chess.com archive response | 1h |
| `GameAnalysis` (mongo) | full analysis result | permanent (no TTL) |
| next.js router cache | server component renders | cleared by `router.refresh()` after analyze |
| client useMemo | `moveQualityMap`, `accuracy`, `tpMap` | per render, keyed on `analysis` object |

---

## dev rules
- max 3 files / ~150 LOC per slice. preserve existing behavior.
- typescript strict; no `any`. single quotes in ts/tsx.
- never touch `.env` or print secrets.
- lowercase comments where logic is non-obvious. descriptive names.
- verify each slice: `npm run typecheck && npm run lint`
- read every file before editing it — never edit blind.
- prefer isolated, reversible changes. if a change is hard to undo, pause and reconsider.
- do not refactor working code to make it "cleaner" — only change what the slice requires.
- use the `nextjs-implementer` agent for slice implementations (small diffs, follows CLAUDE.md).
- use the `codebase-explorer` agent to understand code before editing.
- update the ACTIVE IMPLEMENTATION PLAN table in this file when a slice completes.

## commands
```bash
npm run dev / lint / lint:fix / typecheck / format
```

## workflow
- short plan (3-7 bullets) → implement one slice → verify → stop or next slice
- max 2-3 file reads before first edit
- one agent owns a slice end-to-end

---

## key patterns

```ts
// lazy state init — react 18 strict-mode-safe (runs exactly once)
const [analysis, setAnalysis] = useState<AnalysisState>(() =>
  initialAnalysis ? { status: 'done', result: initialAnalysis } : { status: 'idle' },
);

// key prop forces fresh GameReplay per game
<GameReplay key={game.uuid} initialAnalysis={initialAnalysis} ... />

// router.refresh() clears next.js cache so "✓ analyzed" badge updates on back-nav
router.refresh();

// quota — lifetime gate via countDocuments (no increment needed: new doc at end of analysis is the counter)
// FREE_LIMIT = 10 lifetime; exported from lib/hooks/useAnalysisQuota.ts
const lifetimeCount = await GameAnalysis.countDocuments({ clerkUserId: userId });
if (lifetimeCount >= LIFETIME_FREE_LIMIT) return 402;

// first-session loader — callback pattern (router.push('/') is a NO-OP when already at '/')
// ConnectAccount sets: sessionStorage.setItem('chess_quick_analysis', '1')
// UserPageTabs reads on mount: if flag + analyzedUuidsList.length === 0 → show QuickAnalysisLoader
// QuickAnalysisLoader calls onComplete() when done — does NOT touch sessionStorage or router
// UserPageTabs.handleAnalysisComplete():
//   setShowLoader(false)
//   sessionStorage.setItem('chess_coaching_summary', '1')
//   sessionStorage.removeItem('chess_quick_analysis')
//   router.refresh()  ← re-fetches server data; patternEntries arrive on next render
// derived state (not useState): showCoachingSummary = hasSummaryFlag && patternEntries.length > 0
//   → survives the router.refresh() race: hasSummaryFlag stays true, showCoachingSummary auto-flips true when patterns arrive
// CoachingSummary.onDismiss(): sessionStorage.removeItem('chess_coaching_summary') + setHasSummaryFlag(false)

// key prop forces fresh DrillPanel per drill — useDrillState uses useState (NOT reset on prop change)
<DrillPanel key={`${drill.gameUuid}-${drill.moveNumber}-${drill.side}`} fen={drill.fen} ... />

// Map iteration — use .forEach() not for...of (TS target doesn't support downlevel iteration)
map.forEach((value, key) => { ... });

// Set spread NOT allowed — use Array.from()
Array.from(mySet).map(...)

// browse vs dashboard separation:
// UserPageContent: basePath='/' = dashboard (loads analysis), basePath='/user' = browse
// middleware: /user NOT protected, /game and /drills are protected

// moveQualityMap — quality for every ply from evals[], keyed by ply number (1-indexed)
// ply 1 = white's first move, ply 2 = black's first move, etc.
// side: p % 2 === 1 ? 'white' : 'black'

// training score formula — single source of truth in lib/analysis/accuracy.ts
// computeTrainingScore(avgCpLoss): max(0, 100 - avgCpLoss * 0.5)
// computeChesscomAccuracy(evals, side): 103.1668 * exp(-0.04354 * avgCpLoss) - 3.1669

// onboarding sessionStorage key
const ONBOARDING_KEY = 'chess_onboarding';
// OnboardingModal saves → Clerk openSignIn() → ConnectAccount reads + auto-submits on mount

// tab routing — 4 tabs only
// /?tab=coach (default) | /?tab=progress | /?tab=games | /?tab=profile
// Navbar active: only highlight when pathname === '/' to avoid false match on /game, /drills

// EvalGraph markedPlies prop
// { blunder: Set<number>, mistake: Set<number>, inaccuracy: Set<number> }
// blunder=red r2.8, mistake=orange r2.2, inaccuracy=yellow r2.2

// keyboard nav in GameReplay — skip INPUT/SELECT/TEXTAREA
window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') setIndex(v => Math.max(0, v - 1));
  if (e.key === 'ArrowRight') setIndex(v => Math.min(maxIndex, v + 1));
});
```
