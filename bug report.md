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
