import React, { useState, useRef, useEffect } from 'react';

/**
 * PhotoLightboxModal - Fluid Touch & Drag Swipe Fullscreen Lightbox
 * Features:
 * - Real-time continuous gesture tracking (touch on mobile, mouse drag on desktop)
 * - Momentum & velocity-based slide snapping
 * - Real-time sync of counter badge & bottom indicator dots
 * - Hardware accelerated translate3d animations (60/120 FPS)
 * - Keyboard navigation (ArrowLeft, ArrowRight, Escape)
 * - Interactive left/right navigation chevrons
 */
export default function PhotoLightboxModal({
    isOpen,
    photoData, // { url, index, total, urls, title }
    onClose,
    onIndexChange,
    renderOverlay,
    renderFooter,
    SvgIcon
}) {
    if (!isOpen || !photoData || !photoData.urls || photoData.urls.length === 0) return null;

    const urls = photoData.urls;
    const total = urls.length;
    const [currentIndex, setCurrentIndex] = useState(photoData.index || 0);
    const [dragDeltaX, setDragDeltaX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Sync external index changes
    useEffect(() => {
        if (typeof photoData.index === 'number') {
            setCurrentIndex(photoData.index);
        }
    }, [photoData.index]);

    const stateRef = useRef({
        startX: 0,
        startY: 0,
        startTime: 0,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
        isHoriz: null,
        hasMoved: false
    });

    const setIndex = (newIdx) => {
        const clamped = Math.max(0, Math.min(total - 1, newIdx));
        setCurrentIndex(clamped);
        if (onIndexChange) {
            onIndexChange(clamped, urls[clamped]);
        }
    };

    const goToPrev = () => {
        if (total <= 1) return;
        setIsTransitioning(true);
        setDragDeltaX(0);
        setIndex(currentIndex > 0 ? currentIndex - 1 : total - 1);
    };

    const goToNext = () => {
        if (total <= 1) return;
        setIsTransitioning(true);
        setDragDeltaX(0);
        setIndex(currentIndex < total - 1 ? currentIndex + 1 : 0);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') goToPrev();
            else if (e.key === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, total]);

    // Intelligent Background Preloader for Next & Previous Images (Instant Zero-Delay Swiping)
    useEffect(() => {
        if (!urls || urls.length === 0) return;
        const preloadTargets = [
            currentIndex + 1,
            currentIndex + 2,
            currentIndex + 3,
            currentIndex - 1
        ];
        preloadTargets.forEach((idx) => {
            const targetIdx = (idx + total) % total;
            if (urls[targetIdx]) {
                const img = new Image();
                img.referrerPolicy = 'no-referrer';
                img.src = urls[targetIdx];
            }
        });
    }, [currentIndex, urls, total]);

    // Touch & Pointer Down
    const handlePointerDown = (clientX, clientY) => {
        if (total <= 1) return;
        setIsDragging(true);
        setIsTransitioning(false);
        stateRef.current = {
            startX: clientX,
            startY: clientY,
            startTime: performance.now(),
            lastX: clientX,
            lastTime: performance.now(),
            velocity: 0,
            isHoriz: null,
            hasMoved: false
        };
        setDragDeltaX(0);
    };

    // Touch & Pointer Move
    const handlePointerMove = (clientX, clientY, e) => {
        const state = stateRef.current;
        if (!state.startTime || !isDragging) return;

        const dx = clientX - state.startX;
        const dy = clientY - state.startY;

        if (state.isHoriz === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            state.isHoriz = Math.abs(dx) >= Math.abs(dy);
        }

        if (state.isHoriz === false) return; // Allow natural swipe

        if (state.isHoriz === true) {
            if (e && e.cancelable) e.preventDefault();
            state.hasMoved = Math.abs(dx) > 6;

            const now = performance.now();
            const dt = now - state.lastTime;
            if (dt > 8) {
                state.velocity = (clientX - state.lastX) / dt;
                state.lastX = clientX;
                state.lastTime = now;
            }

            // Rubber band resistance when at ends if bounded
            let appliedDx = dx;
            if ((currentIndex === 0 && dx > 0) || (currentIndex === total - 1 && dx < 0)) {
                appliedDx = dx * 0.35; // Soft bounce resistance at edge
            }

            setDragDeltaX(appliedDx);
        }
    };

    // Touch & Pointer Up with Momentum & Snapping
    const handlePointerUp = () => {
        const state = stateRef.current;
        if (!state.startTime || !isDragging) {
            setIsDragging(false);
            setDragDeltaX(0);
            return;
        }

        setIsDragging(false);
        setIsTransitioning(true);

        const dx = dragDeltaX;
        const dt = Math.max(1, performance.now() - state.startTime);
        const velocity = state.velocity || (dx / dt);
        const absVel = Math.abs(velocity);
        const threshold = Math.min(80, window.innerWidth * 0.18);

        // Fast flick or distance threshold
        if (absVel > 0.3 || Math.abs(dx) > threshold) {
            if (dx < 0 || velocity < -0.3) {
                // Swipe left -> next image
                if (currentIndex < total - 1) {
                    setIndex(currentIndex + 1);
                } else {
                    setIndex(0); // loop around
                }
            } else if (dx > 0 || velocity > 0.3) {
                // Swipe right -> prev image
                if (currentIndex > 0) {
                    setIndex(currentIndex - 1);
                } else {
                    setIndex(total - 1); // loop around
                }
            }
        }

        setDragDeltaX(0);
        stateRef.current = {
            startX: 0,
            startY: 0,
            startTime: 0,
            lastX: 0,
            lastTime: 0,
            velocity: 0,
            isHoriz: null,
            hasMoved: false
        };
    };

    return (
        <div 
            className="fixed inset-0 z-[110] bg-black/98 flex flex-col justify-between select-none animate-fade-in touch-none"
            style={{ overscrollBehavior: 'none' }}
        >
            {/* Top Navigation Bar */}
            <div className="flex justify-between items-center px-4 py-3.5 z-30 bg-black/60 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                        {photoData.title || 'Foto Album'}
                    </span>
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 shadow-sm border border-white/10">
                        {currentIndex + 1} / {total}
                    </span>
                </div>
                <button 
                    onClick={onClose} 
                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition backdrop-blur-md border border-white/10"
                    aria-label="Tutup preview"
                >
                    {SvgIcon ? <SvgIcon name="x" className="w-4 h-4 text-white" /> : <span>✕</span>}
                </button>
            </div>

            {/* Main Interactive Swipe Viewport */}
            <div 
                className="flex-1 w-full flex items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing p-2"
                onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e)}
                onTouchEnd={handlePointerUp}
                onTouchCancel={handlePointerUp}
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => {
                    if (isDragging) handlePointerMove(e.clientX, e.clientY, e);
                }}
                onMouseUp={handlePointerUp}
                onMouseLeave={() => {
                    if (isDragging) handlePointerUp();
                }}
            >
                {/* Horizontal Slide Track */}
                <div 
                    className="flex items-center justify-center w-full h-full relative"
                    style={{
                        transform: `translate3d(${dragDeltaX}px, 0, 0)`,
                        transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
                        willChange: 'transform'
                    }}
                >
                    <img 
                        key={currentIndex}
                        src={urls[currentIndex]} 
                        alt={`Preview ${currentIndex + 1}`} 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="max-h-[80vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
                        draggable={false}
                    />

                    {renderOverlay && renderOverlay(currentIndex)}
                </div>

                {/* Left & Right Chevrons */}
                {total > 1 && (
                    <>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                goToPrev();
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/85 active:scale-95 transition shadow-2xl z-20"
                            aria-label="Previous image"
                        >
                            {SvgIcon ? <SvgIcon name="chevron-left" className="w-6 h-6" /> : <span>‹</span>}
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                goToNext();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/85 active:scale-95 transition shadow-2xl z-20"
                            aria-label="Next image"
                        >
                            {SvgIcon ? <SvgIcon name="chevron-right" className="w-6 h-6" /> : <span>›</span>}
                        </button>
                    </>
                )}
            </div>

            {/* Custom Footer or Bottom Indicator Dots */}
            {renderFooter ? (
                renderFooter(currentIndex)
            ) : total > 1 ? (
                <div className="flex justify-center items-center gap-1.5 py-3.5 bg-black/60 backdrop-blur-md z-30">
                    {urls.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setIsTransitioning(true);
                                setIndex(idx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === currentIndex 
                                    ? 'bg-emerald-400 w-5 shadow-sm' 
                                    : 'bg-white/30 w-1.5 hover:bg-white/60'
                            }`}
                            aria-label={`Go to photo ${idx + 1}`}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
