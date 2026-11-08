import React from "react";
import {
    supabase,
    adminFetch,
    formatDateUI,
    formatRupiah,
    parseNotesField,
    getOrderDivisions,
    DEFAULT_CREW_RATE_ITEMS,
    parseCrewRates,
    serializeCrewRates,
    getContractDetailsForCrew
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

import CrewEventAssignmentsManager from "./CrewEventAssignmentsManager";
import CrewRateCardManager from "./CrewRateCardManager";
import CrewPresenceManager from "./CrewPresenceManager";
import CrewPayrollManager from "./CrewPayrollManager";
import CrewSopManager from "./CrewSopManager";
import CrewMonitorPayManager from "./CrewMonitorPayManager";

// ============================================================
const cleanCrewDisplayNotes = (notes) => {
    if (!notes) return '';
    return notes
        .replace(/\[RATES_JSON\]:[^\n]*/gi, '')
        .replace(/\[DIVISI\]:[^\n]*/gi, '')
        .trim();
};

function CrewManagementComponent({ onShowToast, adminFetch, menuParams }) {
    const ROLES = [
        { value: 'fotografer', label: 'Fotografer (FG)' },
        { value: 'videografer', label: 'Videografer (VG)' },
        { value: 'foto_video', label: 'FG + VG (Keduanya)' },
        { value: 'all', label: 'Semua Peran' },
    ];

    const division = 'lapanbelas.id';
    const [subTab, setSubTab] = React.useState(() => {
        const p = menuParams?.subTab;
        if (p === 'presence' || p === 'payroll') return 'monitor_pay';
        if (p === 'sop') return 'crew';
        return p || 'assignments';
    });
    const [settingsTab, setSettingsTab] = React.useState(() => {
        if (menuParams?.subTab === 'sop') return 'sop_templates';
        if (menuParams?.subTab === 'rates') return 'rates';
        return 'members';
    });
    const [crewList, setCrewList] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [filterRole, setFilterRole] = React.useState('all');
    const [searchQ, setSearchQ] = React.useState('');
    const [contracts, setContracts] = React.useState([]);
    const [selectedContract, setSelectedContract] = React.useState(null);
    const [contractModalOpen, setContractModalOpen] = React.useState(false);
    const [showAdminContractClauses, setShowAdminContractClauses] = React.useState(false);
    const [ratesModalCrew, setRatesModalCrew] = React.useState(null);
    const [crewRatesForm, setCrewRatesForm] = React.useState({ items: [...DEFAULT_CREW_RATE_ITEMS] });
    const [isSavingRates, setIsSavingRates] = React.useState(false);

    const handleOpenRatesModal = (crew) => {
        setRatesModalCrew(crew);
        setCrewRatesForm(parseCrewRates(crew.notes));
    };

    const handleSaveCrewRates = async (e) => {
        e.preventDefault();
        if (!ratesModalCrew) return;
        setIsSavingRates(true);
        try {
            const updatedNotes = serializeCrewRates(ratesModalCrew.notes, crewRatesForm);
            const payload = {
                id: ratesModalCrew.id,
                name: ratesModalCrew.name,
                phone: ratesModalCrew.phone,
                role: ratesModalCrew.role,
                type: ratesModalCrew.type,
                notes: updatedNotes,
                is_active: ratesModalCrew.is_active !== false
            };
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/admin/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan tarif');
            onShowToast?.(`Tarif jasa untuk ${ratesModalCrew.name} berhasil disimpan! 💰`, 'success');
            setRatesModalCrew(null);
            fetchCrew();
        } catch (err) {
            onShowToast?.('Gagal menyimpan tarif: ' + err.message, 'error');
        } finally {
            setIsSavingRates(false);
        }
    };

    const defaultForm = { name: '', phone: '', role: 'fotografer', division: 'both', type: 'freelance', notes: '', is_active: true, contract_type: 'lapanbelas.id', duration_years: 2 };
    const [form, setForm] = React.useState(defaultForm);

    const getCrewDivision = (crew) => {
        const notesLower = (crew.notes || '').toLowerCase();
        if (notesLower.includes('[divisi]: studio') || notesLower.includes('spesialis studio')) return 'studio';
        if (notesLower.includes('[divisi]: lapanbelas.id') || notesLower.includes('wedding') || notesLower.includes('wediding')) return 'lapanbelas.id';
        if (notesLower.includes('[divisi]: both')) return 'both';
        return 'both';
    };

    const divBadge = (div) => {
        if (div === 'studio') {
            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-500/20 text-purple-300 border-purple-500/30 whitespace-nowrap inline-flex items-center shrink-0">📸 Studio Photo</span>;
        }
        if (div === 'lapanbelas.id') {
            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30 whitespace-nowrap inline-flex items-center shrink-0">💍 Lapanbelas.id</span>;
        }
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 whitespace-nowrap inline-flex items-center shrink-0">🌟 Fleksibel</span>;
    };

    const fetchContracts = async () => {
        try {
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/admin/contracts');
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.contracts)) {
                setContracts(data.contracts);
            }
        } catch (e) {
            console.warn('Fetch contracts error:', e);
        }
    };

    const fetchCrew = async () => {
        setIsLoading(true);
        try {
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/admin/members');
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.members)) {
                setCrewList(data.members);
            } else {
                const { data: dbData } = await supabase.from('crew_members').select('*').order('name', { ascending: true });
                if (dbData) setCrewList(dbData);
            }
        } catch (e) {
            const { data: dbData } = await supabase.from('crew_members').select('*').order('name', { ascending: true });
            if (dbData) setCrewList(dbData);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => { 
        fetchCrew(); 
        fetchContracts();
    }, []);

    const handleOpenAdd = () => {
        setEditId(null);
        const curDiv = division !== 'all' ? division : 'both';
        setForm({
            ...defaultForm,
            division: curDiv,
            contract_type: curDiv === 'studio' ? 'studio' : 'lapanbelas.id',
            duration_years: curDiv === 'studio' ? 1 : 2
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (crew) => {
        setEditId(crew.id);
        const curDiv = getCrewDivision(crew);
        const cleanNotes = cleanCrewDisplayNotes(crew.notes);
        const curContract = contracts.find(c => (crew.phone && c.crew_phone && c.crew_phone.replace(/\D/g, '') === crew.phone.replace(/\D/g, '')) || c.crew_id === crew.id);

        setForm({ 
            name: crew.name, 
            phone: crew.phone, 
            role: crew.role, 
            division: curDiv,
            type: crew.type, 
            notes: cleanNotes, 
            is_active: crew.is_active !== false,
            contract_type: curContract?.contract_type || (curDiv === 'studio' ? 'studio' : 'lapanbelas.id'),
            duration_years: curContract?.duration_years || (curDiv === 'studio' ? 1 : 2)
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        let cleanNotes = cleanCrewDisplayNotes(form.notes);
        if (form.division) {
            cleanNotes = `[DIVISI]: ${form.division}\n${cleanNotes}`.trim();
        }

        // Pertahankan data [RATES_JSON] yang sudah ada jika sedang edit data kru
        if (editId) {
            const existingCrew = crewList.find(c => c.id === editId);
            const ratesMatch = existingCrew?.notes ? existingCrew.notes.match(/\[RATES_JSON\]:[^\n]*/i) : null;
            if (ratesMatch) {
                cleanNotes = `${cleanNotes}\n${ratesMatch[0]}`.trim();
            }
        }

        const payload = {
            id: editId,
            name: form.name.trim(),
            phone: form.phone.trim(),
            role: form.role,
            type: form.type,
            notes: cleanNotes,
            is_active: form.is_active,
            contract_type: form.contract_type || (form.division === 'studio' ? 'studio' : 'lapanbelas.id'),
            duration_years: Number(form.duration_years || (form.contract_type === 'studio' ? 1 : 2))
        };

        try {
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/admin/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Gagal menyimpan kru');
            }
            onShowToast?.(editId ? 'Data kru & kontrak berhasil diperbarui! ✅' : 'Kru baru berhasil ditambahkan! 🎉', 'success');
            setIsModalOpen(false);
            fetchCrew();
            fetchContracts();
        } catch (err) {
            onShowToast?.('Gagal menyimpan: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher(`/api/crew/admin/members/${confirmDeleteId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Gagal menghapus kru');
            }
            onShowToast?.('Kru berhasil dihapus.', 'success');
            fetchCrew();
        } catch (err) {
            onShowToast?.('Gagal menghapus: ' + err.message, 'error');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleToggleActive = async (crew) => {
        try {
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher(`/api/crew/admin/members/${crew.id}/toggle`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Gagal mengubah status kru');
            }
            onShowToast?.(data.is_active ? 'Kru diaktifkan kembali. ✅' : 'Kru dinonaktifkan.', 'success');
            fetchCrew();
        } catch (err) {
            onShowToast?.('Gagal mengubah status: ' + err.message, 'error');
        }
    };

    const handleAdminResetPin = async (crew) => {
        if (!window.confirm(`Reset PIN 4-digit untuk kru "${crew.name}" dan kirim PIN baru secara otomatis ke WhatsApp (${crew.phone})?`)) return;
        try {
            const res = await fetcher('/api/crew/admin/reset-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crewId: crew.id, phone: crew.phone })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                onShowToast?.(`PIN baru (${data.pin}) berhasil dibuat dan dikirim ke WA ${crew.name}! 📲`, 'success');
                fetchCrew();
            } else {
                onShowToast?.(data.error || 'Gagal mereset PIN kru', 'error');
            }
        } catch (e) {
            onShowToast?.('Gagal menghubungi server untuk reset PIN', 'error');
        }
    };

    const roleBadge = (role) => {
        const map = { fotografer: ['🎯 FG', 'bg-amber-500/20 text-amber-300 border-amber-500/30'], videografer: ['🎬 VG', 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'], foto_video: ['📸+🎬 FG+VG', 'bg-purple-500/20 text-purple-300 border-purple-500/30'], all: ['🌟 Semua', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'] };
        const [label, cls] = map[role] || ['❓', 'bg-gray-500/20 text-gray-400 border-gray-500/30'];
        return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap inline-flex items-center shrink-0 ${cls}`}>{label}</span>;
    };

    // Filter crew by selected division
    const scopedCrew = crewList.filter(c => {
        const cDiv = getCrewDivision(c);
        if (division === 'lapanbelas.id') return cDiv === 'lapanbelas.id' || cDiv === 'both';
        if (division === 'studio') return cDiv === 'studio' || cDiv === 'both';
        return true;
    });

    const filtered = scopedCrew.filter(c => {
        const matchRole = filterRole === 'all' || c.role === filterRole || c.role === 'foto_video' || c.role === 'all';
        const matchSearch = !searchQ || c.name.toLowerCase().includes(searchQ.toLowerCase()) || (c.phone || '').includes(searchQ);
        return matchRole && matchSearch;
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manajemen Kru & Lapangan</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">Alur Kerja 4 Langkah: Tugaskan → Info Acara → Kerjakan SOP → Bayar Gaji.</p>
                </div>
                {subTab === 'crew' && settingsTab === 'members' && (
                    <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shrink-0">
                        <SvgIcon name="plus" className="w-4 h-4" /> Tambah Kru Baru
                    </button>
                )}
            </div>

            {/* 3 Main Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200/90 dark:border-white/10 pb-3 overflow-x-auto scrollbar-none">
                <button
                    type="button"
                    onClick={() => setSubTab('assignments')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 ${subTab === 'assignments' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'}`}
                >
                    <SvgIcon name="calendar-days" className="w-4 h-4" />
                    <span>① Penugasan Acara</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('monitor_pay')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 ${subTab === 'monitor_pay' || subTab === 'presence' || subTab === 'payroll' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'}`}
                >
                    <SvgIcon name="camera" className="w-4 h-4" />
                    <span>② Pantau & Gaji</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('crew')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 ${subTab === 'crew' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'}`}
                >
                    <SvgIcon name="users" className="w-4 h-4" />
                    <span>③ Kru & Pengaturan</span>
                </button>
            </div>

            {/* Content per Tab */}
            {subTab === 'assignments' && (
                <CrewEventAssignmentsManager adminFetch={adminFetch} onShowToast={onShowToast} crewList={crewList} division={division} />
            )}

            {(subTab === 'monitor_pay' || subTab === 'presence' || subTab === 'payroll') && (
                <CrewMonitorPayManager adminFetch={adminFetch} onShowToast={onShowToast} division={division} />
            )}

            {subTab === 'sop' && (
                <CrewSopManager adminFetch={adminFetch} onShowToast={onShowToast} crewList={crewList} division={division} />
            )}

            {subTab === 'crew' && (
                <div className="space-y-5">
                    {/* Secondary Navigation under Kru & Pengaturan */}
                    <div className="flex items-center gap-2 bg-white/3 p-1.5 rounded-2xl border border-white/8 overflow-x-auto scrollbar-none">
                        <button
                            type="button"
                            onClick={() => setSettingsTab('members')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${settingsTab === 'members' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            👥 Data Kru & Tarif ({scopedCrew.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSettingsTab('sop_templates')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${settingsTab === 'sop_templates' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            📋 Master Standar Template SOP
                        </button>
                        <button
                            type="button"
                            onClick={() => setSettingsTab('rates')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${settingsTab === 'rates' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            💰 Master Tarif Paket Acara
                        </button>
                    </div>

                    {settingsTab === 'sop_templates' && (
                        <CrewSopManager adminFetch={adminFetch} onShowToast={onShowToast} crewList={crewList} division={division} initialMode="templates" hideModeSwitch={true} />
                    )}

                    {settingsTab === 'rates' && (
                        <CrewRateCardManager adminFetch={adminFetch} onShowToast={onShowToast} division={division} />
                    )}

                    {settingsTab === 'members' && (
                        <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Kru', count: scopedCrew.length, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-white/5' },
                            { label: 'Aktif', count: scopedCrew.filter(c => c.is_active !== false).length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                            { label: 'Staff Tetap', count: scopedCrew.filter(c => c.type === 'staff').length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
                            { label: 'Freelance', count: scopedCrew.filter(c => c.type === 'freelance').length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200 dark:border-white/10`}>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filter & Search */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text" placeholder="Cari nama / nomor WA..."
                            value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-emerald-500"
                        />
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none">
                            <option value="all">Semua Peran</option>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {/* Table / List */}
                    {isLoading ? (
                        <div className="text-center py-16 text-slate-400 dark:text-gray-500">Memuat data kru...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 dark:bg-white/3 rounded-2xl border border-slate-200 dark:border-white/8">
                            <p className="text-4xl mb-3">👥</p>
                            <p className="text-slate-800 dark:text-gray-300 font-semibold">Belum ada kru pada filter ini</p>
                            <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Klik "Tambah Kru Baru" untuk menambahkan kru pada divisi ini.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-white/3 rounded-2xl border border-slate-200/90 dark:border-white/8 overflow-hidden">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm min-w-[960px]">
                                    <thead>
                                        <tr className="border-b border-slate-200/90 dark:border-white/10 text-left bg-slate-100 dark:bg-white/5">
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap">Nama Kru</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap">No. WA</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap">Peran</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap">Divisi</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap">Tipe</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap">Kontrak Legal</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap text-center">Status</th>
                                            <th className="px-4 py-3.5 text-xs text-slate-500 dark:text-gray-400 font-semibold whitespace-nowrap text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filtered.map(crew => {
                                            const crewContract = contracts.find(c => (crew.phone && c.crew_phone && c.crew_phone.replace(/\D/g, '') === crew.phone.replace(/\D/g, '')) || c.crew_id === crew.id);
                                            return (
                                            <tr key={crew.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition ${crew.is_active === false ? 'opacity-50' : ''}`}>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{crew.name}</p>
                                                    {cleanCrewDisplayNotes(crew.notes) ? (
                                                        <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5 truncate max-w-[180px]">{cleanCrewDisplayNotes(crew.notes)}</p>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <a href={`https://wa.me/${crew.phone}`} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-mono text-xs flex items-center gap-1">
                                                            <SvgIcon name="message-circle" className="w-3.5 h-3.5" />{crew.phone}
                                                        </a>
                                                        {crew.has_pin ? (
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold" title="PIN Keamanan 4-Digit Aktif">🔒 PIN</span>
                                                        ) : (
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold" title="Kru Belum Mengatur PIN">⚠️ No PIN</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">{roleBadge(crew.role)}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">{divBadge(getCrewDivision(crew))}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap inline-flex items-center shrink-0 ${crew.type === 'staff' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'}`}>
                                                        {crew.type === 'staff' ? '⭐ Staff Tetap' : '🔹 Freelance'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {crewContract?.signed ? (
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 whitespace-nowrap inline-flex items-center shrink-0">
                                                                {crew.type === 'staff' 
                                                                    ? `✓ Aktif (${crewContract.contract_type === 'studio' ? '1 Thn' : `${crewContract.duration_years || 2} Thn`})`
                                                                    : '✓ Mitra Aktif'}
                                                            </span>
                                                            <button 
                                                                onClick={() => { setSelectedContract({ ...crewContract, crew_type: crew.type }); setContractModalOpen(true); }}
                                                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 text-[10px] font-semibold border border-white/10 transition shrink-0 whitespace-nowrap"
                                                                title="Lihat Tanda Tangan & Dokumen Kontrak"
                                                            >
                                                                📄 TTD
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 text-amber-300 border-amber-500/30 whitespace-nowrap inline-flex items-center shrink-0">
                                                                {crew.type === 'staff' 
                                                                    ? `⏳ Belum TTD (${crewContract?.contract_type === 'studio' ? '1 Thn' : `${crewContract?.duration_years || 2} Thn`})`
                                                                    : '⏳ Belum TTD Mitra'}
                                                            </span>
                                                            <button 
                                                                onClick={() => { 
                                                                    setSelectedContract(crewContract ? { ...crewContract, crew_type: crew.type } : {
                                                                        crew_id: crew.id,
                                                                        crew_name: crew.name,
                                                                        crew_phone: crew.phone,
                                                                        crew_type: crew.type,
                                                                        contract_type: getCrewDivision(crew) === 'studio' ? 'studio' : 'lapanbelas.id',
                                                                        duration_years: getCrewDivision(crew) === 'studio' ? 1 : 2,
                                                                        signed: false
                                                                    }); 
                                                                    setContractModalOpen(true); 
                                                                }}
                                                                className="p-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-xs border border-white/10 transition shrink-0"
                                                                title="Kelola Kontrak"
                                                            >
                                                                ⚙️
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                    <button onClick={() => handleToggleActive(crew)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap transition ${crew.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/20 hover:text-emerald-300'}`}>
                                                        {crew.is_active !== false ? '✅ Aktif' : '❌ Nonaktif'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleOpenRatesModal(crew)}
                                                            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0 whitespace-nowrap"
                                                            title="Atur Daftar Tarif Jasa Kru Ini"
                                                        >
                                                            <span>💰</span>
                                                            <span>Tarif</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleAdminResetPin(crew)}
                                                            className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg transition shrink-0"
                                                            title="Reset PIN & Kirim ke WA Kru"
                                                        >
                                                            <span className="text-xs">🔑</span>
                                                        </button>
                                                        <button onClick={() => handleOpenEdit(crew)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition shrink-0" title="Edit Profil"><SvgIcon name="edit" className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setConfirmDeleteId(crew.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition shrink-0" title="Hapus Kru"><SvgIcon name="trash-2" className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                                {filtered.map(crew => {
                                    const crewContract = contracts.find(c => (crew.phone && c.crew_phone && c.crew_phone.replace(/\D/g, '') === crew.phone.replace(/\D/g, '')) || c.crew_id === crew.id);
                                    return (
                                    <div key={crew.id} className={`p-4 space-y-2.5 ${crew.is_active === false ? 'opacity-50' : ''}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{crew.name}</p>
                                                {cleanCrewDisplayNotes(crew.notes) ? (
                                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-1">{cleanCrewDisplayNotes(crew.notes)}</p>
                                                ) : null}
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <a href={`https://wa.me/${crew.phone}`} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-1">
                                                        <SvgIcon name="message-circle" className="w-3 h-3" />{crew.phone}
                                                    </a>
                                                    {crew.has_pin ? (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">🔒 PIN</span>
                                                    ) : (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">⚠️ No PIN</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0 items-center">
                                                <button
                                                    onClick={() => handleOpenRatesModal(crew)}
                                                    className="px-2 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1"
                                                    title="Atur Tarif Gaji"
                                                >
                                                    <span>💰</span>
                                                    <span>Tarif</span>
                                                </button>
                                                <button
                                                    onClick={() => handleAdminResetPin(crew)}
                                                    className="p-1.5 bg-purple-500/15 text-purple-300 rounded-lg text-xs"
                                                    title="Reset PIN & Kirim WA"
                                                >
                                                    <span>🔑</span>
                                                </button>
                                                <button onClick={() => handleOpenEdit(crew)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><SvgIcon name="edit" className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setConfirmDeleteId(crew.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg"><SvgIcon name="trash-2" className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {roleBadge(crew.role)}
                                            {divBadge(getCrewDivision(crew))}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${crew.type === 'staff' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'}`}>{crew.type === 'staff' ? '⭐ Staff' : '🔹 Freelance'}</span>
                                            {crewContract?.signed ? (
                                                <button 
                                                    onClick={() => { setSelectedContract({ ...crewContract, crew_type: crew.type }); setContractModalOpen(true); }}
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                                                >
                                                    <span>{crew.type === 'staff' ? '✓ Kontrak Aktif' : '✓ Mitra Aktif'}</span>
                                                    <span>📄</span>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedContract(crewContract ? { ...crewContract, crew_type: crew.type } : {
                                                            crew_id: crew.id,
                                                            crew_name: crew.name,
                                                            crew_phone: crew.phone,
                                                            crew_type: crew.type,
                                                            contract_type: getCrewDivision(crew) === 'studio' ? 'studio' : 'lapanbelas.id',
                                                            duration_years: getCrewDivision(crew) === 'studio' ? 1 : 2,
                                                            signed: false
                                                        });
                                                        setContractModalOpen(true);
                                                    }}
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                                                >
                                                    <span>{crew.type === 'staff' ? '⏳ Belum TTD' : '⏳ Belum TTD Mitra'}</span>
                                                    <span>⚙️</span>
                                                </button>
                                            )}
                                            <button onClick={() => handleToggleActive(crew)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${crew.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{crew.is_active !== false ? '✅ Aktif' : '❌ Nonaktif'}</button>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#111318] border border-slate-200/90 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{editId ? 'Edit Data Kru' : 'Tambah Kru Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-gray-400 transition"><SvgIcon name="x" className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1.5">Nama Lengkap *</label>
                                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="cth: Budi Santoso" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1.5">Nomor WhatsApp * <span className="text-slate-500 dark:text-gray-500">(format: 628xxx...)</span></label>
                                <input required type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="628123456789" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white font-mono outline-none focus:border-emerald-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1.5">Peran *</label>
                                    <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none">
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1.5">Tipe *</label>
                                    <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none">
                                        <option value="freelance">🔹 Freelance</option>
                                        <option value="staff">⭐ Staff Tetap</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1.5">Divisi Kru *</label>
                                <select 
                                    value={form.division || 'both'} 
                                    onChange={e => setForm({ ...form, division: e.target.value })} 
                                    className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none"
                                >
                                    <option value="both">🌟 Fleksibel (Studio & Lapanbelas.id)</option>
                                    <option value="lapanbelas.id">💍 Lapanbelas.id (Wedding & Event)</option>
                                    <option value="studio">📸 Studio Photo (Studio Lapanbelas)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1.5">Catatan (opsional)</label>
                                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="cth: spesialis outdoor, tersedia hari kerja saja..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-emerald-500" />
                            </div>

                            {/* Ketentuan Kontrak Legal Kru */}
                            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                        <span>⚖️</span>
                                        <span>Ketentuan Kontrak Legal Kru (E-Contract)</span>
                                    </label>
                                    <span className="text-[10px] text-gray-400 font-mono">Wajib TTD</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-gray-400 block mb-1">Tipe Kontrak</label>
                                        <select
                                            value={form.contract_type || (form.division === 'studio' ? 'studio' : 'lapanbelas.id')}
                                            onChange={e => {
                                                const cType = e.target.value;
                                                setForm({
                                                    ...form,
                                                    contract_type: cType,
                                                    duration_years: cType === 'studio' ? 1 : (form.duration_years > 1 ? form.duration_years : 2)
                                                });
                                            }}
                                            className="w-full bg-gray-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                                        >
                                            <option value="studio">📸 Studio Photo (1 Thn)</option>
                                            <option value="lapanbelas.id">💍 Lapanbelas.id (2-3 Thn)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 block mb-1">Durasi Kontrak</label>
                                        <select
                                            value={form.duration_years || (form.contract_type === 'studio' ? 1 : 2)}
                                            onChange={e => setForm({ ...form, duration_years: Number(e.target.value) })}
                                            className="w-full bg-gray-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                                        >
                                            {form.contract_type === 'studio' ? (
                                                <option value={1}>1 Tahun (Standar Studio)</option>
                                            ) : (
                                                <>
                                                    <option value={2}>2 Tahun (Standar Lapanbelas)</option>
                                                    <option value={3}>3 Tahun (Komitmen Jangka Panjang)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/8">
                                <input type="checkbox" id="crew-active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                                <label htmlFor="crew-active" className="text-sm text-gray-300 cursor-pointer">Kru ini aktif dan bisa dipilih saat penugasan</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-gray-400 rounded-xl text-sm transition">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition">
                                    {isSubmitting ? 'Menyimpan...' : (editId ? 'Perbarui Data' : 'Simpan Kru')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111318] border border-red-500/30 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SvgIcon name="trash-2" className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="font-bold text-white mb-2">Hapus Data Kru?</h3>
                        <p className="text-gray-400 text-sm mb-6">Data kru ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-gray-400 rounded-xl text-sm transition">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Contract Preview Modal */}
            {contractModalOpen && selectedContract && (() => {
                const cDetails = getContractDetailsForCrew(
                    selectedContract.crew_type || selectedContract.type || (crewList.find(c => c.id === selectedContract.crew_id)?.type) || 'freelance',
                    selectedContract.contract_type,
                    selectedContract.duration_years
                );
                return (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                        <div className="bg-[#111318] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-lg">⚖️</span>
                                    <div>
                                        <h3 className="font-bold text-white text-base">Arsip Dokumen Legal Kru</h3>
                                        <p className="text-xs text-gray-400">{selectedContract.crew_name || selectedContract.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setContractModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition">✕</button>
                            </div>

                            {/* Document Body */}
                            <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 text-xs">
                                {/* Status Box */}
                                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${selectedContract.signed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                    <div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${selectedContract.signed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                                            {selectedContract.signed ? (cDetails.isStaff ? '✓ PKWT Ditandatangani' : '✓ Kemitraan Ditandatangani') : (cDetails.isStaff ? '⏳ Menunggu TTD PKWT' : '⏳ Menunggu TTD Mitra')}
                                        </span>
                                        <p className="text-xs text-white font-semibold mt-1">
                                            Status: {cDetails.typeLabel}
                                        </p>
                                    </div>
                                </div>

                                {/* Surat Perjanjian Letterhead */}
                                <div className="p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] space-y-2.5 text-gray-300">
                                    <div className="text-center pb-2.5 border-b border-white/10">
                                        <p className="font-bold text-white tracking-wider text-xs">{cDetails.isStaff ? 'PT STUDIO LAPAN BELAS' : 'PT STUDIO LAPAN BELAS & LAPANBELAS ID'}</p>
                                        <p className="text-[10px] text-gray-400">{cDetails.docTitle}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p><span className="text-gray-500">Pihak Pertama:</span> PT STUDIO LAPAN BELAS (Manajemen)</p>
                                        <p><span className="text-gray-500">Pihak Kedua  :</span> <strong className="text-white">{selectedContract.crew_name || selectedContract.name}</strong></p>
                                        <p><span className="text-gray-500">No. WhatsApp :</span> {selectedContract.crew_phone || selectedContract.phone}</p>
                                        <p><span className="text-gray-500">NIK KTP      :</span> <strong className="text-white">{selectedContract.nik || '(Belum mengisi NIK)'}</strong></p>
                                        <p><span className="text-gray-500">Jenis Dokumen:</span> <span className="text-amber-300 font-bold">{cDetails.typeLabel}</span></p>
                                        <p><span className="text-gray-500">Masa Berlaku :</span> {cDetails.isStaff ? (selectedContract.start_date ? `${selectedContract.start_date} s/d ${selectedContract.end_date}` : 'Menunggu penandatanganan') : 'Kemitraan Aktif Per Penugasan Resmi'}</p>
                                    </div>

                                    {selectedContract.signed && (
                                        <div className="pt-2.5 border-t border-white/10 space-y-2">
                                            <p className="text-gray-500 text-[10px]">Tanda Tangan Digital Pihak Kedua:</p>
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                                                {selectedContract.signature_url ? (
                                                    <img src={selectedContract.signature_url} alt="Tanda Tangan Digital" className="max-h-20 w-auto object-contain filter invert" />
                                                ) : (
                                                    <span className="text-gray-500 italic text-[11px]">Tanda tangan digital tersimpan</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-500 flex justify-between">
                                                <span>Waktu: {selectedContract.signed_at ? new Date(selectedContract.signed_at).toLocaleString('id-ID') : '-'}</span>
                                                <span>IP: {selectedContract.ip_address || '-'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Toggle Button View Clauses for Admin */}
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminContractClauses(!showAdminContractClauses)}
                                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 font-semibold text-xs border border-white/10 flex items-center justify-between transition"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span>📜</span>
                                            <span>{showAdminContractClauses ? `Sembunyikan Klausul & Sanksi ${cDetails.isStaff ? 'PKWT' : 'Kemitraan'}` : `Lihat 10 Klausul & Sanksi Resmi ${cDetails.isStaff ? 'PKWT' : 'Kemitraan'}`}</span>
                                        </span>
                                        <span>{showAdminContractClauses ? '▲' : '▼'}</span>
                                    </button>
                                    {showAdminContractClauses && (
                                        <div className="mt-2.5 p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-3 max-h-64 overflow-y-auto text-[11px] text-gray-300 leading-relaxed scrollbar-thin">
                                            {cDetails.articles.map((art, idx) => (
                                                <div key={idx} className="pb-2.5 border-b border-white/5 last:border-0 last:pb-0">
                                                    <p className="font-bold text-amber-300 mb-0.5">{art.number}: {art.title}</p>
                                                    <p className="text-gray-300">{art.content}</p>
                                                    {Array.isArray(art.subpoints) && art.subpoints.length > 0 && (
                                                        <div className="mt-1.5 space-y-1 pl-2.5 border-l-2 border-amber-500/40 text-gray-300">
                                                            {art.subpoints.map((sub, sIdx) => (
                                                                <p key={sIdx}><strong className="text-white">{sub.label}</strong> {sub.text}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {!selectedContract.signed && (
                                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                        <p className="text-xs text-gray-300 font-semibold">Tautan Langsung untuk Kru:</p>
                                        <p className="text-[11px] text-gray-400">
                                            Kru dapat langsung menandatangani dokumen ini dengan membuka Portal Kru via nomor WhatsApp mereka.
                                        </p>
                                        <a
                                            href={`https://wa.me/${(selectedContract.crew_phone || selectedContract.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${selectedContract.crew_name || 'Kru'}, mohon buka portal kru Lapanbelas ID untuk menandatangani ${cDetails.docTitle} resmi Anda: ${window.location.origin}/crew.html`)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition"
                                        >
                                            <span>📲 Kirim Pengingat TTD via WhatsApp</span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
                                {selectedContract.signed ? (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!window.confirm('Reset tanda tangan ini dan minta kru menandatangani ulang?')) return;
                                            try {
                                                const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
                                                const res = await fetcher('/api/crew/admin/contract/update', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        phone: selectedContract.crew_phone || selectedContract.phone,
                                                        reset_signature: true
                                                    })
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    onShowToast?.('Tanda tangan di-reset. Kru wajib TTD ulang.', 'info');
                                                    setContractModalOpen(false);
                                                    fetchContracts();
                                                }
                                            } catch (e) {
                                                onShowToast?.('Gagal reset: ' + e.message, 'error');
                                            }
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                                    >
                                        Reset TTD Kru
                                    </button>
                                ) : <div />}

                                <div className="flex items-center gap-2">
                                    {selectedContract.signed && (
                                        <button
                                            type="button"
                                            onClick={() => window.print()}
                                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition flex items-center gap-1"
                                        >
                                            <span>🖨️ Cetak Dokumen</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setContractModalOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Modal: Atur Tarif Gaji Jasa Kru */}
            {ratesModalCrew && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 w-full max-w-xl max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg">
                                    💰
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base leading-tight">
                                        Atur Tarif Jasa: {ratesModalCrew.name}
                                    </h3>
                                    <p className="text-xs text-amber-300/80 font-mono mt-0.5">
                                        {ratesModalCrew.phone} • {ratesModalCrew.role} {ratesModalCrew.type === 'staff' ? '(Staff)' : '(Freelance)'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRatesModalCrew(null)}
                                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition"
                            >
                                <SvgIcon name="x" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed flex items-center justify-between flex-wrap gap-2">
                            <span>
                                💡 <strong>Kelola Penuh Tarif (CRUD):</strong> Bisa ubah nama sesi, sesuaikan nominal, tambah kategori baru, atau hapus kategori yang tidak diperlukan.
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setCrewRatesForm(prev => ({
                                        ...prev,
                                        items: [
                                            ...(prev.items || []),
                                            { id: 'custom_' + Date.now(), key: 'custom', label: '', val: 300000, icon: '✨' }
                                        ]
                                    }));
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow"
                            >
                                <span>+ Tambah Kategori Baru</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveCrewRates} className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {(!crewRatesForm.items || crewRatesForm.items.length === 0) ? (
                                <div className="text-center py-10 bg-black/30 rounded-xl border border-white/5 space-y-2">
                                    <p className="text-2xl">📋</p>
                                    <p className="text-gray-400 text-xs">Belum ada kategori tarif untuk kru ini.</p>
                                    <button
                                        type="button"
                                        onClick={() => setCrewRatesForm({ items: [...DEFAULT_CREW_RATE_ITEMS] })}
                                        className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold"
                                    >
                                        🔄 Muat 10 Kategori Standar
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {crewRatesForm.items.map((item, idx) => (
                                        <div key={item.id || idx} className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-amber-500/30 transition space-y-2">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                    <span className="text-sm shrink-0">{item.icon || '📌'}</span>
                                                    <input
                                                        type="text"
                                                        value={item.label || ''}
                                                        onChange={e => {
                                                            const newArr = [...crewRatesForm.items];
                                                            newArr[idx] = { ...newArr[idx], label: e.target.value };
                                                            setCrewRatesForm(prev => ({ ...prev, items: newArr }));
                                                        }}
                                                        placeholder="Nama Kategori (cth: Prewedding Backup)"
                                                        className="w-full bg-transparent border-b border-white/10 focus:border-amber-400 text-xs font-semibold text-gray-200 outline-none pb-0.5"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newArr = crewRatesForm.items.filter((_, i) => i !== idx);
                                                        setCrewRatesForm(prev => ({ ...prev, items: newArr }));
                                                    }}
                                                    className="p-1 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded transition shrink-0"
                                                    title="Hapus Kategori Tarif Ini"
                                                >
                                                    <SvgIcon name="trash-2" className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-2 text-xs text-amber-400 font-mono pointer-events-none">Rp</span>
                                                <input
                                                    type="text"
                                                    value={item.val ? Number(item.val).toLocaleString('id-ID') : ''}
                                                    onChange={e => {
                                                        const num = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                                        const newArr = [...crewRatesForm.items];
                                                        newArr[idx] = { ...newArr[idx], val: num };
                                                        setCrewRatesForm(prev => ({ ...prev, items: newArr }));
                                                    }}
                                                    placeholder="0"
                                                    className="w-full bg-gray-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-emerald-400 font-bold outline-none focus:border-amber-400"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setCrewRatesForm({ items: [...DEFAULT_CREW_RATE_ITEMS] })}
                                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium border border-white/10 transition"
                                >
                                    🔄 Reset Standar Bawaan
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRatesModalCrew(null)}
                                        className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-400 rounded-xl text-xs font-semibold transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingRates}
                                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                                    >
                                        <span>💾</span>
                                        <span>{isSavingRates ? 'Menyimpan...' : 'Simpan Tarif'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
export default CrewManagementComponent;
export { CrewManagementComponent };
