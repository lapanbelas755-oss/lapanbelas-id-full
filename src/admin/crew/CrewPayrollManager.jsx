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
function CrewPayrollManager({ adminFetch, onShowToast, division = 'all' }) {
    const [assignments, setAssignments] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [filterStatus, setFilterStatus] = React.useState('all');
    const [searchQ, setSearchQ] = React.useState('');
    const [processingKey, setProcessingKey] = React.useState(null);

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
            onShowToast?.('Gagal memuat data penggajian: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAssignments();
    }, []);

    const handleVerifyFiles = async (asg) => {
        if (!window.confirm(`Verifikasi dan setujui penyerahan file dokumentasi untuk ${asg.crew_name} (#${asg.appointment_id})?\n\nKru akan otomatis menerima notifikasi WhatsApp dan dapat mengajukan klaim gaji.`)) return;

        const key = `verify-${asg.appointment_id}-${asg.crew_phone}`;
        setProcessingKey(key);
        try {
            const res = await adminFetch('/api/crew/admin/verify-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: asg.appointment_id,
                    crewPhone: asg.crew_phone
                })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast?.(data.message || 'File berhasil diverifikasi! ✅ Kru dapat mengajukan gaji.', 'success');
                fetchAssignments();
            } else {
                onShowToast?.(data.error || 'Gagal verifikasi file', 'error');
            }
        } catch (err) {
            onShowToast?.('Gagal verifikasi file: ' + err.message, 'error');
        } finally {
            setProcessingKey(null);
        }
    };

    const handleApprovePayout = async (asg) => {
        const feeStr = formatRupiah(asg.payout_fee_amount || asg.standard_fee);
        const confirmMsg = `Konfirmasi Pembayaran Gaji Kru:\n\n• Nama: ${asg.crew_name}\n• Nominal: ${feeStr}\n• Bank: ${asg.payout_bank_name || '-'} (${asg.payout_account_number || '-'})\n• a.n: ${asg.payout_account_name || '-'}\n\nPastikan transfer dana telah berhasil. Status akan diubah ke LUNAS dan kru akan dikirimkan bukti konfirmasi melalui WhatsApp otomatis.`;
        if (!window.confirm(confirmMsg)) return;

        const key = `payout-${asg.appointment_id}-${asg.crew_phone}`;
        setProcessingKey(key);
        try {
            const res = await adminFetch('/api/crew/admin/approve-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: asg.appointment_id,
                    crewPhone: asg.crew_phone
                })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast?.('Gaji berhasil ditandai LUNAS! ✅ Konfirmasi WA telah terkirim ke kru.', 'success');
                fetchAssignments();
            } else {
                onShowToast?.(data.error || 'Gagal menyetujui pembayaran', 'error');
            }
        } catch (err) {
            onShowToast?.('Gagal menyetujui pembayaran: ' + err.message, 'error');
        } finally {
            setProcessingKey(null);
        }
    };

    const scopedAssignments = assignments.filter(asg => {
        const isStudio = (asg.category || '').toLowerCase().includes('studio') || (asg.package_name || '').toLowerCase().includes('studio');
        if (division === 'studio' && !isStudio) return false;
        if (division === 'lapanbelas.id' && isStudio) return false;
        return true;
    });

    const countNeedVerify = scopedAssignments.filter(a => a.status === 'FILES_SUBMITTED').length;
    const countClaimed = scopedAssignments.filter(a => a.status === 'CLAIMED').length;
    const countPaid = scopedAssignments.filter(a => a.status === 'PAID').length;

    const filtered = scopedAssignments.filter(asg => {
        if (filterStatus === 'need_verify' && asg.status !== 'FILES_SUBMITTED') return false;
        if (filterStatus === 'claimed' && asg.status !== 'CLAIMED') return false;
        if (filterStatus === 'paid' && asg.status !== 'PAID') return false;

        if (searchQ) {
            const q = searchQ.toLowerCase();
            const matchName = (asg.crew_name || '').toLowerCase().includes(q);
            const matchClient = (asg.client_name || '').toLowerCase().includes(q);
            if (!matchName && !matchClient) return false;
        }

        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/3 p-4 rounded-2xl border border-white/8">
                <div>
                    <h3 className="font-bold text-white text-base">Verifikasi File & Persetujuan Penggajian</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Verifikasi hasil file dokumentasi kru, cek nomor rekening pengajuan, dan tandai transfer gaji lunas.</p>
                </div>
                <button
                    onClick={fetchAssignments}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium transition shrink-0 self-start sm:self-auto"
                >
                    <SvgIcon name="refresh-cw" className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                    onClick={() => setFilterStatus('need_verify')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${filterStatus === 'need_verify' ? 'bg-amber-500/20 border-amber-500/40' : 'bg-white/3 border-white/8 hover:bg-white/5'}`}
                >
                    <p className="text-xl font-bold text-amber-400">{countNeedVerify}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">📁 Menunggu Verifikasi File</p>
                </div>
                <div
                    onClick={() => setFilterStatus('claimed')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${filterStatus === 'claimed' ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white/3 border-white/8 hover:bg-white/5'}`}
                >
                    <p className="text-xl font-bold text-cyan-400">{countClaimed}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">💸 Menunggu Transfer Gaji</p>
                </div>
                <div
                    onClick={() => setFilterStatus('paid')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${filterStatus === 'paid' ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-white/3 border-white/8 hover:bg-white/5'}`}
                >
                    <p className="text-xl font-bold text-emerald-400">{countPaid}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">✅ Sudah Lunas Ditransfer</p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                    type="text"
                    placeholder="Cari nama kru / klien..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                    <option value="all">Semua Status</option>
                    <option value="need_verify">📁 Perlu Verifikasi File Saja</option>
                    <option value="claimed">💸 Menunggu Transfer Gaji (Claimed)</option>
                    <option value="paid">✅ Sudah Lunas (Paid)</option>
                </select>
            </div>

            {/* Cards */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Memuat data penggajian...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white/3 rounded-2xl border border-white/8">
                    <p className="text-3xl mb-2">💰</p>
                    <p className="text-gray-300 font-semibold text-sm">Tidak ada data penggajian yang sesuai filter</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((asg, idx) => {
                        const isVerifyLoading = processingKey === `verify-${asg.appointment_id}-${asg.crew_phone}`;
                        const isPayoutLoading = processingKey === `payout-${asg.appointment_id}-${asg.crew_phone}`;

                        return (
                            <div key={`${asg.appointment_id}-${asg.crew_phone}-${idx}`} className="bg-white/3 hover:bg-white/5 transition rounded-2xl p-4 border border-white/8 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                    <div>
                                        <span className="text-[11px] font-mono font-bold text-gray-400">#{asg.appointment_id} • {formatDateUI(asg.event_date)}</span>
                                        <h4 className="text-white font-bold text-sm">{asg.client_name} <span className="text-gray-400 font-normal text-xs">({asg.package_name})</span></h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-300 font-semibold">{asg.crew_name}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">{asg.crew_role}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    {/* Left: Status File */}
                                    <div className="space-y-2 bg-white/2 p-3 rounded-xl border border-white/5">
                                        <p className="font-semibold text-gray-300 flex items-center gap-1.5">
                                            <SvgIcon name="file-text" className="w-3.5 h-3.5 text-blue-400" /> Penyerahan File Dokumentasi
                                        </p>
                                        {asg.files_storage_type === 'gdrive' && asg.files_drive_link ? (
                                            <div className="space-y-1.5">
                                                <a
                                                    href={asg.files_drive_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-medium border border-blue-500/30 transition truncate max-w-full"
                                                >
                                                    <SvgIcon name="external-link" className="w-3.5 h-3.5 shrink-0" /> Buka Google Drive Kru
                                                </a>
                                                {asg.files_notes && <p className="text-[11px] text-gray-400 italic">"{asg.files_notes}"</p>}
                                            </div>
                                        ) : asg.files_storage_type === 'office' ? (
                                            <div className="space-y-1">
                                                <span className="inline-block px-2.5 py-1 bg-white/10 text-gray-200 rounded-lg text-[11px] font-medium">📦 Diserahkan Fisik ke Kantor Studio</span>
                                                {asg.files_notes && <p className="text-[11px] text-gray-400 italic">"{asg.files_notes}"</p>}
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 text-[11px] italic">Kru belum menyerahkan file dokumentasi</span>
                                        )}

                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[11px] text-gray-400">Verifikasi File:</span>
                                            {asg.verified_at || asg.status === 'FILES_VERIFIED' || asg.status === 'CLAIMED' || asg.status === 'PAID' ? (
                                                <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                                                    <SvgIcon name="check" className="w-3.5 h-3.5" /> Terverifikasi Studio
                                                </span>
                                            ) : asg.status === 'FILES_SUBMITTED' ? (
                                                <button
                                                    onClick={() => handleVerifyFiles(asg)}
                                                    disabled={isVerifyLoading}
                                                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-lg text-[11px] font-semibold transition"
                                                >
                                                    {isVerifyLoading ? 'Memproses...' : '🔍 Verifikasi & ACC File'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-500 text-[11px]">Menunggu File</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Rekening & Penggajian */}
                                    <div className="space-y-2 bg-white/2 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-300 flex items-center gap-1.5">
                                                <SvgIcon name="credit-card" className="w-3.5 h-3.5 text-emerald-400" /> Rincian Penggajian (Fee)
                                            </p>
                                            <span className="font-bold text-emerald-400 font-mono text-sm">{formatRupiah(asg.payout_fee_amount || asg.standard_fee)}</span>
                                        </div>

                                        {asg.payout_bank_name ? (
                                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-0.5 text-[11px]">
                                                <p className="text-gray-400">Rekening Tujuan:</p>
                                                <p className="font-semibold text-white font-mono">{asg.payout_bank_name} - {asg.payout_account_number}</p>
                                                <p className="text-gray-300">a.n <strong className="text-white">{asg.payout_account_name}</strong></p>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-gray-500 italic">Kru belum mengajukan data rekening</p>
                                        )}

                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[11px] text-gray-400">Status Pencairan:</span>
                                            {asg.status === 'PAID' ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    ✅ Lunas Ditransfer
                                                </span>
                                            ) : asg.status === 'CLAIMED' ? (
                                                <button
                                                    onClick={() => handleApprovePayout(asg)}
                                                    disabled={isPayoutLoading}
                                                    className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 text-white rounded-lg text-[11px] font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-1"
                                                >
                                                    {isPayoutLoading ? 'Memproses...' : '💸 Tandai Sudah Transfer & WA'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-500 text-[11px]">Menunggu Klaim Kru</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================================
// CREW SOP & CHECKLIST MANAGER (ADMIN DASHBOARD)
// ============================================================
const normalizePhoneID = (phone) => {
    if (!phone) return '';
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (!p.startsWith('62')) p = '62' + p;
    return p;
};

export default CrewPayrollManager;
export { CrewPayrollManager };
