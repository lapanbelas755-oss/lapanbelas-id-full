import React, { useState, useEffect, useMemo } from 'react';
import { supabase, adminFetch, formatDateUI } from '../adminUtils';
import SvgIcon from '../SvgIcon';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

// Tradisi Milestone Ulang Tahun Pernikahan
const ANNIVERSARY_MILESTONES = {
  1: 'Kertas (Paper)',
  2: 'Kapas (Cotton)',
  3: 'Kulit (Leather)',
  4: 'Buah & Bunga (Fruit)',
  5: 'Kayu (Wood)',
  6: 'Gula & Besi (Iron)',
  7: 'Wol & Tembaga (Copper)',
  8: 'Perunggu (Bronze)',
  9: 'Tembikar (Pottery)',
  10: 'Timah (Tin)',
  15: 'Kristal (Crystal)',
  20: 'Porselen (China)',
  25: 'Perak (Silver Jubilee)',
  30: 'Mutiara (Pearl)',
  40: 'Ruby',
  50: 'Emas (Golden Jubilee)'
};

export default function AnniversaryComponent({ onShowToast, session, onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All'); // 'All' or '1'..'12'
  const [selectedYear, setSelectedYear] = useState('All'); // 'All' or '2024', '2025', etc.
  const [onlyToday, setOnlyToday] = useState(false);
  const [sendingMap, setSendingMap] = useState({});
  const [detailModal, setDetailModal] = useState(null);

  // Waktu saat ini (WIB)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();

  // Fetch appointments data
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, client_email, client_phone, client_address, package_name, event_date, resepsi_date, jam_akad, jam_resepsi, status, total_amount, dp_amount, created_at, additional_notes')
        .order('event_date', { ascending: false });

      if (error) {
        onShowToast('Gagal memuat data: ' + error.message, 'error');
      } else {
        setAppointments(data || []);
      }
    } catch (err) {
      onShowToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter pasangan Lapanbelas.id (Wedding) & ekstrak metadata akad nikah
  const weddingClients = useMemo(() => {
    return (appointments || [])
      .filter(appt => {
        if (!appt.event_date) return false;
        const notes = (appt.additional_notes || '').toLowerCase();
        const pkg = (appt.package_name || '').toLowerCase();

        // 1. Cek divisi lapanbelas.id
        const isLapanbelas = notes.includes('lapanbelas.id') || (!notes.includes('studio lapanbelas') && !notes.includes('lady makeup') && !notes.includes('lapanbelas dekorasi'));
        
        // 2. Cek paket pernikahan
        const isWeddingPkg = [
          'silver', 'gold', 'platinum', 'royal', 'bronze',
          'bravo', 'centro', 'delta', 'akad', 'wedding'
        ].some(k => pkg.includes(k));

        // 3. Status bukan yang dibatalkan
        const isNotCancelled = !['batal', 'cancelled', 'dibatalkan'].includes((appt.status || '').toLowerCase());

        return isLapanbelas && isWeddingPkg && isNotCancelled;
      })
      .map(appt => {
        const [yearStr, monthStr, dayStr] = appt.event_date.split('-');
        const weddingYear = parseInt(yearStr, 10);
        const weddingMonth = parseInt(monthStr, 10);
        const weddingDay = parseInt(dayStr, 10);

        // Ulang tahun tahun ini
        const thisYearAnniversary = new Date(currentYear, weddingMonth - 1, weddingDay);
        thisYearAnniversary.setHours(0, 0, 0, 0);

        // Hitung selisih hari dari hari ini
        const diffMs = thisYearAnniversary.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Berapa tahun pernikahan telah berjalan
        const yearsPassed = currentYear - weddingYear;

        // Cek apakah hari ini tepat tanggal akad nikah
        const isToday = weddingMonth === currentMonth && weddingDay === currentDay;

        // Cek status ucapan terakhir di notes
        const lastGreetingMatch = (appt.additional_notes || '').match(/\[LAST_ANNIVERSARY_GREETING\]:\s*([^\n]+)/);
        const lastGreeting = lastGreetingMatch ? lastGreetingMatch[1].trim() : null;

        return {
          ...appt,
          weddingYear,
          weddingMonth,
          weddingDay,
          thisYearAnniversary,
          diffDays,
          yearsPassed,
          isToday,
          lastGreeting,
          milestoneName: ANNIVERSARY_MILESTONES[yearsPassed] || `${yearsPassed} Tahun`
        };
      });
  }, [appointments, currentYear, currentMonth, currentDay, today]);

  // Hitung jumlah pasangan per bulan (1 - 12)
  const monthCounts = useMemo(() => {
    const counts = {};
    for (let m = 1; m <= 12; m++) counts[m] = 0;
    weddingClients.forEach(c => {
      if (c.weddingMonth >= 1 && c.weddingMonth <= 12) {
        counts[c.weddingMonth] = (counts[c.weddingMonth] || 0) + 1;
      }
    });
    return counts;
  }, [weddingClients]);

  // Daftar tahun unik untuk filter
  const availableYears = useMemo(() => {
    const set = new Set();
    weddingClients.forEach(c => {
      if (c.weddingYear) set.add(c.weddingYear);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [weddingClients]);

  // Hitung KPI
  const stats = useMemo(() => {
    const total = weddingClients.length;
    const thisMonthCount = weddingClients.filter(c => c.weddingMonth === currentMonth).length;
    const todayCount = weddingClients.filter(c => c.isToday).length;
    const greetingSentCount = weddingClients.filter(c => Boolean(c.lastGreeting)).length;

    return { total, thisMonthCount, todayCount, greetingSentCount };
  }, [weddingClients, currentMonth]);

  // Filter list aktif
  const filteredList = useMemo(() => {
    return weddingClients.filter(item => {
      // Filter Hari Ini
      if (onlyToday && !item.isToday) return false;

      // Filter Bulan
      if (selectedMonth !== 'All' && item.weddingMonth !== parseInt(selectedMonth, 10)) {
        return false;
      }

      // Filter Tahun Akad
      if (selectedYear !== 'All' && item.weddingYear !== parseInt(selectedYear, 10)) {
        return false;
      }

      // Filter Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.client_name || '').toLowerCase().includes(q);
        const matchId = (item.id || '').toLowerCase().includes(q);
        const matchPhone = (item.client_phone || '').toLowerCase().includes(q);
        const matchPkg = (item.package_name || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPhone && !matchPkg) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritaskan yang hari ini, lalu yang terdekat di masa depan, lalu yang lewat
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;

      // Bulan dan hari urutan kalender tahun berjalan
      if (a.weddingMonth !== b.weddingMonth) {
        return a.weddingMonth - b.weddingMonth;
      }
      return a.weddingDay - b.weddingDay;
    });
  }, [weddingClients, onlyToday, selectedMonth, selectedYear, searchQuery]);

  // Kirim Ucapan via API (Email & WhatsApp otomatis)
  const handleSendGreeting = async (item, channel = 'both') => {
    const key = `${item.id}-${channel}`;
    setSendingMap(prev => ({ ...prev, [key]: true }));
    onShowToast(`Mengirim ucapan anniversary ke ${item.client_name}...`, 'info');

    try {
      const res = await adminFetch('/api/admin/send-anniversary-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: item.id, channel })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onShowToast(data.message || `Ucapan berhasil terkirim ke ${item.client_name}! 🎉`, 'success');
        fetchAppointments();
      } else {
        onShowToast('Gagal: ' + (data.error || 'Terjadi kesalahan pengiriman'), 'error');
      }
    } catch (err) {
      onShowToast('Error server: ' + err.message, 'error');
    } finally {
      setSendingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  // Buka WhatsApp Web Langsung dengan Template Romantis Lapanbelas Studio
  const handleOpenWhatsAppDirect = (item) => {
    if (!item.client_phone) {
      onShowToast('Nomor WhatsApp klien tidak tersedia.', 'error');
      return;
    }
    const cleanPhone = item.client_phone.replace(/\D/g, '').replace(/^0/, '62');
    const tahunText = item.yearsPassed > 0 ? `ke-${item.yearsPassed}` : '';
    const pesan = `Halo Kak *${item.client_name || 'Pelanggan'}*! 💍✨\n\n` +
      `Selamat Ulang Tahun Pernikahan ${tahunText}! 🎉\n\n` +
      `Tidak terasa waktu berlalu sejak momen akad nikah sakral Kakak pada *${formatDateUI(item.event_date)}* yang kami abadikan dalam *${item.package_name || 'Lapanbelas Package'}*.\n\n` +
      `Kami dari keluarga besar *Lapanbelas Studio & Production* turut berbahagia dan mendoakan agar pernikahan Kakak selalu dipenuhi cinta, kebahagiaan, kehangatan, dan keberkahan setiap harinya. 🤲💖\n\n` +
      `Terima kasih telah mempercayakan momen terindah Kakak kepada kami. Semoga kenangan foto dan video yang kami tangkap selalu membawa senyuman di setiap waktu. 🙏\n\n` +
      `_Salam hangat,_\n*Tim Lapanbelas Studio* 📸✨`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 dark:bg-[#041617]/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/90 dark:border-teal-500/20 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <SvgIcon name="heart" className="w-5 h-5 fill-rose-500" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Anniversary Klien Lapanbelas.id
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/20">
              Wedding Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar ulang tahun pernikahan pasangan pengantin Lapanbelas.id berdasarkan <strong className="text-slate-800 dark:text-slate-200">Tanggal Akad Nikah</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchAppointments}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 active:scale-95"
          >
            <SvgIcon name="refresh-cw" className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-500' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* ================= 4 KPI CARDS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Pasangan Wedding */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-[#071d20]/80 border border-slate-200/90 dark:border-teal-500/20 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Pasangan</span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500">💍</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.total}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Klien Wedding Lapanbelas.id</p>
        </div>

        {/* Card 2: Anniversary Bulan Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-[#071d20]/80 border border-slate-200/90 dark:border-teal-500/20 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bulan Ini ({SHORT_MONTHS[currentMonth - 1]})</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">🌟</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{stats.thisMonthCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Merayakan bulan ini</p>
        </div>

        {/* Card 3: Hari Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent dark:from-rose-950/40 dark:via-[#071d20]/80 rounded-2xl border border-rose-500/30 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Hari Ini (H-0)</span>
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500 animate-pulse">🎉</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{stats.todayCount}</p>
          <p className="text-[11px] text-rose-500/90 dark:text-rose-300/80 mt-1">Tepat tanggal akad hari ini!</p>
        </div>

        {/* Card 4: Ucapan Terkirim */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-[#071d20]/80 border border-slate-200/90 dark:border-teal-500/20 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ucapan Tercatat</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">💌</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.greetingSentCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Klien telah disapa</p>
        </div>
      </div>

      {/* ================= 12 MONTH CAPSULE SELECTOR ================= */}
      <div className="bg-white/80 dark:bg-[#041617]/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/90 dark:border-teal-500/20 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span>📅</span> Pilih Bulan Akad Nikah:
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => { setSelectedMonth('All'); setOnlyToday(false); }}
              className={`px-3 py-1 rounded-xl font-bold text-xs transition ${
                selectedMonth === 'All' && !onlyToday
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              Semua Bulan ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => { setSelectedMonth(String(currentMonth)); setOnlyToday(false); }}
              className={`px-3 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                selectedMonth === String(currentMonth) && !onlyToday
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              <span>🌟</span> Bulan Ini ({stats.thisMonthCount})
            </button>
            <button
              type="button"
              onClick={() => setOnlyToday(prev => !prev)}
              className={`px-3 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                onlyToday
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>⚡</span> Hari Ini ({stats.todayCount})
            </button>
          </div>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2 pt-1">
          {MONTH_NAMES.map((mName, idx) => {
            const mNum = idx + 1;
            const count = monthCounts[mNum] || 0;
            const isCurrentM = mNum === currentMonth;
            const isSelected = selectedMonth === String(mNum) && !onlyToday;

            return (
              <button
                key={mNum}
                type="button"
                onClick={() => {
                  setSelectedMonth(String(mNum));
                  setOnlyToday(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition text-center relative group active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-teal-500 to-teal-700 text-white border-teal-400 shadow-md ring-2 ring-teal-400/30'
                    : isCurrentM
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isCurrentM && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-black" title="Bulan Berjalan" />
                )}
                <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : ''}`}>
                  {SHORT_MONTHS[idx]}
                </span>
                <span className={`text-[10px] mt-0.5 px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : count > 0
                    ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= SEARCH & FILTER CONTROLS ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 dark:bg-[#041617]/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/90 dark:border-teal-500/20 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari nama pengantin, ID pesanan, nomor telepon, atau paket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
          />
          <span className="absolute left-3.5 top-3 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">Tahun Akad:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
          >
            <option value="All">Semua Tahun</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= LIST PASANGAN ANNIVERSARY ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Menampilkan <strong className="text-slate-900 dark:text-white">{filteredList.length}</strong> Pasangan Pengantin
            {selectedMonth !== 'All' && ` • Bulan ${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}`}
            {selectedYear !== 'All' && ` • Tahun Akad ${selectedYear}`}
            {onlyToday && ` • Tepat Hari Ini`}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Memuat data pasangan wedding Lapanbelas.id...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 space-y-2">
            <div className="text-3xl">💍</div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada pasangan pada filter ini</p>
            <p className="text-xs text-slate-400">Silakan pilih bulan lain atau ubah kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => {
              const isSendingBoth = sendingMap[`${item.id}-both`];
              const isSendingEmail = sendingMap[`${item.id}-email`];

              // Styling banner hari ini
              const isH0 = item.isToday;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between p-5 rounded-3xl border transition shadow-sm backdrop-blur-md relative overflow-hidden group ${
                    isH0
                      ? 'bg-gradient-to-b from-rose-500/10 via-white to-white dark:from-rose-950/40 dark:via-[#051b1e] dark:to-[#031113] border-rose-500/40 ring-2 ring-rose-500/20 shadow-rose-500/10'
                      : 'bg-white/80 dark:bg-[#05181a]/90 hover:bg-white dark:hover:bg-[#072225] border-slate-200/90 dark:border-teal-500/20 hover:border-teal-500/40'
                  }`}
                >
                  {/* Glowing Indicator for Today */}
                  {isH0 && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-rose-600 to-pink-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-2xl shadow-md flex items-center gap-1">
                      <span>🎉</span> HARI INI!
                    </div>
                  )}

                  {/* Top: Couple Identity */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border shadow-sm ${
                        isH0
                          ? 'bg-rose-500 text-white border-rose-300'
                          : 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30'
                      }`}>
                        {(item.client_name || 'LB').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{item.client_name}</span>
                        </h3>
                        <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold truncate">
                          {item.package_name || 'Wedding Package'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          #{item.id}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Tanggal Akad & Milestone Usia */}
                    <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-2">
                      {/* Tanggal Akad */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                          <span>🕌</span> Akad Nikah:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {formatDateUI(item.event_date)} {item.jam_akad ? `(${item.jam_akad})` : ''}
                        </span>
                      </div>

                      {/* Milestone Usia Pernikahan */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                          <span>💍</span> Usia Menikah:
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                          {item.yearsPassed > 0 ? `Ulang Tahun Ke-${item.yearsPassed}` : 'Tahun Berjalan (Baru)'}
                        </span>
                      </div>

                      {/* Status Hari Menuju H-Anniversary */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400">Jadwal Tahun Ini:</span>
                        {isH0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                            🎉 Hari Ini Tepat Akad!
                          </span>
                        ) : item.diffDays > 0 ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            ⏳ {item.diffDays} hari lagi
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ✓ Terlewat tahun ini
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Riwayat Ucapan Terakhir */}
                    {item.lastGreeting && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 px-1">
                        <span>💌</span>
                        <span className="truncate">Tersapa: {item.lastGreeting.split('(')[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Button WA Web Direct */}
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppDirect(item)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        title="Buka WhatsApp dengan draft ucapan resmi"
                      >
                        <SvgIcon name="message-circle" className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>

                      {/* Button Email */}
                      <button
                        type="button"
                        onClick={() => handleSendGreeting(item, 'email')}
                        disabled={isSendingEmail || !item.client_email}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1 border border-slate-200 dark:border-white/10 active:scale-95 disabled:opacity-40"
                        title="Kirim email kartu ucapan resmi"
                      >
                        <SvgIcon name="mail" className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-spin text-teal-400' : ''}`} />
                        <span>Email</span>
                      </button>

                      {/* Button Detail Modal */}
                      <button
                        type="button"
                        onClick={() => setDetailModal(item)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 text-xs transition border border-slate-200 dark:border-white/10 active:scale-95"
                        title="Lihat Detail Pasangan"
                      >
                        <SvgIcon name="file-text" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= DETAIL MODAL ================= */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#071d20] border border-slate-200 dark:border-teal-500/30 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <button
              onClick={() => setDetailModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <SvgIcon name="x" className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-base">
                💍
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {detailModal.client_name}
                </h3>
                <p className="text-xs text-teal-600 dark:text-teal-400">{detailModal.package_name}</p>
                <p className="text-[10px] text-slate-400">Order ID: #{detailModal.id}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal Akad Nikah:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatDateUI(detailModal.event_date)}</span>
              </div>
              {detailModal.jam_akad && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Jam Akad:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{detailModal.jam_akad} WIB</span>
                </div>
              )}
              {detailModal.resepsi_date && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggal Resepsi:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{formatDateUI(detailModal.resepsi_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Usia Pernikahan:</span>
                <span className="font-bold text-teal-600 dark:text-teal-300">
                  {detailModal.yearsPassed} Tahun ({detailModal.milestoneName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor WhatsApp:</span>
                <span className="font-semibold text-slate-800 dark:text-white">{detailModal.client_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[200px]">{detailModal.client_email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Pembayaran:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{detailModal.status}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleOpenWhatsAppDirect(detailModal)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md"
              >
                <SvgIcon name="message-circle" className="w-4 h-4" />
                <span>Kirim Ucapan WA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(`/invoice.html?id=${detailModal.id}`, '_blank');
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold text-xs transition"
              >
                Lihat Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

