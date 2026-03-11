import mongoose, { Schema, type Document } from 'mongoose';

// tracks how many analyses a user has run this calendar month.
// NOTE: quota logic now uses GameAnalysis.countDocuments (10 lifetime free).
// this collection is kept as a harmless tombstone — nothing reads or writes to it.

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

export const UserQuota =
  (mongoose.models.UserQuota as mongoose.Model<IUserQuota>) ??
  mongoose.model<IUserQuota>('UserQuota', UserQuotaSchema);
