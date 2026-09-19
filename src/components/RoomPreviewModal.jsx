import React, { useState, useEffect, useRef } from 'react';

/**
 * RoomPreviewModal - Modern Slider / Carousel Modal for Studio Room Previews
 * Features:
 * - High-definition main photo with fixed 4:3 aspect ratio (responsive)
 * - Interactive left/right navigation arrows & touch swipe gestures on mobile
 * - Clickable thumbnail preview gallery at the bottom
 * - Photo counter badge (e.g., "Sample 1 / 6")
 * - Keyboard navigation (ArrowLeft, ArrowRight, Escape)
 * - Backdrop blur & animated modal transition
 */
export default function RoomPreviewModal({
    roomPreview,
    images = [],
    onClose,
    onSelectRoom
}) {
    if (!roomPreview) return null;

    const [currentIndex, setCurrentIndex] = useState(0);
    const total = images.length;
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Reset index when room preview changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [roomPreview.name]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                goToPrev();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, total]);

    const goToPrev = () => {
        if (total <= 1) return;
        setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
    };

    const goToNext = () => {
        if (total <= 1) return;
        setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
    };

    // Touch Swipe Handlers for Mobile
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diff = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 40; // pixels

        if (diff > minSwipeDistance) {
            goToNext();
        } else if (diff < -minSwipeDistance) {
            goToPrev();
        }

        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#121c20]/95 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl w-full max-w-[360px] sm:max-w-[380px] border border-white/10 shadow-2xl relative flex flex-col gap-3 sm:gap-3.5 max-h-[92vh] overflow-y-auto hide-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start pb-2 border-b border-white/10">
                    <div className="pr-2">
                        <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                            {roomPreview.name}
                        </h3>
                        {roomPreview.desc && (
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                                {roomPreview.desc}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center transition text-white/80 hover:text-white shrink-0"
                        title="Tutup Preview"
                    >
                        ✕
                    </button>
                </div>

                {/* Carousel Main Image Area */}
                {total > 0 ? (
                    <div className="flex flex-col gap-3 items-center w-full">
                        <div
                            className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 select-none shrink-0 flex items-center justify-center mx-auto shadow-xl"
                            style={{
                                aspectRatio: '2 / 3',
                                height: '46vh',
                                maxHeight: '440px',
                                maxWidth: '100%'
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Active Photo */}
                            <img
                                key={currentIndex}
                                src={images[currentIndex]}
                                alt={`${roomPreview.name} Sample ${currentIndex + 1}`}
                                className="w-full h-full object-cover transition-opacity duration-300 animate-in fade-in"
                                loading="eager"
                            />

                            {/* Badge Counter */}
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/10 shadow-lg flex items-center gap-1 z-10">
                                <span>Sample</span>
                                <span className="text-emerald-400 font-extrabold">{currentIndex + 1}</span>
                                <span className="text-white/60">/</span>
                                <span>{total}</span>
                            </div>

                            {/* Navigation Chevrons (Only if multiple photos exist) */}
                            {total > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            goToPrev();
                                        }}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-90 shadow-xl"
                                        title="Foto Sebelumnya"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            goToNext();
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-90 shadow-xl"
                                        title="Foto Selanjutnya"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails Row */}
                        {total > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 hide-scrollbar w-full">
                                {images.map((imgUrl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`relative shrink-0 w-11 h-16 sm:w-13 sm:h-18 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                                            currentIndex === idx
                                                ? 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-md scale-[1.03]'
                                                : 'border-white/10 opacity-55 hover:opacity-100 hover:border-white/30'
                                        }`}
                                        title={`Buka Sample ${idx + 1}`}
                                    >
                                        <img
                                            src={imgUrl}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {currentIndex === idx && (
                                            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-xs text-gray-400 py-10 bg-black/20 rounded-2xl border border-white/5">
                        Belum ada foto contoh untuk ruangan ini.
                    </div>
                )}

                {/* Primary CTA Button */}
                <button
                    type="button"
                    onClick={() => onSelectRoom(roomPreview.name)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 sm:py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] active:scale-[0.98] flex items-center justify-center gap-2 mt-1"
                >
                    <span>Pilih Room Ini</span>
                    <span className="text-sm font-bold">✓</span>
                </button>
            </div>
        </div>
    );
}
