/**
 * WhatsApp Message Template Registry & Renderer
 * ------------------------------------------------------------
 * - Default templates reproduce the original hardcoded messages 1:1.
 * - Owner overrides are stored in Supabase `settings` table under key `wa_templates`
 *   as a JSON object: { [templateKey]: "custom body" }.
 * - Placeholder syntax: {{variable_name}}
 * - Rule: a line containing a placeholder whose value is empty is removed entirely
 *   (used for optional lines such as login password, room, maps link, etc.).
 */

const WA_TEMPLATES_SETTING_KEY = 'wa_templates';
const CACHE_TTL_MS = 60 * 1000;
const MAX_TEMPLATE_LENGTH = 4000;

const COMMON_VARS = {
  nama_klien: { desc: 'Nama klien', sample: 'Budi Santoso' },
  order_id: { desc: 'ID / nomor pesanan', sample: 'LB-240915-001' },
  paket: { desc: 'Nama paket yang dipesan', sample: 'Paket Wisuda Premium' }
};

const PAYMENT_VARS = {
  total: { desc: 'Total harga paket', sample: 'Rp 1.500.000' },
  dp: { desc: 'Nominal DP', sample: 'Rp 500.000' },
  sisa: { desc: 'Sisa pelunasan', sample: 'Rp 1.000.000' },
  link_portal: { desc: 'Link portal klien', sample: 'https://app.lapanbelas.id' },
  sandi_login: { desc: 'Sandi login portal (baris otomatis hilang jika kosong)', sample: 'ab12cd' }
};

const WA_TEMPLATE_DEFAULTS = {
  menunggu_dp: {
    label: 'Booking Baru / Menunggu DP',
    group: 'Pembayaran',
    description: 'Dikirim saat klien selesai booking dan belum membayar DP (bersama invoice PDF).',
    variables: { ...COMMON_VARS, ...PAYMENT_VARS },
    body:
`*LAPANBELAS.ID - MENUNGGU PEMBAYARAN DP* 🔔

Halo *{{nama_klien}}*,
Terima kasih telah melakukan pemesanan di *LAPANBELAS.ID*.

*Rincian Pesanan:* 
• *ID Pesanan:* #{{order_id}}
• *Pilihan Paket:* {{paket}}
• *Total Harga:* {{total}}
• *DP yang harus dibayar:* {{dp}}
• *Sisa Pelunasan:* {{sisa}}

Mohon lakukan pembayaran DP ke rekening resmi studio kami yang tertera di invoice/email.
Anda dapat memantau pesanan & mengunduh kuitansi resmi di portal klien kami:
🔗 *Website:* {{link_portal}}
🔑 *Booking ID:* \`{{order_id}}\`
🔑 *Sandi Login:* \`{{sandi_login}}\`

Terima kasih! Kami sangat bersemangat mendokumentasikan momen bahagia Anda. 🙏`
  },
  sudah_dp: {
    label: 'DP Terverifikasi',
    group: 'Pembayaran',
    description: 'Dikirim saat pembayaran DP berhasil diverifikasi (otomatis/manual).',
    variables: { ...COMMON_VARS, ...PAYMENT_VARS },
    body:
`*LAPANBELAS.ID - PEMBAYARAN DP TERVERIFIKASI* ✅

Halo *{{nama_klien}}*,
Terima kasih! Pembayaran DP Anda sebesar *{{dp}}* untuk pesanan *#{{order_id}}* telah kami terima dan verifikasi.

*Rincian Pesanan:* 
• *Pilihan Paket:* {{paket}}
• *Total Harga:* {{total}}
• *DP Dibayarkan:* {{dp}}
• *Sisa Pelunasan:* {{sisa}}

Anda dapat memantau pesanan & mengunduh kuitansi resmi di portal klien kami:
🔗 *Website:* {{link_portal}}
🔑 *Booking ID:* \`{{order_id}}\`
🔑 *Sandi Login:* \`{{sandi_login}}\`

Sampai jumpa di hari sesi pemotretan/acara! 🙏`
  },
  reminder_pelunasan: {
    label: 'Pengingat Pelunasan (Belum Lunas)',
    group: 'Pembayaran',
    description: 'Pengingat sisa tagihan setelah sesi foto/acara (otomatis & manual).',
    variables: { ...COMMON_VARS, ...PAYMENT_VARS },
    body:
`Halo Kak *{{nama_klien}}*! 🔔

Terima kasih atas sesi fotonya bersama LAPANBELAS.ID kemarin.
Untuk melanjutkan ke proses pengiriman link Drive dan editing, mohon bantuannya untuk menyelesaikan sisa pelunasan pesanan *#{{order_id}}* ya Kak.

💳 *Sisa Tagihan:* *{{sisa}}*

*Pembayaran Transfer:*
• Bank Mandiri: *1060019115370*
• a.n. *Muhammad Andreansyah*

Lihat invoice lengkap:
👉 {{link_portal}} (Booking ID: \`{{order_id}}\`)

Jika sudah melakukan pembayaran, silakan kirim bukti transfer ke sini ya Kak. Terima kasih! 🙏✨`
  },
  lunas: {
    label: 'Pembayaran Lunas',
    group: 'Pembayaran',
    description: 'Dikirim saat pesanan berstatus LUNAS (bersama invoice PDF).',
    variables: { ...COMMON_VARS, ...PAYMENT_VARS },
    body:
`Halo Kak *{{nama_klien}}*! 🎉

Pembayaran pelunasan untuk pesanan *#{{order_id}}* (*{{paket}}*) sudah kami terima dan berstatus *LUNAS*. Terima kasih banyak! ✨

Tim kami sedang menyiapkan file foto mentah Kakak ke Google Drive. Link pemilihan foto akan segera kami kirimkan ke WhatsApp ini ya. Mohon ditunggu! 😊

Terima kasih atas kepercayaannya pada LAPANBELAS.ID! 🙏`
  },
  reschedule: {
    label: 'Konfirmasi Reschedule Jadwal',
    group: 'Jadwal',
    description: 'Dikirim saat jadwal sesi klien berhasil dipindahkan.',
    variables: {
      ...COMMON_VARS,
      tanggal_baru: { desc: 'Tanggal jadwal baru', sample: 'Sabtu, 12 Oktober 2026' },
      jam_baru: { desc: 'Jam sesi baru', sample: '10:00' },
      ruangan: { desc: 'Ruangan studio (baris otomatis hilang jika kosong)', sample: 'Room A - Studio White' }
    },
    body:
`*LAPANBELAS.ID - KONFIRMASI RESCHEDULE JADWAL* 🗓️

Halo Kak *{{nama_klien}}*,
Permohonan reschedule untuk pesanan *#{{order_id}}* telah berhasil diproses di sistem kami.

📅 *Jadwal Baru:* {{tanggal_baru}}
⏰ *Jam Sesi:* {{jam_baru}} WIB
📦 *Paket:* {{paket}}
🏠 *Ruangan:* {{ruangan}}

Catatan jadwal di sistem kami telah otomatis disinkronkan. Terima kasih dan sampai jumpa di Studio Lapanbelas! ✨`
  },
  drive_link: {
    label: 'Link Drive / Portal Pilih Foto',
    group: 'Pengerjaan',
    description: 'Dikirim saat foto mentah sudah diunggah dan klien diminta memilih foto.',
    variables: {
      ...COMMON_VARS,
      link_pilih_foto: { desc: 'Link portal pilih foto', sample: 'https://app.lapanbelas.id/pilih-foto/LB-240915-001' },
      estimasi_pengerjaan: { desc: 'Estimasi lama pengerjaan', sample: 'Maks. 14 hari' }
    },
    body:
`*LAPANBELAS.ID - LINK GOOGLE DRIVE SELEKSI FOTO* 📁

Halo *{{nama_klien}}*,
Kabar bahagia! Seluruh foto mentah dari momen berharga Anda telah berhasil diunggah ke Google Drive kami.

Silakan masuk ke portal pemilihan foto pintar kami untuk memilih foto-foto terbaik yang ingin diproses editing:
🔗 *Portal Pilih Foto:* {{link_pilih_foto}}

*Rincian Pesanan:* 
• *ID Pesanan:* #{{order_id}}
• *Pilihan Paket:* {{paket}}
• *Estimasi Pengerjaan:* {{estimasi_pengerjaan}} (setelah selesai pilih foto)

*Langkah Memilih Foto:* 
1. Masuk ke link portal pilih foto di atas.
2. Klik foto-foto favorit Anda sesuai kuota paket.
3. Setelah selesai, klik tombol *Selesai* di bagian bawah portal.

⏱️ *Catatan:* Estimasi pengerjaan dihitung sejak Anda menyelesaikan pemilihan foto. Semakin cepat Anda memilih, semakin cepat pula hasil editingnya siap!

Terima kasih! 🙏`
  },
  reminder_pilih_foto: {
    label: 'Pengingat Pilih Foto',
    group: 'Pengerjaan',
    description: 'Pengingat untuk klien yang belum mengirim daftar foto pilihan.',
    variables: {
      ...COMMON_VARS,
      link_pilih_foto: { desc: 'Link portal pilih foto', sample: 'https://app.lapanbelas.id/pilih-foto/LB-240915-001' }
    },
    body:
`Halo Kak *{{nama_klien}}*! 📸

Mengingatkan kembali untuk pesanan *#{{order_id}}* (*{{paket}}*), saat ini kami masih menunggu daftar foto pilihan dari Kakak ya.

Pilih foto favorit Kakak langsung melalui link portal berikut:
👉 {{link_pilih_foto}}

Semakin cepat Kakak memilih foto, semakin cepat pula antrian editingnya siap kami proses! ✨

Jika ada kendala saat memilih foto, langsung kabari kami ya Kak. Terima kasih! 🙏`
  },
  progress_update: {
    label: 'Update Progres Editing',
    group: 'Pengerjaan',
    description: 'Dikirim setiap status pengerjaan foto/video berubah (kecuali status Done).',
    variables: {
      ...COMMON_VARS,
      status: { desc: 'Status pengerjaan terbaru', sample: 'Sedang Diedit' },
      persentase: { desc: 'Persentase progres', sample: '60%' },
      deskripsi_status: { desc: 'Penjelasan status (otomatis dari sistem)', sample: 'Foto pilihan Anda sedang diedit oleh editor profesional kami.' },
      estimasi_selesai: { desc: 'Baris estimasi selesai foto/video (otomatis, bisa kosong)', sample: '⏱️ *Estimasi Selesai Foto:* 20 Oktober 2026' },
      link_terkait: { desc: 'Baris link pilih foto / preview (otomatis, bisa kosong)', sample: '🔗 *Preview Foto:* https://drive.google.com/...' }
    },
    body:
`Halo Kak *{{nama_klien}}*! 🎨

Ada update progres pengerjaan untuk pesanan *#{{order_id}}* (*{{paket}}*):

📊 *Status:* *{{status}}* ({{persentase}})
_"{{deskripsi_status}}"_

{{estimasi_selesai}}

{{link_terkait}}

Proses sedang dikerjakan dengan teliti oleh tim kami. Mohon ditunggu ya Kak! 🙏✨`
  },
  album_siap: {
    label: 'Album Siap Diambil',
    group: 'Serah Terima',
    description: 'Dikirim saat album cetak selesai (bersama foto fisik album).',
    variables: {
      ...COMMON_VARS,
      lokasi_pengambilan: { desc: 'Alamat pengambilan album', sample: 'Studio Lapanbelas, Jl. Contoh No. 18' },
      link_maps: { desc: 'Link Google Maps (baris otomatis hilang jika kosong)', sample: 'https://maps.app.goo.gl/xxxx' },
      hari_buka: { desc: 'Hari operasional (baris otomatis hilang jika kosong)', sample: 'Senin - Sabtu' },
      hari_tutup: { desc: 'Hari libur (baris otomatis hilang jika kosong)', sample: 'Minggu' },
      jam_operasional: { desc: 'Jam operasional (baris otomatis hilang jika kosong)', sample: '09.00 - 17.30 WIB' }
    },
    body:
`*LAPANBELAS.ID - ALBUM FOTO ANDA SUDAH SELESAI DICETAK* 📦✨

Halo Kak *{{nama_klien}}*,
Kabar bahagia! Seluruh pesanan cetak & album dokumentasi Anda untuk pesanan *#{{order_id}}* (*{{paket}}*) kini sudah selesai dicetak dengan rapi dan kualitas terbaik! 🥰

Foto fisik album Kakak telah kami lampirkan di atas.

🏠 *Lokasi Pengambilan:* {{lokasi_pengambilan}}
📍 *Google Maps / Sharelock:* {{link_maps}}
📅 *Hari Operasional (Buka):* {{hari_buka}}
⛔ *Hari Tutup / Libur:* {{hari_tutup}}
⏰ *Jam Operasional:* {{jam_operasional}}

Silakan berkunjung ke studio kami untuk mengambil album berharga Kakak ya. Tim kami siap menyambut! Sampai jumpa di Studio Lapanbelas. 🙏❤️`
  },
  serah_terima: {
    label: 'Serah Terima Album + Minta Ulasan',
    group: 'Serah Terima',
    description: 'Dikirim saat album resmi diserahterimakan (bersama foto bukti serah terima).',
    variables: {
      ...COMMON_VARS,
      nama_penerima: { desc: 'Nama penerima / pengambil album', sample: 'Budi Santoso' },
      link_feedback: { desc: 'Link form ulasan', sample: 'https://app.lapanbelas.id/feedback/LB-240915-001' }
    },
    body:
`*LAPANBELAS.ID - TERIMA KASIH ATAS KEPERCAYAANNYA* 🙏✨

Halo Kak *{{nama_klien}}*,
Terima kasih banyak telah mempercayakan momen bahagianya bersama Studio Lapanbelas! Seluruh pesanan dokumentasi & album fisik telah resmi diserahterimakan kepada *{{nama_penerima}}* hari ini. 🥰

Boleh mohon bantuan waktu 1 menit untuk memberikan bintang & sedikit ulasan pengalaman Kakak bersama tim kami?
👉 {{link_feedback}}

Masukan dan saran Kakak sangat berharga untuk kami agar bisa melayani lebih baik lagi. Sampai jumpa di momen bahagia berikutnya ya Kak! ❤️`
  },
  feedback_request: {
    label: 'Permintaan Ulasan (Manual)',
    group: 'Serah Terima',
    description: 'Dikirim saat admin menekan tombol minta ulasan / feedback.',
    variables: {
      ...COMMON_VARS,
      link_feedback: { desc: 'Link form ulasan', sample: 'https://app.lapanbelas.id/feedback/LB-240915-001' }
    },
    body:
`Halo Kak *{{nama_klien}}*! 👋✨

Semoga Kakak dan keluarga selalu sehat dan suka dengan hasil dokumentasi dari LAPANBELAS.ID kemarin ya. 🥰

Boleh minta tolong waktu 1 menit untuk memberikan bintang & sedikit ulasan pengalaman Kakak bersama kami? Masukan Kakak sangat berharga untuk kami agar bisa terus memberikan yang terbaik:
👉 {{link_feedback}}

Terima kasih banyak atas kebaikan dan dukungannya ya Kak! 🙏❤️`
  },
  anniversary: {
    label: 'Ucapan Anniversary',
    group: 'Lainnya',
    description: 'Ucapan otomatis setiap tahun pernikahan klien wedding.',
    variables: {
      ...COMMON_VARS,
      tahun: { desc: 'Jumlah tahun sejak pernikahan', sample: '2' }
    },
    body:
`*LAPANBELAS.ID - HAPPY ANNIVERSARY!* 🎉💍

Halo Kak *{{nama_klien}}*,

Tidak terasa sudah *{{tahun}} tahun* berlalu sejak momen spesial pernikahan Kakak.

Kami dari keluarga besar Lapanbelas Studio turut berbahagia dan mendoakan agar pernikahan Kakak selalu dipenuhi cinta, kebahagiaan, dan keberkahan setiap harinya. ✨

Terima kasih telah mengizinkan kami mengabadikan cerita terindah tersebut.

Salam Hangat,
*Tim Lapanbelas Studio*`
  }
};

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Render template body with variables.
 * Lines containing an empty / unknown placeholder are dropped.
 */
function renderWaTemplate(body, vars = {}) {
  const source = typeof body === 'string' ? body : '';
  const outputLines = [];

  source.split('\n').forEach(line => {
    const names = [...line.matchAll(PLACEHOLDER_REGEX)].map(m => m[1]);
    if (names.length === 0) {
      outputLines.push(line);
      return;
    }
    const hasEmpty = names.some(name => {
      const val = vars[name];
      return val === undefined || val === null || String(val).trim() === '';
    });
    if (hasEmpty) return;
    outputLines.push(line.replace(PLACEHOLDER_REGEX, (_, name) => String(vars[name])));
  });

  return outputLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createWaTemplateService(supabase) {
  let cache = { data: null, fetchedAt: 0 };

  async function loadOverrides(force = false) {
    const now = Date.now();
    if (!force && cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.data;
    }
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', WA_TEMPLATES_SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      let parsed = {};
      if (data && data.value) {
        try {
          const obj = JSON.parse(data.value);
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) parsed = obj;
        } catch (e) {
          console.error('[WA Template] Invalid JSON in settings.wa_templates, using defaults.');
        }
      }
      cache = { data: parsed, fetchedAt: now };
      return parsed;
    } catch (err) {
      console.error('[WA Template] Failed to load overrides, using defaults:', err.message || err);
      return cache.data || {};
    }
  }

  function invalidateCache() {
    cache = { data: null, fetchedAt: 0 };
  }

  /**
   * Build final WhatsApp message for a template key. Never throws:
   * falls back to the default template if anything goes wrong.
   */
  async function buildWaMessage(key, vars = {}) {
    const def = WA_TEMPLATE_DEFAULTS[key];
    if (!def) {
      console.error(`[WA Template] Unknown template key: ${key}`);
      return '';
    }
    try {
      const overrides = await loadOverrides();
      const custom = overrides[key];
      const body = typeof custom === 'string' && custom.trim() ? custom : def.body;
      const rendered = renderWaTemplate(body, vars);
      return rendered || renderWaTemplate(def.body, vars);
    } catch (err) {
      console.error(`[WA Template] Render failed for ${key}, using default:`, err.message || err);
      return renderWaTemplate(def.body, vars);
    }
  }

  async function listTemplates() {
    const overrides = await loadOverrides(true);
    return Object.entries(WA_TEMPLATE_DEFAULTS).map(([key, def]) => {
      const custom = typeof overrides[key] === 'string' && overrides[key].trim() ? overrides[key] : null;
      return {
        key,
        label: def.label,
        group: def.group,
        description: def.description,
        variables: Object.entries(def.variables).map(([name, meta]) => ({ name, desc: meta.desc, sample: meta.sample })),
        defaultBody: def.body,
        body: custom || def.body,
        isCustom: Boolean(custom)
      };
    });
  }

  /**
   * Save overrides. `templates` = { key: body }. Empty body or body identical
   * to default removes the override (falls back to default).
   */
  async function saveTemplates(templates = {}) {
    if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
      throw new Error('Format data template tidak valid.');
    }
    const current = await loadOverrides(true);
    const next = { ...current };

    for (const [key, body] of Object.entries(templates)) {
      const def = WA_TEMPLATE_DEFAULTS[key];
      if (!def) throw new Error(`Template "${key}" tidak dikenal.`);
      if (body !== null && typeof body !== 'string') throw new Error(`Isi template "${def.label}" tidak valid.`);
      const normalized = (body || '').replace(/\r\n/g, '\n');
      if (normalized.length > MAX_TEMPLATE_LENGTH) {
        throw new Error(`Template "${def.label}" terlalu panjang (maks. ${MAX_TEMPLATE_LENGTH} karakter).`);
      }
      const unknownVars = [...normalized.matchAll(PLACEHOLDER_REGEX)]
        .map(m => m[1])
        .filter(name => !def.variables[name]);
      if (unknownVars.length > 0) {
        throw new Error(`Template "${def.label}" memakai variabel tidak dikenal: ${[...new Set(unknownVars)].map(v => `{{${v}}}`).join(', ')}`);
      }
      if (!normalized.trim() || normalized.trim() === def.body.trim()) {
        delete next[key];
      } else {
        next[key] = normalized;
      }
    }

    const { error } = await supabase
      .from('settings')
      .upsert([{ key: WA_TEMPLATES_SETTING_KEY, value: JSON.stringify(next) }]);
    if (error) throw new Error(error.message);

    invalidateCache();
    return listTemplates();
  }

  function buildSampleVars(key) {
    const def = WA_TEMPLATE_DEFAULTS[key];
    if (!def) return {};
    const vars = {};
    Object.entries(def.variables).forEach(([name, meta]) => { vars[name] = meta.sample; });
    return vars;
  }

  return { buildWaMessage, listTemplates, saveTemplates, buildSampleVars, invalidateCache };
}

module.exports = {
  WA_TEMPLATE_DEFAULTS,
  renderWaTemplate,
  createWaTemplateService
};
