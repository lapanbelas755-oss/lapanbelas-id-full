import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatDateUI,
    formatSelectedDateUI,
    parseNotesField,
    getOrderDivisions,
    getPackageDivision,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function LogistikDekorComponent({ onShowToast, session }) {
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [filterEvent, setFilterEvent] = React.useState('Semua');
    const [loading, setLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedAppt, setSelectedAppt] = React.useState(null);

    // Modal states
    const [statusSurvei, setStatusSurvei] = React.useState('Belum di survei');
    const [tanggalSurvei, setTanggalSurvei] = React.useState('');
    const [mulaiPemasangan, setMulaiPemasangan] = React.useState('');
    const [catatanSurvei, setCatatanSurvei] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const parseNotesField = (notesStr) => {
        let prewedDate = '';
        let selectedAddonNames = [];
        let voucherCode = '';
        let customFees = [];
        let keterangan = '';
        let div = 'lapanbelas.id';
        let namaPria = ''; let namaWanita = ''; let jamSesi = ''; let roomStudio = '';
        let photographer = ''; let durasiSesi = ''; let jadwalFitting = '';
        let jadwalSurvei = ''; let jadwalPemasangan = '';
        let hasilFitting = '';
        let statusFitting = 'Belum di survei';
        let fittingChecklist = '{}';

        if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist };

        const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/);
        if (divisiMatch) div = divisiMatch[1].trim();
        const jadwalSurveiMatch = notesStr.match(/\[JADWAL SURVEI\]:\s*([^\n]+)/);
        if (jadwalSurveiMatch) jadwalSurvei = jadwalSurveiMatch[1].trim();
        const jadwalPemasanganMatch = notesStr.match(/\[JADWAL PEMASANGAN\]:\s*([^\n]+)/);
        if (jadwalPemasanganMatch) jadwalPemasangan = jadwalPemasanganMatch[1].trim();

        const hasilFittingMatch = notesStr.match(/\[HASIL FITTING\]:\s*([^\n]+)/);
        if (hasilFittingMatch) hasilFitting = hasilFittingMatch[1].trim();
        const statusFittingMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
        if (statusFittingMatch) statusFitting = statusFittingMatch[1].trim();

        const addonMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/);
        if (addonMatch) {
            addonMatch[1].split('\n').forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                if (cleanLine) {
                    const detailMatch = cleanLine.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (detailMatch) {
                        selectedAddonNames.push(detailMatch[1].trim());
                    } else {
                        selectedAddonNames.push(cleanLine);
                    }
                }
            });
        }

        const feesMatch = notesStr.match(/\[BIAYA LAINNYA\]:\s*\n?((?:- .*\n?)*)/);
        if (feesMatch) {
            feesMatch[1].split('\n').forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                if (cleanLine) {
                    const detailMatch = cleanLine.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (detailMatch) {
                        customFees.push({ description: detailMatch[1].trim(), amount: Number(detailMatch[2].replace(/\./g, '')) });
                    }
                }
            });
        }

        const ketMatch = notesStr.match(/\[KETERANGAN TAMBAHAN\]:\s*\n?([\s\S]*)$/);
        keterangan = ketMatch ? ketMatch[1].trim() : notesStr
            .replace(/\[DIVISI\]:.*?\n*/g, '')
            .replace(/\[JADWAL SURVEI\]:.*?\n*/g, '')
            .replace(/\[JADWAL PEMASANGAN\]:.*?\n*/g, '')
            .replace(/\[HASIL FITTING\]:.*?\n*/g, '')
            .replace(/\[STATUS FITTING\]:.*?\n*/g, '')
            .replace(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[VOUCHER\]:.*?\n*/g, '')
            .replace(/\[BIAYA LAINNYA\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[KETERANGAN TAMBAHAN\]:\s*\n?/g, '')
            .trim();

        return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist, surveiDate: jadwalSurvei, pemasanganDate: jadwalPemasangan };
    };

    const fetchDecorData = async () => {
        setLoading(true);
        try {
            const { data: appts, error: err1 } = await supabase.from('appointments').select('*').order('event_date', { ascending: true });
            const { data: pkgs, error: err2 } = await supabase.from('packages').select('*');
            if (err1) console.error(err1);
            if (err2) console.error(err2);

            if (appts && pkgs) {
                setPackages(pkgs);
                const pkgMap = {};
                pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mapped = appts.map(a => {
                    const pkg = pkgMap[a.package_name];
                    const division = getPackageDivision(pkg);
                    return { ...a, division, packages: pkg };
                });

                const filtered = mapped.filter(a => a.division === 'Lapanbelas Dekorasi' && a.status !== 'Menunggu DP');
                setAppointments(filtered);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchDecorData();
        const channel = supabase.channel('dekor-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchDecorData();
            }).subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleOpenModal = (appt) => {
        setSelectedAppt(appt);
        const parsed = parseNotesField(appt.additional_notes);
        setStatusSurvei(parsed.statusFitting || 'Belum di survei');
        setTanggalSurvei(parsed.jadwalSurvei || '');

        let startPasang = '';
        if (parsed.jadwalPemasangan) {
            const parts = parsed.jadwalPemasangan.split(' s/d ');
            startPasang = parts[0] || '';
        }
        setMulaiPemasangan(startPasang);
        setCatatanSurvei(parsed.hasilFitting || '');
        setIsModalOpen(true);
    };

    const handleSaveData = async (e) => {
        e.preventDefault();
        if (!selectedAppt) return;
        setSaving(true);

        try {
            const parsed = parseNotesField(selectedAppt.additional_notes);
            parsed.statusFitting = statusSurvei;
            parsed.jadwalSurvei = tanggalSurvei;
            parsed.hasilFitting = catatanSurvei;

            let rangeStr = '';
            if (mulaiPemasangan) {
                const d1 = new Date(mulaiPemasangan);
                const d2 = new Date(mulaiPemasangan);
                d2.setDate(d1.getDate() + 1);

                const yyyy1 = d1.getFullYear();
                const mm1 = String(d1.getMonth() + 1).padStart(2, '0');
                const dd1 = String(d1.getDate()).padStart(2, '0');

                const yyyy2 = d2.getFullYear();
                const mm2 = String(d2.getMonth() + 1).padStart(2, '0');
                const dd2 = String(d2.getDate()).padStart(2, '0');

                rangeStr = `${yyyy1}-${mm1}-${dd1} s/d ${yyyy2}-${mm2}-${dd2}`;
            }
            parsed.jadwalPemasangan = rangeStr;

            let newNotes = `[DIVISI]: Lapanbelas Dekorasi\n\n`;
            if (parsed.jadwalSurvei) newNotes += `[JADWAL SURVEI]: ${parsed.jadwalSurvei}\n`;
            if (parsed.jadwalPemasangan) newNotes += `[JADWAL PEMASANGAN]: ${parsed.jadwalPemasangan}\n`;
            if (parsed.hasilFitting) newNotes += `[HASIL FITTING]: ${parsed.hasilFitting}\n`;
            if (parsed.statusFitting) newNotes += `[STATUS FITTING]: ${parsed.statusFitting}\n\n`;

            if (parsed.selectedAddonNames && parsed.selectedAddonNames.length > 0) {
                newNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + parsed.selectedAddonNames.map(name => `- ${name}`).join('\n') + `\n\n`;
            }
            if (parsed.voucherCode) newNotes += `[VOUCHER]: ${parsed.voucherCode}\n\n`;
            if (parsed.customFees && parsed.customFees.length > 0) {
                newNotes += `[BIAYA LAINNYA]:\n` + parsed.customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
            }
            if (parsed.keterangan) newNotes += `[KETERANGAN TAMBAHAN]:\n${parsed.keterangan}`;

            const { error } = await supabase
                .from('appointments')
                .update({ additional_notes: newNotes.trim() })
                .eq('id', selectedAppt.id);

            if (error) {
                onShowToast("Gagal menyimpan data: " + error.message, "error");
            } else {
                onShowToast("Jadwal & survei berhasil disimpan!", "success");
                setIsModalOpen(false);
                fetchDecorData();
            }
        } catch (err) {
            onShowToast("Terjadi kesalahan: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const formatEventDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const formatRangePemasangan = (rangeStr) => {
        if (!rangeStr) return '-';
        try {
            const parts = rangeStr.split(' s/d ');
            if (parts.length < 2) return rangeStr;

            const d1 = new Date(parts[0]);
            const d2 = new Date(parts[1]);
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return rangeStr;

            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            const str1 = d1.toLocaleDateString('id-ID', { day: 'numeric' });
            const str2 = d2.toLocaleDateString('id-ID', options);
            return `${str1} - ${str2}`;
        } catch (e) {
            return rangeStr;
        }
    };

    const getEventCategory = (appt) => {
        const cat = appt.packages?.category || '';
        if (cat.startsWith('Lapanbelas Dekorasi:')) {
            return cat.replace('Lapanbelas Dekorasi: ', '');
        }
        return 'Dekorasi';
    };

    const filteredList = appointments.filter(appt => {
        const eventCat = getEventCategory(appt).toLowerCase();
        const pkgTitle = appt.package_name.toLowerCase();

        if (filterEvent === 'Semua') return true;

        const isAkad = eventCat.includes('akad') || pkgTitle.includes('akad');
        const isResepsi = eventCat.includes('resepsi') || pkgTitle.includes('resepsi');
        const isLamaran = eventCat.includes('lamaran') || pkgTitle.includes('lamaran');
        const isTasyakuran = eventCat.includes('tasyakuran') || pkgTitle.includes('tasyakuran');
        const isPhotoshoot = eventCat.includes('photoshoot') || pkgTitle.includes('photoshoot');

        if (filterEvent === 'Akad') return isAkad && !isResepsi;
        if (filterEvent === 'Resepsi') return isResepsi && !isAkad;
        if (filterEvent === 'Akad + Resepsi') return isAkad && isResepsi;
        if (filterEvent === 'Lamaran') return isLamaran;
        if (filterEvent === 'Tasyakuran') return isTasyakuran;
        if (filterEvent === 'Photoshoot') return isPhotoshoot;
        return true;
    });

    const getPreviewRange = () => {
        if (!mulaiPemasangan) return 'Pilih Tanggal Mulai Pemasangan';
        const d1 = new Date(mulaiPemasangan);
        const d2 = new Date(mulaiPemasangan);
        d2.setDate(d1.getDate() + 1);

        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        const str1 = d1.toLocaleDateString('id-ID', { day: 'numeric' });
        const str2 = d2.toLocaleDateString('id-ID', options);
        return `${str1} - ${str2}`;
    };

    return (
        <div className="animate-in fade-in flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <SvgIcon name="flower" className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">SOP Divisi Dekorasi</h2>
                        <p className="text-xs text-gray-400">Manajemen jadwal survei lapangan & logistik pemasangan pelaminan</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Filter Acara:</span>
                    <select
                        value={filterEvent}
                        onChange={e => setFilterEvent(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white cursor-pointer"
                    >
                        <option value="Semua">Semua</option>
                        <option value="Akad">Akad</option>
                        <option value="Resepsi">Resepsi</option>
                        <option value="Akad + Resepsi">Akad + Resepsi</option>
                        <option value="Lamaran">Lamaran</option>
                        <option value="Tasyakuran">Tasyakuran</option>
                        <option value="Photoshoot">Photoshoot</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" />
                </div>
            ) : filteredList.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border border-white/5">
                    <SvgIcon name="file-text" className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm font-medium">Belum ada pesanan dekorasi untuk kategori terpilih.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredList.map(appt => {
                        const parsed = parseNotesField(appt.additional_notes);
                        const isDone = parsed.statusFitting === 'Selesai di survei';
                        return (
                            <div key={appt.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 hover:border-emerald-500/20 transition-all duration-300 relative group overflow-hidden">
                                <div className={`absolute left-0 inset-y-0 w-1 ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                {appt.client_name}
                                            </h3>
                                            {appt.client_phone && (
                                                <a
                                                    href={`https://wa.me/${appt.client_phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-emerald-400 hover:text-emerald-300 transition"
                                                    title="Chat WhatsApp"
                                                >
                                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.49-4.832c1.649.979 3.264 1.489 4.904 1.49 5.376.002 9.75-4.368 9.754-9.743.003-2.604-.998-5.053-2.822-6.879C16.562 2.21 14.114.99 11.507.99c-5.378 0-9.754 4.374-9.759 9.748-.002 1.83.49 3.616 1.425 5.197L2.153 21.84l6.096-1.597.298.175z" />
                                                    </svg>
                                                </a>
                                            )}
                                            <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                                                {getEventCategory(appt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{appt.id} | Paket: {appt.package_name}</p>
                                    </div>

                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${isDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                        {parsed.statusFitting || 'Belum di survei'}
                                    </span>
                                </div>

                                <div className="bg-white/2 p-4 rounded-xl space-y-3 text-xs pl-4 border border-white/5">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Hari H (Acara):</span>
                                        <span className="font-semibold text-white">{formatEventDate(appt.event_date)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>📍 Tgl Survei:</span>
                                        <span className={`font-semibold ${parsed.surveiDate ? 'text-white' : 'text-gray-600'}`}>
                                            {formatEventDate(parsed.surveiDate)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>🔨 Tgl Pemasangan (2 Hari):</span>
                                        <span className={`font-semibold ${parsed.pemasanganDate ? 'text-white' : 'text-gray-600'}`}>
                                            {formatRangePemasangan(parsed.pemasanganDate)}
                                        </span>
                                    </div>

                                    {parsed.hasilFitting && (
                                        <div className="space-y-1 pt-2 border-t border-white/5">
                                            <span className="text-gray-400 block">📝 Catatan Hasil Survei / Akses Lokasi:</span>
                                            <p className="text-white font-medium italic pl-1 leading-relaxed">{parsed.hasilFitting}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pl-2">
                                    <button
                                        onClick={() => handleOpenModal(appt)}
                                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-emerald-500/20"
                                    >
                                        {parsed.surveiDate ? 'Edit Jadwal & Survei' : 'Atur Jadwal & Survei'}
                                    </button>

                                    {parsed.hasilFitting && (
                                        <a
                                            href={`/api/decor-pdf/${appt.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition border border-emerald-500/20 flex items-center justify-center"
                                            title="Lihat PDF Logistik"
                                        >
                                            <SvgIcon name="file-text" className="w-4.5 h-4.5 text-emerald-400" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && selectedAppt && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95 overflow-y-auto max-h-[90dvh] overscroll-contain custom-scrollbar text-left">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-1">Jadwal & Survei Dekorasi - {selectedAppt.client_name}</h3>
                        <p className="text-xs text-gray-400 mb-6">Kelola tanggal survei lokasi dan pemasangan.</p>

                        <form onSubmit={handleSaveData} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Status Saat Ini</label>
                                <select
                                    value={statusSurvei}
                                    onChange={e => setStatusSurvei(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white cursor-pointer"
                                >
                                    <option value="Belum di survei">Belum di survei</option>
                                    <option value="Selesai di survei">Selesai di survei</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Tanggal Survei Lokasi</label>
                                    <input
                                        type="date"
                                        value={tanggalSurvei}
                                        onChange={e => setTanggalSurvei(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Mulai Pemasangan</label>
                                    <input
                                        type="date"
                                        value={mulaiPemasangan}
                                        onChange={e => setMulaiPemasangan(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Rentang Jadwal Pemasangan (Otomatis 2 Hari)</label>
                                <div className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-3 text-xs text-emerald-400 font-semibold text-center bg-emerald-500/5">
                                    {getPreviewRange()}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Catatan Hasil Survei / Akses Lokasi</label>
                                <textarea
                                    value={catatanSurvei}
                                    onChange={e => setCatatanSurvei(e.target.value)}
                                    rows="4"
                                    placeholder="Contoh: Akses jalan sempit, butuh mobil kecil untuk angkut barang..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition text-gray-400"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center border border-emerald-500/20"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


export default LogistikDekorComponent;
export { LogistikDekorComponent };
