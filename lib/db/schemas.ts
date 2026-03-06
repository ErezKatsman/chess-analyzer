// all mongoose schemas in one file to keep things simple at this stage.
// split into separate files only if schemas grow large.

import mongoose, { Schema, type Document } from 'mongoose';

// ─── GameAnalysis ────────────────────────────────────────────────────────────
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
  analysisVersion: { type: Number, default: 1 },
  analyzedAt: { type: Date, default: Date.now },
});

// compound index — one analysis per user per game
GameAnalysisSchema.index({ clerkUserId: 1, gameUuid: 1 }, { unique: true });

// ─── UserQuota ───────────────────────────────────────────────────────────────
// tracks how many analyses a user has run this calendar month.
// replaces the localStorage quota — enforced server-side.

export interface IUserQuota extends Document {
  clerkUserId: string;
  month: string; // "YYYY-MM"
  count: number;
  updatedAt: Date;
}

const UserQuotaSchema = new Schema<IUserQuota>({
  clerkUserId: { type: String, required: true },
  month: { type: String, required: true },
  count: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

UserQuotaSchema.index({ clerkUserId: 1, month: 1 }, { unique: true });

// ─── DrillSession ─────────────────────────────────────────────────────────────
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

// ─── CachedGames ─────────────────────────────────────────────────────────────
// caches the raw chess.com monthly archive response so we don't hammer their api.
// TTL: 1 hour (handled by the createdAt index + application-level check).

export interface ICachedGames extends Document {
  userName: string;
  year: number;
  month: number;
  games: object[];
  fetchedAt: Date;
}

const CachedGamesSchema = new Schema<ICachedGames>({
  userName: { type: String, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  games: { type: [Schema.Types.Mixed], default: [] },
  fetchedAt: { type: Date, default: Date.now },
});

CachedGamesSchema.index({ userName: 1, year: 1, month: 1 }, { unique: true });

// ─── model helpers (prevent model re-compilation on hot-reload) ───────────────

export const GameAnalysis =
  (mongoose.models.GameAnalysis as mongoose.Model<IGameAnalysis>) ??
  mongoose.model<IGameAnalysis>('GameAnalysis', GameAnalysisSchema);

export const UserQuota =
  (mongoose.models.UserQuota as mongoose.Model<IUserQuota>) ??
  mongoose.model<IUserQuota>('UserQuota', UserQuotaSchema);

export const DrillSession =
  (mongoose.models.DrillSession as mongoose.Model<IDrillSession>) ??
  mongoose.model<IDrillSession>('DrillSession', DrillSessionSchema);

export const CachedGames =
  (mongoose.models.CachedGames as mongoose.Model<ICachedGames>) ??
  mongoose.model<ICachedGames>('CachedGames', CachedGamesSchema);

// ─── UserProfile ──────────────────────────────────────────────────────────────
// links a clerk user id to their chess.com username.
// saved once on first submit — powers the home-page auto-redirect.

export interface IUserProfile extends Document {
  clerkUserId: string;
  chessUsername: string;
  // subscription tier — 'paid' = unlimited analyses
  plan: 'free' | 'paid';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // onboarding answers (all optional — user may skip)
  targetRating?: number;
  timePreference?: 'bullet' | 'blitz' | 'rapid' | 'classical';
  experience?: 'beginner' | 'intermediate' | 'experienced';
  selfReportedWeakness?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>({
  clerkUserId: { type: String, required: true, unique: true },
  chessUsername: { type: String, required: true },
  plan: { type: String, enum: ['free', 'paid'], default: 'free' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  targetRating: { type: Number },
  timePreference: { type: String, enum: ['bullet', 'blitz', 'rapid', 'classical'] },
  experience: { type: String, enum: ['beginner', 'intermediate', 'experienced'] },
  selfReportedWeakness: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const UserProfile =
  (mongoose.models.UserProfile as mongoose.Model<IUserProfile>) ??
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
