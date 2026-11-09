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

function JadwalRiasComponent({ onShowToast, session, onNavigate }) {
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [filterEvent, setFilterEvent] = React.useState('Semua');
    const [loading, setLoading] = React.useState(true);
    const [isChecklistModalOpen, setIsChecklistModalOpen] = React.useState(false);
    const [selectedAppt, setSelectedAppt] = React.useState(null);

    // Modal checklist states
    const [busana, setBusana] = React.useState('');
    const [aksesoris, setAksesoris] = React.useState('');
    const [catatanRias, setCatatanRias] = React.useState('');
    const [statusFitting, setStatusFitting] = React.useState('Menunggu Fitting');
    const [ukuranBajuPria, setUkuranBajuPria] = React.useState('');
    const [ukuranBajuWanita, setUkuranBajuWanita] = React.useState('');
    const [ukuranCelanaPria, setUkuranCelanaPria] = React.useState('');
    const [keteranganUkuran, setKeteranganUkuran] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    // Inline edit date state
    const [editingDateId, setEditingDateId] = React.useState(null);
    const [tempFittingDate, setTempFittingDate] = React.useState('');

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
        let statusFitting = 'Menunggu Fitting';
        let fittingChecklist = '{}';

        if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist };

        const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/);
        if (divisiMatch) div = divisiMatch[1].trim();
        const namaPriaMatch = notesStr.match(/\[NAMA PRIA\]:\s*([^\n]+)/);
        if (namaPriaMatch) namaPria = namaPriaMatch[1].trim();
        const namaWanitaMatch = notesStr.match(/\[NAMA WANITA\]:\s*([^\n]+)/);
        if (namaWanitaMatch) namaWanita = namaWanitaMatch[1].trim();
        const jamSesiMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/);
        if (jamSesiMatch) jamSesi = jamSesiMatch[1].trim();
        const roomStudioMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/);
        if (roomStudioMatch) roomStudio = roomStudioMatch[1].trim();
        const photographerMatch = notesStr.match(/\[PHOTOGRAPHER\]:\s*([^\n]+)/);
        if (photographerMatch) photographer = photographerMatch[1].trim();
        const durasiSesiMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/);
        if (durasiSesiMatch) durasiSesi = durasiSesiMatch[1].trim();
        const jadwalFittingMatch = notesStr.match(/\[JADWAL FITTING\]:\s*([^\n]+)/);
        if (jadwalFittingMatch) jadwalFitting = jadwalFittingMatch[1].trim();
        const jadwalSurveiMatch = notesStr.match(/\[JADWAL SURVEI\]:\s*([^\n]+)/);
        if (jadwalSurveiMatch) jadwalSurvei = jadwalSurveiMatch[1].trim();
        const jadwalPemasanganMatch = notesStr.match(/\[JADWAL PEMASANGAN\]:\s*([^\n]+)/);
        if (jadwalPemasanganMatch) jadwalPemasangan = jadwalPemasanganMatch[1].trim();

        const hasilFittingMatch = notesStr.match(/\[HASIL FITTING\]:\s*([^\n]+)/);
        if (hasilFittingMatch) hasilFitting = hasilFittingMatch[1].trim();
        const statusFittingMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
        if (statusFittingMatch) statusFitting = statusFittingMatch[1].trim();
        const fittingChecklistMatch = notesStr.match(/\[FITTING CHECKLIST\]:\s*([^\n]+)/);
        if (fittingChecklistMatch) fittingChecklist = fittingChecklistMatch[1].trim();

        const prewedDateMatch = notesStr.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (prewedDateMatch) prewedDate = prewedDateMatch[1];
        const voucherMatch = notesStr.match(/\[VOUCHER\]:\s*([A-Za-z0-9_-]+)/);
        if (voucherMatch) voucherCode = voucherMatch[1];

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
            .replace(/\[NAMA PRIA\]:.*?\n*/g, '')
            .replace(/\[NAMA WANITA\]:.*?\n*/g, '')
            .replace(/\[JAM (?:SESI|PHOTOSHOOT)\]:.*?\n*/g, '')
            .replace(/\[ROOM STUDIO\]:.*?\n*/g, '')
            .replace(/\[PHOTOGRAPHER\]:.*?\n*/g, '')
            .replace(/\[DURASI SESI\]:.*?\n*/g, '')
            .replace(/\[JADWAL FITTING\]:.*?\n*/g, '')
            .replace(/\[JADWAL SURVEI\]:.*?\n*/g, '')
            .replace(/\[JADWAL PEMASANGAN\]:.*?\n*/g, '')
            .replace(/\[HASIL FITTING\]:.*?\n*/g, '')
            .replace(/\[STATUS FITTING\]:.*?\n*/g, '')
            .replace(/\[FITTING CHECKLIST\]:.*?\n*/g, '')
            .replace(/\[TANGGAL PREWED\]:.*?\n*/g, '')
            .replace(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[VOUCHER\]:.*?\n*/g, '')
            .replace(/\[BIAYA LAINNYA\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[KETERANGAN TAMBAHAN\]:\s*\n?/g, '')
            .trim();

        return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist };
    };

    const fetchLadyMakeupData = async () => {
        setLoading(true);
        try {
            const { data: appts, error: err1 } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
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

                // Filter only appointments relevant to Lady Makeup
                const filtered = mapped.filter(a => {
                    const div = a.division;
                    if (div === 'Lady Makeup') return true;
                    // Check if package or category includes bundling
                    const pkgTitle = (a.package_name || '').toLowerCase();
                    const pkgCat = (a.packages?.category || '').toLowerCase();
                    const hasMakeupNotes = a.additional_notes && a.additional_notes.toLowerCase().includes('makeup');
                    return pkgTitle.includes('bundling') || pkgCat.includes('bundling') || hasMakeupNotes;
                });
                setAppointments(filtered);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchLadyMakeupData();

        const channel = supabase
            .channel('lady-makeup-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchLadyMakeupData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleOpenChecklistModal = (appt) => {
        setSelectedAppt(appt);
        const parsed = parseNotesField(appt.additional_notes);
        let checklist = {};
        try {
            checklist = JSON.parse(parsed.fittingChecklist || '{}');
        } catch (e) { }

        setBusana(checklist.busana || '');
        setAksesoris(checklist.aksesoris || '');
        setCatatanRias(checklist.catatanRias || '');
        setUkuranBajuPria(checklist.ukuranBajuPria || '');
        setUkuranBajuWanita(checklist.ukuranBajuWanita || '');
        setUkuranCelanaPria(checklist.ukuranCelanaPria || '');
        setKeteranganUkuran(checklist.keteranganUkuran || '');

        // Set fitting status: use saved one, or derive based on whether hasilFitting is filled
        setStatusFitting(parsed.statusFitting || (parsed.hasilFitting ? 'Selesai Fitting' : 'Menunggu Fitting'));
        setIsChecklistModalOpen(true);
    };

    const handleSaveChecklist = async (e) => {
        e.preventDefault();
        if (!selectedAppt) return;
        setSaving(true);

        try {
            const parsed = parseNotesField(selectedAppt.additional_notes);
            parsed.hasilFitting = (busana || aksesoris) ? `${busana}${aksesoris ? ', ' + aksesoris : ''}` : '';
            parsed.statusFitting = statusFitting;

            const checklistObj = { busana, aksesoris, catatanRias, ukuranBajuPria, ukuranBajuWanita, ukuranCelanaPria, keteranganUkuran };
            parsed.fittingChecklist = JSON.stringify(checklistObj);

            let newNotes = `[DIVISI]: ${parsed.div || 'Lady Makeup'}\n\n`;
            if (parsed.jadwalFitting) newNotes += `[JADWAL FITTING]: ${parsed.jadwalFitting}\n\n`;
            if (parsed.hasilFitting) newNotes += `[HASIL FITTING]: ${parsed.hasilFitting}\n\n`;
            if (parsed.statusFitting) newNotes += `[STATUS FITTING]: ${parsed.statusFitting}\n\n`;
            newNotes += `[FITTING CHECKLIST]: ${parsed.fittingChecklist}\n\n`;

            if (parsed.namaPria) newNotes += `[NAMA PRIA]: ${parsed.namaPria}\n`;
            if (parsed.namaWanita) newNotes += `[NAMA WANITA]: ${parsed.namaWanita}\n`;
            if (parsed.namaPria || parsed.namaWanita) newNotes += `\n`;

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
                onShowToast("Gagal menyimpan checklist: " + error.message, "error");
            } else {
                onShowToast("Checklist fitting berhasil disimpan!", "success");
                setIsChecklistModalOpen(false);
                fetchLadyMakeupData();
            }
        } catch (err) {
            onShowToast("Terjadi kesalahan: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFittingDateInline = async (apptId, currentNotes, newDate) => {
        try {
            const parsed = parseNotesField(currentNotes);
            parsed.jadwalFitting = newDate;

            if (parsed.statusFitting === 'Menunggu Fitting' || !parsed.statusFitting) {
                parsed.statusFitting = 'Jadwal Fitting Dikirim';
            }

            let newNotes = `[DIVISI]: ${parsed.div || 'Lady Makeup'}\n\n`;
            if (parsed.jadwalFitting) newNotes += `[JADWAL FITTING]: ${parsed.jadwalFitting}\n\n`;
            if (parsed.hasilFitting) newNotes += `[HASIL FITTING]: ${parsed.hasilFitting}\n\n`;
            if (parsed.statusFitting) newNotes += `[STATUS FITTING]: ${parsed.statusFitting}\n\n`;
            if (parsed.fittingChecklist && parsed.fittingChecklist !== '{}') newNotes += `[FITTING CHECKLIST]: ${parsed.fittingChecklist}\n\n`;

            if (parsed.namaPria) newNotes += `[NAMA PRIA]: ${parsed.namaPria}\n`;
            if (parsed.namaWanita) newNotes += `[NAMA WANITA]: ${parsed.namaWanita}\n`;
            if (parsed.namaPria || parsed.namaWanita) newNotes += `\n`;

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
                .eq('id', apptId);

            if (error) {
                onShowToast("Gagal menyimpan tanggal fitting: " + error.message, "error");
            } else {
                onShowToast("Tanggal fitting berhasil diupdate!", "success");
                setEditingDateId(null);
                fetchLadyMakeupData();
            }
        } catch (err) {
            onShowToast("Error: " + err.message, "error");
        }
    };

    const startEditingDate = (apptId, currentDate) => {
        setEditingDateId(apptId);
        setTempFittingDate(currentDate || '');
    };

    const getEventCategory = (appt) => {
        const pkgCat = appt.packages?.category || '';
        if (pkgCat.startsWith('Lady Makeup:')) {
            return pkgCat.replace('Lady Makeup: ', '');
        }
        return 'Wedding';
    };

    // Filter appointments based on filterEvent dropdown
    const filteredAppts = appointments.filter(appt => {
        if (filterEvent === 'Semua') return true;
        const cat = getEventCategory(appt);
        return cat.toLowerCase() === filterEvent.toLowerCase();
    });

    return (
        <div className="animate-in fade-in flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                        <SvgIcon name="wand-sparkles" className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">SOP Divisi Makeup</h2>
                        <p className="text-xs text-gray-400">Manajemen jadwal fitting, checklist busana & kelengkapan rias</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Filter Acara:</span>
                        <select
                            value={filterEvent}
                            onChange={e => setFilterEvent(e.target.value)}
                            className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white appearance-none cursor-pointer"
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
                    <button
                        onClick={() => { if (typeof onNavigate === 'function') onNavigate('appointment', { openAdd: true }); }}
                        className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition duration-200 flex items-center gap-2 shadow-lg shadow-pink-600/10"
                    >
                        <span className="text-lg font-light leading-none">+</span> Appointment Mandiri
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin inline-block w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full"></span>
                </div>
            ) : filteredAppts.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border border-white/5">
                    <SvgIcon name="clipboard-x" className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm font-medium">Belum ada jadwal rias / fitting untuk kategori terpilih.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredAppts.map(appt => {
                        const parsed = parseNotesField(appt.additional_notes);
                        const isStandalone = appt.division === 'Lady Makeup';
                        const currentStatus = parsed.statusFitting || (parsed.hasilFitting ? 'Selesai Fitting' : 'Menunggu Fitting');

                        return (
                            <div key={appt.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 hover:border-pink-500/20 transition-all duration-300 relative group overflow-hidden">
                                {/* Accent side border */}
                                <div className={`absolute left-0 inset-y-0 w-1 ${currentStatus === 'Selesai Fitting' ? 'bg-emerald-500' : 'bg-pink-500'}`}></div>

                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            {appt.client_name}
                                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${isStandalone ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                                {isStandalone ? 'MANDIRI' : 'BUNDLING PUSAT'}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{appt.id} | Paket: {appt.package_name}</p>
                                    </div>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${currentStatus === 'Selesai Fitting'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                        }`}>
                                        {currentStatus}
                                    </span>
                                </div>

                                <div className="bg-white/2 p-4 rounded-xl space-y-3 text-xs pl-4 border border-white/5">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Hari H:</span>
                                        <span className="font-semibold text-white">
                                            {(() => {
                                                if (!appt.event_date) return '-';
                                                try {
                                                    const d = new Date(appt.event_date);
                                                    return isNaN(d.getTime()) ? appt.event_date : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                } catch (e) {
                                                    return appt.event_date;
                                                }
                                            })()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>1. Jadwal Fitting:</span>
                                        {editingDateId === appt.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={tempFittingDate}
                                                    onChange={e => setTempFittingDate(e.target.value)}
                                                    className="bg-gray-900 border border-white/20 rounded-md px-2 py-1 text-xs outline-none focus:border-pink-500 text-white [color-scheme:dark]"
                                                />
                                                <button
                                                    onClick={() => handleSaveFittingDateInline(appt.id, appt.additional_notes, tempFittingDate)}
                                                    className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 border border-emerald-500/30"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => setEditingDateId(null)}
                                                    className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 border border-red-500/30"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-white flex items-center gap-2">
                                                {(() => {
                                                    if (!parsed.jadwalFitting) return '-';
                                                    try {
                                                        const d = new Date(parsed.jadwalFitting);
                                                        return isNaN(d.getTime()) ? parsed.jadwalFitting : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                    } catch (e) {
                                                        return parsed.jadwalFitting;
                                                    }
                                                })()}
                                                <button
                                                    onClick={() => startEditingDate(appt.id, parsed.jadwalFitting)}
                                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition border border-white/5"
                                                    title="Edit Tanggal"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" /></svg>
                                                </button>
                                                {parsed.jadwalFitting && (
                                                    <button
                                                        onClick={async () => {
                                                            let formattedDate = parsed.jadwalFitting;
                                                            try {
                                                                const dateObj = new Date(parsed.jadwalFitting);
                                                                if (!isNaN(dateObj.getTime())) {
                                                                    formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                                }
                                                            } catch (e) { }
                                                            const waText = `Halo Kak ${appt.client_name}\nmimin dari Lady Makeup.\n\nBerikut adalah jadwal fitting Kakak:\nTanggal: ${formattedDate}\nLokasi: Galery Lady makeup ( Aceh Tamiang )\n\nMohon konfirmasi kehadirannya ya Kak. Terima kasih!`;
                                                            let phone = appt.client_phone || '';
                                                            if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                                                            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;

                                                            // Change status to Jadwal Fitting Dikirim if it's currently Menunggu Fitting
                                                            if (parsed.statusFitting === 'Menunggu Fitting' || !parsed.statusFitting) {
                                                                try {
                                                                    const updatedParsed = { ...parsed, statusFitting: 'Jadwal Fitting Dikirim' };
                                                                    let newNotes = `[DIVISI]: ${updatedParsed.div || 'Lady Makeup'}\n\n`;
                                                                    if (updatedParsed.jadwalFitting) newNotes += `[JADWAL FITTING]: ${updatedParsed.jadwalFitting}\n\n`;
                                                                    if (updatedParsed.hasilFitting) newNotes += `[HASIL FITTING]: ${updatedParsed.hasilFitting}\n\n`;
                                                                    if (updatedParsed.statusFitting) newNotes += `[STATUS FITTING]: ${updatedParsed.statusFitting}\n\n`;
                                                                    if (updatedParsed.fittingChecklist && updatedParsed.fittingChecklist !== '{}') newNotes += `[FITTING CHECKLIST]: ${updatedParsed.fittingChecklist}\n\n`;
                                                                    if (updatedParsed.namaPria) newNotes += `[NAMA PRIA]: ${updatedParsed.namaPria}\n`;
                                                                    if (updatedParsed.namaWanita) newNotes += `[NAMA WANITA]: ${updatedParsed.namaWanita}\n`;
                                                                    if (updatedParsed.namaPria || updatedParsed.namaWanita) newNotes += `\n`;
                                                                    if (updatedParsed.selectedAddonNames && updatedParsed.selectedAddonNames.length > 0) {
                                                                        newNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + updatedParsed.selectedAddonNames.map(name => `- ${name}`).join('\n') + `\n\n`;
                                                                    }
                                                                    if (updatedParsed.voucherCode) newNotes += `[VOUCHER]: ${updatedParsed.voucherCode}\n\n`;
                                                                    if (updatedParsed.customFees && updatedParsed.customFees.length > 0) {
                                                                        newNotes += `[BIAYA LAINNYA]:\n` + updatedParsed.customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
                                                                    }
                                                                    if (updatedParsed.keterangan) newNotes += `[KETERANGAN TAMBAHAN]:\n${updatedParsed.keterangan}`;

                                                                    await supabase
                                                                        .from('appointments')
                                                                        .update({ additional_notes: newNotes.trim() })
                                                                        .eq('id', appt.id);
                                                                    fetchLadyMakeupData();
                                                                } catch (e) { console.error('Status update error', e); }
                                                            }
                                                            window.open(waUrl, '_blank');
                                                        }}
                                                        className="p-1 bg-green-500/20 hover:bg-green-500/30 rounded text-green-400 transition border border-green-500/30 flex items-center gap-1.5 px-2.5"
                                                        title="Kirim Jadwal via WhatsApp"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                                        <span className="text-[10px] font-bold">Kirim WA</span>
                                                    </button>
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                                        <span className="text-gray-400 block">2. Hasil Fitting & Properti:</span>
                                        <p className="text-white font-medium italic pl-1 leading-relaxed">
                                            {parsed.hasilFitting || 'Belum ada data / Belum fitting'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pl-2">
                                    <button
                                        onClick={() => handleOpenChecklistModal(appt)}
                                        className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/5 border border-pink-500/20"
                                    >
                                        ✓ Isi Checklist Fitting
                                    </button>
                                    {parsed.hasilFitting && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    onShowToast("Menyiapkan PDF...", "info");
                                                    const res = await adminFetch('/api/fitting-pdf-generate', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(appt)
                                                    });
                                                    if (!res.ok) throw new Error('Gagal memuat PDF');
                                                    const blob = await res.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    window.open(url, '_blank');
                                                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                                                } catch (e) {
                                                    onShowToast(e.message, "error");
                                                }
                                            }}
                                            className="flex-1 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 border border-blue-500/20"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                            Lihat PDF Hasil Fitting
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isChecklistModalOpen && selectedAppt && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 overflow-y-auto max-h-[90dvh] overscroll-contain custom-scrollbar text-left">
                        <button onClick={() => setIsChecklistModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-1">Checklist Fitting Busana</h3>
                        <p className="text-xs text-gray-400 mb-6">Client: {selectedAppt.client_name} ({selectedAppt.id})</p>

                        <form onSubmit={handleSaveChecklist} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-400 block mb-1">Pilihan Busana / Kebaya *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Cth: Kebaya Putih Modern, Gaun Satin"
                                        value={busana}
                                        onChange={e => setBusana(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-400 block mb-1">Aksesoris / Kelengkapan (Opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="Cth: Siger Sunda, Melati, Veils, Mahkota"
                                        value={aksesoris}
                                        onChange={e => setAksesoris(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-400 block mb-1">Catatan Rias / Request MUA</label>
                                    <textarea
                                        placeholder="Cth: Request makeup soft glam, no cukur alis"
                                        value={catatanRias}
                                        onChange={e => setCatatanRias(e.target.value)}
                                        rows="2"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white resize-none"
                                    ></textarea>
                                </div>

                                <div className="col-span-2 border-t border-white/5 pt-3">
                                    <p className="text-xs font-semibold text-pink-400 mb-2 uppercase tracking-wider">📏 Ukuran & Keterangan</p>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Ukuran Baju Pria</label>
                                    <select value={ukuranBajuPria} onChange={e => setUkuranBajuPria(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-pink-500 text-white appearance-none cursor-pointer">
                                        <option value="" className="bg-gray-900">- Pilih -</option>
                                        <option value="S" className="bg-gray-900">S</option>
                                        <option value="M" className="bg-gray-900">M</option>
                                        <option value="L" className="bg-gray-900">L</option>
                                        <option value="XL" className="bg-gray-900">XL</option>
                                        <option value="XXL" className="bg-gray-900">XXL</option>
                                        <option value="XXXL" className="bg-gray-900">XXXL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Ukuran Baju Wanita</label>
                                    <select value={ukuranBajuWanita} onChange={e => setUkuranBajuWanita(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-pink-500 text-white appearance-none cursor-pointer">
                                        <option value="" className="bg-gray-900">- Pilih -</option>
                                        <option value="S" className="bg-gray-900">S</option>
                                        <option value="M" className="bg-gray-900">M</option>
                                        <option value="L" className="bg-gray-900">L</option>
                                        <option value="XL" className="bg-gray-900">XL</option>
                                        <option value="XXL" className="bg-gray-900">XXL</option>
                                        <option value="XXXL" className="bg-gray-900">XXXL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Ukuran Celana Pria</label>
                                    <select value={ukuranCelanaPria} onChange={e => setUkuranCelanaPria(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-pink-500 text-white appearance-none cursor-pointer">
                                        <option value="" className="bg-gray-900">- Pilih -</option>
                                        <option value="S" className="bg-gray-900">S</option>
                                        <option value="M" className="bg-gray-900">M</option>
                                        <option value="L" className="bg-gray-900">L</option>
                                        <option value="XL" className="bg-gray-900">XL</option>
                                        <option value="XXL" className="bg-gray-900">XXL</option>
                                        <option value="XXXL" className="bg-gray-900">XXXL</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[11px] text-gray-400 block mb-1">Keterangan Tambahan / Custom Ukuran</label>
                                    <textarea
                                        placeholder="Cth: Celana pria di potong sedikit, ukuran pria: M tapi dada L..."
                                        value={keteranganUkuran}
                                        onChange={e => setKeteranganUkuran(e.target.value)}
                                        rows="2"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white resize-none"
                                    ></textarea>
                                </div>

                                <div className="col-span-2 border-t border-white/5 pt-3">
                                    <label className="text-xs text-gray-400 block mb-1.5">Status Fitting *</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-xs cursor-pointer text-white">
                                            <input
                                                type="radio"
                                                name="statusFitting"
                                                value="Menunggu Fitting"
                                                checked={statusFitting === 'Menunggu Fitting'}
                                                onChange={() => setStatusFitting('Menunggu Fitting')}
                                                className="accent-pink-500 w-4 h-4 cursor-pointer"
                                            />
                                            Menunggu Fitting
                                        </label>
                                        <label className="flex items-center gap-2 text-xs cursor-pointer text-white">
                                            <input
                                                type="radio"
                                                name="statusFitting"
                                                value="Selesai Fitting"
                                                checked={statusFitting === 'Selesai Fitting'}
                                                onChange={() => setStatusFitting('Selesai Fitting')}
                                                className="accent-pink-500 w-4 h-4 cursor-pointer"
                                            />
                                            Selesai Fitting
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsChecklistModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition text-gray-400"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-pink-500/20"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Checklist'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


export default JadwalRiasComponent;
export { JadwalRiasComponent };
