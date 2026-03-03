---
name: summarize-period
description: Plan and build the cross-game progress summary feature. Shows the user their patterns and weaknesses aggregated across all analyzed games. This is the highest-priority next feature — it's what converts free users to paid.
---

## summarize-period skill

Build the cross-game pattern aggregation and progress summary on the /user page.

### what this feature is
- aggregate all `GameAnalysis` docs for a user → find recurring patterns
- show: "in your last 20 games — time-trouble: 8x, endgame weakness: 6x, opening mistakes: 4x"
- this is the personalized improvement roadmap. chess.com and lichess do not do this.

### what needs to be built

**slice 1 — API**
- `GET /api/user/patterns` — query all `GameAnalysis` docs for the current user
- count occurrences of each pattern tag across all games
- return: `{ tag, count, title, coachingHint }[]` sorted by count descending
- also return: total games analyzed, total games available

**slice 2 — UI**
- add `WeaknessPanel` component to `/user` page (below StatsBar, above GamesTable)
- show ranked weakness list: tag chip + count + coaching hint
- show "X of Y games analyzed" — sparse = paywall teaser
- show CTA: "practice your #1 weakness → [drills button]"

**slice 3 — progress graph**
- `GET /api/user/progress` — per analyzed game: date, accuracy %, blunder count, result, rating
- accuracy formula: `100 - (avgCentipawnLoss / 10)` capped at 100 (use evals[] from GameAnalysis)
- rating: from IGame.whiteRating or blackRating depending on which side user played
- `ProgressChart` component: recharts line chart, x=date y=accuracy, dots colored by result

### before starting — clarify with user
- should this be free or paid-only?
- should the progress graph and weakness panel be on the same page or separate tabs?
- should unanalyzed games show as gaps in the graph or be excluded entirely?

### data available (no new schema needed)
- `GameAnalysis` model has: patterns[], evals[], turningPoints[], clerkUserId, gameUuid
- `IGame` has: date, whiteRating, blackRating, result, whiteUsername, blackUsername
- `CachedGames` links gameUuid → full game data
