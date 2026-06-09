# PROMPT COMMAND & TOKEN EFFICIENCY RULES

## 1. ATURAN PENGHEMATAN TOKEN (ANTI-BOCOR SALDO)
- **Strict Code Snippets:** JANGAN PERNAH menulis ulang seluruh isi file jika perubahan hanya terjadi di beberapa baris. Cukup tampilkan potongan kode (code snippet) yang berubah beserta baris pembungkusnya agar mudah disalin.
- **No Over-Explanation:** Berikan kode yang langsung siap pakai. Kurangi penjelasan teori yang panjang lebar, basa-basi pembuka ("Tentu, ini kodenya..."), atau kesimpulan di akhir chat. Langsung *to the point*.
- **Ignore Heavy Files:** Dilarang keras membaca, menganalisis, atau memasukkan file database (`temp.db`), file log (`*.log`, `vite.log`, `server.log`), atau folder build ke dalam konteks berpikir, kecuali diminta secara eksplisit.
- **Stop Auto-Indexing:** Jangan memindai seluruh direktori folder jika tugas yang diberikan hanya spesifik pada satu file atau satu fungsi saja.

## 2. PEMAHAMAN KONTEKS PROYEK (TEPAT SASARAN)
- **80% Completed Project:** Proyek ini sudah berjalan 80%. Tugas utama AI adalah **melanjutkan, memperbaiki bug, atau memoles**, BUKAN merombak arsitektur atau mengubah struktur yang sudah ada.
- **Maintain Existing Features:** Jangan pernah mengubah atau menghapus fitur, fungsi, nama variabel, atau rute API yang sudah berjalan normal, kecuali diperintahkan untuk *refactoring*.
- **Scope Restriction:** Fokus HANYA pada perubahan yang diminta. Jika mendeteksi ada kode lain yang kurang rapi di luar *scope* tugas, cukup beri tahu lewat komentar singkat, jangan langsung diubah sendiri.

## 3. STANDAR KUALITAS KODE (CLEAN & RESPONSIVE)
- **Clean Code:** Selalu berikan kode yang bersih, rapi, terstruktur, dan memiliki penamaan variabel yang intuitif (berbahasa Inggris untuk kode).
- **Full Responsiveness:** Setiap kali membuat atau memodifikasi komponen UI/HTML/CSS, pastikan kodenya 100% responsif (berfungsi sempurna dan rapi di tampilan Mobile Android/iOS maupun Desktop). Gunakan pendekatan *Mobile-First* jika memungkinkan.
- **Double-Check Logic:** Selalu cek kembali logika kode, penutupan kurung `}`, tanda koma, dan *syntax* sebelum memberikan jawaban untuk menghindari error mendasar.

## 4. CARA MENANGGAPI PERINTAH SINGKAT (AMBIGUITY HANDLING)
- Jika saya mengetik perintah singkat seperti *"lanjutkan"*, *"perbaiki"*, atau *"benerin"*, AI harus:
  1. Melihat riwayat chat terakhir untuk tahu bagian mana yang sedang dikerjakan.
  2. Mengidentifikasi file aktif yang sedang dibuka.
  3. Jika masih bingung atau butuh file lain, **WAJIB bertanya terlebih dahulu** (sebutkan nama filenya), jangan menebak sendiri yang berujung salah membaca file besar.