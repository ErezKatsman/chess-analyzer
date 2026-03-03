---
name: analyze-game
description: DEPRECATED — game analysis is fully built as a UI feature (POST /api/analyze → GameReplay tabs). Do not use this skill. If the user wants to improve the analysis pipeline, work directly in app/api/analyze/route.ts and lib/analysis/.
---

This skill is no longer relevant. The full analysis pipeline is implemented:
- POST /api/analyze — stockfish → turning points → patterns → mongodb cache
- POST /api/explain — claude haiku explanations per blunder (cached)
- POST /api/lessons — claude haiku lessons per pattern (cached)
- DrillPanel.tsx — interactive drill UI with click-to-move and 2-attempt reveal

To improve the pipeline, edit the source files directly.
