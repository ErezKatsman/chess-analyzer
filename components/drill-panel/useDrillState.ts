// components/drill-panel/useDrillState.ts
// encapsulates all drill logic so DrillPanel.tsx is JSX-only

import * as React from 'react';
import { Chess, type Square as ChessSquare } from 'chess.js';
import type { DrillStatus } from './types';
import { PIECE_NAMES } from './types';

type UseDrillStateParams = {
  fen: string;
  bestMove: string;
  blunderMove?: string;
  side: 'white' | 'black';
  moveNumber: number;
  gameUuid?: string;
};

export type DrillStateResult = {
  selected: string | null;
  status: DrillStatus;
  attempts: number;
  hint: string;
  displayFen: string;
  animating: boolean;
  blunderFlashing: boolean;
  isDone: boolean;
  boardBusy: boolean;
  blunderSan: string | null;
  evalLossText: string | null;
  replayBlunder: () => void;
  handleSquareClick: (square: string) => void;
  reveal: () => void;
  reset: () => void;
};

export function useDrillState(
  { fen, bestMove, blunderMove, side, moveNumber, gameUuid }: UseDrillStateParams,
  evalBefore: number | null,
  evalAfter: number | null,
): DrillStateResult {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<DrillStatus>('idle');
  const [attempts, setAttempts] = React.useState(0);
  const [hint, setHint] = React.useState('');
  // displayFen changes when the player makes a move, reveals the answer, or replays the blunder
  const [displayFen, setDisplayFen] = React.useState(fen);
  // true while the wrong-move flash animation is running
  const [animating, setAnimating] = React.useState(false);
  // true while the "show my blunder" replay is flashing on the board
  const [blunderFlashing, setBlunderFlashing] = React.useState(false);

  const chess = React.useMemo(() => new Chess(fen), [fen]);
  const playerColor = side === 'white' ? 'w' : 'b';
  const isDone = status === 'correct' || status === 'revealed';
  const boardBusy = animating || blunderFlashing;

  // save drill result to mongodb when drill reaches a terminal state
  React.useEffect(() => {
    if (!isDone || !gameUuid) return;
    void fetch('/api/drills/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameUuid,
        moveNumber,
        side,
        blunderMove: blunderMove ?? '',
        correctMove: bestMove,
        solved: status === 'correct',
        attempts,
      }),
    }).catch(() => {
      // non-fatal — drill still works without persistence
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // compute the san of the blunder move for the button label and overlay
  const blunderSan = React.useMemo(() => {
    if (!blunderMove) return null;
    try {
      const tmp = new Chess(fen);
      const result = tmp.move({
        from: blunderMove.slice(0, 2),
        to: blunderMove.slice(2, 4),
        promotion: blunderMove[4] ?? 'q',
      });
      return result.san;
    } catch {
      return null;
    }
  }, [fen, blunderMove]);

  // apply a uci move on top of the original fen and return the resulting fen
  const applyMove = (uci: string): string => {
    const tmp = new Chess(fen);
    tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' });
    return tmp.fen();
  };

  // show the blunder move on the board for 1.2s, then snap back
  const replayBlunder = () => {
    if (!blunderMove || boardBusy) return;
    try {
      const postBlunderFen = applyMove(blunderMove);
      setBlunderFlashing(true);
      setDisplayFen(postBlunderFen);
      setTimeout(() => {
        // snap back to the position the drill is on (fen if idle, else whatever is showing)
        setDisplayFen(isDone ? applyMove(status === 'revealed' ? bestMove : blunderMove) : fen);
        setBlunderFlashing(false);
      }, 1200);
    } catch {
      // invalid move — ignore
    }
  };

  const evaluateAttempt = (uci: string) => {
    // silently ignore illegal moves
    const legal = chess.moves({ verbose: true });
    if (!legal.some((m) => m.from + m.to === uci)) return;

    const isCorrect = uci === bestMove.slice(0, 4);

    if (isCorrect) {
      setDisplayFen(applyMove(uci));
      setStatus('correct');
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    // flash the wrong move on the board, then snap back / reveal
    setAnimating(true);
    setDisplayFen(applyMove(uci));

    setTimeout(() => {
      setAnimating(false);

      if (nextAttempts >= 2) {
        // second wrong attempt — reveal best move with arrow
        setDisplayFen(applyMove(bestMove));
        setStatus('revealed');
        return;
      }

      // first wrong attempt — snap back and show hint
      setDisplayFen(fen);
      const fromSq = bestMove.slice(0, 2) as ChessSquare;
      const piece = chess.get(fromSq);
      const pieceName = piece ? (PIECE_NAMES[piece.type] ?? 'piece') : 'piece';
      setHint(`Not quite. Think about moving your ${pieceName}.`);
      setStatus('wrong');
    }, 500);
  };

  const handleSquareClick = (square: string) => {
    if (isDone || boardBusy) return;

    const piece = chess.get(square as ChessSquare);

    // first click: select a piece of the right color
    if (!selected) {
      if (piece?.color === playerColor) setSelected(square);
      return;
    }

    // re-select own piece
    if (piece?.color === playerColor) {
      setSelected(square);
      return;
    }

    // deselect on same square
    if (selected === square) {
      setSelected(null);
      return;
    }

    // attempt move
    const uci = selected + square;
    setSelected(null);
    evaluateAttempt(uci);
  };

  const reveal = () => {
    setDisplayFen(applyMove(bestMove));
    setStatus('revealed');
  };

  const reset = () => {
    setSelected(null);
    setStatus('idle');
    setAttempts(0);
    setHint('');
    setDisplayFen(fen);
  };

  // compute eval loss in pawn units for display
  const evalLossText = React.useMemo(() => {
    if (evalBefore === null || evalAfter === null) return null;
    const sign = side === 'white' ? 1 : -1;
    const loss = sign * (evalBefore - evalAfter);
    return `${(loss / 100).toFixed(1)} pawns lost`;
  }, [evalBefore, evalAfter, side]);

  return {
    selected,
    status,
    attempts,
    hint,
    displayFen,
    animating,
    blunderFlashing,
    isDone,
    boardBusy,
    blunderSan,
    evalLossText,
    replayBlunder,
    handleSquareClick,
    reveal,
    reset,
  };
}
