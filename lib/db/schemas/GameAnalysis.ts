import mongoose, { Schema, type Document } from 'mongoose';

// stores the full stockfish analysis result for one game.
// keyed by (clerkUserId, gameUuid) so we never rerun stockfish for the same game.

export interface IGameAnalysis extends Document {
  clerkUserId: string;
  gameUuid: string;
  pgn: string;
  playerSide: 'white' | 'black';
  evals: object[];
  turningPoints: object[];
  patterns: object[];
  explanations: object[];
  lessons: object[];
  // accuracy scores per side — computed from evals, stored for fast display in GamesTable
  accuracy?: { white: number; black: number };
  // avg centipawn loss per side — stored to derive training score without re-reading evals
  avgCpLoss?: { white: number; black: number };
  // increment when analysis logic changes to detect stale cached results
  analysisVersion?: number;
  analyzedAt: Date;
}

const GameAnalysisSchema = new Schema<IGameAnalysis>({
  clerkUserId: { type: String, required: true, index: true },
  gameUuid: { type: String, required: true },
  pgn: { type: String, required: true },
  playerSide: { type: String, enum: ['white', 'black'], required: true },
  evals: { type: [Schema.Types.Mixed], default: [] },
  turningPoints: { type: [Schema.Types.Mixed], default: [] },
  patterns: { type: [Schema.Types.Mixed], default: [] },
  explanations: { type: [Schema.Types.Mixed], default: [] },
  lessons: { type: [Schema.Types.Mixed], default: [] },
  accuracy: {
    type: new Schema({ white: Number, black: Number }, { _id: false }),
    default: undefined,
  },
  avgCpLoss: {
    type: new Schema({ white: Number, black: Number }, { _id: false }),
    default: undefined,
  },
  analysisVersion: { type: Number, default: 1 },
  analyzedAt: { type: Date, default: Date.now },
});

// compound index — one analysis per user per game
GameAnalysisSchema.index({ clerkUserId: 1, gameUuid: 1 }, { unique: true });

export const GameAnalysis =
  (mongoose.models.GameAnalysis as mongoose.Model<IGameAnalysis>) ??
  mongoose.model<IGameAnalysis>('GameAnalysis', GameAnalysisSchema);
