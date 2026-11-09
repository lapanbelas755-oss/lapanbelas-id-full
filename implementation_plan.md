# AUDIT KETAHANAN SISTEM 5 TAHUN (5-YEAR SYSTEM RELIABILITY & LONGEVITY PLAN)
**Proyek:** 18Studio (lapanbelas-id)  
**Target:** 2026 – 2031+ (Bebas Error, Bebas Bug, Bebas Memory Leak / Hang)

---

## 1. HASIL AUDIT MENYELURUH & POTENSI MASALAH JANGKA PANJANG (5 TAHUN)

Setelah audit menyeluruh pada seluruh layer (Frontend React 19, Backend Express `server.js`, dan Database Supabase PostgreSQL), ditemukan beberapa potensi kritis yang bisa menyebabkan error, hang, atau crash dalam rentang 5 tahun ke depan:

### [POTENSI 1] Kebocoran Memori (Memory Leak) di Server Node.js
- **Lokasi:** `server.js` (`driveThumbCache`, `driveFolderCache`, `inMemoryPushSubscriptions`).
- **Masalah:** Cache thumbnail foto Drive dan folder disimpan dalam `Map()` global tanpa batas kuota maksimal (max entries) dan tanpa proses pembersihan otomatis (eviction/pruning). Dalam 5 tahun operasional dengan ratusan acara dan puluhan ribu foto klien, memory cache ini akan terus membengkak dan menyebabkan crash `JavaScript heap out of memory`.
- **Solusi:**
  - Terapkan mekanisme auto-eviction LRU (batasi maksimal 3.000–5.000 thumbnail).
  - Tambahkan interval rutin (tiap 15 menit) untuk membuang entri cache yang sudah melewati masa kadaluarsa (`expiresAt`).
  - Batasi `inMemoryPushSubscriptions` maksimal 1.000 entri.

### [POTENSI 2] Risiko Server Hang & Crash Mendadak (Ketiadaan Process Global Trap)
- **Lokasi:** `server.js` (tidak ada listener `process.on('uncaughtException')` dan `process.on('unhandledRejection')`).
- **Masalah:** Jika terjadi galat jaringan pada timer background (pengingat H+1, ucapan anniversary, WA blast) atau jika API pihak ketiga (Google Drive, Nodemailer, DOKU, Kirimi) terputus tiba-tiba tanpa tertangkap try-catch lokal, proses Node.js akan langsung mati (crash) dan aplikasi tidak bisa dibuka.
- **Solusi:**
  - Tambahkan global handler `process.on('uncaughtException')` dan `process.on('unhandledRejection')` dengan structured logging agar server tetap hidup stabil tanpa mati mendadak.

### [POTENSI 3] Risiko Request Menggantung (Hang) pada Generator PDFKit & Download Drive
- **Lokasi:** `server.js` (`generateInvoicePDF`, `generateFittingPDF`, `generateDecorPDF`, `fetchDriveFolderFilesCached`, dan streaming download `api/drive-download/:fileId`).
- **Masalah:** PDFKit membuat streaming buffer namun tidak memiliki listener `doc.on('error', reject)`. Jika ada karakter font rusak atau gambar tidak valid, Promise tidak pernah selesai (menggantung selamanya), menyebabkan koneksi HTTP server terkunci. Selain itu, pemanggilan `axios` pada listing Drive dan download file tidak memiliki konfigurasi batas waktu (timeout).
- **Solusi:**
  - Pasang `doc.on('error', reject)` di ketiga fungsi generator PDF.
  - Tambahkan batas waktu `timeout: 10000` (10 detik) pada listing Drive dan `timeout: 60000` (60 detik) pada stream download file.

### [POTENSI 4] Layar Putih Kosong (Blank White Screen) di Sisi Klien & Kru
- **Lokasi:** `src/main.jsx` (Aplikasi Klien), `src/crew.jsx` (Portal Kru), `src/booking.jsx` (Fast Booking), `src/client-portal.jsx` (Pilih Foto).
- **Masalah:** Saat ini hanya `src/admin.jsx` yang memiliki `ErrorBoundary`. Jika salah satu halaman klien atau kru mengalami data tidak terduga atau format null dari API, React 18/19 akan mencopot seluruh komponen tampilan dan memunculkan layar putih kosong (blank screen) tanpa opsi muat ulang.
- **Solusi:**
  - Pasang `ErrorBoundary` terpadu dengan desain RevenuePulse / Lapanbelas yang ramah pengguna, dilengkapi tombol `🔄 Muat Ulang Halaman` di `main.jsx`, `crew.jsx`, `booking.jsx`, dan `client-portal.jsx`.

### [POTENSI 5] Filter Tahun Terkunci di 2027 (Kadaluarsa untuk 5 Tahun ke Depan)
- **Lokasi:** `src/admin/tabs/AssignComponent.jsx` (baris 884–887).
- **Masalah:** Opsi dropdown filter tahun diketik manual hanya sampai 2027 (`<option value="2027">2027</option>`). Pada tahun 2028, 2029, 2030, dan 2031, admin tidak akan bisa memfilter data tugas dokumentasi.
- **Solusi:**
  - Ubah dropdown tahun menjadi dinamis dari tahun 2024 hingga `tahun_berjalan + 3` atau berdasarkan data tahun riil yang ada di database.

### [POTENSI 6] Batas 1.000 Baris Supabase & Potensi DOM Freeze di Dashboard Admin
- **Lokasi:** `src/admin/tabs/AppointmentComponent.jsx`.
- **Masalah:** Supabase PostgREST secara baku membatasi kueri maksimal 1.000 baris. Saat pesanan mencapai ribuan dalam 5 tahun, query tanpa paginasi akan memotong pesanan lama. Selain itu, me-render 3.000–5.000 baris tabel HTML sekaligus dalam satu waktu akan membuat browser admin terasa berat atau macet (freeze).
- **Solusi:**
  - Terapkan paginasi tabel (misal 50–100 data per halaman dengan tombol navigasi Halaman Sebelumnya / Berikutnya) agar performa browser admin tetap ringan 60fps meskipun database berisi puluhan ribu data.

### [POTENSI 7] Test Suite Out-of-Sync dengan Keamanan PIN Kru
- **Lokasi:** `src/tests/system_audit_e2e.js`.
- **Masalah:** Hasil tes audit otomatis menunjukkan 53 PASSED | 1 FAILED pada `Crew Login for Thariq`. Ini terjadi karena tes masih menguji alur login lama tanpa PIN, padahal sistem keamanan PIN 4-digit sudah diaktifkan resmi di database.
- **Solusi:**
  - Perbarui tes agar memvalidasi respon PIN challenge (`require_pin: true`) dan uji otentikasi PIN yang benar sehingga hasil audit otomatis menjadi 100% PASSED (54/54).

---

## 2. TAHAPAN EKSEKUSI (STEP-BY-STEP WORKFLOW)

- [x] **Tahap 1:** Perbaiki tes `src/tests/system_audit_e2e.js` agar mengenali PIN challenge dan pastikan lulus 100% (54/54 PASS).
- [x] **Tahap 2:** Perbaiki kebocoran memori cache di `server.js` (auto-prune LRU pada `driveThumbCache`, `driveFolderCache`, dan `inMemoryPushSubscriptions`).
- [x] **Tahap 3:** Pasang global error trap (`uncaughtException`, `unhandledRejection`) dan PDFKit error handlers di `server.js` agar server kebal hang/crash.
- [x] **Tahap 4:** Pasang `ErrorBoundary` di `src/main.jsx`, `src/crew.jsx`, `src/booking.jsx`, dan `src/client-portal.jsx` untuk eliminasi risiko layar putih kosong.
- [x] **Tahap 5:** Buat filter tahun dinamis di `src/admin/tabs/AssignComponent.jsx` agar siap dipakai hingga 2031+.
- [x] **Tahap 6:** Tambahkan kontrol paginasi pada tabel `AppointmentComponent.jsx` untuk menjaga performa DOM render tetap ringan selamanya.
- [x] **Tahap 7:** Uji build final (`npm run build`) dan full E2E audit (`npm test`), pastikan 0 error dan 100% lulus.
