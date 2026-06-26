# Panduan Admin — Software Manajemen 5S/5R Enterprise

Untuk **Superadmin** dan **Admin 5S**. Mengatur master data, pengguna, periode, dan modul kepatuhan.

> **Superadmin vs Admin 5S**
> - **Superadmin** — akses penuh ke semua perusahaan/plant, kelola pengguna termasuk admin, konfigurasi sistem. Biasanya tim IT/owner.
> - **Admin 5S** — mengelola operasional 5S dalam 1 perusahaan: master data, periode audit, pengguna non-admin, modul ISO/PROPER.

---

## 1. Master Data (fondasi — lakukan pertama)

**Menu Master Data.** Hirarki: **Perusahaan → Plant → Departemen → Divisi → Area Kerja**.

Urutan setup:
1. **Perusahaan** — nama, logo.
2. **Plant** — lokasi pabrik/kantor.
3. **Departemen** lalu **Divisi** (set **kategori**: Produksi / Kantor / Gudang — menentukan grup kompetisi).
4. **Area Kerja** — titik yang diaudit (mis. "Lini Perakitan 1").

**Import massal:** Menu **Import** → unduh template Excel → isi → unggah. Cocok untuk membuat banyak divisi/area/pengguna sekaligus.

---

## 2. Kelola Pengguna

**Menu Pengguna** → **+ Pengguna Baru**.
- Isi nama, email, **peran**, dan **penempatan** (divisi/area).
- Kata sandi awal dibuat; minta pengguna menggantinya saat login pertama.
- **Nonaktifkan** pengguna yang keluar (jangan hapus — menjaga histori audit).

**Peran yang bisa diberikan:** Auditor, Kepala Divisi, PIC, Anggota. (Hanya Superadmin yang membuat Admin 5S lain.)

---

## 3. Periode Audit & Checklist

1. **Menu Audit → Periode** → buat periode (mis. "Semester 1 2026"), tanggal mulai–akhir, tandai **Aktif**.
2. **Template Checklist** — item per **5 pilar**. Sesuaikan dengan kebutuhan industri Anda.
3. **Jadwal Audit** — buat manual atau biarkan **scheduler otomatis** membuat jadwal rutin. Auditor menerima notifikasi.
4. **Audit Surprise** — buat jadwal tipe *SURPRISE* dengan multiplier untuk audit dadakan.

**Approval audit:** audit yang diajukan auditor masuk antrean **review**. Admin/Kepala Divisi menyetujui agar skor masuk perhitungan.

---

## 4. Kompetisi & Skor

- **Hitung ulang skor:** Menu Kompetisi → **Recompute** (atau otomatis setelah audit disetujui). Leaderboard ter-update realtime.
- **Bobot formula** (default): Audit 45%, Before/After 18%, Inovasi 9%, Konsistensi 8%, Surprise 10%, Lingkungan 10%.
- **Bonus:** OKR 100% (+8), QCC selesai (+15), konsistensi tidak turun (+5).
- **Sertifikat juara** — bisa dicetak dari menu KPI/OKR atau Annual Award.

---

## 5. Dashboard & Laporan

- **Dashboard Eksekutif** — ringkasan, heatmap, tren, gap analysis, statistik individu.
- **Menu Laporan:**
  - **Export Excel** — rekap skor, audit, perbaikan.
  - **Cetak PDF** — via dialog cetak browser (pilih "Simpan sebagai PDF").
- **Digest mingguan** terkirim otomatis via email ke pimpinan (jika SMTP aktif).

---

## 6. Modul ISO (Admin 5S)

**Menu Standar ISO.**
- Kelola pemetaan **klausul** ISO 9001 / 14001 / 45001.
- **Tag** perbaikan/audit ke klausul (multi-tag).
- **Dashboard compliance** per standar + **readiness** sertifikasi.
- **Non-Conformity (NC)** — catat & pantau temuan ketidaksesuaian.
- **Evidence Package** — ekspor bukti per klausul untuk auditor eksternal.

---

## 7. Modul PROPER KLHK (Admin 5S)

**Menu PROPER** (untuk industri dengan kewajiban lingkungan).
- **Dashboard traffic-light** — peringkat Emas/Hijau/Biru/Merah/Hitam.
- **Neraca lingkungan** — input data B3, non-B3, air, energi.
- **Izin lingkungan** — pantau masa berlaku; notifikasi otomatis menjelang kedaluwarsa.
- **Evidence & RKL-RPL** — kelola bukti, cetak laporan RKL-RPL.
- **Export SIMPEL** — format untuk pelaporan ke KLHK.

---

## 8. Notifikasi & Integrasi

Fitur ini aktif **otomatis bila kredensial diisi** di `.env` (lihat [Deployment](DEPLOYMENT.md)):
- **Email (SMTP)** — reminder audit, digest, NC.
- **Push (FCM)** — notifikasi ke HP (perlu registrasi token perangkat).
- **WhatsApp** — opsional (stub; aktif saat `WA_API_URL`/`WA_API_TOKEN` diisi).
- **Penyimpanan foto (Supabase Storage)** — kompresi otomatis.

Bila kredensial belum diisi, fitur dilewati dengan aman (di-log, tidak error).

---

## 9. Checklist Onboarding Perusahaan Baru

- [ ] Buat Perusahaan → Plant → Departemen → Divisi (set kategori) → Area
- [ ] Import / buat pengguna + tetapkan peran & penempatan
- [ ] Buat periode audit aktif + template checklist 5 pilar
- [ ] Buat jadwal audit (atau aktifkan scheduler)
- [ ] (Opsional) Setup klausul ISO & kriteria PROPER
- [ ] Uji 1 siklus: audit → setujui → recompute → cek leaderboard
- [ ] Pastikan SMTP/Storage aktif (cek log saat start)
