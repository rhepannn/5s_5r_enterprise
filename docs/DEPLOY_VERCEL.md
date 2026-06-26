# Deploy ke Vercel (Frontend) + Backend Terpisah

## Kenapa terpisah?

Backend ini punya **Socket.io (leaderboard realtime)** + **7 cron job** + server Express yang hidup terus. Vercel (serverless) **tidak** mendukung koneksi WebSocket persisten maupun proses cron yang berjalan kontinu. Jadi:

- **Frontend (React/Vite/PWA) → Vercel** ✅ cocok sekali
- **Backend (Express/Prisma/Socket.io/cron) → Railway / Render / Fly.io** ✅ dukung server hidup + WebSocket + cron

Database tetap di **Supabase**, cache di **Upstash** (keduanya sudah cloud).

```
Browser ──HTTPS──> Vercel (frontend statis + PWA)
   │
   └──HTTPS + WSS──> Railway/Render (API + Socket.io + cron) ──> Supabase / Upstash
```

---

## Bagian A — Backend ke Railway (atau Render)

> Render: langkahnya mirip — "New Web Service", root `apps/api`, build `npm install && npm run build`, start `npm start`.

1. Push repo ke **GitHub** (jika belum): `git init && git add . && git commit -m "init" && git push`.
   Pastikan `.env` **tidak** ikut (sudah di `.gitignore`).
2. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Setelah service dibuat, buka **Settings**:
   - **Root Directory:** `apps/api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Tab **Variables** — isi semua env produksi (lihat `.env.example`). Yang **wajib** untuk deploy terpisah:
   | Variable | Nilai |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` / `JWT_REFRESH_SECRET` | hasil `openssl rand -hex 32` (≥32 char) |
   | `DATABASE_URL` / `DIRECT_URL` | dari Supabase |
   | `REDIS_URL` | dari Upstash (`rediss://...`) |
   | `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | dari Supabase |
   | `FRONTEND_URL` | **URL Vercel** (mis. `https://5s-enterprise.vercel.app`) — untuk CORS |
   | `COOKIE_SAMESITE` | **`none`** — wajib agar cookie refresh terkirim lintas-domain |
   | SMTP/FCM | opsional |
5. Deploy. Catat URL publik backend, mis. `https://5s-api-production.up.railway.app`.
6. Cek: buka `https://<url-backend>/health` → `{"status":"ok"}`.

> **Penting:** `COOKIE_SAMESITE=none` membuat cookie refresh token (httpOnly) bisa dikirim dari domain Vercel ke domain Railway. Tanpa ini, login berhasil tapi auto-refresh token gagal. `secure:true` otomatis aktif saat sameSite `none`.

---

## Bagian B — Frontend ke Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import repo GitHub yang sama.
2. Vercel membaca **`vercel.json`** di root (sudah disiapkan): build `npm run build -w apps/web`, output `apps/web/dist`, rewrite SPA untuk react-router. Biarkan default.
3. **Environment Variables** — tambahkan **sebelum** deploy (Vite meng-inline saat build):
   | Variable | Nilai |
   |---|---|
   | `VITE_API_URL` | **URL backend** dari Bagian A (mis. `https://5s-api-production.up.railway.app`) — **tanpa** `/api` di akhir |
4. **Deploy**. Vercel kasih domain, mis. `https://5s-enterprise.vercel.app`.

---

## Bagian C — Sambungkan & Uji

1. Balik ke Railway → pastikan `FRONTEND_URL` = domain Vercel final → redeploy backend bila baru diubah.
2. Buka domain Vercel → **login** (`superadmin@5s-enterprise.com` / `Admin1234`).
3. Verifikasi:
   - [ ] Login berhasil & tetap login setelah refresh halaman (uji auto-refresh token → bukti `COOKIE_SAMESITE=none` benar)
   - [ ] Dashboard memuat data (bukti CORS + `VITE_API_URL` benar)
   - [ ] Buka Kompetisi, setujui satu audit di tab lain → leaderboard update realtime (bukti Socket.io/WSS jalan)
   - [ ] Upload foto di Before/After (bukti Storage)

---

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Login OK tapi ke-logout saat refresh | `COOKIE_SAMESITE` belum `none` di backend, atau backend bukan HTTPS |
| Semua request gagal CORS | `FRONTEND_URL` di backend ≠ domain Vercel (harus sama persis, tanpa trailing slash) |
| Data tak muncul / 404 ke `/api` | `VITE_API_URL` salah/kosong saat build — set di Vercel lalu **redeploy** (Vite inline saat build, bukan runtime) |
| Leaderboard tak realtime | Platform backend harus dukung WebSocket (Railway/Render dukung; Vercel tidak) |
| Deep link (mis. `/dashboard`) 404 saat refresh | rewrite SPA di `vercel.json` — sudah disiapkan; pastikan tidak ditimpa |

---

## Catatan: kalau benar-benar mau semua di Vercel

Harus refactor besar: ganti **Socket.io → layanan realtime hosted** (Pusher/Ably/Supabase Realtime), pindah **7 cron → Vercel Cron Jobs** (endpoint HTTP terjadwal), bungkus Express jadi serverless function, dan rate limit pakai Redis. Tidak disarankan kecuali ada alasan kuat — arsitektur saat ini lebih sederhana & murah dengan hybrid di atas.
