# Checklist UAT (User Acceptance Testing)

Skenario uji terima oleh **end-user nyata** sebelum go-live. Setiap skenario diuji oleh peran terkait; centang **Lulus/Gagal** + catat temuan.

**Lingkungan UAT:** _________________  **Tanggal:** ________  **Penguji:** ________

> Akun demo (ganti dengan akun UAT asli): superadmin / admin5s / auditor / kepala.produksi / pic @5s-enterprise.com — `Admin1234`

---

## A. Autentikasi & Akses (semua peran)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| A1 | Login dengan kredensial benar | Masuk ke dashboard | ☐ | |
| A2 | Login dengan password salah | Ditolak, pesan jelas | ☐ | |
| A3 | Ganti kata sandi | Berhasil, login ulang dgn pw baru | ☐ | |
| A4 | Logout | Kembali ke halaman login | ☐ | |
| A5 | Tiap peran hanya lihat menu yang relevan | Menu sesuai peran | ☐ | |

## B. Audit 5S (Auditor + Kepala Divisi)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| B1 | Auditor mulai audit terjadwal | Status → Berjalan | ☐ | |
| B2 | Isi skor 5 pilar + foto temuan | Tersimpan, skor terhitung | ☐ | |
| B3 | Ajukan verifikasi | Status → Menunggu Review | ☐ | |
| B4 | Kepala/Admin review & setujui | Status → Disetujui | ☐ | |
| B5 | Audit offline (matikan koneksi saat isi) | Tersimpan & sinkron saat online | ☐ | |
| B6 | Auditor TIDAK bisa setujui auditnya sendiri | Aksi tidak tersedia | ☐ | |

## C. Before/After (PIC + Kepala Divisi)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| C1 | PIC buat perbaikan + foto Before | Dokumen dibuat, kode BA-otomatis | ☐ | |
| C2 | Upload foto After + ajukan | Status → Menunggu Verifikasi | ☐ | |
| C3 | Kepala verifikasi & tutup | Status → Selesai, bonus poin | ☐ | |
| C4 | Minta revisi dengan alasan | Dikembalikan ke PIC | ☐ | |
| C5 | Tandai Best Practice | Muncul di Best Practice Library | ☐ | |

## D. Kompetisi & Leaderboard (semua)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| D1 | Buka leaderboard | Podium + tabel + delta tampil | ☐ | |
| D2 | Setujui audit baru → leaderboard update | Berubah realtime tanpa refresh | ☐ | |
| D3 | Filter per kategori (Produksi/Kantor/Gudang) | Tabel terfilter | ☐ | |
| D4 | Hitungan mundur periode | Tampil & akurat | ☐ | |

## E. KPI/OKR & QCC (Kepala Divisi + PIC)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| E1 | Perbarui status Key Result | Tersimpan, progress update | ☐ | |
| E2 | OKR 100% → bonus ke skor divisi | Skor naik setelah recompute | ☐ | |
| E3 | Buat proyek QCC, geser tahap PDCA | Kartu pindah kolom | ☐ | |
| E4 | Usulkan Kaizen + vote | Tersimpan, vote bertambah | ☐ | |

## F. Dashboard, Laporan, Gamifikasi (Admin + Kepala)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| F1 | Dashboard: heatmap, tren, KPI | Data akurat sesuai periode | ☐ | |
| F2 | Export Excel laporan | File ter-unduh, isi benar | ☐ | |
| F3 | Cetak PDF (sertifikat/laporan) | Tampilan cetak rapi | ☐ | |
| F4 | Badge otomatis muncul | Sesuai pencapaian | ☐ | |
| F5 | Digital Twin: upload denah + pin | Pin tersimpan di koordinat | ☐ | |

## G. Admin: Master Data & ISO/PROPER (Admin 5S)

| # | Skenario | Hasil diharapkan | Lulus | Catatan |
|---|---|---|:---:|---|
| G1 | Buat divisi & area baru | Tersimpan, muncul di pilihan | ☐ | |
| G2 | Import pengguna via Excel | User terbuat sesuai template | ☐ | |
| G3 | Tag perbaikan ke klausul ISO | Compliance dashboard update | ☐ | |
| G4 | Input neraca lingkungan PROPER | Dashboard traffic-light update | ☐ | |
| G5 | Izin lingkungan mendekati kedaluwarsa | Notifikasi muncul | ☐ | |

---

## Ringkasan & Persetujuan

- Total skenario: **34** · Lulus: ____ · Gagal: ____
- Temuan kritis (blocker go-live): _______________________________________
- Temuan minor (boleh menyusul): ________________________________________

| Peran | Nama | Tanda tangan | Tanggal |
|---|---|---|---|
| Perwakilan pengguna | | | |
| Admin 5S | | | |
| Penanggung jawab proyek | | | |

☐ **Disetujui untuk Go-Live**  ☐ Perlu perbaikan dulu
