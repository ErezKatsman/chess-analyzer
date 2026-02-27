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
- no analysis endpoint / stockfish yet

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
