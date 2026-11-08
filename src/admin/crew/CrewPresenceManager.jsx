import React from "react";
import {
    supabase,
    adminFetch,
    formatDateUI,
    formatRupiah,
    parseNotesField,
    getOrderDivisions
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

// ============================================================
function CrewPresenceManager({ adminFetch, onShowToast, division = 'all' }) {
    const [assignments, setAssignments] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [filterDate, setFilterDate] = React.useState('all');
    const [filterStatus, setFilterStatus] = React.useState('all');
    const [searchQ, setSearchQ] = React.useState('');
    const [lightboxImage, setLightboxImage] = React.useState(null);
    const [briefingModal, setBriefingModal] = React.useState(null);
    const [briefingForm, setBriefingForm] = React.useState({ gmapsLink: '', rundownText: '' });
    const [isSendingBriefing, setIsSendingBriefing] = React.useState(false);

    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const res = await (adminFetch ? adminFetch('/api/crew/admin/assignments') : fetch('/api/crew/admin/assignments'));
            if (!res.ok) {
                throw new Error(`Server status ${res.status}. Harap restart backend (node server.js) agar endpoint baru aktif.`);
            }
            const data = await res.json();
            if (data.assignments) {
                setAssignments(data.assignments);
            }
        } catch (err) {
            console.error('Fetch assignments error:', err);
            onShowToast?.('Gagal memuat presensi kru: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAssignments();
    }, []);

    const handleOpenBriefing = (asg) => {
        setBriefingModal(asg);
        const mapUrl = asg.location ? (asg.location.startsWith('http') ? asg.location : `https://maps.google.com/?q=${encodeURIComponent(asg.location)}`) : '';
        setBriefingForm({
            gmapsLink: mapUrl,
            rundownText: `• Standby: Pukul ${asg.start_time || '08:00'} WIB\n• Acara: ${asg.package_name || 'Dokumentasi'}\n• Klien: ${asg.client_name} (${asg.client_phone || '-'})\n• Lokasi: ${asg.location || 'Studio Lapanbelas'}`
        });
    };

    const handleSendBriefing = async (e) => {
        e.preventDefault();
        if (!briefingModal) return;
        setIsSendingBriefing(true);
        try {
            const res = await adminFetch('/api/crew/admin/send-h1-briefing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: briefingModal.appointment_id,
                    crewPhone: briefingModal.crew_phone,
                    crewName: briefingModal.crew_name,
                    role: briefingModal.crew_role,
                    location: briefingModal.location,
                    gmapsLink: briefingForm.gmapsLink,
                    rundownText: briefingForm.rundownText
                })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast?.('Briefing H-1 berhasil dikirim ke WhatsApp kru! 🚀', 'success');
                setBriefingModal(null);
            } else {
                onShowToast?.(data.error || 'Gagal mengirim briefing', 'error');
            }
        } catch (err) {
            onShowToast?.('Gagal mengirim briefing: ' + err.message, 'error');
        } finally {
            setIsSendingBriefing(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const filtered = assignments.filter(asg => {
        const isStudio = (asg.category || '').toLowerCase().includes('studio') || (asg.package_name || '').toLowerCase().includes('studio');
        if (division === 'studio' && !isStudio) return false;
        if (division === 'lapanbelas.id' && isStudio) return false;

        const d = asg.event_date || '';
        if (filterDate === 'today' && d !== todayStr) return false;
        if (filterDate === 'upcoming' && d < todayStr) return false;

        if (filterStatus === 'ready' && asg.status !== 'READY_ON_SITE' && asg.status !== 'FILES_SUBMITTED' && asg.status !== 'PAID') return false;
        if (filterStatus === 'pending' && asg.status === 'READY_ON_SITE') return false;

        if (searchQ) {
            const q = searchQ.toLowerCase();
            const matchName = (asg.crew_name || '').toLowerCase().includes(q);
            const matchClient = (asg.client_name || '').toLowerCase().includes(q);
            const matchPkg = (asg.package_name || '').toLowerCase().includes(q);
            if (!matchName && !matchClient && !matchPkg) return false;
        }

        return true;
    });

    const statusBadge = (st) => {
        switch (st) {
            case 'READY_ON_SITE':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">📸 Hadir di Lokasi (PAP)</span>;
            case 'ACCEPTED':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🟢 Siap / Diterima</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">🔴 Ditolak Kru</span>;
            case 'FILES_SUBMITTED':
            case 'FILES_VERIFIED':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">📁 File Diserahkan</span>;
            case 'PAID':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">💰 Selesai & Lunas</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🟡 Ditugaskan</span>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/3 p-4 rounded-2xl border border-white/8">
                <div>
                    <h3 className="font-bold text-white text-base">Monitoring Presensi & PAP Hari H</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Pantau kehadiran fotografer/videografer di lokasi, bukti foto selfie (PAP), koordinat GPS, dan status WA klien.</p>
                </div>
                <button
                    onClick={fetchAssignments}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium transition shrink-0 self-start sm:self-auto"
                >
                    <SvgIcon name="refresh-cw" className="w-3.5 h-3.5" /> Refresh Data
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                    type="text"
                    placeholder="Cari kru / nama klien / paket..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
                <select
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                    <option value="all">Semua Tanggal Acara</option>
                    <option value="today">⚡ Hari Ini Saja</option>
                    <option value="upcoming">📅 Mendatang (Mulai Hari Ini)</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                    <option value="all">Semua Status Presensi</option>
                    <option value="ready">📸 Sudah Check-in (PAP Hadir)</option>
                    <option value="pending">⏳ Menunggu Check-in Hari H</option>
                </select>
            </div>

            {/* List Cards */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Memuat data presensi kru...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white/3 rounded-2xl border border-white/8">
                    <p className="text-3xl mb-2">📍</p>
                    <p className="text-gray-300 font-semibold text-sm">Tidak ada penugasan yang sesuai filter</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((item, idx) => {
                        return (
                            <div key={`${item.appointment_id}-${item.crew_phone}-${idx}`} className="bg-white/3 hover:bg-white/5 transition rounded-2xl p-4 border border-white/8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${item.event_date === todayStr ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-gray-300'}`}>
                                            {item.event_date === todayStr ? '🔥 HARI INI' : formatDateUI(item.event_date)}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">#{item.appointment_id}</span>
                                        {statusBadge(item.status)}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm">{item.client_name} <span className="text-gray-400 font-normal text-xs">({item.package_name})</span></h4>
                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                            <SvgIcon name="map-pin" className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                            <span className="truncate max-w-xs">{item.location || 'Studio Lapanbelas'}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400">Kru:</span>
                                            <span className="font-semibold text-white">{item.crew_name || 'Kru'}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-gray-300 font-medium">{item.crew_role}</span>
                                        </div>
                                        <a href={`https://wa.me/${item.crew_phone}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]">
                                            <SvgIcon name="message-circle" className="w-3 h-3" />{item.crew_phone}
                                        </a>
                                    </div>
                                </div>

                                {/* PAP Proof & Action */}
                                <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-white/8 pt-3 md:pt-0 md:pl-4">
                                    {item.checkin_pap_url ? (
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => setLightboxImage(item.checkin_pap_url)}
                                                className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer group border border-white/15 bg-black/40 shrink-0"
                                                title="Klik untuk perbesar bukti foto"
                                            >
                                                <img src={item.checkin_pap_url} alt="Bukti PAP" className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                                                <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition flex items-center justify-center">
                                                    <SvgIcon name="maximize-2" className="w-4 h-4 text-white opacity-80" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                                                    <SvgIcon name="check" className="w-3 h-3" /> Hadir {item.checkin_at ? new Date(item.checkin_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'Hari H'}
                                                </p>
                                                {item.checkin_lat && item.checkin_lng && (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${item.checkin_lat},${item.checkin_lng}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-medium transition"
                                                    >
                                                        <SvgIcon name="map-pin" className="w-3 h-3 text-red-400" /> Buka Maps GPS
                                                    </a>
                                                )}
                                                <p className="text-[10px] text-emerald-400/80">WA Klien Terkirim ✅</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-right space-y-1.5">
                                            <span className="text-[11px] text-gray-500 block">Belum check-in PAP</span>
                                            <button
                                                onClick={() => handleOpenBriefing(item)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold border border-blue-500/30 transition"
                                            >
                                                <SvgIcon name="send" className="w-3 h-3" /> Briefing H-1
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
                    <div className="relative max-w-lg w-full bg-[#111318] p-3 rounded-2xl border border-white/15 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                            <span className="text-xs font-semibold text-white">📸 Bukti Foto Kehadiran Lapangan (PAP)</span>
                            <button onClick={() => setLightboxImage(null)} className="p-1 rounded-lg bg-white/10 text-gray-300 hover:text-white"><SvgIcon name="x" className="w-4 h-4" /></button>
                        </div>
                        <img src={lightboxImage} alt="PAP Full" className="w-full h-auto max-h-[75vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}

            {/* Briefing Modal */}
            {briefingModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111318] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-white text-base">Kirim Briefing H-1 ke Kru</h3>
                            <button onClick={() => setBriefingModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white"><SvgIcon name="x" className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSendBriefing} className="p-5 space-y-3">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-1">
                                <p><span className="text-gray-400">Penerima:</span> <strong className="text-white">{briefingModal.crew_name}</strong> ({briefingModal.crew_role})</p>
                                <p><span className="text-gray-400">No. WhatsApp:</span> <strong className="text-emerald-400 font-mono">{briefingModal.crew_phone}</strong></p>
                                <p><span className="text-gray-400">Acara:</span> <strong className="text-white">{briefingModal.package_name}</strong> - #{briefingModal.appointment_id}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Link Sharelock Google Maps *</label>
                                <input
                                    required
                                    type="url"
                                    value={briefingForm.gmapsLink}
                                    onChange={e => setBriefingForm({ ...briefingForm, gmapsLink: e.target.value })}
                                    placeholder="https://maps.google.com/?q=..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Detail Rundown & Catatan Khusus</label>
                                <textarea
                                    rows="4"
                                    value={briefingForm.rundownText}
                                    onChange={e => setBriefingForm({ ...briefingForm, rundownText: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 resize-none font-mono"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setBriefingModal(null)} className="flex-1 py-2 border border-white/10 text-gray-400 rounded-xl text-xs hover:bg-white/5 transition">Batal</button>
                                <button type="submit" disabled={isSendingBriefing} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition">
                                    {isSendingBriefing ? 'Mengirim...' : 'Kirim Briefing WA 🚀'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================

export default CrewPresenceManager;
export { CrewPresenceManager };
