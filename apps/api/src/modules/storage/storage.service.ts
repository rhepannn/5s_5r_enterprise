import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { env } from '@/config/env';
import { AppError } from '@/middlewares/errorHandler';

let supabase: SupabaseClient | null = null;
let storageReady = false;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  storageReady = true;
  console.log('[Storage] Supabase Storage aktif');
  // Pastikan bucket ada (best-effort)
  void ensureBucket();
} else {
  console.warn('[Storage] SUPABASE_URL/SUPABASE_SERVICE_KEY kosong — upload foto nonaktif');
}

export function isStorageReady(): boolean {
  return storageReady;
}

async function ensureBucket(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.storage.getBucket(env.SUPABASE_STORAGE_BUCKET);
    if (!data) {
      await supabase.storage.createBucket(env.SUPABASE_STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: '10MB',
      });
      console.log(`[Storage] Bucket "${env.SUPABASE_STORAGE_BUCKET}" dibuat`);
    }
    // Pastikan publik — createBucket kadang tidak menerapkan public:true (terutama dgn secret key baru)
    if (!data || !data.public) {
      await supabase.storage.updateBucket(env.SUPABASE_STORAGE_BUCKET, { public: true });
      console.log(`[Storage] Bucket "${env.SUPABASE_STORAGE_BUCKET}" diset publik`);
    }
  } catch (err) {
    console.error('[Storage] ensureBucket gagal:', (err as Error).message);
  }
}

/**
 * Kompres gambar (Sharp) lalu upload ke Supabase Storage. Return public URL.
 * @param folder contoh: "audit/<sessionId>" atau "before-after/<improvementId>"
 */
export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  if (!supabase) {
    throw new AppError('Penyimpanan foto belum dikonfigurasi (SUPABASE_SERVICE_KEY belum diisi)', 503);
  }

  const compressed = await sharp(buffer)
    .rotate() // auto-orient dari EXIF
    .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const path = `${folder}/${uuid()}.jpg`;
  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new AppError(`Gagal upload foto: ${error.message}`, 500);

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Hapus foto dari storage berdasarkan public URL. */
export async function deleteImage(publicUrl: string): Promise<void> {
  if (!supabase) return;
  try {
    const marker = `/${env.SUPABASE_STORAGE_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = publicUrl.substring(idx + marker.length);
    await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
  } catch (err) {
    console.error('[Storage] deleteImage gagal:', (err as Error).message);
  }
}
