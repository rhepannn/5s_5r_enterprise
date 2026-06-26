# Panduan Deployment & Go-Live

Untuk **tim IT/DevOps**. Mencakup persiapan, dua opsi deployment, go-live, dan monitoring.

---

## 1. Prasyarat

- **Node.js 20+** (untuk build) atau **Docker + Docker Compose**
- Domain + sertifikat **HTTPS** (mis. Let's Encrypt)
- Salah satu opsi database:
  - **Cloud** (disarankan): akun [Supabase](https://supabase.com) (PostgreSQL + Storage) + [Upstash](https://upstash.com) (Redis)
  - **Self-host**: server Linux untuk container PostgreSQL/Redis

---

## 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Isi `.env`. **Wajib untuk produksi:**

1. `NODE_ENV=production`
2. `FRONTEND_URL=https://domain-anda` (untuk CORS & cookie)
3. **Secret JWT kuat** — aplikasi menolak start bila lemah:
   ```bash
   openssl rand -hex 32   # jalankan 2x untuk JWT_SECRET & JWT_REFRESH_SECRET
   ```
4. `DATABASE_URL` + `DIRECT_URL` (Supabase) **atau** kredensial Postgres lokal
5. `REDIS_URL` (Upstash) **atau** `REDIS_HOST/PORT/PASSWORD`
6. `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (untuk foto)
7. SMTP (opsional, untuk email), FCM (opsional, push), WA (opsional)

> ⚠️ **Jangan commit `.env`** — sudah ada di `.gitignore`. Jika kredensial pernah ter-paste/ter-share, **rotasi** sebelum go-live.

---

## 3. Siapkan Database

```bash
# Push skema ke database (dari root)
npm run db:push -w apps/api      # atau: cd apps/api && npx prisma db push

# Seed data awal (perusahaan demo, periode, checklist, klausul ISO, kriteria PROPER)
npm run db:seed -w apps/api
```

Verifikasi: tabel terbuat & data seed masuk.

---

## 4. Deployment — Opsi A: Cloud-managed (disarankan)

Database & storage di cloud (Supabase/Upstash); hanya **container aplikasi** yang Anda jalankan.

```bash
# Build & jalankan API + Web
docker compose -f docker-compose.prod.yml up -d --build api web
```

Atau tanpa Docker (build manual):
```bash
# API
cd apps/api && npm ci && npm run build && npm start   # = node dist/app.js
# Web (hasil build di apps/web/dist — sajikan via Nginx/CDN)
cd apps/web && npm ci && npm run build
```

Arahkan **Nginx/reverse proxy** ke API (`:3001`) dan sajikan `apps/web/dist` sebagai statis, dengan HTTPS.

---

## 5. Deployment — Opsi B: Self-host penuh (Docker)

Semua service (Postgres, Redis, MongoDB, MinIO, API, Web) dalam Docker:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- API: `:3001`, Web: `:80/:443`
- Data persist di volume: `postgres_data`, `redis_data`, `mongo_data`, `minio_data`
- Semua service `restart: always` + healthcheck

Setelah container DB sehat, jalankan `db:push` + `db:seed` (langkah 3) menunjuk ke service Postgres.

---

## 6. Smoke Test Pasca-Deploy

```bash
curl https://domain-anda/health           # {"status":"ok",...}
```
Lalu di browser: login superadmin → cek Dashboard, lakukan 1 audit → setujui → cek Leaderboard ter-update.

Skrip uji tersedia: `apps/api/loadtest.mjs` (performa) — sesuaikan `BASE` ke domain produksi.

---

## 7. Checklist Go-Live

- [ ] `NODE_ENV=production`
- [ ] Secret JWT di-generate acak (32+ char), bukan default
- [ ] `FRONTEND_URL` = domain produksi (HTTPS)
- [ ] Kredensial DB/Redis/Storage produksi terisi & teruji
- [ ] Kredensial yang pernah ter-share sudah **dirotasi**
- [ ] `db:push` + `db:seed` sukses
- [ ] HTTPS aktif (sertifikat valid), HTTP redirect ke HTTPS
- [ ] `/health` OK dari luar
- [ ] Backup database terjadwal (Supabase otomatis / `pg_dump` cron untuk self-host)
- [ ] Akun superadmin awal sudah ganti kata sandi
- [ ] SMTP/FCM teruji (kirim 1 notifikasi percobaan)
- [ ] Scheduler/cron berjalan (cek log saat start)
- [ ] Monitoring & alert aktif (lihat §8)

---

## 8. Monitoring & Pemeliharaan

**Yang dipantau:**
- **Uptime** — ping `/health` tiap menit (mis. UptimeRobot, Uptime Kuma, atau healthcheck cloud).
- **Log error** — `docker compose logs -f api`. Untuk produksi, integrasikan Sentry/Logtail (error handler sudah memusatkan error; stack hanya ke server, tidak ke klien).
- **Performa** — endpoint berat (leaderboard/dashboard) sudah di-cache Redis 30–60 dtk; pantau hit-rate & latency.
- **Resource** — CPU/RAM/disk container; volume DB jangan penuh.
- **Sertifikat HTTPS** — auto-renew Let's Encrypt; pantau tanggal kedaluwarsa.
- **Izin lingkungan (PROPER)** — modul mengirim notifikasi otomatis menjelang kedaluwarsa.

**Pemeliharaan rutin:**
- Backup DB harian + uji restore berkala.
- Update dependensi keamanan (`npm audit`) terjadwal.
- Rotasi secret JWT bila ada indikasi kebocoran (akan memaksa semua user login ulang).

---

## 9. Rollback

- **Docker:** simpan tag image versi sebelumnya; `docker compose up -d` dengan tag lama.
- **Database:** restore dari backup terakhir sebelum perubahan skema. Uji `db:push` di staging dulu sebelum produksi.
- Selalu deploy ke **staging** dan jalankan smoke test sebelum produksi.

---

## 10. Troubleshooting

| Gejala | Kemungkinan & solusi |
|---|---|
| API gagal start, error "Secret produksi lemah" | Set `JWT_SECRET`/`JWT_REFRESH_SECRET` 32+ char acak |
| `db:push` gagal | Cek `DIRECT_URL` (port 5432, bukan pooler) |
| Foto 404 | Cek `SUPABASE_SERVICE_KEY` & bucket public; cek log storage saat start |
| Leaderboard tidak realtime | Pastikan Redis/Socket.io terhubung; cek CORS `FRONTEND_URL` |
| Email tidak terkirim | Cek SMTP; Gmail butuh App Password |
| 429 Too Many Requests | Rate limit (200/15mnt umum, 10/15mnt login) — normal, tunggu reset |
