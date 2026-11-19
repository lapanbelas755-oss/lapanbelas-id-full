import React, { useEffect } from 'react';

/**
 * Helper to clean internal tags from package description
 */
const cleanPackageDescription = (desc) => {
    if (!desc) return '';
    return desc
        .replace(/\[HPP_ITEMS\]:[\s\S]*?(?=(\n\s*\[|\n\s*Note|\n\s*\-|$))/gi, '')
        .replace(/\[[A-Z0-9_]+\]:?[^\n]*/gi, '')
        .replace(/%5B%7B[\s\S]*?%5D/gi, '')
        .replace(/%5B[^\n]*/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * Parse description lines into structured items, session info, and note
 */
const parsePackageDetails = (desc) => {
    if (!desc) return { sessionTitle: '', items: [], note: '' };
    const cleaned = cleanPackageDescription(desc);
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);

    let sessionTitle = '';
    const items = [];
    let note = '';

    lines.forEach(line => {
        if (/^note\s*:/i.test(line)) {
            note = line.replace(/^note\s*:\s*/i, '').trim();
        } else if (/^\(\s*[a-zA-Z0-9\s,&+–\/-]+\s*\)$/.test(line) && !sessionTitle) {
            sessionTitle = line.replace(/^\(|\)$/g, '').trim();
        } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
            const itemText = line.replace(/^[-•*]\s*/, '').trim();
            if (itemText) items.push(itemText);
        } else if (/^\d+[\.\)]\s*/.test(line)) {
            const itemText = line.replace(/^\d+[\.\)]\s*/, '').trim();
            if (itemText) items.push(itemText);
        } else {
            if (line.toLowerCase().includes('berlaku untuk') || line.toLowerCase().includes('maksimal durasi')) {
                note = line.replace(/^\(|\)$/g, '').trim();
            } else {
                items.push(line);
            }
        }
    });

    return { sessionTitle, items, note };
};

const formatRupiah = (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
};

const formatHemat = (amount) => {
    if (!amount || amount <= 0) return '';
    if (amount >= 1000000) {
        const jt = amount / 1000000;
        return jt % 1 === 0 ? `${jt} Juta` : `${jt.toFixed(1).replace('.', ',')} Juta`;
    }
    if (amount >= 1000) {
        return `${Math.round(amount / 1000)}rb`;
    }
    return formatRupiah(amount);
};

/**
 * PackageDetailModal
 * Modal pop-up untuk melihat rincian item, fasilitas & ketentuan paket foto
 */
export default function PackageDetailModal({
    isOpen,
    pkg,
    categoryName = '',
    subcatName = '',
    priceInfo,
    onClose,
    onSelect
}) {
    // Keyboard navigation (Esc to close)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !pkg) return null;

    const price = priceInfo?.price ?? pkg.price ?? 0;
    const originalPrice = priceInfo?.original ?? null;
    const { sessionTitle, items, note } = parsePackageDetails(pkg.description);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden glass-card border border-white/20 shadow-2xl bg-[#071e21] text-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Cover & Close Button */}
                <div className="relative h-44 sm:h-52 w-full bg-slate-900 shrink-0 overflow-hidden">
                    <img
                        src={pkg.image_url || "/logo.png"}
                        alt={pkg.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071e21] via-[#071e21]/60 to-transparent" />

                    {/* Tombol Tutup (X) */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all active:scale-95 shadow-lg"
                        title="Tutup Modal (Esc)"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Pill Kategori */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        {subcatName && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/80 text-black shadow-md">
                                {subcatName}
                            </span>
                        )}
                        {categoryName && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-white border border-white/15 backdrop-blur-sm">
                                {categoryName}
                            </span>
                        )}
                    </div>

                    {/* Judul & Harga di Atas Gradien */}
                    <div className="absolute bottom-3 left-5 right-5 z-10">
                        <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md leading-tight">
                            {pkg.title}
                        </h2>
                        {sessionTitle && (
                            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                                Sesi: {sessionTitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Body Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 hide-scrollbar">
                    {/* Kotak Harga & Penawaran Hemat */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                        <div>
                            <span className="text-[11px] text-gray-400 uppercase tracking-wider block font-semibold">
                                Total Biaya Paket
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black text-emerald-400">
                                    {formatRupiah(price)}
                                </span>
                                {originalPrice && (
                                    <span className="text-xs line-through text-gray-500">
                                        {formatRupiah(originalPrice)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {originalPrice && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Hemat {formatHemat(originalPrice - price)}
                            </span>
                        )}
                    </div>

                    {/* Section: Fasilitas & Item Yang Didapat */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                                Fasilitas & Item yang Anda Dapatkan
                            </h3>
                            <span className="text-[11px] text-emerald-400 font-bold ml-auto bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {items.length} Item
                            </span>
                        </div>

                        {items.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2.5">
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-colors"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5 border border-emerald-500/30">
                                            ✓
                                        </div>
                                        <span className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">
                                {cleanPackageDescription(pkg.description) || "Paket foto profesional dengan kualitas terbaik."}
                            </p>
                        )}
                    </div>

                    {/* Section: Catatan Khusus Paket (Jika Ada) */}
                    {note && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
                            <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                            <div className="text-xs leading-relaxed font-medium">
                                <span className="font-bold text-amber-300 block mb-0.5">Catatan Paket:</span>
                                {note}
                            </div>
                        </div>
                    )}

                    {/* Garansi Kualitas Studio */}
                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                        <span className="text-lg">✨</span>
                        <div className="text-[11px] text-gray-300 leading-snug">
                            <span className="font-bold text-white block">Garansi Pelayanan Profesional:</span>
                            Hasil foto & video dikerjakan dengan standar peralatan dan editing studio bergaransi.
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-5 bg-black/40 border-t border-white/10 flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 active:scale-95"
                    >
                        Tutup
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (onSelect) onSelect(pkg);
                            onClose();
                        }}
                        className="flex-[2] py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>Gunakan Paket Ini</span>
                        <span className="font-bold">✓</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
