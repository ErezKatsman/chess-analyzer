import mongoose, { Schema, type Document } from 'mongoose';

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
