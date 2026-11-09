import React from "react";
import { supabase, formatDateUI, formatRupiah } from "../adminUtils";
import SvgIcon from "../SvgIcon";

// ============================================================
// PANTAU & GAJI KRU (ALUR 4 LANGKAH)
// Tugaskan → Info Acara → Kerjakan SOP → Bayar Gaji
// ============================================================

const normalizePhone = (phone) => {
    if (!phone) return '';
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (p && !p.startsWith('62')) p = '62' + p;
    return p;
};

const rowKey = (a) => `${a.appointment_id}_${normalizePhone(a.crew_phone)}_${a.session_key || 'full'}`;

const toAmount = (v) => {
    const n = Number(String(v ?? '').replace(/[^0-9]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

const isFileConfirmed = (a) => !!a.verified_at || ['FILES_VERIFIED', 'CLAIMED', 'PAYOUT_REQUESTED', 'PAID'].includes(a.status);
const getSopPct = (a) => Number(a.sop_percent || 0);

const getStage = (a) => {
    if (a.status === 'PAID') return 'lunas';
    if (a.status === 'REJECTED') return 'ditolak';
    if (getSopPct(a) >= 100 && isFileConfirmed(a)) return 'siap';
    if (!a.checkin_at && !a.checkin_photo_url) return 'tugas';
    if (getSopPct(a) < 100) return 'sop';
    return 'file';
};

const STAGES = [
    { id: 'all', label: 'Semua', color: 'text-white' },
    { id: 'tugas', label: '📋 Belum PAP', color: 'text-gray-300' },
    { id: 'sop', label: '☑️ SOP Belum 100%', color: 'text-amber-400' },
    { id: 'file', label: '📁 Tunggu File', color: 'text-blue-400' },
    { id: 'siap', label: '💰 Siap Bayar', color: 'text-cyan-400' },
    { id: 'lunas', label: '✅ Lunas', color: 'text-emerald-400' }
];

const STAGE_BADGE = {
    tugas: 'bg-white/10 text-gray-300 border-white/10',
    sop: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    file: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    siap: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    lunas: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ditolak: 'bg-red-500/15 text-red-300 border-red-500/30'
};

const STAGE_LABEL = {
    tugas: 'Belum PAP',
    sop: 'SOP Berjalan',
    file: 'Tunggu File',
    siap: 'Siap Bayar',
    lunas: 'Lunas',
    ditolak: 'Ditolak Kru'
};

function StepDots({ a }) {
    const steps = [
        { label: 'PAP', done: !!(a.checkin_at || a.checkin_photo_url) },
        { label: 'SOP', done: getSopPct(a) >= 100 },
        { label: 'File', done: isFileConfirmed(a) },
        { label: 'Bayar', done: a.status === 'PAID' }
    ];
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {steps.map((s, i) => (
                <span
                    key={s.label}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.done ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-gray-500 border-white/10'}`}
                >
                    {s.done ? '✓' : `${i + 1}`} {s.label}
                </span>
            ))}
        </div>
    );
}

function CrewMonitorPayManager({ adminFetch, onShowToast, division = 'all' }) {
    const [assignments, setAssignments] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [stageFilter, setStageFilter] = React.useState('all');
    const [monthFilter, setMonthFilter] = React.useState('current_plus'); // 'current_plus' (Bulan ini & mendatang), 'all', or 'YYYY-MM'
    const [searchQ, setSearchQ] = React.useState('');
    const [selectedKey, setSelectedKey] = React.useState(null);
    const [busy, setBusy] = React.useState(null);
    const [confirmModal, setConfirmModal] = React.useState(null);

    // Form detail
    const [addressInput, setAddressInput] = React.useState('');
    const [sharelockInput, setSharelockInput] = React.useState('');
    const [carryInput, setCarryInput] = React.useState('');
    const [requestInput, setRequestInput] = React.useState('');
    const [accInput, setAccInput] = React.useState('');
    const [bonusInput, setBonusInput] = React.useState('');
    const [dedInput, setDedInput] = React.useState('');
    const [dedReason, setDedReason] = React.useState('');

    const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;

    const fetchAssignments = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetcher('/api/crew/admin/assignments');
            if (!res.ok) throw new Error(`Server status ${res.status}`);
            const data = await res.json();
            setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
        } catch (err) {
            onShowToast?.('Gagal memuat data kru: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [fetcher, onShowToast]);

    React.useEffect(() => {
        fetchAssignments();

        let debounceTimer;
        const scheduleRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    fetchAssignments();
                }
            }, 500);
        };

        const channel = supabase
            .channel('realtime_crew_monitor_pay')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_job_assignments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.crew_job_assignments' }, scheduleRefresh)
            .on('broadcast', { event: 'CREW_LIVE_SYNC' }, scheduleRefresh)
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [fetchAssignments]);

    const monthOptions = React.useMemo(() => {
        const monthMap = new Map();
        const indonesianMonths = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        assignments.forEach(a => {
            const dateStr = a.event_date || '';
            const ymMatch = dateStr.match(/^(\d{4})-(\d{2})/);
            if (ymMatch) {
                const year = ymMatch[1];
                const monthNum = parseInt(ymMatch[2], 10);
                const key = `${year}-${ymMatch[2]}`;
                if (!monthMap.has(key) && monthNum >= 1 && monthNum <= 12) {
                    const label = `${indonesianMonths[monthNum - 1]} ${year}`;
                    monthMap.set(key, { key, label, year: parseInt(year, 10), month: monthNum });
                }
            }
        });

        return Array.from(monthMap.values()).sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [assignments]);

    const scoped = React.useMemo(() => {
        const currentYm = new Date().toISOString().slice(0, 7);
        return assignments.filter(a => {
            // Filter bulan
            const d = a.event_date || '';
            if (monthFilter === 'current_plus' && d && d < currentYm) return false;
            if (monthFilter !== 'all' && monthFilter !== 'current_plus' && !d.startsWith(monthFilter)) return false;

            const catLower = (a.category || '').toLowerCase();
            const pkgLower = (a.package_name || '').toLowerCase();
            
            const isStudio = 
                catLower.includes('studio') || 
                pkgLower.includes('studio') ||
                ['keluarga cerita', 'keluarga terbaik', 'keluargaku', 'keluarga besar', 'sweet', 'eternity', 'harmony', 'pas photo'].some(k => pkgLower.includes(k));

            if (division === 'studio' && !isStudio) return false;
            if (division === 'lapanbelas.id' && isStudio) return false;
            return true;
        });
    }, [assignments, division, monthFilter]);

    const counts = React.useMemo(() => {
        const c = { all: scoped.length };
        scoped.forEach(a => { const s = getStage(a); c[s] = (c[s] || 0) + 1; });
        return c;
    }, [scoped]);

    const filtered = React.useMemo(() => scoped.filter(a => {
        if (stageFilter !== 'all' && getStage(a) !== stageFilter) return false;
        if (searchQ) {
            const q = searchQ.toLowerCase();
            const hay = `${a.crew_name || ''} ${a.client_name || ''} ${a.appointment_id || ''} ${a.package_name || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    }), [scoped, stageFilter, searchQ]);

    const selected = React.useMemo(() => assignments.find(a => rowKey(a) === selectedKey) || null, [assignments, selectedKey]);

    const openDetail = (a) => {
        setSelectedKey(rowKey(a));
        setAddressInput(a.client_address || (a.location && a.location !== '-' ? a.location : ''));
        setSharelockInput(a.sharelock_url || '');
        setCarryInput((Array.isArray(a.carry_items) ? a.carry_items : []).map(i => i.text).join('\n'));
        setRequestInput('');
        setAccInput(a.accommodation ? String(a.accommodation) : '');
        setBonusInput(a.bonus ? String(a.bonus) : '');
        setDedInput(a.deduction ? String(a.deduction) : '');
        setDedReason(a.deduction_reason || '');
    };

    const closeDetail = () => setSelectedKey(null);

    const basePayload = (a) => ({
        appointmentId: a.appointment_id,
        crewPhone: a.crew_phone,
        crewName: a.crew_name,
        role: a.crew_role || a.role,
        session: a.session,
        sessionKey: a.session_key
    });

    const postJson = async (url, body) => {
        const res = await fetcher(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || `Gagal (status ${res.status})`);
        return data;
    };

    const handleSaveInfo = async () => {
        if (!selected) return;
        setBusy('info');
        try {
            const carryItems = carryInput.split('\n').map(s => s.trim()).filter(Boolean);
            const data = await postJson('/api/crew/admin/update-event-info', {
                ...basePayload(selected),
                clientAddress: addressInput,
                sharelockUrl: sharelockInput,
                carryItems
            });
            onShowToast?.(data.message || 'Info acara tersimpan ✅', 'success');
            await fetchAssignments();
        } catch (e) {
            onShowToast?.(e.message, 'error');
        } finally {
            setBusy(null);
        }
    };

    const saveRequests = async (items) => {
        await postJson('/api/crew/save-custom-sop', {
            appointmentId: selected.appointment_id,
            crewPhone: selected.crew_phone,
            role: selected.crew_role || selected.role,
            sessionKey: selected.session_key,
            items
        });
    };

    const handleAddRequest = async () => {
        if (!selected || !requestInput.trim()) return;
        setBusy('request');
        try {
            const existing = Array.isArray(selected.custom_sop_items) ? selected.custom_sop_items : [];
            const newItem = {
                id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                phase: 'on',
                moment: 'custom',
                text: requestInput.trim(),
                role: 'all',
                is_custom: true,
                created_at: new Date().toISOString()
            };
            await saveRequests([...existing, newItem]);
            setRequestInput('');
            onShowToast?.('Request khusus ditambahkan ✅', 'success');
            await fetchAssignments();
        } catch (e) {
            onShowToast?.(e.message, 'error');
        } finally {
            setBusy(null);
        }
    };

    const handleDeleteRequest = async (id) => {
        if (!selected) return;
        setBusy('request');
        try {
            const existing = Array.isArray(selected.custom_sop_items) ? selected.custom_sop_items : [];
            await saveRequests(existing.filter(i => i.id !== id));
            onShowToast?.('Request dihapus', 'info');
            await fetchAssignments();
        } catch (e) {
            onShowToast?.(e.message, 'error');
        } finally {
            setBusy(null);
        }
    };

    const handleConfirmFile = (location) => {
        if (!selected) return;
        const locationText = location === 'kantor' ? '🖥️ Sudah ada di PC Kantor Studio' : '☁️ Sudah Terupload di Google Drive Klien';
        setConfirmModal({
            title: 'Konfirmasi Penerimaan File',
            subtitle: 'Pastikan file dokumentasi kru sudah dicek & aman sebelum diverifikasi.',
            badge: 'VERIFIKASI FILE',
            badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
            icon: '📁',
            items: [
                { label: 'Kru Bertugas', value: `${selected.crew_name} (${selected.crew_role || selected.role || 'Kru'})` },
                { label: 'Klien & Acara', value: `${selected.client_name} (#${selected.appointment_id})` },
                { label: 'Lokasi Simpan', value: locationText, highlight: true }
            ],
            note: 'Setelah dikonfirmasi, status file akan berubah menjadi terverifikasi dan admin dapat melanjutkan ke proses pencairan gaji.',
            confirmText: 'Ya, Konfirmasi Diterima',
            confirmBtnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25',
            onConfirm: async () => {
                setConfirmModal(null);
                setBusy('file');
                try {
                    const data = await postJson('/api/crew/admin/verify-files', { ...basePayload(selected), fileLocation: location });
                    onShowToast?.(data.message || 'File dikonfirmasi ✅', 'success');
                    await fetchAssignments();
                } catch (e) {
                    onShowToast?.(e.message, 'error');
                } finally {
                    setBusy(null);
                }
            }
        });
    };

    const baseFee = selected ? Number(selected.payout_fee_amount || selected.standard_fee || 0) : 0;
    const total = Math.max(0, baseFee + toAmount(accInput) + toAmount(bonusInput) - toAmount(dedInput));

    const payBlockers = selected ? [
        getSopPct(selected) < 100 ? `SOP footage baru ${getSopPct(selected)}% (wajib 100%)` : null,
        !isFileConfirmed(selected) ? 'File belum dikonfirmasi diterima' : null,
        toAmount(dedInput) > 0 && !dedReason.trim() ? 'Alasan potongan wajib diisi' : null
    ].filter(Boolean) : [];

    const handlePay = () => {
        if (!selected || payBlockers.length > 0) return;
        const bank = selected.profile_bank;
        const bankStr = bank 
            ? `${bank.bank} • ${bank.account_number} (a.n ${bank.account_name})` 
            : (selected.payout_bank_name 
                ? `${selected.payout_bank_name} • ${selected.payout_account_number} (a.n ${selected.payout_account_name})` 
                : 'Belum ada data rekening kru');

        setConfirmModal({
            title: 'Konfirmasi Pembayaran Gaji Kru',
            subtitle: 'Pastikan Anda telah berhasil mentransfer dana ke rekening kru.',
            badge: 'TRANSFER LUNAS',
            badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            icon: '💸',
            items: [
                { label: 'Kru Bertugas', value: `${selected.crew_name} (${selected.crew_role || selected.role || 'Kru'})` },
                { label: 'Klien & Acara', value: `${selected.client_name} (#${selected.appointment_id})` },
                { label: 'Rekening Tujuan', value: bankStr, highlight: true },
                { label: 'Gaji Pokok', value: formatRupiah(baseFee) },
                ...(toAmount(accInput) > 0 ? [{ label: '+ Akomodasi', value: `+${formatRupiah(toAmount(accInput))}` }] : []),
                ...(toAmount(bonusInput) > 0 ? [{ label: '+ Bonus', value: `+${formatRupiah(toAmount(bonusInput))}` }] : []),
                ...(toAmount(dedInput) > 0 ? [{ label: `- Potongan (${dedReason || 'Pinalti'})`, value: `-${formatRupiah(toAmount(dedInput))}`, isDeduction: true }] : []),
                { label: 'Total Transfer', value: formatRupiah(total), isTotal: true }
            ],
            note: 'Status penugasan akan ditandai LUNAS dan sistem WhatsApp akan otomatis mengirimkan pesan konfirmasi rincian lengkap ke nomor kru.',
            confirmText: `Ya, Tandai Lunas (${formatRupiah(total)})`,
            confirmBtnClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25',
            onConfirm: async () => {
                setConfirmModal(null);
                setBusy('pay');
                try {
                    const data = await postJson('/api/crew/admin/approve-payout', {
                        ...basePayload(selected),
                        accommodation: toAmount(accInput),
                        bonus: toAmount(bonusInput),
                        deduction: toAmount(dedInput),
                        deductionReason: dedReason.trim()
                    });
                    onShowToast?.(data.message || 'Gaji LUNAS ✅', 'success');
                    await fetchAssignments();
                } catch (e) {
                    onShowToast?.(e.message, 'error');
                } finally {
                    setBusy(null);
                }
            }
        });
    };

    const handleRequestOwnerPayout = async () => {
        if (!selected) return;
        setBusy('request_owner');
        try {
            const data = await postJson('/api/crew/admin/request-payout-owner', {
                ...basePayload(selected)
            });
            onShowToast?.(data.message || 'Pengajuan gaji telah diteruskan ke Owner! 👑', 'success');
            await fetchAssignments();
        } catch (e) {
            onShowToast?.(e.message, 'error');
        } finally {
            setBusy(null);
        }
    };

    const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500";

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-white/3 p-4 rounded-2xl border border-slate-200/90 dark:border-white/8">
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Pantau & Gaji Kru</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">PAP → SOP 100% → File diterima → Bayar. Klik satu baris untuk atur info acara & gaji.</p>
                </div>
                <button
                    onClick={fetchAssignments}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-300 rounded-xl text-xs font-medium transition shrink-0 self-start sm:self-auto border border-slate-200 dark:border-white/10"
                >
                    <SvgIcon name="refresh-cw" className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Filter tahap */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {STAGES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setStageFilter(s.id)}
                        className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition ${stageFilter === s.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' : 'bg-slate-100 dark:bg-white/3 border-slate-200 dark:border-white/8 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                    >
                        <span className={stageFilter === s.id ? 'text-white' : s.color}>{s.label}</span>
                        <span className="ml-1.5 font-mono">{counts[s.id] || 0}</span>
                    </button>
                ))}
            </div>

            {/* Search & Month Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    placeholder="Cari nama kru / klien / ID booking..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-emerald-500"
                />
                <select
                    value={monthFilter}
                    onChange={e => setMonthFilter(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 font-medium"
                >
                    <option value="current_plus">🗓️ Bulan Ini & Seterusnya (Aktif)</option>
                    <option value="all">📁 Semua Bulan (Termasuk Acara Lewat)</option>
                    {monthOptions.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400 dark:text-gray-500 text-sm">Memuat data...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-white/3 rounded-2xl border border-slate-200 dark:border-white/8">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-slate-800 dark:text-gray-300 font-semibold text-sm">Tidak ada data sesuai filter</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((a, idx) => {
                        const stage = getStage(a);
                        const pct = getSopPct(a);
                        const shownTotal = a.status === 'PAID' && a.total_paid !== undefined && a.total_paid !== null ? a.total_paid : (a.payout_fee_amount || a.standard_fee);
                        return (
                            <button
                                type="button"
                                key={`${rowKey(a)}-${idx}`}
                                onClick={() => openDetail(a)}
                                className="w-full text-left bg-slate-50 hover:bg-slate-100/90 dark:bg-white/3 dark:hover:bg-white/6 transition rounded-2xl p-3.5 border border-slate-200/90 dark:border-white/8 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400">{formatDateUI(a.event_date)}</span>
                                        {a.session && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300">{a.session}</span>}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STAGE_BADGE[stage]}`}>{STAGE_LABEL[stage]}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">{a.client_name}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                                        <span className="text-slate-800 dark:text-gray-200 font-semibold">{a.crew_name}</span> · {a.crew_role || a.role || 'Kru'} · {a.package_name}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-3 md:w-auto">
                                    <div className="space-y-1">
                                        <StepDots a={a} />
                                        <div className="h-1 w-full md:w-40 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div style={{ width: `${pct}%` }} className={`h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">{formatRupiah(shownTotal)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* PANEL DETAIL */}
            {selected && (
                <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={closeDetail}>
                    <div
                        className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white dark:bg-[#111] border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-start justify-between gap-3 z-10">
                            <div className="min-w-0">
                                <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">#{selected.appointment_id} · {formatDateUI(selected.event_date)} {selected.session ? `· ${selected.session}` : ''}</p>
                                <h4 className="text-slate-900 dark:text-white font-bold text-sm truncate">{selected.client_name}</h4>
                                <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">{selected.crew_name} · {selected.crew_role || selected.role || 'Kru'} · {selected.package_name}</p>
                            </div>
                            <button onClick={closeDetail} className="text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 shrink-0">✕</button>
                        </div>

                        <div className="p-4 space-y-4 text-xs">
                            {/* 1. INFO ACARA */}
                            <section className="space-y-2.5 bg-white/3 p-3.5 rounded-2xl border border-white/8">
                                <p className="font-bold text-white">📍 Info Acara</p>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Alamat lokasi klien (berlaku untuk semua kru di acara ini)</label>
                                    <textarea rows={2} value={addressInput} onChange={e => setAddressInput(e.target.value)} className={inputCls} placeholder="Alamat lengkap / patokan lokasi" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">📍 Link Sharelock / Google Maps Klien (Langsung dibuka kru saat klik Maps)</label>
                                    <input 
                                        type="url" 
                                        value={sharelockInput} 
                                        onChange={e => setSharelockInput(e.target.value)} 
                                        className={inputCls} 
                                        placeholder="https://maps.app.goo.gl/... atau link sharelock WhatsApp" 
                                    />
                                    {sharelockInput && (
                                        <a href={sharelockInput} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1">
                                            🔗 Uji coba buka link sharelock ↗
                                        </a>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">🎒 Barang bawaan untuk kru ini (1 baris = 1 barang)</label>
                                    <textarea rows={4} value={carryInput} onChange={e => setCarryInput(e.target.value)} className={inputCls} placeholder={"Lensa 70-200\nFlash + 2 baterai cadangan\nTripod"} />
                                    {Array.isArray(selected.carry_items) && selected.carry_items.length > 0 && (
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Disiapkan kru: {selected.carry_items.filter(i => i.checked).length}/{selected.carry_items.length}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleSaveInfo}
                                    disabled={busy === 'info'}
                                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl font-semibold"
                                >
                                    {busy === 'info' ? 'Menyimpan...' : 'Simpan Info Acara'}
                                </button>
                            </section>

                            {/* 2. REQUEST KHUSUS */}
                            <section className="space-y-2.5 bg-white/3 p-3.5 rounded-2xl border border-white/8">
                                <p className="font-bold text-white">⭐ Request Khusus Klien</p>
                                {(selected.custom_sop_items || []).length === 0 ? (
                                    <p className="text-gray-500 italic">Belum ada request khusus.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {(selected.custom_sop_items || []).map(it => (
                                            <li key={it.id} className="flex items-start justify-between gap-2 bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5">
                                                <span className="text-gray-200 break-words min-w-0">{it.text}</span>
                                                <button onClick={() => handleDeleteRequest(it.id)} disabled={busy === 'request'} className="text-red-400 hover:text-red-300 shrink-0">Hapus</button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input value={requestInput} onChange={e => setRequestInput(e.target.value)} className={inputCls} placeholder="Contoh: foto keluarga besar pihak pria" />
                                    <button onClick={handleAddRequest} disabled={busy === 'request' || !requestInput.trim()} className="px-4 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-xl font-semibold shrink-0">
                                        + Tambah
                                    </button>
                                </div>
                            </section>

                            {/* 3. HARI-H: PAP & SOP */}
                            <section className="space-y-2.5 bg-white/3 p-3.5 rounded-2xl border border-white/8">
                                <p className="font-bold text-white">📸 Hari-H</p>
                                <div className="flex items-center gap-3">
                                    {selected.checkin_photo_url ? (
                                        <a href={selected.checkin_photo_url} target="_blank" rel="noreferrer" className="shrink-0">
                                            <img src={selected.checkin_photo_url} alt="PAP" loading="lazy" className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                                        </a>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl border border-dashed border-white/15 flex items-center justify-center text-gray-600 shrink-0">PAP</div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-gray-300">
                                            {selected.checkin_at
                                                ? `PAP masuk ${new Date(selected.checkin_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                                : 'Kru belum kirim foto PAP'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-400">SOP Footage</span>
                                        <span className={`font-mono font-bold ${getSopPct(selected) >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{getSopPct(selected)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div style={{ width: `${getSopPct(selected)}%` }} className={`h-full ${getSopPct(selected) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    </div>
                                </div>
                            </section>

                            {/* 4. FILE */}
                            <section className="space-y-2.5 bg-white/3 p-3.5 rounded-2xl border border-white/8">
                                <p className="font-bold text-white">📁 Serah File</p>
                                {selected.files_storage_type === 'gdrive' && selected.files_drive_link ? (
                                    <a href={selected.files_drive_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 max-w-full truncate">
                                        <SvgIcon name="external-link" className="w-3.5 h-3.5 shrink-0" /> Buka link Drive dari kru
                                    </a>
                                ) : selected.files_storage_type === 'office' ? (
                                    <p className="text-gray-300">📦 Kru menyatakan file disetor ke kantor</p>
                                ) : (
                                    <p className="text-gray-500 italic">Kru belum menyetor file</p>
                                )}
                                {selected.files_notes && <p className="text-gray-400 italic">"{selected.files_notes}"</p>}

                                {isFileConfirmed(selected) ? (
                                    <p className="text-emerald-400 font-semibold">
                                        ✓ File dikonfirmasi diterima{selected.file_confirmed_location === 'kantor' ? ' (PC Kantor)' : selected.file_confirmed_location === 'drive' ? ' (Google Drive Klien)' : ''}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button onClick={() => handleConfirmFile('kantor')} disabled={busy === 'file'} className="px-3 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-xl font-semibold">
                                            🖥️ Sudah ada di PC Kantor
                                        </button>
                                        <button onClick={() => handleConfirmFile('drive')} disabled={busy === 'file'} className="px-3 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-xl font-semibold">
                                            ☁️ Sudah di GDrive Klien
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* 5. GAJI */}
                            <section className="space-y-2.5 bg-white/3 p-3.5 rounded-2xl border border-white/8">
                                <p className="font-bold text-white">💰 Gaji</p>
                                {selected.status === 'PAID' ? (
                                    <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                                        <div className="flex justify-between"><span className="text-gray-400">Gaji Pokok</span><span className="font-mono text-white">{formatRupiah(selected.fee_amount || baseFee)}</span></div>
                                        {!!selected.accommodation && <div className="flex justify-between"><span className="text-gray-400">Akomodasi</span><span className="font-mono text-white">+{formatRupiah(selected.accommodation)}</span></div>}
                                        {!!selected.bonus && <div className="flex justify-between"><span className="text-gray-400">Bonus</span><span className="font-mono text-white">+{formatRupiah(selected.bonus)}</span></div>}
                                        {!!selected.deduction && <div className="flex justify-between gap-2"><span className="text-gray-400">Potongan ({selected.deduction_reason})</span><span className="font-mono text-red-400">-{formatRupiah(selected.deduction)}</span></div>}
                                        <div className="flex justify-between pt-1.5 border-t border-white/10"><span className="font-bold text-white">Total</span><span className="font-mono font-bold text-emerald-400">{formatRupiah(selected.total_paid ?? selected.fee_amount)}</span></div>
                                        <p className="text-emerald-400 font-semibold pt-1">✅ Lunas {selected.paid_at ? formatDateUI(selected.paid_at) : ''}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Gaji Pokok (otomatis dari tarif)</label>
                                                <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 font-mono text-white">{formatRupiah(baseFee)}</div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">+ Akomodasi</label>
                                                <input inputMode="numeric" value={accInput} onChange={e => setAccInput(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">+ Bonus</label>
                                                <input inputMode="numeric" value={bonusInput} onChange={e => setBonusInput(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">− Potongan</label>
                                                <input inputMode="numeric" value={dedInput} onChange={e => setDedInput(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="0" />
                                            </div>
                                        </div>
                                        {toAmount(dedInput) > 0 && (
                                            <input value={dedReason} onChange={e => setDedReason(e.target.value)} className={inputCls} placeholder="Alasan potongan (wajib)" />
                                        )}
                                        <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                                            <span className="font-bold text-white">Total Dibayar</span>
                                            <span className="font-mono font-bold text-emerald-400 text-base">{formatRupiah(total)}</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            Rekening: {selected.profile_bank
                                                ? <span className="text-white font-mono">{selected.profile_bank.bank} - {selected.profile_bank.account_number} a.n {selected.profile_bank.account_name}</span>
                                                : selected.payout_bank_name
                                                    ? <span className="text-white font-mono">{selected.payout_bank_name} - {selected.payout_account_number} a.n {selected.payout_account_name}</span>
                                                    : <span className="text-amber-400">Kru belum mengisi rekening di portal</span>}
                                        </div>
                                        {payBlockers.length > 0 && (
                                            <ul className="text-[11px] text-amber-400 space-y-0.5">
                                                {payBlockers.map(b => <li key={b}>🔒 {b}</li>)}
                                            </ul>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRequestOwnerPayout}
                                                disabled={payBlockers.length > 0 || busy === 'request_owner'}
                                                className="w-full py-2.5 rounded-xl font-bold text-xs transition bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                            >
                                                {busy === 'request_owner' ? 'Mengirim...' : '👑 Ajukan ke Owner (WA)'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handlePay}
                                                disabled={payBlockers.length > 0 || busy === 'pay'}
                                                className="w-full py-2.5 rounded-xl font-bold text-xs transition bg-gradient-to-r from-emerald-500 to-teal-500 text-white disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                            >
                                                {busy === 'pay' ? 'Memproses...' : `💸 Bayar Langsung (${formatRupiah(total)})`}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* ULTRA-PROFESSIONAL CONFIRMATION DIALOG MODAL */}
            {confirmModal && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setConfirmModal(null)}
                >
                    <div 
                        className="bg-[#12141a] border border-white/15 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                                {confirmModal.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${confirmModal.badgeClass}`}>
                                        {confirmModal.badge}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-white leading-snug">{confirmModal.title}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{confirmModal.subtitle}</p>
                            </div>
                            <button 
                                onClick={() => setConfirmModal(null)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Breakdown Items Box */}
                        <div className="bg-black/40 border border-white/8 rounded-2xl p-4 space-y-2 text-xs">
                            {confirmModal.items.map((item, i) => (
                                <div 
                                    key={i} 
                                    className={`flex items-center justify-between gap-3 ${
                                        item.isTotal 
                                            ? 'pt-2.5 mt-2 border-t border-white/10 text-sm font-bold' 
                                            : ''
                                    }`}
                                >
                                    <span className={item.isTotal ? 'text-white' : 'text-gray-400'}>{item.label}</span>
                                    <span className={`font-mono text-right truncate max-w-[260px] ${
                                        item.isTotal 
                                            ? 'text-emerald-400 text-base font-black' 
                                            : item.isDeduction
                                                ? 'text-red-400 font-semibold'
                                                : item.highlight 
                                                    ? 'text-cyan-300 font-semibold' 
                                                    : 'text-white font-medium'
                                    }`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Informational Note */}
                        {confirmModal.note && (
                            <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-[11px] text-gray-400 flex items-start gap-2 leading-relaxed">
                                <span className="text-amber-400 text-sm shrink-0">💡</span>
                                <span>{confirmModal.note}</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.onConfirm}
                                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${confirmModal.confirmBtnClass}`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CrewMonitorPayManager;
export { CrewMonitorPayManager };

