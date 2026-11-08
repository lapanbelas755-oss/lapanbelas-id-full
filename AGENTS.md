# PANDUAN PROYEK 18STUDIO (AGENTS.md)

## 1. NAMA PROYEK & TUJUAN
- **Nama Proyek:** 18Studio (lapanbelas-id)
- **Tujuan:** Sistem manajemen operasional & reservasi studio foto, wedding, makeup artist, videografi, dekorasi, hingga integrasi pembayaran (DOKU Checkout), antrean, invoice, dan portal klien/admin.

## 2. STACK TEKNOLOGI
- **Frontend:** React 19, JSX, Vite, Tailwind CSS (Multi-entry HTML pages: booking, client portal, admin, queue, feedback, invoice).
- **Backend:** Node.js, Express (`server.js`).
- **Database:** Supabase (PostgreSQL).
- **Integrasi Pihak Ketiga:** DOKU Payment Gateway, Nodemailer, Web-Push, WhatsApp Templates / Fonnte.

## 3. PANTANGAN & ATURAN UTAMA (HUKUM PONYTAIL & CAVEMAN)
- **KONSULTASI PETA SISTEM DULU (ANTI-SCAN DARI NOL):** Setiap ada permintaan fitur baru atau perbaikan, WAJIB baca bagian "PETA ARSITEKTUR & FILE SISTEM" di bawah ini terlebih dahulu agar langsung tahu target file yang tepat, tanpa buang-buang waktu memindai/grep seluruh proyek dari nol.
- **KODE LAMA ADALAH HARGA MATI (PONYTAIL SURGICAL CHANGES):** Setelah target file ditemukan dari Peta Sistem, lakukan bedah mikro yang sangat hati-hati pada file tersebut. Jangan merombak arsitektur, jangan mengubah nama fungsi/variabel aktif, dan jangan sampai fitur lama rusak atau regresi.
- **Anti Kode Setengah Jalan:** Dilarang meninggalkan TODO / stub function / placeholder tanpa logika.
- **Responsif:** Semua antarmuka wajib rapi dari mobile (320px) sampai desktop.
- **Bahasa Non-Teknis:** Laporkan temuan dan status ke user dengan bahasa awam yang jelas dan langsung ke intinya.

## 4. PETA ARSITEKTUR & FILE SISTEM (INDEX LANGSUNG)
Gunakan peta ini untuk langsung membuka file yang relevan:
- **Backend & Seluruh API:** `server.js` (Express, kalkulasi fee, sync database, WhatsApp Kirimi/Fonnte, DOKU checkout, notifikasi).
- **Portal Kru Lapangan:** `src/crew.jsx` (Login HP kru, PAP foto, SOP per sesi, checklist barang bawaan, nomor rekening satu profil, setor file kantor/Drive, status gaji).
- **Admin Dashboard Utama:** `src/admin.jsx` (Routing admin dan menu navigasi).
- **Admin - Manajemen Kru (3 Tab):**
  - Wrapper & Navigasi Tab: `src/admin/crew/CrewManagementComponent.jsx`
  - ① Tab Penugasan Acara: `src/admin/crew/CrewEventAssignmentsManager.jsx` (Jadwal acara dokumentasi, filter bulan/status/kategori, split akad/resepsi, auto-fill fee, kirim WA tugas).
  - ② Tab Pantau & Gaji: `src/admin/crew/CrewMonitorPayManager.jsx` (Tahapan 1 PAP → 2 SOP → 3 File → 4 Bayar, rincian akomodasi/bonus/potongan, modal konfirmasi bayar & verifikasi file).
  - ③ Tab Kru & Pengaturan:
    - Anggota Kru & Tarif Personil: `src/admin/crew/CrewManagementComponent.jsx`
    - Template Master SOP: `src/admin/crew/CrewSopManager.jsx`
    - Master Tarif Gaji: `src/admin/crew/CrewRateCardManager.jsx`
- **Admin - Modul Lainnya:**
  - Janji Temu & Pesanan: `src/admin/AppointmentComponent.jsx`
  - Pricelist & Paket: `src/admin/PricelistComponent.jsx`
  - Jadwal Studio / Room: `src/admin/JadwalRoomComponent.jsx`
  - Jadwal Rias / MUA: `src/admin/JadwalRiasComponent.jsx`
  - Logistik Dekorasi: `src/admin/LogistikDekorComponent.jsx`
  - Serah Terima & Feedback: `src/admin/UnifiedHandoverFeedbackComponent.jsx`
  - Setting Sistem: `src/admin/SettingComponent.jsx`
  - Helper & Utilitas: `src/admin/adminUtils.js`
- **Portal Klien / Booking Publik:**
  - Alur Booking: `src/booking.jsx`
  - Antrean Live: `src/queue.jsx`
  - Pilih Foto Klien: `src/pilihFoto.jsx`
  - Review / Feedback Klien: `src/feedback.jsx`
  - Invoice Publik: `src/invoice.jsx`

## 5. ATURAN BISNIS PENUGASAN KRU & PAKET
- **Silver Package:** Wajib 1 hari acara (Akad & Resepsi di hari yang sama). Dilarang dipisah / beda hari.
- **Paket yang boleh Beda Hari (Mode Split Akad & Resepsi):** Bronze, Gold, Gold Combo, Platinum, Royal, Bravo, Centro, Delta (atau jika memang tanggal resepsi != tanggal acara).
- **Paket 1 Hari Murni:** Silver, Akad Intimate, Akad Postwed, Engagement / Lamaran, Prewedding, Tasyakuran, Wisuda.
- **Tarif Jasa Melekat per Personil Kru:** Dikelola langsung di tab Daftar Kru (tombol 💰 Tarif) per personil (Full Day, Akad Solo, Akad Backup, Resepsi Solo, Resepsi Backup, Engagement, Prewedding, Wisuda, Studio). Tab terpisah Master Tarif Gaji dilebur.
- **Auto-Fill Nominal Penugasan:** Saat memilih nama kru di penugasan acara, nominal gaji otomatis terisi sesuai pengaturan tarif khusus milik kru tersebut untuk sesi terkait.

## 5. STANDAR SOP & CHECKLIST PER MOMEN + REQUEST KHUSUS KLIEN
- **Pengelompokan Momen:** SOP Master dibagi per momen (Umum, Akad, Resepsi, Tasyakuran, Lamaran, Prewed, Wisuda, Studio). Kru di lapangan hanya melihat checklist sesuai sesi kerjanya.
- **Request Khusus Klien:** Admin dapat menambahkan/mengedit catatan footage kustom pada detail penugasan acara, yang akan tampil dengan badge khusus di portal kru agar tidak terlewat saat prosesi berlangsung.

## 6. ALUR KERJA KRU (SUDAH DIIMPLEMENTASI)
- **4 Langkah:** Tugaskan → Info Acara → Kerjakan SOP → Bayar Gaji.
- **Admin 3 Tab:** Penugasan | Pantau & Gaji | Kru & Pengaturan (Daftar Kru, Tarif, Kontrak, Master SOP).
- **Briefing H-1 diganti "Checklist Barang Bawaan"** per acara/klien (diisi admin manual, dicentang kru di portal).
- **Presensi cukup Foto PAP.** GPS check-in resmi dimatikan.
- **Rekening Kru:** Cukup diatur sekali di profil kru, tidak perlu diketik ulang tiap klaim.
- **Gaji:** Pokok otomatis dari tarif kru + Akomodasi + Bonus − Potongan (manual oleh admin saat bayar).
- **Kunci Bayar:** Tombol bayar aktif HANYA jika SOP footage 100% DAN admin sudah konfirmasi file diterima (PC kantor / link Google Drive klien).
- **Portal Kru:** 1 kartu ringkas per acara (jadwal, alamat+Maps, request khusus klien, checklist barang bawaan, SOP footage, tombol PAP kamera, setor file, rincian gaji & breakdown lengkap).

## 7. STANDAR KONTRAK KERJA DIGITAL (DUAL-TIER: STAFF PKWT & MITRA FREELANCE)
- **Legalitas Terpisah & Tepat Sasaran:**
  - **Staff Tetap:** Memakai *Surat Perjanjian Kerja Waktu Tertentu (PKWT)* standar PT STUDIO LAPAN BELAS (Durasi 2 Tahun / 1 Tahun Studio, masa orientasi 1 bulan fee 1/4, hak kompensasi PKWT).
  - **Freelance:** Memakai *Surat Perjanjian Kemitraan Jasa Dokumentasi (Freelance Partner)* (Berbasis On-Call / Per Penugasan, bebas ambil job luar tanpa bentrok, bebas tuntutan pesangon/status karyawan Disnaker).
- **6 Sanksi Tegas Operasional (Mengikat Keduanya):**
  1. Mangkir/No-Show di hari H wajib menanggung 100% biaya sewa pengganti darurat.
  2. Kehilangan/kerusakan file tanggung biaya data recovery lab & kompensasi refund klien.
  3. Pembajakan klien/transaksi gelap denda komersial 1x–2x nilai paket + Blacklist permanen.
  4. Keterlambatan hadir potong fee 25%–50% / SP-3 jika momen sakral terlewat.
  5. Keterlambatan setor file denda Rp 50.000 / hari jika melebihi 1x24 jam.
  6. Kerusakan/kehilangan alat kantor wajib ganti rugi service center.
- **Akses & Tanda Tangan:** Kru menandatangani secara digital via Portal Kru (tersimpan NIK, IP, tanda tangan canvas, dan timestamp UU ITE). Admin dan kru dapat melihat detail 10 pasal serta mencetak PDF kapan saja.

## 8. SISTEM KEAMANAN PIN 4-DIGIT PORTAL KRU
- **PIN 4-Angka Numerik:** Mengamankan akun kru dari pihak yang hanya mengetahui nomor WhatsApp.
- **Registrasi Pertama Kali:** Jika kru baru pertama kali login, otomatis diarahkan untuk membuat 4-digit PIN baru.
- **Lupa PIN Otomatis via WA:** Tombol "Lupa PIN?" mengacak 4 angka baru, menyimpannya di database, dan mengirimkan pesan WA resmi via Kirimi.id Gateway ke nomor kru. Dilengkapi proteksi anti-spam jeda 2 menit.
- **Ganti PIN Mandiri:** Kru dapat mengubah PIN sewaktu-waktu di dalam portal melalui tombol 🔑 PIN di navbar.
- **Kontrol Admin:** Admin dapat melihat status PIN kru (`🔒 PIN Aktif` / `⚠️ No PIN`) dan memiliki tombol cadangan reset PIN instan di Manajemen Kru.

## 9. STANDAR OPERASIONAL STUDIO & KAPASITAS TANGGAL
- **Jam Operasional Studio:** 09.00 – 17.30 WIB (seluruh sesi photoshoot selesai paling lambat jam 17.30 WIB).
- **Jeda Break Antar Sesi (Turnaround Buffer):** Wajib jeda 10 menit setelah sesi selesai sebelum sesi berikutnya di room yang sama (contoh: 14.00–14.20, break 10 menit 14.20–14.30, sesi berikutnya mulai 14.30). Jam 14.21 otomatis terblokir untuk room yang sama.
- **Batas Kuota Tanggal (Non-Studio):** Maksimal default 2 slot/hari untuk Divisi Lapanbelas.id (Wedding), Lady Makeup, dan Dekorasi. Data lama yang sudah terisi 3 slot tetap dipertahankan; jika admin butuh menambah slot, dapat dibuka manual via tab Date Available di Admin.

## 10. SINKRONISASI REALTIME GOOGLE CALENDAR & FILTER OVERVIEW
- **Realtime Sync Semua Invoice & Booking:** Setiap booking baru dari website publik atau invoice baru yang dibuat admin langsung disinkronkan ke Google Calendar `studio18.picture@gmail.com` secara realtime tanpa harus menunggu status Lunas/Sudah DP.
- **Indikator Status Kalender:**
  - Status `Menunggu DP`: Ditandai dengan warna Kuning (`colorId: 5`) dan judul berawalan `[MENUNGGU DP]`.
  - Status `Sudah DP` / `Lunas`: Berubah menjadi warna Hijau (`colorId: 10`) dan judul acara normal/terkonfirmasi.
  - Status `Batal` / `Dibatalkan`: Event dihapus otomatis dari Google Calendar.
- **Filter Navigasi Overview Dashboard:** Kartu ringkasan status di Overview (misal: "Menunggu DP") otomatis menyetel filter divisi ke `All` agar seluruh pesanan dari berbagai divisi (Studio, Wedding, MUA, Dekor) langsung tampil tanpa tersaring kosong.

## 11. STANDAR TAMPILAN KALENDER DATE AVAILABLE (ADMIN)
- **Header Nama Hari Baku:** Menampilkan 7 hari (`Min`, `Sen`, `Sel`, `Rab`, `Kam`, `Jum`, `Sab`) dengan pill kontras tinggi, `Min` (Minggu) berwarna merah, dan grid `grid-cols-7` konsisten agar hari sejajar 100% dengan kolom tanggal.
- **Tinggi & Tampilan Sel Seragam:** Sel kalender berukuran seragam (`min-h-[105px]`), highlight hari ini (`isToday`), highlight tanggal terpilih (`ring-2 ring-blue-500`), progress bar kuota terisi, dan pill nama klien rapi tanpa memecah layout.
- **Normalisasi Kuota Slot Otomatis (Maksimal 2):** Divisi Non-Studio (Wedding, MUA, Dekorasi) selalu berpatokan default 2 slot/hari. Database tabel `date_availability` dinormalisasi sehingga tanggal kosong seragam menampilkan `2 Tersisa` (tidak belang-belang antara 2 dan 3).

## 12. SISTEM TEMA DUAL-MODE (DARK & LIGHT MODE)
- **Ekstraksi Palet Warna:**
  - *Dark Mode:* Deep obsidian `#030708`, body `#041617`, dark cyan-teal glass card `rgba(9, 38, 39, 0.75)`, border teal `rgba(45, 212, 191, 0.18)`, teks putih `#ffffff` & slate `#94a3b8`, aksen teal `#0d9488` / `#2dd4bf`.
  - *Light Mode:* Soft mint slate-50 `#f0fdfa`, body `#e6f9f6`, kartu putih cerah `rgba(255, 255, 255, 0.88)`, border mint `rgba(204, 251, 241, 0.85)`, teks dark slate `#0f172a` & `#334155`, aksen teal `#0d9488`.
- **Variabel CSS & Tailwind:** Dideklarasikan di `src/index.css` (`:root`, `html.dark`, `html.light`, `[data-theme]`) dan dipetakan di `tailwind.config.js`.
- **Manajemen State (Local Storage):** `src/utils/theme.js` dengan key `18studio_theme`, default `dark` demi menjaga konsistensi tampilan awal.
- **Komponen Sakelar:** `src/components/ThemeToggle.jsx` (tombol matahari/bulan di header, zero-regression terhadap tombol notifikasi & lokasi).
- **Anti-FOUC:** Skrip pre-render inline di `<head>` `index.html` dan `index-admin.html` agar tema langsung diterapkan sebelum tampilan dirender browser.
- **Penerapan Global (Tahap 2):**
  - *Navigasi Bawah:* `src/main.jsx` (glassmorphism dinamis `var(--theme-bg-header)`, aktif teal-600/teal-400, inaktif slate-500/gray-400).
  - *Sidebar Admin:* `src/admin.jsx` (background putih di light mode / deep black di dark mode, menu hover & submenus adaptif, border slate-200 / white-10).
  - *Kartu Kecil & Squircle:* Category icon boxes (Lapanbelas, Studio, MUA, Dekor), modal notifikasi, dan utility `.glass-panel` / `.glass-dark` otomatis adaptif mengikuti mode.
- **Penerapan Dashboard Kasir / Overview Keuangan (Tahap 3):**
  - *Halaman:* `src/admin/tabs/OverviewComponent.jsx`.
  - *Layout Baris Pertama (RevenuePulse AI Style):*
    - Menggunakan CSS Grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5` sejajar di baris atas.
    - 4 Kartu KPI: (1) Total Pendapatan DP (+ wave sparkline), (2) Total Pelunasan Diterima (+ activity matrix), (3) Menunggu DP (+ rising wave sparkline), (4) Total Klien Unik (+ step point chart).
    - Masing-masing kartu dilengkapi icon box, label judul, pill status (DP Masuk / Lunas / Action / Direktori), angka saldo tebal, dan tren performa.
  - *Kontras Adaptif:*
    - Kartu metrik utama (Pendapatan Kotor, Laba Bersih, DP, Pelunasan): label `text-slate-600 dark:text-gray-400`, angka `text-slate-900 dark:text-white`.
    - Filter bulan & divisi: tab aktif `bg-blue-600 dark:bg-blue-500 text-white`, inaktif `bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-300`.
    - Progress & rasio efisiensi laba bersih: trek abu terang `bg-slate-200 dark:bg-white/10`, baris kartu rincian `bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10`.
    - Panel Perbandingan Laba Divisi & Aktivitas: judul `text-slate-900 dark:text-white`, teks sekunder `text-slate-500 dark:text-gray-400`.
    - Reminder Acara (H-7) & Reminder Pelunasan (H+1): tabel kontras tinggi, teks klien `text-slate-900 dark:text-white`, sisa tagihan `text-red-600 dark:text-red-400`, border baris `border-slate-200/90 dark:border-white/10`.
  - *Hukum Stabilitas:* Perhitungan saldo (`computeStats`, `totalIncome`, `netProfit`, margin), query database, dan mutasi Supabase 100% utuh tanpa diubah.
- **Penerapan Modul Admin Utama Lainnya (Tahap 4):**
  - *Modul:* Appointment (`AppointmentComponent.jsx`), Pricelist & HPP (`PricelistComponent.jsx`), Settings (`SettingComponent.jsx`), dan Manajemen Kru (`CrewManagementComponent.jsx`, `CrewEventAssignmentsManager.jsx`, `CrewMonitorPayManager.jsx`).
  - *Kontras Adaptif:*
    - Table header & border: `bg-slate-100 dark:bg-white/5`, border `border-slate-200 dark:border-white/10`, teks `text-slate-500 dark:text-gray-400`.
    - Teks nama klien / judul paket / personil kru: `text-slate-900 dark:text-white`.
    - Form Input & Select dropdown: background terang bersih di light mode (`bg-white` / `bg-slate-50`), teks gelap (`text-slate-900`), border rapi (`border-slate-200`).
    - Action Buttons & Badges: kontras tinggi, tombol aksi `bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white`.
  - *Hukum Stabilitas:* Query Supabase, API endpoints, validasi penugasan, dan kalkulator HPP 100% utuh tanpa regresi.

## 13. STANDAR RESOLUSI KONTRAS & OVERRIDE LIGHT MODE
- **Tailwind v4 Custom Variant:** `@custom-variant dark (&:where(.dark, .dark *));` di `src/index.css` agar preferensi dark mode berbasis class (`.dark`) bukan media query OS.
- **Sidebar & Main Canvas:** Sidebar dipaksa `bg-white` dengan border `border-slate-200`, main screen dipaksa `bg-slate-50` (`#f8fafc`).
- **Inversi Otomatis Teks Putih:** Aturan global `html.light .text-white` membalikkan warna menjadi `text-slate-900` (`#0f172a`), kecuali tombol aksi utama dan pill status aktif.
- **Border Kotak/Card Jelas:** Card `.glass-panel` di mode light menggunakan border `border-slate-200` (`#cbd5e1`) dan bayangan lembut `shadow-sm`, menghilangkan efek teks melayang tanpa batas.

## 14. STANDAR GLASSMORPHISM KARTU DASBOR
- **Transparansi & Blur:** Kartu di Dasbor Kasir menggunakan background semi-transparan `bg-white/80` (Light Mode) dan `dark:bg-slate-800/80` (Dark Mode), dipadukan dengan `backdrop-blur-md` untuk kedalaman optik.
- **Border Tipis Presisi:** Garis tepi tipis semi-transparan `border border-slate-200/80` (Light Mode) dan `dark:border-white/10` (Dark Mode) menjaga ketegasan batas kartu.
- **Konsistensi Global:** Utility `.glass-panel` di `src/index.css` disinkronkan ke `rgba(30, 41, 59, 0.8)` di Dark Mode dan `rgba(255, 255, 255, 0.8)` di Light Mode dengan blur 12px.
- **Hukum Stabilitas:** Kalkulasi keuangan, state, query database, dan struktur layout Grid tetap 100% utuh tanpa perubahan.

## 15. STANDAR TIPOGRAFI SALDO & AKSEN EMERALD LAPANBELAS
- **Tipografi Angka Saldo:** Menggunakan `text-3xl font-bold` / `sm:text-[32px]` / `sm:text-4xl` dengan `tracking-tight` agar saldo menjadi pusat visual (visual gravity) dasbor.
- **Aksen Emerald Lapanbelas:** Badge Laba Bersih menggunakan palet kustom brand (`#e6f9f6` / `#0f766e` di Light Mode, `#042f2e` / `#2dd4bf` di Dark Mode, dengan border `#0d9488`/`#14b8a6` dan glowing dot `#00e5b0`), bukan default tailwind `emerald-500`.
- **Indikator Tren Efisiensi Margin:** Dilengkapi ikon panah tren naik (`M5 10l7-7m0 0l7 7m-7-7v18`) dan pill persentase kontras tinggi.

## 16. STANDAR UI APLIKASI KLIEN (BERANDA, KATALOG, SAMPLE, PESANAN SAYA & FAST BOOKING)
- **Akses Langsung Beranda Tanpa Blokir Login Awal (`src/main.jsx`):**
  - Saat aplikasi dibuka, pengguna langsung masuk ke tampilan Beranda (form login Google & Booking ID ditempatkan di tab `Profile` jika belum login).
- **Tab 1 - Beranda (`src/main.jsx` & `src/components/BestSellerCarousel.jsx`):**
  - Header `ByLapanbelasid •` + lokasi `ACEH | MEDAN - INDONESIA` + `ThemeToggle` + Lonceng Notifikasi + Profil.
  - Hero Banner tinggi (`h-[315px]`) dengan badge `⚡ PROMO AGUSTUS`, tipografi serif italic *"Indahnya Momen Bahagia"*, judul tebal *"Cerita Indah, Abadi, Berkesan."*, dan Search Bar pill + tombol Filter di bawahnya.
  - 4 Kategori dalam kapsul glassmorphic (`Lapanbelas`, `Studio`, `Makeup`, `Dekorasi`).
  - Carousel `Best Seller Package 2026` horizontal dengan foto di atas, tumpukan badge (`HEMAT 1 JUTA`, `HARGA TERBAIK` / `PILIHAN TERBAIK`), tombol favorit hati, harga coret, harga aktif tebal, dan tombol bulat `+`.
  - Kartu `"Jadikan Konsultasi Gratis"` dengan latar foto interior studio + tombol amber `Hubungi Admin ›`, serta kartu `"Garansi Hasil Mewah & Terukur!"`.
- **Tab 2 - Paket / Katalog (`src/main.jsx`):**
  - Hero Katalog (`KATALOG WEDDING PACKAGE`, *"Abadikan Moment Bahagia"*, tombol `Lihat Semua Paket →`), Search bar, 4 kapsul kategori horizontal, dan daftar kartu paket horizontal (`BEST SELLER`, `PREMIUM`, `RECOMMENDED`, `NEW`, `SPECIAL`, pill `★ Paling Populer`, harga coret, harga aktif, tombol `+`).
- **Tab 3 - Portfolio & Sample (`src/main.jsx`):**
  - Header `✓ Verified CURATED ARCHIVES`, judul `Portfolio & Sample`, Search bar terintegrasi, filter pill (`Semua`, `Video Album`, `Foto`, `Album`, `Favorit`), Featured Video Album Card (`VIDEO ALBUM`, `01:45 Min`, `Sample Album Fullpress`, `Hardcover Fullpress`, `Tanya Paket ini →`), grid 2 kolom `Inspirasi Pilihan`, dan banner `Outdoor Romantic Sunset`.
- **Tab 4 - Pesanan Saya (`src/main.jsx`):**
  - Header `Pesanan Saya` + badge `2 Aktif`, filter pill (`Semua`, `Berjalan`, `Selesai`, `Dibatalkan`), kartu struk ivory kontras tinggi (`#f4f7f6` / `#e8efee`) dengan foto berlabel `STUDIO`/`OUTDOOR`, `TOTAL PAKET`, `UANG MUKA (DP)`, 3 tombol aksi (`Invoice`, `Progres`, `Jadwal`), pelacakan progres 7 tahap, dan kartu `BANTUAN 24/7`.
- **Halaman Fast Booking (`booking.html` / `booking.jsx`):**
  - Dilengkapi skrip anti-FOUC tema di `<head>`, sakelar `ThemeToggle`, dan kartu `.glass-card` adaptif.
- **Hukum Ponytail:** Logika tombol booking, DOKU / Midtrans checkout, form validation, dan query Supabase 100% utuh tanpa diubah.

## 17. STANDAR UI/UX ADMIN WORKSPACE (REVENUEPULSE AI FULL PACKAGE)
- **Floating Glass Sidebar (`src/admin.jsx`):**
  - Sidebar melayang (`md:rounded-3xl`, border `teal-400/15`) dengan logo heksagonal `Lapanbelas AI`, pengelompokan seksi (`ANALYTICS & ORDERS`, `DIVISIONS`, `OPERATIONS`, `SETTINGS`), dan pill menu aktif glowing teal.
- **Top Header Bar (`src/admin.jsx`):**
  - Search Bar pill interaktif (`Search...` + shortcut `⌘K` pembuka modal quick-jump menu), tombol notifikasi lonceng dengan titik merah, `ThemeToggle`, dan avatar lingkaran `LB` berdropdown.
- **4-Row Overview Dashboard (`src/admin/tabs/OverviewComponent.jsx`):**
  - *Baris 1:* Layout Terpadu Keuangan di Kiri (Total Revenue, Net Profit, Total HPP dengan persentase rapi tanpa bug desimal, Conversion & Margin) + Active Bookings & Wait DP di Ujung Kanan (lengkap dengan pill Klien, count Menunggu DP, dan dot-matrix grid 4x12 realtime).
  - *Baris 2:* `Revenue by Division` (Donut chart SVG 5 kolom) & `Client Acquisition & Events Breakdown` (Unified Layout 7 kolom menggabungkan 4 tahap funnel konversi, 3D stream wave, dan 4 status lifecycle: Lunas, Sudah DP, Wait DP, Acara H-7).
  - *Baris 3 (3 Kartu Analitik):* `Top Packages` (ranking progress bars), `Reminder Acara (H-7)` (kartu khusus daftar acara dekat 7 hari ke depan + countdown H-X + tombol WA pengingat otomatis), dan `Recent Account Activity` (aktivitas order realtime).
  - *Baris 4 (Tabel Khusus Pelunasan):* `Accounts Follow-Up (Pelunasan H+1)` khusus penagihan sisa tagihan bagi pesanan yang sudah melewati tanggal acara (H+1) dengan kolom Client, Health Score (merah overdue 45), Trend sparkline, Event Date, Paid Ratio, Sisa Tagihan, dan tombol aksi Email & WA.
- **Portal Kru Lapangan (`crew.html` & `src/crew.jsx`):**
  - Mengadopsi tema penuh **RevenuePulse AI** (`Lapanbelas AI • Crew`) dengan latar obsidian-teal `#020c0e`, floating glass sidebar di desktop (`WORKSPACE`, `SETTINGS & LEGAL`), 4 kartu KPI atas (Total Fee Cair + wave sparkline, Tugas Hari Ini + `3x12` dot-matrix grid, Fee Siap Klaim + rising curve, Perlu Respon + node line chart), kartu tugas `.rp-card`, kalender teal, dan seluruh modal glassmorphic tanpa mengubah logika bisnis/API.

## 18. MODERNISASI PORTAL SELEKSI FOTO KLIEN (`pilih-foto.html` & `src/client-portal.jsx`)
- **Shell HTML & Anti-FOUC (`pilih-foto.html`):**
  - Skrip inline anti-FOUC membaca `localStorage.getItem('18studio_theme') || 'dark'` dan menyinkronkan class `.dark`/`.light` sebelum render browser.
  - Tipografi Google Font `Plus Jakarta Sans`.
  - Background radial canvas `#020c0e` / `#072226` (Dark Mode) dan `#f0fdfa` / `#ccfbf1` (Light Mode).
  - Utility `.rp-card` glassmorphic dengan border teal presisi `rgba(45, 212, 191, 0.18)` dan shadow lembut.
- **Komponen React (`src/client-portal.jsx`):**
  - **Header:** Sticky obsidian-teal glassmorphism dengan logo, Order ID, cloud sync realtime pill (`☁️ Cloud Sync`), dan `ThemeToggle` sakelar mode terang/gelap.
  - **Multi-Package Sesi:** Tab paket aktif bergradasi `from-teal-900/90 to-cyan-950/90` dengan ring teal dan counter kuota per sesi.
  - **Sticky Progress Bar:** Bar progres gradasi emerald-teal (`from-teal-500 to-emerald-400`), status kuota pas, tombol bagikan galeri, salin kode, tambah kuota, dan tombol submit `SELESAI & REVIEW`.
  - **Filter, Pencarian & Grid:** Filter kapsul (Semua Foto, Terpilih, Belum Dipilih, Shortlist Favorit) bergradasi teal/emerald/rose, pencarian live, dan sakelar densitas grid (compact, normal, large).
  - **Kartu Foto:** Ring pilihan hijau-teal `#2dd4bf` dengan badge nomor urut, tombol hati shortlist, tombol centang foto, dan tombol download file asli resolusi penuh.
  - **Modal Catatan, Review Final & Panduan Drive:** Seluruh modal mengadopsi kartu `.rp-card` responsif di mobile dan desktop.
  - **Sanitasi & Auto-Detect Sesi (`server.js` `buildOrderSessions` & `src/client-portal.jsx`):**
    - Tag metadata internal `[HPP_ITEMS]: ...` dan `[TAG]: ...` pada deskripsi paket wajib dibersihkan terlebih dahulu sebelum regex pendeteksi multi-album dijalankan, sehingga teks URL-encoded seperti `%20Album%20Kolase%22%2C%22category...` tidak pernah bocor menjadi tab sesi.
    - Deteksi sesi tambahan dari `custom_fees` otomatis mengecualikan item non-foto (video/cinema, makeup/gaun, dekorasi/fluring/tenda, transport/akomodasi) dan menetapkan kuota `1` foto untuk item cetak bingkai (`cetak 24 inc +frem`, `16x24 inc`, dll.) agar ukuran inci tidak terbaca sebagai jumlah kuota foto.
  - **Hukum Ponytail:** Logika pemilihan kuota, debounced auto-sync `/api/save-photo-draft`, submit final `/api/submit-photo-selection`, dan PhotoLightboxModal 100% utuh tanpa regresi.

## 19. STANDAR MULTI-PAKET LINTAS DIVISI & ADD-ON BERKATEGORI
- **Invoice Multi-Paket (`invoice.html`):**
  - Mendukung pemesanan multi-paket (misal: *Platinum Package (Wedding)* + *Crown Package 2 (Lady Makeup)*, atau *Crown Package* + *Studio Romance*).
  - Sistem otomatis mencocokkan setiap paket tambahan dari `custom_fees` ke katalog `packages`, merendernya sebagai blok paket resmi lengkap dengan bullet points fasilitas dan badge `Paket Layanan`.
  - Halaman Syarat & Ketentuan (T&C) di bagian belakang invoice otomatis menghasilkan lembar T&C resmi untuk setiap divisi terkait (T&C Fotografi, T&C Lady Makeup, T&C Photo Studio, dan T&C Dekorasi).
- **Pengelompokan Add-On Admin (`AppointmentComponent.jsx`):**
  - Dropdown Add-on dipecah menjadi 5 pill filter kategori: `✨ Semua`, `💄 Makeup & Busana`, `📸 Foto & Cetak`, `🎬 Video & Drone`, `🎪 Dekorasi`.
  - Otomatis berpindah ke tab yang sesuai dengan divisi paket utama yang dipilih admin.
  - Dilengkapi tombol `+ Tambah Paket Divisi Lain` untuk menggabungkan paket antar divisi secara langsung ke kalkulasi tagihan.
- **Pengelompokan Add-On Klien Booking (`src/booking.jsx` & `src/main.jsx`):**
  - Dropdown Add-on dipecah menjadi 4 bagian yang jelas: `💄 Makeup Artis & Busana`, `📸 Foto & Cetak (Bingkai/Album)`, `🎬 Video Cinema & Drone`, dan `🎪 Dekorasi & Acara`, memudahkan klien memilih layanan tanpa campur aduk.
- **Bahasa Ramah Klien (Bebas Istilah Internal "Divisi" di Web Publik):**
  - Judul: `✨ Tambah Layanan Lainnya (Bundling)`
  - Tombol: `➕ Tambah Layanan Lain` / `✕ Batal`
  - Label Dropdown: `Pilih Kategori Layanan` & `Pilih Paket Layanan`
  - Deskripsi: *"Mau sekalian pesan layanan lainnya? (Contoh: Foto Studio + Makeup Rias, atau Wedding + Dekorasi). Seluruh rincian fasilitas & garansi langsung terbit rapi dalam 1 invoice resmi."*
  - Tombol Aksi: `✓ Masukkan Layanan Ini ke Pesanan Saya`









