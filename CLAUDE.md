# chess-analyzer (claude code guide)

## product goal

- connect to chess.com (no password) and show user games.
- analyze selected games / time ranges with stockfish.
- generate plain-english AI explanations of mistakes (claude haiku).
- generate in-app drills from the user's own blunders.
- freemium: 3 free analyses/month → $5/month unlimited + drills + explanations.

---

## business context (apply to every feature decision)

- **target user**: chess.com players frustrated by the 1 free analysis/day paywall.
- **core value proposition**: drills from YOUR actual games + plain-english explanation of why each mistake was wrong. no competitor does both together.
- **willingness-to-pay trigger**: the moment the user sees a drill built from their own blunder with a clear explanation.
- **freemium gate**: 3 full analyses/month free → $5/month for unlimited + drills + explanations.
- before implementing any feature ask: does this get a user to their first "aha" moment, or retain/convert them? if neither, deprioritize.

---

## current state (what is already implemented)

### auth + quota
- clerk auth guards `/user`, `/game`, `/drills` routes (middleware.ts)
- server-side quota: `UserQuota` mongoose model, FREE_LIMIT = 3 analyses/month
- `PaywallModal` component shown on 402 response
- client-side quota hint: `lib/hooks/useAnalysisQuota.ts` (localStorage; server is authoritative)

### chess.com data
- `lib/services/chesscom.ts` — fetch games, archives, validate user
- `lib/mappers/chesscom.ts` — normalize raw API → `IGame`
- `lib/db/cachedChesscom.ts` + `lib/db/gamesCache.ts` — mongodb cache (TTL 1h)

### analysis pipeline
- `POST /api/analyze` — stockfish → turning points → patterns → mongodb cache
- `lib/analysis/stockfish.ts` — spawns stockfish-18-lite-single.js via child_process
- `lib/analysis/insights.ts` — blunders (200cp), mistakes (100cp), inaccuracies (50cp), missed wins
- `lib/analysis/patterns.ts` — opening, tactics, endgame, king-safety, time-trouble, strategy
- results stored in `GameAnalysis` mongoose model; future loads skip stockfish entirely

### ai explanations
- `POST /api/explain` — calls claude haiku per blunder/mistake; returns `{id, explanation, rule}`
- cached in `GameAnalysis.explanations`; not regenerated on subsequent loads

### drill UI
- `DrillPanel.tsx` + `components/drill-panel/useDrillState.ts` — interactive drill: click-to-move, 2-attempt reveal, blunder replay animation
- `POST /api/drills/attempt` — persists results in `DrillSession` mongoose model
- entered from "practice N blunders" button in the analysis tab

### lesson generator
- `POST /api/lessons` — accepts patterns + turning points, calls claude haiku, returns structured lessons per pattern
- cached in `GameAnalysis.lessons`; not regenerated on subsequent loads
- `Lesson` type in `lib/interfaces/analysis.ts` — patternTag, title, concept, keyPoints[], gameReference, practiceTip
- `components/LessonCard.tsx` — expandable card (tag chip, concept, 3 key points, game ref, practice tip)
- shown in "lessons" tab of `GameReplay.tsx` right panel (tab disabled until analysis is done)

### subscription / payments
- `stripe` package installed; `UserProfile` schema has `plan: 'free'|'paid'`, `stripeCustomerId`, `stripeSubscriptionId`
- `POST /api/stripe/checkout` — creates stripe checkout session, returns redirect URL
- `POST /api/stripe/webhook` — handles `checkout.session.completed` (→ paid) and `customer.subscription.deleted` (→ free)
- paid users bypass the monthly quota gate in `/api/analyze`
- `PaywallModal` upgrade button calls checkout API and redirects; shows loading + error states
- `app/upgrade/success/page.tsx` — post-payment landing page
- **⚠ STRIPE NOT CONNECTED YET** — add these 4 env vars to `.env.local` to activate:
  - `STRIPE_SECRET_KEY=sk_live_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe dashboard → Webhooks → your endpoint)
  - `STRIPE_PRICE_ID=price_...` ($5/month recurring price ID)
  - `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
  - register webhook endpoint in Stripe for: `checkout.session.completed`, `customer.subscription.deleted`
  - for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### game replay UI
- `GameReplay.tsx` — main client component for `/game`
  - left panel: `ChessBoard`, `EvalGraph`, nav controls, game selector dropdown
  - right panel: three tabs — "moves" (`MovesList`), "analysis" (`AnalysisPanel`), "lessons" (`LessonCard` list)
  - auto-switches to analysis tab on load (if pre-analyzed) or after fresh analysis
  - lazy state init (react 18 strict-mode-safe) from server-provided `initialAnalysis`
  - `router.refresh()` after fresh analysis so "✓ analyzed" badge updates on back-nav

### games table + stats
- `GamesTable.tsx` — result/color/opponent/opening/time/ended + "✓ analyzed" badge per row
- `StatsBar.tsx` — donut chart + win rate / accuracy / time class pills
- `EvalGraph.tsx` — eval curve with blunder markers, clickable to seek board position

### mongodb schemas (`lib/db/schemas.ts`)
- `GameAnalysis` — (clerkUserId, gameUuid) → full analysis + explanations + lessons
- `UserQuota` — (clerkUserId, month) → usage count
- `DrillSession` — drill attempt history
- `CachedGames` — chess.com archive cache (TTL 1h)
- `UserProfile` — clerk userId → chess.com username + plan ('free'|'paid') + stripe IDs

---

## file structure

```
app/
  api/
    analyze/route.ts          POST — stockfish + insights + cache
    explain/route.ts          POST — claude haiku explanations
    drills/attempt/route.ts   POST — save drill result
    user/quota/route.ts       GET  — live quota for client hint
    user/profile/route.ts     GET/POST — chess.com username linking
  game/page.tsx               server component: loads game + cached analysis
  user/page.tsx               server component: games list + analyzed badge set
  drills/page.tsx             drill history page
  layout.tsx / page.tsx

components/
  game-replay/                sub-modules extracted from GameReplay
    types.ts                  PlyEval, AnalysisState, AnalysisResult, GameReplayProps …
    utils.ts                  formatEndTime, groupMoves, tpBadgeClass, tpSymbol, patternTagClass
    MovesList.tsx             moves tab (scrollable, badges, row tints)
    AnalysisPanel.tsx         analysis tab (stat pills, key errors, patterns)
  drill-panel/                sub-modules extracted from DrillPanel
    types.ts                  DrillStatus, PIECE_NAMES, DrillProps
    useDrillState.ts          all drill logic as a custom hook
  chess-board/
    utils.ts                  Orientation/Square/Piece types + parseFenPieces, squareCenter …
  ui/                         shadcn: button, input, table
  ChessBoard.tsx              pure board renderer (click, best-move arrow, coords)
  DrillPanel.tsx              drill UI shell (JSX only; logic in useDrillState)
  EvalGraph.tsx               eval curve with blunder markers
  GameReplay.tsx              main orchestrator (~574 lines)
  GamesTable.tsx              sortable games list table
  Hero.tsx / Navbar.tsx / StatsBar.tsx / PaywallModal.tsx / MonthPicker.tsx / ThemeToggle.tsx

lib/
  analysis/
    stockfish.ts              evaluateFens() — child_process stockfish wrapper
    insights.ts               computeTurningPoints()
    patterns.ts               detectPatterns()
  chess/
    moves.ts                  getParsedMovesFromPgn()
    pgn.ts                    PGN header utilities
  db/
    mongo.ts                  connectDB() singleton
    schemas.ts                all mongoose models
    cachedChesscom.ts         chess.com fetch with mongodb TTL cache layer
    gamesCache.ts             CachedGames read/write helpers
  hooks/
    useAnalysisQuota.ts       client-side quota (FREE_LIMIT = 3, localStorage)
  interfaces/
    analysis.ts               TurningPoint, Pattern, DrillSeed, BlunderExplanation, AnalysisSummary
    games.ts                  IGame, IChessGameRes, Player
  mappers/
    chesscom.ts               mapChesscomGame() — IChessGameRes → IGame
  services/
    chesscom.ts               fetchMonthlyGames, fetchUserArchives, checkUserExists
  utils/
    game.ts                   formatEndTime, resultBadgeClass, colorBadgeClass, buildAnalyzeHref, safeOpening
  userUtils.ts                getChessUsername() — clerk userId → chess.com username
  utils.ts                    cn() tailwind class merger
```

---

## next priorities (what to build next)

1. **connect stripe** — add the 4 env vars listed above; test with stripe CLI locally
2. **improved drill variety** — endgame technique, opening principle drills

---

## development rules (must follow)

- keep diffs small and incremental (max 3 files / ~150 LOC per slice).
- preserve existing behavior unless explicitly asked.
- typescript strict; avoid `any`.
- use single quotes in ts/tsx.
- do not touch `.env`, secrets, or credentials and do not print them.
- write clean code with clear, lowercase comments where logic is non-obvious.
- use descriptive variable names.
- provide verification steps after each change (`npm run typecheck && npm run lint`).

---

## commands

```bash
npm run dev        # start dev server
npm run lint       # eslint check
npm run lint:fix   # eslint auto-fix
npm run typecheck  # tsc --noEmit
npm run format     # prettier
```

---

## workflow requirement

- first: short plan (3-7 bullets), grouped into slices.
- then: implement one coherent slice per message (max 3 files changed or ~150 LOC total).
- read only what's needed: max 2-3 file reads before the first edit.
- verification once per slice (dev/lint/typecheck as relevant), not after every micro-change.
- stop only after the slice is complete or when a decision is required.
- do not call codebase-explorer unless a file path or symbol is unknown.
- avoid agent bouncing: one agent owns a slice end-to-end.

---

## key patterns to follow

### lazy state initialization (react 18 strict-mode-safe)
```ts
// ✅ runs exactly once — immune to strict-mode double-invoke
const [analysis, setAnalysis] = useState<AnalysisState>(() =>
  initialAnalysis ? { status: 'done', result: initialAnalysis } : { status: 'idle' },
);
```

### key prop for per-game fresh mount
```tsx
// forces a fresh GameReplay instance per game — lazy initializers always get the right props
<GameReplay key={game.uuid} initialAnalysis={initialAnalysis} ... />
```

### router.refresh() after fresh analysis
```ts
// clears next.js router cache so "✓ analyzed" badge appears immediately on back navigation
router.refresh();
```

### quota: increment before running to prevent races
```ts
await UserQuota.updateOne({ clerkUserId, month }, { $inc: { count: 1 } });
if (quota.count >= FREE_LIMIT) return 402;
```
