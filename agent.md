# AI Bootstrap

Before starting any task, read in order:

1. rules.md
2. PROJECT_CONTEXT.md
3. ARCHITECTURE.md
4. package.json

These files are the primary source of truth for the project.

# Project Rules

Stack:
- Backend: Node.js + Express.js (dalam server.js)
- Frontend: React 19 + Vite + Tailwind CSS v4
- Database: Supabase

Rules (Mandatory):
- **Surgical Edits Only:** Dilarang menimpa file `server.js` atau komponen besar secara penuh. Gunakan surgical replace per blok fungsi/endpoint.
- **Zero Placeholders:** Dilarang menggunakan `// TODO`, `// tambahkan logika di sini`, atau kode setengah jadi.
- **Anti-Regression Audit:** Cek dependensi fungsi sebelum mengedit agar tidak merusak fitur lama/format response API yang sudah ada.
- **Wajib Verifikasi Sebelum Selesai:** Jalankan `npm run check` (syntax check & vite build) sebelum menyatakan pekerjaan selesai.
- **Efficiency:** Jangan scan folder `node_modules`, `dist`, file log, atau database `temp.db`.
- **Tampilkan Rencana:** Tampilkan poin rencana perubahan sebelum melakukan modifikasi signifikan.