---
name: summarize-period
description: Summarize a user's chess games over a time period (e.g. last week, last month). Aggregates patterns across multiple GameInsight[] results. Use this when the user wants a progress report or recurring weakness analysis.
---

## summarize-period skill

Aggregate insights across multiple games into a concise progress report.

### input
- time range: e.g. "last 7 days", "january 2026", "last 20 games"
- source: chess.com username (already available from app state)
- optionally: pre-analyzed `GameInsight[]` if already fetched

### steps

1. **fetch the games**
   - use codebase-explorer to confirm where the chess.com fetch logic lives
   - retrieve all games in the requested time range
   - if more than 30 games, sample the most recent 30 to stay cost-aware

2. **analyze each game**
   - invoke analyze-game logic per game (batch, not interactive)
   - collect all `GameInsight[]` into a flat list

3. **aggregate patterns**
   - count insight types: blunder, missed tactic, positional error, good move
   - find the top 3 recurring weaknesses (most frequent patterns)
   - find the top 1 strength (most frequent positive pattern)
   - track win/draw/loss ratio over the period

4. **build the summary**
   - use the format below
   - keep it scannable — bullets, not paragraphs
   - do not list every game, only patterns and totals

5. **recommend next steps**
   - suggest which skill to use next: generate-lesson for the top weakness
   - one actionable drill recommendation based on the pattern

### output format
```
Period: [date range] — [N] games analyzed
Record: [W] wins / [D] draws / [L] losses

Top weaknesses:
1. [pattern] — occurred in [N] games ([%])
2. [pattern] — occurred in [N] games ([%])
3. [pattern] — occurred in [N] games ([%])

Top strength:
- [pattern] — occurred in [N] games ([%])

Recommended focus:
[one paragraph — which lesson to study and why]
```
