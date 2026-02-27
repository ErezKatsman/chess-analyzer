---
name: generate-lesson
description: Generate an in-app lesson from analyzed game insights. Invoke after analyze-game has returned GameInsight[]. Produces a structured lesson with explanation, key positions, and a drill prompt.
---

## generate-lesson skill

Turn structured game insights into a focused, actionable lesson.

### input
- `GameInsight[]` from analyze-game (or ask the user to paste insights if not available)
- optionally: the original pgn for position context

### steps

1. **identify the lesson theme**
   - scan insights for the most frequent pattern (e.g. 3x blunders in endgame = endgame lesson)
   - pick one theme only — do not try to teach everything at once
   - theme examples: back-rank weakness, knight outpost, rook activity, pawn structure

2. **write the lesson**
   - title: short, specific (e.g. "avoiding back-rank mate")
   - concept: 2-3 sentences explaining the idea in plain language
   - your mistake: quote the specific move from the game and why it was wrong
   - correct plan: describe what should have been played instead
   - general rule: one memorable takeaway the user can apply in future games

3. **define a drill**
   - describe a position (fen or move sequence) that drills the same pattern
   - give the user a task: "find the move that avoids the back-rank weakness"
   - keep it simple — one position, one concept

4. **output the lesson**
   - use the format below
   - keep total length under 200 words

5. **stop and confirm**
   - ask if the user wants to save this lesson or summarize their full period with summarize-period

### output format
```
Lesson: [title]

Concept:
[2-3 sentence explanation]

Your mistake (move [N]):
[what happened and why it was bad]

Correct plan:
[what should have been played]

Rule to remember:
[one-liner]

Drill:
Position: [fen or move sequence]
Task: [what the user should find]
```
