# chess-analyzer — claude code guide

## product goal
**chess improvement platform** — show players their weaknesses across ALL games, prove they're improving, give personalized drills. not just per-game analysis.

- connect chess.com account → analyze games with stockfish + claude haiku
- cross-game pattern summary → personalized improvement roadmap
- progress graph: accuracy + rating over time → prove ROI
- drills from the user's own recurring blunders

---

## business context
- **not**: "cheaper chess.com analysis" (lichess is free — this loses)
- **yes**: "chess coach that knows your specific weaknesses across all your games"
- **gate**: free = limited analyses; paid ($5/mo) = full progress graph, cross-game summary, unlimited
- **test every feature**: does it show improvement or trigger an "aha" moment? if not, skip it.

---

## current state — what is built

| area | status | key files |
|---|---|---|
| auth + quota | ✅ | `middleware.ts`, `UserQuota` schema, `PaywallModal` |
| chess.com fetch | ✅ | `lib/services/chesscom.ts`, `lib/db/cachedChesscom.ts` |
| stockfish pipeline | ✅ | `lib/analysis/stockfish.ts`, `insights.ts`, `patterns.ts` |
| ai explanations | ✅ | `app/api/explain/route.ts`, cached in `GameAnalysis` |
| drill UI | ✅ | `DrillPanel.tsx`, `useDrillState.ts`, `api/drills/attempt` |
| lesson generator | ✅ | `app/api/lessons/route.ts`, `LessonCard.tsx` |
| stripe payments | ✅ code, ⚠️ needs env vars | `api/stripe/checkout`, `api/stripe/webhook` |
| animated board | ✅ | `ChessBoard.tsx` (framer-motion FLIP + set-diff reconcile) |
| game replay UI | ✅ | `GameReplay.tsx` — 3 tabs: moves / analysis / lessons |
| games table | ✅ | `GamesTable.tsx`, `StatsBar.tsx`, `EvalGraph.tsx` |

### stripe — needs 4 env vars to activate (see NOTES.md)

---

## next priorities
1. **cross-game progress graph** — accuracy % + chess.com rating over time on `/user` page
2. **cross-game pattern summary** — "endgame weakness 6x in last 20 games" ranked list
3. **connect stripe** — add env vars, test with stripe CLI
4. **generated drills from recurring weaknesses** — not just per-game blunders

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
    user/profile/route.ts     GET/POST — chess.com username linking
  game/page.tsx               server component: loads game + cached analysis
  user/page.tsx               server component: games list
  drills/page.tsx             drill history
  upgrade/success/page.tsx    post-payment landing

components/
  game-replay/                MovesList, AnalysisPanel, types, utils
  drill-panel/                useDrillState, types
  chess-board/utils.ts        Square/Piece types, parseFenPieces
  ChessBoard.tsx              animated board (framer-motion)
  DrillPanel.tsx / EvalGraph.tsx / GameReplay.tsx / GamesTable.tsx
  LessonCard.tsx / PaywallModal.tsx / StatsBar.tsx

lib/
  analysis/                   stockfish.ts, insights.ts, patterns.ts
  chess/                      moves.ts, pgn.ts
  db/                         mongo.ts, schemas.ts, cachedChesscom.ts, gamesCache.ts
  hooks/useAnalysisQuota.ts
  interfaces/                 analysis.ts (TurningPoint, Pattern, Lesson…), games.ts (IGame…)
  mappers/chesscom.ts / services/chesscom.ts / userUtils.ts
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
```
