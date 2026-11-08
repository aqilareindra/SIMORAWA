# SIMORAWA - AI Coding Rules & Architecture Guidelines (Google Antigravity)

## 1. Tech Stack (LOCKED - DO NOT MIX)
- **Monorepo Structure:**
  - `/backend`: NestJS (TypeScript), Prisma ORM, MySQL/MariaDB, JWT Auth (`@nestjs/jwt`, `bcrypt`), `@nestjs/schedule` (Cron), `nodemailer`, `multer` (PDF upload).
  - `/frontend`: Vue 3 (Vite, `<script setup lang="ts">` Composition API), Pinia (State Management), Vue Router, Ant Design Vue (`ant-design-vue` v4), Axios, `jspdf` + `jspdf-autotable` (PDF Export), `xlsx` / `exceljs` (Excel Export).
- Do NOT change or replace any technology in this stack without explicit user approval.

## 2. UI/UX & Styling Tokens
- **Primary Dark Navy:** `#112D4E` (Sidebar background, main headings)
- **Primary Accent Blue:** `#3F72AF` (Primary buttons, active menu states, gradients)
- **Border & Neutral Light:** `#DBE2EF` (Table borders, card borders, dividers)
- **Background Off-White:** `#F9F7F7` (Main content background, topbar)
- **Typography:** `'Segoe UI', system-ui, -apple-system, sans-serif`
- **Layout:** Split-screen login page. Main app uses fixed left Sidebar, Topbar (with breadcrumb, notification bell + unread badge, profile menu), and striped tables.

## 3. Prisma Naming Convention (CRITICAL)
- Database tables and columns use `snake_case` via `@@map` and `@map`, while Prisma Client models and fields use `camelCase`.
- Always use Prisma Client `camelCase` field names in TypeScript backend code:
  - Use `user.isActive` (NOT `user.is_active`)
  - Use `workProgramId` (NOT `work_program_id`) and `mimeType` (NOT `mime_type`)
  - Use `budget.totalAmount` (NOT `budget.total_amount`) and `budgetId` (NOT `budget_id`)
  - Use model delegates: `prisma.user`, `prisma.workProgram`, `prisma.document`, `prisma.progressReport`, `prisma.budget`, `prisma.budgetItem`, `prisma.kas`, `prisma.kasTransaction`, `prisma.evaluation`, `prisma.evaluationIndicator`, `prisma.notification`.

## 4. Strict Business Logic & Bug Mitigation Rules (CRITICAL)
1. **NO SOFT DELETE ON WORK PROGRAMS (Mitigasi Eks UAT-19):**
   - Use strict **Hard Delete** with `ON DELETE CASCADE` on all foreign keys referencing `work_programs.id` (`documents`, `progress_reports`, `budgets`, `evaluations`).
   - Do NOT use `deleted_at` to avoid orphan data and Foreign Key constraint errors when deleting a Work Program.
2. **DOCUMENT UPLOAD VALIDATION (Mitigasi Eks UAT-22):**
   - In model `Document`, `type` (category: `KAK`, `LPJ`, `SURAT`, `TEMPLATE_KAK`, `LAINNYA`) and `mimeType` (`VARCHAR(100)`, e.g., `"application/pdf"`) must be handled cleanly.
   - `workProgramId` in `Document` is NULLABLE specifically so `SEKRETARIS` can upload a master `TEMPLATE_KAK` file without binding it to a specific work program.
   - Multer file limit: Max 10MB, `.pdf` only.
3. **PROGRAMMATIC PDF EXPORT (Mitigasi Eks UAT-39):**
   - NEVER use HTML-to-canvas/print screenshot for LPJ PDF export.
   - Always generate LPJ PDFs programmatically using `jspdf` and `jspdf-autotable` from clean JSON objects (Work Program details + Progress Reports + Budget Items).
4. **AUTOMATIC KAS DEDUCTION ON BUDGET APPROVAL:**
   - When `BPH` or `ADMIN` changes a Budget status from `SUBMITTED` to `APPROVED`:
     - Execute inside a **Prisma Database Transaction (`prisma.$transaction`)**.
     - Check if the Budget was not already `APPROVED` (prevent double deduction).
     - Automatically create a new record in `prisma.kasTransaction` with `type: 'PENGELUARAN'`, `amount: budget.totalAmount`, `budgetId: budget.id`, and description `"Pencairan Anggaran Proker: [Nama Proker]"`.
     - Automatically decrement `kas.balance` by `budget.totalAmount`.
5. **SECURITY & RBAC (NFR-02):**
   - Passwords MUST be validated to have a minimum of 12 characters and hashed with `bcrypt`.
   - Enforce RBAC both in NestJS (`@Roles(...)` Guard) and Vue Router navigation guards + sidebar menu visibility for all 6 roles: `ADMIN`, `BPH`, `KADIV`, `PIC`, `BENDAHARA`, `SEKRETARIS`.
   - Reject login if `user.isActive === false`.
