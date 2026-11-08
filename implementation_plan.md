# IMPLEMENTATION PLAN: MULTI-PACKAGE & CATEGORIZED ADD-ONS (18STUDIO)

## 1. TUJUAN
Mendukung pemesanan multi-paket lintas divisi (contoh: Paket Foto Platinum + Paket Makeup Crown 2, atau Paket Makeup + Studio) dalam satu invoice:
- Rincian fasilitas pricelist untuk masing-masing paket muncul lengkap.
- Syarat & Ketentuan (T&C) di halaman belakang invoice memuat dokumen resmi dari setiap divisi yang dipesan.
- Pengelompokan Add-on berkategori (💄 Makeup, 📸 Foto & Cetak, 🎬 Video & Drone, 🎪 Dekorasi) dengan deteksi kontekstual otomatis agar klien dan admin tidak pusing.

---

## 2. TAHAPAN EKSEKUSI

### FASE 1: INVOICE MULTI-PAKET & MULTI-T&C (`invoice.html`)
- Mengambil data seluruh paket (paket utama + paket tambahan dari `custom_fees` atau `notes`).
- Jika item di `custom_fees` / `notes` cocok dengan nama paket di database `packages` (misal `Crown Package 2`, `Romance`, dsb):
  - Ambil deskripsi dan kategori paket tersebut.
  - Tampilkan sebagai blok paket tersendiri dengan bullet points fasilitas lengkap (bukan sekadar 1 baris add-on biasa).
- Sistem pendeteksi divisi (`hasWedding`, `hasMakeup`, `hasStudio`, `hasDecor`) otomatis mengenali semua divisi dari paket-paket tersebut.
- Lembar T&C di halaman belakang otomatis mencetak halaman T&C resmi untuk setiap divisi yang aktif.

### FASE 2: PENGELOMPOKAN ADD-ON DI DASHBOARD ADMIN (`AppointmentComponent.jsx`)
- Mengelompokkan daftar Add-on ke dalam 4 tab/pill kategori:
  - 💄 **Makeup & Busana**
  - 📸 **Foto & Cetak**
  - 🎬 **Video & Drone**
  - 🎪 **Dekorasi & Logistik**
- Filter otomatis: Saat paket utama dipilih (misal kategori Makeup), tab Add-on otomatis mengarah ke kategori Makeup.
- Fitur `+ Tambah Paket Divisi Lain` pada modal appointment untuk memilih paket besar kedua secara langsung dari daftar pricelist.

### FASE 3: PENGELOMPOKAN ADD-ON & REKOMENDASI DI BOOKING KLIEN (`src/booking.jsx` & `src/main.jsx`)
- Tampilan pemilihan Add-on di portal booking publik dibagi per kategori tab bersih.
- Tawaran rekomendasi cerdas lintas divisi yang ringkas dan ramah.

### FASE 4: VERIFIKASI & UPDATE AGENTS.MD
- Jalankan `npm run build` memastikan 0 error.
- Uji coba render invoice gabungan Foto + Makeup + Studio.
- Perbarui dokumentasi di `AGENTS.md`.
