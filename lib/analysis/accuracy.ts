// lib/analysis/accuracy.ts
// chess.com-compatible accuracy formula — single source of truth.
// accepts any eval shape with { cp, mate } fields.

type EvalLike = { cp: number | null; mate: number | null };

const MATE_CP = 2000;

function toCp(e: EvalLike): number {
  if (e.cp !== null) return e.cp;
  if (e.mate !== null) return e.mate > 0 ? MATE_CP : -MATE_CP;
  return 0;
}

// 103.1668 * exp(-0.04354 * avgCpLoss) - 3.1669
// individual move loss capped at 1000cp to avoid outlier distortion
// evals[0] = starting position; evals are white-perspective (positive = white ahead)
// white moves: odd plies (1,3,5...), black moves: even plies (2,4,6...)
export function computeChesscomAccuracy(
  evals: EvalLike[],
  side: 'white' | 'black',
): number {
  const sign = side === 'white' ? 1 : -1;
  const losses: number[] = [];
  for (let p = 1; p < evals.length; p++) {
    if (side === 'white' && p % 2 !== 1) continue;
    if (side === 'black' && p % 2 !== 0) continue;
    const cpBefore = sign * toCp(evals[p - 1]);
    const cpAfter = sign * toCp(evals[p]);
    losses.push(Math.min(Math.max(0, cpBefore - cpAfter), 1000));
  }
  if (losses.length === 0) return 100;
  const avg = losses.reduce((a, b) => a + b, 0) / losses.length;
  const raw = 103.1668 * Math.exp(-0.04354 * avg) - 3.1669;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}
