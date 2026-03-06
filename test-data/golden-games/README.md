# Golden Games — Manual Validation Set

These PGN files are the canonical test set for manual regression testing of the
analysis pipeline. Run each game through `/api/analyze` and verify the outputs
match the expectations below.

After Slice 3 (unit tests for accuracy + aggregation), some checks here may be
automated. Until then, these are human spot-checks.

---

## Game Catalogue

### game-01-immortal.pgn
**Anderssen vs Kieseritzky, London 1851 (Immortal Game)**

| property | expected |
|---|---|
| pattern tags | `tactics` |
| white TPs | 0–1 (sacrifices are intentional — may produce "missed_win" or none) |
| black TPs | 3–5 blunders/mistakes |
| accuracy white | 55–75% (many "bad" looking moves are actually sacrificial plans) |
| accuracy black | 30–55% (multiple queen excursions, loses both rooks for nothing) |
| decided-suppression | N/A — position stays contested until the final combination |

**Validate:**
- [ ] `tactics` pattern detected for black
- [ ] Black's queen moves (moves 12–17) produce at least 2 turning points
- [ ] White's Rg1 (move 11) is NOT flagged as a blunder for white
- [ ] Black's Bxg1 (move 18) may produce a TP — accepting the offered rook allows the mating combination to proceed

---

### game-02-opera.pgn
**Morphy vs Duke of Brunswick/Isouard, Paris 1858 (Opera Game)**

| property | expected |
|---|---|
| pattern tags | `opening` and/or `tactics` for black |
| black TPs | 2–4 mistakes in moves 3–9 (development delays, Bg4 trade) |
| accuracy white | 80–95% (near-perfect development and coordination) |
| accuracy black | 40–60% (multiple development mistakes, lost quickly) |

**Validate:**
- [ ] `opening` pattern fires for black (mistakes in first 10 moves)
- [ ] Black's move 9 (`b5`) or white's recapture sequence (`10.Nxb5 cxb5 11.Bxb5+`) produces at least 1 TP for black — b5 pawn push invites the tactical sequence that costs black pawn + development
- [ ] No false-positive TPs for white

---

### game-03-opening-mistakes.pgn
**Synthetic: white opening collapse**

White blunders immediately: `3.Kf2??` (loses castling rights, king exposed) then
`4.g3??` (allows `fxg3+` pawn check followed by `gxh2` winning the h-rook). By
move 6 white is a full rook down with no compensation.

| property | expected |
|---|---|
| white's side (analyzed as white) | `opening` pattern |
| white TPs in moves 1–10 | ≥ 2 — primary blunders at move 3 (`Kf2??`) and move 4 (`g3??`) |
| accuracy white | 20–40% (rook lost by move 6) |
| accuracy black | 70–85% (plays correctly) |

**Validate:**
- [ ] `opening` pattern fires for white
- [ ] Move 3 (`Kf2`) and move 4 (`g3`) appear as white turning points
- [ ] At least one is marked `blunder` (`??`)

---

### game-04-decided-suppression.pgn
**Synthetic: knight sacrifice → decided position**

White plays `7.Nxf7!` sacrificing a knight to expose black's king. After
`7...Kxf7 8.Bxg8+ Rxg8 9.Qf3+`, black's king is in the open and the eval
swings decisively for white. This is NOT a queen blunder — black's queen
(Qb6) remains on the board until move 28 (Bxb6). All of black's subsequent
mistakes happen in a position already decided by > 350cp.

| property | expected |
|---|---|
| primary TP | Move 7 — black accepts `Nxf7` (`Kxf7`), exposing the king; eval swings to ≥ +400 for white |
| TPs after move 8 | 0–1 — position is decided; late mistakes should NOT pile up as new TPs |
| accuracy black | 30–50% (king-exposure vulnerability dominates the score) |

**Validate:**
- [ ] 1–2 TPs total for black (the king-exposure moment around move 7–8)
- [ ] At most 1 additional TP for black after move 8 — decided-position suppression should prevent TP spam in the −600cp+ position
- [ ] `DECIDED_BLUNDER_CP = 350` threshold is behaving correctly
- [ ] Black's later "blunders" in a −600cp+ position do NOT appear in the TP list

---

### game-05-clean-game.pgn
**Anand vs Carlsen, Chennai 2013, Game 1 (Draw)**

| property | expected |
|---|---|
| pattern tags | none, or at most 1 `strategy` (strategic exchanges, not errors) |
| TPs per side | 0–2 inaccuracies max |
| accuracy white | ≥ 85% |
| accuracy black | ≥ 85% |

**Validate:**
- [ ] No `blunder` or `mistake` TPs for either side
- [ ] Accuracy ≥ 85% for both white and black
- [ ] No false-positive `opening` or `tactics` patterns
- [ ] Analysis passes without error on a 34-move game

---

### game-06-endgame-blunder.pgn
**Synthetic: clean middlegame → K+P endgame blunder**

Rooks are exchanged on moves 40–41 (`40.Kb7 Rxc5 41.Rxc5+ Kxc5`). The pure
K+P endgame begins from **move 42** onwards. Total material from move 42:
only pawns remain, well under the 13-point endgame threshold.

| property | expected |
|---|---|
| pattern tags | `endgame` for white |
| TP for white | 1 blunder in moves 42–48 (K+P endgame, only pawns on board) |
| accuracy white | 60–75% (endgame blunder drags score) |
| accuracy black | 70–82% |
| material check | after move 41: only pawns remain → total material < 13 pts → endgame tag fires |

**Validate:**
- [ ] `endgame` pattern fires for white
- [ ] At least one white TP in moves 42–48 (king maneuver that allows the b-pawn to queen)
- [ ] No TPs flagged in the middlegame unless there's a genuine swing ≥ 50cp

---

### game-07-king-safety.pgn
**Synthetic: castled kingside, then f7 breached**

Black castles kingside on **move 11** (`11...O-O`). White then launches a
kingside attack and breaks through on f7 with `17.Rxe7 18.Rxf7` (double rook
sacrifice). Black's castled king is mated on move 29.

Note on pattern tag: per CLAUDE.md, `king-safety` fires for an "uncastled
king + eval swing ≥ 150cp" OR a "blunder near the castling zone." Since
black is castled, the tag depends on whether the castling-zone criterion
matches. If not, expect `tactics` instead.

| property | expected |
|---|---|
| pattern tags | `king-safety` or `tactics` for black |
| black TPs | 1–2 around moves 15–18 (castled king loses f7/e7 cover) |
| accuracy black | 45–65% (kingside shelter collapses) |
| accuracy white | 75–88% |

**Validate:**
- [ ] `king-safety` or `tactics` pattern fires for black
- [ ] TPs cluster around moves 15–18 where the f7/e7 squares fall
- [ ] Eval swing ≥ 150cp when the f7 pawn cover is breached (not "uncastled king" — king is castled)

---

## Manual Checklist (run for each game after analysis)

```
GAME: _______________  PLAYER SIDE: white / black

Functional:
[ ] /api/analyze returns 200 with evals[], turningPoints[], patterns[]
[ ] accuracy.white and accuracy.black are both non-null, between 0 and 100
[ ] No TypeScript errors thrown (check server logs)
[ ] Analysis version = 1 stored in DB

Accuracy sanity:
[ ] Clean game (game-05): both sides >= 85%
[ ] Blunder-fest (game-03, game-04): accuracy < 60% for the losing side
[ ] Values are not identical for both sides (unless the game is actually equal play)

Turning points:
[ ] At least 1 TP for the losing side in each non-clean game
[ ] TP types match severity: king exposure = 'blunder', pawn structure mistake = 'mistake' / 'inaccuracy'
[ ] oneLineReason is <= 12 words and names the concrete problem
[ ] Decided-position game (game-04): no TPs after the position is decided (move 8+)

Pattern detection:
[ ] Pattern tags match the game narrative (see table above per game)
[ ] At most 4 patterns per game
[ ] Each pattern has a non-empty coachingHint

No false positives:
[ ] Clean GM game (game-05) has 0 blunders and 0 mistakes
[ ] Sacrificial combination (game-01, Immortal) does not flag Anderssen's piece sacrifices as blunders
```

---

## Notes for future automated tests (post Slice 3)

After the accuracy formula is unified (Slice 1 — done), the following can become unit tests:

- `computeChesscomAccuracy(evals, 'white')` on game-05 evals → expect ≥ 85
- `computeChesscomAccuracy(evals, 'black')` on game-03 evals → expect ≤ 50 (if PGN is valid)
- `computeTurningPoints` on game-04 evals → expect 0 TPs after ply 16 (move 8 for black)
- `detectPatterns` on game-06 TPs → expect `endgame` in tags

The evals[] arrays needed for these tests should be captured from a single reference run
and stored as JSON fixtures in `test-data/fixtures/` (not yet created).
