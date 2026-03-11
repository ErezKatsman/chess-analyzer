import mongoose, { Schema, type Document } from 'mongoose';

// caches the raw chess.com monthly archive response so we don't hammer their api.
// TTL: 1 hour (handled by the fetchedAt field + application-level check).

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

export const CachedGames =
  (mongoose.models.CachedGames as mongoose.Model<ICachedGames>) ??
  mongoose.model<ICachedGames>('CachedGames', CachedGamesSchema);
