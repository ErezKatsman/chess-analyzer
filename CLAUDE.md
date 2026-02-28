# chess-analyzer (claude code guide)

## product goal

- connect to chess.com (no password) and show user games.
- analyze selected games / time ranges.
- engine-first analysis (stockfish) -> structured insights.
- generate in-app lessons + drills from structured analysis.
- external resources are optional; prefer in-app learning.

## current state

- next.js 14 app router, typescript, tailwind, chess.js
- chess.com fetch + game replay already implemented
- stockfish analysis pipeline + analyze button implemented
- turning point / pattern detection implemented
- drill types defined (DrillSeed, AnalysisSummary) but no UI yet

## business context (apply this filter to every feature decision)

- target user: chess.com players frustrated by the 1 free analysis/day paywall.
- core value proposition: drills generated from YOUR actual games + plain-english explanations of mistakes. no competitor does both together.
- willingness-to-pay trigger: the moment a user sees a drill built from their own blunder with a clear explanation of why it was wrong.
- freemium model: 3 full analyses/month free → $5/month for unlimited + drills + explanations.
- before implementing any feature ask: does this get a user to their first "aha" moment, or retain/convert them? if neither, deprioritize.

## development rules (must follow)

- keep diffs small and incremental.
- preserve existing behavior unless explicitly asked.
- typescript strict; avoid any.
- use single quotes.
- do not add a database unless explicitly asked.
- do not touch secrets (.env, credentials) and do not print them.
- write clean code with clear, lowercase comments where logic is non-obvious.
- use descriptive variable names.
- provide verification steps after each change.

## commands

- npm run dev
- npm run lint
- npm run typecheck
- npm run format

## workflow requirement

- first: short plan (5-10 bullets).
- then: implement step 1 only.
- then: stop and wait for confirmation.
