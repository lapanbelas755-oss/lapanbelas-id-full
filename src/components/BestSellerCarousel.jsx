import React, { useState, useRef, memo } from 'react';

/**
 * BestSellerCarousel - Matching Reference UI/UX Design (Dark & Light Mode Glassmorphism)
 * Menampilkan kartu paket populer secara horizontal (Delta Package, Alpha Package, dll)
 * lengkap dengan badge HEMAT 1 JUTA, HARGA TERBAIK, tombol favorit hati, harga coret,
 * tombol panah (↗) di kanan bawah, serta dukungan swipe di HP & drag/navigasi di Laptop.
 */
function BestSellerCarousel({
    packages = [],
    onCardClick,
    onSeeAll,
    getDiscountedPriceInfo,
    formatHemat,
    formatRupiah,
}) {
    const [likedMap, setLikedMap] = useState({});
    const scrollRef = useRef(null);
    const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
    const [isDragging, setIsDragging] = useState(false);

    const toggleLike = (e, id) => {
        e.stopPropagation();
        setLikedMap(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const scrollByCard = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 212, behavior: 'smooth' });
    };

    const handleMouseDown = (e) => {
        if (!scrollRef.current) return;
        dragState.current = {
            isDown: true,
            startX: e.pageX - scrollRef.current.offsetLeft,
            scrollLeft: scrollRef.current.scrollLeft,
            moved: false
        };
    };

    const handleMouseMove = (e) => {
        if (!dragState.current.isDown || !scrollRef.current) return;
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - dragState.current.startX) * 1.35;
        if (Math.abs(walk) > 6) {
            if (!dragState.current.moved) {
                dragState.current.moved = true;
                setIsDragging(true);
            }
            e.preventDefault();
            scrollRef.current.scrollLeft = dragState.current.scrollLeft - walk;
        }
    };

    const stopDragging = () => {
        if (!dragState.current.isDown) return;
        dragState.current.isDown = false;
        setTimeout(() => {
            dragState.current.moved = false;
            setIsDragging(false);
        }, 50);
    };

    const fallbackWeddingPhotos = [
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80"
    ];

    return (
        <div className="w-full select-none">
            {/* Section Header matching Reference */}
            <div className="mb-3 text-left">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] inline-block"></span>
                    <span className="text-[10px] font-extrabold tracking-widest text-rose-500 uppercase">
                        KOLEKSI TERPOPULER
                    </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <h2 className="text-[17px] sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Best Seller Package 2026
                    </h2>
                    <div className="flex items-center gap-2">
                        {packages.length > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => scrollByCard(-1)}
                                    className="w-6 h-6 rounded-full bg-white/75 dark:bg-[#093236]/90 border border-teal-500/30 dark:border-teal-300/25 flex items-center justify-center text-slate-700 dark:text-teal-200 hover:bg-teal-500 hover:text-white transition shadow-sm active:scale-90 cursor-pointer"
                                    aria-label="Geser Kiri"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollByCard(1)}
                                    className="w-6 h-6 rounded-full bg-white/75 dark:bg-[#093236]/90 border border-teal-500/30 dark:border-teal-300/25 flex items-center justify-center text-slate-700 dark:text-teal-200 hover:bg-teal-500 hover:text-white transition shadow-sm active:scale-90 cursor-pointer"
                                    aria-label="Geser Kanan"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {onSeeAll && (
                            <button
                                type="button"
                                onClick={onSeeAll}
                                className="text-xs font-bold text-[#0d9488] dark:text-[#2dd4bf] hover:opacity-80 transition flex items-center gap-0.5 shrink-0 cursor-pointer"
                            >
                                <span>Lihat Semua</span>
                                <span className="text-sm leading-none">›</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Horizontal Scrollable Cards (Touch Swipe on Mobile + Mouse Drag on Laptop) */}
            <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                className={`relative flex gap-3.5 overflow-x-auto hide-scrollbar pb-3 pt-1 -mx-4 px-4 ${
                    isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory scroll-smooth'
                }`}
            >
                {packages.map((pkg, idx) => {
                    const priceInfo = getDiscountedPriceInfo
                        ? getDiscountedPriceInfo(pkg)
                        : { original: null, price: pkg.price };
                    const hasDiscount = priceInfo.original && priceInfo.original > priceInfo.price;
                    const displayOriginal = hasDiscount
                        ? priceInfo.original
                        : Number(priceInfo.price || 0) + 1000000;
                    const hematText = hasDiscount && formatHemat
                        ? `HEMAT ${formatHemat(priceInfo.original - priceInfo.price).toUpperCase()}`
                        : (idx === 0 ? "HEMAT 1 JUTA" : null);

                    const imgSrc = (!pkg.image_url || pkg.image_url === '/logo.png')
                        ? fallbackWeddingPhotos[idx % fallbackWeddingPhotos.length]
                        : pkg.image_url;

                    const isLiked = !!likedMap[pkg.id || idx];

                    return (
                        <div
                            key={pkg.id || idx}
                            onClick={() => {
                                if (dragState.current.moved) return;
                                if (onCardClick) onCardClick(pkg);
                            }}
                            className="relative w-[184px] sm:w-[196px] h-[256px] sm:h-[270px] shrink-0 snap-start rounded-[24px] overflow-hidden bg-[#06181a] border border-teal-200/60 dark:border-white/15 shadow-[0_10px_28px_-6px_rgba(2,18,20,0.75)] flex flex-col justify-between cursor-pointer group hover:border-teal-300/60 active:scale-[0.98] transition-all duration-300"
                        >
                            {/* Full-Bleed Vertical Poster Image (100% Card Height - Tidak Terpotong Kotak Bawah) */}
                            <img
                                src={imgSrc}
                                alt={pkg.title}
                                draggable={false}
                                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                                loading="lazy"
                            />

                            {/* Subtle Bottom Vignette Only for Text Readability (Poster Tetap Utuh) */}
                            <div
                                className="absolute inset-x-0 bottom-0 h-[44%] pointer-events-none"
                                style={{
                                    background: 'linear-gradient(to top, rgba(2, 10, 12, 0.88) 0%, rgba(2, 10, 12, 0.45) 45%, rgba(2, 10, 12, 0.08) 78%, transparent 100%)'
                                }}
                            />

                            {/* Top Badges Row (Kiri: Hemat + Harga Terbaik, Kanan: Tombol Favorit Love Utuh) */}
                            <div className="relative z-10 p-2.5 flex items-start justify-between gap-2">
                                <div className="flex flex-col items-start gap-1 min-w-0">
                                    {hematText ? (
                                        <>
                                            <span className="bg-rose-500/95 backdrop-blur-md text-white text-[8.5px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wide border border-rose-300/35 whitespace-nowrap">
                                                {hematText}
                                            </span>
                                            <span className="bg-amber-500/95 backdrop-blur-md text-white text-[8.5px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wide border border-amber-300/40 whitespace-nowrap">
                                                ★ HARGA TERBAIK
                                            </span>
                                        </>
                                    ) : (
                                        <span className="bg-[#0b3d40]/90 backdrop-blur-md text-teal-100 text-[8.5px] font-extrabold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wide border border-teal-300/35 whitespace-nowrap">
                                            ★ PILIHAN TERBAIK
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => toggleLike(e, pkg.id || idx)}
                                    className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-sm hover:scale-110 transition shrink-0"
                                    aria-label="Favorit"
                                >
                                    <svg
                                        className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`}
                                        fill={isLiked ? "currentColor" : "none"}
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Bottom Overlay Info on Full Poster */}
                            <div className="relative z-10 px-3.5 pb-3.5 pt-2 flex flex-col justify-end text-left">
                                <div>
                                    <div className="flex items-center gap-1 text-[9px] font-extrabold tracking-wider text-[#2dd4bf] uppercase truncate drop-shadow">
                                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                        <span className="truncate">{pkg.category || 'WEDDING'}</span>
                                    </div>
                                    <h3 className="text-[14.5px] font-extrabold text-white truncate mt-0.5 leading-snug drop-shadow">
                                        {pkg.title}
                                    </h3>
                                </div>

                                <div className="flex items-end justify-between mt-1.5">
                                    <div className="min-w-0 pr-1">
                                        <span className="text-[10.5px] line-through text-slate-300/85 leading-none block truncate drop-shadow">
                                            {formatRupiah ? formatRupiah(displayOriginal) : `Rp ${displayOriginal}`}
                                        </span>
                                        <span className="text-[15.5px] sm:text-[16px] font-extrabold text-[#10f0c8] leading-tight block mt-0.5 truncate drop-shadow">
                                            {formatRupiah ? formatRupiah(priceInfo.price) : `Rp ${priceInfo.price}`}
                                        </span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/15 hover:bg-[#0d9488] backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-md transition-colors shrink-0">
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default memo(BestSellerCarousel);
