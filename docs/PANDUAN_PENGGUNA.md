# Panduan Pengguna — Software Manajemen 5S/5R Enterprise

Panduan untuk pengguna harian: **Auditor, Kepala Divisi, PIC, dan Anggota**.
(Untuk pengaturan sistem & master data, lihat [Panduan Admin](PANDUAN_ADMIN.md).)

---

## 1. Masuk (Login) & Akun

1. Buka alamat aplikasi (mis. `https://5s.perusahaan.co.id`).
2. Masukkan **email** dan **kata sandi** yang diberikan admin.
3. Klik **Masuk**.

**Ganti kata sandi pertama kali:** menu kanan atas → **Profil** → **Ubah Kata Sandi**. Gunakan kata sandi minimal 8 karakter dengan huruf besar, kecil, dan angka.

**Lupa kata sandi?** Hubungi admin 5S perusahaan Anda untuk reset.

### Peran (role) & yang bisa Anda akses
| Peran | Akses utama |
|---|---|
| **Auditor** | Melakukan audit 5S, mengisi skor, foto temuan |
| **Kepala Divisi** | Memantau skor divisi, menyetujui Before/After, kelola OKR/KPI divisi |
| **PIC** | Membuat & menindaklanjuti Before/After (perbaikan) |
| **Anggota** | Melihat leaderboard, badge, papan informasi |

> Anda hanya melihat data yang relevan dengan peran Anda. Auditor melihat audit miliknya, Kepala Divisi melihat data divisinya.

---

## 2. Dashboard

Halaman pertama setelah login. Menampilkan:
- **Skor rata-rata perusahaan** + tren naik/turun vs periode lalu.
- **Heatmap area** — warna hijau (≥85), kuning (70–84), merah (<70).
- **Pencapaian KPI & OKR**.
- **Widget notifikasi** — audit terlambat, perbaikan jatuh tempo.

---

## 3. Audit 5S (untuk Auditor)

Alur audit dari awal sampai disetujui:

```
DIJADWALKAN → MULAI → ISI SKOR → AJUKAN → DIREVIEW → DISETUJUI
```

1. **Menu Audit 5S** → tab **Jadwal Saya** → pilih audit berstatus *Dijadwalkan*.
2. Klik **Mulai Audit**.
3. Isi skor tiap item checklist **5 pilar** (Ringkas, Rapi, Resik, Rawat, Rajin), skala **1–5**.
4. Tambahkan **foto temuan** dan **catatan** bila perlu (klik ikon kamera pada item).
5. Klik **Ajukan Verifikasi**. Skor dihitung otomatis.
6. Kepala Divisi / Admin akan **mereview** lalu **menyetujui**. Setelah disetujui, skor masuk ke perhitungan kompetisi.

> **Audit Surprise** (dadakan) memiliki *multiplier* lebih tinggi — pengaruhnya ke skor kompetisi lebih besar.

**Mode offline (PWA):** bila sinyal hilang saat audit di lapangan, data tersimpan di perangkat dan otomatis ter-sinkron saat online kembali. Pastikan membuka aplikasi kembali dalam kondisi online untuk sinkronisasi.

---

## 4. Before / After — Perbaikan (untuk PIC & Kepala Divisi)

Mendokumentasikan perbaikan dengan bukti foto sebelum & sesudah.

1. **Menu Before & After** → **+ Perbaikan Baru**.
2. Isi: area, kategori masalah, deskripsi, **foto BEFORE**, target tanggal.
3. Setelah perbaikan dilakukan, buka dokumen → **foto AFTER** + tindakan yang dilakukan → **Ajukan Verifikasi**.
4. Kepala Divisi / Admin **memverifikasi**:
   - **Verifikasi & Tutup** → perbaikan selesai, dapat **bonus poin**.
   - **Minta Revisi** / **Tolak** → dikembalikan dengan alasan.
5. Perbaikan yang selesai bisa di-**Escalate ke QCC** (jika butuh proyek lanjutan) atau ditandai **Best Practice**.

Kode dokumen otomatis: `BA-2026-PRD-0001`.

---

## 5. Kompetisi & Leaderboard

- **Menu Kompetisi** — peringkat divisi **realtime** (otomatis ter-update tanpa refresh).
- Podium 3 besar + tabel lengkap, dengan **delta** (naik/turun vs periode lalu).
- Filter per **kategori**: Produksi, Kantor, Gudang.
- **Hitungan mundur** ke akhir periode.

Skor kompetisi = gabungan: Audit (45%), Before/After (18%), Inovasi (9%), Konsistensi (8%), Surprise (10%), Lingkungan (10%) + bonus (OKR, QCC, konsistensi).

---

## 6. Gamifikasi

- **Badge** — lencana otomatis: *Pejuang 5S* (≥5 audit), *Raja Perbaikan* (≥5 perbaikan selesai), *Inovator*, dll. Lihat koleksi Anda di tab **Badge**.
- **Wall of Fame** — divisi juara & galeri foto perbaikan terbaik.
- **Best Practice Library** — kumpulan perbaikan teladan untuk ditiru.
- **Annual Award** — penghargaan tahunan + sertifikat (bisa dicetak).

---

## 7. KPI / OKR (untuk Kepala Divisi)

- **Menu KPI/OKR** — pantau target divisi.
- **OKR**: Objective + Key Results; perbarui status KR (Belum / Berjalan / Tercapai).
- **KPI** per pilar 5S; isi nilai aktual vs target.
- OKR dengan **semua KR tercapai** memberi bonus poin ke skor kompetisi divisi.

---

## 8. QCC / Kaizen (untuk Kepala Divisi & PIC)

- **Proyek QCC** — papan **PDCA** (Plan-Do-Check-Act). Geser kartu sesuai tahap.
- **Tools**: Fishbone (sebab-akibat), Pareto, Control Chart.
- **Kaizen Register** — usulkan ide perbaikan, beri **vote**, ide populer bisa diadopsi.
- Proyek QCC selesai memberi bonus poin ke divisi.

---

## 9. Tips & Masalah Umum

| Masalah | Solusi |
|---|---|
| Tidak bisa login | Pastikan email benar; setelah 10x gagal, tunggu 15 menit (proteksi keamanan) |
| Foto tidak ter-upload | Pastikan file gambar (JPG/PNG) < 10 MB |
| Data audit offline belum muncul | Buka aplikasi dalam kondisi online, tunggu sinkronisasi |
| Tombol aksi tidak muncul | Aksi tergantung peran & status dokumen — cek peran Anda |
| Halaman tidak update | Tarik untuk refresh, atau muat ulang browser |

**Butuh bantuan?** Hubungi admin 5S perusahaan Anda.
