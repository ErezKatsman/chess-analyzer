// GET /api/drills/generated
// returns a drill queue built from the user's most recurring weakness pattern.
// finds blunders from games that share the top pattern tag, excludes already-solved ones.
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis, DrillSession } from '@/lib/db/schemas';
import type { TurningPoint, Pattern } from '@/lib/interfaces/analysis';
import type { PositionEval } from '@/lib/analysis/stockfish';
import { TAG_LABEL } from '@/lib/analysis/patternSummary';

// static behavioral label per tag — uses the same wording as coachingFocus.ts fixed-label entries.
// does not attempt tactics/opening sub-disambiguation (requires TP analysis not available here).
// known v1 residual: tactics may show "you leave pieces undefended" on Drills while the Coach tab
// shows the alt variant "you overlook your opponent's threats" — acceptable until labels are unified.
const BEHAVIORAL_LABEL: Record<string, string> = {
  tactics:        'you leave pieces undefended',
  opening:        'you fall behind in the opening',
  endgame:        'your technique slips in endgames',
  strategy:       'your plans drift in quiet positions',
  'time-trouble': 'your accuracy drops late in the game',
  calculation:    'you miss key moves in sharp positions',
  'king-safety':  'you castle too late',
};

export type GeneratedDrill = {
  fen: string;
  bestMove: string;
  blunderMove: string;
  side: 'white' | 'black';
  moveNumber: number;
  oneLineReason: string;
  evalBefore: number | null;
  evalAfter: number | null;
  gameUuid: string;
};

const MAX_DRILLS = 8;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();

  const [games, snoozedDrills] = await Promise.all([
    GameAnalysis.find(
      { clerkUserId: userId },
      { gameUuid: 1, turningPoints: 1, evals: 1, patterns: 1 },
    ).lean(),
    // snoozed = solved but not yet due, OR failed and nextReviewAt is in the future
    DrillSession.find(
      {
        clerkUserId: userId,
        nextReviewAt: { $gt: now },
      },
      { gameUuid: 1, moveNumber: 1, side: 1 },
    ).lean(),
  ]);

  if (games.length === 0) {
    return NextResponse.json({ drills: [], topPatternTag: '', topPatternLabel: '', topPatternGameCount: 0 });
  }

  // count pattern tags across all games (one count per game, not per occurrence)
  const tagCount = new Map<string, number>();
  games.forEach(game => {
    const patterns = (game.patterns ?? []) as Pattern[];
    const seenTags = new Set<string>();
    patterns.forEach(p => {
      if (!seenTags.has(p.tag)) {
        seenTags.add(p.tag);
        tagCount.set(p.tag, (tagCount.get(p.tag) ?? 0) + 1);
      }
    });
  });

  // find the most common pattern tag; fallback to 'tactics' if no patterns yet
  let topTag = 'tactics';
  let topCount = 0;
  tagCount.forEach((count, tag) => {
    if (count > topCount) { topCount = count; topTag = tag; }
  });
  const hasPatterns = tagCount.size > 0;

  // build snoozed-drill exclusion set (nextReviewAt > now — not yet due)
  const snoozedKeys = new Set<string>();
  snoozedDrills.forEach(d => snoozedKeys.add(`${d.gameUuid}-${d.moveNumber}-${d.side}`));

  // collect blunders from games that match the top pattern
  const drills: GeneratedDrill[] = [];
  games.forEach(game => {
    const turningPoints = (game.turningPoints ?? []) as TurningPoint[];
    const evals = (game.evals ?? []) as PositionEval[];
    const patterns = (game.patterns ?? []) as Pattern[];
    const gameUuid = game.gameUuid as string;

    // only use games that exhibit the top pattern (or all games if no patterns detected)
    const hasTopPattern = !hasPatterns || patterns.some(p => p.tag === topTag);
    if (!hasTopPattern) return;

    turningPoints
      .filter(tp => tp.type === 'blunder')
      .forEach(tp => {
        if (snoozedKeys.has(`${gameUuid}-${tp.moveNumber}-${tp.side}`)) return;

        // plyBefore: white blunder on move N = ply (N-1)*2; black = (N-1)*2+1
        const plyBefore = tp.side === 'white'
          ? (tp.moveNumber - 1) * 2
          : (tp.moveNumber - 1) * 2 + 1;
        const bestMove = evals[plyBefore]?.bestMove;
        if (!bestMove) return;

        drills.push({
          fen: tp.positionHint,
          bestMove,
          blunderMove: tp.movePlayed,
          side: tp.side,
          moveNumber: tp.moveNumber,
          oneLineReason: tp.oneLineReason,
          evalBefore: tp.evalBefore,
          evalAfter: tp.evalAfter,
          gameUuid,
        });
      });
  });

  // dueCount = total drills available before the cap (useful for dashboard badge)
  const dueCount = drills.length;

  // shuffle so repeated visits feel fresh, then cap at MAX_DRILLS
  const shuffled = drills.sort(() => Math.random() - 0.5).slice(0, MAX_DRILLS);

  const topPatternLabel   = (TAG_LABEL as Record<string, string>)[topTag] ?? topTag;
  const behavioralLabel   = BEHAVIORAL_LABEL[topTag] ?? topPatternLabel;

  return NextResponse.json({
    drills: shuffled,
    topPatternTag: topTag,
    topPatternLabel,
    behavioralLabel,
    topPatternGameCount: topCount,
    dueCount,
  });
}
