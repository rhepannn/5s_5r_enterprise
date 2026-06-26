import Redis from 'ioredis';
import { env } from './env';

// Upstash/cloud: pakai REDIS_URL (rediss://...) — TLS aktif otomatis.
// Lokal: pakai host/port/password.
export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  : new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

export default redis;
