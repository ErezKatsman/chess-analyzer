import mongoose, { Schema, type Document } from 'mongoose';

// records each drill attempt so we can show history and track improvement.

export interface IDrillSession extends Document {
  clerkUserId: string;
  gameUuid: string;
  moveNumber: number;
  side: 'white' | 'black';
  blunderMove: string; // uci
  correctMove: string; // uci (best move)
  solved: boolean;
  attempts: number;
  solvedAt: Date | null;
  // leitner SRS: null = new drill (include immediately); date in future = snoozed; past = due
  nextReviewAt?: Date;
  createdAt: Date;
}

const DrillSessionSchema = new Schema<IDrillSession>({
  clerkUserId: { type: String, required: true, index: true },
  gameUuid: { type: String, required: true },
  moveNumber: { type: Number, required: true },
  side: { type: String, enum: ['white', 'black'], required: true },
  blunderMove: { type: String, required: true },
  correctMove: { type: String, required: true },
  solved: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  solvedAt: { type: Date, default: null },
  nextReviewAt: { type: Date, default: undefined },
  createdAt: { type: Date, default: Date.now },
});

// unique compound index — one session per (user, game, move, side)
DrillSessionSchema.index(
  { clerkUserId: 1, gameUuid: 1, moveNumber: 1, side: 1 },
  { unique: true },
);

export const DrillSession =
  (mongoose.models.DrillSession as mongoose.Model<IDrillSession>) ??
  mongoose.model<IDrillSession>('DrillSession', DrillSessionSchema);
