import { redis } from './redis';

/** Cache-aside helper: ambil dari Redis, kalau miss jalankan fn lalu simpan. Resilient (Redis down → langsung fn). */
export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* Redis error → lewati cache */ }
  const val = await fn();
  try {
    await redis.set(key, JSON.stringify(val), 'EX', ttlSec);
  } catch { /* abaikan kegagalan cache */ }
  return val;
}

/** Hapus cache berdasarkan pola (mis. "lb:company:*"). */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch { /* abaikan */ }
}
