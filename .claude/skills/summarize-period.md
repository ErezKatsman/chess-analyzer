---
name: summarize-period
description: DEPRECATED — Slice 3 (aggregation window + recency decay) is fully implemented. Do not use this skill.
---

This skill is no longer relevant. Slice 3 is complete:
- `lib/analysis/patternSummary.ts` — aggregatePatterns() enforces 60-day window + 20-game cap + `score = confidence × 0.9^i` recency decay + selfReportedWeakness tie-breaker
- `components/UserPageContent.tsx` — passes games in recency order + selfReportedWeakness
- `components/PatternSummary.tsx` — consumes the scored entries; appears on Progress tab only
