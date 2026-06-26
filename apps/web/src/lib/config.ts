// Konfigurasi origin backend.
// Prioritas: VITE_API_URL (saat build) > fallback produksi Railway > origin sama (dev).
//
// Saat dev: VITE_API_URL kosong & import.meta.env.PROD=false → API_ORIGIN kosong,
// sehingga REST/Socket lewat proxy Vite (lihat vite.config.ts).
// Saat build produksi: kalau VITE_API_URL tak ter-set (mis. env Vercel tak terbaca),
// otomatis pakai backend Railway. import.meta.env.PROD = true saat `vite build`.
const FALLBACK_PROD_API = 'https://5sapi-production.up.railway.app';

const RAW_API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? FALLBACK_PROD_API : '');

export const API_ORIGIN = RAW_API_URL.replace(/\/$/, '');

/** Base URL untuk REST API (axios). */
export const API_BASE = `${API_ORIGIN}/api`;

/** Target koneksi Socket.io (origin backend, atau '/' untuk origin sama). */
export const SOCKET_URL = API_ORIGIN || '/';
