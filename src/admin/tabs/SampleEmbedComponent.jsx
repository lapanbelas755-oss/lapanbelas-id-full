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

function SampleEmbedComponent({ onShowToast }) {
    const [portfolio, setPortfolio] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);

    const defaultForm = { title: '', type: 'video', url: '' };
    const [formData, setFormData] = React.useState(defaultForm);

    const parseUrls = (urlStr) => {
        if (!urlStr) return [];
        if (urlStr.trim().startsWith('[') && urlStr.trim().endsWith(']')) {
            try {
                return JSON.parse(urlStr);
            } catch (e) { }
        }
        return urlStr.split(/[\n,]+/).map(u => u.trim()).filter(u => u !== '');
    };

    const fetchPortfolio = async () => {
        const { data, error } = await supabase.from('portfolio').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Gagal load portfolio:", error.message);
        } else if (data) {
            setPortfolio(data);
        }
    };

    React.useEffect(() => {
        fetchPortfolio();
    }, []);

    const handleAddClick = () => {
        setEditId(null);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEditClick = (item) => {
        setEditId(item.id);
        let urlValue = item.url;
        if (item.type === 'photo') {
            const urls = parseUrls(item.url);
            urlValue = urls.join('\n');
        }
        setFormData({ title: item.title, type: item.type, url: urlValue });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus portfolio ini?")) {
            const { error } = await supabase.from('portfolio').delete().eq('id', id);
            if (error) {
                onShowToast?.("Gagal menghapus portfolio: " + error.message, "error");
            } else {
                onShowToast?.("Media portfolio berhasil dihapus!", "success");
                fetchPortfolio();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let responseError = null;

        let cleanedUrl = formData.url;
        if (formData.type === 'photo') {
            const urls = formData.url.split(/[\n,]+/).map(u => u.trim()).filter(u => u !== '');
            cleanedUrl = urls.join(',');
        }

        const dbPayload = {
            title: formData.title,
            type: formData.type,
            url: cleanedUrl
        };

        if (editId) {
            const { error } = await supabase.from('portfolio').update(dbPayload).eq('id', editId);
            responseError = error;
        } else {
            const { error } = await supabase.from('portfolio').insert([dbPayload]);
            responseError = error;
        }

        if (responseError) {
            onShowToast?.("Gagal menyimpan ke database: " + responseError.message, "error");
        } else {
            onShowToast?.("Media portfolio berhasil disimpan! ✨", "success");
            setIsModalOpen(false);
            fetchPortfolio();
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Pengaturan Sample / Portofolio</h2>
                <button onClick={handleAddClick} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4 text-black" /> Tambah Media
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 flex items-center gap-2 text-white border-b border-white/10 pb-2"><SvgIcon name="youtube" className="w-5 h-5 text-red-500" /> Video Embeds</h3>
                    <div className="space-y-4">
                        {portfolio.filter(p => p.type === 'video').map((item, i) => (
                            <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-4 items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium mb-1 truncate">{item.title}</h4>
                                    <p className="text-[10px] text-gray-400 truncate">{item.url}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClick(item)} className="p-1 bg-white/10 hover:bg-white/20 rounded text-blue-400"><SvgIcon name="edit-2" className="w-3.5 h-3.5 text-blue-400" /></button>
                                    <button onClick={() => handleDeleteClick(item.id)} className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400"><SvgIcon name="trash-2" className="w-3.5 h-3.5 text-red-400" /></button>
                                </div>
                            </div>
                        ))}
                        {portfolio.filter(p => p.type === 'video').length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-4">Belum ada media video.</p>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 flex items-center gap-2 text-white border-b border-white/10 pb-2"><SvgIcon name="image" className="w-5 h-5 text-blue-400" /> Foto / Album</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {portfolio.filter(p => p.type === 'photo').map((item, i) => {
                            const urls = parseUrls(item.url);
                            const coverUrl = urls[0] || "/logo.png";
                            return (
                                <div key={i} className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/20">
                                    <img src={coverUrl} className="w-full h-full object-cover" />
                                    {urls.length > 1 && (
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5 z-10 font-semibold shadow-lg">
                                            <SvgIcon name="image" className="w-3 h-3 text-white" />
                                            {urls.length}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center">
                                        <span className="text-white text-xs font-semibold mb-2.5 truncate max-w-full drop-shadow">{item.title}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditClick(item)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-blue-400"><SvgIcon name="edit-2" className="w-4 h-4 text-blue-400" /></button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400"><SvgIcon name="trash-2" className="w-4 h-4 text-red-400" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {portfolio.filter(p => p.type === 'photo').length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-4 col-span-2">Belum ada portofolio foto.</p>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Portofolio' : 'Tambah Portofolio Baru'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Judul Media *</label>
                                <input type="text" required placeholder="Cth: Cinematic Wedding Amanda" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Tipe Media *</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-white appearance-none">
                                    <option value="video">Video (YouTube URL / VIMEO)</option>
                                    <option value="photo">Foto (Unsplash / JPG URL)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                    URL Media * {formData.type === 'photo' && <span className="text-[10px] text-blue-400 ml-1">(Bisa lebih dari 1, pisahkan dengan koma/enter)</span>}
                                </label>
                                {formData.type === 'photo' ? (
                                    <textarea required placeholder="https://image1.jpg&#10;https://image2.jpg" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono min-h-[100px]"></textarea>
                                ) : (
                                    <input type="text" required placeholder="https://..." value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono" />
                                )}
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Default Slideshow Banners jika belum diset di Pengaturan
const DEFAULT_SLIDESHOW = [
    {
        id: 1,
        title: "Premium Wedding Capture",
        subtitle: "Dapatkan diskon Rp 1.000.000 untuk booking bulan ini!",
        image: "/logo.png",
        badge: "PROMO"
    },
    {
        id: 2,
        title: "New Modern Photo Studio",
        subtitle: "Wisuda, Group, dan Couple Studio dengan Background Premium",
        image: "/logo.png",
        badge: "STUDIO"
    },
    {
        id: 3,
        title: "Elegant Wedding Decoration",
        subtitle: "Wujudkan pelaminan impian dengan sentuhan dekorasi berkelas",
        image: "/logo.png",
        badge: "DEKORASI"
    }
];

const ADMIN_MAIN_CATEGORIES = {
    WEDDING: "lapanbelas.id",
    PHOTO_STUDIO: "Photo Studio",
    MAKEUP: "Makeup",
    DEKORASI: "Dekorasi"
};

const getAdminMainCategory = (cat) => {
    if (!cat) return ADMIN_MAIN_CATEGORIES.PHOTO_STUDIO;
    const lower = cat.trim().toLowerCase();
    if (lower.includes("dekorasi") || lower.includes("dekor")) return ADMIN_MAIN_CATEGORIES.DEKORASI;
    if (lower.includes("makeup") || lower.includes("mua") || lower.includes("makeup artist")) return ADMIN_MAIN_CATEGORIES.MAKEUP;
    if (["wedding", "pre-wedding", "engagement", "tasyakuran"].some(k => lower.includes(k))) return ADMIN_MAIN_CATEGORIES.WEDDING;
    return ADMIN_MAIN_CATEGORIES.PHOTO_STUDIO;
};

export default SampleEmbedComponent;
export { SampleEmbedComponent };
