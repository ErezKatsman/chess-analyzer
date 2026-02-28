---
name: practice-drill
description: Launch an interactive drill from a blunder in the user's game. The user is shown the position just before their mistake and must find the correct move. This is the core product differentiator — drills built from YOUR actual games. Invoke after analyze-game has returned turning points, or when the user says "practice", "drill", or "retry this".
---

## practice-drill skill

Turn a blunder from the user's game into an interactive "find the best move" exercise.

### input
- a `TurningPoint` from analyze-game (move number, fen before mistake, best move, eval loss)
- optionally: the plain-english explanation of why the move was wrong

### steps

1. **select the position**
   - use the worst blunder (highest eval loss) from the game's turning points
   - if multiple blunders exist, pick the one in the most critical phase (middlegame preferred)
   - confirm the fen and best move are available before proceeding

2. **present the drill**
   - show the board position (fen) with the user to move
   - state the context: move number, what happened, how much eval was lost
   - give the task clearly: "find the move that keeps your advantage"
   - do not reveal the best move yet

3. **evaluate the user's answer**
   - if the user enters a move (san or uci), compare it to the best move
   - if correct: confirm, show the eval difference, give a one-line explanation of why it works
   - if wrong: give a hint (direction only — e.g. "think about your king safety") and let them try again
   - after 2 failed attempts: reveal the best move with a full explanation

4. **explain the concept**
   - after the drill is complete, give a one-paragraph plain-english explanation
   - connect it to the recurring pattern if one exists (e.g. "this is the third time you missed a back-rank threat")
   - end with one memorable rule

5. **offer next steps**
   - ask if the user wants to: try another drill from this game, generate a lesson, or summarize their period

### output format
```
Drill — Move [N] ([color] to move)

Position: [fen]
Context: you played [move], losing [N] centipawns.

Task: find the move that [goal — e.g. "defends the back rank"].

> [user enters move]

✓ Correct! [move] works because [one-line reason].
  Eval before: [X] | Eval after: [Y]

Concept:
[1 paragraph plain-english explanation]

Rule to remember:
[one-liner]
```

### drill failure format (after 2 wrong attempts)
```
The best move was [move].

Why: [plain-english explanation — 2-3 sentences]

Rule to remember:
[one-liner]
```
