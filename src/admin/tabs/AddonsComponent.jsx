import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatSelectedDateUI,
    getOrderDivisions,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

// BARU: Komponen Manajemen Add-ons Layanan
function AddonsComponent({ onShowToast, session, mode }) {
    const isMakeupMode = mode === 'makeup' || checkRole(session?.role, 'makeup');
    const isStudioMode = mode === 'studio' || checkRole(session?.role, 'studio');
    const isDecorMode = mode === 'dekor' || checkRole(session?.role, 'dekor');
    const [addons, setAddons] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);

    const parseAddon = (addon) => {
        if (!addon) return { category: 'Lainnya', labelOnly: '' };
        const rawLabel = addon.label || '';
        const match = rawLabel.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            let category = match[1].trim();
            if (category.toLowerCase() === 'makeup artist' || category.toLowerCase() === 'makeup artis' || category.toLowerCase() === 'mua') {
                category = 'Makeup Artis';
            } else if (category.toLowerCase() === 'video') {
                category = 'Video';
            } else if (category.toLowerCase() === 'studio' || category.toLowerCase() === 'foto studio') {
                category = 'Studio';
            } else if (category.toLowerCase() === 'dekorasi' || category.toLowerCase() === 'dekor') {
                category = 'Dekorasi';
            } else if (category.toLowerCase() === 'add-on best seller' || category.toLowerCase() === 'best seller') {
                category = 'Add-on Best Seller';
            }
            return {
                ...addon,
                category,
                labelOnly: match[2].trim()
            };
        }
        return {
            ...addon,
            category: 'Lainnya',
            labelOnly: rawLabel.trim()
        };
    };

    const filteredAddons = isMakeupMode
        ? addons.filter(a => parseAddon(a).category === 'Makeup Artis')
        : isStudioMode
            ? addons.filter(a => parseAddon(a).category === 'Studio')
            : isDecorMode
                ? addons.filter(a => parseAddon(a).category === 'Dekorasi')
                : addons;

    const defaultForm = { label: '', price: '', category: 'Lainnya' };
    const [formData, setFormData] = React.useState(defaultForm);

    const fetchAddons = async () => {
        const { data, error } = await supabase.from('addons').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error("Gagal load addons:", error.message);
        } else if (data) {
            setAddons(data);
        }
    };

    React.useEffect(() => {
        fetchAddons();
    }, []);

    const handleAddClick = () => {
        setEditId(null);
        setFormData({ label: '', price: '', category: isMakeupMode ? 'Makeup Artis' : isStudioMode ? 'Studio' : isDecorMode ? 'Dekorasi' : 'Lainnya' });
        setIsModalOpen(true);
    };

    const handleEditClick = (addon) => {
        const parsed = parseAddon(addon);
        setEditId(addon.id);
        setFormData({
            label: parsed.labelOnly,
            price: addon.price,
            category: parsed.category
        });
        setIsModalOpen(true);
    };

    const confirmDeleteAddon = async () => {
        const { error } = await supabase.from('addons').delete().eq('id', confirmDeleteId);
        if (error) {
            onShowToast("Gagal menghapus add-on: " + error.message, "error");
        } else {
            onShowToast("Add-on berhasil dihapus!", "success");
            setConfirmDeleteId(null);
            fetchAddons();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let finalLabel = formData.label.trim();
        if (formData.category && formData.category !== 'Lainnya') {
            finalLabel = `[${formData.category}] ${finalLabel}`;
        }
        const dbPayload = {
            label: finalLabel,
            price: Number(formData.price)
        };

        let responseError = null;
        if (editId) {
            const { error } = await supabase.from('addons').update(dbPayload).eq('id', editId);
            responseError = error;
        } else {
            const { error } = await supabase.from('addons').insert([dbPayload]);
            responseError = error;
        }

        if (responseError) {
            onShowToast("Gagal menyimpan ke Supabase: " + responseError.message, "error");
        } else {
            onShowToast("Add-on berhasil disimpan!", "success");
            setIsModalOpen(false);
            fetchAddons();
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Manajemen Layanan Tambahan (Add-on)</h2>
                <button onClick={handleAddClick} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4 text-black" /> Tambah Add-on
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAddons.map((addon) => {
                    const parsed = parseAddon(addon);
                    let badgeStyle = "text-gray-400 bg-white/5 border border-white/10";
                    if (parsed.category === 'Makeup Artis') {
                        badgeStyle = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
                    } else if (parsed.category === 'Video') {
                        badgeStyle = "text-sky-400 bg-sky-500/10 border border-sky-500/20";
                    } else if (parsed.category === 'Dekorasi') {
                        badgeStyle = "text-green-400 bg-green-500/10 border border-green-500/20";
                    } else if (parsed.category === 'Add-on Best Seller') {
                        badgeStyle = "text-amber-400 bg-amber-500/10 border border-amber-500/20";
                    }

                    return (
                        <div key={addon.id} className="glass-panel p-5 rounded-2xl flex flex-col relative group">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full w-max mb-3 font-semibold ${badgeStyle}`}>{parsed.category}</span>
                            <h3 className="text-sm font-semibold mb-1 leading-snug min-h-[40px]">{parsed.labelOnly}</h3>
                            <p className="text-xl font-light text-blue-400 mb-4">{formatRupiah(addon.price)}</p>
                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <button onClick={() => handleEditClick(addon)} className="bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                    <SvgIcon name="edit-2" className="w-3 h-3 text-white" /> Edit
                                </button>
                                <button onClick={() => setConfirmDeleteId(addon.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                    <SvgIcon name="trash-2" className="w-3 h-3 text-red-400" /> Hapus
                                </button>
                            </div>
                        </div>
                    );
                })}
                {addons.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        <SvgIcon name="package-open" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Belum ada add-on layanan. Silakan buat di atas!</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Layanan Tambahan' : 'Tambah Layanan Tambahan'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Layanan Tambahan *</label>
                                <input type="text" required placeholder="Cth: Aerial Drone + Operator" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            {!isMakeupMode && !isStudioMode && !isDecorMode && (
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Kategori Add-on *</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white"
                                    >
                                        <option value="Makeup Artis" className="bg-[#121212] text-white">Makeup Artis</option>
                                        <option value="Video" className="bg-[#121212] text-white">Video</option>
                                        <option value="Studio" className="bg-[#121212] text-white">Studio</option>
                                        <option value="Dekorasi" className="bg-[#121212] text-white">Dekorasi</option>
                                        <option value="Add-on Best Seller" className="bg-[#121212] text-white">Add-on Best Seller</option>
                                        <option value="Lainnya" className="bg-[#121212] text-white">Lainnya (Uncategorized)</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Harga Layanan (Rp) *</label>
                                <input type="number" required placeholder="Cth: 1500000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-sm text-center animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <SvgIcon name="alert-triangle" className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Hapus Layanan Tambahan?</h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">Add-on ini tidak akan muncul lagi di halaman depan klien.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition">Batal</button>
                            <button onClick={confirmDeleteAddon} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition">Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddonsComponent;
export { AddonsComponent };
