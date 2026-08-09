# CLAUDE.md
# Panduan AI & Aturan Proyek
# Lapanbelas ID Full App (Client Portal, Admin & Queue)

## Tentang Proyek

Proyek ini adalah sistem terpadu **Lapanbelas ID** yang mengelola Portal Klien, Admin Panel, Antrean, dan Layanan Fotografi/Studio dengan stack:

- **Frontend:** React + Vite (HTML/JSX Multi-page Setup)
- **Styling:** Tailwind CSS + PostCSS
- **Backend:** Node.js (Express - `server.js`)
- **Database:** SQLite / MySQL (`sql/` & helper scripts)
- **Build Tool:** Vite + Docker Deployment

Fitur Utama:
- Client Reservation Portal (`client-portal.jsx`)
- Admin Management System (`admin.jsx`)
- Queue / Antrean Display (`queue.jsx`)
- Review & Feedback System (`feedback.jsx`)
- Invoicing & Mock Payment

Sistem ini digunakan langsung oleh klien dan manajemen operasional. Kestabilan tampilan mobile, integritas database, dan alur pembayaran adalah prioritas utama.

---

# 1. Mandatory Analysis Before Coding

Sebelum mengubah SATU BARIS kode pun, AI WAJIB:
- Memahami struktur project dan file terkait.
- Membaca file utama yang akan diubah (`server.js`, `src/client-portal.jsx`, `src/admin.jsx`, dll.).
- Memahami alur data antara frontend (Vite/JSX) dan backend API (`server.js`).
- Mengidentifikasi dampak perubahan terhadap halaman/komponen lain.
- Menjelaskan rencana implementasi ringkas sebelum melakukan perubahan kode.

DILARANG langsung menulis kode tanpa analisis terlebih dahulu.

---

# 2. Root Cause Analysis

Jika menemukan bug:
JANGAN langsung menimpa kode asal-asalan.

WAJIB melakukan:
- Analisis source code dan komponen yang bermasalah.
- Analisis alur data API request/response.
- Analisis skema tabel pada folder `sql/` atau file helper DB (`get_schema.js`, `fix-db.js`).
- Analisis error log pada terminal/browser console.
- Mengidentifikasi penyebab utama (*root cause*).

Output Wajib:
- Penyebab bug.
- File & fungsi yang terdampak.
- Solusi teknis dan risiko perubahan.

Baru setelah itu mulai melakukan modifikasi kode.

---

# 3. Do No Harm & Clean Workspace

- DILARANG melakukan refactor total tanpa instruksi eksplisit.
- DILARANG membuat script temporary baru (misal: `test_fix_2.js`, `temp.jsx`) di root directory. Lakukan perbaikan langsung pada file inti.
- Jangan mengubah file HTML/JSX yang tidak berkaitan.
- Jangan menghapus fungsi backend/API lama sebelum memastikan tidak digunakan modul lain.
- Selalu jaga kompatibilitas antara endpoint API di `server.js` dan panggilannya di React/JSX.

---

# 4. Complete Code Only

Saat memberikan potongan kode perbaikan:
- DILARANG menggunakan placeholder seperti `// ... kode lain tetap sama ...`.
- Berikan file atau blok fungsi yang **LENGKAP**.
- Sertakan seluruh `import`, `export`, dan penanganan `state`/`props`.
- Kode harus siap di-copy-paste dan langsung berjalan tanpa error sintaks.

---

# 5. Mobile & UI Mandates (Client App & Portal)

Aplikasi klien difokuskan untuk tampilan seluler (Mobile Web / PWA). WAJIB mematuhi aturan layout berikut:

1. **Lock Viewport & Nonaktifkan Bounce/Elastic Effect:**
   Gunakan CSS Global di `src/index.css` untuk mengunci viewport agar tidak bisa ditarik melayang:
   ```css
   html, body {
     position: fixed;
     width: 100vw;
     height: 100dvh;
     overflow: hidden;
     touch-action: none;
     overscroll-behavior: none;
   }

   #root, main, .app-container {
     width: 100%;
     height: 100dvh;
     overflow-x: hidden;
     overflow-y: auto;
     touch-action: pan-y;
     overscroll-behavior-y: contain;
     -webkit-overflow-scrolling: touch;
   }

   Navigasi Murni via Button:

DILARANG mengaktifkan gestur swipe/slide horizontal tangan untuk berpindah halaman.

Perpindahan antar tab/menu HANYA boleh terjadi saat user menekan Bottom Navigation Bar.

Modal Dialog Handling:

Seluruh modal form (Admin/Client) WAJIB memiliki max-h-[85vh], overflow-y-auto, dan Sticky Footer (bottom-0) agar tombol aksi tidak terpotong.

6. Database & API Rules
Semua query database di server.js harus sesuai dengan skema tabel resmi di folder sql/.

Validasi semua input dari request body (req.body) sebelum mengeksekusi query.

Gunakan try-catch block pada seluruh async Route Handler Express.

Selalu kembalikan HTTP Status Code yang tepat (200, 400, 404, 500) beserta JSON response bertipe konsisten { success: boolean, message: string, data?: any }.

7. Error Handling & Logging
Semua operasi penting:

Database Query

File Upload / Asset Storage

Payment Hook / Invoice Processing

WAJIB memiliki:

try-catch

Error logging (console.error atau logger)

Pesan error user-friendly di UI

Fallback state jika data gagal dimuat (misal: loading spinner / empty state)

Tidak boleh ada silent error yang menyebabkan aplikasi crash atau blank screen.

8. Testing & Verification Rules
Setelah coding, WAJIB memastikan:
✅ Sintaks JS/JSX valid (bebas syntax error).

✅ Build Vite berjalan lancar (npm run build).

✅ Tidak ada broken import atau missing dependency.

✅ Halaman Admin, Client Portal, dan Queue tetap terhubung dengan API backend.

✅ Bug telah teruji dan diselesaikan hingga tuntas.

9. AI Working Principles
Sebagai AI Assistant:

Berpikir dan analisis sebelum menulis kode.

Selesaikan masalah sampai ke akar, bukan memberikan solusi sementara.

Mengutamakan kerapian file, kestabilan UI mobile, dan konsistensi data backend.

Jika ada hal yang meragukan mengenai struktur database atau endpoint API, lakukan analisis isi file terlebih dahulu daripada menebak-nebak.