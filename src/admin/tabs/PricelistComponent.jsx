import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatSelectedDateUI,
    getOrderDivisions,
    getPackageDivision,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function PricelistComponent({ onShowToast, session, mode }) {
    const isMakeupMode = mode === 'makeup' || checkRole(session?.role, 'makeup');
    const isStudioMode = mode === 'studio' || checkRole(session?.role, 'studio');
    const isDecorMode = mode === 'dekor' || checkRole(session?.role, 'dekor');
    const [packages, setPackages] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState(isMakeupMode ? 'Lady Makeup' : isStudioMode ? 'Studio Lapanbelas' : isDecorMode ? 'Lapanbelas Dekorasi' : 'lapanbelas.id');

    // HPP & Profit State & Helpers
    const [hppDivisionFilter, setHppDivisionFilter] = React.useState('all');
    const [hppSelectedPkgId, setHppSelectedPkgId] = React.useState(null);
    const [hppSearchQuery, setHppSearchQuery] = React.useState('');
    const [currentHppItems, setCurrentHppItems] = React.useState([]);
    const [isSavingHpp, setIsSavingHpp] = React.useState(false);

    const parseHppItems = (pkg) => {
        if (!pkg || !pkg.description) return [];
        try {
            const match = pkg.description.match(/\[HPP_ITEMS\]:\s*([^\r\n]+)/);
            if (match && match[1]) {
                const raw = match[1].trim();
                if (raw.startsWith('%5B') || raw.startsWith('%7B')) {
                    return JSON.parse(decodeURIComponent(raw));
                }
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error("Error parsing HPP items:", e);
        }
        return [];
    };

    const getPkgFinancials = (pkg) => {
        const items = parseHppItems(pkg);
        const totalHpp = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
        const price = Number(pkg?.price) || 0;
        const profit = price - totalHpp;
        const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';
        return { items, totalHpp, price, profit, margin };
    };

    // Auto-select package when entering HPP & Profit or when packages load
    React.useEffect(() => {
        if (activeTab === 'HPP & Profit' && packages.length > 0) {
            if (!hppSelectedPkgId || !packages.some(p => p.id === hppSelectedPkgId)) {
                const first = packages[0];
                setHppSelectedPkgId(first.id);
                setCurrentHppItems(parseHppItems(first));
            }
        }
    }, [activeTab, packages]);

    const handleSelectHppPkg = (pkgId) => {
        setHppSelectedPkgId(pkgId);
        const found = packages.find(p => p.id === pkgId);
        if (found) {
            setCurrentHppItems(parseHppItems(found));
        }
    };

    const handleAddPresetItem = (name, category = 'SDM / Crew') => {
        setCurrentHppItems(prev => [
            ...prev,
            { id: Date.now().toString() + Math.random().toString(36).substr(2, 4), name, category, amount: '' }
        ]);
    };

    const handleAddNewCostItem = () => {
        setCurrentHppItems(prev => [
            ...prev,
            { id: Date.now().toString() + Math.random().toString(36).substr(2, 4), name: '', category: 'SDM / Crew', amount: '' }
        ]);
    };

    const handleUpdateCostItem = (index, field, value) => {
        setCurrentHppItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
    };

    const handleDeleteCostItem = (index) => {
        setCurrentHppItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSaveCurrentHpp = async () => {
        const targetPkg = packages.find(p => p.id === hppSelectedPkgId);
        if (!targetPkg) return;
        setIsSavingHpp(true);
        try {
            const validItems = currentHppItems
                .filter(it => it.name && it.name.trim() !== '')
                .map(it => ({
                    id: it.id || (Date.now().toString() + Math.random().toString(36).substr(2, 4)),
                    name: it.name.trim(),
                    category: it.category || 'Lain-lain',
                    amount: Number(it.amount) || 0
                }));

            const encoded = encodeURIComponent(JSON.stringify(validItems));
            let baseDesc = (targetPkg.description || '').replace(/\[HPP_ITEMS\]:\s*[^\r\n]+[\r\n]*/g, '').trim();
            const newDesc = validItems.length > 0 ? `${baseDesc}\n\n[HPP_ITEMS]: ${encoded}` : baseDesc;

            const { error } = await supabase.from('packages').update({ description: newDesc }).eq('id', targetPkg.id);
            if (error) throw error;

            setPackages(prev => prev.map(p => p.id === targetPkg.id ? { ...p, description: newDesc } : p));
            if (onShowToast) onShowToast(`Rincian HPP untuk ${targetPkg.title} berhasil disimpan!`, 'success');
        } catch (err) {
            console.error("Gagal simpan HPP:", err);
            if (onShowToast) onShowToast("Gagal menyimpan HPP: " + (err.message || ''), 'error');
        } finally {
            setIsSavingHpp(false);
        }
    };

    const defaultForm = {
        title: '',
        category: 'Wedding',
        price: '',
        minDp: '',
        is_active: true,
        description: '',
        image_url: '',
        duration: '',
        deadlineEditorDays: '15',
        deadlineCetakDays: '15',
        deadlineDays: '30',
        photoLimit: '80'
    };
    const [formData, setFormData] = React.useState(defaultForm);
    const [uploadingImage, setUploadingImage] = React.useState(false);

    const handleUploadPackageImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const compressed = await compressImageIfNeeded(file);
            const cleanName = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
            const fileName = `packages/${Date.now()}_${cleanName}`;
            const { error: uploadError } = await supabase.storage
                .from('packages')
                .upload(fileName, compressed, { contentType: compressed.type || 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
            const { data: pubData } = supabase.storage.from('packages').getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, image_url: pubData.publicUrl }));
            if (onShowToast) onShowToast('Foto paket berhasil diunggah ke Supabase!', 'success');
        } catch (err) {
            console.error(err);
            if (onShowToast) onShowToast('Gagal upload foto: ' + (err.message || ''), 'error');
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };

    const fetchPackages = async () => {
        const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error("Gagal load packages:", error.message);
        } else if (data) {
            setPackages(data);
        }
    };

    React.useEffect(() => {
        fetchPackages();
    }, []);

    const handleAddClick = () => {
        setEditId(null);
        let defaultCategory = 'Wedding';
        let defaultDeadlineDays = '30';
        let defaultDeadlineEditor = '15';
        let defaultDeadlineCetak = '15';
        if (activeTab === 'Studio Lapanbelas') {
            defaultCategory = 'Photo Self';
            defaultDeadlineDays = '7';
            defaultDeadlineEditor = '7';
            defaultDeadlineCetak = '0';
        }
        else if (activeTab === 'Lady Makeup') defaultCategory = 'Lady Makeup: Akad';
        else if (activeTab === 'Lapanbelas Dekorasi') defaultCategory = 'Lapanbelas Dekorasi: Pelaminan Only';

        setFormData({
            ...defaultForm,
            category: defaultCategory,
            minDp: '',
            duration: '',
            deadlineEditorDays: defaultDeadlineEditor,
            deadlineCetakDays: defaultDeadlineCetak,
            deadlineDays: defaultDeadlineDays,
            photoLimit: '80'
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (pkg) => {
        setEditId(pkg.id);
        const desc = pkg.description || '';
        const durationMatch = desc.match(/\[DURATION\]:\s*(\d+)/);
        const dur = durationMatch ? durationMatch[1] : '';
        const deadlineEditorMatch = desc.match(/\[DEADLINE_EDITOR\]:\s*(\d+)/i);
        const deadlineCetakMatch = desc.match(/\[DEADLINE_CETAK\]:\s*(\d+)/i);
        const deadlineMatch = desc.match(/\[DEADLINE\]:\s*(\d+)/i);

        const isStudioPkg = getPackageDivision(pkg) === 'Studio Lapanbelas';
        const deadlineDays = deadlineMatch ? deadlineMatch[1] : (isStudioPkg ? '7' : '30');
        let deadlineEditorDays = deadlineEditorMatch ? deadlineEditorMatch[1] : '';
        let deadlineCetakDays = deadlineCetakMatch ? deadlineCetakMatch[1] : '';

        if (!deadlineEditorDays) {
            if (isStudioPkg) {
                deadlineEditorDays = deadlineDays;
                deadlineCetakDays = '0';
            } else {
                const total = parseInt(deadlineDays, 10) || 30;
                deadlineEditorDays = String(total > 15 ? total - 15 : Math.max(1, Math.round(total / 2)));
                deadlineCetakDays = String(total - parseInt(deadlineEditorDays, 10));
            }
        }

        const photoLimitMatch = desc.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
        const photoLimit = photoLimitMatch ? photoLimitMatch[1] : '80';
        const dpMatch = desc.match(/\[(?:DP|MIN_DP)\]:\s*(\d+)/i);
        const minDp = dpMatch ? dpMatch[1] : (pkg.min_dp ? String(pkg.min_dp) : '');
        const cleanDesc = desc
            .replace(/\[DURATION\]:\s*\d+\s*[\r\n]*/g, '')
            .replace(/\[DEADLINE_EDITOR\]:\s*\d+\s*[\r\n]*/g, '')
            .replace(/\[DEADLINE_CETAK\]:\s*\d+\s*[\r\n]*/g, '')
            .replace(/\[DEADLINE\]:\s*\d+\s*[\r\n]*/g, '')
            .replace(/\[PHOTO_LIMIT\]:\s*\d+\s*[\r\n]*/g, '')
            .replace(/\[(?:DP|MIN_DP)\]:\s*\d+\s*[\r\n]*/g, '')
            .replace(/\[HPP_ITEMS\]:\s*[^\r\n]+[\r\n]*/g, '')
            .trim();

        setFormData({
            title: pkg.title,
            category: pkg.category,
            price: pkg.price,
            minDp: minDp,
            is_active: pkg.is_active,
            description: cleanDesc,
            image_url: pkg.image_url || '',
            duration: dur,
            deadlineEditorDays: deadlineEditorDays,
            deadlineCetakDays: deadlineCetakDays || '0',
            deadlineDays: deadlineDays,
            photoLimit: photoLimit
        });
        setActiveTab(getPackageDivision(pkg));
        setIsModalOpen(true);
    };

    const confirmDeletePkg = async () => {
        const { error } = await supabase.from('packages').delete().eq('id', confirmDeleteId);
        if (error) {
            // Jika gagal karena ada riwayat appointment yang terkait (foreign key constraint)
            if (error.message && (error.message.includes('foreign key constraint') || error.message.includes('violates foreign key'))) {
                const { error: updateErr } = await supabase.from('packages').update({ is_active: false }).eq('id', confirmDeleteId);
                if (!updateErr) {
                    onShowToast("Paket memiliki riwayat booking/transaksi, sehingga otomatis dinonaktifkan (disembunyikan dari pilihan booking).", "info");
                    setConfirmDeleteId(null);
                    fetchPackages();
                    return;
                }
            }
            onShowToast("Gagal menghapus paket: " + error.message, "error");
        } else {
            onShowToast("Paket berhasil dihapus!", "success");
            setConfirmDeleteId(null);
            fetchPackages();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let desc = formData.description || '';
        if (activeTab === 'Studio Lapanbelas' && formData.duration) {
            desc = `${desc}\n\n[DURATION]: ${formData.duration}`;
        }
        if (activeTab !== 'Lady Makeup' && activeTab !== 'Lapanbelas Dekorasi') {
            if (formData.deadlineEditorDays) {
                desc = `${desc}\n\n[DEADLINE_EDITOR]: ${formData.deadlineEditorDays}`;
            }
            if (formData.deadlineCetakDays) {
                desc = `${desc}\n\n[DEADLINE_CETAK]: ${formData.deadlineCetakDays}`;
            }
            if (formData.deadlineDays) {
                desc = `${desc}\n\n[DEADLINE]: ${formData.deadlineDays}`;
            }
        }
        if (formData.photoLimit) {
            desc = `${desc}\n\n[PHOTO_LIMIT]: ${formData.photoLimit}`;
        }
        if (formData.minDp && Number(formData.minDp) > 0) {
            desc = `${desc}\n\n[DP]: ${formData.minDp}`;
        }
        if (editId) {
            const currentPkg = packages.find(p => p.id === editId);
            const hppMatch = currentPkg?.description?.match(/\[HPP_ITEMS\]:\s*([^\r\n]+)/);
            if (hppMatch && hppMatch[1]) {
                desc = `${desc}\n\n[HPP_ITEMS]: ${hppMatch[1]}`;
            }
        }
        const dbPayload = {
            title: formData.title,
            category: formData.category,
            price: Number(formData.price),
            is_active: formData.is_active,
            description: desc,
            image_url: formData.image_url || "/logo.png"
        };

        let responseError = null;
        if (editId) {
            const { error } = await supabase.from('packages').update(dbPayload).eq('id', editId);
            responseError = error;
        } else {
            const { error } = await supabase.from('packages').insert([dbPayload]);
            responseError = error;
        }

        if (responseError) {
            onShowToast("Gagal menyimpan paket ke Supabase: " + responseError.message, "error");
        } else {
            onShowToast("Paket berhasil disimpan!", "success");
            setIsModalOpen(false);
            fetchPackages();
        }
    };

    const filteredPackages = packages.filter(pkg => getPackageDivision(pkg) === activeTab);

    const selectedHppPkg = packages.find(p => p.id === hppSelectedPkgId) || null;
    const calculatedTotalHpp = currentHppItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    const calculatedProfit = (Number(selectedHppPkg?.price) || 0) - calculatedTotalHpp;
    const calculatedMargin = (Number(selectedHppPkg?.price) || 0) > 0
        ? (((calculatedProfit / Number(selectedHppPkg.price))) * 100).toFixed(1)
        : '0';

    const filteredHppPackages = packages.filter(p => {
        const matchDiv = hppDivisionFilter === 'all' || getPackageDivision(p) === hppDivisionFilter;
        const matchSearch = !hppSearchQuery || p.title.toLowerCase().includes(hppSearchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(hppSearchQuery.toLowerCase()));
        return matchDiv && matchSearch;
    });

    return (
        <div className="animate-in fade-in flex flex-col text-left">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manajemen Harga & Paket</h2>
                {activeTab !== 'HPP & Profit' ? (
                    <button onClick={handleAddClick} className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                        <SvgIcon name="plus" className="w-4 h-4 text-white dark:text-black" /> Tambah Paket
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                            Sinkronisasi Realtime
                        </span>
                    </div>
                )}
            </div>

            {/* Tab Divisi */}
            {!isMakeupMode && !isStudioMode && !isDecorMode && (
                <div className="flex gap-4 border-b border-slate-200/90 dark:border-white/10 mb-6 overflow-x-auto pb-1 shrink-0">
                    <button onClick={() => setActiveTab('lapanbelas.id')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'lapanbelas.id' ? 'text-teal-700 dark:text-white border-b-2 border-teal-600 dark:border-white font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                        Lapanbelas ID (Wedding) <span className="ml-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'lapanbelas.id').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('Studio Lapanbelas')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'Studio Lapanbelas' ? 'text-teal-700 dark:text-white border-b-2 border-teal-600 dark:border-white font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                        Studio Lapanbelas <span className="ml-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'Studio Lapanbelas').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('Lady Makeup')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'Lady Makeup' ? 'text-teal-700 dark:text-white border-b-2 border-teal-600 dark:border-white font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                        Lady Makeup <span className="ml-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'Lady Makeup').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('Lapanbelas Dekorasi')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'Lapanbelas Dekorasi' ? 'text-teal-700 dark:text-white border-b-2 border-teal-600 dark:border-white font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                        Lapanbelas Dekorasi <span className="ml-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'Lapanbelas Dekorasi').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('HPP & Profit')} className={`pb-3 text-sm font-medium transition-all shrink-0 flex items-center gap-1.5 ${activeTab === 'HPP & Profit' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 dark:border-emerald-400 font-semibold' : 'text-slate-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-300'}`}>
                        <span>📊</span> HPP & Profit
                    </button>
                </div>
            )}

            {activeTab === 'HPP & Profit' ? (
                <div className="space-y-6">
                    {/* Top Controls: Divisi Filter, Search, & Package Dropdown */}
                    <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    <span>📊</span> Kalkulator HPP & Estimasi Profit Bersih
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Kelola komponen modal/pengeluaran setiap paket untuk mengetahui estimasi laba bersih secara akurat & otomatis.
                                </p>
                            </div>
                            {selectedHppPkg && (
                                <button
                                    onClick={handleSaveCurrentHpp}
                                    disabled={isSavingHpp}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 shrink-0"
                                >
                                    {isSavingHpp ? (
                                        <><span>⏳</span> Menyimpan...</>
                                    ) : (
                                        <><span>💾</span> Simpan Rincian HPP</>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Selector Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-white/10">
                            {/* Filter Divisi */}
                            <div className="sm:col-span-4">
                                <label className="text-[11px] font-medium text-gray-400 block mb-1">Filter Divisi</label>
                                <select
                                    value={hppDivisionFilter}
                                    onChange={(e) => {
                                        const div = e.target.value;
                                        setHppDivisionFilter(div);
                                        const divPkgs = div === 'all' ? packages : packages.filter(p => getPackageDivision(p) === div);
                                        if (divPkgs.length > 0) {
                                            handleSelectHppPkg(divPkgs[0].id);
                                        }
                                    }}
                                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="all">🌐 Semua Divisi</option>
                                    <option value="lapanbelas.id">💍 Lapanbelas ID (Wedding)</option>
                                    <option value="Studio Lapanbelas">📸 Studio Lapanbelas</option>
                                    <option value="Lady Makeup">💄 Lady Makeup</option>
                                    <option value="Lapanbelas Dekorasi">🌸 Lapanbelas Dekorasi</option>
                                </select>
                            </div>

                            {/* Pilih Paket */}
                            <div className="sm:col-span-5">
                                <label className="text-[11px] font-medium text-gray-400 block mb-1">Pilih Paket yang Dikelola *</label>
                                <select
                                    value={hppSelectedPkgId || ''}
                                    onChange={(e) => handleSelectHppPkg(Number(e.target.value))}
                                    className="w-full bg-gray-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-medium outline-none focus:border-emerald-500"
                                >
                                    {filteredHppPackages.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.title} - ({p.category}) - {formatRupiah(p.price)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quick Search */}
                            <div className="sm:col-span-3">
                                <label className="text-[11px] font-medium text-gray-400 block mb-1">Cari Nama Paket</label>
                                <input
                                    type="text"
                                    placeholder="Ketik nama paket..."
                                    value={hppSearchQuery}
                                    onChange={(e) => setHppSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Selected Package Costing Workspace */}
                    {selectedHppPkg ? (
                        <div className="space-y-6">
                            {/* 4 Financial Stat Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {/* Harga Jual */}
                                <div className="glass-panel p-4 rounded-2xl border border-white/10 relative overflow-hidden">
                                    <div className="text-[11px] text-gray-400 flex items-center justify-between">
                                        <span>Harga Jual Paket</span>
                                        <span className="text-base">🏷️</span>
                                    </div>
                                    <p className="text-lg sm:text-2xl font-bold text-white mt-1">
                                        {formatRupiah(selectedHppPkg.price)}
                                    </p>
                                    <span className="text-[10px] text-gray-500 block mt-0.5 truncate">
                                        Paket: {selectedHppPkg.title}
                                    </span>
                                </div>

                                {/* Total HPP Modal */}
                                <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
                                    <div className="text-[11px] text-amber-300 flex items-center justify-between">
                                        <span>Total Modal (HPP)</span>
                                        <span className="text-base">📉</span>
                                    </div>
                                    <p className="text-lg sm:text-2xl font-bold text-amber-400 mt-1">
                                        {formatRupiah(calculatedTotalHpp)}
                                    </p>
                                    <span className="text-[10px] text-amber-300/70 block mt-0.5">
                                        {currentHppItems.length} item pengeluaran
                                    </span>
                                </div>

                                {/* Laba Bersih */}
                                <div className={`glass-panel p-4 rounded-2xl border relative overflow-hidden ${
                                    calculatedProfit >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                                }`}>
                                    <div className="text-[11px] flex items-center justify-between">
                                        <span className={calculatedProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                                            Estimasi Laba Bersih
                                        </span>
                                        <span className="text-base">💰</span>
                                    </div>
                                    <p className={`text-lg sm:text-2xl font-bold mt-1 ${
                                        calculatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {formatRupiah(calculatedProfit)}
                                    </p>
                                    <span className={`text-[10px] block mt-0.5 ${
                                        calculatedProfit >= 0 ? 'text-emerald-300/70' : 'text-red-300/70'
                                    }`}>
                                        Harga Jual - Total HPP
                                    </span>
                                </div>

                                {/* Margin Keuntungan */}
                                <div className="glass-panel p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
                                    <div className="text-[11px] text-blue-300 flex items-center justify-between">
                                        <span>Margin Keuntungan</span>
                                        <span className="text-base">📊</span>
                                    </div>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-lg sm:text-2xl font-bold text-blue-400">
                                            {calculatedMargin}%
                                        </p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                            Number(calculatedMargin) >= 50 
                                                ? 'bg-emerald-500/20 text-emerald-300' 
                                                : Number(calculatedMargin) >= 30 
                                                    ? 'bg-amber-500/20 text-amber-300' 
                                                    : 'bg-red-500/20 text-red-300'
                                        }`}>
                                            {Number(calculatedMargin) >= 50 ? 'Sangat Sehat' : Number(calculatedMargin) >= 30 ? 'Cukup' : 'Tipis'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-blue-300/70 block mt-0.5">
                                        Dari omset penjualan
                                    </span>
                                </div>
                            </div>

                            {/* Form Rincian Pengeluaran Modal (Item Biaya) */}
                            <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-white/10 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                    <div>
                                        <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                            <span>📋</span> Komponen Modal & Biaya: <span className="text-emerald-400">{selectedHppPkg.title}</span>
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Masukkan biaya produksi seperti fee kru, biaya cetak album, frame, packaging, dan operasional.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleAddNewCostItem}
                                            className="bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5"
                                        >
                                            <span>+</span> Tambah Baris Biaya
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Preset Buttons */}
                                <div>
                                    <span className="text-[11px] text-gray-400 block mb-1.5">⚡ Tambah Cepat Template Item:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { name: 'Fee FG (Fotografer)', cat: 'SDM / Crew' },
                                            { name: 'Fee VG (Videografer)', cat: 'SDM / Crew' },
                                            { name: 'Fee Asisten / Crew', cat: 'SDM / Crew' },
                                            { name: 'Cetak Album Kolase', cat: 'Vendor Cetak' },
                                            { name: 'Cetak Frame / Kanvas', cat: 'Vendor Cetak' },
                                            { name: 'Box Eksklusif & Flashdisk', cat: 'Produksi' },
                                            { name: 'Transport & Akomodasi', cat: 'Operasional' },
                                            { name: 'Konsumsi Crew', cat: 'Operasional' },
                                            { name: 'Fee MUA (Lady Makeup)', cat: 'SDM / Crew' },
                                            { name: 'Biaya Dekorasi & Bunga', cat: 'Produksi' }
                                        ].map((preset, pIdx) => (
                                            <button
                                                key={pIdx}
                                                type="button"
                                                onClick={() => handleAddPresetItem(preset.name, preset.cat)}
                                                className="text-[11px] bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 px-2.5 py-1 rounded-lg text-gray-300 transition"
                                            >
                                                + {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-2.5 pt-2">
                                    {currentHppItems.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                            <p className="text-sm">Belum ada rincian biaya untuk paket ini.</p>
                                            <p className="text-xs text-gray-500 mt-1">Klik tombol "+ Tambah Baris Biaya" atau pilih template di atas untuk mulai mengisi.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[11px] font-semibold text-gray-400 uppercase">
                                                <div className="col-span-5">Nama Item Pengeluaran</div>
                                                <div className="col-span-3">Kategori</div>
                                                <div className="col-span-3 text-right">Biaya / Modal (Rp)</div>
                                                <div className="col-span-1 text-center">Hapus</div>
                                            </div>
                                            {currentHppItems.map((item, idx) => (
                                                <div
                                                    key={item.id || idx}
                                                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 sm:p-2 bg-white/5 rounded-xl border border-white/5 items-center hover:border-white/10 transition"
                                                >
                                                    <div className="sm:col-span-5">
                                                        <input
                                                            type="text"
                                                            placeholder="Nama pengeluaran (Cth: Gaji FG 1)"
                                                            value={item.name}
                                                            onChange={(e) => handleUpdateCostItem(idx, 'name', e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <select
                                                            value={item.category || 'SDM / Crew'}
                                                            onChange={(e) => handleUpdateCostItem(idx, 'category', e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-emerald-500"
                                                        >
                                                            <option value="SDM / Crew">👥 SDM / Crew</option>
                                                            <option value="Vendor Cetak">🖼️ Vendor Cetak</option>
                                                            <option value="Produksi">📦 Produksi / Packaging</option>
                                                            <option value="Operasional">🚗 Operasional / Transport</option>
                                                            <option value="Lain-lain">🔖 Lain-lain</option>
                                                        </select>
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">Rp</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                value={item.amount}
                                                                onChange={(e) => handleUpdateCostItem(idx, 'amount', e.target.value)}
                                                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-right font-mono font-medium text-emerald-400 outline-none focus:border-emerald-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="sm:col-span-1 flex justify-end sm:justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCostItem(idx)}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition"
                                                            title="Hapus baris"
                                                        >
                                                            <SvgIcon name="trash-2" className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Total Bar */}
                                    {currentHppItems.length > 0 && (
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-white/10 bg-black/20 p-3 rounded-xl mt-3">
                                            <div className="text-xs text-gray-400">
                                                Total {currentHppItems.length} komponen pengeluaran modal
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-300">Total HPP:</span>
                                                <span className="text-base font-bold text-amber-400 font-mono">
                                                    {formatRupiah(calculatedTotalHpp)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Save Action */}
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveCurrentHpp}
                                        disabled={isSavingHpp}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                                    >
                                        {isSavingHpp ? (
                                            <><span>⏳</span> Menyimpan...</>
                                        ) : (
                                            <><span>💾</span> Simpan Rincian HPP {selectedHppPkg.title}</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Rekapitulasi Semua Paket (Overview Table) */}
                            <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-white/10 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                                    <div>
                                        <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                            <span>📑</span> Rekap Laba Bersih Seluruh Paket ({filteredHppPackages.length} Paket)
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Klik tombol "Kelola HPP" pada salah satu paket di tabel untuk melihat atau mengedit rincian modalnya.
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                                                <th className="py-2.5 px-3">Nama Paket</th>
                                                <th className="py-2.5 px-3">Divisi & Kategori</th>
                                                <th className="py-2.5 px-3 text-right">Harga Jual</th>
                                                <th className="py-2.5 px-3 text-right">Total HPP (Modal)</th>
                                                <th className="py-2.5 px-3 text-right">Estimasi Profit</th>
                                                <th className="py-2.5 px-3 text-center">Margin %</th>
                                                <th className="py-2.5 px-3 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredHppPackages.map((pkg) => {
                                                const fin = getPkgFinancials(pkg);
                                                const isSelected = pkg.id === selectedHppPkg.id;
                                                return (
                                                    <tr
                                                        key={pkg.id}
                                                        className={`hover:bg-white/5 transition ${
                                                            isSelected ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                                                        }`}
                                                    >
                                                        <td className="py-3 px-3 font-medium text-white">
                                                            <div className="flex items-center gap-1.5">
                                                                {isSelected && <span className="text-emerald-400 text-xs">👉</span>}
                                                                <span>{pkg.title}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-400">
                                                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-300">
                                                                {pkg.category}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-medium text-blue-300">
                                                            {formatRupiah(pkg.price)}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-mono text-amber-400">
                                                            {fin.totalHpp > 0 ? formatRupiah(fin.totalHpp) : <span className="text-gray-500 italic">Belum diatur</span>}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-mono font-medium">
                                                            {fin.totalHpp > 0 ? (
                                                                <span className={fin.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                                    {formatRupiah(fin.profit)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500 italic">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            {fin.totalHpp > 0 ? (
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                    Number(fin.margin) >= 50
                                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                                        : Number(fin.margin) >= 30
                                                                            ? 'bg-amber-500/20 text-amber-400'
                                                                            : 'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                    {fin.margin}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500 italic">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleSelectHppPkg(pkg.id);
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                                                                    isSelected
                                                                        ? 'bg-emerald-500 text-black font-bold'
                                                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                                                }`}
                                                            >
                                                                {isSelected ? 'Sedang Dipilih' : 'Kelola HPP'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-16 text-center text-gray-500 glass-panel rounded-2xl border border-white/10">
                            <SvgIcon name="package-open" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Tidak ada paket yang sesuai dengan filter pencarian.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPackages.map((pkg, i) => (
                        <div key={i} className="glass-panel p-5 rounded-2xl flex flex-col relative group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-gray-300">
                                    {pkg.category && pkg.category.startsWith('Lady Makeup:') ? pkg.category.replace('Lady Makeup: ', '') :
                                        pkg.category && pkg.category.startsWith('Lapanbelas Dekorasi:') ? pkg.category.replace('Lapanbelas Dekorasi: ', '') : pkg.category}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${pkg.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="text-[10px] text-gray-400">{pkg.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-1">{pkg.title}</h3>
                            {(() => {
                                const durMatch = pkg.description?.match(/\[DURATION\]:\s*(\d+)/);
                                const dlEditorMatch = pkg.description?.match(/\[DEADLINE_EDITOR\]:\s*(\d+)/i);
                                const dlCetakMatch = pkg.description?.match(/\[DEADLINE_CETAK\]:\s*(\d+)/i);
                                const dlMatch = pkg.description?.match(/\[DEADLINE\]:\s*(\d+)/i);
                                const plMatch = pkg.description?.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
                                const dpMatch = pkg.description?.match(/\[(?:DP|MIN_DP)\]:\s*(\d+)/i);
                                const customDp = dpMatch ? Number(dpMatch[1]) : (pkg.min_dp ? Number(pkg.min_dp) : null);
                                const deadlineDays = dlMatch ? dlMatch[1] : (getPackageDivision(pkg) === 'Studio Lapanbelas' ? '7' : '30');
                                const showDeadline = getPackageDivision(pkg) !== 'Lady Makeup' && getPackageDivision(pkg) !== 'Lapanbelas Dekorasi';
                                const showPhotoLimit = getPackageDivision(pkg) !== 'Lady Makeup' && getPackageDivision(pkg) !== 'Lapanbelas Dekorasi';
                                const photoLimit = plMatch ? plMatch[1] : '80';

                                return (
                                    <div className="space-y-0.5 mb-2">
                                        {durMatch && <p className="text-xs text-gray-400">Durasi: {durMatch[1]} Menit</p>}
                                        {showDeadline && (
                                            <p className="text-xs text-gray-300">
                                                {dlEditorMatch ? (
                                                    <span>⏱️ Editor: <strong className="text-amber-400">{dlEditorMatch[1]}h</strong> • Cetak: <strong className="text-cyan-400">{dlCetakMatch ? dlCetakMatch[1] : '0'}h</strong> • Total: <strong className="text-blue-400">{deadlineDays}h</strong></span>
                                                ) : (
                                                    <span>Deadline Klien: {deadlineDays} Hari</span>
                                                )}
                                            </p>
                                        )}
                                        {showPhotoLimit && <p className="text-xs text-gray-400">Batas Foto: {photoLimit} Foto</p>}
                                        {customDp ? (
                                            <p className="text-xs text-emerald-400 font-medium">Minimal DP: {formatRupiah(customDp)}</p>
                                        ) : (
                                            <p className="text-xs text-gray-500">DP: Standar Kategori</p>
                                        )}
                                    </div>
                                );
                            })()}
                            <p className="text-2xl font-light text-blue-600 dark:text-blue-400 mb-4">{formatRupiah(pkg.price)}</p>
                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <button onClick={() => handleEditClick(pkg)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                    <SvgIcon name="edit-2" className="w-3 h-3 text-slate-700 dark:text-white" /> Edit
                                </button>
                                <button onClick={() => setConfirmDeleteId(pkg.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                    <SvgIcon name="trash-2" className="w-3 h-3 text-red-600 dark:text-red-400" /> Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredPackages.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            <SvgIcon name="package-open" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Belum ada paket untuk divisi ini. Silakan buat paket baru di atas!</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Paket *</label>
                                <input type="text" required placeholder="Cth: Silver Package" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Kategori *</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-white appearance-none">
                                    {activeTab === 'Studio Lapanbelas' && (
                                        <>
                                            <option value="Photo Self">Photo Self</option>
                                            <option value="Photobox">Photobox</option>
                                            <option value="Wisuda">Wisuda</option>
                                            <option value="Prewed/Couple">Prewed/Couple</option>
                                            <option value="Group Studio">Group Studio</option>
                                            <option value="Family">Family</option>
                                            <option value="Pas Photo Studio">Pas Photo Studio</option>
                                        </>
                                    )}
                                    {activeTab === 'Lady Makeup' && (
                                        <>
                                            <option value="Lady Makeup: Akad">Akad</option>
                                            <option value="Lady Makeup: Resepsi">Resepsi</option>
                                            <option value="Lady Makeup: Akad + Resepsi">Akad + Resepsi</option>
                                            <option value="Lady Makeup: Lamaran">Lamaran</option>
                                            <option value="Lady Makeup: Tasyakuran">Tasyakuran</option>
                                            <option value="Lady Makeup: Photoshoot">Photoshoot</option>
                                        </>
                                    )}
                                    {activeTab === 'Lapanbelas Dekorasi' && (
                                        <>
                                            <option value="Lapanbelas Dekorasi: Pelaminan Only">Pelaminan Only</option>
                                            <option value="Lapanbelas Dekorasi: Bundling Resepsi">Bundling Resepsi</option>
                                            <option value="Lapanbelas Dekorasi: Bundling Akad Resepsi">Bundling Akad Resepsi</option>
                                        </>
                                    )}
                                    {activeTab === 'lapanbelas.id' && (
                                        <>
                                            <option value="Wedding">Wedding</option>
                                            <option value="Pre-Wedding">Pre-Wedding</option>
                                            <option value="Engagement">Engagement</option>
                                            <option value="Tasyakuran">Tasyakuran</option>
                                            <option value="lapanbelas.id">Lapanbelas ID</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 block mb-1">Harga (Rp) *</label>
                                    <input type="number" required placeholder="Cth: 4000000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 block mb-1">Minimal DP (Rp) <span className="text-[10px] text-gray-500">(Opsional)</span></label>
                                    <input type="number" placeholder="Otomatis / Cth: 50000" value={formData.minDp} onChange={e => setFormData({ ...formData, minDp: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 -mt-2">Kosongkan jika ingin memakai standar DP otomatis kategori.</p>
                            {activeTab === 'Studio Lapanbelas' && (
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Durasi Sesi (Menit) *</label>
                                    <input type="number" required placeholder="Cth: 10" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    <p className="text-[10px] text-gray-500 mt-1">Tentukan berapa menit sesi foto berlangsung untuk pemblokiran slot waktu booking klien.</p>
                                </div>
                            )}
                            {activeTab !== 'Lady Makeup' && activeTab !== 'Lapanbelas Dekorasi' && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-gray-200">
                                            ⏱️ Alokasi Waktu Pengerjaan & Deadline (Hari)
                                        </label>
                                        <span className="text-[10px] text-gray-400">Total Klien: <strong className="text-blue-400">{formData.deadlineDays || 0} Hari</strong></span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] text-gray-400 block mb-1">Editor Selesai *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                placeholder="15"
                                                value={formData.deadlineEditorDays}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const cetak = parseInt(formData.deadlineCetakDays, 10) || 0;
                                                    const ed = parseInt(val, 10) || 0;
                                                    setFormData({
                                                        ...formData,
                                                        deadlineEditorDays: val,
                                                        deadlineDays: String(ed + cetak)
                                                    });
                                                }}
                                                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white"
                                            />
                                            <span className="text-[9px] text-gray-500 block mt-0.5">Batas waktu editor</span>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 block mb-1">Cetak / Finishing</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="15"
                                                value={formData.deadlineCetakDays}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const ed = parseInt(formData.deadlineEditorDays, 10) || 0;
                                                    const cetak = parseInt(val, 10) || 0;
                                                    setFormData({
                                                        ...formData,
                                                        deadlineCetakDays: val,
                                                        deadlineDays: String(ed + cetak)
                                                    });
                                                }}
                                                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white"
                                            />
                                            <span className="text-[9px] text-gray-500 block mt-0.5">Waktu cetak fisik/album</span>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 block mb-1">Total ke Klien *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                placeholder="30"
                                                value={formData.deadlineDays}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        deadlineDays: val
                                                    });
                                                }}
                                                className="w-full bg-gray-900 border border-blue-500/40 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-blue-300 font-bold"
                                            />
                                            <span className="text-[9px] text-gray-500 block mt-0.5">Janji serah terima klien</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab !== 'Lady Makeup' && activeTab !== 'Lapanbelas Dekorasi' && (
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Batas Pilih Foto (Photo Limit) *</label>
                                    <input type="number" required placeholder="Cth: 80" value={formData.photoLimit || '80'} onChange={e => setFormData({ ...formData, photoLimit: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    <p className="text-[10px] text-gray-500 mt-1">Jumlah maksimal foto yang dapat dipilih oleh klien di portal seleksi.</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Deskripsi Paket</label>
                                <textarea placeholder="Penjelasan detail mengenai paket ini..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white min-h-[80px]"></textarea>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Foto / Gambar Paket</label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        {formData.image_url ? (
                                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black/50 relative shadow-md">
                                                <img 
                                                    src={formData.image_url} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover" 
                                                    onError={(e) => { e.target.src = "/logo.png"; }} 
                                                />
                                            </div>
                                        ) : null}
                                        <div className="flex items-center gap-2">
                                            <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                                                uploadingImage 
                                                    ? 'bg-blue-500/50 text-white cursor-not-allowed' 
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
                                            }`}>
                                                <span>{uploadingImage ? '⏳ Mengunggah...' : '📷 Pilih / Upload Foto'}</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    disabled={uploadingImage}
                                                    onChange={handleUploadPackageImage} 
                                                    className="hidden" 
                                                />
                                            </label>
                                            {formData.image_url && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                    className="px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition"
                                                >
                                                    Hapus Foto
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Atau tempel URL gambar (https://...)" 
                                        value={formData.image_url} 
                                        onChange={e => setFormData({ ...formData, image_url: e.target.value })} 
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-gray-300 font-mono" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Status Ketersediaan</label>
                                <select value={formData.is_active ? 'aktif' : 'nonaktif'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'aktif' })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-white appearance-none">
                                    <option value="aktif">Aktif (Ditampilkan Klien)</option>
                                    <option value="nonaktif">Nonaktif (Disembunyikan)</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-sm text-center animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <SvgIcon name="alert-triangle" className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Hapus Paket?</h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">Paket ini tidak akan muncul lagi di formulir booking klien.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition">Batal</button>
                            <button onClick={confirmDeletePkg} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition">Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PricelistComponent;
export { PricelistComponent };
