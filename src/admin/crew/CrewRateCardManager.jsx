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
function CrewRateCardManager({ adminFetch, onShowToast, division = 'all' }) {
    const [rateCards, setRateCards] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editIndex, setEditIndex] = React.useState(null);
    const [filterCategory, setFilterCategory] = React.useState('all');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const CATEGORIES = ['Semua Kategori', 'Wedding', 'Prewedding', 'Studio Lapanbelas', 'Wisuda', 'Event / Gathering', 'Lainnya'];
    const ROLES = [
        { value: 'fotografer', label: 'Fotografer (FG)' },
        { value: 'videografer', label: 'Videografer (VG)' },
        { value: 'asisten', label: 'Asisten' }
    ];
    const JOB_TYPES = [
        'Lead / Solo',
        'Backup / Second',
        'Full Day (Akad + Resepsi)',
        'Akad Saja',
        'Resepsi Saja',
        'Asisten'
    ];

    const defaultForm = {
        category: 'Wedding',
        role: 'fotografer',
        type: 'Lead / Solo',
        fee: 800000,
        notes: ''
    };
    const [form, setForm] = React.useState(defaultForm);

    const fetchRateCards = async () => {
        setIsLoading(true);
        try {
            const res = await (adminFetch ? adminFetch('/api/crew/rate-cards') : fetch('/api/crew/rate-cards'));
            if (!res.ok) {
                throw new Error(`Server status ${res.status}. Harap restart backend (node server.js) agar endpoint baru aktif.`);
            }
            const data = await res.json();
            if (data.rateCards) {
                setRateCards(data.rateCards);
            }
        } catch (err) {
            console.error('Fetch rate cards error:', err);
            onShowToast?.('Gagal memuat rate card: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchRateCards();
    }, []);

    const handleOpenAdd = () => {
        setEditIndex(null);
        let defaultCat = 'Wedding';
        if (division === 'studio') defaultCat = 'Studio Lapanbelas';
        else if (filterCategory && filterCategory !== 'all' && filterCategory !== 'Semua Kategori') defaultCat = filterCategory;

        setForm({
            ...defaultForm,
            category: defaultCat
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (card) => {
        setEditIndex(card.id);
        setForm({
            category: card.category || 'Wedding',
            role: card.role || 'fotografer',
            type: card.type || 'Lead / Solo',
            fee: card.fee || card.standard_fee || 500000,
            notes: card.notes || card.description || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (cardId) => {
        if (!window.confirm('Yakin ingin menghapus data tarif gaji ini?')) return;
        const updated = rateCards.filter(c => (c.id || '') !== cardId);
        setIsSubmitting(true);
        try {
            const res = await adminFetch('/api/crew/rate-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rateCards: updated })
            });
            const data = await res.json();
            if (data.success) {
                setRateCards(updated);
                onShowToast?.('Tarif berhasil dihapus!', 'success');
            } else {
                onShowToast?.(data.error || 'Gagal menghapus tarif', 'error');
            }
        } catch (err) {
            onShowToast?.('Gagal menghapus tarif: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const updated = [...rateCards];
            const targetId = editIndex !== null ? editIndex : `rc-${Date.now()}`;
            const newCard = {
                id: targetId,
                category: form.category,
                role: form.role,
                type: form.type,
                fee: Number(form.fee) || 0,
                notes: (form.notes || '').trim()
            };

            const existingIdx = editIndex !== null ? updated.findIndex(c => c.id === editIndex) : -1;
            if (existingIdx !== -1) {
                updated[existingIdx] = newCard;
            } else {
                updated.push(newCard);
            }

            const res = await adminFetch('/api/crew/rate-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rateCards: updated })
            });
            const data = await res.json();
            if (data.success) {
                setRateCards(updated);
                setIsModalOpen(false);
                onShowToast?.(editIndex !== null ? 'Tarif berhasil diperbarui! ✅' : 'Tarif baru berhasil ditambahkan! 🎉', 'success');
            } else {
                onShowToast?.(data.error || 'Gagal menyimpan tarif', 'error');
            }
        } catch (err) {
            onShowToast?.('Gagal menyimpan tarif: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleBadge = (role) => {
        const rLower = (role || '').toLowerCase();
        let key = 'fotografer';
        if (rLower.includes('video')) key = 'videografer';
        else if (rLower.includes('asisten')) key = 'asisten';
        else if (rLower.includes('foto')) key = 'fotografer';

        const map = {
            fotografer: ['📸 Fotografer', 'bg-amber-500/20 text-amber-300 border-amber-500/30'],
            videografer: ['🎬 Videografer', 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'],
            asisten: ['💡 Asisten', 'bg-purple-500/20 text-purple-300 border-purple-500/30']
        };
        const [label, cls] = map[key] || [role, 'bg-gray-500/20 text-gray-400 border-gray-500/30'];
        return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{label}</span>;
    };

    const filtered = rateCards.filter(c => {
        const isStudio = (c.category || '').toLowerCase().includes('studio');
        if (division === 'studio' && !isStudio) return false;
        if (division === 'lapanbelas.id' && isStudio) return false;
        return filterCategory === 'all' || c.category === filterCategory || (filterCategory === 'Semua Kategori');
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/3 p-4 rounded-2xl border border-white/8">
                <div>
                    <h3 className="font-bold text-white text-base">Master Tarif Honor Kru (Rate Card)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Daftar tarif standar per job desk & kategori acara untuk kalkulasi fee dan pengajuan klaim kru.</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition shrink-0 self-start sm:self-auto"
                >
                    <SvgIcon name="plus" className="w-3.5 h-3.5" /> Tambah Tarif Acara
                </button>
            </div>

            {/* Filter Category */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat === 'Semua Kategori' ? 'all' : cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${(filterCategory === 'all' && cat === 'Semua Kategori') || filterCategory === cat ? 'bg-white/20 text-white font-semibold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Cards / Table */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Memuat tarif...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white/3 rounded-2xl border border-white/8">
                    <p className="text-3xl mb-2">💳</p>
                    <p className="text-gray-300 font-semibold text-sm">Belum ada tarif untuk kategori ini</p>
                    <button onClick={handleOpenAdd} className="mt-3 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium">Tambah Sekarang</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((card, idx) => (
                        <div key={card.id || idx} className="bg-white/3 hover:bg-white/5 transition rounded-xl p-4 border border-white/8 flex flex-col justify-between gap-3">
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-gray-300 uppercase tracking-wider">{card.category}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleOpenEdit(card)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition"><SvgIcon name="edit" className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDelete(card.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"><SvgIcon name="trash-2" className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {roleBadge(card.role)}
                                    <span className="text-xs text-gray-300 font-medium bg-white/5 px-2 py-0.5 rounded-md">{card.type || 'Solo'}</span>
                                </div>
                                <p className="text-xl font-bold text-emerald-400 font-mono mt-3">{formatRupiah(card.fee || card.standard_fee)}</p>
                                {(card.notes || card.description) && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.notes || card.description}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Add / Edit Rate Card */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111318] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-white text-base">{editIndex !== null ? 'Edit Tarif Gaji' : 'Tambah Tarif Gaji Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:text-white"><SvgIcon name="x" className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Kategori Acara *</label>
                                <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                                    {CATEGORIES.filter(c => c !== 'Semua Kategori').map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Peran *</label>
                                    <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Tipe Penugasan *</label>
                                    <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500">
                                        {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Standar Honor / Fee (Rp) *</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="10000"
                                    value={form.fee}
                                    onChange={e => setForm({ ...form, fee: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                                />
                                <p className="text-[11px] text-emerald-400 mt-1 font-mono font-semibold">Preview: {formatRupiah(form.fee)}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Catatan / Lingkup Kerja</label>
                                <input
                                    type="text"
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="cth: Dokumentasi full day wedding, include raw files"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-white/10 text-gray-400 rounded-xl text-xs hover:bg-white/5 transition">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition">
                                    {isSubmitting ? 'Menyimpan...' : (editIndex !== null ? 'Perbarui Tarif' : 'Simpan Tarif')}
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

export default CrewRateCardManager;
export { CrewRateCardManager };
