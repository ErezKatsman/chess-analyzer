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
| accuracy score | ✅ client-side | computed in `game-replay/utils.ts`, shown in AnalysisPanel |
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

### accuracy — NOT yet stored in DB
- currently computed client-side from `evals[]` on every page load
- next: store `{ white: number, black: number }` in `GameAnalysis` during analysis
- enables: accuracy badge in GamesTable, accuracy trend line in ProgressChart

---

## next priorities
1. **store accuracy in GameAnalysis** — add field, compute in `api/analyze`, show badge in GamesTable
2. **accuracy trend in ProgressChart** — the "proof you're improving" paywall conversion moment
3. **"practice this now" CTA** — button at bottom of AnalysisPanel → /drills
4. **connect stripe** — add env vars, test with stripe CLI

---

## mongodb schemas (`lib/db/schemas.ts`)
- `GameAnalysis` — (clerkUserId, gameUuid) → evals, turningPoints, patterns, explanations, lessons
  - **TODO**: add `accuracy: { white: number; black: number }` field
- `UserQuota` — (clerkUserId, month) → usage count
- `DrillSession` — (clerkUserId, gameUuid, moveNumber, side) unique — solved boolean
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
