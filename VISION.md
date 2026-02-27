# chess-analyzer — ui vision

## app flow

hero → games list → game replay → analysis → insights summary → drill

---

## page 1 — hero (done)

```
┌─────────────────────────────────────────────┐
│  ♟ Chess Analyzer                    🌙     │
├─────────────────────────────────────────────┤
│                                             │
│        Analyze your chess games             │
│     and get personalized coaching           │
│                                             │
│     [ your chess.com username      ] [Go]   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## page 2 — games list (done)

```
┌─────────────────────────────────────────────┐
│  ♟ Chess Analyzer          erezk     🌙     │
├─────────────────────────────────────────────┤
│  February 2026  [< prev]           [next >] │
│                                             │
│  Opponent      Result  Opening     TC       │
│  ─────────────────────────────────────────  │
│  magnus2024    ✓ Win   Sicilian    10+0     │
│  hikaru99      ✗ Loss  King's Ind  5+3      │
│  anish_fan     = Draw  QGD         15+10    │
│  ...                                        │
│                                    [Analyze]│
└─────────────────────────────────────────────┘
```

---

## page 3 — game replay (done)

```
┌─────────────────────────────────────────────┐
│  ♟ Chess Analyzer          erezk     🌙     │
├──────────────────┬──────────────────────────┤
│                  │  erezk (1450) ⬜          │
│   ┌──────────┐   │  vs magnus2024 (3200) ⬛  │
│   │          │   │  Sicilian · 10+0 · Win   │
│   │  board   │   ├──────────────────────────┤
│   │          │   │  Move list               │
│   │          │   │  1. e4   e5              │
│   │          │   │  2. Nf3  Nc6             │
│   └──────────┘   │  3. Bb5  ...             │
│                  ├──────────────────────────┤
│  [|◀] [◀] [▶] [▶|]  Move 12 / 48          │
└──────────────────┴──────────────────────────┘
```

---

## page 4 — analysis (to build)

```
┌─────────────────────────────────────────────┐
│  ♟ Chess Analyzer          erezk     🌙     │
├──────────────────┬──────────────────────────┤
│                  │  Eval bar  +1.2 → -3.4   │
│   ┌──────────┐   │  ████████░░░░░░░░░░░░░   │
│   │          │   ├──────────────────────────┤
│   │  board   │   │  ⚠ Blunder on move 14   │
│   │  (at the │   │  You played Nxe5?        │
│   │  blunder)│   │  Best was Qd4            │
│   └──────────┘   │                          │
│                  │  [◀ prev] [next ▶]       │
│  [|◀] [◀] [▶] [▶|]  Move 14 / 48          │
└──────────────────┴──────────────────────────┘
```

---

## page 5 — insights summary (to build)

```
┌─────────────────────────────────────────────┐
│  ♟ Chess Analyzer          erezk     🌙     │
├─────────────────────────────────────────────┤
│  Game vs magnus2024  —  Summary             │
│                                             │
│  🔴 2 Blunders   🟡 3 Mistakes   🔵 5 Inaccuracies │
│                                             │
│  Patterns detected:                         │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ ⚠ King Safety   │  │ ♟ Endgame Tech  │  │
│  │ moves 22-28     │  │ moves 40-48     │  │
│  └─────────────────┘  └─────────────────┘  │
│                                             │
│  Suggested drills:                          │
│  • Fork practice from move 18 position      │
│  • Rook endgame technique                   │
│                                             │
│              [Start Drill] [Back to Games]  │
└─────────────────────────────────────────────┘
```

---

## page 6 — drill (future)

```
┌─────────────────────────────────────────────┐
│  ♟ Drill: Find the Fork                     │
├──────────────────┬──────────────────────────┤
│                  │  White to move            │
│   ┌──────────┐   │                          │
│   │          │   │  This position came from │
│   │  board   │   │  your game vs magnus     │
│   │          │   │  on Feb 12               │
│   └──────────┘   │                          │
│                  │  Find the best move.      │
│  [Give up / See solution]                   │
└──────────────────┴──────────────────────────┘
```
