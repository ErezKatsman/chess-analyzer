# chess-analyzer — claude code guide

## product goal
**chess improvement platform** — show players their weaknesses across ALL games, prove they're improving, give personalized drills. not just per-game analysis.

---

## user flows (source of truth)

```
FLOW 1 — anonymous browse (not signed in)
  / (Hero) → type username → validate → Start
  → /user?userName=X
  → raw games list, NO analysis, NO analyze buttons
  → chess.com links in table for reference

FLOW 2 — sign in (no profile yet)
  navbar Sign In → Clerk modal
  → auth → app/page.tsx:
      has profile  → dashboard (/)
      no profile   → ConnectAccount (/)

FLOW 3 — connect chess.com account
  ConnectAccount → type username → validate → POST /api/user/profile
  → router.push('/') + router.refresh() → dashboard

FLOW 4 — personal dashboard (signed in + has profile)
  / → UserPageContent basePath="/"
  → own games + ✓ analyzed badges + progress tab + patterns
  → click Analyze → /game?... → GameReplay full analysis
  → drill practice at /drills

FLOW 5 — change username
  dashboard → ChangeUsernameButton → DELETE /api/user/profile
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
| drill UI | ✅ | `DrillPanel.tsx`, `useDrillState.ts`, `api/drills/attempt` |
| lesson generator | ✅ | `app/api/lessons/route.ts`, `LessonCard.tsx` |
| stripe payments | ✅ code, ⚠️ needs env vars | `api/stripe/checkout`, `api/stripe/webhook` |
| animated board | ✅ | `ChessBoard.tsx` (framer-motion FLIP + set-diff reconcile) |
| game replay UI | ✅ | `GameReplay.tsx` — 3 tabs: moves / analysis / lessons |
| games table | ✅ | `GamesTable.tsx`, `StatsBar.tsx`, `EvalGraph.tsx` |
| progress graph | ✅ | `ProgressChart.tsx`, `lib/analysis/progressUtils.ts` |
| pattern summary | ✅ | `PatternSummary.tsx`, `lib/analysis/patternSummary.ts` |
| browse mode | ✅ | Hero → `/user?userName=X` (no auth, no personal data) |
| connect account | ✅ | `ConnectAccount.tsx` — sole place that saves chess.com username |

### stripe — needs 4 env vars (see NOTES.md)

---

## next priorities
1. **review + fix all user flows** — walk through every flow end-to-end, find gaps, fix them
   - anonymous browse → sign in → connect account → dashboard
   - change username flow
   - quota hit → paywall → upgrade → paid dashboard
   - browse other player's games while signed in
2. **connect stripe** — add env vars, test with stripe CLI
3. **generated drills from recurring weaknesses** — cross-game blunders, not per-game

---

## mongodb schemas (`lib/db/schemas.ts`)
- `GameAnalysis` — (clerkUserId, gameUuid) → evals, turningPoints, patterns, explanations, lessons
- `UserQuota` — (clerkUserId, month) → usage count
- `DrillSession` — drill attempt history
- `CachedGames` — chess.com archive cache (TTL 1h)
- `UserProfile` — clerkUserId → chess.com username + plan ('free'|'paid') + stripe IDs

---

## file structure
```
app/
  api/
    analyze/route.ts          POST — stockfish + insights + cache
    explain/route.ts          POST — claude haiku explanations
    lessons/route.ts          POST — claude haiku lessons per pattern
    drills/attempt/route.ts   POST — save drill result
    stripe/checkout/route.ts  POST — create stripe checkout session
    stripe/webhook/route.ts   POST — handle stripe events
    user/quota/route.ts       GET  — live quota
    user/profile/route.ts     GET/POST/DELETE — chess.com username linking
  game/page.tsx               server component: loads game + cached analysis
  user/page.tsx               thin wrapper: public browse (no auth required)
  drills/page.tsx             drill history
  upgrade/success/page.tsx    post-payment landing

components/
  UserPageContent.tsx         shared server component — dashboard (basePath='/') or browse ('/user')
  UserPageTabs.tsx            client: games tab + progress tab
  ConnectAccount.tsx          client: sole save point for chess.com username linking
  ChangeUsernameButton.tsx    client: DELETE profile → back to ConnectAccount
  Hero.tsx                    browse-only landing (no auth, no saving)
  ProgressChart.tsx / PatternSummary.tsx
  game-replay/                MovesList, AnalysisPanel, types, utils
  drill-panel/                useDrillState, types
  ChessBoard.tsx              animated board (framer-motion)
  DrillPanel.tsx / EvalGraph.tsx / GameReplay.tsx / GamesTable.tsx
  LessonCard.tsx / PaywallModal.tsx / StatsBar.tsx

lib/
  analysis/                   stockfish.ts, insights.ts, patterns.ts, progressUtils.ts, patternSummary.ts
  chess/                      moves.ts, pgn.ts
  db/                         mongo.ts, schemas.ts, cachedChesscom.ts, gamesCache.ts
  hooks/useAnalysisQuota.ts
  interfaces/                 analysis.ts, games.ts
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

// browse vs dashboard separation:
// UserPageContent: basePath='/' = dashboard (loads analysis), basePath='/user' = browse (no personal data)
// middleware: /user NOT protected, /game and /drills are protected
```
