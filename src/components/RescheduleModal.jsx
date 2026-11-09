import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RescheduleModal({
  isOpen,
  onClose,
  order,
  userEmail,
  onRescheduleSuccess,
  showToast
}) {
  if (!isOpen || !order) return null;

  const notesStr = order.notes || order.additional_notes || '';
  const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
  const roomName = roomMatch ? roomMatch[1].trim() : (order.division || 'Studio Lapanbelas');

  const pkgTitle = order.pkg ? order.pkg.title : (order.package_name || 'Layanan Studio');
  const pkgCategory = order.pkg && order.pkg.category ? order.pkg.category.toLowerCase() : '';
  const division = (order.division || '').toLowerCase();

  const isStudio = division.includes('studio') || 
    ['family', 'maternity', 'group', 'graduation', 'personal', 'couple', 'prewedding studio', 'poto product', 'wisuda', 'pas foto'].some(c => pkgCategory.includes(c) || division.includes(c));

  // Ekstraksi Tanggal Multi-Sesi
  const curAkadDate = order.eventDate || order.event_date;
  const curResepsiDate = order.resepsiDate || order.resepsi_date;
  const prewedMatch = notesStr.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const curPrewedDate = order.prewedDate || order.prewed_date || (prewedMatch ? prewedMatch[1] : null);

  const hasResepsi = Boolean(curResepsiDate && curResepsiDate !== curAkadDate);
  const hasPrewed = Boolean(curPrewedDate && curPrewedDate !== curAkadDate);
  const isMultiDate = hasResepsi || hasPrewed;

  // Sesi yang dipilih untuk di-reschedule: 'akad' | 'resepsi' | 'prewed' | 'all'
  const [targetSession, setTargetSession] = useState('akad');

  // Hitung batas minimum hari pengajuan
  const minNoticeDays = isStudio ? 2 : 14;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tanggal target saat ini berdasarkan sesi yang dipilih
  const getReferenceCurrentDate = () => {
    if (targetSession === 'resepsi' && curResepsiDate) return new Date(curResepsiDate);
    if (targetSession === 'prewed' && curPrewedDate) return new Date(curPrewedDate);
    if (targetSession === 'all') {
      const dates = [curAkadDate, curResepsiDate, curPrewedDate].filter(Boolean).map(d => new Date(d));
      return new Date(Math.min(...dates.map(d => d.getTime())));
    }
    return new Date(curAkadDate);
  };

  const refDateObj = getReferenceCurrentDate();
  refDateObj.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((refDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isEligibleByDeadline = diffDays >= minNoticeDays;

  // Tanggal minimal yang bisa dipilih: besok
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState(order.time || order.jam_akad || '10:00');
  
  // State untuk sesi resepsi / prewed saat mode 'all'
  const [newResepsiDate, setNewResepsiDate] = useState('');
  const [newResepsiTime, setNewResepsiTime] = useState(order.jam_resepsi || '10:00');
  const [newPrewedDate, setNewPrewedDate] = useState('');

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Availability status state
  const [dateChecking, setDateChecking] = useState(false);
  const [dateAvailability, setDateAvailability] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);

  // Availability status khusus resepsi & prewed saat 'all'
  const [resepsiChecking, setResepsiChecking] = useState(false);
  const [resepsiAvailability, setResepsiAvailability] = useState(null);

  const [prewedChecking, setPrewedChecking] = useState(false);
  const [prewedAvailability, setPrewedAvailability] = useState(null);

  useEffect(() => {
    setTargetSession('akad');
    setNewDate('');
    setNewResepsiDate('');
    setNewPrewedDate('');
    setReason('');
    setErrorMessage('');
    setIsSubmitting(false);
    setDateAvailability(null);
    setResepsiAvailability(null);
    setPrewedAvailability(null);
    setBookedSlots([]);
  }, [order]);

  // Reset newDate when targetSession changes
  useEffect(() => {
    setNewDate('');
    setDateAvailability(null);
    setErrorMessage('');
  }, [targetSession]);

  // SOP Jam Operasional Studio: 09:00 - 17:30 WIB (sesi terakhir mulai maksimal pukul 17:00 WIB)
  const studioTimeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00'
  ];

  // Helper check ketersediaan via API
  const fetchDateAvailability = async (targetDate) => {
    if (!targetDate) return null;
    const catQuery = isStudio ? 'studio' : (division || '');
    const res = await axios.get(`/api/public/booked-slots/${targetDate}?category=${encodeURIComponent(catQuery)}`);
    if (res.data && res.data.success) {
      const avail = res.data.dateAvailability;
      const slots = res.data.bookedSlots || [];
      const nonStudio = res.data.nonStudioAppointments || [];

      if (isStudio) {
        const isClosed = avail && Boolean(avail.is_manually_closed);
        return {
          slots,
          available: !isClosed,
          isFull: false,
          isClosed,
          message: isClosed 
            ? 'Tanggal ini sedang ditutup oleh pihak Studio 18. Silakan pilih tanggal lain.' 
            : 'Studio buka (09.00 – 17.30 WIB). Silakan pilih jam sesi yang tersedia di bawah.'
        };
      } else {
        const isClosed = avail && Boolean(avail.is_manually_closed);
        const max = (avail && avail.max_slots) ? avail.max_slots : 2;
        const currentBooked = nonStudio.filter(a => a.id !== order.id).length;
        const remaining = Math.max(0, max - currentBooked);

        if (isClosed) {
          return {
            slots: [],
            available: false,
            isFull: false,
            isClosed: true,
            message: 'Tanggal ini telah ditutup oleh pihak 18Studio. Silakan pilih tanggal lain.'
          };
        } else if (remaining <= 0) {
          return {
            slots: [],
            available: false,
            isFull: true,
            isClosed: false,
            message: `Kuota untuk tanggal ini sudah penuh (${currentBooked}/${max} slot terisi). Silakan pilih tanggal lain.`
          };
        } else {
          return {
            slots: [],
            available: true,
            isFull: false,
            isClosed: false,
            slotsLeft: remaining,
            message: `Tanggal tersedia! Masih tersisa ${remaining} dari total ${max} slot kuota.`
          };
        }
      }
    }
    return null;
  };

  // Pengecekan Ketersediaan Tanggal Utama Real-Time
  useEffect(() => {
    if (!newDate) {
      setDateAvailability(null);
      setBookedSlots([]);
      return;
    }

    let isMounted = true;
    const runCheck = async () => {
      setDateChecking(true);
      try {
        const result = await fetchDateAvailability(newDate);
        if (!isMounted) return;
        if (result) {
          setBookedSlots(result.slots || []);
          setDateAvailability(result);
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Gagal memverifikasi slot tanggal:', err);
        setDateAvailability(null);
      } finally {
        if (isMounted) setDateChecking(false);
      }
    };

    runCheck();
    return () => { isMounted = false; };
  }, [newDate, isStudio, division, order.id]);

  // Pengecekan Ketersediaan Resepsi saat Mode 'all'
  useEffect(() => {
    if (targetSession !== 'all' || !newResepsiDate) {
      setResepsiAvailability(null);
      return;
    }

    let isMounted = true;
    const runCheck = async () => {
      setResepsiChecking(true);
      try {
        const result = await fetchDateAvailability(newResepsiDate);
        if (!isMounted) return;
        if (result) setResepsiAvailability(result);
      } catch (err) {
        if (!isMounted) return;
        setResepsiAvailability(null);
      } finally {
        if (isMounted) setResepsiChecking(false);
      }
    };

    runCheck();
    return () => { isMounted = false; };
  }, [newResepsiDate, targetSession]);

  // Pengecekan Ketersediaan Prewed saat Mode 'all'
  useEffect(() => {
    if (targetSession !== 'all' || !newPrewedDate) {
      setPrewedAvailability(null);
      return;
    }

    let isMounted = true;
    const runCheck = async () => {
      setPrewedChecking(true);
      try {
        const result = await fetchDateAvailability(newPrewedDate);
        if (!isMounted) return;
        if (result) setPrewedAvailability(result);
      } catch (err) {
        if (!isMounted) return;
        setPrewedAvailability(null);
      } finally {
        if (isMounted) setPrewedChecking(false);
      }
    };

    runCheck();
    return () => { isMounted = false; };
  }, [newPrewedDate, targetSession]);

  // Cek apakah jam sesi studio tertentu sudah terisi di ruangan yang sama
  const isSlotTaken = (slotTime) => {
    if (!isStudio || !bookedSlots || bookedSlots.length === 0) return false;

    const mapRoomKey = (name) => {
      if (!name) return '';
      const t = name.toLowerCase().trim();
      if (t.includes('studio white') || t.includes('limbo') || t.includes('room a') || t.includes('room 1')) return 'limbo';
      if (t.includes('luxury') || t.includes('room b') || t.includes('room 2')) return 'luxury';
      if (t.includes('colorful') || t.includes('modern') || t.includes('room c') || t.includes('room 3')) return 'modern';
      if (t.includes('classic') || t.includes('abstrak') || t.includes('kubah') || t.includes('room d') || t.includes('room 4')) return 'abstrak';
      if (t.includes('outdoor') || t.includes('garden') || t.includes('custom') || t.includes('room e') || t.includes('room 5')) return 'custom';
      return t;
    };

    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const m = String(timeStr).match(/(\d{1,2}):(\d{2})/);
      if (!m) return 0;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };

    const targetKey = mapRoomKey(roomName);
    const targetStart = timeToMinutes(slotTime);
    const targetEnd = targetStart + 45;

    return bookedSlots.some(ex => {
      const exNotes = ex.additional_notes || '';
      const exRoomMatch = exNotes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
      const exRoom = exRoomMatch ? exRoomMatch[1].trim() : '';

      let exTimeStr = ex.jam_akad ? ex.jam_akad.slice(0, 5) : '';
      const exJamMatch = exNotes.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
      if (exJamMatch) exTimeStr = exJamMatch[1].trim();

      let exDur = 45;
      const exDurMatch = exNotes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
      if (exDurMatch) exDur = parseInt(exDurMatch[1].trim(), 10);

      if (mapRoomKey(exRoom) === targetKey && exTimeStr) {
        const exStart = timeToMinutes(exTimeStr);
        const exEnd = exStart + exDur;
        return targetStart < exEnd && targetEnd > exStart;
      }
      return false;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (targetSession === 'all') {
      if (!newDate) {
        setErrorMessage('Silakan pilih tanggal acara utama/akad baru.');
        return;
      }
      if (hasResepsi && !newResepsiDate) {
        setErrorMessage('Silakan pilih tanggal resepsi baru.');
        return;
      }
      if (hasPrewed && !newPrewedDate) {
        setErrorMessage('Silakan pilih tanggal prewedding baru.');
        return;
      }
    } else {
      if (!newDate) {
        setErrorMessage('Silakan pilih tanggal baru.');
        return;
      }
    }

    if (targetSession !== 'prewed' && !newTime) {
      setErrorMessage('Silakan tentukan jam sesi baru.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        order_id: order.id,
        target_session: targetSession,
        new_date: newDate,
        new_time: newTime,
        new_resepsi_date: targetSession === 'resepsi' ? newDate : newResepsiDate,
        new_resepsi_time: targetSession === 'resepsi' ? newTime : newResepsiTime,
        new_prewed_date: targetSession === 'prewed' ? newDate : newPrewedDate,
        reason: reason.trim(),
        verification_contact: order.client_phone || userEmail || ''
      };

      const res = await axios.post('/api/reschedule-booking', payload);

      if (res.data && res.data.success) {
        if (showToast) {
          showToast(res.data.message || 'Jadwal berhasil di-reschedule!', 'success');
        }
        if (onRescheduleSuccess) {
          onRescheduleSuccess(newDate, newTime);
        }
        onClose();
      }
    } catch (err) {
      console.error('[Reschedule Error]:', err);
      const apiError = err.response && err.response.data && err.response.data.error
        ? err.response.data.error
        : 'Gagal mengajukan reschedule. Silakan coba lagi atau hubungi Admin WhatsApp.';
      setErrorMessage(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateVal;
    }
  };

  // Label sesi target
  const getSessionTitle = () => {
    switch (targetSession) {
      case 'resepsi': return 'Sesi Resepsi';
      case 'prewed': return 'Sesi Prewedding';
      case 'all': return 'Semua Tanggal Acara';
      default: return isStudio ? 'Sesi Studio' : 'Sesi Akad / Acara Utama';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-lg bg-[#141416]/95 border border-white/10 rounded-3xl p-6 sm:p-7 text-left shadow-2xl overflow-y-auto max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all duration-200"
          aria-label="Tutup"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shrink-0">
            🗓️
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">
              Ajukan Reschedule Jadwal
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Pesanan #{order.id} &bull; {pkgTitle}
            </p>
          </div>
        </div>

        {/* Current Schedule Info Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Jadwal Saat Ini
            </span>
            {isMultiDate && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium">
                {hasPrewed && hasResepsi ? 'Paket 3 Tanggal' : 'Paket 2 Tanggal (Beda Hari)'}
              </span>
            )}
          </div>

          {/* Tanggal Akad / Acara Utama */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-300 flex items-center gap-1.5">
              <span>💍</span>
              <span>{isStudio ? 'Tanggal Photoshoot:' : 'Tanggal Akad / Acara:'}</span>
            </span>
            <span className="font-semibold text-white">
              {formatDateDisplay(curAkadDate)} ({order.time || order.jam_akad || '-'} WIB)
            </span>
          </div>

          {/* Tanggal Resepsi (jika ada) */}
          {hasResepsi && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 flex items-center gap-1.5">
                <span>👑</span>
                <span>Tanggal Resepsi:</span>
              </span>
              <span className="font-semibold text-amber-300">
                {formatDateDisplay(curResepsiDate)} ({order.jam_resepsi || '10:00'} WIB)
              </span>
            </div>
          )}

          {/* Tanggal Prewedding (jika ada) */}
          {hasPrewed && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 flex items-center gap-1.5">
                <span>📸</span>
                <span>Tanggal Prewedding:</span>
              </span>
              <span className="font-semibold text-sky-300">
                {formatDateDisplay(curPrewedDate)}
              </span>
            </div>
          )}

          {roomName && isStudio && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10">
              <span className="text-gray-300">Ruangan Studio:</span>
              <span className="font-semibold text-teal-400">{roomName}</span>
            </div>
          )}
        </div>

        {/* Multi-Session Selector Tabs (jika paket multi-tanggal) */}
        {isMultiDate && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Pilih Sesi yang Ingin Di-Reschedule:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTargetSession('akad')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                  targetSession === 'akad'
                    ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>💍 Akad Saja</span>
                <span className={`text-[9px] ${targetSession === 'akad' ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                  {formatDateDisplay(curAkadDate).split(' ')[0]} {formatDateDisplay(curAkadDate).split(' ')[1]}
                </span>
              </button>

              {hasResepsi && (
                <button
                  type="button"
                  onClick={() => setTargetSession('resepsi')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                    targetSession === 'resepsi'
                      ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>👑 Resepsi Saja</span>
                  <span className={`text-[9px] ${targetSession === 'resepsi' ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                    {formatDateDisplay(curResepsiDate).split(' ')[0]} {formatDateDisplay(curResepsiDate).split(' ')[1]}
                  </span>
                </button>
              )}

              {hasPrewed && (
                <button
                  type="button"
                  onClick={() => setTargetSession('prewed')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                    targetSession === 'prewed'
                      ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>📸 Prewed Saja</span>
                  <span className={`text-[9px] ${targetSession === 'prewed' ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                    {formatDateDisplay(curPrewedDate).split(' ')[0]} {formatDateDisplay(curPrewedDate).split(' ')[1]}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setTargetSession('all')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                  targetSession === 'all'
                    ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>🔄 Semua Tanggal</span>
                <span className={`text-[9px] ${targetSession === 'all' ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                  {hasPrewed && hasResepsi ? '3 Sesi Sekaligus' : 'Akad & Resepsi'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Policy Notice Box */}
        <div className={`rounded-2xl p-3.5 mb-5 text-xs flex gap-2.5 items-start border ${
          isEligibleByDeadline 
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          <span className="text-base shrink-0">
            {isEligibleByDeadline ? 'ℹ️' : '⚠️'}
          </span>
          <div className="leading-relaxed">
            {isEligibleByDeadline ? (
              <>
                <p className="font-semibold text-white mb-0.5">
                  Ketentuan Reschedule ({getSessionTitle()}):
                </p>
                <p>
                  {isStudio 
                    ? 'Reschedule sesi studio minimal H-2 sebelum sesi. Slot baru otomatis diverifikasi agar tidak bentrok dengan pemesan lain.' 
                    : `Reschedule ${getSessionTitle()} minimal H-14 sebelum tanggal acara saat ini. Kuota tanggal baru akan otomatis divalidasi.`}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-white mb-0.5">Batas Waktu Terlewat:</p>
                <p>
                  Pengajuan otomatis minimal H-{minNoticeDays} sebelum sesi terkait (tersisa ${diffDays} hari). Silakan hubungi Admin WhatsApp Studio 18 untuk koordinasi darurat.
                </p>
              </>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3.5 rounded-2xl text-xs mb-4 flex items-start gap-2 animate-in fade-in duration-200">
            <span className="shrink-0 text-sm">⚠️</span>
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Form Reschedule */}
        {isEligibleByDeadline ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* MODE SINGLE SESI ATAU SESI TERTENTU */}
            {targetSession !== 'all' ? (
              <>
                {/* Input Tanggal Baru */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Pilih Tanggal Baru untuk {getSessionTitle()} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={minDateStr}
                    value={newDate}
                    onChange={(e) => {
                      setNewDate(e.target.value);
                      setErrorMessage('');
                    }}
                    required
                    className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
                  />

                  {/* Alert Status Ketersediaan Tanggal */}
                  {dateChecking && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-2 animate-pulse">
                      <span className="animate-spin text-xs">⏳</span>
                      <span>Memeriksa ketersediaan kuota tanggal {formatDateDisplay(newDate)}...</span>
                    </div>
                  )}

                  {!dateChecking && dateAvailability && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-[11px] flex items-start gap-2 animate-in fade-in ${
                      dateAvailability.available
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/30 text-red-300'
                    }`}>
                      <span className="text-sm shrink-0">{dateAvailability.available ? '🟢' : '🔴'}</span>
                      <div className="leading-snug">
                        <strong className="block mb-0.5 text-white">
                          {dateAvailability.available ? 'Tanggal Tersedia' : 'Tanggal Tidak Tersedia / Penuh'}
                        </strong>
                        <span>{dateAvailability.message}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pilihan Jam (Kecuali Prewed) */}
                {targetSession !== 'prewed' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-300">
                        Pilih Jam Sesi Baru <span className="text-red-400">*</span>
                      </label>
                      {isStudio && (
                        <span className="text-[10px] text-amber-400 font-medium">
                          SOP: 09.00 – 17.30 WIB
                        </span>
                      )}
                    </div>

                    {isStudio ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {studioTimeSlots.map((slot) => {
                            const taken = isSlotTaken(slot);
                            const isSelected = newTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={taken}
                                onClick={() => {
                                  setNewTime(slot);
                                  setErrorMessage('');
                                }}
                                className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                                  taken
                                    ? 'bg-red-500/10 border-red-500/25 text-red-400/60 cursor-not-allowed opacity-60'
                                    : isSelected
                                    ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                                }`}
                              >
                                <span className={taken ? 'line-through' : ''}>{slot}</span>
                                <span className={`text-[8.5px] ${taken ? 'text-red-400 font-normal' : isSelected ? 'text-black/80 font-bold' : 'text-emerald-400'}`}>
                                  {taken ? 'Terisi' : 'Tersedia'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-gray-400/90 leading-tight">
                          *Jam sesi studio berlangsung 45 menit + jeda persiapan ruangan.
                        </p>
                      </div>
                    ) : (
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        required
                        className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              /* MODE 'ALL' (GANTI SEMUA TANGGAL) */
              <div className="space-y-4">
                {/* 1. Tanggal Akad / Utama */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>💍</span> 1. Tanggal Baru Akad / Acara Utama *
                  </span>
                  <input
                    type="date"
                    min={minDateStr}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
                  />
                  {dateChecking && (
                    <p className="text-[10px] text-blue-300 animate-pulse">Memeriksa kuota akad...</p>
                  )}
                  {!dateChecking && dateAvailability && (
                    <p className={`text-[10px] font-medium ${dateAvailability.available ? 'text-emerald-400' : 'text-red-400'}`}>
                      {dateAvailability.available ? '🟢 ' : '🔴 '} {dateAvailability.message}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-400">Jam Akad:</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                {/* 2. Tanggal Resepsi (jika ada) */}
                {hasResepsi && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>👑</span> 2. Tanggal Baru Resepsi *
                    </span>
                    <input
                      type="date"
                      min={minDateStr}
                      value={newResepsiDate}
                      onChange={(e) => setNewResepsiDate(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
                    />
                    {resepsiChecking && (
                      <p className="text-[10px] text-blue-300 animate-pulse">Memeriksa kuota resepsi...</p>
                    )}
                    {!resepsiChecking && resepsiAvailability && (
                      <p className={`text-[10px] font-medium ${resepsiAvailability.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {resepsiAvailability.available ? '🟢 ' : '🔴 '} {resepsiAvailability.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-gray-400">Jam Resepsi:</label>
                      <input
                        type="time"
                        value={newResepsiTime}
                        onChange={(e) => setNewResepsiTime(e.target.value)}
                        className="bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Tanggal Prewedding (jika ada) */}
                {hasPrewed && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <span>📸</span> 3. Tanggal Baru Prewedding *
                    </span>
                    <input
                      type="date"
                      min={minDateStr}
                      value={newPrewedDate}
                      onChange={(e) => setNewPrewedDate(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
                    />
                    {prewedChecking && (
                      <p className="text-[10px] text-blue-300 animate-pulse">Memeriksa kuota prewedding...</p>
                    )}
                    {!prewedChecking && prewedAvailability && (
                      <p className={`text-[10px] font-medium ${prewedAvailability.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {prewedAvailability.available ? '🟢 ' : '🔴 '} {prewedAvailability.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Input Alasan */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Alasan Reschedule (Opsional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Ada keperluan mendadak / bentrok acara keluarga..."
                rows={2}
                className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !newDate ||
                  (targetSession !== 'prewed' && !newTime) ||
                  dateChecking ||
                  (dateAvailability && !dateAvailability.available) ||
                  (isStudio && isSlotTaken(newTime)) ||
                  (targetSession === 'all' && hasResepsi && (!newResepsiDate || (resepsiAvailability && !resepsiAvailability.available))) ||
                  (targetSession === 'all' && hasPrewed && (!newPrewedDate || (prewedAvailability && !prewedAvailability.available)))
                }
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Konfirmasi Reschedule</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end pt-3 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
