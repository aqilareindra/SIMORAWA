<div align="center">

# 🏛️ SIMORAWA
### Sistem Informasi Manajemen Program Kerja HIMA IF UISI

[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Ant Design Vue](https://img.shields.io/badge/Ant_Design_Vue-4.x-0170FE?style=for-the-badge&logo=antdesign&logoColor=white)](https://antdv.com/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-5.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Platform terpadu berbasis web untuk mendigitalisasi perencanaan, pemantauan progres, tata kelola dokumen, otomatisasi buku kas, dan evaluasi KPI/KPA program kerja Himpunan Mahasiswa Teknik Informatika Universitas Internasional Semen Indonesia (HIMA IF UISI).**

[Fitur Utama](#-fitur-unggulan--modul-sistem) •
[Arsitektur & Database](#-arsitektur--skema-database) •
[Matriks RBAC](#-matriks-hak-akses-rbac-6-role) •
[Instalasi](#-panduan-instalasi--menjalankan-proyek) •
[Dokumentasi API](#-ringkasan-endpoint-api)

</div>

---

## 📖 Latar Belakang & Tujuan Proyek

Pengelolaan program kerja organisasi kemahasiswaan sering kali menghadapi kendala fragmentasi data: dokumen Kerangka Acuan Kerja (KAK) dan Laporan Pertanggungjawaban (LPJ) yang tercecer, ketidaksinkronan antara persetujuan anggaran dengan saldo kas riil, serta sulitnya melacak evaluasi kinerja (KPI/KPA) untuk kepengurusan periode berikutnya.

**SIMORAWA** hadir sebagai solusi *Enterprise Resource Planning* (ERP) skala organisasi mahasiswa yang mengintegrasikan seluruh siklus hidup program kerja ke dalam satu ekosistem **Monorepo Full-Stack**. Selain memenuhi seluruh kebutuhan fungsional (FR-01 s/d FR-22), sistem ini juga dirancang dengan arsitektur *fault-tolerant* yang memitigasi berbagai celah kritikal pada pengujian UAT periode sebelumnya.

---

## ✨ Fitur Unggulan & Modul Sistem

### 1. 🔐 Autentikasi JWT & Manajemen Pengguna Terpusat
* **Split-Screen Modern Login:** Antarmuka autentikasi responsif dengan proteksi rute berbasis *Navigation Guard* dan *Axios Interceptor*.
* **Manajemen Siklus Akun:** Admin dapat membuat pengguna baru (validasi *password* kuat minimal 12 karakter), mengubah peran (*role*), serta mengaktifkan/menonaktifkan akses akun secara instan tanpa merusak integritas riwayat data.

### 2. 📅 Manajemen Program Kerja & Pelacakan Progres Real-Time
* **Siklus Status Proker:** Pelacakan status dari `NOT_STARTED` (Belum Mulai), `IN_PROGRESS` (Berjalan), `ON_HOLD` (Ditunda), hingga `COMPLETED` (Selesai).
* **Pelaporan Progres PIC:** Pembaruan persentase capaian (`0% - 100%`) lengkap dengan pencatatan kendala lapangan (*obstacles*) dan otomatisasi perubahan status proker saat capaian menyentuh `100%`.
* **Penyusunan Anggaran Awal Terintegrasi:** Pembuatan rincian item anggaran langsung sejak fase inisiasi program kerja.

### 3. 📄 Tata Kelola Dokumen PDF & Master Template KAK
* **Pusat Unduhan Template KAK:** Sekretaris dapat memperbarui dokumen *Master Template KAK* standar yang dapat langsung diunduh oleh seluruh PIC dan Kepala Divisi.
* **Repositori Dokumen Proker:** Unggah dan unduh dokumen kegiatan (`KAK`, `LPJ`, `SURAT`, `LAINNYA`) dengan validasi ketat khusus format `.pdf` (maksimal 10 MB).

### 4. 💰 Manajemen Anggaran & Otomatisasi Buku Kas HIMA
* **Alur Persetujuan Berjenjang:** Pengajuan anggaran dari status `DRAFT` $\rightarrow$ `PENDING` $\rightarrow$ `APPROVED` / `REJECTED` disertai catatan *review*.
* **Otomatisasi Pemotongan Saldo Kas (*Atomic Transaction*):** Saat anggaran disetujui (`APPROVED`) oleh Bendahara/BPH, sistem secara otomatis memvalidasi kecukupan saldo, memotong saldo utama Kas HIMA, dan mencatat mutasi pengeluaran (`EXPENSE`) di buku kas dalam satu transaksi database (`prisma.$transaction`) yang *idempotent*.
* **Pencatatan Mutasi Kas Manual:** Mendukung pencatatan pemasukan (`INCOME` seperti iuran/dana kemahasiswaan) dan pengeluaran non-proker.

### 5. ⭐ Evaluasi KPI/KPA Dinamis & Rekomendasi Kepengurusan
* **Indikator Kinerja Dinamis:** Penilaian berbasis multi-indikator (`Target` vs `Realisasi`) dengan sistem *rating* bintang (`1 - 5`) dan kalkulasi rata-rata skor otomatis (*live preview*).
* **Arsip Evaluasi Berkelanjutan:** Penyimpanan kesimpulan dan rekomendasi terstruktur (`DRAFT` maupun `SUBMITTED`) sebagai bahan evaluasi kepengurusan periode selanjutnya.

### 6. 📊 Dashboard Monitoring Eksekutif, Notifikasi & Export Laporan
* **Executive Summary Dashboard:** Visualisasi KPI utama, distribusi status proker, perbandingan arus kas, daftar *upcoming deadlines*, dan aktivitas terbaru dalam satu layar.
* **Notifikasi In-App & Trigger Email:** Lonceng notifikasi *real-time* di *topbar* dengan penanda *unread badge* serta dukungan *non-blocking email notification* (SMTP) pada setiap kejadian penting (*assignment* PIC, pengajuan/approval anggaran, dan *submit* evaluasi).
* **Export Laporan Resmi:** Ekspor rekapitulasi anggaran & mutasi buku kas ke format **Excel (`.xlsx`)** serta cetak laporan resmi Evaluasi KPI/KPA ke format **PDF (`.pdf`)**.

---

## 🛡️ Mitigasi Bug Eks-UAT & Aturan Bisnis Kritikal

SIMORAWA mengimplementasikan pengamanan arsitektur khusus untuk memastikan stabilitas data:

| Kode Mitigasi | Masalah pada Sistem Lama | Solusi Arsitektur di SIMORAWA |
| :--- | :--- | :--- |
| **Eks UAT-19** | Gagal menghapus Program Kerja yang sudah memiliki rincian anggaran atau laporan karena *Foreign Key Constraint Error*. | Penerapan relasi `onDelete: Cascade` pada level skema Prisma (`schema.prisma`) untuk seluruh tabel anak (`budgets`, `budget_items`, `documents`, `progress_reports`, `evaluations`), sehingga *Hard Delete* berjalan bersih. |
| **Eks UAT-22** | *Error* saat mengunggah dokumen PDF karena kolom kategori dokumen tertukar dengan *MIME Type* (`application/pdf`). | Pemisahan tegas pada tabel `documents`: kolom `type` khusus menyimpan enum kategori bisnis (`KAK`, `LPJ`, `SURAT`, `TEMPLATE_KAK`, `LAINNYA`), sedangkan `mimeType` menyimpan `application/pdf` dari Multer. |
| **Kas Sync Bug** | Saldo Kas HIMA tidak berkurang otomatis saat anggaran proker disetujui atau terpotong dua kali (*double deduction*). | Eksekusi *approval* dibungkus dalam `prisma.$transaction` dengan pengecekan *state* (`status !== 'APPROVED'`), validasi kecukupan `kas.balance >= budget.totalAmount`, pemotongan saldo otomatis, dan pembuatan `KasTransaction`. |

---

## 👥 Matriks Hak Akses (RBAC 6 Role)

Sistem menerapkan *Role-Based Access Control* berlapis menggunakan `JwtAuthGuard` & `RolesGuard` di sisi *Backend* serta *Route Meta Guard* & *Dynamic Sidebar* di sisi *Frontend*:

| Modul / Fitur | `ADMIN` | `BPH` | `KADIV` | `PIC` | `BENDAHARA` | `SEKRETARIS` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard Monitoring Eksekutif** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Kelola Pengguna (CRUD & Aktif/Nonaktif)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Buat, Edit & Hapus Program Kerja** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Update Status Proker & Laporan Progres** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Upload / Update Master Template KAK** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Upload & Download Dokumen Proker (PDF)** | ✅ | 👀 | ✅ | ✅ | 👀 | ✅ |
| **Buat & Ajukan Rincian Anggaran Proker** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Approve / Reject Anggaran (Potong Kas)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Kelola Transaksi Kas Manual & Export Excel** | ✅ | 👀 | 👀 | ❌ | ✅ | 👀 |
| **Input Evaluasi KPI/KPA & Export PDF** | ✅ | ✅ | ✅ | 👀 | ❌ | 👀 |

> **Keterangan:** ✅ = Akses Penuh (*Create/Read/Update/Delete/Action*) | 👀 = Akses Baca/Pantau & Unduh (*Read-Only*) | ❌ = Tidak Memiliki Akses.

---

## 🏗️ Arsitektur & Skema Database

### Struktur Direktori Monorepo
```text
SIMORAWA/
├── backend/                        # REST API Server (NestJS 10 + Prisma + MySQL)
│   ├── prisma/
│   │   ├── schema.prisma           # Definisi 11 tabel & relasi database
│   │   └── seed.ts                 # Seeder 6 akun default & saldo awal Kas HIMA
│   ├── uploads/                    # Penyimpanan lokal dokumen PDF & Template KAK
│   └── src/
│       ├── auth/                   # Strategi JWT, Login, & Profil User
│       ├── common/                 # Guards (JwtAuth, Roles) & Custom Decorators
│       ├── users/                  # Modul manajemen pengguna (Admin Only)
│       ├── work-programs/          # Modul CRUD proker & update status real-time
│       ├── documents/              # Modul upload/download PDF & Template KAK
│       ├── progress-reports/       # Modul laporan capaian & kendala lapangan PIC
│       ├── evaluations/            # Modul KPI/KPA, indikator dinamis & export PDF
│       ├── budgets/                # Modul pengajuan, approval anggaran & export Excel
│       ├── kas/                    # Modul buku kas utama & riwayat mutasi
│       ├── dashboard/              # Modul agregasi statistik eksekutif
│       └── notifications/          # Modul notifikasi in-app & trigger email SMTP
│
├── frontend/                       # Single Page Application (Vue 3 + Vite + Ant Design Vue)
│   └── src/
│       ├── components/             # Komponen UI reusable & modal form
│       ├── layouts/                # MainLayout (Sidebar Navy #112D4E & Topbar Notifikasi)
│       ├── router/                 # Konfigurasi Vue Router & RBAC Navigation Guard
│       ├── services/               # Konfigurasi Axios Instance & Interceptors
│       ├── stores/                 # State management Pinia (Auth & Session)
│       ├── types/                  # Definisi interface TypeScript
│       └── views/                  # Halaman utama (Login, Dashboard, Proker, Evaluasi, Keuangan, Users)
│
├── docs/                           # Dokumentasi analisis & artefak proyek
├── AGENTS.md                       # Konvensi arsitektur & panduan teknis
├── PRD.md                          # Product Requirements Document (FR-01 s/d FR-22)
├── todo.md                         # Tracker penyelesaian fase pengembangan
└── README.md                       # Dokumentasi utama repositori
```

### 11 Tabel Entitas Database (`schema.prisma`)
1. **`users`**: Menyimpan data kredensial, peran (`Role` enum), dan status aktif pengurus.
2. **`work_programs`**: Menyimpan entitas utama program kerja, *deadline*, status, dan relasi ke PIC.
3. **`documents`**: Menyimpan metadata file PDF kegiatan dan *Master Template KAK*.
4. **`progress_reports`**: Menyimpan riwayat persentase progres (`0-100%`) dan kendala lapangan.
5. **`budgets`**: Menyimpan *header* pengajuan anggaran proker, total nominal, dan status *approval*.
6. **`budget_items`**: Menyimpan rincian item pengeluaran per anggaran (`quantity`, `unit`, `unitPrice`, `totalPrice`).
7. **`kas`**: Menyimpan saldo utama Kas HIMA IF UISI saat ini (`balance`).
8. **`kas_transactions`**: Menyimpan buku besar mutasi kas masuk (`INCOME`) dan keluar (`EXPENSE`).
9. **`evaluations`**: Menyimpan *header* evaluasi program kerja, kesimpulan, rekomendasi, dan status.
10. **`evaluation_indicators`**: Menyimpan rincian indikator KPI/KPA, target, realisasi, dan skor bintang (`1-5`).
11. **`notifications`**: Menyimpan antrean pesan notifikasi *in-app* per pengguna beserta status baca (`isRead`).

---

## 🎨 Sistem Desain Antarmuka (UI/UX Palette)

Antarmuka SIMORAWA dibangun di atas komponen **Ant Design Vue** dengan kustomisasi tema warna korporat HIMA IF UISI:
* **Primary Dark Navy (`#112D4E`):** Latar belakang *Sidebar* navigasi utama, *header* laporan, dan tipografi penekanan utama.
* **Primary Accent Blue (`#3F72AF`):** Warna tombol aksi utama (*Primary CTA*), menu aktif, *progress bar*, dan aksen gradien *Split-Screen Login*.
* **Soft Steel Blue (`#DBE2EF`):** Warna garis pembatas (*border*) tabel *striped*, garis pemisah *topbar*, dan latar *badge* sekunder.
* **Clean Off-White (`#F9F7F7`):** Warna latar belakang kanvas halaman kerja yang nyaman di mata untuk penggunaan jangka panjang.

---

## ⚙️ Panduan Instalasi & Menjalankan Proyek

### 1. Prasyarat Sistem
Pastikan lingkungan pengembangan lokal Anda telah terinstal:
* **Node.js** `v18.x` atau `v20.x` (LTS)
* **MySQL** `v8.0+` atau **MariaDB** `v10.6+` (via XAMPP / Laragon / MySQL Workbench)
* **Git**

### 2. Clone Repositori
```bash
git clone [https://github.com/username/SIMORAWA.git](https://github.com/username/SIMORAWA.git)
cd SIMORAWA
```

### 3. Konfigurasi & Jalankan Backend (`/backend`)
```bash
cd backend
npm install
```
Buat file `.env` di dalam folder `backend/` (atau salin dari `.env.example`) dan sesuaikan konfigurasi berikut:
```env
# Konfigurasi Database MySQL Lokal
DATABASE_URL="mysql://root:@localhost:3306/simorawa_db"

# Konfigurasi Server & JWT
PORT=3000
JWT_SECRET="simorawa-himaif-uisi-super-secret-jwt-key-2026"
JWT_EXPIRES_IN="1d"

# Konfigurasi Opsional SMTP Email (Non-blocking jika dikosongkan)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="SIMORAWA HIMA IF UISI <noreply@uisi.ac.id>"
```
Jalankan migrasi skema Prisma, *generate client*, dan isi data awal (*seeder*):
```bash
npx prisma generate
npx prisma migrate dev --name init_simorawa
npx prisma db seed
```
Nyalakan server *development* Backend:
```bash
npm run start:dev
```
> Server Backend akan berjalan di **`http://localhost:3000/api`**.

### 4. Konfigurasi & Jalankan Frontend (`/frontend`)
Buka terminal baru, lalu masuk ke direktori `frontend/`:
```bash
cd frontend
npm install
```
*(Opsional)* Pastikan file `.env` di dalam folder `frontend/` mengarah ke URL Backend:
```env
VITE_API_URL="http://localhost:3000/api"
```
Nyalakan server *development* Vite:
```bash
npm run dev
```
> Buka browser dan akses aplikasi di **`http://localhost:5173`**.

---

## 🔑 Akun Pengujian Default (Database Seeder)

Setelah menjalankan perintah `npx prisma db seed`, database otomatis terisi dengan **Saldo Awal Kas HIMA sebesar Rp 15.000.000** serta **6 akun pengguna aktif** berikut:

| Peran (Role) | Email Login | Password Default | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@uisi.ac.id` | `Simorawa2026!` | Akses penuh seluruh modul & kelola pengguna |
| **BPH** | `bph@uisi.ac.id` | `Simorawa2026!` | Monitoring eksekutif, approval anggaran & evaluasi |
| **KADIV** | `kadiv@uisi.ac.id` | `Simorawa2026!` | CRUD Program Kerja, ajukan anggaran & input evaluasi |
| **PIC** | `pic@uisi.ac.id` | `Simorawa2026!` | Update status/progres proker & unggah dokumen PDF |
| **BENDAHARA** | `bendahara@uisi.ac.id` | `Simorawa2026!` | Approval anggaran (potong kas), mutasi kas & export Excel |
| **SEKRETARIS** | `sekretaris@uisi.ac.id` | `Simorawa2026!` | Unggah Master Template KAK & kelola arsip dokumen |

---

## 🔌 Ringkasan Endpoint API

Seluruh *endpoint* berada di bawah *global prefix* `/api` dan dilindungi oleh *Bearer Token JWT* (kecuali `/api/auth/login`):

* **Auth & Users:**
  * `POST /api/auth/login` — Autentikasi pengguna & pembuatan JWT.
  * `GET /api/auth/me` — Mengambil profil sesi pengguna aktif.
  * `GET | POST | PATCH /api/users` — Manajemen pengguna & pengaktifan status akun (`ADMIN`).
* **Program Kerja & Progres:**
  * `GET | POST | PATCH | DELETE /api/work-programs` — CRUD Program Kerja & *hard delete cascade*.
  * `PATCH /api/work-programs/:id/status` — Pembaruan status proker secara *real-time*.
  * `GET | POST /api/work-programs/:id/progress` — Riwayat & penambahan laporan progres PIC.
* **Dokumen & Template KAK:**
  * `GET | POST /api/documents/template-kak` — Unduh & perbarui *Master Template KAK* (`.pdf`).
  * `POST /api/documents/upload` — Unggah dokumen kegiatan proker (`.pdf`).
  * `GET /api/documents/:id/download` — *Streaming* unduhan file PDF.
* **Evaluasi KPI/KPA:**
  * `GET /api/evaluations/summary` — Statistik kartu ringkasan evaluasi.
  * `GET | POST | PATCH | DELETE /api/evaluations` — CRUD evaluasi beserta indikator dinamis.
  * `GET /api/evaluations/export/pdf` — Unduh laporan resmi Evaluasi KPI/KPA dalam format PDF.
* **Anggaran & Buku Kas:**
  * `GET | POST | PATCH /api/budgets` — Pengelolaan rincian anggaran program kerja.
  * `PATCH /api/budgets/:id/review` — Persetujuan/penolakan anggaran & pemotongan Kas otomatis.
  * `GET | POST /api/kas` — Informasi saldo Kas HIMA & pencatatan transaksi kas manual.
  * `GET /api/budgets/export/excel` — Ekspor rekapitulasi anggaran dan mutasi kas ke Excel.
* **Dashboard & Notifikasi:**
  * `GET /api/dashboard/summary` — Agregasi metrik utama untuk *Dashboard Monitoring*.
  * `GET | PATCH /api/notifications` — Daftar notifikasi pengguna & penandaan status baca.

---
