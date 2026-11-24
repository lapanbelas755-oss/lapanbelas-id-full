import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/**
 * Helper Currency Formatter
 */
const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(Number(number) || 0);
};

const VA_BANKS = [
    { code: 'mandirisyariah', name: 'BSI', fullName: 'Bank Syariah Indonesia (BSI)', badge: 'Populer', color: 'bg-[#00A39D] text-white' },
    { code: 'mandiri', name: 'Mandiri', fullName: 'Bank Mandiri', badge: '', color: 'bg-[#003D79] text-white' },
    { code: 'bri', name: 'BRI', fullName: 'Bank Rakyat Indonesia (BRI)', badge: '', color: 'bg-[#00529C] text-white' },
    { code: 'bni', name: 'BNI', fullName: 'Bank Negara Indonesia (BNI)', badge: '', color: 'bg-[#F15A23] text-white' },
    { code: 'cimb', name: 'CIMB', fullName: 'CIMB Niaga', badge: '', color: 'bg-[#790008] text-white' },
    { code: 'maybank', name: 'Maybank', fullName: 'Maybank Indonesia', badge: '', color: 'bg-[#FFC72C] text-slate-900' }
];

const STUDIO_KEYWORDS = [
    'studio', 'family', 'maternity', 'group', 'graduation', 'personal',
    'couple', 'prewedding studio', 'poto product', 'studio lapanbelas',
    'wisuda', 'pas foto', 'self photo', 'photo self', 'photobox', 'photo box'
];

export default function InAppPaymentModal({
    isOpen,
    onClose,
    paymentData,
    onPaymentSuccess
}) {
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 menit
    const [isChecking, setIsChecking] = useState(false);
    const [isPaidSuccess, setIsPaidSuccess] = useState(false);
    const [appointmentData, setAppointmentData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [copiedVa, setCopiedVa] = useState(false);
    const [copiedAmount, setCopiedAmount] = useState(false);
    const [statusToast, setStatusToast] = useState(null);
    const toastTimerRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Tab & Virtual Account state (only for non-Studio categories)
    const [paymentMethodTab, setPaymentMethodTab] = useState('qris'); // 'qris' | 'va'
    const [selectedBank, setSelectedBank] = useState('mandirisyariah');
    const [vaCache, setVaCache] = useState({});
    const [isLoadingVa, setIsLoadingVa] = useState(false);
    const [vaError, setVaError] = useState('');
    const [openInstructionIdx, setOpenInstructionIdx] = useState(0);

    const showStatusToast = (type, title, message) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setStatusToast({ type, title, message });
        toastTimerRef.current = setTimeout(() => {
            setStatusToast(null);
        }, 4500);
    };

    const {
        orderId,
        amount,
        paymentUrl,
        tokenId,
        snapToken,
        qrUrl,
        qrString,
        gateway,
        pkgTitle,
        eventDate,
        clientName,
        roomStudio,
        jamSesi,
        allowVa,
        isStudio,
        division
    } = paymentData || {};

    // Determine if Virtual Account is allowed (False for Photo Studio, True for Wedding/Makeup/Dekorasi)
    const canUseVa = React.useMemo(() => {
        if (typeof allowVa === 'boolean') return allowVa;
        if (typeof isStudio === 'boolean') return !isStudio;
        if (roomStudio && String(roomStudio).trim() !== '') return false;
        const checkStr = `${division || ''} ${pkgTitle || ''}`.toLowerCase();
        if (STUDIO_KEYWORDS.some(k => checkStr.includes(k))) return false;
        return true;
    }, [allowVa, isStudio, roomStudio, division, pkgTitle]);

    // 0. Reset state saat modal dibuka untuk order baru
    useEffect(() => {
        if (isOpen) {
            setIsPaidSuccess(false);
            setAppointmentData(null);
            setIsChecking(false);
            setPaymentMethodTab('qris');
            setSelectedBank('mandirisyariah');
            setVaCache({});
            setVaError('');
            setOpenInstructionIdx(0);
        }
    }, [isOpen, orderId]);

    // 1. Countdown Timer (15 Minutes)
    useEffect(() => {
        if (!isOpen || isPaidSuccess) return;
        setTimeLeft(15 * 60);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, isPaidSuccess]);

    // Active tokenId tracking (from initial payment or refreshed by VA generator)
    const currentVaData = vaCache[selectedBank] || null;
    const effectiveTokenId = currentVaData?.token_id || tokenId || '';

    // 2. Realtime Payment Status Polling (Auto-Detect Webhook & Direct DOKU Confirmation)
    useEffect(() => {
        if (!isOpen || !orderId || isPaidSuccess) return;

        const checkStatus = async () => {
            try {
                const query = effectiveTokenId ? `?token_id=${encodeURIComponent(effectiveTokenId)}` : '';
                const res = await fetch(`/api/check-payment-status/${orderId}${query}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_paid) {
                        setIsPaidSuccess(true);
                        setAppointmentData(data.appointment);
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        if (onPaymentSuccess) onPaymentSuccess(data.appointment);
                    }
                }
            } catch (err) {
                console.error("Error polling payment status:", err);
            }
        };

        pollIntervalRef.current = setInterval(checkStatus, 3500);
        checkStatus();

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [isOpen, orderId, isPaidSuccess, effectiveTokenId]);

    // 3. Auto-fetch Virtual Account number when user opens VA tab or switches bank
    useEffect(() => {
        if (!isOpen || !canUseVa || paymentMethodTab !== 'va' || !orderId || isPaidSuccess) return;
        if (vaCache[selectedBank]) return; // Already generated and cached

        let isCancelled = false;
        const fetchVaCode = async () => {
            setIsLoadingVa(true);
            setVaError('');
            try {
                const res = await fetch('/api/payment/generate-va', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_id: orderId,
                        token_id: tokenId || '',
                        bank: selectedBank,
                        amount: amount
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (isCancelled) return;

                if (res.ok && data.payment_code) {
                    setVaCache(prev => ({
                        ...prev,
                        [selectedBank]: data
                    }));
                    setOpenInstructionIdx(0);
                } else {
                    setVaError(data.error || 'Gagal memuat nomor Virtual Account. Silakan coba lagi.');
                }
            } catch (err) {
                if (!isCancelled) {
                    setVaError('Gagal terhubung ke server pembayaran.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingVa(false);
                }
            }
        };

        fetchVaCode();
        return () => {
            isCancelled = true;
        };
    }, [isOpen, canUseVa, paymentMethodTab, selectedBank, orderId, tokenId, amount, isPaidSuccess, vaCache]);

    // Format MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Manual Refresh Button Handler
    const handleManualCheck = async () => {
        if (!orderId || isChecking) return;
        setIsChecking(true);
        try {
            const query = effectiveTokenId ? `?token_id=${encodeURIComponent(effectiveTokenId)}` : '';
            const res = await fetch(`/api/check-payment-status/${orderId}${query}`);
            if (res.ok) {
                const data = await res.json();
                if (data.is_paid) {
                    setIsPaidSuccess(true);
                    setAppointmentData(data.appointment);
                    if (onPaymentSuccess) onPaymentSuccess(data.appointment);
                } else {
                    showStatusToast(
                        "waiting",
                        "Menunggu Pembayaran",
                        paymentMethodTab === 'va'
                            ? "Pembayaran transfer Virtual Account belum terdeteksi. Silakan selesaikan pembayaran di m-banking/ATM Anda."
                            : "Pembayaran belum terdeteksi. Silakan selesaikan scan QRIS di m-banking atau e-wallet Anda."
                    );
                }
            } else {
                showStatusToast(
                    "error",
                    "Gagal Memeriksa",
                    "Terjadi kendala saat memeriksa status pembayaran ke server."
                );
            }
        } catch (e) {
            console.error(e);
            showStatusToast(
                "error",
                "Gangguan Koneksi",
                "Gagal terhubung ke server. Periksa koneksi internet Anda."
            );
        } finally {
            setIsChecking(false);
        }
    };

    const handleCopyVaCode = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(String(code));
        setCopiedVa(true);
        setTimeout(() => setCopiedVa(false), 2200);
    };

    const handleCopyAmount = () => {
        if (!amount) return;
        navigator.clipboard.writeText(String(amount));
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2200);
    };

    const [qrDataUrl, setQrDataUrl] = useState(null);

    // Instant local QR barcode rendering (0ms delay, zero CDN dependency)
    useEffect(() => {
        if (!qrString) {
            setQrDataUrl(null);
            return;
        }
        QRCode.toDataURL(qrString, { margin: 1, width: 500, errorCorrectionLevel: 'M' })
            .then(url => setQrDataUrl(url))
            .catch(err => {
                console.warn('Local QRCode fallback to CDN:', err);
                setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=8&data=${encodeURIComponent(qrString)}`);
            });
    }, [qrString]);

    // ONLY use qrString to render a clean bare barcode — generated locally in ms
    const effectiveQrImage = qrDataUrl || (qrString
        ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=8&data=${encodeURIComponent(qrString)}`
        : null);

    if (!isOpen) return null;

    // ====== EMBEDDED CHECKOUT IFRAME (FALLBACK ONLY WHEN NO DIRECT QR CODE & NOT USING VA TAB) ======
    if (!effectiveQrImage && paymentUrl && !isPaidSuccess && paymentMethodTab === 'qris' && !canUseVa) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020c0e]/85 backdrop-blur-xl animate-in fade-in duration-200">
                <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.18)_0%,rgba(4,22,23,0.85)_65%,rgba(2,12,14,0.96)_100%)]" />
                <div className="relative w-full h-full max-w-lg flex flex-col" style={{maxHeight: '100dvh'}}>

                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#062528] border-b border-teal-400/20 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                            <span className="text-xs font-bold text-teal-100">
                                {gateway === 'midtrans' ? 'Pembayaran QRIS Midtrans' : 'Pembayaran QRIS DOKU'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-teal-200 font-medium">{formatRupiah(amount)}</span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 hover:text-white flex items-center justify-center transition-all text-sm border border-teal-400/30"
                                title="Tutup"
                            >✕</button>
                        </div>
                    </div>

                    {/* Checkout Iframe */}
                    <iframe
                        src={paymentUrl}
                        title={gateway === 'midtrans' ? "Midtrans Checkout" : "DOKU Checkout"}
                        className="flex-1 w-full border-0 bg-white"
                        allow="payment"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                    />

                    {/* Footer Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#062528] border-t border-teal-400/20 shrink-0">
                        <span className="text-[10px] text-teal-400/70">
                            Powered by {gateway === 'midtrans' ? 'Midtrans' : 'DOKU'}
                        </span>
                        <button
                            type="button"
                            onClick={handleManualCheck}
                            disabled={isChecking}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition active:scale-95"
                        >
                            {isChecking ? 'Mengecek...' : 'Cek Status Pembayaran'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const activeBankMeta = VA_BANKS.find(b => b.code === selectedBank) || VA_BANKS[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#031517]/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
            {/* Ambient Signature Background Gradient matching 18Studio Theme */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.22)_0%,rgba(5,31,34,0.85)_60%,rgba(2,12,14,0.95)_100%)]" />

            <div className="relative w-full max-w-md my-auto flex flex-col items-center">
                {/* Soft ambient halo glow behind the card */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

                {/* Professional In-Modal Status Notification */}
                {statusToast && (
                    <div className="w-full mb-3 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
                        <div className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex items-center gap-3 ${
                            statusToast.type === 'waiting'
                                ? 'bg-[#062c30]/95 border-amber-400/40 text-amber-100'
                                : 'bg-[#1f0f15]/95 border-rose-400/40 text-rose-100'
                        }`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                                statusToast.type === 'waiting'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                                {statusToast.type === 'waiting' ? '⏳' : '⚠️'}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-xs font-bold text-white tracking-tight">{statusToast.title}</p>
                                <p className="text-[11px] opacity-85 leading-tight mt-0.5">{statusToast.message}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStatusToast(null)}
                                className="w-6 h-6 rounded-full hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center text-xs shrink-0 transition"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Close Button Top Right */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute -top-3 -right-1 sm:-right-3 z-30 w-9 h-9 rounded-full bg-[#072a2e]/90 hover:bg-[#0d9488]/40 text-teal-200 hover:text-white flex items-center justify-center transition-all border border-teal-400/30 shadow-lg"
                    title="Tutup Jendela"
                >
                    ✕
                </button>

                {!isPaidSuccess ? (
                    <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200">

                        {/* METHOD SWITCHER TABS — ONLY FOR NON-STUDIO (Wedding, Makeup, Dekorasi) */}
                        {canUseVa && (
                            <div className="w-full bg-[#062326]/90 p-1.5 rounded-2xl border border-teal-400/25 flex items-center gap-1.5 mb-3 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethodTab('qris')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        paymentMethodTab === 'qris'
                                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                                            : 'text-teal-200/80 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>📱</span>
                                    <span>Scan QRIS</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethodTab('va')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        paymentMethodTab === 'va'
                                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                                            : 'text-teal-200/80 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>🏦</span>
                                    <span>Virtual Account</span>
                                </button>
                            </div>
                        )}

                        {paymentMethodTab === 'qris' || !canUseVa ? (
                            /* ================= TAB 1: OFFICIAL CLEAN QRIS CARD ================= */
                            <>
                                <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(13,148,136,0.22)] border border-teal-500/10 flex flex-col items-center text-center relative">
                                    {/* Card Top Header */}
                                    <div className="w-full flex items-center justify-between px-1 mb-3">
                                        <span className="px-3.5 py-1.5 bg-[#78350f] text-white font-extrabold text-xs rounded-lg tracking-wider uppercase shadow-sm">
                                            QRIS
                                        </span>
                                        <span className="text-xs font-bold text-gray-400 tracking-tight">
                                            {gateway === 'midtrans' ? 'Midtrans' : 'DOKU'}
                                        </span>
                                    </div>

                                    {/* Clean QR Barcode */}
                                    {effectiveQrImage ? (
                                        <img
                                            src={effectiveQrImage}
                                            alt={`QRIS ${orderId}`}
                                            className="w-full max-w-[240px] sm:max-w-[260px] aspect-square object-contain rounded-xl"
                                        />
                                    ) : (
                                        <div className="w-[240px] h-[240px] flex flex-col items-center justify-center text-gray-400 text-xs">
                                            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-2"></div>
                                            <span>Menyiapkan QRIS...</span>
                                        </div>
                                    )}

                                    {/* Amount in Bold Large Digits */}
                                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-3">
                                        {formatRupiah(amount)}
                                    </h2>

                                    {/* Expiry Pill Badge */}
                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] font-bold text-xs sm:text-sm mt-2.5 shadow-sm">
                                        <span className="text-sm">🕒</span>
                                        <span>Berlaku {formattedTime}</span>
                                    </div>
                                </div>

                                {/* Quick Switch to Virtual Account Banner (Only for Non-Studio) */}
                                {canUseVa && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethodTab('va')}
                                        className="w-full mt-3 py-2.5 px-4 rounded-2xl bg-[#072a2e]/90 hover:bg-[#0b3b40] border border-teal-400/30 text-teal-100 text-xs font-bold flex items-center justify-between transition shadow-sm cursor-pointer"
                                    >
                                        <span className="flex items-center gap-2">
                                            <span>🏦</span>
                                            <span>Ingin transfer via Virtual Account Bank?</span>
                                        </span>
                                        <span className="text-emerald-300 font-extrabold">Pilih Bank →</span>
                                    </button>
                                )}

                                {/* Instruction Text Under Card */}
                                <p className="text-xs sm:text-sm text-teal-100/90 font-medium text-center mt-4 mb-2.5 px-4">
                                    Scan dengan M-Banking atau e-Wallet kesayangan Anda
                                </p>

                                {/* Supported Apps Pills Row */}
                                <div className="flex flex-wrap items-center justify-center gap-2 px-2 max-w-sm">
                                    {['GoPay', 'OVO', 'Dana', 'ShopeePay', 'LinkAja', 'BSI', 'BCA Mobile', 'Livin Mandiri'].map((appName) => (
                                        <span
                                            key={appName}
                                            className="px-3 py-1 rounded-full bg-[#072a2e]/90 border border-teal-400/25 text-[11px] font-semibold text-teal-100 shadow-sm"
                                        >
                                            {appName}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* ================= TAB 2: NATIVE VIRTUAL ACCOUNT BANK TRANSFER ================= */
                            <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(13,148,136,0.22)] border border-teal-500/10 flex flex-col text-left relative space-y-4">
                                {/* Top Header */}
                                <div className="w-full flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-teal-700 text-white font-extrabold text-[11px] rounded-lg tracking-wider uppercase shadow-sm">
                                            VIRTUAL ACCOUNT
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            Verifikasi Otomatis
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 tracking-tight">DOKU</span>
                                </div>

                                {/* Bank Selector Grid */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                        Pilih Bank Tujuan Transfer:
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {VA_BANKS.map((bank) => {
                                            const isSelected = selectedBank === bank.code;
                                            return (
                                                <button
                                                    key={bank.code}
                                                    type="button"
                                                    onClick={() => setSelectedBank(bank.code)}
                                                    className={`relative py-2.5 px-2 rounded-xl border text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/30 shadow-sm'
                                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {bank.badge && (
                                                        <span className="absolute -top-2 right-1.5 px-1.5 py-0.2 bg-emerald-600 text-white text-[8px] font-extrabold rounded-full uppercase">
                                                            {bank.badge}
                                                        </span>
                                                    )}
                                                    <span>{bank.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* VA Number Display Box */}
                                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-teal-300 font-semibold">
                                            {activeBankMeta.fullName}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                                            🕒 Berlaku {formattedTime}
                                        </span>
                                    </div>

                                    {isLoadingVa ? (
                                        <div className="py-5 flex flex-col items-center justify-center text-gray-300 text-xs gap-2">
                                            <div className="w-6 h-6 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
                                            <span>Membuat Nomor Virtual Account {activeBankMeta.name}...</span>
                                        </div>
                                    ) : vaError ? (
                                        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs space-y-2">
                                            <p>{vaError}</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVaCache(prev => {
                                                        const copy = { ...prev };
                                                        delete copy[selectedBank];
                                                        return copy;
                                                    });
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                                            >
                                                Coba Lagi
                                            </button>
                                        </div>
                                    ) : currentVaData?.payment_code ? (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                    Nomor Virtual Account
                                                </p>
                                                <div className="flex items-center justify-between gap-2 bg-slate-800/90 border border-slate-700 px-3.5 py-2.5 rounded-xl">
                                                    <span className="text-base sm:text-lg font-mono font-black tracking-widest text-emerald-300 select-all">
                                                        {currentVaData.payment_code}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyVaCode(currentVaData.payment_code)}
                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition shrink-0 cursor-pointer ${
                                                            copiedVa
                                                                ? 'bg-emerald-500 text-slate-950'
                                                                : 'bg-teal-600 hover:bg-teal-500 text-white'
                                                        }`}
                                                    >
                                                        {copiedVa ? '✓ Tersalin' : 'Salin Nomor'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                        Nominal Transfer (Harus Sesuai)
                                                    </p>
                                                    <p className="text-lg font-black text-white">
                                                        {formatRupiah(amount)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyAmount}
                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold transition cursor-pointer"
                                                >
                                                    {copiedAmount ? '✓ Tersalin' : 'Salin Nominal'}
                                                </button>
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                                {/* Payment Instructions Accordion */}
                                {currentVaData?.payment_instruction_idn && currentVaData.payment_instruction_idn.length > 0 && (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Panduan Cara Pembayaran:
                                        </p>
                                        {currentVaData.payment_instruction_idn.slice(0, 4).map((inst, idx) => {
                                            const isOpenInst = openInstructionIdx === idx;
                                            return (
                                                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenInstructionIdx(isOpenInst ? -1 : idx)}
                                                        className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 flex items-center justify-between hover:bg-slate-100 transition cursor-pointer"
                                                    >
                                                        <span>{inst.channel}</span>
                                                        <span className="text-slate-400 text-[10px]">{isOpenInst ? '▲' : '▼'}</span>
                                                    </button>
                                                    {isOpenInst && Array.isArray(inst.step) && (
                                                        <ol className="px-3 pb-2.5 pt-1 text-[11px] text-slate-600 space-y-1 list-decimal list-inside border-t border-slate-200/70 bg-white">
                                                            {inst.step.map((s, sIdx) => (
                                                                <li key={sIdx} className="leading-relaxed">
                                                                    {String(s).replace(/<\/?[^>]+(>|$)/g, '')}
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Live Status & Actions Bottom Bar */}
                        <div className="w-full mt-4 pt-3 border-t border-teal-500/20 flex items-center justify-between px-2 text-xs text-teal-200/80">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                                <span className="text-[11px] text-emerald-300 font-semibold tracking-wide">Auto-detect aktif</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {canUseVa && paymentUrl && (
                                    <a
                                        href={paymentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-teal-300/80 hover:text-teal-100 underline decoration-teal-400/40 hover:decoration-teal-200 transition"
                                    >
                                        Halaman DOKU ↗
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={handleManualCheck}
                                    disabled={isChecking}
                                    className="px-3.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[11px] font-bold transition active:scale-95 shadow-sm cursor-pointer"
                                >
                                    {isChecking ? "Mengecek..." : "Cek Status"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ================= MODE 2: E-TIKET SUKSES SETELAH PEMBAYARAN DIKONFIRMASI ================= */
                    <div className="w-full bg-[#050b0d] border border-emerald-500/30 rounded-[2rem] p-5 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
                        
                        {/* Success Badge Banner */}
                        <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-400/40 flex items-center justify-between">
                            <div className="text-left">
                                <h4 className="text-sm font-extrabold text-white">{pkgTitle || "18Studio Official Booking"}</h4>
                                <p className="text-[10px] text-emerald-300">Status: Pembayaran DP Berhasil Dikonfirmasi</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-500/30">
                                ⚡
                            </div>
                        </div>

                        {/* Detail Cards Row */}
                        <div className="w-full space-y-2 text-left text-xs text-gray-300">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base">📍</span>
                                    <div>
                                        <p className="text-[10px] text-gray-400">Lokasi / Ruangan</p>
                                        <p className="font-semibold text-white">{roomStudio || "Studio Lapanbelas / Lokasi Acara"}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400">Official</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base">📅</span>
                                    <div>
                                        <p className="text-[10px] text-gray-400">Jadwal Sesi</p>
                                        <p className="font-semibold text-white">{eventDate} {jamSesi ? `| ${jamSesi} WIB` : ''}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base">👤</span>
                                    <div>
                                        <p className="text-[10px] text-gray-400">Nama Pemesan</p>
                                        <p className="font-semibold text-white">{clientName || "Pelanggan 18Studio"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400">DP Terbayar</p>
                                    <p className="font-bold text-emerald-400">{formatRupiah(amount)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
                            <a
                                href={`/invoice.html?id=${orderId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span>📄</span>
                                <span>Lihat Faktur / Invoice PDF</span>
                            </a>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all"
                            >
                                Selesai & Masuk Beranda
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
