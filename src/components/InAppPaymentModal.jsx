import React, { useState, useEffect, useRef } from 'react';

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
    const [showAlternativeGateway, setShowAlternativeGateway] = useState(false);
    const pollIntervalRef = useRef(null);

    const {
        orderId,
        amount,
        paymentUrl,
        snapToken,
        qrUrl,
        qrString,
        gateway,
        pkgTitle,
        eventDate,
        clientName,
        roomStudio,
        jamSesi
    } = paymentData || {};

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

    // 2. Realtime Payment Status Polling (Auto-Detect Webhook Confirmation)
    useEffect(() => {
        if (!isOpen || !orderId || isPaidSuccess) return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/check-payment-status/${orderId}`);
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

        pollIntervalRef.current = setInterval(checkStatus, 3000);
        checkStatus();

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [isOpen, orderId, isPaidSuccess]);

    // Format MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Manual Refresh Button Handler
    const handleManualCheck = async () => {
        if (!orderId || isChecking) return;
        setIsChecking(true);
        try {
            const res = await fetch(`/api/check-payment-status/${orderId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.is_paid) {
                    setIsPaidSuccess(true);
                    setAppointmentData(data.appointment);
                    if (onPaymentSuccess) onPaymentSuccess(data.appointment);
                } else {
                    alert("Pembayaran belum terdeteksi. Silakan selesaikan scan QRIS terlebih dahulu.");
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsChecking(false);
        }
    };

    const handleCopyOrderId = () => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ONLY use qrString to render a clean bare barcode — never show qrUrl (Midtrans full decorated image)
    const effectiveQrImage = qrString
        ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=8&data=${encodeURIComponent(qrString)}`
        : null;

    if (!isOpen) return null;

    // ====== DOKU GATEWAY: Embedded Checkout Iframe (VA / QRIS / Alfamart / Indomaret) ======
    if (gateway === 'doku' && paymentUrl) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
                <div className="relative w-full h-full max-w-lg flex flex-col" style={{maxHeight: '100dvh'}}>

                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                            <span className="text-xs font-bold text-white">Pilih Metode Pembayaran</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-medium">{formatRupiah(amount)}</span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all text-sm border border-white/10"
                                title="Tutup"
                            >✕</button>
                        </div>
                    </div>

                    {/* DOKU Checkout Iframe — full methods: VA, QRIS, Alfamart, Indomaret */}
                    <iframe
                        src={paymentUrl}
                        title="DOKU Checkout"
                        className="flex-1 w-full border-0 bg-white"
                        allow="payment"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                    />

                    {/* Footer Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f172a] border-t border-white/10 shrink-0">
                        <span className="text-[10px] text-gray-500">Powered by DOKU</span>
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
            <div className="relative w-full max-w-md my-auto flex flex-col items-center">
                
                {/* Close Button Top Right */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute -top-3 -right-1 sm:-right-3 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all border border-white/10 shadow-lg"
                    title="Tutup Jendela"
                >
                    ✕
                </button>

                {!isPaidSuccess ? (

                    /* ================= MODE 1: OFFICIAL CLEAN QRIS CARD (MATCHING USER DESIGN) ================= */
                    <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200">
                        
                        {/* The White Card Container — compact to hug QR barcode */}
                        <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center relative">
                            
                            {/* Card Top Header */}
                            <div className="w-full flex items-center justify-between px-1 mb-3">
                                <span className="px-3.5 py-1.5 bg-[#78350f] text-white font-extrabold text-xs rounded-lg tracking-wider uppercase shadow-sm">
                                    QRIS
                                </span>
                                <span className="text-xs font-bold text-gray-400 tracking-tight">
                                    {gateway === 'midtrans' ? 'Midtrans' : 'DOKU'}
                                </span>
                            </div>

                            {/* Clean QR Barcode — no inner box, just the image */}
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

                        {/* Instruction Text Under Card */}
                        <p className="text-xs sm:text-sm text-gray-300 font-medium text-center mt-5 mb-3 px-4">
                            Scan dengan M-Banking atau e-Wallet kesayangan Anda
                        </p>

                        {/* Supported Apps Pills Row */}
                        <div className="flex flex-wrap items-center justify-center gap-2 px-2 max-w-sm">
                            {['GoPay', 'OVO', 'Dana', 'ShopeePay', 'LinkAja', 'BSI', 'BCA Mobile', 'Livin Mandiri'].map((appName) => (
                                <span
                                    key={appName}
                                    className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-gray-200 shadow-sm"
                                >
                                    {appName}
                                </span>
                            ))}
                        </div>

                        {/* Live Status & Actions Bottom Bar */}
                        <div className="w-full mt-5 pt-3 border-t border-white/10 flex items-center justify-between px-2 text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                                <span className="text-[11px] text-emerald-300 font-medium">Auto-detect aktif</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {paymentUrl && (
                                    <a
                                        href={paymentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-gray-400 hover:text-white underline"
                                    >
                                        Metode Lain (VA / Card)
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={handleManualCheck}
                                    disabled={isChecking}
                                    className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition active:scale-95"
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
