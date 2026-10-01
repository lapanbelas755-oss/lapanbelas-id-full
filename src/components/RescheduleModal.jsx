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

  // Hitung batas minimum hari pengajuan
  const minNoticeDays = isStudio ? 2 : 14;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const curEventDate = new Date(order.eventDate || order.event_date);
  curEventDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((curEventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isEligibleByDeadline = diffDays >= minNoticeDays;

  // Tanggal minimal yang bisa dipilih: besok
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState(order.time || '10:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setNewDate('');
    setReason('');
    setErrorMessage('');
    setIsSubmitting(false);
  }, [order]);

  const studioTimeSlots = [
    '09:00', '10:00', '11:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newDate) {
      setErrorMessage('Silakan pilih tanggal baru.');
      return;
    }
    if (!newTime) {
      setErrorMessage('Silakan tentukan jam sesi baru.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        order_id: order.id,
        new_date: newDate,
        new_time: newTime,
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
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Jadwal Saat Ini
          </span>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">Tanggal:</span>
            <span className="font-semibold text-white">
              {formatDateDisplay(order.eventDate || order.event_date)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">Waktu / Jam:</span>
            <span className="font-semibold text-white">
              {order.time || order.jam_akad || '-'} WIB
            </span>
          </div>
          {roomName && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Ruangan / Venue:</span>
              <span className="font-semibold text-teal-400">{roomName}</span>
            </div>
          )}
        </div>

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
                <p className="font-semibold text-white mb-0.5">Ketentuan Reschedule:</p>
                <p>
                  {isStudio 
                    ? 'Reschedule sesi studio minimal H-2 sebelum sesi. Slot baru otomatis diverifikasi agar tidak bentrok dengan pemesan lain.' 
                    : 'Reschedule wedding/dekorasi minimal H-14 sebelum acara.'}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-white mb-0.5">Batas Waktu Terlewat:</p>
                <p>
                  {isStudio 
                    ? `Pengajuan otomatis minimal H-${minNoticeDays} sebelum sesi foto (tersisa ${diffDays} hari). Silakan hubungi Admin WhatsApp untuk bantuan darurat.`
                    : `Pengajuan otomatis minimal H-${minNoticeDays} sebelum acara (tersisa ${diffDays} hari). Silakan hubungi Admin.`}
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
            {/* Input Tanggal Baru */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Pilih Tanggal Baru <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                min={minDateStr}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-white/15 focus:border-amber-400 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
              />
            </div>

            {/* Pilihan Jam */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Pilih Jam Sesi Baru <span className="text-red-400">*</span>
              </label>
              {isStudio ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {studioTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setNewTime(slot)}
                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center ${
                        newTime === slot
                          ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
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
                disabled={isSubmitting || !newDate || !newTime}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
