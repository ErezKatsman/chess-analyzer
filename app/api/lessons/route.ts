// POST /api/lessons
// accepts detected patterns + turning points and returns ai-generated mini-lessons
// one lesson per pattern — uses claude haiku, cached in mongodb
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Pattern, TurningPoint, Lesson } from '@/lib/interfaces/analysis';
import { connectDB } from '@/lib/db/mongo';
import { GameAnalysis } from '@/lib/db/schemas';

type LessonsRequestBody = {
  patterns: Pattern[];
  turningPoints: TurningPoint[];
  gameUuid?: string;
};

// build a compact summary of turning points for a given pattern's evidence moves
function summarizeEvidenceMoves(
  evidenceMoves: number[],
  turningPoints: TurningPoint[],
): string {
  const relevant = turningPoints.filter((tp) => evidenceMoves.includes(tp.moveNumber));
  if (relevant.length === 0) return 'no specific moves recorded';
  return relevant
    .map((tp) => `move ${tp.moveNumber} (${tp.side}, ${tp.type}: ${tp.oneLineReason})`)
    .join('; ');
}

function buildPrompt(patterns: Pattern[], turningPoints: TurningPoint[]): string {
  const patternDescriptions = patterns
    .map((p) => {
      const evidence = summarizeEvidenceMoves(p.evidenceMoves, turningPoints);
      return `tag: ${p.tag}, title: "${p.title}", coaching hint: "${p.coachingHint}", game evidence: ${evidence}`;
    })
    .join('\n');

  return `You are a chess coach generating structured mini-lessons from a player's game analysis.

For each pattern below, produce a lesson object with:
- "patternTag": the exact tag string provided
- "title": lesson title (≤8 words)
- "concept": 2-3 sentences explaining the chess concept in plain english
- "keyPoints": exactly 3 short principles to remember (each ≤15 words)
- "gameReference": 1 sentence referencing the specific moves from this game
- "practiceTip": 1 actionable sentence on how to practice this

Patterns:
${patternDescriptions}

Return ONLY a valid JSON array (no markdown, no extra text):
[{"patternTag":"...","title":"...","concept":"...","keyPoints":["...","...","..."],"gameReference":"...","practiceTip":"..."}]`;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const { patterns, turningPoints, gameUuid } = body as LessonsRequestBody;

  if (!Array.isArray(patterns) || patterns.length === 0) {
    return NextResponse.json({ lessons: [] });
  }

  // return cached lessons if available
  if (userId && gameUuid) {
    await connectDB();
    const saved = await GameAnalysis.findOne(
      { clerkUserId: userId, gameUuid },
      { lessons: 1 },
    ).lean();

    if (saved?.lessons && saved.lessons.length > 0) {
      return NextResponse.json({ lessons: saved.lessons, fromCache: true });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ lessons: [] });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(patterns, turningPoints ?? []) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let lessons: Lesson[] = [];
    try {
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      lessons = JSON.parse(cleaned) as Lesson[];
    } catch {
      return NextResponse.json({ lessons: [] });
    }

    // persist so future loads skip claude
    if (userId && gameUuid && lessons.length > 0) {
      await connectDB();
      await GameAnalysis.updateOne(
        { clerkUserId: userId, gameUuid },
        { $set: { lessons } },
      );
    }

    return NextResponse.json({ lessons });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'lessons api failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
