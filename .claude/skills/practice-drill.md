---
name: practice-drill
description: DEPRECATED — drills are fully built as a UI feature (DrillPanel.tsx). Do not use this skill.
---

This skill is no longer relevant. The full drill UI is implemented:
- DrillPanel.tsx — click-to-move, 2-attempt reveal, blunder replay animation
- components/drill-panel/useDrillState.ts — all drill logic
- POST /api/drills/attempt — persists results in DrillSession model
- entered from "practice N blunders" button in the analysis tab of GameReplay
