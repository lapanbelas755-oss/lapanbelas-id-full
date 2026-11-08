import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatSelectedDateUI,
    getOrderDivisions,
    checkRole,
    compressImageIfNeeded,
    DEFAULT_SLIDESHOW,
    ADMIN_MAIN_CATEGORIES,
    getAdminMainCategory
} from "../adminUtils";
import SvgIcon from "../SvgIcon";
import WhatsAppTemplateManager from "../../components/WhatsAppTemplateManager";

function SettingComponent({ onShowToast }) {
    const [settings, setSettings] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [packagesList, setPackagesList] = React.useState([]);
    const [slideshowData, setSlideshowData] = React.useState(DEFAULT_SLIDESHOW);
    const [bestSellerMap, setBestSellerMap] = React.useState({});
    const [activeCategoryTab, setActiveCategoryTab] = React.useState(ADMIN_MAIN_CATEGORIES.WEDDING);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSyncingCalendar, setIsSyncingCalendar] = React.useState(false);
    const [uploadingSlideIdx, setUploadingSlideIdx] = React.useState(null);

    const handleUploadSlideImage = async (e, index) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSlideIdx(index);
        try {
            const compressed = await compressImageIfNeeded(file, 1920, 1080, 0.82);
            const cleanName = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
            const fileName = `banners/${Date.now()}_${cleanName}`;
            const { error: uploadError } = await supabase.storage
                .from('packages')
                .upload(fileName, compressed, { contentType: compressed.type || 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
            const { data: pubData } = supabase.storage.from('packages').getPublicUrl(fileName);
            handleUpdateSlide(index, 'image', pubData.publicUrl);
            onShowToast?.('Banner foto berhasil diunggah ke Supabase!', 'success');
        } catch (err) {
            console.error(err);
            onShowToast?.('Gagal upload foto banner: ' + (err.message || ''), 'error');
        } finally {
            setUploadingSlideIdx(null);
            e.target.value = '';
        }
    };

    const fetchSettings = async () => {
        setIsLoading(true);
        const [{ data: settingsData, error: sErr }, { data: pkgsData, error: pErr }] = await Promise.all([
            supabase.from('settings').select('*'),
            supabase.from('packages').select('*').order('title', { ascending: true })
        ]);

        if (sErr) {
            console.error("Gagal load settings:", sErr.message);
        } else if (settingsData) {
            const sMap = {};
            settingsData.forEach(item => sMap[item.key] = item.value);
            setSettings(sMap);

            if (sMap['slideshow_banners']) {
                try {
                    const parsed = JSON.parse(sMap['slideshow_banners']);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSlideshowData(parsed);
                    }
                } catch (e) {}
            }

            if (sMap['bestseller_package_ids']) {
                try {
                    const parsed = JSON.parse(sMap['bestseller_package_ids']);
                    if (parsed && typeof parsed === 'object') {
                        setBestSellerMap(parsed);
                    }
                } catch (e) {}
            }
        }

        if (!pErr && pkgsData) {
            setPackagesList(pkgsData);
        }

        setIsLoading(false);
    };

    React.useEffect(() => {
        fetchSettings();
    }, []);

    // Slideshow Operations
    const handleAddSlide = () => {
        setSlideshowData([
            ...slideshowData,
            {
                id: Date.now(),
                title: "Promo Spesial Baru",
                subtitle: "Dapatkan penawaran menarik khusus booking minggu ini!",
                image: "/logo.png",
                badge: "PROMO"
            }
        ]);
        onShowToast?.("Slide banner baru ditambahkan. Jangan lupa klik Simpan!", "success");
    };

    const handleUpdateSlide = (index, field, value) => {
        setSlideshowData(slideshowData.map((slide, idx) => idx === index ? { ...slide, [field]: value } : slide));
    };

    const handleDeleteSlide = (index) => {
        if (slideshowData.length <= 1) {
            onShowToast?.("Minimal harus ada 1 slide banner!", "error");
            return;
        }
        if (confirm("Hapus slide banner ini?")) {
            setSlideshowData(slideshowData.filter((_, idx) => idx !== index));
            onShowToast?.("Slide banner dihapus.", "success");
        }
    };

    // Best Seller Package Selection
    const toggleBestSellerPackage = (cat, pkgId) => {
        const current = bestSellerMap[cat] || [];
        const exists = current.includes(pkgId);
        const updated = exists ? current.filter(id => id !== pkgId) : [...current, pkgId];
        setBestSellerMap({ ...bestSellerMap, [cat]: updated });
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const studioName = e.target.studioName.value;
        const studioDescription = e.target.studioDescription.value;
        const studioAddress = e.target.studioAddress?.value || 'Studio Lapanbelas';
        const studioMapsUrl = e.target.studioMapsUrl?.value || '';
        const studioDaysOpen = e.target.studioDaysOpen?.value || 'Senin - Sabtu';
        const studioDaysClosed = e.target.studioDaysClosed?.value || 'Minggu';
        const studioHours = e.target.studioHours?.value || '09.00 - 17.30 WIB';
        const adminWhatsapp = e.target.adminWhatsapp.value;
        const teamWaEditorStudio = e.target.teamWaEditorStudio?.value || '62895630508478';
        const teamWaEditorWedding = e.target.teamWaEditorWedding?.value || '628113178579';
        const teamWaVgEditor = e.target.teamWaVgEditor?.value || '6281362132800';
        const teamWaFgStudio = e.target.teamWaFgStudio?.value || '6282363252291';
        const teamWaFgWedding = e.target.teamWaFgWedding?.value || '6282363252291';
        const promoBannerActive = e.target.promoBannerActive.value;
        const promoBannerText = e.target.promoBannerText.value;
        const promoBannerTheme = e.target.promoBannerTheme.value;

        const { error } = await supabase.from('settings').upsert([
            { key: 'studio_name', value: studioName },
            { key: 'studio_description', value: studioDescription },
            { key: 'studio_address', value: studioAddress },
            { key: 'pickup_location', value: studioAddress },
            { key: 'studio_maps_url', value: studioMapsUrl },
            { key: 'pickup_maps_url', value: studioMapsUrl },
            { key: 'studio_days_open', value: studioDaysOpen },
            { key: 'pickup_days_open', value: studioDaysOpen },
            { key: 'studio_days_closed', value: studioDaysClosed },
            { key: 'pickup_days_closed', value: studioDaysClosed },
            { key: 'studio_hours', value: studioHours },
            { key: 'pickup_hours', value: studioHours },
            { key: 'admin_whatsapp', value: adminWhatsapp },
            { key: 'team_wa_admin', value: adminWhatsapp },
            { key: 'team_wa_editor_studio', value: teamWaEditorStudio },
            { key: 'team_wa_editor_wedding', value: teamWaEditorWedding },
            { key: 'team_wa_vg_editor', value: teamWaVgEditor },
            { key: 'team_wa_fg_studio', value: teamWaFgStudio },
            { key: 'team_wa_fg_wedding', value: teamWaFgWedding },
            { key: 'promo_banner_active', value: promoBannerActive },
            { key: 'promo_banner_text', value: promoBannerText },
            { key: 'promo_banner_theme', value: promoBannerTheme },
            { key: 'slideshow_banners', value: JSON.stringify(slideshowData) },
            { key: 'bestseller_package_ids', value: JSON.stringify(bestSellerMap) }
        ]);

        setIsSaving(false);
        if (error) {
            onShowToast?.("Gagal menyimpan konfigurasi: " + error.message, "error");
        } else {
            onShowToast?.("Pengaturan Berhasil Disimpan ke Supabase! ✨", "success");
            fetchSettings();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-left w-full h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-400 ml-3">Memuat pengaturan...</span>
            </div>
        );
    }

    const currentCatPackages = packagesList.filter(pkg => getAdminMainCategory(pkg.category) === activeCategoryTab);
    const selectedInActiveCat = bestSellerMap[activeCategoryTab] || [];

    return (
        <div className="animate-in fade-in max-w-4xl text-left pb-16">
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Pengaturan Sistem & Tampilan Klien</h2>

            <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* 1. INFORMASI STUDIO */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 border-b border-slate-200/90 dark:border-white/10 pb-2 text-slate-900 dark:text-white">Informasi Studio</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1">Nama Aplikasi / Studio</label>
                            <input type="text" name="studioName" defaultValue={settings['studio_name'] || "18Studio"} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600 dark:text-gray-400 block mb-1">Deskripsi Singkat (Tampil di layar login)</label>
                            <textarea name="studioDescription" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 min-h-[70px] text-slate-800 dark:text-white" defaultValue={settings['studio_description'] || "Capture your beautiful moments."}></textarea>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-700 dark:text-gray-300 font-medium block mb-1">🏠 Lokasi / Alamat Pengambilan Album</label>
                                <input type="text" name="studioAddress" defaultValue={settings['studio_address'] || settings['pickup_location'] || "Studio Lapanbelas"} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white" placeholder="Studio Lapanbelas / Alamat Lengkap" />
                                <span className="text-[10px] text-slate-500 dark:text-gray-500">Alamat fisik studio yang dicantumkan pada notifikasi klien.</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-700 dark:text-gray-300 font-medium block mb-1">📍 Link Sharelock / Google Maps</label>
                                <input type="url" name="studioMapsUrl" defaultValue={settings['studio_maps_url'] || settings['pickup_maps_url'] || ""} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white" placeholder="https://maps.app.goo.gl/..." />
                                <span className="text-[10px] text-slate-500 dark:text-gray-500">Link Google Maps / Sharelock lokasi studio agar klien mudah mencari rute.</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-slate-700 dark:text-gray-300 font-medium block mb-1">📅 Hari Operasional (Buka)</label>
                                <input type="text" name="studioDaysOpen" defaultValue={settings['studio_days_open'] || settings['pickup_days_open'] || "Senin - Sabtu"} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white" placeholder="Senin - Sabtu" />
                                <span className="text-[10px] text-slate-500 dark:text-gray-500">Contoh: Senin - Sabtu atau Setiap Hari.</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-700 dark:text-gray-300 font-medium block mb-1">⛔ Hari Libur / Tutup</label>
                                <input type="text" name="studioDaysClosed" defaultValue={settings['studio_days_closed'] || settings['pickup_days_closed'] || "Minggu"} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white" placeholder="Minggu" />
                                <span className="text-[10px] text-slate-500 dark:text-gray-500">Contoh: Minggu atau Minggu & Tanggal Merah.</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-700 dark:text-gray-300 font-medium block mb-1">⏰ Jam Operasional Pengambilan Album</label>
                                <input type="text" name="studioHours" defaultValue={settings['studio_hours'] || settings['pickup_hours'] || "09.00 - 17.30 WIB"} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white" placeholder="09.00 - 17.30 WIB" />
                                <span className="text-[10px] text-slate-500 dark:text-gray-500">Contoh: 09.00 - 17.30 WIB.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 1B. NOMOR WHATSAPP TIM (NOTIFIKASI & PENGINGAT DEADLINE) */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20">
                    <h3 className="text-md font-semibold text-emerald-600 dark:text-emerald-400 mb-2 border-b border-slate-200/90 dark:border-white/10 pb-2 flex items-center gap-2">
                        <SvgIcon name="message-circle" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Nomor WhatsApp Tim (Notifikasi, Penugasan & Serah Terima)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Nomor WhatsApp ini digunakan sistem untuk mengirim surat tugas, notifikasi serah terima file mentah, dan pengingat deadline editor.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-300 font-medium block mb-1">👑 Nomor WhatsApp Admin Studio</label>
                            <input type="text" name="adminWhatsapp" defaultValue={settings['admin_whatsapp'] || settings['team_wa_admin'] || "6282363252291"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white font-mono" placeholder="6281234567890" />
                            <span className="text-[10px] text-gray-500">Menerima rekap serah terima file mentah, deadline editor & ulasan.</span>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 font-medium block mb-1">📸 WhatsApp Editor Foto Studio</label>
                            <input type="text" name="teamWaEditorStudio" defaultValue={settings['team_wa_editor_studio'] || "62895630508478"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white font-mono" placeholder="62895630508478" />
                            <span className="text-[10px] text-gray-500">Menerima pengingat deadline paket studio, wisuda, group, dll.</span>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 font-medium block mb-1">💍 WhatsApp Editor Foto Wedding / Outdoor</label>
                            <input type="text" name="teamWaEditorWedding" defaultValue={settings['team_wa_editor_wedding'] || "6285262227876"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white font-mono" placeholder="6285262227876" />
                            <span className="text-[10px] text-gray-500">Menerima pengingat deadline paket Wedding, Prewedding, dll.</span>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 font-medium block mb-1">🎥 WhatsApp Editor Video & Videografer</label>
                            <input type="text" name="teamWaVgEditor" defaultValue={settings['team_wa_vg_editor'] || "6281362132800"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white font-mono" placeholder="6281362132800" />
                            <span className="text-[10px] text-gray-500">Menerima pengingat deadline editing video & cinematic.</span>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 font-medium block mb-1">📷 Default WA Fotografer Studio (Permanent)</label>
                            <input type="text" name="teamWaFgStudio" defaultValue={settings['team_wa_fg_studio'] || "6282363252291"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white font-mono" placeholder="6282363252291" />
                            <span className="text-[10px] text-gray-500">Nomor WhatsApp rujukan surat tugas & pengingat serah terima FG Studio.</span>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 font-medium block mb-1">🤵 Default WA Fotografer Wedding (Lead)</label>
                            <input type="text" name="teamWaFgWedding" defaultValue={settings['team_wa_fg_wedding'] || "6282363252291"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white font-mono" placeholder="6282363252291" />
                            <span className="text-[10px] text-gray-500">Nomor WhatsApp rujukan surat tugas & pengingat serah terima FG Wedding.</span>
                        </div>
                    </div>
                </div>

                {/* 2. PENGATURAN SLIDESHOW BANNER PROMO */}
                <div className="glass-panel p-6 rounded-2xl border border-teal-500/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
                        <div>
                            <h3 className="text-md font-semibold text-teal-400 flex items-center gap-2">
                                <SvgIcon name="image" className="w-5 h-5 text-teal-400" />
                                Pengaturan Slideshow Promo (Paling Atas Beranda)
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">Kelola gambar banner, judul, subjudul, dan badge yang bergeser di atas halaman Beranda klien.</p>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleAddSlide}
                            className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
                        >
                            <SvgIcon name="plus" className="w-3.5 h-3.5" />
                            Tambah Slide
                        </button>
                    </div>

                    <div className="space-y-4">
                        {slideshowData.map((slide, idx) => (
                            <div key={slide.id || idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 relative group">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                                        Slide #{idx + 1}
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleDeleteSlide(idx)}
                                        className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded-lg transition"
                                    >
                                        Hapus Slide
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    {/* Preview Banner Image */}
                                    <div className="md:col-span-4 relative aspect-[21/9] md:aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                                        <img src={slide.image} alt={slide.title} className="w-full h-full object-cover brightness-[0.5]" onError={(e) => { e.target.src = "/logo.png"; }} />
                                        <div className="absolute bottom-2 left-2 right-2 text-left pointer-events-none">
                                            <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">{slide.badge || 'PROMO'}</span>
                                            <p className="text-[10px] font-bold text-white leading-tight truncate">{slide.title || 'Judul Promo'}</p>
                                        </div>
                                    </div>

                                    {/* Slide Input Fields */}
                                    <div className="md:col-span-8 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-1">
                                                <label className="text-[11px] text-gray-400 block mb-1">Badge / Label</label>
                                                <input 
                                                    type="text" 
                                                    value={slide.badge} 
                                                    onChange={(e) => handleUpdateSlide(idx, 'badge', e.target.value)}
                                                    placeholder="PROMO / STUDIO / DEKOR" 
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-teal-500" 
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] text-gray-400 block mb-1">Judul Slide</label>
                                                <input 
                                                    type="text" 
                                                    value={slide.title} 
                                                    onChange={(e) => handleUpdateSlide(idx, 'title', e.target.value)}
                                                    placeholder="Judul banner promo..." 
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-teal-500" 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-gray-400 block mb-1">Subjudul / Deskripsi Promo</label>
                                            <input 
                                                type="text" 
                                                value={slide.subtitle} 
                                                onChange={(e) => handleUpdateSlide(idx, 'subtitle', e.target.value)}
                                                placeholder="Deskripsi singkat penawaran..." 
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-teal-500" 
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] text-gray-400 block mb-1">Foto Banner</label>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                        uploadingSlideIdx === idx 
                                                            ? 'bg-teal-500/50 text-white cursor-not-allowed' 
                                                            : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm active:scale-95'
                                                    }`}>
                                                        <span>{uploadingSlideIdx === idx ? '⏳ Mengunggah...' : '📷 Pilih / Upload Foto Banner'}</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            disabled={uploadingSlideIdx === idx}
                                                            onChange={(e) => handleUploadSlideImage(e, idx)} 
                                                            className="hidden" 
                                                        />
                                                    </label>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={slide.image} 
                                                    onChange={(e) => handleUpdateSlide(idx, 'image', e.target.value)}
                                                    placeholder="/logo.png" 
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 font-mono outline-none focus:border-teal-500" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. PENGATURAN PAKET PILIHAN "BEST SELLER PACKAGE 2026" */}
                <div className="glass-panel p-6 rounded-2xl border border-yellow-500/20">
                    <div className="border-b border-white/10 pb-3 mb-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-md font-semibold text-yellow-400 flex items-center gap-2">
                                <span className="text-yellow-400">★</span>
                                Pengaturan Paket "Best Seller Package 2026"
                            </h3>
                            <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full">
                                {selectedInActiveCat.length} Paket Dipilih
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            Pilih paket-paket yang akan tampil pada kartu 3D Coverflow <strong className="text-white">"Best Seller Package 2026"</strong> (subtitle: <em>Paket incaran para customer</em>) untuk masing-masing kategori di bawah ini.
                        </p>
                    </div>

                    {/* Category Selector Tabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                        {[
                            { id: ADMIN_MAIN_CATEGORIES.WEDDING, label: "💍 Lapanbelas ID" },
                            { id: ADMIN_MAIN_CATEGORIES.PHOTO_STUDIO, label: "📸 Photo Studio" },
                            { id: ADMIN_MAIN_CATEGORIES.MAKEUP, label: "💄 Lady Makeup" },
                            { id: ADMIN_MAIN_CATEGORIES.DEKORASI, label: "🌸 Dekorasi" }
                        ].map(cat => {
                            const isTabActive = activeCategoryTab === cat.id;
                            const count = (bestSellerMap[cat.id] || []).length;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveCategoryTab(cat.id)}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                                        isTabActive 
                                            ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-md shadow-yellow-500/10' 
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span>{cat.label}</span>
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isTabActive ? 'bg-yellow-400 text-black' : 'bg-white/10 text-gray-300'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Package Selector Cards */}
                    {currentCatPackages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs">
                            Belum ada paket yang terdaftar pada kategori ini. Silakan tambahkan paket di menu Manajemen Paket.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                            {currentCatPackages.map(pkg => {
                                const isSelected = selectedInActiveCat.includes(pkg.id);
                                return (
                                    <div 
                                        key={pkg.id}
                                        onClick={() => toggleBestSellerPackage(activeCategoryTab, pkg.id)}
                                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all select-none ${
                                            isSelected 
                                                ? 'bg-yellow-500/10 border-yellow-500/50 shadow-md ring-1 ring-yellow-500/30' 
                                                : 'bg-white/5 border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                                            isSelected ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-white/30 bg-black/40'
                                        }`}>
                                            {isSelected && <span className="font-black text-xs">✓</span>}
                                        </div>
                                        <img src={pkg.image_url} alt={pkg.title} className="w-12 h-12 rounded-lg object-cover shrink-0" onError={(e) => { e.target.src = "/logo.png"; }} />
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-xs font-semibold text-white truncate">{pkg.title}</p>
                                            <p className="text-[11px] font-bold text-emerald-400">{formatRupiah(pkg.price)}</p>
                                            <span className="text-[9px] text-gray-400">{pkg.category || 'Package'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-3 italic">
                        💡 Tips: Jika tidak ada paket yang dicentang, sistem akan otomatis menampilkan paket teratas secara default.
                    </p>
                </div>

                {/* 4. PENGATURAN BANNER PROMO BERJALAN */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 border-b border-white/10 pb-2 text-yellow-400 flex items-center gap-2">
                        <SvgIcon name="alert-circle" className="w-5 h-5 text-yellow-400" />
                        Pengaturan Banner Pengumuman Teks Berjalan (Homepage)
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Status Banner Promo</label>
                            <select name="promoBannerActive" defaultValue={settings['promo_banner_active'] || "false"} key={settings['promo_banner_active']} className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 text-white">
                                <option value="false">Tidak Aktif (Sembunyikan)</option>
                                <option value="true">Aktif (Tampilkan)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Teks Pengumuman Promo (Teks Berjalan)</label>
                            <textarea name="promoBannerText" defaultValue={settings['promo_banner_text'] || "🔥 Spesial Bulan Ini: Dapatkan potongan langsung dengan kode voucher 'LAPANBELAS18' saat checkout!"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 min-h-[60px] text-white"></textarea>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Tema Desain Banner</label>
                            <select name="promoBannerTheme" defaultValue={settings['promo_banner_theme'] || "emerald_gold"} key={settings['promo_banner_theme']} className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 text-white">
                                <option value="emerald_gold">💚 Emerald Gold (Zamrud Emas)</option>
                                <option value="midnight_gold">🖤 Midnight Gold (Hitam Emas)</option>
                                <option value="crimson_passion">❤️ Crimson Passion (Merah Beludru)</option>
                                <option value="royal_violet">💜 Royal Violet (Ungu Kerajaan)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 5. INTEGRASI GOOGLE CALENDAR (OPSI A & ICAL) */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg">
                                🗓️
                            </div>
                            <div>
                                <h3 className="text-md font-semibold text-white">
                                    Integrasi Google Calendar (Realtime API & iCal Feed)
                                </h3>
                                <p className="text-xs text-gray-400">
                                    Sinkronisasi otomatis setiap ada booking, pembayaran DP, atau reschedule langsung ke Google Calendar HP Anda.
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Sinkronisasi Siap
                        </span>
                    </div>

                    <div className="space-y-4 text-xs">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                            <span className="font-semibold text-gray-200">
                                🔗 Universal Calendar Feed URL (.ics):
                            </span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar-feed.ics` : '/api/calendar-feed.ics'}
                                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 font-mono text-gray-300 text-xs select-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const url = `${window.location.origin}/api/calendar-feed.ics`;
                                        navigator.clipboard.writeText(url);
                                        onShowToast("Tautan Calendar Feed berhasil disalin ke clipboard! 📋", "success");
                                    }}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition shrink-0"
                                >
                                    Salin Link
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                💡 <strong>Panduan Cepat:</strong> Buka Google Calendar di komputer atau HP Anda &rarr; Klik <em>Tambah Kalender Lain (+)</em> &rarr; Pilih <em>Dari URL</em> &rarr; Tempel tautan di atas. Seluruh jadwal studio & wedding otomatis tampil di kalender Anda.
                            </p>
                        </div>

                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                            <span className="font-semibold text-gray-200">
                                📅 URL Khusus Ketersediaan Slot & Tanggal Tutup (.ics):
                            </span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar-availability.ics` : '/api/calendar-availability.ics'}
                                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 font-mono text-gray-300 text-xs select-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const url = `${window.location.origin}/api/calendar-availability.ics`;
                                        navigator.clipboard.writeText(url);
                                        onShowToast("Tautan Ketersediaan Feed berhasil disalin ke clipboard! 📋", "success");
                                    }}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition shrink-0"
                                >
                                    Salin Link
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                💡 Tambahkan tautan ini sebagai kalender terpisah di Google Calendar untuk memantau tanggal penuh atau ditutup admin secara live.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="text-gray-400 text-[11px]">
                                Realtime API akan otomatis membuat & memperbarui event di kalender saat ada booking baru atau tanggal diubah di menu Date Available.
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isSyncingCalendar}
                                    onClick={async () => {
                                        setIsSyncingCalendar(true);
                                        onShowToast("Sedang menyinkronkan status ketersediaan ke Google Calendar...", "info");
                                        try {
                                            const res = await adminFetch('/api/calendar/sync-availability', { method: 'POST' });
                                            const data = await res.json();
                                            if (data.success) {
                                                onShowToast(data.message || "Sinkronisasi Ketersediaan berhasil! 🗓️", "success");
                                            } else {
                                                onShowToast("Gagal: " + (data.error || "Unknown error"), "error");
                                            }
                                        } catch (err) {
                                            onShowToast("Error: " + err.message, "error");
                                        } finally {
                                            setIsSyncingCalendar(false);
                                        }
                                    }}
                                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    <span>📅</span>
                                    <span>Sync Ketersediaan (Slot/Tutup)</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isSyncingCalendar}
                                    onClick={async () => {
                                        setIsSyncingCalendar(true);
                                        onShowToast("Sedang menyinkronkan jadwal ke Google Calendar...", "info");
                                        try {
                                            const res = await adminFetch('/api/calendar/sync-all', { method: 'POST' });
                                            const data = await res.json();
                                            if (data.success) {
                                                onShowToast(data.message || "Sinkronisasi Google Calendar berhasil! 🗓️", "success");
                                            } else {
                                                onShowToast("Gagal: " + (data.error || "Unknown error"), "error");
                                            }
                                        } catch (err) {
                                            onShowToast("Error: " + err.message, "error");
                                        } finally {
                                            setIsSyncingCalendar(false);
                                        }
                                    }}
                                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSyncingCalendar ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Menyinkronkan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🔄</span>
                                            <span>Sync Semua Jadwal Klien</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2 pb-10">
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold transition shadow-lg flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Menyimpan...
                            </>
                        ) : (
                            'Simpan Semua Perubahan'
                        )}
                    </button>
                </div>
            </form>

            {/* TEMPLATE PESAN WHATSAPP (disimpan terpisah via tombol sendiri) */}
            <div className="mt-2">
                <WhatsAppTemplateManager adminFetch={adminFetch} onShowToast={onShowToast} />
            </div>
        </div>
    );
}

export default SettingComponent;
export { SettingComponent };
