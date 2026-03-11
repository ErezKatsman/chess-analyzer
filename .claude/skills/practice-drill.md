---
name: practice-drill
description: DEPRECATED — drills are fully built including the M1 teaching loop. Do not use this skill.
---

This skill is no longer relevant. The full drill UI is implemented:
- DrillPanel.tsx — click-to-move, 2-attempt reveal, blunder replay animation
- components/drill-panel/useDrillState.ts — all drill logic
- POST /api/drills/attempt — persists results in DrillSession; sets Leitner SRS nextReviewAt (+3d solve / +6h fail)
- GET /api/drills/generated — cross-game weakness drills; excludes snoozed sessions
- WeaknessDrills.tsx — phase machine (loading → empty | ready → practicing → done); coaching brief before start
- M1 teaching loop (complete):
  - lib/analysis/drillContent.ts — DRILL_NOTICE_CUE + DRILL_HABIT maps (7 tags)
  - DrillPanel receives patternTag prop; shows pre-drill notice (amber, before move) + correction card (in revealed block)
  - both call sites pass patternTag: WeaknessDrills.tsx and GameReplay.tsx
