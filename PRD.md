# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Nama Produk:** SIMORAWA (Sistem Informasi Manajemen Program Kerja HIMA)  
**Klien / Mitra:** Himpunan Mahasiswa Informatika (HIMA) - Universitas Internasional Semen Indonesia (UISI)  
**Platform:** Aplikasi Web Responsif (Desktop & Mobile Browser)  
**Status Dokumen:** Draft Inisiasi (Rebuild / Pengembangan Ulang dari Awal)  

---

## 1. Ringkasan Eksekutif & Latar Belakang (Product Overview)
### 1.1 Latar Belakang Masalah
Himpunan Mahasiswa Informatika (HIMA) UISI mengelola berbagai program kerja (proker) di setiap periode kepengurusan. Saat ini, operasional manajemen proker masih berjalan secara terpisah dan manual:
1. **Pencatatan & Administrasi Tersebar:** Data proker dan anggaran dicatat di Google Sheets/Excel, sedangkan dokumen seperti KAK (Kerangka Acuan Kegiatan) dan LPJ (Laporan Pertanggungjawaban) tersebar di Google Drive masing-masing pengurus.
2. **Koordinasi Tidak Terpusat:** Pemantauan progres kegiatan hanya dilakukan lewat grup WhatsApp, sehingga sulit dilacak dan menyebabkan banyak PIC (*Person In Charge*) terlambat mengumpulkan berkas.
3. **Birokrasi Anggaran Lambat:** Proses pengajuan dana (KAK/RKA) dan pencairan kas memakan waktu lama karena alur persetujuan manual.
4. **Tidak Ada Pengingat Otomatis:** Sering terjadi keterlambatan pengajuan KAK atau persiapan acara karena ketiadaan pengingat otomatis pada H-30 sebelum tenggat waktu (*deadline*).
5. **Evaluasi Tidak Terstandarisasi:** Setiap Kepala Divisi (Kadiv) menyusun laporan evaluasi dalam format PPT masing-masing tanpa indikator penilaian (KPI/KPA) yang baku.

### 1.2 Tujuan Produk (Product Goals)
Membangun **SIMORAWA**, sebuah platform berbasis web terpusat yang mengintegrasikan manajemen program kerja, pengajuan anggaran & kas, pelaporan progres, notifikasi pengingat otomatis, serta evaluasi berbasis KPI/KPA dalam satu ekosistem digital yang transparan dan aman.

---

## 2. Target Pengguna & Hak Akses (User Personas & RBAC)
Sistem menerapkan *Role-Based Access Control* (RBAC) dengan 6 peran pengguna utama:

| Peran (Role) | Deskripsi Pengguna | Hak Akses Utama (Permissions) |
| :--- | :--- | :--- |
| **1. Admin** | Pengelola teknis sistem | • Akses penuh ke seluruh modul (Superuser).<br>• Mengelola data pengguna (Tambah, Edit, Nonaktifkan/Aktifkan, Ubah Role). |
| **2. BPH (Badan Pengurus Harian)** | Ketua, Wakil Ketua, Sekum, Bendum | • Melihat Dashboard Monitoring Proker & Keuangan.<br>• Menyetujui (*Approve*) atau menolak (*Reject*) pengajuan anggaran proker.<br>• Melihat dan menilai hasil evaluasi proker di Dashboard Evaluasi Terpusat. |
| **3. Kepala Divisi (Kadiv)** | Koordinator departemen/divisi | • Membuat, mengedit, dan menghapus data Program Kerja.<br>• Menunjuk PIC untuk setiap proker dan mengatur *deadline*.<br>• Mengajukan anggaran proker (KAK/RKA).<br>• Mengisi formulir evaluasi proker berbasis KPI/KPA. |
| **4. PIC / Staff** | Penanggung jawab pelaksana proker | • Melihat daftar dan detail proker yang ditugaskan.<br>• Mengubah status proker secara *real-time*.<br>• Mengunduh *template* KAK dan mengunggah dokumen pendukung (KAK, LPJ, bukti).<br>• Mengirim laporan progres kegiatan beserta kendalanya. |
| **5. Bendahara** | Pengelola keuangan organisasi | • Mengelola pengajuan anggaran dan memantau realisasi per proker.<br>• Mengelola posisi saldo Kas organisasi (mencatat transaksi pemasukan & pengeluaran).<br>• Mengelola dan mengekspor laporan keuangan & LPJ. |
| **6. Sekretaris** | Pengelola administrasi & arsip | • Mengelola *template* dokumen KAK digital standar.<br>• Memverifikasi kelengkapan dokumen proker & LPJ.<br>• Mengekspor laporan monitoring, evaluasi, dan LPJ ke format PDF/Excel. |

---

## 3. Ruang Lingkup Produk (Product Scope)
### 3.1 Cakupan Fitur (In-Scope)
* Autentikasi pengguna dan manajemen akun berbasis peran (RBAC).
* Manajemen siklus hidup Program Kerja (CRUD, penugasan PIC, pembaruan status).
* Manajemen dokumen (unduh *template* KAK dan unggah berkas PDF/dokumen kegiatan).
* Pelaporan progres kegiatan secara berkala oleh PIC.
* Evaluasi program kerja berbasis indikator KPI/KPA (skor 1–5) dan rekapitulasi BPH.
* Sistem pengingat otomatis (H-30, H-14, H-7) melalui *in-app notification* dan email institusi UISI.
* Manajemen keuangan (pengajuan rincian anggaran proker, persetujuan anggaran, dan pencatatan mutasi kas organisasi).
* Pembuatan LPJ otomatis dari data proker & realisasi anggaran, serta fitur ekspor ke PDF dan Excel (`.xlsx`).

### 3.2 Di Luar Cakupan (Out-of-Scope)
* Integrasi langsung dengan sistem perbankan atau sistem keuangan internal rektorat/kampus UISI.
* Pengembangan aplikasi *mobile native* (Android/iOS).
* Pengiriman notifikasi melalui WhatsApp Gateway.
* Fitur rekomendasi berbasis kecerdasan buatan (*AI Recommendation*).

---

## 4. Kebutuhan Fungsional & User Stories (Functional Requirements)

### Modul 1: Autentikasi & Manajemen Pengguna
* **FR-01 (Login & Logout):** Pengguna dapat masuk menggunakan email dan *password* yang terdaftar serta keluar dari sesi aktif.
* **FR-02 (Kelola Pengguna):** Admin dapat melihat daftar pengguna, menambah akun baru, mengubah profil/peran, serta mengaktifkan/menonaktifkan status pengguna.
* **FR-03 (Pembatasan Akses / RBAC):** Sistem menyembunyikan menu navigasi dan memblokir *endpoint* API yang tidak sesuai dengan peran pengguna. Akun berstatus "Nonaktif" ditolak saat mencoba login.

### Modul 2: Manajemen Program Kerja & Dokumen
* **FR-04 (CRUD Program Kerja):** Kadiv dapat membuat proker baru (Nama, Deskripsi, PIC, Deadline, dan Rincian Awal Anggaran), mengubah detailnya, serta menghapus proker.
* **FR-05 (Daftar & Detail Proker):** Seluruh pengguna dapat melihat tabel daftar proker dan membuka halaman detail proker (berisi info utama, rincian anggaran, tabel laporan progres, dan tabel dokumen).
* **FR-06 (Update Status Real-Time):** Kadiv dan PIC dapat memperbarui status proker secara langsung menjadi: `NOT_STARTED` (Belum Mulai), `IN_PROGRESS` (Berjalan), `ON_HOLD` (Ditunda), atau `COMPLETED` (Selesai).
* **FR-07 (Penugasan PIC):** Kadiv dapat memilih anggota/staff sebagai PIC pada saat pembuatan maupun pengeditan proker.
* **FR-08 (Manajemen Dokumen & Template KAK):** Pengguna dapat mengunduh *template* KAK standar (FR-21) dan PIC/Sekretaris dapat mengunggah file dokumen pendukung (KAK, LPJ, Surat) dalam format PDF.
* **FR-22 (Laporan Progres):** PIC dapat menambahkan laporan progres pada detail proker yang berisi persentase capaian ($0\%$ – $100\%$), deskripsi progres, dan kendala di lapangan.

### Modul 3: Evaluasi Program Kerja
* **FR-09 (Form Evaluasi KPI/KPA):** Kadiv dapat membuat evaluasi untuk proker yang telah selesai, memilih evaluator, dan menambahkan indikator penilaian dinamis (Nama Indikator, Target, Realisasi, serta Skor bintang $1$–$5$). Evaluasi dapat disimpan sebagai `draft` atau `submitted` (dilengkapi Kesimpulan & Rekomendasi).
* **FR-10 & FR-11 (Dashboard & Ringkasan Evaluasi):** BPH dan Kadiv dapat melihat kartu statistik evaluasi (Total Evaluasi, Submitted, Draft, Rata-rata Skor) beserta daftar nilai seluruh proker.
* **FR-12 (Riwayat Evaluasi):** Data evaluasi tersimpan permanen di basis data sebagai arsip dan referensi untuk kepengurusan periode berikutnya.

### Modul 4: Monitoring & Notifikasi Otomatis
* **FR-13 & FR-14 (Notifikasi H-30 Proker & KAK):** Sistem menjalankan pengecekan terjadwal (*cron job* harian) untuk menghitung selisih tanggal hari ini dengan *deadline* proker/pengajuan KAK. Jika memasuki H-30 (serta H-14 dan H-7), sistem otomatis membuat notifikasi pengingat untuk PIC dan Kadiv terkait.
* **FR-15 (Integrasi Panel In-App & Email UISI):** Notifikasi ditampilkan pada ikon lonceng di *topbar* (dengan *badge* merah jumlah pesan belum dibaca dan fitur *mark as read*) serta dikirimkan ke alamat email institusi UISI pengguna melalui protokol SMTP.
* **FR-16 (Dashboard Monitoring Utama):** Menampilkan ringkasan statistik Program Kerja (Total, Aktif, Selesai, Ditunda) dan ringkasan Anggaran (Total Pengajuan, Total Nilai Rupiah, Disetujui, Draft).

### Modul 5: Manajemen Keuangan & Pelaporan
* **FR-17 (Pengajuan & Persetujuan Anggaran):** Kadiv/Bendahara dapat membuat pengajuan anggaran proker beserta rincian itemnya (Nama Item, Qty, Satuan, Harga Satuan, Total Otomatis). Status anggaran meliputi `draft`, `submitted`, `approved`, dan `rejected`. BPH/Admin memiliki tombol aksi untuk menyetujui atau menolak anggaran yang berstatus `submitted`.
* **FR-18 & FR-19 (Realisasi Anggaran & Posisi Kas):** Sistem menampilkan total saldo Kas organisasi saat ini. Bendahara dapat mencatat mutasi kas (`pemasukan` atau `pengeluaran`) beserta nominal dan keterangannya, yang otomatis memperbarui saldo kas.
* **FR-20 (Generate LPJ Otomatis):** Sistem menyusun halaman ringkasan LPJ pada detail proker secara otomatis dengan menggabungkan informasi proker, laporan progres, dan rincian realisasi anggaran.
* **FR-23 (Ekspor Laporan PDF & Excel):** Pengguna berwenang (Sekretaris/Bendahara/Admin) dapat mengekspor tabel Program Kerja, Evaluasi, dan Keuangan ke file Excel (`.xlsx`), serta mengunduh dokumen LPJ dalam format PDF.

---

## 5. Arsitektur Data / Skema Database
Basis data menggunakan RDBMS (**MariaDB / MySQL** atau **PostgreSQL**) dengan 11 entitas utama:

1. **`users`**: `id` (UUID/PK), `email` (Unique), `password` (Bcrypt Hash), `name`, `role` (`ADMIN`, `BPH`, `KADIV`, `PIC`, `BENDAHARA`, `SEKRETARIS`), `is_active` (Boolean), `created_at`, `updated_at`.
2. **`work_programs`**: `id` (PK), `name`, `description`, `status` (`NOT_STARTED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`), `pic_id` (FK -> `users.id`), `deadline` (Date/Datetime), `created_at`, `updated_at`, `deleted_at` (Nullable, untuk *soft delete*).
3. **`documents`**: `id` (PK), `work_program_id` (FK -> `work_programs.id` ON DELETE CASCADE), `uploaded_by` (FK -> `users.id`), `type` (`VARCHAR(100)` — misal: `KAK`, `LPJ`, `LAINNYA` atau MIME type), `file_name`, `file_path`, `file_size`, `created_at`.
4. **`progress_reports`**: `id` (PK), `work_program_id` (FK -> `work_programs.id` ON DELETE CASCADE), `submitted_by` (FK -> `users.id`), `progress_pct` (Int $0$–$100$), `description`, `obstacles`, `submitted_at`.
5. **`budgets`**: `id` (PK), `work_program_id` (FK -> `work_programs.id` ON DELETE CASCADE), `submitted_by` (FK -> `users.id`), `status` (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`), `total_amount` (Decimal/BigInt), `notes`, `created_at`, `updated_at`.
6. **`budget_items`**: `id` (PK), `budget_id` (FK -> `budgets.id` ON DELETE CASCADE), `item_name`, `quantity` (Int), `unit` (`VARCHAR(50)`), `unit_price` (Decimal/BigInt), `total_price` (Decimal/BigInt).
7. **`kas`**: `id` (PK), `balance` (Decimal/BigInt), `updated_at`.
8. **`kas_transactions`**: `id` (PK), `kas_id` (FK -> `kas.id`), `budget_id` (FK Nullable -> `budgets.id` ON DELETE SET NULL), `type` (`PEMASUKAN`, `PENGELUARAN`), `amount` (Decimal/BigInt), `description`, `transaction_date`, `created_by` (FK -> `users.id`).
9. **`evaluations`**: `id` (PK), `work_program_id` (FK -> `work_programs.id` ON DELETE CASCADE), `evaluated_by` (FK -> `users.id`), `kesimpulan` (Text), `rekomendasi` (Text), `status` (`DRAFT`, `SUBMITTED`), `created_at`, `updated_at`.
10. **`evaluation_indicators`**: `id` (PK), `evaluation_id` (FK -> `evaluations.id` ON DELETE CASCADE), `indicator_name`, `target`, `realisasi`, `score` (Int $1$–$5$), `notes`.
11. **`notifications`**: `id` (PK), `user_id` (FK -> `users.id` ON DELETE CASCADE), `type`, `title`, `message`, `link`, `is_read` (Boolean), `created_at`.

---

## 6. Panduan Desain Antarmuka (UI/UX Guidelines)
* **Palet Warna (Color Palette):**
  * *Primary Dark Navy:* `#112D4E` (Digunakan untuk Sidebar dan teks *heading* utama).
  * *Primary Accent Blue:* `#3F72AF` (Digunakan untuk tombol aksi utama/primer, *active menu state*, dan aksen gradien).
  * *Border & Neutral Light:* `#DBE2EF` (Digunakan untuk garis batas tabel, *card border*, dan pemisah).
  * *Background Off-White:* `#F9F7F7` (Digunakan untuk latar belakang konten utama dan *topbar*).
* **Tipografi:** `Segoe UI`, `system-ui`, `-apple-system`, `sans-serif`.
* **Tata Letak (Layout):**
  * **Halaman Login:** *Split-screen layout* (Kiri: Branding SIMORAWA dengan latar gradien biru `#112D4E` ke `#3F72AF`; Kanan: Form input Email & Password minimalis).
  * **Halaman Utama:** Navigasi *Sidebar* tetap di sebelah kiri, *Topbar* di bagian atas (memuat *breadcrumb*, ikon lonceng notifikasi, dan menu profil pengguna), serta area konten dinamis dengan komponen tabel berbaris belang (*striped table*) dan *card* statistik.

---

## 7. Kebutuhan Non-Fungsional & Rekomendasi Tech Stack
### 7.1 Kebutuhan Non-Fungsional (NFR)
* **Performance (NFR-01):** Waktu respons API dan pemuatan halaman utama maksimal $\le 3$ detik.
* **Security (NFR-02):** Kata sandi wajib minimal 12 karakter, di-*hash* menggunakan `bcrypt`, autentikasi berbasis token JWT (*JSON Web Token*), dan proteksi rute di *frontend* maupun *backend* (RBAC).
* **Usability & Compatibility (NFR-03 & NFR-05):** Desain responsif yang berjalan lancar di peramban modern (Chrome, Edge, Firefox) baik di layar desktop maupun *smartphone*.
* **Maintainability (NFR-06):** Kode sumber terstruktur secara modular (misalnya dengan arsitektur *Domain-Driven Design* atau *Clean Architecture*) agar mudah dipelihara.

### 7.2 Spesifikasi Tech Stack (Acuan Pengembangan)
*(Catatan: Kelompokmu bebas menggunakan stack yang sama dengan tim sebelumnya atau menyesuaikannya dengan keahlian tim kalian saat ini)*
* **Frontend:** Vue.js 3 (Vite) + Ant Design Vue *(atau React/Next.js + Ant Design / Tailwind CSS)*.
* **Backend:** NestJS dengan TypeScript *(atau Express.js / Laravel)*.
* **Database:** MariaDB / MySQL.
* **Library Pendukung:**
  * *Export Excel:* `exceljs` atau `xlsx` (SheetJS).
  * *Export PDF:* `pdfmake`, `jspdf` + `jspdf-autotable`, atau *server-side rendering* dengan `puppeteer` / `dompdf`.
  * *Task Scheduler (Notifikasi H-30):* `@nestjs/schedule` (Cron) + `nodemailer` (SMTP Email).

---

## 8. Catatan Kritis: Pencegahan Bug Lama (Mitigation Plan)
Karena proyek ini dibuat ulang berdasarkan evaluasi sistem terdahulu, **3 isu mayor (Major Defects)** yang menyebabkan kegagalan UAT pada proyek sebelumnya **wajib dicegah sejak tahap perancangan awal**:

1. **Pencegahan Bug Hapus Program Kerja (Eks UAT-19 - Error "cannot update"):**
   * **Akar Masalah Lama:** Kegagalan menghapus baris di tabel `work_programs` karena terhalang *Foreign Key Constraint* dari tabel anak (`budgets`, `documents`, `evaluations`, `progress_reports`), atau kesalahan query *soft-delete*.
   * **Solusi di Proyek Baru:** Gunakan pengaturan `ON DELETE CASCADE` pada seluruh *foreign key* yang mengarah ke `work_programs.id`, atau terapkan mekanisme *Soft Delete* (kolom `deleted_at`) secara konsisten di ORM (TypeORM/Prisma).
2. **Pencegahan Bug Upload Dokumen PDF (Eks UAT-22 - Error "Data truncated for column 'type'"):**
   * **Akar Masalah Lama:** Kolom `type` pada tabel `documents` didefinisikan terlalu pendek atau berupa `ENUM` yang tidak cocok dengan nilai yang dikirim *frontend* (misalnya *frontend* mengirim string `"application/pdf"` sepanjang 15 karakter ke kolom yang hanya menerima `'KAK'`/`'LPJ'`).
   * **Solusi di Proyek Baru:** Definisikan kolom `type` pada tabel `documents` sebagai `VARCHAR(100)` dan pastikan validasi *dto/payload* antara *frontend* dan *backend* seragam. Gunakan *middleware* `Multer` dengan batas ukuran file yang jelas (misal maksimal 10 MB khusus `.pdf`).
3. **Pencegahan Bug Export LPJ ke PDF (Eks UAT-39 - Halaman PDF Rusak):**
   * **Akar Masalah Lama:** *Library* pembuat PDF gagal me-*render* komponen HTML/CSS secara langsung atau gagal menarik relasi data LPJ yang belum lengkap.
   * **Solusi di Proyek Baru:** Jangan mencetak halaman web mentah ke PDF. Buat *layout template* khusus untuk dokumen LPJ menggunakan `jspdf-autotable` atau `pdfmake` yang menyusun tabel secara terprogram dari objek JSON data proker, anggaran, dan laporan progres.

---

## 9. Rencana Tahapan Pengembangan (Development Roadmap)
Pengembangan dibagi ke dalam 4 tahap (*Sprint*) selama satu semester:

* **Fase 1 (Sprint 1 - Minggu 1–2): Fondasi & Modul Inti**
  * Setup repositori Git, skema *database*, autentikasi JWT, RBAC, CRUD Pengguna, CRUD Program Kerja, dan Dashboard statistik dasar.
* **Fase 2 (Sprint 2 - Minggu 3–4): Dokumen, Progres & Evaluasi**
  * Fitur unggah dokumen PDF (beserta *template* KAK), pencatatan laporan progres PIC, serta modul Evaluasi KPI/KPA dan Dashboard BPH.
* **Fase 3 (Sprint 3 - Minggu 5–6): Keuangan, Notifikasi & Pelaporan**
  * Modul pengajuan & *approval* anggaran, manajemen saldo & mutasi Kas, *cron job* notifikasi H-30 (*in-app* & SMTP email), tampilan LPJ otomatis, serta fitur ekspor PDF dan Excel.
* **Fase 4 (Minggu 7–8): Pengujian (UAT) & Finalisasi Dokumen**
  * Pengujian *Black Box* bersama perwakilan HIMA UISI (memastikan 44 *test case* lulus $100\%$ tanpa *Major Defect*) dan penyusunan laporan akhir.