import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * BestSellerCarousel - Smooth Physics & Momentum Infinite Loop Carousel for Film/Package Posters
 * Features:
 * - 100% True Infinite Loop (Continuous Circular Slider)
 * - Zero empty side gaps: Left shows last item when at index 0, right shows first item when at last index
 * - Smooth Velocity & Momentum Physics (inertial swipe with deceleration curve)
 * - Hardware accelerated 60/120 FPS rendering (translate3d, scale, will-change)
 * - Anti-Jitter & Directional Lock (touch-action: pan-y)
 * - Center Snapping with cubic-bezier / spring-like easing
 * - Seamless boundary-crossing transitions without visual glitch or flicker
 */
export default function BestSellerCarousel({
    packages = [],
    activeIndex = 0,
    onActiveIndexChange,
    onCardClick,
    onSeeAll,
    getDiscountedPriceInfo,
    formatHemat,
    formatRupiah,
    SvgIcon
}) {
    const originalLen = packages.length;

    // Virtual duplication if only 2 items to ensure full left & right peek coverage
    const displayItems = React.useMemo(() => {
        if (originalLen === 2) {
            return [...packages, ...packages];
        }
        return packages;
    }, [packages, originalLen]);

    const totalItems = displayItems.length;

    const [currentIndex, setCurrentIndex] = useState(activeIndex);
    const [dragOffset, setDragOffset] = useState(0); // Offset in fractional card index units
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Sync external activeIndex changes
    useEffect(() => {
        if (!isDragging && !isAnimating && originalLen > 0) {
            const normalized = ((activeIndex % originalLen) + originalLen) % originalLen;
            setCurrentIndex(normalized);
        }
    }, [activeIndex, isDragging, isAnimating, originalLen]);

    // Keep internal & external index synced
    const updateActiveIndex = useCallback((newIdx) => {
        if (originalLen <= 0) return;
        const normalized = ((newIdx % originalLen) + originalLen) % originalLen;
        if (onActiveIndexChange) {
            onActiveIndexChange(normalized);
        }
    }, [originalLen, onActiveIndexChange]);

    const containerRef = useRef(null);
    const stateRef = useRef({
        startX: 0,
        startY: 0,
        startTime: 0,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
        isHoriz: null,
        hasMoved: false,
        velocityHistory: []
    });

    const animFrameRef = useRef(null);

    // Cancel running animation on unmount or new gesture
    const cancelAnimation = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        setIsAnimating(false);
    };

    useEffect(() => {
        return () => cancelAnimation();
    }, []);

    // Pointer / Touch Start
    const handlePointerDown = (clientX, clientY) => {
        if (totalItems <= 1) return;
        cancelAnimation();
        setIsDragging(true);
        stateRef.current = {
            startX: clientX,
            startY: clientY,
            startTime: performance.now(),
            lastX: clientX,
            lastTime: performance.now(),
            velocity: 0,
            isHoriz: null,
            hasMoved: false,
            velocityHistory: []
        };
        setDragOffset(0);
    };

    // Pointer / Touch Move with Smooth Continuous Infinite Drag
    const handlePointerMove = (clientX, clientY, e) => {
        const state = stateRef.current;
        if (!state.startTime || !isDragging) return;

        const dx = clientX - state.startX;
        const dy = clientY - state.startY;

        // Determine axis intention (anti-jitter filter: 5px threshold)
        if (state.isHoriz === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            state.isHoriz = Math.abs(dx) >= Math.abs(dy);
        }

        if (state.isHoriz === false) return; // Allow natural page vertical scroll

        if (state.isHoriz === true) {
            if (e && e.cancelable) e.preventDefault();
            state.hasMoved = Math.abs(dx) > 6;

            const now = performance.now();
            const dt = now - state.lastTime;

            if (dt > 8) {
                const instVel = (clientX - state.lastX) / dt; // px per ms
                state.velocity = instVel;
                state.lastX = clientX;
                state.lastTime = now;

                // Keep sliding window of velocities for smooth release momentum
                state.velocityHistory.push({ time: now, vel: instVel });
                if (state.velocityHistory.length > 5) state.velocityHistory.shift();
            }

            // Reference width for 1 item step (approx 180px - 220px)
            const stepPx = Math.min(220, Math.max(160, (containerRef.current?.clientWidth || 320) * 0.52));
            const rawUnitOffset = -dx / stepPx;

            setDragOffset(rawUnitOffset);
        }
    };

    // Pointer / Touch End with Infinite Momentum Physics
    const handlePointerUp = () => {
        const state = stateRef.current;
        if (!state.startTime || !isDragging) {
            setIsDragging(false);
            setDragOffset(0);
            return;
        }

        setIsDragging(false);

        if (totalItems <= 0) {
            setDragOffset(0);
            return;
        }

        // Calculate weighted average velocity from recent gesture points
        let avgVelocity = state.velocity || 0;
        if (state.velocityHistory.length > 0) {
            const sum = state.velocityHistory.reduce((acc, item) => acc + item.vel, 0);
            avgVelocity = sum / state.velocityHistory.length;
        }

        const stepPx = Math.min(220, Math.max(160, (containerRef.current?.clientWidth || 320) * 0.52));
        const currentFloatingOffset = currentIndex + dragOffset;

        // Momentum distance factor: velocity (px/ms) to card steps
        const momentumStep = -(avgVelocity * 260) / stepPx;
        const projectedIndex = currentFloatingOffset + momentumStep;

        let targetIndex = Math.round(projectedIndex);

        // Responsive fast-flick threshold
        const absVel = Math.abs(avgVelocity);
        if (absVel > 0.32) {
            const flickDir = avgVelocity < 0 ? 1 : -1; // swipe left -> next, swipe right -> prev
            const forcedTarget = currentIndex + flickDir;
            if (flickDir > 0) {
                targetIndex = Math.max(targetIndex, forcedTarget);
            } else {
                targetIndex = Math.min(targetIndex, forcedTarget);
            }
        }

        // Smooth physics glide animation to infinite target index
        animateTo(targetIndex, currentFloatingOffset);

        stateRef.current = {
            startX: 0,
            startY: 0,
            startTime: 0,
            lastX: 0,
            lastTime: 0,
            velocity: 0,
            isHoriz: null,
            hasMoved: false,
            velocityHistory: []
        };
    };

    // Custom 60/120fps Spring/Deceleration Animation to Snap Center seamlessly
    const animateTo = (targetIdx, fromOffset) => {
        if (totalItems <= 1) return;
        cancelAnimation();
        setIsAnimating(true);

        const startOffset = fromOffset;
        const delta = targetIdx - startOffset;
        const startTime = performance.now();

        // Dynamic duration based on distance (260ms to 420ms)
        const duration = Math.min(420, Math.max(260, Math.abs(delta) * 200));

        // Deceleration curve: easeOutQuint for smooth native momentum feel
        const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

        const frame = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = easeOutQuint(progress);

            const currentPos = startOffset + delta * eased;

            if (progress < 1) {
                setCurrentIndex(currentPos);
                setDragOffset(0);
                animFrameRef.current = requestAnimationFrame(frame);
            } else {
                // Settle on clean normalized integer index
                const normalizedIndex = ((targetIdx % totalItems) + totalItems) % totalItems;
                setCurrentIndex(normalizedIndex);
                setDragOffset(0);
                setIsAnimating(false);
                updateActiveIndex(normalizedIndex);
                animFrameRef.current = null;
            }
        };

        animFrameRef.current = requestAnimationFrame(frame);
    };

    const floatingIndex = currentIndex + dragOffset;
    const activeNormalizedIdx = totalItems > 0 
        ? ((Math.round(floatingIndex) % totalItems) + totalItems) % totalItems 
        : 0;
    const currentActivePkg = displayItems[activeNormalizedIdx] || packages[0];

    return (
        <div className="w-full select-none" ref={containerRef}>
            {/* Best Seller Header */}
            <div className="mb-3 flex items-center justify-between text-left">
                <div>
                    <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
                        Best Seller Package 2026
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Paket incaran para customer.</p>
                </div>
                {onSeeAll && (
                    <button 
                        onClick={onSeeAll}
                        className="flex flex-col items-center gap-0.5 text-yellow-400 hover:text-yellow-300 transition group shrink-0"
                        title="Lihat semua paket"
                    >
                        <div className="w-8 h-8 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center group-hover:scale-105 transition shadow-sm">
                            {SvgIcon ? <SvgIcon name="grid" className="w-4 h-4 text-yellow-400" /> : <span>⊞</span>}
                        </div>
                        <span className="text-[9px] font-semibold text-gray-300">See all</span>
                    </button>
                )}
            </div>

            {/* Horizontal Carousel Viewport with Infinite Continuous Coverflow */}
            <div 
                className="relative w-[calc(100%+3rem)] -mx-6 h-[330px] flex items-center justify-center overflow-hidden my-2 cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'pan-y' }}
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
                {displayItems.map((pkg, idx) => {
                    // True Circular Modulo Offset for Infinite Loop (Symmetrical Centering & Visible Peeking)
                    let rawOffset = idx - floatingIndex;
                    let offset = ((rawOffset % totalItems) + totalItems) % totalItems;
                    if (offset > totalItems / 2) {
                        offset -= totalItems;
                    }

                    const absOffset = Math.abs(offset);

                    // 60/120 FPS hardware accelerated calculations
                    // translateX: centered around 0 with optimal 72% card spacing
                    let translateX = offset * 72;
                    let scale = Math.max(0.74, 1 - Math.min(1.2, absOffset) * 0.16);
                    let opacity = absOffset > 1.8 ? 0 : Math.max(0.45, 1 - absOffset * 0.38);
                    let brightness = Math.max(45, 100 - absOffset * 48);
                    let zIndex = Math.round((5 - Math.min(5, absOffset)) * 10) + 1;

                    if (absOffset > 1.4) {
                        translateX = offset > 0 ? (72 + (absOffset - 1) * 72) : (-72 - (absOffset - 1) * 72);
                    }

                    const priceInfo = getDiscountedPriceInfo ? getDiscountedPriceInfo(pkg) : { original: null, price: pkg.price };
                    const isCenter = absOffset < 0.35;

                    return (
                        <div 
                            key={`${pkg.id || idx}_${idx}`}
                            onClick={() => {
                                if (stateRef.current.hasMoved) return;
                                if (offset < -0.3) {
                                    animateTo(floatingIndex - 1, floatingIndex);
                                } else if (offset > 0.3) {
                                    animateTo(floatingIndex + 1, floatingIndex);
                                } else if (onCardClick) {
                                    onCardClick(pkg);
                                }
                            }}
                            className={`absolute w-[60vw] max-w-[215px] aspect-[3/4] rounded-[26px] overflow-hidden p-2 cursor-pointer flex flex-col justify-between transition-shadow duration-300 ${
                                isCenter 
                                    ? 'bg-[#10171d]/90 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10' 
                                    : 'bg-[#0b1015]/80 border border-white/10 shadow-lg'
                            }`}
                            style={{
                                transform: `translate3d(${translateX}%, 0, 0) scale(${scale})`,
                                zIndex,
                                opacity,
                                filter: `brightness(${brightness}%)`,
                                pointerEvents: opacity <= 0.05 ? 'none' : 'auto',
                                willChange: 'transform, opacity, filter',
                                transition: (isDragging || isAnimating)
                                    ? 'none'
                                    : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease, filter 0.35s ease, border-color 0.3s ease'
                            }}
                        >
                            {/* Inner Poster Card */}
                            <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-black/60 pointer-events-none">
                                <img 
                                    src={pkg.image_url} 
                                    alt={pkg.title} 
                                    className="w-full h-full object-cover select-none pointer-events-none" 
                                    draggable={false} 
                                />

                                {/* Top Badges (Matching Screenshot) */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between z-10 pointer-events-none">
                                    {/* Left Badge: HEMAT Ribbon / Populer */}
                                    {priceInfo.original && (priceInfo.original > priceInfo.price) ? (
                                        <div className="bg-gradient-to-r from-[#ff4d4d] to-[#f43f5e] text-white px-2 py-0.5 rounded-l-md rounded-r-xl flex flex-col items-start leading-none shadow-md border border-red-300/30">
                                            <span className="text-[7px] font-extrabold uppercase tracking-wider opacity-90">HEMAT</span>
                                            <span className="text-[9.5px] font-black mt-0.5">
                                                {formatHemat ? formatHemat(priceInfo.original - priceInfo.price) : `${(priceInfo.original - priceInfo.price) / 1000}k`}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="bg-black/60 backdrop-blur-md border border-white/15 text-white text-[8px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                            POPULER
                                        </div>
                                    )}

                                    {/* Right Badge: Harga Terbaik */}
                                    <div className="bg-gradient-to-r from-[#ff4d4d] to-[#f43f5e] text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-red-300/30 text-[8.5px] font-bold ml-auto">
                                        <span className="text-[9px]">★</span>
                                        <span>{priceInfo.original ? 'Harga Terbaik' : 'Pilihan Terbaik'}</span>
                                    </div>
                                </div>

                                {/* Dark cinematic bottom gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>

                                {/* Bottom Info inside Poster */}
                                <div className="absolute bottom-2.5 left-3 right-3 text-left">
                                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-1">
                                        {pkg.title}
                                    </h3>
                                    <div className="flex items-end justify-between mt-1">
                                        <div className="flex flex-col">
                                            {priceInfo.original && (
                                                <span className="text-[8.5px] line-through text-gray-400 leading-none">
                                                    {formatRupiah ? formatRupiah(priceInfo.original) : `Rp ${priceInfo.original}`}
                                                </span>
                                            )}
                                            <span className="text-xs sm:text-[13px] font-black text-[#00ffcc] tracking-tight mt-0.5">
                                                {formatRupiah ? formatRupiah(priceInfo.price) : `Rp ${priceInfo.price}`}
                                            </span>
                                        </div>
                                        <span className="w-6 h-6 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition backdrop-blur-sm border border-white/10 shrink-0">
                                            {SvgIcon ? <SvgIcon name="arrow-up-right" className="w-3.5 h-3.5" /> : <span>↗</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Active Card Category & Pagination Dots */}
            {originalLen > 0 && (
                <div className="mt-1 mb-2 text-center transition-all duration-300">
                    <p className="text-xs text-gray-400">{currentActivePkg?.category || ''}</p>
                    
                    {/* Dots indicators */}
                    <div className="flex justify-center items-center gap-1.5 mt-2">
                        {packages.map((_, i) => {
                            const activeOriginalIdx = ((Math.round(floatingIndex) % originalLen) + originalLen) % originalLen;
                            const isDotActive = activeOriginalIdx === i;

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        // Calculate shortest circular path
                                        let diff = ((i - (Math.round(floatingIndex) % totalItems)) % totalItems + totalItems) % totalItems;
                                        if (diff > totalItems / 2) diff -= totalItems;
                                        animateTo(floatingIndex + diff, floatingIndex);
                                    }}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        isDotActive ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                                    }`}
                                    aria-label={`Go to slide ${i + 1}`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
