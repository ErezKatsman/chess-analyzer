---
name: analyze-game
description: Analyze a single chess game. Accepts a PGN or game ID. Delegates schema and endpoint work to the analysis-pipeline agent. Use this skill when the user wants to analyze a specific game.
---

## analyze-game skill

Analyze a single chess game and return structured insights.

### steps

1. **identify the input**
   - if a pgn string is provided, use it directly
   - if a game ID or url is provided, locate the fetch logic in lib/ and retrieve the pgn first

2. **check pipeline readiness**
   - use codebase-explorer to confirm whether POST /api/analyze exists
   - if it does not exist, delegate to analysis-pipeline agent to create it before continuing

3. **run the analysis**
   - call POST /api/analyze with the pgn
   - expect response shape: `GameInsight[]`

4. **present the results**
   - list critical moments: blunders, missed tactics, best moves
   - show move number, piece, and a one-line explanation per insight
   - group by phase: opening / middlegame / endgame

5. **stop and confirm**
   - ask the user if they want to generate a lesson from these insights
   - if yes, invoke the generate-lesson skill

### output format
```
Game: [white] vs [black] — [date]
Result: [result]

Critical moments:
- Move 14 (Nf3): blunder — allows back-rank mate in 2
- Move 22 (Rxe5): missed tactic — knight fork on d7 was available

Phases:
- Opening: [assessment]
- Middlegame: [assessment]
- Endgame: [assessment]
```
