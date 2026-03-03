---
name: verify
description: Run typecheck and lint and report the result. Use after every code slice.
---

## verify skill

Run the two standard verification commands and report cleanly.

### steps
1. run `npm run typecheck` — report errors or "✓ clean"
2. run `npm run lint` — report errors or "✓ clean"
3. if both pass: confirm the slice is done and stop
4. if either fails: show the specific errors, identify the cause, fix them before stopping

### rules
- never skip verification after a code change
- fix errors immediately — do not leave them for the next message
- do not re-run verification after a fix unless the fix itself was non-trivial
