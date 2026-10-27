import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * PhotoLightboxModal - Fluid Touch & High-DPI Crisp Zoom Fullscreen Lightbox
 * Features:
 * - Ultra-clear 2.5K HD Rendering (Zero-blur rasterization on iOS/Android/Desktop)
 * - True High-DPI Vector Zoom (1x, 2x, 3x) via direct image transform without composite blur
 * - Touch & Gestures:
 *   - Double-Tap / Double-Click to Zoom (Centers on tapped point, zero bounce)
 *   - 2-Finger Pinch-to-Zoom (1x - 3.6x)
 *   - Top Bar Zoom Cycle Button (1x -> 2.2x HD -> 3.2x Ultra -> 1x)
 *   - Smooth 2D Panning when zoomed in
 *   - Momentum Swipe to Next/Prev photo when at 1x
 * - Instant Cached Preview with seamless HD transition
 */
export default function PhotoLightboxModal({
    isOpen,
    photoData, // { url, index, total, urls, thumbUrls, ids, titles, title }
    onClose,
    onIndexChange,
    renderOverlay,
    renderFooter,
    SvgIcon
}) {
    if (!isOpen || !photoData || !photoData.urls || photoData.urls.length === 0) return null;

    const urls = photoData.urls;
    const thumbUrls = photoData.thumbUrls || [];
    const total = urls.length;
    const [currentIndex, setCurrentIndex] = useState(photoData.index || 0);

    // Slide transition state (at 1x)
    const [dragDeltaX, setDragDeltaX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // High-resolution image load state
    const [isHighResReady, setIsHighResReady] = useState(false);

    // Zoom & Pan state
    const [zoomScale, setZoomScale] = useState(1);
    const [panPos, setPanPos] = useState({ x: 0, y: 0 });
    const lastZoomTriggerTimeRef = useRef(0);

    const resetZoom = useCallback(() => {
        setZoomScale(1);
        setPanPos({ x: 0, y: 0 });
    }, []);

    const setSpecificZoom = (targetScale) => {
        setZoomScale(targetScale);
        if (targetScale <= 1.05) {
            setPanPos({ x: 0, y: 0 });
        }
    };

    const cycleZoom = (e) => {
        if (e) e.stopPropagation();
        const now = performance.now();
        lastZoomTriggerTimeRef.current = now;
        if (zoomScale < 1.4) {
            setSpecificZoom(2.2);
        } else if (zoomScale < 2.6) {
            setSpecificZoom(3.2);
        } else {
            resetZoom();
        }
    };

    // Smooth Double-Tap Zoom that centers on the tapped point and prevents the bounce bug
    const performDoubleTapZoom = (clientX, clientY) => {
        const now = performance.now();
        // Debounce to prevent synthetic double-click firing right after touch double-tap
        if (now - lastZoomTriggerTimeRef.current < 420) {
            return;
        }
        lastZoomTriggerTimeRef.current = now;

        setIsDragging(false);
        setDragDeltaX(0);

        if (zoomScale > 1.15) {
            resetZoom();
            return;
        }

        const targetScale = 2.5;
        let targetPanX = 0;
        let targetPanY = 0;

        if (typeof clientX === 'number' && typeof clientY === 'number') {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            targetPanX = (centerX - clientX) * 0.85;
            targetPanY = (centerY - clientY) * 0.85;
            const maxPanX = (window.innerWidth * (targetScale - 1)) * 0.55;
            const maxPanY = (window.innerHeight * (targetScale - 1)) * 0.55;
            targetPanX = Math.max(-maxPanX, Math.min(maxPanX, targetPanX));
            targetPanY = Math.max(-maxPanY, Math.min(maxPanY, targetPanY));
        }

        setZoomScale(targetScale);
        setPanPos({ x: targetPanX, y: targetPanY });
    };

    // Sync external index changes
    useEffect(() => {
        if (typeof photoData.index === 'number') {
            setCurrentIndex(photoData.index);
            setIsHighResReady(false);
            resetZoom();
        }
    }, [photoData.index, resetZoom]);

    const stateRef = useRef({
        startX: 0,
        startY: 0,
        startTime: 0,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
        isHoriz: null,
        hasMoved: false,
        panStartX: 0,
        panStartY: 0,
        pinchStartDist: 0,
        pinchStartScale: 1,
        lastTapTime: 0
    });

    const setIndex = (newIdx) => {
        const clamped = Math.max(0, Math.min(total - 1, newIdx));
        if (clamped !== currentIndex) {
            setIsHighResReady(false);
            resetZoom();
        }
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
            if (e.key === 'Escape') {
                if (zoomScale > 1.05) resetZoom();
                else onClose();
            } else if (e.key === 'ArrowLeft' && zoomScale <= 1.05) {
                goToPrev();
            } else if (e.key === 'ArrowRight' && zoomScale <= 1.05) {
                goToNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, total, zoomScale, resetZoom]);

    // Preload next and prev images
    useEffect(() => {
        if (!urls || urls.length <= 1) return;
        const targets = [currentIndex + 1, currentIndex - 1];
        const timer = setTimeout(() => {
            targets.forEach((idx) => {
                const targetIdx = (idx + total) % total;
                if (urls[targetIdx]) {
                    const img = new Image();
                    img.referrerPolicy = 'no-referrer';
                    img.src = urls[targetIdx];
                }
            });
        }, 200);
        return () => clearTimeout(timer);
    }, [currentIndex, urls, total]);

    const getTouchDist = (t1, t2) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.hypot(dx, dy);
    };

    // Touch start handler
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            setIsDragging(true);
            setIsTransitioning(false);
            stateRef.current.pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
            stateRef.current.pinchStartScale = zoomScale;
            return;
        }

        if (e.touches.length === 1) {
            const clientX = e.touches[0].clientX;
            const clientY = e.touches[0].clientY;
            const now = performance.now();

            if (now - stateRef.current.lastTapTime < 300) {
                stateRef.current.lastTapTime = 0;
                performDoubleTapZoom(clientX, clientY);
                return;
            }
            stateRef.current.lastTapTime = now;

            handlePointerDown(clientX, clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && stateRef.current.pinchStartDist > 0) {
            if (e.cancelable) e.preventDefault();
            const dist = getTouchDist(e.touches[0], e.touches[1]);
            const nextScale = Math.max(1, Math.min(3.6, stateRef.current.pinchStartScale * (dist / stateRef.current.pinchStartDist)));
            setZoomScale(nextScale);
            if (nextScale <= 1.02) {
                setPanPos({ x: 0, y: 0 });
            }
            return;
        }

        if (e.touches.length === 1) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
        }
    };

    const handlePointerDown = (clientX, clientY) => {
        setIsDragging(true);
        setIsTransitioning(false);
        stateRef.current = {
            ...stateRef.current,
            startX: clientX,
            startY: clientY,
            startTime: performance.now(),
            lastX: clientX,
            lastTime: performance.now(),
            velocity: 0,
            isHoriz: null,
            hasMoved: false,
            panStartX: panPos.x,
            panStartY: panPos.y,
            pinchStartDist: 0
        };
        setDragDeltaX(0);
    };

    const handlePointerMove = (clientX, clientY, e) => {
        const state = stateRef.current;
        if (!state.startTime || !isDragging) return;

        const dx = clientX - state.startX;
        const dy = clientY - state.startY;

        // If zoomed in: pan the image
        if (zoomScale > 1.05) {
            if (e && e.cancelable) e.preventDefault();
            state.hasMoved = Math.abs(dx) > 3 || Math.abs(dy) > 3;
            const maxPanX = (window.innerWidth * (zoomScale - 1)) * 0.65;
            const maxPanY = (window.innerHeight * (zoomScale - 1)) * 0.65;
            const nextX = Math.max(-maxPanX, Math.min(maxPanX, state.panStartX + dx));
            const nextY = Math.max(-maxPanY, Math.min(maxPanY, state.panStartY + dy));
            setPanPos({ x: nextX, y: nextY });
            return;
        }

        if (total <= 1) return;

        if (state.isHoriz === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            state.isHoriz = Math.abs(dx) >= Math.abs(dy);
        }

        if (state.isHoriz === false) return;

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

            let appliedDx = dx;
            if ((currentIndex === 0 && dx > 0) || (currentIndex === total - 1 && dx < 0)) {
                appliedDx = dx * 0.35;
            }

            setDragDeltaX(appliedDx);
        }
    };

    const handlePointerUp = () => {
        const state = stateRef.current;
        if (state.pinchStartDist > 0) {
            state.pinchStartDist = 0;
            if (zoomScale < 1.05) resetZoom();
            setIsDragging(false);
            return;
        }

        if (zoomScale > 1.05) {
            setIsDragging(false);
            return;
        }

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

        if (absVel > 0.3 || Math.abs(dx) > threshold) {
            if (dx < 0 || velocity < -0.3) {
                if (currentIndex < total - 1) {
                    setIndex(currentIndex + 1);
                } else {
                    setIndex(0);
                }
            } else if (dx > 0 || velocity > 0.3) {
                if (currentIndex > 0) {
                    setIndex(currentIndex - 1);
                } else {
                    setIndex(total - 1);
                }
            }
        }

        setDragDeltaX(0);
        stateRef.current = {
            ...stateRef.current,
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

    const currentThumbUrl = thumbUrls[currentIndex] || null;
    const currentHighResUrl = urls[currentIndex];

    return (
        <div 
            className="fixed inset-0 z-[110] bg-black/98 flex flex-col justify-between select-none animate-fade-in touch-none"
            style={{ overscrollBehavior: 'none' }}
        >
            {/* Top Navigation Bar */}
            <div className="flex justify-between items-center px-4 py-3.5 z-30 bg-black/60 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-semibold text-white truncate max-w-[150px] sm:max-w-[360px]">
                        {(photoData.titles && photoData.titles[currentIndex]) || photoData.title || 'Foto Album'}
                    </span>
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 shadow-sm border border-white/10 shrink-0">
                        {currentIndex + 1} / {total}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Zoom Toggle Button */}
                    <button
                        type="button"
                        onClick={cycleZoom}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition backdrop-blur-md border active:scale-95 ${
                            zoomScale > 1.05
                                ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/30'
                                : 'bg-white/15 hover:bg-white/25 text-white border-white/15'
                        }`}
                        title="Klik untuk zoom 2.2x / 3.2x / 1x"
                    >
                        <span>🔍</span>
                        <span>{zoomScale > 2.5 ? '3.2x Ultra' : zoomScale > 1.05 ? '2.2x HD' : 'Zoom'}</span>
                    </button>

                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition backdrop-blur-md border border-white/10"
                        aria-label="Tutup preview"
                    >
                        {SvgIcon ? <SvgIcon name="x" className="w-4 h-4 text-white" /> : <span>✕</span>}
                    </button>
                </div>
            </div>

            {/* Main Interactive Swipe & Zoom Viewport */}
            <div 
                className={`flex-1 w-full flex items-center justify-center relative overflow-hidden p-2 ${
                    zoomScale > 1.05 ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'
                }`}
                onDoubleClick={(e) => {
                    performDoubleTapZoom(e.clientX, e.clientY);
                }}
                onWheel={(e) => {
                    if (Math.abs(e.deltaY) > 5) {
                        const factor = e.deltaY < 0 ? 1.2 : 0.82;
                        const nextScale = Math.max(1, Math.min(3.6, zoomScale * factor));
                        setZoomScale(nextScale);
                        if (nextScale <= 1.05) setPanPos({ x: 0, y: 0 });
                    }
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
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
                {/* Image Slide Container */}
                <div 
                    className="flex items-center justify-center w-full h-full relative pointer-events-none"
                    style={{
                        transform: zoomScale <= 1.05 ? `translate3d(${dragDeltaX}px, 0, 0)` : 'none',
                        transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
                        willChange: zoomScale <= 1.05 ? 'transform' : 'auto'
                    }}
                >
                    {/* Instant cached thumbnail while HD loads */}
                    {currentThumbUrl && !isHighResReady && (
                        <img
                            key={`thumb-${currentIndex}`}
                            src={currentThumbUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="absolute max-h-[82vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl select-none transition-opacity duration-300"
                            draggable={false}
                        />
                    )}

                    {/* 2.5K Ultra HD Crisp Image (Direct transform for true device pixel rendering without blur) */}
                    <img 
                        key={`hd-${currentIndex}`}
                        src={currentHighResUrl} 
                        alt={`Preview ${currentIndex + 1}`} 
                        referrerPolicy="no-referrer"
                        decoding="async"
                        onLoad={() => setIsHighResReady(true)}
                        onError={(e) => {
                            const explicitId = photoData.ids && photoData.ids[currentIndex];
                            const currentSrc = e.target.getAttribute('src') || '';
                            const extractedMatch = currentSrc.match(/\/api\/drive-image-proxy\/([^/?&]+)/) || currentSrc.match(/[?&]id=([^&]+)/);
                            const fileId = explicitId || (extractedMatch ? extractedMatch[1] : null);
                            if (!fileId) return;

                            const step = e.target.dataset.fallbackStep || '0';
                            if (step === '0') {
                                e.target.dataset.fallbackStep = '1';
                                const proxy2560 = `/api/drive-image-proxy/${fileId}?sz=2560`;
                                if (currentSrc !== proxy2560) {
                                    e.target.src = proxy2560;
                                } else {
                                    e.target.dataset.fallbackStep = '2';
                                    e.target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2560`;
                                }
                            } else if (step === '1') {
                                e.target.dataset.fallbackStep = '2';
                                e.target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2560`;
                            } else if (step === '2') {
                                e.target.dataset.fallbackStep = '3';
                                e.target.src = `/api/drive-image-proxy/${fileId}?sz=500`;
                            }
                        }}
                        style={{
                            transform: zoomScale > 1.05 
                                ? `translate3d(${panPos.x}px, ${panPos.y}px, 0) scale(${zoomScale})`
                                : 'translate3d(0, 0, 0) scale(1)',
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.24s cubic-bezier(0.25, 1, 0.5, 1)',
                            imageRendering: '-webkit-optimize-contrast'
                        }}
                        className={`max-h-[82vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl select-none pointer-events-auto transition-opacity duration-300 ${
                            isHighResReady ? 'opacity-100 z-10' : 'opacity-0'
                        }`}
                        draggable={false}
                    />
                </div>

                {renderOverlay && renderOverlay(currentIndex)}

                {/* Left & Right Chevrons */}
                {total > 1 && zoomScale <= 1.05 && (
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
