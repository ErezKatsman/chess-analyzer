# chess-analyzer — claude code guide

## product goal
**chess improvement platform** — show players their weaknesses across ALL games, prove they're improving, give personalized drills. not just per-game analysis.

paywall converts when user sees their accuracy curve going up over time (ROI proof).

---

## user flows (source of truth)

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

FLOW 3 — connect chess.com account
  ConnectAccount → type username → validate → POST /api/user/profile
  → router.push('/') + router.refresh() → dashboard
  NOTE: if coming from OnboardingModal, sessionStorage has pre-filled username
        ConnectAccount reads ONBOARDING_KEY on mount and auto-submits

FLOW 4 — personal dashboard (signed in + has profile)
  / → UserPageContent basePath="/"
  → 5 tabs: Coach / Progress / Games / Profile / Settings
  → Coach: sparkline + top weakness + PatternSummary
  → Progress: ProgressChart (rating + accuracy over time)
  → Games: GamesTable with ✓ analyzed badges + analyze buttons
  → click Analyze → /game?... → GameReplay full analysis
  → drill practice at /drills (WeaknessDrills + per-game DrillPanel)

FLOW 5 — change username
  dashboard Profile tab → ChangeUsernameButton → DELETE /api/user/profile
  → router.push('/') → ConnectAccount (FLOW 3)

FLOW 6 — quota / paywall
  Analyze → quota hit (3/mo free) → PaywallModal → Stripe checkout
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
| auth + quota | ✅ | `middleware.ts`, `UserQuota`, `PaywallModal` |
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
| accuracy score | ✅ stored in DB | chess.com formula in `api/analyze`, stored in `GameAnalysis.accuracy`, shown in AnalysisPanel + GamesTable badge |
| game narrative | ✅ | `buildNarrative()` in `AnalysisPanel.tsx` |
| keyboard nav | ✅ | `←→` arrow keys in `GameReplay.tsx` |
| eval graph | ✅ | `EvalGraph.tsx` — colored markers: red/orange/yellow per severity |
| games table | ✅ | `GamesTable.tsx`, `StatsBar.tsx` |
| progress graph | ✅ | `ProgressChart.tsx`, `lib/analysis/progressUtils.ts` |
| pattern summary | ✅ | `PatternSummary.tsx`, `lib/analysis/patternSummary.ts` |
| onboarding modal | ✅ | `OnboardingModal.tsx` — 6-step modal, saves to sessionStorage |
| dashboard tabs | ✅ | `UserPageTabs.tsx` — Coach/Progress/Games/Profile/Settings |
| profile tab | ✅ | plan badge + ChangeUsername + onboarding answers |
| navbar | ✅ | lucide icons + active tab highlight |
| browse mode | ✅ | Hero → `/user?userName=X` (no auth, no personal data) |

### stripe — needs 4 env vars (see NOTES.md) — do last

### accuracy — ✅ stored in DB (chess.com formula)
- `GameAnalysis.accuracy: { white, black }` computed in `api/analyze` at analysis time
- `accuracyRecord` (Record<uuid, {white, black}>) passed server→client via `UserPageContent → UserPageTabs → GamesTable`
- GamesTable shows color-coded `XX% acc` badge (green ≥85, yellow ≥70, red <70)
- ✅ **Slice 1 done**: all callers now import from `lib/analysis/accuracy.ts` — single source of truth

---

## next priorities — 5 decided slices (implement in order)

### ~~slice 1 — unify accuracy formula~~ ✅ DONE
`lib/analysis/accuracy.ts` created; `progressUtils.ts`, `game-replay/utils.ts`, `api/analyze/route.ts` all import from it.
`buildProgressPoint` accepts optional `storedAccuracy?` to skip recomputation.

### slice 2 — store all TPs; filter at display time
**files:** `app/api/analyze/route.ts` · `lib/analysis/insights.ts` · `components/game-replay/AnalysisPanel.tsx`
- `api/analyze/route.ts`: save ALL `allTurningPoints` to DB (remove playerSide filter before save); still pass player-filtered TPs to `detectPatterns` (patterns = your weaknesses only)
- `lib/interfaces/analysis.ts` + `insights.ts`: add `bestMove?: string` (UCI from `evals[i].bestMove`) to `TurningPoint`; populate in `computeTurningPoints`
- `AnalysisPanel.tsx`: fix `buildNarrative` — filter `tp.side === playerSide` for your errors, `tp.side !== playerSide` for opponent blunders (now populated correctly)
- **why second**: opponent blunder count in narrative is always 0 currently; `bestMove` on TP unblocks better AI explanations

### slice 3 — aggregation window (20 games / 60 days) + recency decay
**files:** `lib/interfaces/analysis.ts` · `lib/analysis/patterns.ts` · `lib/analysis/patternSummary.ts`
- `lib/interfaces/analysis.ts`: add `confidence?: number` to `Pattern`
- `lib/analysis/patterns.ts`: compute `confidence = Math.min(1, matchingTPs / 3)` per pattern; attach to pattern object
- `lib/analysis/patternSummary.ts`: accept `{ patterns, date }[]`; apply 60-day filter + 20-game cap (sort by date desc, slice 20); replace flat count with `score[tag] += confidence × (0.9 ** gameIndex)`; sort by score desc
- `UserPageContent.tsx`: pass `analyzedAt` date alongside patterns so window filter can apply
- **why third**: Coach tab top weakness is currently all-time flat count — a player who fixed opening 30 games ago still sees it as top weakness

### slice 4 — two-box leitner SRS for drills
**files:** `lib/db/schemas.ts` · `app/api/drills/attempt/route.ts` · `app/api/drills/generated/route.ts`
- `lib/db/schemas.ts`: add `nextReviewAt?: Date` to `DrillSession`; add unique compound index `{ clerkUserId, gameUuid, moveNumber, side }` (prevents duplicate session bugs)
- `app/api/drills/attempt/route.ts`: on solve → `nextReviewAt = now + 3 days`; on fail (2nd attempt) → `nextReviewAt = now + 6 hours`
- `app/api/drills/generated/route.ts`: filter `{ $or: [{ nextReviewAt: null }, { nextReviewAt: { $lte: now } }] }`; add `dueCount` to response for dashboard badge
- **why fourth**: drills without re-surfacing are one-shot interactions; Leitner creates the daily re-engagement habit

### slice 5 — stale analysis detection + free re-analysis
**files:** `app/api/analyze/route.ts` · `app/game/page.tsx` · `components/GameReplay.tsx`
- `api/analyze/route.ts`: accept `?force=true` query param; when `force=true` AND `cached.analysisVersion < CURRENT_VERSION`, skip quota check
- `app/game/page.tsx`: read `analysisVersion` from cached analysis; pass `isStale = analysisVersion < CURRENT_VERSION` to `GameReplay`
- `GameReplay.tsx`: if `isStale`, show subtle "results from older analysis — re-analyze free" banner with re-analyze button that adds `force=true`
- **why last**: no urgency until we actually bump `ANALYSIS_VERSION` to 2

### backlog (after slices)
6. **accuracy trend line in ProgressChart** — add accuracy series to recharts dual-axis chart; powered by `buildProgressPoint` after Slice 1 fix
7. **"practice this now" CTA** — button at bottom of AnalysisPanel → /drills
8. **connect stripe** — add env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_APP_URL`

---

## mongodb schemas (`lib/db/schemas.ts`)
- `GameAnalysis` — (clerkUserId, gameUuid) → evals, turningPoints, patterns, explanations, lessons
  - ✅ `accuracy: { white: number; black: number }` — chess.com formula, stored at analysis time
  - ✅ `analysisVersion: number` — current = 1; bump when pipeline changes
  - ✅ `playerSide: 'white' | 'black'` — stored at analysis time
  - **TODO (Slice 2)**: turningPoints currently filtered to player's side before save — change to save all TPs; filter at display time
- `UserQuota` — (clerkUserId, month) → usage count
- `DrillSession` — (clerkUserId, gameUuid, moveNumber, side)
  - ✅ `solved: boolean`, `attempts: number`
  - **TODO (Slice 4)**: add `nextReviewAt?: Date` + unique compound index
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
  UserPageTabs.tsx                client: 5-tab nav (Coach/Progress/Games/Profile/Settings)
  ConnectAccount.tsx              client: sole save point for chess.com username
  ChangeUsernameButton.tsx        client: DELETE profile → back to ConnectAccount
  Hero.tsx                        anon landing — opens OnboardingModal
  OnboardingModal.tsx             6-step framer-motion modal
  Navbar.tsx                      lucide icons + active tab (pathname='/' only)
  WeaknessDrills.tsx              cross-game drill component (phase state machine)
  ProgressChart.tsx               recharts dual-axis (rating + accuracy over time)
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
| `analysisVersion` | `number` | current = **1**; bump when pipeline changes |

### critical moments format (`TurningPoint`)
```ts
{
  moveNumber: number;      // 1-indexed
  side: 'white' | 'black';
  type: 'blunder' | 'mistake' | 'inaccuracy' | 'missed_win' | 'good_defense';
  movePlayed: string;      // uci of the move played (e.g. "e2e4") — used by drill board
  bestMove?: string;       // uci best move from evals[plyBefore].bestMove — TODO (Slice 2)
  evalBefore: number;      // cp from mover perspective (null = mate score)
  evalAfter: number;       // cp from mover perspective after move
  positionHint: string;    // fen before the move (for drill board)
  oneLineReason: string;   // ≤12 words, plain english, no engine jargon
}
// NOTE: movePlayed is UCI (not SAN). bestMove is UCI. SAN conversion requires chess.js — deferred.
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
3. `confidence = min(1, matchingTPs / 3)` — stored on `Pattern.confidence`; used for cross-game weighting (TODO Slice 3)
4. tie-breaker for "top weakness": highest `sum(confidence × recencyWeight)` across last 20 games within 60-day window (TODO Slice 3)

### decided-position suppression — keep current thresholds (product decision)
suppress blunders in positions already decided beyond `DECIDED_BLUNDER_CP = 350`. keep current behavior.
do NOT surface them as "dim markers" — keeps analysis focused on the game-deciding moment.

### recency decay
```
recencyWeight(gameIndex) = 0.9 ^ gameIndex   // 0 = most recent game
```
games older than 60 days get weight 0 regardless of index.

---

## cross-game aggregation spec

### window
- **last 20 analyzed games** or **last 60 days**, whichever is smaller
- minimum 3 analyzed games required before showing weakness leaderboard

### derived metrics (power the Coach + Progress tabs)
| metric | source | used in |
|---|---|---|
| weakness leaderboard | pattern tags × recency weights | Coach tab PatternSummary |
| accuracy trend | `GameAnalysis.accuracy[playerSide]` per game × date | Progress ProgressChart |
| phase breakdown | pattern tag buckets: opening/middlegame/endgame | Progress tab (future) |
| openings report | first 6 moves + ECO + win/loss/draw | placeholder — not built yet |

### aggregation algorithm (`lib/analysis/patternSummary.ts`)
```
// CURRENT implementation (flat game count, no decay, no window) — to be replaced by Slice 3
for each analyzed game (all time, no limit):
  collect unique tags in this game (one count per game even if pattern fired multiple times)
  for each unique tag:
    gameCount[tag] += 1
    hintMap[tag] = pattern.coachingHint  // overwritten each game (most recent wins)
sort by gameCount descending → weakness leaderboard
```

**Slice 3 target implementation:**
```ts
// input: { patterns: Pattern[], date: number }[] — sorted most recent first
// step 1: filter to 60-day window
// step 2: cap at 20 games (most recent)
// step 3: score[tag] += pattern.confidence × 0.9^gameIndex
// step 4: sort by score desc
```

### clustering tie-breaker
if two tags within 0.05 score of each other → prefer the tag the user self-reported in onboarding (`selfReportedWeakness`), else prefer higher raw `gameCount`.

### drills — two-box leitner SRS (Slice 4 target)
```
DrillSession.nextReviewAt:
  null           = new drill, include immediately
  <= now         = due for review, include
  > now          = snoozed, exclude

on solve (correct on attempt 1 or 2):  nextReviewAt = now + 3 days
on fail (still wrong after attempt 2, i.e. DrillSession.attempts >= 2 and solved=false): nextReviewAt = now + 6 hours
// "attempt" = one click of a move in the drill board within the same DrillSession document

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
The AI explanation template asks for SAN lines (e.g. `14.Nd5 Bxd5 15.exd5`).

**current approach**: the AI prompt passes UCI move strings and the model is expected to output valid SAN on its own — no server-side conversion or validation is applied. this works in practice because claude haiku correctly converts UCI to SAN for standard moves.

**known limitation**: the model may produce incorrect SAN for promotions, ambiguous pieces, or en passant without explicit board context.

**future (deferred)**: Slice 2 adds `bestMove` to `TurningPoint`. a later slice may use chess.js to convert UCI → SAN before injecting into the prompt, providing validated move context and eliminating the edge-case risk.

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
- **quota rule (decided)**: re-analysis triggered by a version bump is **free** — bypass quota when `force=true && cached.analysisVersion < CURRENT_VERSION`
- implementation: `GET /api/analyze?force=true` skips quota check if stale; `GameReplay` passes `isStale` prop from `app/game/page.tsx`

### benchmark expectations
- accuracy formula tolerance: ±2% vs chess.com for the same game at same depth
- rerun stability: same PGN + same stockfish binary on the same hardware → stable `evals[]` within tolerance; results may differ across machines or under load (movetime ≠ fixed depth). cached results are the source of truth — do not re-run to "correct" a stored analysis unless `analysisVersion` is bumped.
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
- do NOT use depth-limit mode — movetime gives predictable latency; depth reached varies by CPU speed and server load, so results are NOT identical across machines or deploys
- max positions per game: **no hard limit**, but warn if > 150 plies (very long games)
- parallel games: **1 at a time** per server process (stockfish is single-threaded per instance)
- drift across deploys is handled by `analysisVersion` + caching: once a result is stored it is canonical for that version, regardless of what a re-run would produce on different hardware

### deep-analysis selection (future feature — not built)
- a game qualifies for deep analysis (movetime 2000ms) if:
  - it is the user's most recent loss, OR
  - it contains ≥ 2 blunders at standard depth
- deep analysis does NOT consume extra quota — it is a background re-run

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

// quota: increment before running to prevent races
await UserQuota.updateOne({ clerkUserId, month }, { $inc: { count: 1 } });
if (quota.count >= FREE_LIMIT) return 402;

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

// accuracy formula (chess.com compatible)
// computeAccuracy(evals, side): 103.1668 * exp(-0.04354 * avgCpLoss) - 3.1669
// caps loss at 1000cp per move — in game-replay/utils.ts

// onboarding sessionStorage key
const ONBOARDING_KEY = 'chess_onboarding';
// OnboardingModal saves → Clerk openSignIn() → ConnectAccount reads + auto-submits on mount

// tab routing
// /?tab=coach (default) | /?tab=progress | /?tab=games | /?tab=profile | /?tab=settings
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
