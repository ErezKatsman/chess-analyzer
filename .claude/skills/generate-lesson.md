---
name: generate-lesson
description: DEPRECATED — lesson generation is fully built (POST /api/lessons → LessonCard.tsx in "lessons" tab of GameReplay). Do not use this skill.
---

This skill is no longer relevant. Lessons are auto-generated after analysis completes:
- POST /api/lessons — claude haiku generates structured lessons per pattern, cached in GameAnalysis.lessons
- LessonCard.tsx — expandable card with concept, key points, game reference, practice tip
- shown in the "lessons" tab of GameReplay.tsx (disabled until analysis runs)
