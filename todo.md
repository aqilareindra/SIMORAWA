# SIMORAWA Development Roadmap & Task Checklist

> **Aturan Pengerjaan:** Jangan menandai pekerjaan (`[x]`) sebagai selesai jika belum benar-benar diimplementasikan dan diuji.

## Fase 1: Fondasi, Auth, RBAC & Modul Inti
- [x] **1.1 Setup Monorepo & Database:** Inisialisasi `/backend` (NestJS + Prisma) dan `/frontend` (Vue 3 Vite + Ant Design Vue + Pinia + Vue Router). Jalankan `npx prisma validate` terlebih dahulu, dan hanya jalankan `npx prisma migrate dev` setelah konfigurasi `.env` diverifikasi dan disetujui user.
- [x] **1.2 Database Seeder (`backend/prisma/seed.ts`):**
  - Buat 6 akun dummy (`admin@uisi.ac.id`, `bph@uisi.ac.id`, `kadiv@uisi.ac.id`, `pic@uisi.ac.id`, `bendahara@uisi.ac.id`, `sekretaris@uisi.ac.id`) dengan password `Simorawa2026!` (hash bcrypt, >=12 karakter).
  - Buat 1 record awal di tabel `kas` dengan `balance: 15000000` (Rp 15.000.000).
- [x] **1.3 Backend Auth & Users (FR-01, FR-02, FR-03):**
  - Endpoint Login JWT, pengecekan `isActive`, dan `@Roles()` guard.
  - CRUD Users khusus role `ADMIN` (validasi password min 12 karakter).
- [x] **1.4 Frontend Layout & Auth:**
  - Halaman Login Split-Screen (Gradien `#112D4E` ke `#3F72AF`).
  - Main Layout (Sidebar `#112D4E`, Topbar `#F9F7F7`, filter menu sidebar sesuai Role).
  - Halaman Kelola Pengguna untuk `ADMIN`.
- [x] **1.5 CRUD Program Kerja (FR-04, FR-05, FR-06, FR-07):**
  - Backend & Frontend CRUD `work_programs` + rincian anggaran awal.
  - Fitur ubah status real-time (`NOT_STARTED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`) oleh `KADIV` & `PIC`.
  - Pastikan hapus proker berjalan mulus dengan `ON DELETE CASCADE` (UAT-19 Fix).

## Fase 2: Dokumen, Progres & Evaluasi KPI/KPA
- [x] **2.1 Manajemen Dokumen & Template KAK (FR-08, FR-21):**
  - Upload & download Master Template KAK oleh `SEKRETARIS` (`workProgramId = null`).
  - Upload dokumen pendukung PDF (KAK, LPJ, Surat) pada detail proker oleh `PIC` & `SEKRETARIS` (Multer max 10MB, simpan kategori di `type` dan MIME di `mimeType` - UAT-22 Fix).
- [x] **2.2 Laporan Progres PIC (FR-22):**
  - Form tambah progres (0-100%, deskripsi, kendala) oleh `PIC` di halaman Detail Proker.
- [x] **2.3 Evaluasi KPI/KPA & Dashboard Evaluasi (FR-09, FR-10, FR-11, FR-12):**
  - Form Evaluasi dinamis (tambah/hapus baris indikator, skor bintang 1-5, simpan sebagai `DRAFT` atau `SUBMITTED`) oleh `KADIV`.
  - Dashboard Evaluasi Terpusat untuk `BPH` & `KADIV` (Kartu statistik: Total Evaluasi, Submitted, Draft, Rata-rata Skor).

## Fase 3: Keuangan, Pemotongan Kas Otomatis, Notifikasi & Export
- [x] **3.1 Pengajuan & Approval Anggaran + Potong Kas Otomatis (FR-17, FR-18, FR-19):**
  - Form pengajuan anggaran + dynamic `budget_items` (auto-calculate total) oleh `KADIV`/`BENDAHARA`.
  - Tombol Approve/Reject untuk `BPH`/`ADMIN`.
  - **Transaksi Otomatis:** Saat `APPROVED`, otomatis kurangi `kas.balance` dan catat di `kas_transactions` (`PENGELUARAN`).
  - Halaman Manajemen Kas untuk `BENDAHARA` (input mutasi manual `PEMASUKAN` / `PENGELUARAN` di luar anggaran proker).
- [ ] **3.2 Dashboard Monitoring Utama (FR-16):**
  - Statistik Proker (Total, Aktif, Selesai, Ditunda) & Statistik Anggaran (Total Pengajuan, Total Nilai Rupiah, Approved, Draft).
- [ ] **3.3 Cron Job Notifikasi H-30 & SMTP Email (FR-13, FR-14, FR-15):**
  - Scheduler harian mengecek proker dengan deadline H-30, H-14, dan H-7.
  - Buat notifikasi in-app (muncul di ikon lonceng Topbar + fitur mark as read) & kirim email via `nodemailer` + tambahkan endpoint manual trigger `/api/notifications/trigger-check` untuk keperluan demo UAT.
- [ ] **3.4 Generate LPJ Otomatis & Export PDF/Excel (FR-20, FR-23):**
  - Tab Ringkasan LPJ Otomatis di halaman Detail Proker.
  - Export LPJ ke PDF menggunakan `jspdf` + `jspdf-autotable` (UAT-39 Fix).
  - Export tabel Proker, Evaluasi, dan Keuangan ke `.xlsx` untuk `SEKRETARIS`, `BENDAHARA`, dan `ADMIN`.
