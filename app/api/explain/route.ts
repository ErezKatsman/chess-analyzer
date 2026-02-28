// POST /api/explain
// accepts turning points and returns ai-generated plain-english explanations
// uses claude haiku — cheap and fast for short chess coaching text
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TurningPoint } from '@/lib/interfaces/analysis';
import type { BlunderExplanation } from '@/lib/interfaces/analysis';

const client = new Anthropic();

// only explain blunders and mistakes — inaccuracies are too minor to warrant ai cost
const EXPLAIN_TYPES = new Set(['blunder', 'mistake']);

type ExplainRequestBody = {
  turningPoints: TurningPoint[];
};

// build a compact description of each turning point for the prompt
function describePoint(tp: TurningPoint): string {
  const evalLoss =
    tp.evalBefore !== null && tp.evalAfter !== null
      ? ` (eval changed from ${tp.evalBefore > 0 ? '+' : ''}${(tp.evalBefore / 100).toFixed(1)} to ${tp.evalAfter > 0 ? '+' : ''}${(tp.evalAfter / 100).toFixed(1)})`
      : '';

  return `id: ${tp.moveNumber}-${tp.side}, type: ${tp.type}, move ${tp.moveNumber} by ${tp.side}${evalLoss}, fen: "${tp.positionHint}"`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const { turningPoints } = body as ExplainRequestBody;

  if (!Array.isArray(turningPoints) || turningPoints.length === 0) {
    return NextResponse.json({ explanations: [] });
  }

  // filter to only blunders/mistakes — skip inaccuracies to keep cost low
  const pointsToExplain = turningPoints.filter((tp) => EXPLAIN_TYPES.has(tp.type));

  if (pointsToExplain.length === 0) {
    return NextResponse.json({ explanations: [] });
  }

  const positionDescriptions = pointsToExplain.map(describePoint).join('\n');

  const prompt = `You are a friendly chess coach giving quick feedback after a game.

For each position below, respond with exactly:
- "explanation": 1-2 sentences explaining WHY the move was bad (name concrete threats, tactics, or principles violated)
- "rule": a short rule to remember, max 12 words (a chess principle that applies here)

Positions:
${positionDescriptions}

Return ONLY a valid JSON array with this shape (no markdown, no extra text):
[{"id":"moveNumber-side","explanation":"...","rule":"..."}]`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let explanations: BlunderExplanation[] = [];
    try {
      // claude may wrap in markdown code block — strip it
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      explanations = JSON.parse(cleaned) as BlunderExplanation[];
    } catch {
      // if parse fails, return empty so the ui falls back gracefully
      return NextResponse.json({ explanations: [] });
    }

    return NextResponse.json({ explanations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'explain api failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
