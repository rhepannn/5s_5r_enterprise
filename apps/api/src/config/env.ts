import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PORT: parseInt(process.env.API_PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',
  MONGODB_URL: process.env.MONGODB_URL || '',

  // REDIS_URL (Upstash/cloud, format rediss://...) diutamakan; jika kosong, pakai host/port/password
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // Supabase Storage (foto audit/before-after)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || '5s-files',

  // Firebase Cloud Messaging — pilih salah satu: path ke file JSON (disarankan) atau JSON inline
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',

  // WhatsApp Business API (opsional) — format Meta Cloud API / provider
  WA_API_URL: process.env.WA_API_URL || '',
  WA_API_TOKEN: process.env.WA_API_TOKEN || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@5s-enterprise.com',

  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY || '',
};

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

// Pengaman go-live: tolak start produksi bila secret JWT masih default/lemah (mencegah token bisa dipalsukan).
if (isProd) {
  const weak: string[] = [];
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const v = process.env[key];
    if (!v || v.includes('fallback') || v.length < 32) weak.push(key);
  }
  if (weak.length) {
    throw new Error(
      `[FATAL] Secret produksi lemah/kosong: ${weak.join(', ')}. ` +
        `Wajib di-set minimal 32 karakter acak (mis. \`openssl rand -hex 32\`) di .env sebelum go-live.`
    );
  }
}
