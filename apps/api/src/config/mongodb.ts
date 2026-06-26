import mongoose from 'mongoose';
import { env } from './env';

export async function connectMongoDB(): Promise<void> {
  if (!env.MONGODB_URL) {
    console.warn('[MongoDB] MONGODB_URL not set, skipping connection');
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URL);
    console.log('[MongoDB] Connected');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
  }
}

// Activity log schema
const activityLogSchema = new mongoose.Schema(
  {
    userId: String,
    userEmail: String,
    action: String,
    resource: String,
    resourceId: String,
    metadata: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
