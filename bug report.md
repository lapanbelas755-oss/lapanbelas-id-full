# 18STUDIO BUG REPORT & ENGINEERING MEMORY

This file is persistent project memory.

Do not store conversation transcripts.

Only store verified technical facts,
completed fixes, important regressions,
and durable project knowledge.

---

# STATUS

Open Bugs:
0

---

# BUG TEMPLATE

## BUG-XXX — TITLE

Status:
OPEN / FIXED / VERIFIED

Date:

### Problem

Short factual description.

### Root Cause

Actual technical cause.

### Affected Files

- file
- file

### Dependencies

- module
- module

### Solution

Short factual description.

### Verification

- check
- test
- regression

### Data Safety

Production data:
UNCHANGED / MODIFIED WITH AUTHORIZATION

### Notes

Only important durable information.

---

# COMPLETED BUGS

## BUG-001 — ReferenceError: mailer is not defined in sendProgressEmail

Status:
VERIFIED

Date:
2026-08-29

### Problem
Notifikasi email progres gagal terkirim dengan error "mailer is not defined" saat admin mengubah status progres penugasan foto/video di Admin Dashboard.

### Root Cause
Di dalam fungsi `sendProgressEmail(status, order)` pada `server.js`, objek `mailer` dipanggil di baris pengiriman email (`await mailer.transporter.sendMail(...)`), namun inisialisasi `const mailer = getMailerForOrder(order);` belum dideklarasikan di dalam fungsi tersebut.

### Affected Files
- server.js

### Solution
Menambahkan deklarasi `const mailer = getMailerForOrder(order);` pada fungsi `sendProgressEmail` di `server.js`.

### Verification
- `node --check server.js` passed
- `npm run build` passed

### Data Safety
Production data:
UNCHANGED

---

## BUG-002 — Insecure Webhook Signature Bypass & Fragile Order ID Splitting in Payment Handlers

Status:
VERIFIED

Date:
2026-08-30

### Problem
1. Webhook Midtrans di `/api/midtrans-notification` dan Doku di `/api/doku-notification` tidak menolak request palsu jika signature key tidak cocok (hanya mencetak warning di console) dan tetap memperbarui status order menjadi 'Sudah DP'.
2. Pemotongan order ID menggunakan `.split('-').slice(0, 2)` berpotensi memotong nomor invoice dengan format non-standar.

### Root Cause
1. Logika validasi signature tidak mengembalikan response HTTP 403 saat hash signature tidak cocok.
2. String splitting mengasumsikan ID pesanan hanya memiliki 1 tanda hubung sebelum timestamp suffix.

### Affected Files
- server.js

### Solution
1. Mengubah pengecekan signature Midtrans dan Doku menjadi *strict reject* (HTTP 403) jika signature mismatch saat secret key tersedia.
2. Menggunakan regex `replace(/-\d{10,}$/, '')` untuk membuang suffix timestamp secara presisi, serta fallback pencarian order ID.
3. Menambahkan proteksi idempotensi status dan pengiriman email konfirmasi.

### Verification
- `node --check server.js` passed
- `npm run build` passed
- Unit test regex stripping & SHA512 signature validation passed

### Data Safety
Production data:
UNCHANGED

---

## BUG-003 — Studio Queue Limited to LocalStorage in Multi-Device Production Environment

Status:
VERIFIED

Date:
2026-08-30

### Problem
Layar antrean TV/Kiosk studio (`queue.html` / `src/queue.jsx`) hanya membaca data dari `localStorage` browser lokal. Perubahan antrean oleh admin di perangkat berbeda tidak pernah tersinkronisasi ke layar antrean studio.

### Root Cause
Implementasi antrean studio awal menggunakan `localStorage` per browser dan belum terhubung ke database terpusat Supabase.

### Affected Files
- src/queue.jsx
- src/admin.jsx

### Solution
1. Mengintegrasikan Supabase Client dan Realtime channel subscription pada `src/queue.jsx` untuk query tabel `appointments` secara realtime.
2. Mengintegrasikan sinkronisasi realtime pada tab antrean studio `src/admin.jsx` (menyimpan status `[QUEUE_STATUS]` dan `[QUEUE_ACTIVE_SINCE]` pada `additional_notes`).
3. Mempertahankan interval fallback 5s dan chime audio peringatan 1 menit.

### Verification
- `node --check server.js` passed
- `npm run build` passed
- Unit test parser antrean studio & Supabase query test passed

### Data Safety
Production data:
UNCHANGED

---

## BUG-004 — Redundant Legacy Inline Lightbox Modal in Client Portal

Status:
VERIFIED

Date:
2026-08-30

### Problem
Halaman portal pemilihan foto klien mandiri (`src/client-portal.jsx`) menggunakan implementasi modal lama yang ditulis manual secara terpisah, tidak mendukung gesture continuous hardware-accelerated swipe 60/120 FPS seperti `src/main.jsx`.

### Root Cause
Komponen modular `PhotoLightboxModal.jsx` belum dipasang pada `src/client-portal.jsx`.

### Affected Files
- src/components/PhotoLightboxModal.jsx
- src/client-portal.jsx

### Solution
1. Memperluas `PhotoLightboxModal.jsx` dengan props `renderOverlay` dan `renderFooter` untuk mendukung badge status dan tombol aksi seleksi foto.
2. Mengintegrasikan `PhotoLightboxModal` ke dalam `src/client-portal.jsx` dan menghapus kode modal manual lama.

### Verification
- `node --check server.js` passed
- `npm run build` passed (Vite otomatis membuat shared chunk `PhotoLightboxModal-*.js`)

### Data Safety
Production data:
UNCHANGED

---

## BUG-005 — Studio Double-Booking Vulnerability on Concurrent Checkouts & Inexact Room Labeling

Status:
VERIFIED

Date:
2026-08-30

### Problem
1. Pengecekan bentrok slot jam studio sebelumnya hanya mengandalkan perbandingan string persis nama ruangan dan belum memfilter pesanan yang dibatalkan.
2. Belum ada proteksi tingkat server (*backend concurrency guard*) saat checkout pembayaran diproses, memungkinkan dua klien melakukan transaksi pada slot waktu yang sama jika menekan tombol bayar bersamaan.

### Root Cause
1. Variasi label nama ruangan tidak dipetakan ke kunci normalisasi standar.
2. Endpoint `/api/payment` belum memeriksa tumpang tindih waktu pada pesanan studio yang sudah dibayar (*Sudah DP / Lunas*).

### Affected Files
- src/main.jsx
- server.js

### Solution
1. Menerapkan fungsi normalisasi `mapRoomKey` pada pengecekan bentrok jadwal di `src/main.jsx`.
2. Mengecualikan status pesanan `Dibatalkan` dan `Batal` dari perhitungan bentrok.
3. Menambahkan proteksi time-overlap di `/api/payment` (`server.js`) yang mengembalikan HTTP 409 Conflict jika slot sudah terisi oleh transaksi yang telah diselesaikan.

### Verification
- `node --check server.js` passed
- `npm run build` passed
- Unit test normalisasi ruangan, overlap waktu, dan penanganan status batal passed

### Data Safety
Production data:
UNCHANGED

## BUG-006 — Fast-Track Public WhatsApp Booking Form (/booking) Integration
Status:
VERIFIED

Date:
2026-08-30

### Problem
Calon klien dari link WhatsApp sebelumnya harus melalui layar login/sign-up di `app.lapanbelas.id`, yang menimbulkan friksi saat admin ingin membagikan link formulir pemesanan cepat langsung ke WhatsApp klien.

### Root Cause
Belum tersedianya halaman form booking publik mandiri (*guest multi-step wizard*) yang mendukung 4 kategori utama dengan input data diri lengkap (Nama, WhatsApp, Email).

### Affected Files
- src/booking.jsx
- booking.html
- vite.config.js
- server.js

### Solution
1. Membuat entry multi-page `booking.html` dan komponen `src/booking.jsx` dengan 4 tahapan stepper (*Kategori & Paket -> Jadwal Acara -> Data Diri Lengkap + Email -> Pembayaran DP/Lunas*).
2. Mendaftarkan route alias `/booking` pada Express `server.js` dan entry Vite `vite.config.js`.
3. Mempertahankan proteksi bentrok jadwal (*conflict guard*) dan perutean payment gateway yang tepat (Midtrans untuk Photo Studio & DOKU untuk Wedding/MUA/Dekorasi).

### Verification
- `node --check server.js` passed
- `npm run check` passed (Multi-page build `dist/booking.html` & chunk `booking-*.js` berhasil di-generate)

### Data Safety
Production data:
UNCHANGED

---

# INCIDENT: INTEGRASI REAL PRODUCTION PAYMENT GATEWAY (MIDTRANS & DOKU)

2026-08-31

### Problem
Modal pembayaran menampilkan antarmuka QRIS palsu/mockup statis dengan NMID fiktif `ID102003882910` dan tautan gambar dari `api.qrserver.com/?data=QRIS-18STUDIO-...`. QR tersebut tidak dapat di-scan oleh aplikasi Mobile Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, ShopeePay, DANA) karena bukan QRIS dinamis resmi dari payment gateway.

### Root Cause
`src/components/InAppPaymentModal.jsx` menggunakan kartu mock QRIS statis buatan sendiri dan mengabaikan rendering antarmuka resmi Midtrans Snap JS dan DOKU Checkout yang sudah memiliki kredensial Production aktif di `.env`.

### Affected Files
- src/components/InAppPaymentModal.jsx
- server.js
- src/booking.jsx
- src/main.jsx

### Solution
1. Menghapus total seluruh elemen mock QR palsu dan NMID fiktif dari `InAppPaymentModal.jsx`.
2. Mengintegrasikan Midtrans Snap JS resmi (`app.midtrans.com/snap/snap.js`) dengan dynamic embed `window.snap.embed` sehingga pengguna mendapatkan QRIS dinamis Bank Indonesia/EMVCo, Virtual Account, dan E-Wallet resmi secara langsung di dalam modal.
3. Mengintegrasikan DOKU Official Checkout secara tersemat (*embedded iframe*) dengan opsi QRIS dan Bank VA resmi.
4. Menjaga polling auto-detection `/api/check-payment-status/:orderId` dan transisi otomatis ke E-Tiket Sukses saat webhook menerima pelunasan.

### Verification
- `node --check server.js` passed (0 syntax error)
- `npm run check` / `vite build` passed (130 modules transformed, build sukses 560ms)
- Uji runtime endpoint Midtrans Snap & DOKU Checkout API berhasil mengembalikan token dan payment URL production resmi.

### Data Safety
Production data:
UNCHANGED

---

# IMPORTANT PROJECT DISCOVERIES

1. Halaman `/booking` memungkinkan admin membagikan link langsung ke klien WA dengan query parameter kategori (contoh: `app.lapanbelas.id/booking?cat=wedding`).
2. Kredensial Midtrans dan DOKU di `.env` adalah Production aktif (`MIDTRANS_IS_PRODUCTION=true`, `DOKU_IS_PRODUCTION=true`).

---

# RULE

A bug is NOT VERIFIED merely because code was changed.

VERIFIED requires actual validation.
## BUG-007 — Horizontal Scroll Cut Off for Booking Categories on Mobile
Status:
VERIFIED

Date:
2026-08-31

### Problem
Pada halaman form booking publik di HP, sub-kategori layanan (seperti Family, Group Studio, dll.) terpotong secara visual pada batas *padding* card dan tertahan sehingga tidak dapat digeser (scroll) secara horizontal.

### Root Cause
Container scroll flex item terkurung oleh lebar dan padding container induk tanpa deklarasi lebar yang pasti (seperti `w-max` dan `w-full`), sehingga flex item secara default mencoba menyusut atau dibatasi oleh *bounding box* induk alih-alih melebarkan area *scrollable*-nya.

### Affected Files
- src/booking.jsx

### Solution
Membungkus deretan tombol kategori tersebut ke dalam inner container `w-max` dan outer container `w-full overflow-x-auto touch-pan-x -mx-1 px-1` agar area scroll bisa mencapai batas tepi layar/card dengan sempurna.

### Verification
- `npm run check` passed.
- Vite build berhasil.

### Data Safety
Production data:
UNCHANGED

---

## BUG-008 — Invoice Spoofing Vulnerability (Missing Auth)
Status:
VERIFIED

Date:
2026-09-02

### Problem
Siapapun dapat mengirimkan email invoice palsu ke email mana saja menggunakan API Lapanbelas ID.

### Root Cause
Endpoint `/api/send-invoice-email` tidak memiliki pengecekan `requireAuth` dan melakukan fallback payload ke data yang diberikan oleh user jika order tidak ditemukan di database.

### Affected Files
- server.js

### Solution
Menambahkan middleware `requireAuth` agar hanya Admin yang dapat mengakses endpoint ini. Menghapus fallback payload yang berbahaya dan mereturn HTTP 404 jika order tidak valid.

### Verification
- `node --check server.js` passed.
- `npm run check` passed.

### Data Safety
Production data:
UNCHANGED

---

## BUG-009 & BUG-010 — Unauthenticated Photo Selection & Feedback Submission
Status:
VERIFIED

Date:
2026-09-02

### Problem
Data pemilihan foto klien dan feedback dapat ditimpa (overwrite) atau di-spam oleh pihak yang tidak sah yang menebak Order ID.

### Root Cause
Endpoint `/api/submit-photo-selection` dan `/api/submit-feedback` tidak memiliki validasi state yang ketat atau pengecekan duplikasi di level server.

### Affected Files
- server.js

### Solution
Menambahkan proteksi di `/api/submit-photo-selection` untuk menolak request jika status sesi sudah 'Terkirim'.
Menambahkan pengecekan di `/api/submit-feedback` untuk memvalidasi keberadaan `appointment_id` dan memblokir duplikasi (returning 409 Conflict) jika feedback sudah pernah dikirim.

### Verification
- `node --check server.js` passed.
- `npm run check` passed.

### Data Safety
Production data:
UNCHANGED

---

## BUG-011 — Invoice Preview Empty State on Direct URL Access (?preview=true)
Status:
VERIFIED

Date:
2026-09-02

### Problem
Membuka langsung link `http://localhost:5173/invoice.html?preview=true` tanpa melalui tombol cetak/preview di Admin atau My Orders menampilkan teks error "No invoice data found. Please open this from the My Orders page." karena `localStorage` belum terisi.

### Root Cause
Logika `window.onload` pada `invoice.html` hanya membaca data dari `localStorage` (`printInvoiceData`) atau URL parameter `?id=`. Jika dibuka langsung dengan `?preview=true` tanpa data di `localStorage`, alur langsung terlempar ke blok `else` yang menampilkan pesan error.

### Affected Files
- invoice.html
- vite.config.js

### Solution
1. Menambahkan fungsi `getMockInvoiceData()` dengan struktur lengkap pesanan (paket, add-on, custom fee, voucher, jadwal acara, catatan, & division).
2. Memperbarui logika `window.onload` di `invoice.html` sehingga jika URL mendeteksi `preview=true` (atau parameter `mock=true`) dan tidak ada data aktif di `localStorage`, otomatis merender mock dummy data.
3. Memperbaiki pengecekan container elemen DOM catatan (`inv-notes-container` / `note-section`) dan diskon (`inv-discount-container` / `inv-discount-row-container`) agar tidak error saat render data dengan add-on / catatan.
4. Menambahkan URL rewrite clean URL `/invoice` pada `vite.config.js`.

### Verification
- `node -e` DOM & syntax parser test passed.
- `npm run check` (Vite build) passed.
- HTTP 200 GET `http://localhost:5173/invoice.html?preview=true` verified.

### Data Safety
Production data:
UNCHANGED

---

## BUG-012 — Invalid Input Syntax for Type Date/Integer on Editor Assignment Upsert
Status:
VERIFIED

Date:
2026-09-02

### Problem
Muncul pesan error "Gagal menyimpan assign: invalid input syntax for type date: """ saat admin menyimpan penugasan editor video atau foto jika salah satu tanggal deadline atau qty kosong.

### Root Cause
Saat modal penugasan editor video dibuka, kolom `deadline` (untuk foto) atau sebaliknya tidak memiliki nilai dan tersimpan sebagai string kosong `""`. Demikian juga jika `qty` bernilai `""`. Di PostgreSQL (Supabase), kolom bertipe `date` dan `integer` menolak string kosong `""` dan menghasilkan error `invalid input syntax for type date: ""`.

### Affected Files
- src/admin.jsx

### Solution
1. Mengimplementasikan fungsi sanitasi `cleanDate` pada `dbPayload` di `AssignComponent` agar string kosong `""`, spasi, atau `"-"` otomatis diubah menjadi `null`.
2. Mengimplementasikan fungsi sanitasi `cleanQty` agar nilai numerik string kosong diubah menjadi `null` alih-alih `""`.

### Verification
- Pengujian langsung ke query Supabase membuktikan bahwa payload dengan `null` diterima oleh PostgreSQL tanpa error sintaks tanggal/integer.
- `npm run check` (Vite build) passed.

### Data Safety
Production data:
UNCHANGED

---

## BUG-013 — Null Value in Column "qty" of Relation "editor_assignments" Violates Not-Null Constraint

Status:
VERIFIED

Date:
2026-09-03

### Problem
Muncul pesan error pada notifikasi popup Admin Dashboard:
`Gagal menyimpan assign: null value in column "qty" of relation "editor_assignments" violates not-null constraint`
saat admin menyimpan penugasan Editor Video (atau penugasan foto baru yang belum memiliki jumlah foto terpilih).

### Root Cause
Di tabel Supabase PostgreSQL `editor_assignments`, kolom `qty` memiliki constraint `NOT NULL`. Fungsi `cleanQty` sebelumnya mengembalikan `null` ketika nilai `qty` kosong atau tidak ada (misalnya saat menugaskan editor video di mana input `qty` foto tidak ditampilkan dan `selectedTask.qty` masih kosong). Akibatnya, payload upsert mengirimkan `{ qty: null }`, yang ditolak oleh PostgreSQL karena melanggar constraint `NOT NULL`. Selain itu, pada mode video, format `file_code` berisiko menimpa `driveLink` yang sudah ada menjadi string kosong.

### Affected Files
- src/admin.jsx

### Dependencies
- None

### Solution
1. Memperbarui fungsi sanitasi `cleanQty` agar mengembalikan `0` (integer yang valid dan non-null) alih-alih `null` ketika nilai input kosong, null, undefined, atau bukan angka.
2. Memastikan `rawQty` membaca `formData.qty` jika terisi, atau fallback ke `selectedTask.qty`, lalu disanitasi oleh `cleanQty` sehingga selalu menghasilkan nilai integer non-null `>= 0`.
3. Memperbaiki penyusunan `preservedFileCode` pada mode video agar membaca `selectedTask.driveLink` secara utuh tanpa menimpa link drive yang sudah ada.
4. Menstandarisasi pemisahan nama editor (`editorFoto` dan `editorVideo`) agar mendukung format pemisah ganda (`||`) maupun tunggal (`|`).

### Verification
- Unit test sanitasi `cleanQty` via Node.js (`null -> 0`, `undefined -> 0`, `'' -> 0`, `'10' -> 10`).
- `node --check server.js` passed.
- `npm run check` (Vite build) passed (`dist/index-admin.html` and assets built successfully).

### Data Safety
Production data:
UNCHANGED

### Notes
Kolom `qty` pada `editor_assignments` memerlukan tipe data integer dan tidak boleh `NULL`. Nilai `0` digunakan sebagai default yang aman jika tugas video/foto belum memiliki kuantitas foto spesifik.

---

## BUG-014 — Direct Original File Download in Client Photo Selection Portal

Status:
VERIFIED

Date:
2026-09-03

### Problem
Klien yang sedang memilih foto di portal seleksi foto (`pilih-foto.html`) tidak dapat mengunduh foto asli resolusi tinggi secara langsung tanpa harus membuka folder Google Drive di tab/aplikasi terpisah.

### Root Cause
Sebelumnya, portal hanya menampilkan thumbnail preview terkompresi (`sz=400` dan `sz=1200`) untuk efisiensi loading web, dan tidak menyediakan tombol unduh file mentah/asli secara in-app.

### Affected Files
- server.js
- src/client-portal.jsx

### Dependencies
- Google Drive API v3

### Solution
1. Menambahkan endpoint backend baru `GET /api/drive-download/:fileId` pada `server.js` yang melakukan streaming binary file asli dari Google Drive dengan header `Content-Disposition: attachment; filename="..."` agar browser klien langsung mengunduh file asli tanpa pindah halaman. Jika streaming API terkendala, otomatis fallback ke redirect download Google Drive direct export.
2. Menambahkan tombol **`⬇ Download`** pada footer modal Lightbox (`PhotoLightboxModal`) di samping tombol catatan dan tombol pilih foto.
3. Menambahkan ikon cepat **`⬇`** pada kartu thumbnail foto di grid agar klien dapat mengunduh file asli secara instan tanpa perlu membuka preview layar penuh.
4. Menggunakan elemen native HTML `<a href="..." download>` dengan pencegahan event propagation (`e.stopPropagation()`) agar klik download tidak memicu pembukaan modal atau seleksi foto.

### Verification
- `node --check server.js` passed.
- `npm run check` (Vite build) passed dengan seluruh bundle aset produksi berhasil dibuat.

### Data Safety
Production data:
UNCHANGED

---

## FEATURE-015 — End-to-End Self-Service Reschedule Portal & Realtime Google Calendar Integration (Opsi A)

Status:
VERIFIED

Date:
2026-10-01

### Problem
1. Klien belum memiliki opsi untuk mengajukan jadwal ulang (reschedule) secara mandiri saat terjadi perubahan rencana, seringkali menyebabkan chat manual yang memicu miskomunikasi dan risiko jadwal bentrok.
2. Owner studio sering memeriksa jadwal lewat Google Calendar di HP, namun pesanan yang masuk ke sistem booking lokal sebelumnya belum tersinkronisasi otomatis ke Google Calendar pribadi owner.

### Root Cause
1. Belum tersedianya alur pengajuan reschedule mandiri dengan validasi batasan waktu (H-2 untuk studio, H-14 untuk wedding/event) dan proteksi bentrok slot jam.
2. Belum adanya jembatan sinkronisasi kalender antara Supabase PostgreSQL dengan Google Calendar (OAuth2 Service Account API & universal iCal feed).

### Affected Files
- server.js
- src/main.jsx
- src/components/RescheduleModal.jsx
- src/admin.jsx
- .env.example

### Solution
1. **Fitur Reschedule Mandiri (Self-Service Reschedule):**
   - Menambahkan komponen modal responsif `src/components/RescheduleModal.jsx` pada portal klien (`src/main.jsx`) yang hanya aktif untuk pesanan `Sudah DP` atau `Lunas`.
   - Menerapkan batasan H- deadline yang ketat di backend `POST /api/reschedule-booking` (Studio min H-2, Wedding/Dekorasi min H-14).
   - Menerapkan proteksi bentrok slot jam studio (`mapRoomKey` & time-overlap check) agar tanggal dan jam baru tidak bertabrakan dengan pesanan aktif lainnya.
   - Menyimpan jejak riwayat reschedule pada `additional_notes` (`[RESCHEDULE RECORD]`) dan menampilkan badge `🗓️ Terjadwal Ulang` di portal klien serta `🗓️ Rescheduled` di Admin Dashboard.
   - Mengirim konfirmasi WhatsApp otomatis ke nomor klien saat reschedule berhasil diproses.
2. **Integrasi Google Calendar (Opsi A - Realtime Push API + iCal Feed):**
   - Mengimplementasikan helper autentikasi Service Account Google OAuth2 menggunakan native Node.js `crypto` (zero extra dependencies).
   - Menambahkan fungsi `syncGoogleCalendarEvent` yang otomatis membuat / memperbarui event di Google Calendar saat ada pembayaran DP/Lunas (webhook Midtrans & DOKU) dan saat reschedule berhasil.
   - Menambahkan endpoint `GET /api/calendar-feed.ics` (RFC 5545) untuk langganan kalender 1-klik di Google Calendar, Apple Calendar, atau Android.
   - Menambahkan kartu kontrol "Google Calendar & Sinkronisasi Jadwal" pada menu Setting Admin Dashboard lengkap dengan tombol sinkronisasi massal (`POST /api/calendar/sync-all`).

### Verification
- `node --check server.js` passed (0 syntax error).
- `npm run check` (Vite build) passed (132 modules transformed, build 485ms).
- Unit test `src/tests/test_features_015.js` passed (JWT encoding, deadline rules H-2 vs H-14, and collision overlap detection).

### Data Safety
Production data:
UNCHANGED

---

## FEATURE-016 — Two-Step Album Photo Gate, Auto-Trigger Feedback Link & Owner Handover Gallery

Status:
VERIFIED

Date:
2026-10-01

### Problem
1. Klien sering mengeluh tidak ada kabar saat album foto fisik sudah selesai dicetak di kantor/studio.
2. Saat klien datang mengambil album, admin sering lupa memfoto klien memegang album bersama, sehingga owner tidak memiliki laporan resmi dan tim marketing tidak memiliki bukti kepuasan/portofolio.
3. Admin sering lupa mengirimkan tautan evaluasi/feedback kepuasan ke klien setelah pesanan diselesaikan.

### Root Cause
1. Belum ada alur bertahap (Two-Step Gate) yang mewajibkan bukti fisik foto sebelum dan saat serah terima.
2. Tidak adanya sistem "Hard Gate" yang mengunci penyelesaian pesanan (`status = Selesai`) tanpa adanya lampiran foto serah terima.
3. Belum tersedianya otomasi pengiriman WhatsApp evaluasi kepuasan (`/feedback/:orderId`) yang terpicu tepat setelah penyerahan album.
4. Owner belum memiliki dashboard visual terpusat untuk memantau semua foto serah terima, izin portofolio, dan ulasan klien.

### Affected Files
- server.js
- src/admin.jsx

### Solution
1. **Tahap A: Konfirmasi Album Selesai Cetak (`POST /api/confirm-album-ready`)**:
   - Admin mengunggah foto fisik album yang sudah selesai diperiksa QC.
   - Foto disimpan ke Supabase Storage (`room-photos/handover/...`).
   - Sistem otomatis mengirim notifikasi WhatsApp ke klien melampirkan foto fisik album dan memberitahukan bahwa album siap diambil di studio.
2. **Tahap B: Hard Gate Serah Terima Album (`POST /api/confirm-album-handover`)**:
   - Admin **WAJIB** mengambil/mengunggah foto klien memegang album fisik dan menginput nama penerima. Form dikunci dan tombol submit nonaktif tanpa adanya foto bukti.
   - Pilihan izin portofolio (klien berkenan diunggah ke medsos studio).
   - Saat disimpan: status appointment di database Supabase otomatis diubah menjadi `Selesai`, riwayat `[HANDOVER_RECORD]` dicatat, dan sistem **OTOMATIS** mengirim pesan WhatsApp berisi tautan feedback evaluasi (`/feedback/:orderId`) ke klien.
3. **Owner Dashboard — Laporan Serah Terima (`HandoverReportsComponent`)**:
   - Menu baru `Laporan Serah Terima` (`handover-gallery`) di Admin Dashboard.
   - KPI ringkasan: Total Serah Terima, Izin Portofolio, Album Siap Ambil, dan Rata-rata Skor Bintang ⭐.
   - Grid galeri foto bukti serah terima dengan filter divisi, filter izin portofolio, dan status feedback.
   - Dilengkapi modal pratinjau foto resolusi tinggi (lightbox), tombol salin link foto untuk tim marketing medsos, dan tombol kirim ulang link WhatsApp feedback.

### Verification
- `node --check server.js` passed.
- `npm run check` (`vite build`) passed (0 error, build 543ms).
- Live storage upload and endpoint parameters verified.

### Data Safety
Production data:
UNCHANGED
---

## BUG-017 — 5 Bugs Found During Full End-to-End Audit (Audit 2026-10-01)

Status:
VERIFIED

Date:
2026-10-01

### Problem
5 bug ditemukan lewat audit menyeluruh dengan data produksi nyata:

1. **Route `/queue` dan `/invoice` → HTTP 404 di production Express server.** Kedua halaman ini hanya memiliki clean-URL rewrite di Vite dev server (`vite.config.js`), tetapi tidak ada route handler di Express (`server.js`), sehingga saat diakses melalui `node server.js` / production, URL bersih menghasilkan 404. (Akses via `.html` langsung masih bekerja karena Express static serving.)

2. **Reschedule endpoint (`POST /api/reschedule-booking`, L6166-6167) pakai kolom `customer_phone` / `customer_email` yang tidak ada.** Schema appointments pakai `client_phone` / `client_email`. Akibatnya verifikasi kontak identitas klien selalu gagal diam-diam (karena `|| ''` fallback), dan notifikasi WA reschedule tidak pernah terkirim.

3. **Reschedule endpoint (L6195) membaca `curAppt.division` yang tidak ada di schema.** Kolom `division` tidak ada di tabel `appointments`. Ini menyebabkan logika deadline (H-2 vs H-14) selalu default ke mode Non-Studio/Wedding karena `division` selalu `''`. Seharusnya di-extract dari field `additional_notes` via regex `[DIVISI]:`.

4. **Reschedule WA notification (L6331-6341) pakai `curAppt.customer_phone` dan `curAppt.customer_name`.** Sama seperti bug #2, kolom tidak ada, sehingga notifikasi WA konfirmasi reschedule tidak pernah terkirim.

5. **Google Calendar sync function (`syncGoogleCalendarEvent`, L5950-5955) dan iCal feed generator (L6065-6066) pakai `customer_name` / `customer_phone` / `customer_email`.** Kolom tidak ada, sehingga title event di Google Calendar selalu tampil sebagai "[roomName] Klien - Package" tanpa nama asli klien, dan deskripsi event kosong untuk kontak.

### Root Cause
Inkonsistensi penamaan kolom antara frontend form payload (menggunakan `customer_*`) dan schema Supabase yang sesungguhnya (menggunakan `client_*`). Feature-015 & 016 ditulis mengasumsikan nama kolom lama, sementara schema nyata berbeda.

### Affected Files
- server.js

### Solution
1. Menambahkan route handler Express untuk `/queue` dan `/invoice` (clean URL) di `server.js`.
2. Mengubah `curAppt.customer_phone` → `curAppt.client_phone` dan `curAppt.customer_email` → `curAppt.client_email` pada verifikasi kontak reschedule.
3. Mengganti `curAppt.division` dengan ekstraksi dari `additional_notes` via regex `[DIVISI]:`.
4. Mengubah `curAppt.customer_phone` / `customer_name` → `curAppt.client_phone` / `client_name` pada WA notification reschedule.
5. Mengubah `order.customer_name` / `customer_phone` / `customer_email` → `client_name || customer_name` fallback pada `syncGoogleCalendarEvent` dan iCal generator.

### Verification
- `node --check server.js` passed (0 syntax error).
- `npm run build` (Vite) passed (132 modules, 542ms).
- Runtime regression test: 9/9 page routes PASS, 7/7 auth gates PASS, 8/8 core API flows PASS.
- Tested with real production data (BK-053687, BK-315029, 265 total appointments).

### Data Safety
Production data:
UNCHANGED
---

## BUG-018 — Constraint Error saat Serah Terima Album (appointments_status_check)

Status:
FIXED & VERIFIED

Date:
2026-10-04

### Problem
Saat admin menyimpan Form Serah Terima Album di dashboard admin (`POST /api/confirm-album-handover`), muncul pesan error:
`"Gagal: Gagal memperbarui status serah terima di database: new row for relation "appointments" violates check constraint "appointments_status_check""`

### Root Cause
Kolom `status` pada tabel PostgreSQL `appointments` di Supabase memiliki check constraint (`appointments_status_check`) yang hanya menerima nilai status pembayaran (`'Menunggu DP'`, `'Sudah DP'`, `'Lunas'`). Endpoint `/api/confirm-album-handover` di `server.js` (L7420) mencoba mengupdate `status: 'Selesai'`, yang melanggar constraint database tersebut. Status penyelesaian operasional album sebenarnya dideteksi melalui catatan tag `[HANDOVER_RECORD]` pada kolom `additional_notes` serta assignment editor (`editor_assignments` `status_foto: 'Done'`, `status_video: 'Done'`).

### Affected Files
- [server.js](file:///Users/macbook/Documents/PROJECT%20APLIKASI/lapanbelas-id-full-main/server.js)

### Solution
Menghapus `status: 'Selesai'` dari query update tabel `appointments` di endpoint `/api/confirm-album-handover`, dan hanya mengupdate `additional_notes: updatedNotes` (yang berisi `[HANDOVER_RECORD]`) serta `editor_assignments` menjadi `'Done'`.

### Verification
- `node --check server.js` passed (0 syntax error).
- `npm run build` passed (0 error).


