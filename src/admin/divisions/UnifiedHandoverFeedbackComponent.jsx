import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatDateUI,
    formatSelectedDateUI,
    parseNotesField,
    getOrderDivisions,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function UnifiedHandoverFeedbackComponent({ onShowToast, session }) {
    // Reports State (Handover & Album Proofs & Attached Feedbacks)
    const [reports, setReports] = React.useState([]);
    const [loadingReports, setLoadingReports] = React.useState(true);
    const [searchReports, setSearchReports] = React.useState('');
    const [filterPortfolio, setFilterPortfolio] = React.useState('all'); // all, portfolio, private
    const [filterDivision, setFilterDivision] = React.useState('all');
    const [filterFeedbackStatus, setFilterFeedbackStatus] = React.useState('all'); // all, submitted, pending, 5, 4, 3
    const [previewModal, setPreviewModal] = React.useState({ open: false, item: null, type: 'handover' });
    const [resendingId, setResendingId] = React.useState(null);

    // Feedbacks State for Global Team Metrics
    const [feedbacks, setFeedbacks] = React.useState([]);
    const [loadingFeedbacks, setLoadingFeedbacks] = React.useState(true);

    const fetchReports = React.useCallback(async () => {
        setLoadingReports(true);
        try {
            const res = await adminFetch('/api/handover-reports');
            const data = await res.json();
            if (data.success) {
                setReports(data.reports || []);
            } else {
                throw new Error(data.error || 'Gagal memuat laporan');
            }
        } catch (err) {
            console.error('Error fetching handover reports:', err);
            onShowToast('Gagal memuat laporan serah terima: ' + err.message, 'error');
        } finally {
            setLoadingReports(false);
        }
    }, [onShowToast]);

    const fetchFeedbacks = React.useCallback(async () => {
        setLoadingFeedbacks(true);
        try {
            const { data, error } = await supabase
                .from('feedbacks')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setFeedbacks(data || []);
        } catch (err) {
            console.error('Error fetching feedbacks:', err);
            onShowToast('Gagal memuat feedback: ' + err.message, 'error');
        } finally {
            setLoadingFeedbacks(false);
        }
    }, [onShowToast]);

    const refreshAll = React.useCallback(() => {
        fetchReports();
        fetchFeedbacks();
    }, [fetchReports, fetchFeedbacks]);

    React.useEffect(() => {
        fetchReports();
        fetchFeedbacks();
    }, [fetchReports, fetchFeedbacks]);

    const handleResendFeedback = async (report) => {
        setResendingId(report.orderId);
        onShowToast(`Mengirim ulang link feedback ke ${report.clientName}...`, 'info');
        try {
            const res = await adminFetch('/api/send-feedback-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: report.orderId,
                    order: {
                        id: report.orderId,
                        client_name: report.clientName,
                        client_phone: report.clientPhone,
                        package_name: report.packageName
                    }
                })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || 'Link feedback berhasil dikirim via WhatsApp! ⭐', 'success');
            } else {
                onShowToast('Gagal mengirim WhatsApp: ' + (data.error || 'Server error'), 'error');
            }
        } catch (err) {
            onShowToast('Error server: ' + err.message, 'error');
        } finally {
            setResendingId(null);
        }
    };

    const handleDeleteFeedback = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus feedback ini?')) return;
        try {
            const { error } = await supabase.from('feedbacks').delete().eq('id', id);
            if (error) throw error;
            onShowToast('Feedback berhasil dihapus', 'success');
            refreshAll();
        } catch (err) {
            onShowToast('Gagal menghapus feedback: ' + err.message, 'error');
        }
    };

    // Reports Stats
    const galleryStats = React.useMemo(() => {
        const totalHandover = reports.filter(r => r.hasHandover).length;
        const totalPortfolio = reports.filter(r => r.isPortfolio).length;
        const totalReadyWaiting = reports.filter(r => r.albumPhotoUrl && !r.hasHandover).length;
        const feedbackSubmitted = reports.filter(r => r.feedback).length;
        
        return {
            totalHandover,
            totalPortfolio,
            totalReadyWaiting,
            feedbackSubmitted
        };
    }, [reports]);

    // Feedbacks Averages (Admin, FG, VG, Editor, Overall)
    const feedbackAverages = React.useMemo(() => {
        if (feedbacks.length === 0) return { admin: '0.0', fg: '0.0', vg: '0.0', editor: '0.0', overall: '0.0' };
        let sumAdmin = 0, sumFg = 0, sumEditor = 0, sumOverall = 0;
        let sumVg = 0, vgCount = 0;
        feedbacks.forEach(f => {
            sumAdmin += f.rating_admin || 0;
            sumFg += f.rating_photographer || 0;
            sumEditor += f.rating_editor || 0;
            sumOverall += f.rating_overall || 0;
            const vgMatch = (f.comments || '').match(/\[Rating Videografer:\s*(\d+)★?\]/i);
            if (vgMatch) {
                sumVg += parseInt(vgMatch[1]);
                vgCount++;
            }
        });
        const len = feedbacks.length;
        return {
            admin: (sumAdmin / len).toFixed(1),
            fg: (sumFg / len).toFixed(1),
            vg: vgCount > 0 ? (sumVg / vgCount).toFixed(1) : (sumFg / len).toFixed(1),
            editor: (sumEditor / len).toFixed(1),
            overall: (sumOverall / len).toFixed(1)
        };
    }, [feedbacks]);

    // Filtered Reports
    const filteredReports = reports.filter(r => {
        const query = searchReports.toLowerCase();
        const matchSearch = 
            (r.clientName || '').toLowerCase().includes(query) ||
            (r.orderId || '').toLowerCase().includes(query) ||
            (r.packageName || '').toLowerCase().includes(query) ||
            (r.recipientName || '').toLowerCase().includes(query) ||
            (r.feedback?.comment || '').toLowerCase().includes(query);

        if (!matchSearch) return false;

        if (filterPortfolio === 'portfolio' && !r.isPortfolio) return false;
        if (filterPortfolio === 'private' && r.isPortfolio) return false;

        if (filterDivision !== 'all') {
            const div = (r.division || '').toLowerCase();
            const filterDiv = filterDivision.toLowerCase();
            if (!div.includes(filterDiv)) return false;
        }

        if (filterFeedbackStatus === 'submitted' && !r.feedback) return false;
        if (filterFeedbackStatus === 'pending' && r.feedback) return false;
        if (['5', '4', '3'].includes(filterFeedbackStatus)) {
            if (!r.feedback || Math.round(Number(r.feedback.rating)) !== parseInt(filterFeedbackStatus)) return false;
        }

        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <SvgIcon name="camera" className="w-6 h-6 text-pink-400" />
                        Serah Terima & Feedback Klien
                    </h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                        Monitoring serah terima album fisik, izin portofolio klien, ulasan kepuasan, dan evaluasi kinerja tim secara terpadu.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshAll}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/10 transition"
                    >
                        <SvgIcon name="mouse-pointer-click" className="w-3.5 h-3.5" />
                        Segarkan Data
                    </button>
                </div>
            </div>

            {/* ROW 1: STATUS SERAH TERIMA & PORTOFOLIO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="glass-panel p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-emerald-400">
                        <SvgIcon name="handshake" className="w-12 h-12" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Total Serah Terima</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{galleryStats.totalHandover}</span>
                        <span className="text-[11px] text-emerald-400 font-semibold">Terdokumentasi</span>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-pink-400">
                        <SvgIcon name="camera" className="w-12 h-12" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Izin Portofolio</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-pink-400">{galleryStats.totalPortfolio}</span>
                        <span className="text-[11px] text-pink-300 font-medium">Boleh Diunggah</span>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-cyan-400">
                        <SvgIcon name="package-check" className="w-12 h-12" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Siap Diambil</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-cyan-300">{galleryStats.totalReadyWaiting}</span>
                        <span className="text-[11px] text-cyan-400 font-medium">Di Studio</span>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-15 text-yellow-400">
                        <SvgIcon name="star" className="w-12 h-12" />
                    </div>
                    <span className="text-[11px] font-semibold text-yellow-300 uppercase tracking-wider block mb-1">Ulasan Kepuasan</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-yellow-400">{feedbackAverages.overall} ★</span>
                        <span className="text-[11px] text-yellow-500 font-medium">({feedbacks.length} ulasan)</span>
                    </div>
                </div>
            </div>

            {/* ROW 2: EVALUASI KINERJA TIM (ADMIN, FG, VG, EDITOR) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rating Admin</span>
                        <span className="text-[10px] text-slate-500">👔 CS / Front Office</span>
                    </div>
                    <div className="flex items-baseline mt-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{feedbackAverages.admin}</span>
                        <span className="text-amber-400 text-lg ml-1">★</span>
                    </div>
                </div>

                <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rating Fotografer</span>
                        <span className="text-[10px] text-slate-500">📷 Tim FG</span>
                    </div>
                    <div className="flex items-baseline mt-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{feedbackAverages.fg}</span>
                        <span className="text-amber-400 text-lg ml-1">★</span>
                    </div>
                </div>

                <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rating Videografer</span>
                        <span className="text-[10px] text-slate-500">🎥 Tim VG</span>
                    </div>
                    <div className="flex items-baseline mt-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{feedbackAverages.vg}</span>
                        <span className="text-amber-400 text-lg ml-1">★</span>
                    </div>
                </div>

                <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rating Editor</span>
                        <span className="text-[10px] text-slate-500">💻 Tim Editing</span>
                    </div>
                    <div className="flex items-baseline mt-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{feedbackAverages.editor}</span>
                        <span className="text-amber-400 text-lg ml-1">★</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Cari nama klien, ID pesanan, penerima, paket, ulasan..."
                        value={searchReports}
                        onChange={(e) => setSearchReports(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <SvgIcon name="search" className="w-3.5 h-3.5" />
                    </div>
                    {searchReports && (
                        <button
                            onClick={() => setSearchReports('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Portfolio */}
                    <select
                        value={filterPortfolio}
                        onChange={(e) => setFilterPortfolio(e.target.value)}
                        className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition"
                    >
                        <option value="all">Semua Izin Portofolio</option>
                        <option value="portfolio">📸 Boleh Diunggah (Portofolio)</option>
                        <option value="private">🔒 Private (Dilarang Unggah)</option>
                    </select>

                    {/* Filter Division */}
                    <select
                        value={filterDivision}
                        onChange={(e) => setFilterDivision(e.target.value)}
                        className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition"
                    >
                        <option value="all">Semua Divisi</option>
                        <option value="wedding">Wedding / Event</option>
                        <option value="studio">Studio</option>
                        <option value="makeup">Make Up</option>
                        <option value="dekor">Dekorasi</option>
                    </select>

                    {/* Filter Feedback Status & Rating */}
                    <select
                        value={filterFeedbackStatus}
                        onChange={(e) => setFilterFeedbackStatus(e.target.value)}
                        className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition"
                    >
                        <option value="all">Semua Status Review</option>
                        <option value="submitted">⭐ Sudah Ada Ulasan</option>
                        <option value="pending">⏳ Menunggu Ulasan</option>
                        <option value="5">⭐⭐⭐⭐⭐ (5 Bintang)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Bintang)</option>
                        <option value="3">⭐⭐⭐ (3 Bintang)</option>
                    </select>
                </div>
            </div>

            {/* Reports Grid (All-In-One Cards) */}
            {loadingReports ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500 mb-3"></div>
                    <span className="text-xs">Memuat data serah terima & evaluasi klien...</span>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-3">
                        <SvgIcon name="camera" className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-white">Tidak ada data serah terima</h3>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                        Belum ada pesanan yang sesuai dengan filter pencarian saat ini.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredReports.map((report) => (
                        <div
                            key={report.orderId}
                            className="glass-panel rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition flex flex-col justify-between"
                        >
                            {/* Top Bar of Card */}
                            <div className="p-4 border-b border-white/5">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] font-mono text-gray-400 block mb-0.5">#{report.orderId}</span>
                                        <h3 className="text-sm font-bold text-white truncate max-w-[200px]" title={report.clientName}>
                                            {report.clientName}
                                        </h3>
                                        <span className="text-xs text-gray-400 block truncate">{report.packageName}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                        report.division === 'studio' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                        report.division === 'makeup' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                        report.division === 'dekor' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                        {report.division || 'Wedding'}
                                    </span>
                                </div>

                                {/* Status & Portfolio Consent Badge */}
                                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                    {report.isPortfolio ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink-300 bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 rounded-lg">
                                            📸 Izin Portofolio YES
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                            🔒 Private (No Sosmed)
                                        </span>
                                    )}

                                    {report.hasHandover ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                                            ✓ Serah Terima Selesai
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-300 bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 rounded-lg">
                                            ⏳ Menunggu Pengambilan
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Photo Visual Section */}
                            <div className="p-4 grid grid-cols-2 gap-2 bg-slate-950/40">
                                {/* Handover Photo Thumbnail */}
                                <div className="relative group/thumb rounded-xl overflow-hidden aspect-square bg-slate-900 border border-white/5 flex flex-col items-center justify-center text-center">
                                    {report.handoverPhotoUrl ? (
                                        <>
                                            <img
                                                src={report.handoverPhotoUrl}
                                                alt="Bukti Serah Terima"
                                                className="w-full h-full object-cover transition duration-300 group-hover/thumb:scale-105"
                                            />
                                            <button
                                                onClick={() => setPreviewModal({ open: true, item: report, type: 'handover' })}
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1"
                                            >
                                                <SvgIcon name="eye" className="w-4 h-4" />
                                                Perbesar
                                            </button>
                                            <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] text-white px-1.5 py-0.5 rounded font-medium">
                                                Klien & Album
                                            </span>
                                        </>
                                    ) : (
                                        <div className="p-2 text-gray-500 flex flex-col items-center gap-1">
                                            <SvgIcon name="camera" className="w-6 h-6 opacity-40" />
                                            <span className="text-[10px] leading-tight">Belum Difoto Bersama Klien</span>
                                        </div>
                                    )}
                                </div>

                                {/* Album Ready Photo Thumbnail */}
                                <div className="relative group/thumb rounded-xl overflow-hidden aspect-square bg-slate-900 border border-white/5 flex flex-col items-center justify-center text-center">
                                    {report.albumPhotoUrl ? (
                                        <>
                                            <img
                                                src={report.albumPhotoUrl}
                                                alt="Fisik Album Jadi"
                                                className="w-full h-full object-cover transition duration-300 group-hover/thumb:scale-105"
                                            />
                                            <button
                                                onClick={() => setPreviewModal({ open: true, item: report, type: 'album' })}
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1"
                                            >
                                                <SvgIcon name="eye" className="w-4 h-4" />
                                                Perbesar
                                            </button>
                                            <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] text-white px-1.5 py-0.5 rounded font-medium">
                                                Fisik Album
                                            </span>
                                        </>
                                    ) : (
                                        <div className="p-2 text-gray-500 flex flex-col items-center gap-1">
                                            <SvgIcon name="package-check" className="w-6 h-6 opacity-40" />
                                            <span className="text-[10px] leading-tight">Belum Difoto Album Jadi</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Handover Details */}
                            <div className="p-4 border-t border-white/5 space-y-2 text-xs">
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Penerima:</span>
                                    <span className="font-semibold text-white truncate max-w-[130px]">
                                        {report.recipientName || '-'}
                                    </span>
                                </div>
                                {report.handoverAt && (
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Waktu Serah:</span>
                                        <span className="text-gray-300 font-mono text-[11px]">
                                            {report.handoverAt}
                                        </span>
                                    </div>
                                )}

                                {/* Client Feedback & Crew Performance Badges */}
                                {/* Client Feedback & Crew Performance Badges */}
                                <div className="pt-2 border-t border-white/5">
                                    {report.feedback ? (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 space-y-2">
                                            {/* Top Row: Overall Rating & Status Badge */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs">
                                                    <span className="tracking-wider">{'★'.repeat(Math.min(5, Math.max(1, Math.round(Number(report.feedback.rating) || 5))))}</span>
                                                    <span className="text-white text-[11px] font-extrabold">{report.feedback.rating} / 5</span>
                                                </div>
                                                <span className="text-[10px] text-yellow-300 font-semibold bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/30">
                                                    Ulasan Masuk
                                                </span>
                                            </div>

                                            {/* Sub-grid: Rating Admin, FG, VG, Editor (All in One under Overall Rating) */}
                                            <div className="grid grid-cols-4 gap-1.5 py-1.5 border-t border-b border-yellow-500/20 text-center">
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Admin</span>
                                                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 leading-none">
                                                        {report.feedback.ratingAdmin || 5}★
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">FG</span>
                                                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 leading-none">
                                                        {report.feedback.ratingPhotographer || 5}★
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-0.5">VG</span>
                                                    <span className={`text-xs font-black px-1 py-0.5 rounded border leading-none ${
                                                        report.feedback.ratingVideographer 
                                                            ? 'text-indigo-400 bg-indigo-400/10 border-indigo-400/25' 
                                                            : 'text-gray-500 bg-white/5 border-white/5'
                                                    }`}>
                                                        {report.feedback.ratingVideographer ? `${report.feedback.ratingVideographer}★` : '-'}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Editor</span>
                                                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 leading-none">
                                                        {report.feedback.ratingEditor || 5}★
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Sanitized Client Comment (Strips any raw [Rating Videografer: ...] tags) */}
                                            {((report.feedback.comment || '').replace(/\[Rating Videografer:\s*(\d+)★?\]/gi, '').trim()) && (
                                                <p className="text-[11px] text-gray-300 line-clamp-2 italic pt-0.5">
                                                    "{(report.feedback.comment || '').replace(/\[Rating Videografer:\s*(\d+)★?\]/gi, '').trim()}"
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 bg-white/5 rounded-xl p-2">
                                            <span className="text-[10px] text-gray-400">Feedback belum diisi</span>
                                            <button
                                                onClick={() => handleResendFeedback(report)}
                                                disabled={resendingId === report.orderId}
                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-semibold transition shrink-0"
                                                title="Kirimkan link form evaluasi via WhatsApp ke klien"
                                            >
                                                <SvgIcon name="send" className="w-3 h-3" />
                                                {resendingId === report.orderId ? 'Mengirim...' : 'Kirim WA Feedback'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox / Preview Modal for Handover & Album Photos */}
            {previewModal.open && previewModal.item && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
                        {/* Image Viewer */}
                        <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px]">
                            <img
                                src={previewModal.type === 'handover' ? previewModal.item.handoverPhotoUrl : previewModal.item.albumPhotoUrl}
                                alt="Pratinjau Foto"
                                className="max-h-[85vh] w-full object-contain"
                            />
                            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-medium">
                                {previewModal.type === 'handover' ? 'Bukti Klien Memegang Album' : 'Foto Fisik Album Jadi'}
                            </div>
                        </div>

                        {/* Details Sidebar in Modal */}
                        <div className="md:w-2/5 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-[10px] font-mono text-gray-400 block">#{previewModal.item.orderId}</span>
                                        <h3 className="text-base font-bold text-white mt-0.5">{previewModal.item.clientName}</h3>
                                        <p className="text-xs text-gray-400">{previewModal.item.packageName}</p>
                                    </div>
                                    <button
                                        onClick={() => setPreviewModal({ open: false, item: null, type: 'handover' })}
                                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-2 py-3 border-y border-white/10 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Penerima:</span>
                                        <span className="text-white font-semibold">{previewModal.item.recipientName || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Izin Portofolio:</span>
                                        <span className={previewModal.item.isPortfolio ? 'text-pink-400 font-bold' : 'text-gray-400'}>
                                            {previewModal.item.isPortfolio ? 'Boleh Dipublikasikan' : 'Private (Dilarang)'}
                                        </span>
                                    </div>
                                    {previewModal.item.handoverAt && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Waktu Serah:</span>
                                            <span className="text-gray-300 font-mono text-[11px]">{previewModal.item.handoverAt}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Review Section in Modal */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Evaluasi & Rating Klien</h4>
                                    {previewModal.item.feedback ? (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                                                    <span className="tracking-wider">{'★'.repeat(Math.min(5, Math.max(1, Math.round(Number(previewModal.item.feedback.rating) || 5))))}</span>
                                                    <span className="text-white ml-1 font-extrabold">{previewModal.item.feedback.rating} / 5</span>
                                                </div>
                                                <span className="text-[10px] text-yellow-300 font-semibold bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/30">
                                                    Ulasan Masuk
                                                </span>
                                            </div>

                                            {/* Sub-grid: Rating Admin, FG, VG, Editor in Modal */}
                                            <div className="grid grid-cols-4 gap-1.5 py-1.5 border-t border-b border-yellow-500/20 text-center">
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Admin</span>
                                                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 leading-none">
                                                        {previewModal.item.feedback.ratingAdmin || 5}★
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">FG</span>
                                                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 leading-none">
                                                        {previewModal.item.feedback.ratingPhotographer || 5}★
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-0.5">VG</span>
                                                    <span className={`text-xs font-black px-1 py-0.5 rounded border leading-none ${
                                                        previewModal.item.feedback.ratingVideographer 
                                                            ? 'text-indigo-400 bg-indigo-400/10 border-indigo-400/25' 
                                                            : 'text-gray-500 bg-white/5 border-white/5'
                                                    }`}>
                                                        {previewModal.item.feedback.ratingVideographer ? `${previewModal.item.feedback.ratingVideographer}★` : '-'}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900/80 border border-white/10 rounded-lg py-1 px-0.5 flex flex-col items-center justify-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Editor</span>
                                                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 leading-none">
                                                        {previewModal.item.feedback.ratingEditor || 5}★
                                                    </span>
                                                </div>
                                            </div>

                                            {((previewModal.item.feedback.comment || '').replace(/\[Rating Videografer:\s*(\d+)★?\]/gi, '').trim()) && (
                                                <p className="text-gray-300 italic pt-1">
                                                    "{(previewModal.item.feedback.comment || '').replace(/\[Rating Videografer:\s*(\d+)★?\]/gi, '').trim()}"
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-white/5 rounded-xl text-xs text-gray-400">
                                            Klien belum mengirim ulasan feedback.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        const url = previewModal.type === 'handover' ? previewModal.item.handoverPhotoUrl : previewModal.item.albumPhotoUrl;
                                        navigator.clipboard.writeText(url);
                                        onShowToast('Tautan foto berhasil disalin ke clipboard! 📋', 'success');
                                    }}
                                    className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                >
                                    <SvgIcon name="mouse-pointer-click" className="w-3.5 h-3.5" />
                                    Salin Link Foto (Untuk Tim Sosmed)
                                </button>
                                <button
                                    onClick={() => setPreviewModal({ open: false, item: null, type: 'handover' })}
                                    className="w-full py-2 border border-white/10 hover:bg-white/5 text-gray-400 rounded-xl text-xs transition"
                                >
                                    Tutup Pratinjau
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeedbackListComponent(props) {
    return <UnifiedHandoverFeedbackComponent {...props} />;
}

function HandoverReportsComponent(props) {
    return <UnifiedHandoverFeedbackComponent {...props} />;
}


export default UnifiedHandoverFeedbackComponent;
export { UnifiedHandoverFeedbackComponent, FeedbackListComponent, HandoverReportsComponent };
