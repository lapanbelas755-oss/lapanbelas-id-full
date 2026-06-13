import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './index.css';

// Inisialisasi Supabase Client
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);

const MAIN_CATEGORIES = {
    PHOTO_STUDIO: "Photo Studio",
    WEDDING: "lapanbelas.id",
    MAKEUP: "Makeup",
    DEKORASI: "Dekorasi"
};

const getMainCategory = (pkgCategory) => {
    if (!pkgCategory) return MAIN_CATEGORIES.PHOTO_STUDIO;
    const cat = pkgCategory.trim().toLowerCase();
    if (cat.includes('dekorasi') || cat.includes('dekor')) return MAIN_CATEGORIES.DEKORASI;
    if (cat.includes('makeup') || cat.includes('mua') || cat.includes('makeup artist')) return MAIN_CATEGORIES.MAKEUP;
    if (['wedding', 'pre-wedding', 'engagement', 'tasyakuran'].some(w => cat.includes(w))) {
        return MAIN_CATEGORIES.WEDDING;
    }
    return MAIN_CATEGORIES.PHOTO_STUDIO;
};

const getSubcategories = (mainCat, pkgs) => {
    const subcats = new Set();
    pkgs.forEach(pkg => {
        if (getMainCategory(pkg.category) === mainCat && pkg.category) {
            subcats.add(pkg.category);
        }
    });
    return ["All", ...Array.from(subcats).sort()];
};

const getShiftedDateClient = (dateStr, mainCat) => {
    if (!dateStr) return '';
    if (mainCat === MAIN_CATEGORIES.MAKEUP) {
        const d = new Date(dateStr);
        d.setFullYear(d.getFullYear() + 10);
        return d.toISOString().split('T')[0];
    }
    if (mainCat === MAIN_CATEGORIES.DEKORASI) {
        const d = new Date(dateStr);
        d.setFullYear(d.getFullYear() + 20);
        return d.toISOString().split('T')[0];
    }
    return dateStr;
};

const getPackageDuration = (pkg) => {
    if (!pkg || !pkg.description) return 15;
    const match = pkg.description.match(/\[DURATION\]:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 15;
};

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const generateTimeSlots = (durationMinutes) => {
    const slots = [];
    const startHour = 9;
    const startMin = 0;
    const endHour = 17;
    const endMin = 30;
    const bufferMinutes = 15;

    let current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    while (current.getTime() + durationMinutes * 60 * 1000 <= end.getTime()) {
        const next = new Date(current.getTime() + durationMinutes * 60 * 1000);

        const formatTime = (d) => {
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        };

        slots.push({
            start: formatTime(current),
            end: formatTime(next),
            label: `${formatTime(current)} - ${formatTime(next)}`
        });

        current = new Date(next.getTime() + bufferMinutes * 60 * 1000);
    }
    return slots;
};


const roomSampleImages = {
    "Room A - Studio White": [
        "https://images.unsplash.com/photo-1603172591883-112f7c225a6f?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1595853035070-59a39fe84de3?auto=format&fit=crop&q=80&w=800"
    ],
    "Room B - Luxury": [
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800"
    ],
    "Room C - Colorful": [
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800"
    ],
    "Room D - Classic": [
        "https://images.unsplash.com/photo-1581850518616-bcb8077fa212?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800"
    ],
    "Room E - Outdoor/Garden": [
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800"
    ]
};

// Format Rupiah Helper
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
};

// Helper to parse addon category and labelOnly from label string [Category] Label
const parseAddon = (addon) => {
    if (!addon) return { category: 'Lainnya', labelOnly: '' };
    const rawLabel = addon.label || '';
    const match = rawLabel.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
        let category = match[1].trim();
        if (category.toLowerCase() === 'makeup artist' || category.toLowerCase() === 'makeup artis' || category.toLowerCase() === 'mua') {
            category = 'Makeup Artis';
        } else if (category.toLowerCase() === 'video') {
            category = 'Video';
        } else if (category.toLowerCase() === 'add-on best seller' || category.toLowerCase() === 'best seller') {
            category = 'Add-on Best Seller';
        }
        return {
            ...addon,
            category,
            labelOnly: match[2].trim()
        };
    }
    return {
        ...addon,
        category: 'Lainnya',
        labelOnly: rawLabel.trim()
    };
};

// Fungsi Pemetaan Diskon Spesial Paket Best Seller
const getDiscountedPriceInfo = (pkg) => {
    if (!pkg || !pkg.title) return { original: null, price: 0 };
    const title = pkg.title.toLowerCase();
    if (title.includes("delta")) return { original: 18000000, price: 17000000 };
    if (title.includes("centro")) return { original: 9700000, price: 8700000 };
    if (title.includes("bravo")) return { original: 7900000, price: 7300000 };
    if (title.includes("platinum")) return { original: 6800000, price: 6500000 };
    return { original: null, price: pkg.price };
};

// Komponen SvgIcon Kustom
const SvgIcon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        "home": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
        "package": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
        "layout-template": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
        "clipboard-list": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 14h6" /><path d="M9 18h6" /><path d="M9 10h6" /></svg>,
        "user": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
        "bell": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
        "arrow-up-right": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>,
        "arrow-left": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
        "chevron-right": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>,
        "play": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
        "video": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>,
        "image": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
        "ticket": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>,
        "calendar": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
        "clock": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
        "clipboard-x": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m15 11-6 6" /><path d="m9 11 6 6" /></svg>,
        "check-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
        "alert-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
        "chevron-down": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>,
        "chevron-up": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>,
        "chevron-right": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>,
        "chevron-left": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>,
        "x": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    };
    return icons[name] || null;
};

const parseUrls = (urlStr) => {
    if (!urlStr) return [];
    if (urlStr.trim().startsWith('[') && urlStr.trim().endsWith(']')) {
        try {
            return JSON.parse(urlStr);
        } catch (e) { }
    }
    return urlStr.split(/[\n,]+/).map(u => u.trim()).filter(u => u !== '');
};

const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('youtube.com/shorts/')) videoId = url.split('youtube.com/shorts/')[1].split('?')[0];
    else if (url.includes('youtube.com/watch')) videoId = new URLSearchParams(new URL(url).search).get('v');
    else if (url.includes('youtube.com/embed/')) return url;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [userEmail, setUserEmail] = React.useState("");
    const [userName, setUserName] = React.useState("");
    const [view, setView] = React.useState('home');
    const [selectedPkg, setSelectedPkg] = React.useState(null);
    const [activeCategory, setActiveCategory] = React.useState("All");
    const [mainCategory, setMainCategory] = React.useState(MAIN_CATEGORIES.PHOTO_STUDIO);
    const [activeTab, setActiveTab] = React.useState("beranda");
    const [orders, setOrders] = React.useState([]);
    const [expandedOrders, setExpandedOrders] = React.useState({});
    const [packages, setPackages] = React.useState([]);
    const [portfolio, setPortfolio] = React.useState([]);
    const [dayBookings, setDayBookings] = React.useState([]);
    const [selectedTimeSlot, setSelectedTimeSlot] = React.useState('');
    const [selectedEventDate, setSelectedEventDate] = React.useState('');
    const [selectedResepsiDate, setSelectedResepsiDate] = React.useState('');
    const [selectedPrewedDate, setSelectedPrewedDate] = React.useState('');
    const [bookingStep, setBookingStep] = React.useState(1);
    const [wizardSubcat, setWizardSubcat] = React.useState("All");
    const [selectedRoom, setSelectedRoom] = React.useState('Room B - Luxury');
    const [addonPeople, setAddonPeople] = React.useState('Tanpa Tambahan Orang');
    const [addonTime, setAddonTime] = React.useState('Tanpa Tambahan Waktu');
    const [addonPrint, setAddonPrint] = React.useState('Tanpa Cetak Foto');
    const [addonFrame, setAddonFrame] = React.useState('Tanpa Bingkai Foto');
    const [roomPreview, setRoomPreview] = React.useState(null);
    const [roomPhotosDb, setRoomPhotosDb] = React.useState({}); // { roomName: [url, url, ...] }
    const [dateAvailability, setDateAvailability] = React.useState({});
    const [studioName, setStudioName] = React.useState("18Studio");
    const [studioDesc, setStudioDesc] = React.useState("Capture your beautiful moments.");
    const [adminWhatsapp, setAdminWhatsapp] = React.useState("6281234567890");
    const [loading, setLoading] = React.useState(true);
    const [loadingFadingOut, setLoadingFadingOut] = React.useState(false);
    const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const scrollContainerRef = React.useRef(null);
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
    const [mediaModalOpen, setMediaModalOpen] = React.useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);
    const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);
    const [promoBannerActive, setPromoBannerActive] = React.useState(false);
    const [promoBannerText, setPromoBannerText] = React.useState("");
    const [promoBannerTheme, setPromoBannerTheme] = React.useState("emerald_gold");
    const [promoDismissed, setPromoDismissed] = React.useState(false);
    const [expandedCategoryAccordion, setExpandedCategoryAccordion] = React.useState(null);

    const [readNotifs, setReadNotifs] = React.useState({});

    React.useEffect(() => {
        try {
            const stored = localStorage.getItem('18studio_read_notifs');
            if (stored) setReadNotifs(JSON.parse(stored));
        } catch (e) { }
    }, []);

    const isPromoActive = false;
    const unreadOrdersCount = orders.filter(o => readNotifs[o.id] !== `${o.status}_${o.progressFoto || ''}_${o.progressVideo || ''}`).length;
    const unreadPromoCount = (isPromoActive && !readNotifs['promo_18studio']) ? 1 : 0;
    const totalUnreadNotifs = unreadOrdersCount + unreadPromoCount;

    const handleOpenNotifs = () => {
        setIsNotifOpen(true);
        const newReadMap = { ...readNotifs };
        if (isPromoActive) newReadMap['promo_18studio'] = true;
        orders.forEach(o => {
            newReadMap[o.id] = `${o.status}_${o.progressFoto || ''}_${o.progressVideo || ''}`;
        });
        setReadNotifs(newReadMap);
        localStorage.setItem('18studio_read_notifs', JSON.stringify(newReadMap));
    };

    const [authLoading, setAuthLoading] = React.useState(false);
    const [loginMethod, setLoginMethod] = React.useState("google"); // 'google' or 'booking'
    const [loginBookingId, setLoginBookingId] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');

    const [bookingName, setBookingName] = React.useState("");
    const [bookingPhone, setBookingPhone] = React.useState("");
    const [bookingAddress, setBookingAddress] = React.useState("");
    const [bookingNotes, setBookingNotes] = React.useState("");

    const [addonOptions, setAddonOptions] = React.useState([]);
    const [selectedAddons, setSelectedAddons] = React.useState([]);
    const [addonsDropdownOpen, setAddonsDropdownOpen] = React.useState(false);

    const [voucherCodeInput, setVoucherCodeInput] = React.useState("");
    const [appliedDiscount, setAppliedDiscount] = React.useState(0);

    const [isTacAccepted, setIsTacAccepted] = React.useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    };

    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeTab, view]);

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_success') === 'true') {
            showToast("Pembayaran DP Berhasil! Jadwal pemotretan Anda aman.", "success");
            window.history.replaceState({}, document.title, window.location.pathname);
            setActiveTab('order');
        } else if (urlParams.get('payment_cancelled') === 'true') {
            showToast("Pembayaran dibatalkan. Silakan coba lagi.", "error");
            window.history.replaceState({}, document.title, window.location.pathname);
            setActiveTab('order');
        }
    }, []);

    const handleTabClick = (tabName) => {
        if (activeTab === tabName) {
            if (view !== 'home') {
                setView('home');
            } else if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            setActiveTab(tabName);
            setView('home');
        }
    };

    React.useEffect(() => {
        async function checkSession() {
            setLoading(true);
            try {
                // Cek local session untuk Booking ID
                const localSession = localStorage.getItem('bookingSession');
                if (localSession) {
                    const parsed = JSON.parse(localSession);
                    setIsLoggedIn(true);
                    setUserEmail(parsed.email || '');
                    setUserName(parsed.name || '');
                    setBookingName((parsed.name || '').replace(/[^a-zA-Z\s]/g, ''));
                } else {
                    // Cek session supabase untuk Google/Email
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        setIsLoggedIn(true);
                        setUserEmail(session.user.email);
                        const nameVal = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
                        setUserName(nameVal);
                        setBookingName(nameVal.replace(/[^a-zA-Z\s]/g, ''));
                    }
                }

                // Load public data in parallel for faster loading
                const [
                    { data: pkgs, error: pkgsErr },
                    { data: port, error: portErr },
                    { data: dates, error: datesErr },
                    { data: settingsData, error: settingsError },
                    { data: addonsData, error: addonsError },
                    { data: roomPhotosData }
                ] = await Promise.all([
                    supabase.from('packages').select('*'),
                    supabase.from('portfolio').select('*'),
                    supabase.from('date_availability').select('*'),
                    supabase.from('settings').select('*'),
                    supabase.from('addons').select('*').order('created_at', { ascending: true }),
                    supabase.from('room_photos').select('room_name, photo_url').order('created_at', { ascending: true })
                ]);

                if (pkgs) {
                    setPackages(pkgs);
                }
                if (port) setPortfolio(port);

                // Room photos from DB
                if (roomPhotosData && roomPhotosData.length > 0) {
                    const grouped = {};
                    roomPhotosData.forEach(row => {
                        if (!grouped[row.room_name]) grouped[row.room_name] = [];
                        grouped[row.room_name].push(row.photo_url);
                    });
                    setRoomPhotosDb(grouped);
                }

                if (!addonsError && addonsData && addonsData.length > 0) {
                    setAddonOptions(addonsData);
                } else {
                    setAddonOptions([
                        { id: "drone", label: "Aerial Drone + Operator (Approx 20 Minutes)", price: 1500000 },
                        { id: "video_dok", label: "Video Dokumentasi 60 Minutes", price: 2000000 },
                        { id: "sde", label: "Same Day Edit", price: 1500000 }
                    ]);
                }

                if (dates) {
                    const dateMap = {};
                    dates.forEach(d => {
                        const eventDateKey = d.date || d.event_date;
                        dateMap[eventDateKey] = { slots: Number(d.slots_booked), closed: d.is_manually_closed, max: d.max_slots || 3 };
                    });
                    setDateAvailability(dateMap);
                }

                if (settingsData) {
                    const nameSet = settingsData.find(s => s.key === 'studio_name');
                    const descSet = settingsData.find(s => s.key === 'studio_description');
                    const waSet = settingsData.find(s => s.key === 'admin_whatsapp');
                    const promoActiveSet = settingsData.find(s => s.key === 'promo_banner_active');
                    const promoTextSet = settingsData.find(s => s.key === 'promo_banner_text');
                    const promoThemeSet = settingsData.find(s => s.key === 'promo_banner_theme');

                    if (nameSet) setStudioName(nameSet.value);
                    if (descSet) setStudioDesc(descSet.value);
                    if (waSet) setAdminWhatsapp(waSet.value);
                    if (promoActiveSet) setPromoBannerActive(promoActiveSet.value === 'true');
                    if (promoTextSet) setPromoBannerText(promoTextSet.value);
                    if (promoThemeSet) setPromoBannerTheme(promoThemeSet.value);
                }
            } catch (e) {
                console.error("Gagal load data awal:", e);
            } finally {
                // Smooth fade-out loading screen before revealing content
                setLoadingFadingOut(true);
                setTimeout(() => setLoading(false), 380);
            }
        }
        checkSession();

        // Listen to Supabase Auth Changes for Google/Email Login
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const localSession = localStorage.getItem('bookingSession');
            if (localSession) return; // Ignore if using Booking ID session

            if (session) {
                setIsLoggedIn(true);
                setUserEmail(session.user.email);
                const nameVal = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
                setUserName(nameVal);
                setBookingName(nameVal.replace(/[^a-zA-Z\s]/g, ''));
            } else {
                setIsLoggedIn(false);
                setUserEmail("");
                setUserName("");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    React.useEffect(() => {
        if (!isLoggedIn || !userEmail) return;

        async function fetchUserOrders() {
            let userAppts = null;
            const localSession = localStorage.getItem('bookingSession');

            if (localSession) {
                try {
                    const parsed = JSON.parse(localSession);
                    if (parsed.isLoggedIn && parsed.email === userEmail && parsed.client_password) {
                        const { data } = await supabase.rpc('get_my_orders_by_password', {
                            p_email: userEmail,
                            p_password: parsed.client_password
                        });
                        userAppts = data;
                    }
                } catch (e) { }
            }

            if (!userAppts) {
                const { data } = await supabase
                    .from('appointments')
                    .select('*, packages(*)')
                    .eq('client_email', userEmail)
                    .order('created_at', { ascending: false });
                userAppts = data;
            }

            if (userAppts && userAppts.length > 0) {
                const apptIds = userAppts.map(appt => appt.id);
                const { data: assigns, error: assignErr } = await supabase
                    .from('editor_assignments')
                    .select('*')
                    .in('appointment_id', apptIds);

                if (assignErr) {
                    console.error("Gagal load assignments:", assignErr.message);
                }

                const mappedOrders = userAppts.map(appt => {
                    const ass = assigns?.find(a => a.appointment_id === appt.id);
                    let rawFileCode = ass ? ass.file_code : '';
                    let parsedFileCode = '';
                    let parsedDriveLink = '';
                    let parsedDriveLinkSeleksi = '';
                    let parsedTanggalPilihFoto = '';
                    if (rawFileCode && rawFileCode.includes(' || ')) {
                        const parts = rawFileCode.split(' || ');
                        parsedFileCode = parts[0] || '';
                        parsedDriveLink = parts[1] || '';
                        parsedDriveLinkSeleksi = parts[2] || '';
                        parsedTanggalPilihFoto = parts[3] || '';
                    } else {
                        parsedFileCode = rawFileCode;
                    }

                    return {
                        id: appt.id,
                        client_name: appt.client_name,
                        client_email: appt.client_email || userEmail,
                        client_phone: appt.client_phone || '-',
                        client_address: appt.client_address || '-',
                        notes: appt.additional_notes || '-',
                        pkg: {
                            title: appt.package_name,
                            category: appt.packages?.category || packages.find(p => p.title === appt.package_name)?.category || 'Photography',
                            description: appt.packages?.description || packages.find(p => p.title === appt.package_name)?.description || '',
                            image: appt.packages?.image_url || packages.find(p => p.title === appt.package_name)?.image_url || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop"
                        },
                        date: new Date(appt.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                        eventDate: appt.event_date,
                        resepsiDate: appt.resepsi_date,
                        status: appt.status,
                        total: Number(appt.total_amount),
                        dp: Number(appt.dp_amount),
                        editorName: ass ? ass.editor_name : null,
                        fileCode: parsedFileCode,
                        driveLink: parsedDriveLink,
                        driveLinkSeleksi: parsedDriveLinkSeleksi,
                        tanggalPilihFoto: parsedTanggalPilihFoto,
                        qty: ass ? ass.qty : '',
                        deadline: ass ? ass.deadline : '',
                        deadlineVideo: ass ? ass.deadline_video : '',
                        progressFoto: ass ? ass.status_foto : '',
                        progressVideo: ass ? ass.status_video : '',
                        linkHasilFoto: ass ? ass.link_hasil_foto : '',
                        linkHasilVideo: ass ? ass.link_hasil_video : ''
                    };
                });
                setOrders(mappedOrders);
            } else {
                setOrders([]);
            }
        }
        fetchUserOrders();

        // Listen for real-time updates for customer appointments & progress
        const apptsChannel = supabase
            .channel('client-appointments-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchUserOrders();
            })
            .subscribe();

        const progressChannel = supabase
            .channel('client-progress-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'editor_assignments' }, () => {
                fetchUserOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(apptsChannel);
            supabase.removeChannel(progressChannel);
        };
    }, [isLoggedIn, userEmail, view, activeTab]);

    React.useEffect(() => {
        if (orders.length === 0) return;

        const updateTimeLeft = () => {
            const order = orders[0];
            const datesList = [];
            let prewedDate = null;
            if (order.notes) {
                const match = order.notes.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
                if (match) prewedDate = match[1];
            }
            if (prewedDate) datesList.push({ type: 'Prewed', dateStr: prewedDate, label: 'Prewed' });
            if (order.eventDate) datesList.push({ type: 'Akad', dateStr: order.eventDate, label: 'Akad' });
            if (order.resepsiDate) datesList.push({ type: 'Resepsi', dateStr: order.resepsiDate, label: 'Resepsi' });

            if (datesList.length === 0) return;

            const now = new Date();
            const upcoming = datesList.map(d => {
                const t = new Date(d.dateStr);
                t.setHours(0, 0, 0, 0);
                return { ...d, dateObj: t, diff: t.getTime() - now.getTime() };
            }).filter(d => d.diff > 0);

            let target = null;
            if (upcoming.length > 0) {
                upcoming.sort((a, b) => a.diff - b.diff);
                target = upcoming[0];
            }

            if (target) {
                const difference = target.dateObj.getTime() - now.getTime();
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [orders]);

    const formatDateString = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const calculateEstimation = (pkgTitle, photoSelectionDateStr) => {
        if (!photoSelectionDateStr) return null;
        const dateObj = new Date(photoSelectionDateStr);
        if (isNaN(dateObj.getTime())) return null;

        const lowerPkg = (pkgTitle || '').toLowerCase();
        const is60Days = ['delta', 'centro', 'bravo', 'platinum', 'gold combo', 'royal'].some(keyword => lowerPkg.includes(keyword));
        const daysToAdd = is60Days ? 60 : 30;

        const estDateObj = new Date(dateObj.getTime());
        estDateObj.setDate(estDateObj.getDate() + daysToAdd);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const estDateClear = new Date(estDateObj.getTime());
        estDateClear.setHours(0, 0, 0, 0);

        const diffTime = estDateClear.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formattedEstDate = estDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        return {
            dateStr: formattedEstDate,
            daysRemaining: diffDays > 0 ? diffDays : 0,
            isOverdue: diffDays < 0,
            is60Days
        };
    };

    const handleCardClick = (pkg) => {
        setSelectedPkg(pkg);
        setView('detail');
        setVoucherCodeInput("");
        setAppliedDiscount(0);
        setSelectedAddons([]);
        setAddonsDropdownOpen(false);
        setDayBookings([]);
        setSelectedTimeSlot('');
        setSelectedEventDate('');
        setSelectedResepsiDate('');
        setSelectedPrewedDate('');
        setBookingStep(1);
        setWizardSubcat(pkg.category || "All");
        setSelectedRoom('Room B - Luxury');
        setAddonPeople('Tanpa Tambahan Orang');
        setAddonTime('Tanpa Tambahan Waktu');
        setAddonPrint('Tanpa Cetak Foto');
        setAddonFrame('Tanpa Bingkai Foto');
        setRoomPreview(null);
    };

    const handleNameInputChange = (e) => {
        setBookingName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
    };

    const handlePhoneInputChange = (e) => {
        setBookingPhone(e.target.value.replace(/[^0-9]/g, ''));
    };

    const handleAddonToggle = (addon) => {
        if (selectedAddons.some(a => a.id === addon.id)) {
            setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
        } else {
            setSelectedAddons([...selectedAddons, addon]);
        }
    };

    const handleCategorySelect = (category, selectedId) => {
        let updated = selectedAddons.filter(a => {
            const parsed = parseAddon(a);
            return parsed.category !== category;
        });

        if (selectedId) {
            const addonObj = addonOptions.find(a => String(a.id) === String(selectedId));
            if (addonObj) {
                updated.push(addonObj);
            }
        }
        setSelectedAddons(updated);
    };

    const getSelectedAddonIdForCategory = (category) => {
        const found = selectedAddons.find(a => {
            const parsed = parseAddon(a);
            return parsed.category === category;
        });
        return found ? found.id : "";
    };

    const handleRemoveAddon = (addonId) => {
        setSelectedAddons(selectedAddons.filter(a => a.id !== addonId));
    };

    const applyVoucher = async () => {
        const code = voucherCodeInput.trim().toUpperCase();
        if (!code) return;

        const { data: voucher, error } = await supabase
            .from('vouchers')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !voucher) {
            setAppliedDiscount(0);
            showToast("Voucher tidak valid atau sudah tidak aktif!", "error");
            return;
        }

        if (voucher.used_count >= voucher.quota) {
            showToast("Kuota voucher ini sudah habis!", "error");
            return;
        }

        setAppliedDiscount(Number(voucher.discount_amount));
        showToast(`Voucher berhasil! Potongan ${formatRupiah(voucher.discount_amount)}`, "success");
    };


    const handleGoogleLogin = async () => {
        setAuthLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
        if (error) { showToast("Gagal masuk Google: " + error.message, "error"); setAuthLoading(false); }
    };

    const handleBookingLogin = async (e) => {
        e.preventDefault();
        if (!loginBookingId.trim() || !loginPassword.trim()) {
            showToast('Booking ID dan Sandi wajib diisi!', 'error');
            return;
        }
        setAuthLoading(true);
        try {
            const { data: rpcData, error } = await supabase.rpc('login_booking_id', {
                p_booking_id: loginBookingId.trim().toUpperCase(),
                p_password: loginPassword.trim()
            });
            const data = rpcData && rpcData.length > 0 ? rpcData[0] : null;

            if (error || !data) {
                showToast('Booking ID atau Sandi tidak valid. Silakan periksa kembali.', 'error');
            } else {
                // Save to localStorage for persistence
                localStorage.setItem('bookingSession', JSON.stringify({
                    isLoggedIn: true,
                    email: data.client_email || '',
                    name: data.client_name || 'Klien',
                    bookingId: loginBookingId.trim().toUpperCase(),
                    client_password: loginPassword.trim()
                }));

                setIsLoggedIn(true);
                setUserEmail(data.client_email || '');
                setUserName(data.client_name || 'Klien');
                setBookingName((data.client_name || '').replace(/[^a-zA-Z\s]/g, ''));
                showToast(`Selamat datang, ${data.client_name}! 🎉`, 'success');
                setActiveTab('order');
            }
        } catch (err) {
            showToast('Terjadi kesalahan, coba lagi.', 'error');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        // Clear local booking session
        localStorage.removeItem('bookingSession');
        // Clear Supabase session just in case
        await supabase.auth.signOut();

        setIsLoggedIn(false);
        setUserEmail('');
        setUserName('');
        setOrders([]);
        setLoginBookingId('');
        setLoginPassword('');
        showToast('Berhasil keluar dari akun.', 'success');
    };

    const handleDateChange = async (e) => {
        const selectedDate = e.target.value;
        setSelectedEventDate(selectedDate);
        setSelectedTimeSlot('');
        setDayBookings([]);
        if (!selectedDate) return;

        const mainCat = selectedPkg ? getMainCategory(selectedPkg.category) : MAIN_CATEGORIES.WEDDING;
        const isPhotoStudio = mainCat === MAIN_CATEGORIES.PHOTO_STUDIO;
        const lookupDate = getShiftedDateClient(selectedDate, mainCat);
        const checkDate = dateAvailability[lookupDate];
        const limitSlots = checkDate?.max || 3;

        if (checkDate) {
            if (checkDate.closed) {
                e.target.value = '';
                setSelectedEventDate('');
                showToast(`Mohon maaf, tanggal tersebut ditutup oleh Admin!`, "error");
                return;
            }
        }

        if (isPhotoStudio) {
            try {
                const { data, error } = await supabase
                    .from('appointments')
                    .select('jam_akad, additional_notes, package_name')
                    .eq('event_date', selectedDate);
                if (data) {
                    const bookings = data.map(d => {
                        const jam = d.jam_akad ? d.jam_akad.slice(0, 5) : '';
                        const match = d.additional_notes ? d.additional_notes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/) : null;
                        const room = match ? match[1].trim() : '';

                        let duration = 45; // default
                        if (d.additional_notes) {
                            const durMatch = d.additional_notes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
                            if (durMatch) {
                                duration = parseInt(durMatch[1].trim(), 10);
                            }
                        }
                        if (!d.additional_notes || !d.additional_notes.includes('[DURASI SESI]')) {
                            const pkgObj = packages.find(p => p.title === d.package_name);
                            if (pkgObj) {
                                duration = getPackageDuration(pkgObj);
                            }
                        }
                        if (d.additional_notes) {
                            const addTimeMatch = d.additional_notes.match(/- Tambahan Durasi: \+(\d+) Menit/i);
                            if (addTimeMatch) {
                                duration += parseInt(addTimeMatch[1], 10);
                            }
                        }
                        return { jam, room, duration };
                    }).filter(b => b.jam !== '');
                    setDayBookings(bookings);
                }
            } catch (err) {
                console.error("Error fetching day bookings:", err);
            }
            showToast(`Tanggal tersedia! Silakan pilih jam photoshoot.`, "success");
        } else {
            try {
                const { data, error } = await supabase
                    .from('appointments')
                    .select('package_name')
                    .or(`event_date.eq.${selectedDate},resepsi_date.eq.${selectedDate}`);
                
                if (data) {
                    const bookedCount = data.filter(d => {
                        const pkgObj = packages.find(p => p.title === d.package_name);
                        return pkgObj && getMainCategory(pkgObj.category) === mainCat;
                    }).length;

                    if (bookedCount >= limitSlots) {
                        e.target.value = '';
                        setSelectedEventDate('');
                        showToast(`Maaf tanggal sudah full.`, "error");
                        return;
                    } else {
                        const sisa = limitSlots - bookedCount;
                        showToast(`Tanggal tersedia! Tersisa ${sisa} slot.`, "success");
                    }
                } else {
                    const sisa = checkDate ? (limitSlots - checkDate.slots) : limitSlots;
                    showToast(`Tanggal tersedia! Tersisa ${sisa} slot.`, "success");
                }
            } catch (err) {
                const sisa = checkDate ? (limitSlots - checkDate.slots) : limitSlots;
                showToast(`Tanggal tersedia! Tersisa ${sisa} slot.`, "success");
            }
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        const eventDate = e.target.eventDate.value;
        const resepsiDate = e.target.resepsiDate ? e.target.resepsiDate.value : null;
        const prewedDate = e.target.prewedDate ? e.target.prewedDate.value : null;

        if (!bookingName.trim()) return showToast("Nama pemesan wajib diisi!", "error");
        if (!bookingPhone.trim()) return showToast("Nomor WhatsApp wajib diisi!", "error");
        if (!bookingAddress.trim()) return showToast("Alamat lengkap wajib diisi!", "error");
        if (!isTacAccepted) return showToast("Anda harus menyetujui Syarat & Ketentuan terlebih dahulu!", "error");

        const mainCat = selectedPkg ? getMainCategory(selectedPkg.category) : MAIN_CATEGORIES.WEDDING;
        const isPhotoStudio = mainCat === MAIN_CATEGORIES.PHOTO_STUDIO;

        if (isPhotoStudio && !selectedTimeSlot) {
            return showToast("Silakan pilih jam photoshoot terlebih dahulu!", "error");
        }

        const lookupDate = getShiftedDateClient(eventDate, mainCat);
        const checkDate = dateAvailability[lookupDate];
        const limitSlots = checkDate?.max || 3;

        if (checkDate) {
            if (checkDate.closed) return showToast("Mohon maaf, tanggal tersebut ditutup oleh Admin!", "error");
            if (!isPhotoStudio && checkDate.slots >= limitSlots) return showToast(`Maaf tanggal sudah full.`, "error");
        }

        const getAddonsPrice = () => {
            let price = 0;
            if (addonPeople !== 'Tanpa Tambahan Orang') {
                const match = addonPeople.match(/\+Rp\s*([\d.]+)/);
                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
            }
            if (addonTime !== 'Tanpa Tambahan Waktu') {
                const match = addonTime.match(/\+Rp\s*([\d.]+)/);
                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
            }
            if (addonPrint !== 'Tanpa Cetak Foto') {
                const match = addonPrint.match(/\+Rp\s*([\d.]+)/);
                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
            }
            if (addonFrame !== 'Tanpa Bingkai Foto') {
                const match = addonFrame.match(/\+Rp\s*([\d.]+)/);
                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
            }
            return price;
        };

        const addonsTotal = isPhotoStudio ? getAddonsPrice() : selectedAddons.reduce((sum, item) => sum + item.price, 0);
        const priceInfo = getDiscountedPriceInfo(selectedPkg);
        const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal;
        const dpMin = isPhotoStudio ? 200000 : 1000000;

        let formattedNotes = "";
        if (isPhotoStudio) {
            formattedNotes += `[ROOM STUDIO]: ${selectedRoom}\n`;
            formattedNotes += `[JAM PHOTOSHOOT]: ${selectedTimeSlot}\n`;
            if (addonPeople !== 'Tanpa Tambahan Orang') formattedNotes += `- Tambahan Orang: ${addonPeople}\n`;
            if (addonTime !== 'Tanpa Tambahan Waktu') formattedNotes += `- Tambahan Durasi: ${addonTime}\n`;
            if (addonPrint !== 'Tanpa Cetak Foto') formattedNotes += `- Cetak Foto: ${addonPrint}\n`;
            if (addonFrame !== 'Tanpa Bingkai Foto') formattedNotes += `- Bingkai Foto: ${addonFrame}\n`;
            formattedNotes += `\n`;
        }

        if (prewedDate) {
            formattedNotes += `[TANGGAL PREWED]: ${prewedDate}\n\n`;
        }

        if (!isPhotoStudio && selectedAddons.length > 0) {
            formattedNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + selectedAddons.map(a => `- ${a.label} (${formatRupiah(a.price)})`).join('\n') + `\n\n`;
        }
        if (bookingNotes && bookingNotes.trim() !== "") {
            formattedNotes += `[KETERANGAN TAMBAHAN]:\n${bookingNotes.trim()}`;
        }

        const bookingId = `BK-${Date.now().toString().slice(-6)}`;
        // Generate a simple password for Booking ID login
        const clientPassword = Math.random().toString(36).slice(-6).toUpperCase();

        const newApptData = {
            id: bookingId,
            client_name: bookingName,
            client_email: userEmail,
            client_phone: bookingPhone,
            client_address: bookingAddress || '-',
            additional_notes: formattedNotes,
            package_name: selectedPkg.title,
            event_date: eventDate,
            resepsi_date: resepsiDate,
            status: 'Menunggu DP',
            total_amount: finalPrice,
            dp_amount: dpMin,
            client_password: clientPassword,
            jam_akad: isPhotoStudio ? selectedTimeSlot : null
        };

        const { error: apptErr } = await supabase.from('appointments').insert([newApptData]);
        if (apptErr) return showToast("Gagal melakukan booking: " + apptErr.message, "error");

        if (appliedDiscount > 0) {
            const { data: currentV } = await supabase.from('vouchers').select('used_count').eq('code', voucherCodeInput.toUpperCase()).single();
            if (currentV) await supabase.from('vouchers').update({ used_count: currentV.used_count + 1 }).eq('code', voucherCodeInput.toUpperCase());
        }

        showToast('Pemesanan berhasil disimpan! Mengarahkan ke pembayaran...', "success");

        // Update date_availability to sync client view immediately
        const datesToUpdate = [eventDate, resepsiDate, prewedDate].filter(Boolean);
        for (const rawDate of datesToUpdate) {
            const lDate = getShiftedDateClient(rawDate, mainCat);
            const currentAvail = dateAvailability[lDate] || { slots: 0, max: 3, closed: false };
            await supabase.from('date_availability').upsert([{
                date: lDate,
                slots_booked: currentAvail.slots + 1,
                max_slots: currentAvail.max,
                is_manually_closed: currentAvail.closed
            }]);
        }

        // Send "Menunggu DP" email asynchronously
        fetch('/api/send-invoice-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'menunggu_dp',
                order: newApptData
            })
        }).catch(e => console.error("Error sending email:", e));

        const { data: updatedDates } = await supabase.from('date_availability').select('*');
        if (updatedDates) {
            const dateMap = {};
            updatedDates.forEach(d => { 
                const eventDateKey = d.date || d.event_date;
                dateMap[eventDateKey] = { slots: Number(d.slots_booked), closed: d.is_manually_closed, max: d.max_slots || 3 }; 
            });
            setDateAvailability(dateMap);
        }

        // Redirect immediately to payment
        handleBayarDP(bookingId, dpMin, bookingName, userEmail);
    };

    const handleBayarDP = async (orderId, amount, clientName, clientEmail) => {
        showToast("Menghubungi payment gateway...", "success");

        try {
            const response = await fetch("/api/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_id: orderId,
                    amount: amount,
                    customer_name: clientName,
                    customer_email: clientEmail,
                    callback_url: window.location.origin + '/'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.payment_url) {
                    showToast("Mengarahkan ke halaman pembayaran DOKU...", "success");
                    setTimeout(() => {
                        window.location.href = data.payment_url;
                    }, 1000);
                } else {
                    showToast("Gagal memproses pembayaran DOKU.", "error");
                }
            } else {
                showToast("Gagal menghubungi server pembayaran.", "error");
            }
        } catch (error) {
            console.error("Payment error:", error);
            showToast("Kesalahan jaringan atau server offline.", "error");
        }
    };

    const handleDownloadInvoice = (order) => {
        const orderData = {
            id: order.id,
            client_name: order.client_name,
            client_email: order.client_email || '-',
            client_phone: order.client_phone || '-',
            client_address: order.client_address || '-',
            date: order.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: order.status,
            pkg: {
                title: order.pkg.title,
                category: order.pkg.category || 'Package',
                description: order.pkg.description || ''
            },
            eventDate: order.eventDate,
            resepsiDate: order.resepsiDate,
            prewedDate: (() => {
                if (!order.notes) return '';
                const match = order.notes.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
                return match ? match[1] : '';
            })(),
            total: order.total,
            dp: order.dp,
            notes: order.notes,
            payment_method: 'ONLINE PAYMENT'
        };
        localStorage.setItem('printInvoiceData', JSON.stringify(orderData));
        window.open('/invoice.html?preview=true', '_blank');
    };

    if (loading) {
        return (
            <div className={`w-full bg-black flex flex-col items-center justify-center text-white ${loadingFadingOut ? 'animate-fade-out' : ''}`} style={{ height: 'var(--app-height)' }}>
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-sm tracking-wider">Loading {studioName}...</p>
            </div>
        );
    }

    const bestSellerPackages = packages
        .filter(pkg => getMainCategory(pkg.category) === mainCategory)
        .filter(pkg => {
            if (mainCategory === MAIN_CATEGORIES.WEDDING) {
                const bestSellerTitles = ["delta", "centro", "bravo", "platinum", "royal", "prewed package 2"];
                return bestSellerTitles.some(title => pkg.title.toLowerCase().includes(title));
            }
            return true;
        })
        .slice(0, 4)
        .sort((a, b) => getDiscountedPriceInfo(b).price - getDiscountedPriceInfo(a).price);

    if (!isLoggedIn) {
        return (
            <div className="relative w-full mx-auto overflow-hidden bg-[#010605] max-w-md sm:border sm:border-gray-800 text-white flex flex-col justify-end pb-10 animate-fade-in" style={{ height: 'var(--app-height)' }}>
                {toast.show && (
                    <div className={`absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl w-[90%] animate-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                        }`}>
                        <SvgIcon name={toast.type === 'success' ? "check-circle" : "alert-circle"} className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-semibold text-left">{toast.message}</span>
                    </div>
                )}

                <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 25%, #0c3832 0%, #010605 85%)' }}>
                    <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-[#0e443d]/20 rounded-full blur-[120px] pointer-events-none"></div>
                </div>

                <div className="relative z-10 p-6 flex flex-col w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-6">
                        <h1 className="text-3.5xl font-bold tracking-widest uppercase mb-1 drop-shadow-md">{studioName}</h1>
                        <p className="text-gray-300 text-xs font-light tracking-wide">{studioDesc}</p>
                    </div>

                    <div className="glass-panel p-5 rounded-[2.5rem] w-full flex flex-col gap-4 border border-white/10 shadow-2xl relative">
                        <div className="flex bg-black/40 p-1 rounded-xl">
                            <button onClick={() => setLoginMethod("google")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${loginMethod === "google" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>Self Order Baru</button>
                            <button onClick={() => setLoginMethod("booking")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${loginMethod === "booking" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>Sudah Booking</button>
                        </div>

                        {loginMethod === "booking" ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center mb-4">
                                    <p className="text-sm font-semibold text-white">Akses Portal Klien</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Gunakan Booking ID dan Sandi dari admin studio.</p>
                                </div>
                                <form onSubmit={handleBookingLogin} className="space-y-3">
                                    <div>
                                        <input type="text" required placeholder="Booking ID (Cth: BK-1234)" value={loginBookingId} onChange={e => setLoginBookingId(e.target.value.toUpperCase())} className="input-glass font-mono tracking-widest text-center" />
                                    </div>
                                    <div>
                                        <input type="text" required placeholder="Sandi Login" value={loginPassword} onChange={e => setLoginPassword(e.target.value.toUpperCase())} className="input-glass text-center font-mono tracking-widest uppercase" />
                                    </div>
                                    <button type="submit" disabled={authLoading} className="w-full bg-white text-black font-semibold py-3.5 rounded-full text-xs hover:bg-gray-200 transition duration-300 shadow-lg shadow-white/5 mt-2">
                                        {authLoading ? "Memeriksa..." : "Masuk ke Portal"}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-500 flex flex-col gap-4">
                                <div className="text-center mb-2 mt-2">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                                    </div>
                                    <p className="text-sm font-semibold text-white">Self Order Cepat & Praktis</p>
                                    <p className="text-[10px] text-gray-400 mt-2 px-4 leading-relaxed">
                                        Gunakan akun Google Anda untuk akses langsung, tanpa perlu menghafal kata sandi tambahan.
                                    </p>
                                </div>

                                <button onClick={handleGoogleLogin} type="button" className="w-full bg-white text-black font-bold py-3.5 rounded-full text-xs hover:bg-gray-200 transition duration-300 shadow-lg shadow-white/5 flex items-center justify-center gap-2 mt-2">
                                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.104C18.281 1.055 15.426 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.83 11.57-11.77 0-.79-.085-1.4-.185-1.945H12.24z" /></svg> Lanjutkan dengan Google
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 text-center px-4 mt-5 font-light">Dengan masuk, Anda menyetujui ketentuan pemesanan di studio {studioName}.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full mx-auto overflow-hidden bg-[#010605] max-w-md sm:border sm:border-gray-800 text-white animate-fade-in" style={{ height: 'var(--app-height)' }}>
            {toast.show && (
                <div className={`absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl w-[90%] animate-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                    }`}>
                    <SvgIcon name={toast.type === 'success' ? "check-circle" : "alert-circle"} className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold text-left">{toast.message}</span>
                </div>
            )}

            {isNotifOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-[2.5rem] w-full max-w-sm relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsNotifOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white transition"><SvgIcon name="x" className="w-5 h-5" /></button>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><SvgIcon name="bell" className="w-5 h-5 text-yellow-400" /> Notifikasi & Promo</h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 hide-scrollbar">
                            {isPromoActive && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl flex flex-col gap-1.5 text-left">
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-blue-400 tracking-wide uppercase">Promo Khusus 🔥</span></div>
                                    <p className="text-xs text-gray-200 leading-relaxed">Gunakan kode diskon <strong className="font-mono text-yellow-400">18STUDIO</strong> saat melakukan pemesanan untuk potongan langsung sebesar Rp 200.000!</p>
                                </div>
                            )}
                            {orders.length > 0 ? orders.map((order, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex flex-col gap-1.5 text-left">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-mono text-gray-400">Order ID: #{order.id}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${order.status === 'Lunas' ? 'bg-green-500/20 text-green-400' : order.status === 'Sudah DP' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span>
                                    </div>
                                    <p className="text-xs text-gray-200">Pesanan paket <strong className="text-white font-semibold">{order.pkg.title}</strong> Anda telah tercatat.</p>
                                    <p className="text-[10px] text-gray-400 leading-snug">{order.status === 'Menunggu DP' ? `Silakan selesaikan pembayaran DP sebesar ${formatRupiah(order.dp)} untuk mengunci jadwal pemotretan.` : 'Terima kasih telah melakukan pembayaran, jadwal pemotretan Anda aman.'}</p>
                                </div>
                            )) : <div className="text-center py-8 text-gray-500 text-xs">Belum ada pemesanan aktif.</div>}
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 25%, #0c3832 0%, #010605 85%)' }}>
                <div className="absolute bottom-1/3 right-1/10 w-72 h-72 bg-[#092d28]/15 rounded-full blur-[100px] pointer-events-none"></div>
            </div>

            <div ref={scrollContainerRef} className="relative z-10 w-full h-full overflow-y-auto hide-scrollbar pb-nav scroll-smooth">

                {view === 'home' && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border border-white/20 bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
                                    <span className="text-sm font-bold text-white tracking-wider">{getInitials(userName)}</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-gray-400">Selamat datang 👋</p>
                                    <p className="font-semibold text-sm">{userName}</p>
                                </div>
                            </div>
                            <button onClick={handleOpenNotifs} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform">
                                <SvgIcon name="bell" className="w-5 h-5 text-white" />
                                {totalUnreadNotifs > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-lg border border-black/20 z-10">{totalUnreadNotifs}</span>
                                )}
                            </button>
                        </div>

                        {/* Main Category Bar */}
                        {(activeTab === 'beranda' || activeTab === 'package') && (
                            <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
                                {[
                                    { id: MAIN_CATEGORIES.PHOTO_STUDIO, label: "📸 Photo Studio" },
                                    { id: MAIN_CATEGORIES.WEDDING, label: "💍 lapanbelas.id" },
                                    { id: MAIN_CATEGORIES.MAKEUP, label: "💄 Lady Makeup" },
                                    { id: MAIN_CATEGORIES.DEKORASI, label: "🌸 Lapanbelas Dekorasi" }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setMainCategory(cat.id);
                                            setActiveCategory("All");
                                        }}
                                        className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 ${mainCategory === cat.id
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border border-emerald-500/30'
                                            : 'glass-panel text-gray-400 hover:text-white border border-white/5'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'beranda' && orders.length > 0 && orders[0].eventDate && (() => {
                            const order = orders[0];
                            const dates = [];
                            let prewedDate = null;
                            if (order.notes) {
                                const match = order.notes.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
                                if (match) prewedDate = match[1];
                            }
                            if (prewedDate) dates.push({ type: 'Prewed', dateStr: prewedDate, label: 'Prewed' });

                            const pkgNameLower = (order.package_name || (order.pkg ? order.pkg.title : '')).toLowerCase();
                            const pkgCategoryLower = ((order.packages && order.packages.category) || (order.pkg ? order.pkg.category : '')).toLowerCase();
                            
                            let eventLabel1 = 'Akad';
                            let completedMessage = 'Selamat Berbahagia! Semoga Samawa 🎉';

                            if (pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') || ['wisuda', 'couple', 'group', 'family', 'pas photo', 'graduation'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k))) {
                                eventLabel1 = 'Photo Studio';
                                completedMessage = 'Sesi Foto Selesai! Terima Kasih 🎉';
                            } else if (pkgCategoryLower.includes('makeup') || pkgNameLower.includes('makeup') || pkgNameLower.includes('rias')) {
                                eventLabel1 = 'Makeup';
                                completedMessage = 'Sesi Makeup Selesai! Tampil Cantik Mempesona 💄✨';
                            } else if (pkgCategoryLower.includes('dekor') || pkgNameLower.includes('dekor')) {
                                eventLabel1 = 'Dekorasi';
                                completedMessage = 'Pemasangan Dekorasi Selesai! 🎀✨';
                            } else if (pkgCategoryLower.includes('wedding') || pkgNameLower.includes('wedding') || pkgCategoryLower.includes('engagement') || pkgNameLower.includes('lamaran')) {
                                eventLabel1 = 'Wedding lapanbelas.id';
                                completedMessage = 'Selamat Berbahagia! Semoga Samawa 🎉';
                            } else if (!order.resepsiDate) {
                                eventLabel1 = 'Acara Utama';
                                completedMessage = 'Acara Telah Selesai! Terima Kasih 🎉';
                            }

                            if (order.eventDate) dates.push({ type: eventLabel1, dateStr: order.eventDate, label: eventLabel1 });
                            if (order.resepsiDate) dates.push({ type: 'Resepsi', dateStr: order.resepsiDate, label: 'Resepsi' });

                            const now = new Date();
                            const upcoming = dates.map(d => {
                                const t = new Date(d.dateStr);
                                t.setHours(0, 0, 0, 0);
                                return { ...d, dateObj: t, diff: t.getTime() - now.getTime() };
                            }).filter(d => d.diff > 0);

                            let activeTarget = null;
                            if (upcoming.length > 0) {
                                upcoming.sort((a, b) => a.diff - b.diff);
                                activeTarget = upcoming[0];
                            } else if (dates.length > 0) {
                                const last = dates[dates.length - 1];
                                const t = new Date(last.dateStr);
                                t.setHours(0, 0, 0, 0);
                                activeTarget = { ...last, dateObj: t, isPast: true };
                            }

                            return (
                                <div className="animate-floating relative mb-8 rounded-[1.8rem] shadow-[0_0_20px_rgba(255,255,255,0.03)] group" style={{ padding: '1px' }}>
                                    <div className="absolute inset-0 rounded-[1.8rem] bg-white/10 z-0"></div>

                                    <div className="absolute inset-0 z-0 rounded-[1.8rem] pointer-events-none" style={{ padding: '1px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250%] aspect-square animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_85%,rgba(74,222,128,0.3)_95%,rgba(74,222,128,1)_100%)]"></div>
                                    </div>

                                    <div className="relative z-10 p-5 rounded-[calc(1.8rem-1px)] w-full bg-black/35 backdrop-blur-md" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}>
                                        <div className="relative z-10 flex flex-col gap-4">

                                            {/* Header: Title & Package Badge */}
                                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                                        {activeTarget && !activeTarget.isPast ? `Countdown ${activeTarget.label} ✨` : 'Moment Bahagiaku ✨'}
                                                    </p>
                                                </div>
                                                <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider select-none">
                                                    {orders[0].pkg.title}
                                                </span>
                                            </div>

                                            {/* Content Area */}
                                            <div className="flex flex-col gap-3">

                                                {/* List of Events (Akad & Resepsi) */}
                                                <div className="flex flex-col gap-2">
                                                    {dates.map((d, index) => {
                                                        const isTarget = activeTarget && activeTarget.type === d.type && !activeTarget.isPast;
                                                        const eventTime = new Date(d.dateStr);
                                                        eventTime.setHours(0, 0, 0, 0);
                                                        const isPast = eventTime.getTime() < now.getTime();

                                                        return (
                                                            <div key={index} className="flex items-center justify-between bg-white/[0.02] border border-white/5 px-3.5 py-2.5 rounded-2xl">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${isPast ? 'bg-gray-500' : isTarget ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                                                                    <span className={`text-xs font-semibold ${isPast ? 'text-gray-450 line-through opacity-50' : 'text-white/90'}`}>
                                                                        {d.label}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2.5">
                                                                    <span className={`text-[10px] font-semibold ${isPast ? 'text-gray-500' : 'text-gray-300'}`}>
                                                                        {formatDateString(d.dateStr)}
                                                                    </span>
                                                                    {isPast ? (
                                                                        <span className="text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider select-none">Selesai</span>
                                                                    ) : isTarget ? (
                                                                        <span className="text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider select-none animate-pulse">Aktif</span>
                                                                    ) : (
                                                                        <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider select-none">Akan Datang</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Countdown Clock */}
                                                {activeTarget && !activeTarget.isPast ? (
                                                    <div className="flex flex-col items-center justify-center bg-white/[0.03] border border-white/5 p-3 rounded-2xl mt-1">
                                                        <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-2.5">Waktu Tersisa Menuju {activeTarget.label}</span>
                                                        <div className="flex gap-2 justify-center">
                                                            <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl py-2 w-12 shadow-sm">
                                                                <span className="text-sm font-bold text-white leading-none">{timeLeft.days}</span>
                                                                <span className="text-[6.5px] text-gray-400 uppercase mt-1 tracking-wide font-medium">Hari</span>
                                                            </div>
                                                            <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl py-2 w-12 shadow-sm">
                                                                <span className="text-sm font-bold text-white leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                                                                <span className="text-[6.5px] text-gray-400 uppercase mt-1 tracking-wide font-medium">Jam</span>
                                                            </div>
                                                            <div className="flex flex-col items-center bg-black/40 border border-white/10 rounded-xl py-2 w-12 shadow-sm">
                                                                <span className="text-sm font-bold text-white leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                                                                <span className="text-[6.5px] text-gray-400 uppercase mt-1 tracking-wide font-medium">Menit</span>
                                                            </div>
                                                            <div className="flex flex-col items-center bg-black/50 border border-blue-500/30 rounded-xl py-2 w-12 shadow-md">
                                                                <span className="text-sm font-black text-blue-400 leading-none animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                                                <span className="text-[6.5px] text-blue-300 uppercase mt-1 tracking-wider font-bold">Detik</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center bg-green-500/5 border border-green-500/20 p-4 rounded-2xl text-center mt-1">
                                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Semua Acara Telah Selesai</span>
                                                        <span className="text-xs font-semibold text-white mt-1.5">{completedMessage}</span>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}


                        <div className={`transition-all duration-500 transform ${activeTab === 'beranda' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
                            {promoBannerActive && !promoDismissed && (
                                <div className={`w-full py-2.5 px-4 flex items-center justify-between gap-3 text-xs relative overflow-hidden transition-all duration-300 border border-white/10 rounded-2xl mb-6 ${promoBannerTheme === 'midnight_gold' ? 'bg-[#050505] text-white border-yellow-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] shadow-yellow-500/5' :
                                    promoBannerTheme === 'crimson_passion' ? 'bg-[#1c0205] text-[#ffccd1] border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] shadow-red-500/5' :
                                        promoBannerTheme === 'royal_violet' ? 'bg-[#0c051a] text-[#e3d5ff] border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] shadow-purple-500/5' :
                                            'bg-[#0a2315] text-[#d1fae5] border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] shadow-emerald-500/5' // default emerald_gold
                                    }`}>
                                    <div className="flex-1 flex items-center justify-center gap-2 py-0.5">
                                        <span className="flex-shrink-0 animate-bounce">🔥</span>
                                        <span className={`font-bold text-center tracking-wide text-xs ${promoBannerTheme === 'midnight_gold' ? 'animate-glow-sweep-gold' :
                                            promoBannerTheme === 'crimson_passion' ? 'animate-glow-sweep-crimson' :
                                                promoBannerTheme === 'royal_violet' ? 'animate-glow-sweep-royal' :
                                                    'animate-glow-sweep-emerald'
                                            }`}>
                                            {promoBannerText || "Spesial Bulan Ini: Dapatkan diskon langsung khusus hari ini!"}
                                        </span>
                                    </div>
                                    <button onClick={() => setPromoDismissed(true)} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0">
                                        <span className="text-[9px] font-bold">✕</span>
                                    </button>
                                </div>
                            )}
                            <div className="mb-6 text-left">
                                <h2 className="text-2xl font-bold tracking-wide text-white">Best Seller Package 2026</h2>
                                <p className="text-xs text-gray-400 mt-1">Daftar paket paling populer pilihan para pengantin.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {bestSellerPackages.map((pkg) => {
                                    const priceInfo = getDiscountedPriceInfo(pkg);
                                    return (
                                        <div key={pkg.id} onClick={() => handleCardClick(pkg)} className="glass-panel rounded-3xl p-2.5 cursor-pointer flex flex-col hover:border-white/20 transition-all duration-300">
                                            <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-3">
                                                <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover" />
                                                {priceInfo.original && <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">PROMO</span>}
                                            </div>
                                            <div className="px-1.5 pb-1 flex flex-col flex-1 justify-between text-left">
                                                <div><h3 className="text-sm font-semibold mb-1 leading-tight truncate">{pkg.title}</h3><p className="text-gray-400 text-[10px] mb-2">{pkg.category}</p></div>
                                                <div className="flex items-end justify-between mt-auto">
                                                    <div className="flex flex-col text-left">
                                                        {priceInfo.original && <span className="text-[10px] line-through text-gray-500 leading-none mb-0.5">{formatRupiah(priceInfo.original)}</span>}
                                                        <span className="text-sm font-bold text-white">{formatRupiah(priceInfo.price)}</span>
                                                    </div>
                                                    <button className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shrink-0"><SvgIcon name="arrow-up-right" className="w-4 h-4 text-black" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => handleTabClick('package')} className="w-full mt-6 py-3.5 glass-panel rounded-full text-sm font-medium hover:bg-white/10 hover:border-white/20 transition duration-300">Lihat Semua Paket</button>
                        </div>

                        <div className={`transition-all duration-500 transform ${activeTab === 'package' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
                            <h2 className="text-2xl font-bold mb-4 text-left">Daftar Paket</h2>
                            <div className="flex flex-col gap-4">
                                {(() => {
                                    const subcategories = getSubcategories(mainCategory, packages).filter(cat => cat !== 'All');

                                    // Group packages by category
                                    const groupedPackages = {};
                                    subcategories.forEach(cat => {
                                        groupedPackages[cat] = packages
                                            .filter(pkg => getMainCategory(pkg.category) === mainCategory && pkg.category === cat)
                                            .sort((a, b) => getDiscountedPriceInfo(b).price - getDiscountedPriceInfo(a).price);
                                    });

                                    return subcategories.map((cat, idx) => {
                                        const categoryPackages = groupedPackages[cat] || [];
                                        if (categoryPackages.length === 0) return null;

                                        const isExpanded = expandedCategoryAccordion === cat;

                                        return (
                                            <div key={idx} className="glass-panel rounded-3xl overflow-hidden flex flex-col transition-all duration-300">
                                                {/* Accordion Header */}
                                                <button
                                                    onClick={() => setExpandedCategoryAccordion(isExpanded ? null : cat)}
                                                    className="flex items-center justify-between p-4 w-full text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                        <h3 className="font-bold text-sm tracking-wide uppercase text-white">{cat}</h3>
                                                        <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{categoryPackages.length} Paket</span>
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                        <SvgIcon name="chevron-down" className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                </button>

                                                {/* Accordion Content */}
                                                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                                                    <div className="flex flex-col gap-3 px-4">
                                                        {categoryPackages.map((pkg) => {
                                                            const priceInfo = getDiscountedPriceInfo(pkg);
                                                            return (
                                                                <div key={pkg.id} onClick={() => handleCardClick(pkg)} className="bg-white/5 border border-white/5 rounded-2xl p-2.5 cursor-pointer flex items-center gap-3 hover:bg-white/10 transition-all duration-300">
                                                                    <img src={pkg.image_url} alt={pkg.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                                                                    <div className="flex flex-col flex-1 text-left min-w-0">
                                                                        <h3 className="text-sm font-semibold mb-1 truncate text-white/90">{pkg.title}</h3>
                                                                        <div className="flex items-center gap-1.5">
                                                                            {priceInfo.original && <span className="text-[10px] line-through text-gray-500">{formatRupiah(priceInfo.original)}</span>}
                                                                            <span className="text-xs font-bold text-emerald-400">{formatRupiah(priceInfo.price)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                                        <SvgIcon name="chevron-right" className="w-3 h-3 text-white/50" />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        <div className={`transition-all duration-500 transform ${activeTab === 'sample' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
                            <h2 className="text-2xl font-bold mb-6 text-left">Portfolio & Sample</h2>
                            <div className="flex flex-col gap-5">
                                {portfolio.map((port, idx) => {
                                    const imageUrls = port.type === 'photo' ? parseUrls(port.url) : [];
                                    const coverImage = imageUrls[0] || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=1000&auto=format&fit=crop';
                                    return (
                                        <div key={idx} onClick={() => { setCurrentMediaIndex(idx); setCurrentPhotoIndex(0); setMediaModalOpen(true); }} className="glass-panel p-4 rounded-3xl cursor-pointer hover:bg-white/5 transition duration-300">
                                            <div className="flex items-center gap-2 mb-3"><SvgIcon name={port.type === 'video' ? 'video' : 'image'} className="w-5 h-5 text-gray-300" /><h3 className="font-semibold text-sm text-left">{port.title}</h3></div>
                                            {port.type === 'video' ? (
                                                <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                                                    <img src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover opacity-50 pointer-events-none" />
                                                    <div className="absolute w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-none"><SvgIcon name="play" className="w-5 h-5 text-white ml-1" /></div>
                                                </div>
                                            ) : (
                                                <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black/20">
                                                    <img src={coverImage} className="w-full h-full object-cover rounded-2xl pointer-events-none" />
                                                    {imageUrls.length > 1 && (
                                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-[10px] text-white font-semibold px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg">
                                                            <SvgIcon name="image" className="w-3.5 h-3.5 text-white" />
                                                            {imageUrls.length} Photos
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`transition-all duration-500 transform ${activeTab === 'order' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
                            <h2 className="text-2xl font-bold mb-6 text-left">My Orders</h2>
                            {orders.length === 0 ? (
                                <div className="text-center text-gray-400 mt-20"><SvgIcon name="clipboard-x" className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" /><p>Belum ada pesanan.</p></div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {orders.map(order => {
                                        const sisa = order.total - order.dp;
                                        const isExpanded = !!expandedOrders[order.id];

                                        // 1. DP Step
                                        const dpCompleted = order.status === 'Sudah DP' || order.status === 'Lunas';
                                        const dpActive = order.status === 'Menunggu DP';

                                        // 2. Pelunasan Step
                                        const lunasCompleted = order.status === 'Lunas';
                                        const lunasActive = order.status === 'Sudah DP';

                                        // 3. Link Drive Seleksi
                                        const driveSeleksiCompleted = !!order.driveLinkSeleksi;
                                        const driveSeleksiActive = order.status === 'Lunas' && !order.driveLinkSeleksi;

                                        // 4. Antrian Edit
                                        const antrianCompleted = !!order.tanggalPilihFoto;
                                        const antrianActive = !!order.driveLinkSeleksi && !order.tanggalPilihFoto;

                                        // 5. Progress Foto
                                        const fotoStatus = order.progressFoto || 'Belum Diproses';
                                        const fotoSelesai = fotoStatus === 'Done';
                                        const fotoPreview = fotoStatus === 'Selesai untuk Preview';
                                        const fotoActive = fotoStatus && fotoStatus !== 'Belum Diproses' && fotoStatus !== 'Menunggu Seleksi Foto';

                                        // 6. Progress Video
                                        const videoStatus = order.progressVideo || 'Belum Diproses';
                                        const videoSelesai = videoStatus === 'Done';
                                        const videoPreview = videoStatus === 'Selesai untuk Preview';
                                        const videoActive = videoStatus && videoStatus !== 'Belum Diproses';

                                        // 7. Done
                                        const doneCompleted = fotoSelesai && videoSelesai && fotoStatus !== 'Belum Diproses' && videoStatus !== 'Belum Diproses';

                                        const getGeneralProgressInfo = (order) => {
                                            if (order.status === 'Menunggu DP') return { text: 'Menunggu DP', style: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };

                                            if (order.progressFoto === 'Done' && order.progressVideo === 'Done') return { text: 'Selesai Sepenuhnya 🎉', style: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
                                            if (order.progressFoto === 'Selesai untuk Preview' || order.progressVideo === 'Selesai untuk Preview') return { text: 'Siap Preview 🔥', style: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
                                            if (order.progressFoto === 'Proses Edit' || order.progressVideo === 'Proses Edit') return { text: 'Sedang Di-edit 🎨', style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
                                            if (order.progressFoto === 'Antrian Pengerjaan' || order.progressVideo === 'Antrian Pengerjaan') return { text: 'Antrian Edit ⏳', style: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' };
                                            if (order.progressFoto === 'Menunggu Seleksi Foto') return { text: 'Pilih Foto Mentah 📁', style: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' };

                                            if (order.status === 'Lunas') return { text: 'Lunas', style: 'bg-green-500/20 text-green-400 border border-green-500/30' };
                                            if (order.status === 'Sudah DP') return { text: 'DP Diterima', style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };

                                            return { text: 'Diproses', style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
                                        };
                                        const progressInfo = getGeneralProgressInfo(order);

                                        const toggleOrderExpand = (id) => {
                                            setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
                                        };

                                        return (
                                            <div key={order.id} className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                                    <span className="text-xs text-gray-400 font-mono">Order ID: #{order.id}</span>
                                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${progressInfo.style}`}>{progressInfo.text}</span>
                                                </div>
                                                <div className="flex gap-3 items-center">
                                                    <img src={order.pkg.image} className="w-16 h-16 rounded-2xl object-cover" />
                                                    <div className="text-left"><h3 className="font-semibold text-sm mb-1">{order.pkg.title}</h3><p className="text-[10px] text-gray-400">Acara: {formatDateString(order.eventDate)}</p></div>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                    <div className="flex flex-col text-xs text-left"><span className="text-gray-400">Total: {formatRupiah(order.total)}</span><span className="text-green-400">DP: {formatRupiah(order.dp)}</span></div>
                                                    <div className="flex items-center gap-2">
                                                        {order.status === 'Menunggu DP' ? (
                                                            <button
                                                                onClick={() => handleBayarDP(order.id, order.dp, order.client_name, userEmail)}
                                                                className="text-[11px] bg-white text-black px-4 py-1.5 rounded-full font-bold hover:bg-gray-200 transition"
                                                            >
                                                                Bayar DP via DOKU
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDownloadInvoice(order)}
                                                                className="text-[11px] bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-1.5 rounded-full font-bold hover:bg-blue-500/20 transition flex items-center gap-1"
                                                            >
                                                                <SvgIcon name="clipboard-list" className="w-3 h-3" /> Lihat Invoice
                                                            </button>
                                                        )}
                                                        {order.status !== 'Menunggu DP' && (
                                                            <button
                                                                onClick={() => toggleOrderExpand(order.id)}
                                                                className="text-[11px] bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-full font-semibold hover:bg-white/10 transition flex items-center gap-1"
                                                            >
                                                                Lacak Progres
                                                                <SvgIcon name={isExpanded ? "chevron-up" : "chevron-down"} className="w-3 h-3 ml-0.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="border-t border-white/10 mt-3 pt-4 text-left animate-in slide-in-from-top-2 duration-300">
                                                        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-1">
                                                            <SvgIcon name="clipboard-list" className="w-3.5 h-3.5 text-blue-400" /> Detail Pelacakan Progres
                                                        </h4>

                                                        <div className="relative pl-7 flex flex-col gap-5">
                                                            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-white/10"></div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${dpCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : dpActive ? 'pulse-active bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {dpCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">1</span>}
                                                                </div>
                                                                <div>
                                                                    <h5 className={`text-xs font-bold ${dpCompleted ? 'text-white' : dpActive ? 'text-blue-400' : 'text-gray-500'}`}>DP (Down Payment)</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{dpCompleted ? "DP Terbayar - Jadwal Pemotretan Aman" : "Menunggu Pembayaran DP via DOKU"}</p>
                                                                </div>
                                                            </div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${lunasCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : lunasActive ? 'pulse-active bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {lunasCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">2</span>}
                                                                </div>
                                                                <div>
                                                                    <h5 className={`text-xs font-bold ${lunasCompleted ? 'text-white' : lunasActive ? 'text-blue-400' : 'text-gray-500'}`}>Pembayaran Lunas</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{lunasCompleted ? "Pelunasan Terverifikasi" : lunasActive ? "Menunggu Pelunasan" : "Menunggu pembayaran DP terlebih dahulu"}</p>
                                                                </div>
                                                            </div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${driveSeleksiCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : driveSeleksiActive ? 'pulse-active bg-purple-600 border-purple-500 text-white shadow-[0_0_8px_rgba(139,92,246,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {driveSeleksiCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">3</span>}
                                                                </div>
                                                                <div className="flex flex-col items-start">
                                                                    <h5 className={`text-xs font-bold ${driveSeleksiCompleted ? 'text-white' : driveSeleksiActive ? 'text-purple-400 font-extrabold' : 'text-gray-500'}`}>Pengiriman Link Drive (Foto Mentah)</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{driveSeleksiCompleted ? "Seluruh foto mentah berhasil diunggah ke Google Drive." : driveSeleksiActive ? "Tim sedang menyiapkan & mengunggah foto mentah Anda ke Google Drive." : "Menunggu sesi pemotretan & pelunasan selesai"}</p>
                                                                    {driveSeleksiCompleted && order.driveLinkSeleksi && (
                                                                        <a href={order.driveLinkSeleksi} target="_blank" className="mt-2.5 inline-flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition duration-300 shadow-sm shadow-purple-500/10">📁 Buka Google Drive Pilih Foto</a>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${antrianCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : antrianActive ? 'pulse-active bg-amber-600 border-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {antrianCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">4</span>}
                                                                </div>
                                                                <div className="flex flex-col items-start w-full">
                                                                    <h5 className={`text-xs font-bold ${antrianCompleted ? 'text-white' : antrianActive ? 'text-amber-400 font-extrabold' : 'text-gray-500'}`}>Antrian Edit</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{antrianCompleted ? "Daftar file foto pilihan berhasil dikonfirmasi client." : antrianActive ? "Silakan pilih foto terbaik Anda di folder Drive & infokan ke admin untuk memulai antrian." : "Menunggu proses pemilihan foto oleh client"}</p>
                                                                    {(() => {
                                                                        const est = calculateEstimation(order.pkg.title, order.tanggalPilihFoto);
                                                                        if (est) {
                                                                            return (
                                                                                <div className="mt-2.5 glass-panel p-2.5 rounded-2xl border border-white/10 flex flex-col gap-1 w-full max-w-xs text-left bg-white/5">
                                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                                        <span className="text-gray-400 font-medium">Tanggal Pilih Foto:</span>
                                                                                        <span className="text-white font-mono">{formatDateString(order.tanggalPilihFoto)}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-1 mt-1">
                                                                                        <span className="text-gray-400 font-medium">Estimasi Selesai:</span>
                                                                                        <span className="text-white font-mono font-bold">{est.dateStr}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-1 mt-1">
                                                                                        <span className="text-gray-400 font-medium">Batas Waktu Paket:</span>
                                                                                        <span className="text-blue-400 font-semibold">{est.is60Days ? "Maks 60 Hari (Prioritas)" : "Maks 30 Hari"}</span>
                                                                                    </div>
                                                                                    <div className="mt-1.5 flex justify-end">
                                                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm ${est.isOverdue
                                                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10'
                                                                                            }`}>
                                                                                            {est.isOverdue ? "Overdue" : `${est.daysRemaining} hari tersisa`}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${fotoSelesai ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : fotoActive ? 'pulse-active bg-blue-600 border-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {fotoSelesai ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">5</span>}
                                                                </div>
                                                                <div className="flex flex-col items-start w-full">
                                                                    <h5 className={`text-xs font-bold ${fotoSelesai ? 'text-white' : fotoActive ? 'text-blue-400 font-extrabold' : 'text-gray-500'}`}>Progres Foto</h5>
                                                                    <p className="text-[10px] mt-0.5 font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300">{fotoStatus}</p>
                                                                    {order.deadline && (
                                                                        <span className="text-[10px] text-amber-400 mt-1.5 block font-medium">📆 Estimasi Selesai Foto: {formatDateString(order.deadline)}</span>
                                                                    )}
                                                                    {fotoPreview && order.linkHasilFoto && (
                                                                        <a href={order.linkHasilFoto} target="_blank" className="mt-2.5 inline-flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition duration-300 shadow-sm shadow-blue-500/10">📁 Download / Preview Foto</a>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${videoSelesai ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : videoActive ? 'pulse-active bg-purple-600 border-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {videoSelesai ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">6</span>}
                                                                </div>
                                                                <div className="flex flex-col items-start w-full">
                                                                    <h5 className={`text-xs font-bold ${videoSelesai ? 'text-white' : videoActive ? 'text-purple-400 font-extrabold' : 'text-gray-500'}`}>Progres Video</h5>
                                                                    <p className="text-[10px] mt-0.5 font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300">{videoStatus}</p>
                                                                    {order.deadlineVideo && (
                                                                        <span className="text-[10px] text-amber-400 mt-1.5 block font-medium">📆 Estimasi Selesai Video: {formatDateString(order.deadlineVideo)}</span>
                                                                    )}
                                                                    {videoPreview && order.linkHasilVideo && (
                                                                        <a href={order.linkHasilVideo} target="_blank" className="mt-2.5 inline-flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition duration-300 shadow-sm shadow-purple-500/10">🎬 Download / Preview Video</a>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {(fotoPreview || videoPreview) && (
                                                                <div className="ml-5">
                                                                    <a href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent("halo kak saya mau konfirmasi untuk hasil editan (foto/video) sudah sesuai , lanjutkan ke finishing")}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition duration-300 shadow-sm shadow-emerald-500/10 w-full sm:w-auto">
                                                                        💬 Konfirmasi Hasil via WhatsApp
                                                                    </a>
                                                                </div>
                                                            )}

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${doneCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {doneCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">7</span>}
                                                                </div>
                                                                <div>
                                                                    <h5 className={`text-xs font-bold ${doneCompleted ? 'text-white' : 'text-gray-500'}`}>Selesai</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{doneCompleted ? "Seluruh proses selesai sempurna! Terima kasih!" : "Menunggu konfirmasi persetujuan dari client"}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className={`transition-all duration-500 transform ${activeTab === 'profile' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
                            <h2 className="text-2xl font-bold mb-6 text-left">My Profile</h2>
                            <div className="glass-panel p-6 rounded-3xl text-center">
                                <div className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-white/20 bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><span className="text-2xl font-bold text-white tracking-widest">{getInitials(userName)}</span></div>
                                <h3 className="font-bold text-lg text-white">{userName}</h3>
                                <p className="text-sm text-gray-400 mb-6">{userEmail}</p>
                                <button onClick={handleLogout} className="w-full bg-red-500/20 text-red-400 py-3 rounded-full text-sm font-medium border border-red-500/30 hover:bg-red-500/30 transition duration-300">Logout dari App</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAIL VIEW */}
                {view === 'detail' && selectedPkg && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
                        <div className="relative w-full h-[45vh] rounded-b-[3rem] overflow-hidden shrink-0">
                            <img src={selectedPkg.image_url} alt={selectedPkg.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
                            <div className="absolute top-6 left-0 w-full px-6 flex justify-between items-center z-20">
                                <button onClick={() => setView('home')} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center"><SvgIcon name="arrow-left" className="w-5 h-5 text-white" /></button>
                            </div>
                        </div>
                        <div className="px-6 py-6 flex-1 pb-32 text-left">
                            <h2 className="text-2xl font-bold mb-2">{selectedPkg.title}</h2>
                            <p className="text-blue-400 font-bold text-lg mb-4">{formatRupiah(getDiscountedPriceInfo(selectedPkg).price)}</p>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6 whitespace-pre-line">{selectedPkg.description}</p>
                        </div>
                        <div className="fixed bottom-0 left-0 right-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-50 max-w-md mx-auto">
                            <button onClick={() => setView('booking')} className="w-full bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition">Booking Sekarang</button>
                        </div>
                    </div>
                )}

                {/* BOOKING FORM VIEW */}
                {view === 'booking' && selectedPkg && (() => {
                    const pkgTitleLower = selectedPkg.title.toLowerCase();
                    const isSingleDate = pkgTitleLower.includes("royal") || pkgTitleLower.includes("bronze") || pkgTitleLower.includes("akad postwed") || pkgTitleLower.includes("akad intimate") || pkgTitleLower.includes("intimate") || pkgTitleLower.includes("tasyakuran");
                    const isThreeDates = pkgTitleLower.includes("delta") || pkgTitleLower.includes("centro");
                    const pkgCategoryLower = selectedPkg.category ? selectedPkg.category.toLowerCase() : "";
                    const isSpecialAkadResepsi = (getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.MAKEUP || getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.DEKORASI) &&
                        ((pkgTitleLower.includes("akad") && pkgTitleLower.includes("resepsi")) ||
                            (pkgCategoryLower.includes("akad") && pkgCategoryLower.includes("resepsi")));
                    const isResepsiFlow = (!isSingleDate && !isThreeDates && getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.WEDDING) || (isSpecialAkadResepsi && !isSingleDate);
                    const isPhotoStudio = getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.PHOTO_STUDIO;

                    const priceInfo = getDiscountedPriceInfo(selectedPkg);
                    const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
                    const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal;
                    const dpAmount = getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.DEKORASI ? 2000000 : 1000000;
                    const sisaAmount = finalPrice - dpAmount;

                    if (isPhotoStudio) {
                        return (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col p-6 pt-10 text-left">
                                <div className="flex items-center gap-4 mb-8">
                                    <button type="button" onClick={() => {
                                        if (bookingStep > 1) {
                                            setBookingStep(bookingStep - 1);
                                        } else {
                                            setView('detail');
                                        }
                                    }} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center shrink-0"><SvgIcon name="arrow-left" className="w-5 h-5 text-white" /></button>
                                    <div><h2 className="text-xl font-bold">Photo Studio Booking</h2><p className="text-xs text-gray-400">{selectedPkg.title}</p></div>
                                </div>

                                {/* Step indicator */}
                                <div className="flex items-center justify-between mb-8 px-1">
                                    {[
                                        { step: 1, label: "Paket" },
                                        { step: 2, label: "Jadwal" },
                                        { step: 3, label: "Data" },
                                        { step: 4, label: "Bayar" }
                                    ].map((s, idx) => (
                                        <React.Fragment key={s.step}>
                                            <div className="flex flex-col items-center gap-1.5 relative">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${bookingStep === s.step
                                                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-110'
                                                    : bookingStep > s.step
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                        : 'bg-white/5 text-gray-500 border border-white/10'
                                                    }`}>
                                                    {bookingStep > s.step ? "✓" : s.step}
                                                </div>
                                                <span className={`text-[10px] font-semibold tracking-wide ${bookingStep === s.step ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                                            </div>
                                            {idx < 3 && (
                                                <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-500 ${bookingStep > s.step ? 'bg-emerald-500' : 'bg-white/10'
                                                    }`} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>

                                <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4 pb-10">
                                    <input type="hidden" name="eventDate" value={selectedEventDate} />

                                    {/* STEP 1: PAKET */}
                                    {bookingStep === 1 && (() => {
                                        const allSubcats = getSubcategories(MAIN_CATEGORIES.PHOTO_STUDIO, packages);
                                        // "Semua Studio" di paling kanan
                                        const subcatChips = [
                                            ...allSubcats.filter(s => s !== 'All'),
                                            'All'
                                        ];
                                        const activeSubcat = wizardSubcat === 'All' ? 'All' : wizardSubcat;
                                        const filteredPkgs = packages.filter(p => {
                                            const isPS = getMainCategory(p.category) === MAIN_CATEGORIES.PHOTO_STUDIO;
                                            if (!isPS) return false;
                                            if (activeSubcat === "All") return true;
                                            return p.category === activeSubcat;
                                        });

                                        return (
                                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                {/* Subcategory Filter — "Semua Studio" di paling kanan */}
                                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
                                                    {subcatChips.map(sub => (
                                                        <button
                                                            key={sub}
                                                            type="button"
                                                            onClick={() => setWizardSubcat(sub)}
                                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${activeSubcat === sub
                                                                ? 'bg-emerald-500 text-white shadow-md'
                                                                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {sub === 'All' ? 'Semua Studio' : sub}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Packages List */}
                                                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 hide-scrollbar">
                                                    {filteredPkgs.map(p => {
                                                        const isSelected = selectedPkg.id === p.id;
                                                        const priceInfo = getDiscountedPriceInfo(p);
                                                        const dur = getPackageDuration(p);
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setSelectedPkg(p);
                                                                    setWizardSubcat(p.category);
                                                                }}
                                                                className={`glass-panel p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex gap-4 items-center ${isSelected
                                                                    ? 'border-emerald-500/80 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[0.99]'
                                                                    : 'border-white/10 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                <img src={p.image_url} alt={p.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
                                                                    <p className="text-xs text-emerald-400 font-semibold mt-0.5">{formatRupiah(priceInfo.price)}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 font-medium">
                                                                        <SvgIcon name="clock" className="w-3.5 h-3.5 text-gray-500" />
                                                                        Durasi: {dur} Menit
                                                                    </p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20 text-transparent'
                                                                    }`}>
                                                                    <span className="text-[10px] font-bold">✓</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setBookingStep(2)}
                                                    className="w-full bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition mt-4 shadow-lg shadow-white/5"
                                                >
                                                    Lanjut ke Jadwal
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {/* STEP 2: JADWAL & ROOM */}
                                    {bookingStep === 2 && (() => {
                                        const duration = getPackageDuration(selectedPkg);
                                        const slots = generateTimeSlots(duration);
                                        const rooms = [
                                            { name: "Room A - Studio White", desc: "Minimalist white backdrop", color: "from-gray-700 to-gray-900" },
                                            { name: "Room B - Luxury", desc: "Standard luxury theme wedding room", color: "from-amber-800 to-amber-950" },
                                            { name: "Room C - Colorful", desc: "Dynamic vibrant colorful background", color: "from-pink-800 to-indigo-950" },
                                            { name: "Room D - Classic", desc: "Retro & classic vintage background", color: "from-yellow-900 to-orange-950" },
                                            { name: "Room E - Outdoor/Garden", desc: "Aesthetic green plant background", color: "from-green-800 to-emerald-950" }
                                        ];

                                        return (
                                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                {/* Pilihan Tanggal */}
                                                <div className="glass-panel p-4 rounded-3xl">
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-2 uppercase tracking-wide">Pilih Tanggal Photoshoot *</label>
                                                    <input
                                                        type="date"
                                                        value={selectedEventDate}
                                                        onChange={handleDateChange}
                                                        className="input-glass mt-1"
                                                        required
                                                    />
                                                </div>

                                                {/* Pilihan Room Studio */}
                                                <div className="glass-panel p-4 rounded-3xl">
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-3 uppercase tracking-wide">Pilih Room Studio *</label>
                                                    <div className="flex flex-col gap-2">
                                                        {rooms.map(room => {
                                                            const isSelected = selectedRoom === room.name;
                                                            return (
                                                                <div
                                                                    key={room.name}
                                                                    onClick={() => setSelectedRoom(room.name)}
                                                                    className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex justify-between items-center bg-gradient-to-r ${room.color} ${isSelected
                                                                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                                                        : 'border-white/10 opacity-75 hover:opacity-100'
                                                                        }`}
                                                                >
                                                                    <div className="flex flex-col gap-2 items-start">
                                                                        <div>
                                                                            <h5 className="text-xs font-bold text-white">{room.name}</h5>
                                                                            <p className="text-[9px] text-gray-300/80 mt-0.5">{room.desc}</p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setRoomPreview(room);
                                                                            }}
                                                                            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition flex items-center gap-1 border border-white/5 shadow-sm"
                                                                        >
                                                                            👁️ Preview
                                                                        </button>
                                                                    </div>
                                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20 text-transparent'
                                                                        }`}>
                                                                        <span className="text-[8px] font-bold">✓</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Pilihan Jam */}
                                                {selectedEventDate && (
                                                    <div className="glass-panel p-4 rounded-3xl">
                                                        <label className="text-[11px] text-gray-400 ml-1 block mb-3 font-semibold uppercase tracking-wide">Pilih Jam Photoshoot * (Durasi Sesi: {duration} Menit)</label>
                                                        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
                                                            {slots.map((slot) => {
                                                                const slotStart = timeToMinutes(slot.start);
                                                                const slotEnd = timeToMinutes(slot.end);

                                                                const isRoomBooked = dayBookings.some(b => {
                                                                    if (b.room !== selectedRoom) return false;
                                                                    const bookingStart = timeToMinutes(b.jam);
                                                                    const bookingEnd = bookingStart + (b.duration || 45);
                                                                    return slotStart < bookingEnd && slotEnd > bookingStart;
                                                                });

                                                                const getActivePhotographers = () => {
                                                                    let status = { 'tetap-1': true, 'tetap-2': true, 'freelance-1': true, 'freelance-2': true, 'freelance-3': true };
                                                                    let dates = {};
                                                                    try {
                                                                        const storedStatus = localStorage.getItem('photographerStatus');
                                                                        if (storedStatus) status = JSON.parse(storedStatus);
                                                                        const storedDates = localStorage.getItem('freelanceDates');
                                                                        if (storedDates) dates = JSON.parse(storedDates);
                                                                    } catch (e) { }

                                                                    let count = 0;
                                                                    if (status['tetap-1']) count++;
                                                                    if (status['tetap-2']) count++;

                                                                    const freelancers = ['freelance-1', 'freelance-2', 'freelance-3'];
                                                                    freelancers.forEach(fId => {
                                                                        if (status[fId]) {
                                                                            const activeDates = dates[fId] || [];
                                                                            if (activeDates.includes(selectedEventDate)) {
                                                                                count++;
                                                                            }
                                                                        }
                                                                    });
                                                                    return count;
                                                                };

                                                                const activePhotographerCount = getActivePhotographers();
                                                                const overlappingBookings = dayBookings.filter(b => {
                                                                    const bookingStart = timeToMinutes(b.jam);
                                                                    const bookingEnd = bookingStart + (b.duration || 45);
                                                                    return slotStart < bookingEnd && slotEnd > bookingStart;
                                                                });
                                                                const isCapacityReached = overlappingBookings.length >= activePhotographerCount;
                                                                const isDisabled = isRoomBooked || isCapacityReached;
                                                                const isSelected = selectedTimeSlot === slot.start;

                                                                let statusText = '';
                                                                if (isRoomBooked) {
                                                                    statusText = 'Room Booked';
                                                                } else if (isCapacityReached) {
                                                                    statusText = 'Full (Slot Penuh)';
                                                                }

                                                                return (
                                                                    <button
                                                                        key={slot.start}
                                                                        type="button"
                                                                        disabled={isDisabled}
                                                                        onClick={() => setSelectedTimeSlot(slot.start)}
                                                                        className={`py-3 px-2 text-center rounded-xl text-xs font-semibold transition border flex flex-col items-center justify-center ${isDisabled
                                                                            ? 'bg-red-500/10 border-red-500/20 text-red-500/40 cursor-not-allowed opacity-60'
                                                                            : isSelected
                                                                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-[0.98]'
                                                                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                                                            }`}
                                                                    >
                                                                        <span>{slot.label}</span>
                                                                        {isDisabled && <span className="text-[8px] font-bold uppercase opacity-85 mt-0.5 tracking-wider">{statusText}</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-3 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setBookingStep(1)}
                                                        className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                                    >
                                                        Kembali
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!selectedEventDate || !selectedTimeSlot || !selectedRoom}
                                                        onClick={() => setBookingStep(3)}
                                                        className="flex-1 bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Lanjut
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* STEP 3: DATA PELANGGAN */}
                                    {bookingStep === 3 && (
                                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="glass-panel p-5 rounded-3xl flex flex-col gap-4">
                                                <div>
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-1.5 uppercase">Nama Pemesan *</label>
                                                    <input
                                                        type="text"
                                                        value={bookingName}
                                                        onChange={handleNameInputChange}
                                                        placeholder="Hanya dapat diisi huruf"
                                                        className="input-glass"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-1.5 uppercase">No WhatsApp *</label>
                                                    <input
                                                        type="tel"
                                                        value={bookingPhone}
                                                        onChange={handlePhoneInputChange}
                                                        placeholder="Hanya dapat diisi angka"
                                                        className="input-glass"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-1.5 uppercase">Alamat Email *</label>
                                                    <input
                                                        type="email"
                                                        value={userEmail}
                                                        className="input-glass opacity-60 cursor-not-allowed"
                                                        disabled
                                                        readOnly
                                                    />
                                                    <p className="text-[9px] text-gray-400/80 mt-1 ml-1 leading-tight">Otomatis terisi dari Google Akun Anda yang terverifikasi.</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-1.5 uppercase">Alamat Lengkap *</label>
                                                    <textarea
                                                        value={bookingAddress}
                                                        onChange={(e) => setBookingAddress(e.target.value)}
                                                        placeholder="Alamat Lengkap"
                                                        className="input-glass min-h-[85px]"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-400 ml-1 block font-semibold mb-1.5 uppercase">Keterangan Tambahan (Opsional)</label>
                                                    <textarea
                                                        value={bookingNotes}
                                                        onChange={(e) => setBookingNotes(e.target.value)}
                                                        placeholder="Catatan khusus"
                                                        className="input-glass min-h-[60px]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingStep(2)}
                                                    className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                                >
                                                    Kembali
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim()}
                                                    onClick={() => setBookingStep(4)}
                                                    className="flex-1 bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Lanjut
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4: BAYAR (RINGKASAN & ADD-ONS) */}
                                    {bookingStep === 4 && (() => {
                                        const priceInfo = getDiscountedPriceInfo(selectedPkg);

                                        // Hitung harga add-ons secara dinamis
                                        const getAddonsPrice = () => {
                                            let price = 0;
                                            if (addonPeople !== 'Tanpa Tambahan Orang') {
                                                const match = addonPeople.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            if (addonTime !== 'Tanpa Tambahan Waktu') {
                                                const match = addonTime.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            if (addonPrint !== 'Tanpa Cetak Foto') {
                                                const match = addonPrint.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            if (addonFrame !== 'Tanpa Bingkai Foto') {
                                                const match = addonFrame.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            return price;
                                        };

                                        const addonsTotal = getAddonsPrice();
                                        const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal;
                                        const dpAmount = 200000;
                                        const sisaAmount = finalPrice - dpAmount;

                                        return (
                                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                {/* Layanan Tambahan (Add-ons) Dropdowns */}
                                                <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                                                        <SvgIcon name="package" className="w-4 h-4 text-white" />
                                                        Layanan Tambahan (Add-on)
                                                    </h3>

                                                    {/* Dropdown 1: Tambahan Orang */}
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-gray-400 ml-1.5">Tambahan Orang</label>
                                                        <select
                                                            value={addonPeople}
                                                            onChange={(e) => setAddonPeople(e.target.value)}
                                                            className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                        >
                                                            <option value="Tanpa Tambahan Orang">Tanpa Tambahan Orang</option>
                                                            <option value="+1 Orang (+Rp 50.000)">+1 Orang (+Rp 50.000)</option>
                                                            <option value="+2 Orang (+Rp 100.000)">+2 Orang (+Rp 100.000)</option>
                                                            <option value="+3 Orang (+Rp 150.000)">+3 Orang (+Rp 150.000)</option>
                                                            <option value="+4 Orang (+Rp 200.000)">+4 Orang (+Rp 200.000)</option>
                                                            <option value="+5 Orang (+Rp 250.000)">+5 Orang (+Rp 250.000)</option>
                                                        </select>
                                                    </div>

                                                    {/* Dropdown 2: Tambahan Durasi */}
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-gray-400 ml-1.5">Tambahan Durasi</label>
                                                        <select
                                                            value={addonTime}
                                                            onChange={(e) => setAddonTime(e.target.value)}
                                                            className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                        >
                                                            <option value="Tanpa Tambahan Waktu">Tanpa Tambahan Waktu</option>
                                                            <option value="+10 Menit (+Rp 50.000)">+10 Menit (+Rp 50.000)</option>
                                                            <option value="+20 Menit (+Rp 100.000)">+20 Menit (+Rp 100.000)</option>
                                                            <option value="+30 Menit (+Rp 150.000)">+30 Menit (+Rp 150.000)</option>
                                                        </select>
                                                    </div>

                                                    {/* Dropdown 3: Cetak Foto Premium */}
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-gray-400 ml-1.5">Cetak Foto Premium</label>
                                                        <select
                                                            value={addonPrint}
                                                            onChange={(e) => setAddonPrint(e.target.value)}
                                                            className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                        >
                                                            <option value="Tanpa Cetak Foto">Tanpa Cetak Foto</option>
                                                            <option value="Cetak 4R (+Rp 15.000)">Cetak 4R (+Rp 15.000)</option>
                                                            <option value="Cetak 10R (+Rp 50.000)">Cetak 10R (+Rp 50.000)</option>
                                                            <option value="Cetak 16R (+Rp 100.000)">Cetak 16R (+Rp 100.000)</option>
                                                        </select>
                                                    </div>

                                                    {/* Dropdown 4: Bingkai Foto Eksklusif */}
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-gray-400 ml-1.5">Bingkai Foto Eksklusif</label>
                                                        <select
                                                            value={addonFrame}
                                                            onChange={(e) => setAddonFrame(e.target.value)}
                                                            className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                        >
                                                            <option value="Tanpa Bingkai Foto">Tanpa Bingkai Foto</option>
                                                            <option value="Bingkai Minimalis 4R (+Rp 20.000)">Bingkai Minimalis 4R (+Rp 20.000)</option>
                                                            <option value="Bingkai Kayu Klasik 10R (+Rp 75.000)">Bingkai Kayu Klasik 10R (+Rp 75.000)</option>
                                                            <option value="Bingkai Premium Ukiran 16R (+Rp 150.000)">Bingkai Premium Ukiran 16R (+Rp 150.000)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Voucher / Promo */}
                                                <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><SvgIcon name="ticket" className="w-4 h-4 text-white" /> Voucher Diskon</h3>
                                                    <div className="flex gap-2">
                                                        <input type="text" placeholder="Masukkan kode voucher" className="input-glass flex-1 uppercase" value={voucherCodeInput} onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())} />
                                                        <button type="button" onClick={applyVoucher} className="bg-white/10 px-4 rounded-[16px] text-xs font-semibold hover:bg-white/20 transition">Terapkan</button>
                                                    </div>
                                                    {appliedDiscount > 0 && <p className="text-[11px] text-green-400 font-medium ml-1">✔️ Diskon berhasil diterapkan!</p>}
                                                </div>

                                                {/* Ringkasan Biaya */}
                                                <div className="glass-dark p-5 rounded-3xl border border-white/10">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3.5">Ringkasan Pesanan</h4>

                                                    <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Paket: {selectedPkg.title}</span><span className="font-semibold">{formatRupiah(priceInfo.price)}</span></div>
                                                    <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Room: {selectedRoom}</span></div>
                                                    <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Jadwal: {selectedEventDate} ({selectedTimeSlot})</span></div>

                                                    {addonsTotal > 0 && (
                                                        <div className="flex justify-between items-center mb-2 text-emerald-400">
                                                            <span className="text-sm">Tambahan Add-on</span>
                                                            <span className="font-semibold">+ {formatRupiah(addonsTotal)}</span>
                                                        </div>
                                                    )}

                                                    {appliedDiscount > 0 && (
                                                        <div className="flex justify-between items-center mb-2 text-green-400">
                                                            <span className="text-sm">Diskon Voucher</span>
                                                            <span className="font-semibold">- {formatRupiah(appliedDiscount)}</span>
                                                        </div>
                                                    )}

                                                    <div className="w-full h-px bg-white/10 my-3"></div>

                                                    <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Total Biaya</span><span className="font-semibold">{formatRupiah(finalPrice)}</span></div>
                                                    <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Minimal DP (Booking Slot)</span><span className="font-semibold text-emerald-400">{formatRupiah(dpAmount)}</span></div>
                                                    <div className="flex justify-between items-center"><span className="font-semibold">Sisa Pelunasan (di Studio)</span><span className="text-lg font-bold text-gray-300">{formatRupiah(sisaAmount)}</span></div>

                                                    <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-300 leading-relaxed text-left"><strong>Ketentuan Penting:</strong> Batal sepihak DP hangus, tidak bisa refund kecuali pihak 18Studio yang membatalkan. Sisa pelunasan dibayar di studio saat hari H photoshoot.</div>
                                                </div>

                                                {/* Persetujuan T&C */}
                                                <div className="flex items-start gap-3 mt-2 mb-2 px-1">
                                                    <div className="pt-0.5">
                                                        <input type="checkbox" id="tac" checked={isTacAccepted} onChange={(e) => setIsTacAccepted(e.target.checked)} className="w-4 h-4 rounded border-gray-600 bg-black/50 checked:bg-emerald-500 cursor-pointer accent-emerald-500" />
                                                    </div>
                                                    <label htmlFor="tac" className="text-[11px] text-gray-300 leading-snug cursor-pointer select-none text-left">
                                                        Saya telah membaca dan menyetujui <strong className="text-white">Syarat & Ketentuan 18Studio</strong> yang berlaku untuk pesanan ini.
                                                    </label>
                                                </div>

                                                <div className="flex gap-3 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setBookingStep(3)}
                                                        className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                                    >
                                                        Kembali
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={!isTacAccepted}
                                                        className="flex-1 bg-emerald-500 text-white font-semibold py-4 rounded-full text-sm hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/15"
                                                    >
                                                        Bayar DP Sekarang
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </form>
                            </div>
                        );
                    }

                    // STANDARD FORM (FOR WEDDING, MAKEUP, DEKORASI)
                    return (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col p-6 pt-10 text-left">
                            <div className="flex items-center gap-4 mb-8">
                                <button type="button" onClick={() => {
                                    if (bookingStep > 1) {
                                        setBookingStep(bookingStep - 1);
                                    } else {
                                        setView('detail');
                                    }
                                }} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center shrink-0"><SvgIcon name="arrow-left" className="w-5 h-5 text-white" /></button>
                                <div><h2 className="text-xl font-bold">Booking Form</h2><p className="text-xs text-gray-400">{selectedPkg.title}</p></div>
                            </div>

                            {/* Step indicator */}
                            <div className="flex items-center justify-between mb-8 px-1">
                                {[
                                    { step: 1, label: "Paket" },
                                    { step: 2, label: "Jadwal" },
                                    { step: 3, label: "Data" },
                                    { step: 4, label: "Bayar" }
                                ].map((s, idx) => (
                                    <React.Fragment key={s.step}>
                                        <div className="flex flex-col items-center gap-1.5 relative">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${bookingStep === s.step
                                                ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-110'
                                                : bookingStep > s.step
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                    : 'bg-white/5 text-gray-500 border border-white/10'
                                                }`}>
                                                {bookingStep > s.step ? "✓" : s.step}
                                            </div>
                                            <span className={`text-[10px] font-semibold tracking-wide ${bookingStep === s.step ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                                        </div>
                                        {idx < 3 && (
                                            <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-500 ${bookingStep > s.step ? 'bg-emerald-500' : 'bg-white/10'
                                                }`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4 pb-10">
                                <input type="hidden" name="eventDate" value={selectedEventDate} />
                                <input type="hidden" name="resepsiDate" value={selectedResepsiDate} />
                                <input type="hidden" name="prewedDate" value={selectedPrewedDate} />

                                {/* STEP 1: PAKET */}
                                {bookingStep === 1 && (() => {
                                    const mainCat = getMainCategory(selectedPkg.category);
                                    // subcats tanpa "All", lalu "All" dipindah ke akhir
                                    const allSubcats = getSubcategories(mainCat, packages);
                                    const subcatChips = [
                                        ...allSubcats.filter(s => s !== 'All'),
                                        'All'
                                    ];
                                    // default active = category paket yang dipilih
                                    const activeSubcat = wizardSubcat === 'All' ? 'All' : wizardSubcat;
                                    const filteredPkgs = packages.filter(p => {
                                        const isCatMatch = getMainCategory(p.category) === mainCat;
                                        if (!isCatMatch) return false;
                                        if (activeSubcat === "All") return true;
                                        return p.category === activeSubcat;
                                    });

                                    return (
                                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            {/* Subcategory Filter — "Semua Paket" di paling kanan */}
                                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
                                                {subcatChips.map(sub => (
                                                    <button
                                                        key={sub}
                                                        type="button"
                                                        onClick={() => setWizardSubcat(sub)}
                                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${activeSubcat === sub
                                                            ? 'bg-emerald-500 text-white shadow-md'
                                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {sub === 'All' ? 'Semua Paket' : sub}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Packages List */}
                                            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 hide-scrollbar">
                                                {filteredPkgs.map(p => {
                                                    const isSelected = selectedPkg.id === p.id;
                                                    const priceInfo = getDiscountedPriceInfo(p);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => {
                                                                setSelectedPkg(p);
                                                                // saat ganti paket, update chip aktif ke kategori paket baru
                                                                setWizardSubcat(p.category);
                                                            }}
                                                            className={`glass-panel p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex gap-4 items-center ${isSelected
                                                                ? 'border-emerald-500/80 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[0.99]'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <img src={p.image_url} alt={p.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
                                                                <p className="text-xs text-emerald-400 font-semibold mt-0.5">{formatRupiah(priceInfo.price)}</p>
                                                            </div>
                                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20 text-transparent'
                                                                }`}>
                                                                <span className="text-[10px] font-bold">✓</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setBookingStep(2)}
                                                className="w-full bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition mt-4 shadow-lg shadow-white/5"
                                            >
                                                Lanjut ke Jadwal
                                            </button>
                                        </div>
                                    );
                                })()}

                                {/* STEP 2: JADWAL */}
                                {bookingStep === 2 && (
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><SvgIcon name="calendar" className="w-4 h-4 text-white" /> Jadwal Acara</h3>

                                            {isSingleDate && (
                                                <div>
                                                    <label className="text-[11px] text-gray-400 ml-2">Tanggal Acara *</label>
                                                    <input
                                                        type="date"
                                                        value={selectedEventDate}
                                                        onChange={handleDateChange}
                                                        className="input-glass mt-1"
                                                        required
                                                    />
                                                </div>
                                            )}

                                            {isThreeDates && (
                                                <>
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Prewed (Opsional)</label>
                                                        <input
                                                            type="date"
                                                            value={selectedPrewedDate}
                                                            onChange={(e) => setSelectedPrewedDate(e.target.value)}
                                                            className="input-glass mt-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Akad *</label>
                                                        <input
                                                            type="date"
                                                            value={selectedEventDate}
                                                            onChange={handleDateChange}
                                                            className="input-glass mt-1"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Resepsi</label>
                                                        <input
                                                            type="date"
                                                            value={selectedResepsiDate}
                                                            onChange={(e) => setSelectedResepsiDate(e.target.value)}
                                                            className="input-glass mt-1"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {(!isSingleDate && !isThreeDates) && (
                                                isResepsiFlow ? (
                                                    <>
                                                        <div>
                                                            <label className="text-[11px] text-gray-400 ml-2">Tanggal Akad *</label>
                                                            <input
                                                                type="date"
                                                                value={selectedEventDate}
                                                                onChange={handleDateChange}
                                                                className="input-glass mt-1"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] text-gray-400 ml-2">Tanggal Resepsi</label>
                                                            <input
                                                                type="date"
                                                                value={selectedResepsiDate}
                                                                onChange={(e) => setSelectedResepsiDate(e.target.value)}
                                                                className="input-glass mt-1"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Acara *</label>
                                                        <input
                                                            type="date"
                                                            value={selectedEventDate}
                                                            onChange={handleDateChange}
                                                            className="input-glass mt-1"
                                                            required
                                                        />
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="flex gap-3 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setBookingStep(1)}
                                                className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                            >
                                                Kembali
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!selectedEventDate}
                                                onClick={() => setBookingStep(3)}
                                                className="flex-1 bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Lanjut
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: DATA PEMESAN */}
                                {bookingStep === 3 && (
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><SvgIcon name="user" className="w-4 h-4 text-white" /> Data Pemesan</h3>
                                            <div><label className="text-[11px] text-gray-400 ml-2">Nama Pemesan *</label><input type="text" value={bookingName} onChange={handleNameInputChange} placeholder="Hanya dapat diisi huruf" className="input-glass mt-1" required /></div>
                                            <div><label className="text-[11px] text-gray-400 ml-2">No WhatsApp *</label><input type="tel" value={bookingPhone} onChange={handlePhoneInputChange} placeholder="Hanya dapat diisi angka" className="input-glass mt-1" required /></div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 ml-2">Alamat Lengkap *</label>
                                                <textarea value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} placeholder="Alamat Lengkap" className="input-glass min-h-[80px] mt-1 mb-1" required></textarea>
                                                <p className="text-[9px] text-gray-400/80 ml-2 leading-tight">
                                                    *Catatan: Total biaya belum termasuk akomodasi/transportasi untuk lokasi acara di luar Kota Langsa. Admin kami akan menghubungi Anda untuk konfirmasi biaya tambahan setelah Anda melakukan booking.
                                                </p>
                                            </div>
                                            <div><label className="text-[11px] text-gray-400 ml-2">Keterangan Tambahan (Opsional)</label><textarea value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="Keterangan tambahan" className="input-glass min-h-[60px] mt-1"></textarea></div>
                                        </div>

                                        <div className="flex gap-3 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setBookingStep(2)}
                                                className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                            >
                                                Kembali
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim()}
                                                onClick={() => setBookingStep(4)}
                                                className="flex-1 bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Lanjut
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: BAYAR (RINGKASAN & ADD-ONS) */}
                                {bookingStep === 4 && (
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <SvgIcon name="package" className="w-4 h-4 text-white" />
                                                <span className="text-sm font-semibold">Layanan Tambahan (Add-on)</span>
                                            </div>

                                            {/* Dropdown 1: Makeup Artis */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-gray-400 ml-2">Makeup Artis</label>
                                                <select
                                                    value={getSelectedAddonIdForCategory('Makeup Artis')}
                                                    onChange={(e) => handleCategorySelect('Makeup Artis', e.target.value)}
                                                    className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                >
                                                    <option value="" className="bg-[#121212] text-gray-400">-- Pilih Makeup Artis (Optional) --</option>
                                                    {addonOptions
                                                        .map(parseAddon)
                                                        .filter(p => p.category === 'Makeup Artis')
                                                        .map(p => (
                                                            <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                {p.labelOnly} ({formatRupiah(p.price)})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Dropdown 2: Video */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-gray-400 ml-2">Video</label>
                                                <select
                                                    value={getSelectedAddonIdForCategory('Video')}
                                                    onChange={(e) => handleCategorySelect('Video', e.target.value)}
                                                    className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                >
                                                    <option value="" className="bg-[#121212] text-gray-400">-- Pilih Video (Optional) --</option>
                                                    {addonOptions
                                                        .map(parseAddon)
                                                        .filter(p => p.category === 'Video')
                                                        .map(p => (
                                                            <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                {p.labelOnly} ({formatRupiah(p.price)})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Dropdown 3: Add-on Best Seller */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-gray-400 ml-2">Add-on Best Seller</label>
                                                <select
                                                    value={getSelectedAddonIdForCategory('Add-on Best Seller')}
                                                    onChange={(e) => handleCategorySelect('Add-on Best Seller', e.target.value)}
                                                    className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                >
                                                    <option value="" className="bg-[#121212] text-gray-400">-- Pilih Add-on Best Seller (Optional) --</option>
                                                    {addonOptions
                                                        .map(parseAddon)
                                                        .filter(p => p.category === 'Add-on Best Seller')
                                                        .map(p => (
                                                            <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                {p.labelOnly} ({formatRupiah(p.price)})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Dropdown 4: Add-on Lainnya */}
                                            {addonOptions.map(parseAddon).some(p => p.category === 'Lainnya') && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-400 ml-2">Add-on Lainnya</label>
                                                    <select
                                                        value={getSelectedAddonIdForCategory('Lainnya')}
                                                        onChange={(e) => handleCategorySelect('Lainnya', e.target.value)}
                                                        className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                    >
                                                        <option value="" className="bg-[#121212] text-gray-400">-- Pilih Add-on Lainnya (Optional) --</option>
                                                        {addonOptions
                                                            .map(parseAddon)
                                                            .filter(p => p.category === 'Lainnya')
                                                            .map(p => (
                                                                <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                    {p.labelOnly} ({formatRupiah(p.price)})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Interactive Summary Badges */}
                                            {selectedAddons.length > 0 && (
                                                <div className="mt-2 pt-3 border-t border-white/10 flex flex-col gap-2">
                                                    <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider ml-1">Layanan Terpilih (Klik untuk Hapus):</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {selectedAddons.map(addon => {
                                                            const parsed = parseAddon(addon);
                                                            let cBadge = "bg-white/5 border border-white/10 text-gray-300";
                                                            if (parsed.category === 'Makeup Artis') {
                                                                cBadge = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
                                                            } else if (parsed.category === 'Video') {
                                                                cBadge = "bg-sky-500/10 border border-sky-500/20 text-sky-400";
                                                            } else if (parsed.category === 'Add-on Best Seller') {
                                                                cBadge = "bg-amber-500/10 border border-amber-500/20 text-amber-400";
                                                            }
                                                            return (
                                                                <div
                                                                    key={addon.id}
                                                                    onClick={() => handleRemoveAddon(addon.id)}
                                                                    className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-full px-2.5 py-1 text-xs text-white flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                                                                    title="Klik untuk menghapus"
                                                                >
                                                                    <span className={`font-semibold text-[9px] px-1.5 py-0.5 rounded-full ${cBadge}`}>{parsed.category}</span>
                                                                    <span>{parsed.labelOnly}</span>
                                                                    <span className="text-gray-400 text-[10px]">({formatRupiah(addon.price)})</span>
                                                                    <span className="text-[10px] opacity-60 hover:opacity-100">✕</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><SvgIcon name="ticket" className="w-4 h-4 text-white" /> Voucher Diskon</h3>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Masukkan kode voucher" className="input-glass flex-1 uppercase" value={voucherCodeInput} onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())} />
                                                <button type="button" onClick={applyVoucher} className="bg-white/10 px-4 rounded-[16px] text-xs font-semibold hover:bg-white/20 transition">Terapkan</button>
                                            </div>
                                            {appliedDiscount > 0 && <p className="text-[11px] text-green-400 font-medium ml-2">✔️ Diskon berhasil diterapkan!</p>}
                                        </div>

                                        <div className="glass-dark p-5 rounded-3xl mt-2 border border-white/10">
                                            <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Harga Paket</span><span className="font-semibold">{formatRupiah(priceInfo.price)}</span></div>
                                            {selectedAddons.length > 0 && <div className="flex justify-between items-center mb-2 text-blue-400"><span className="text-sm">Tambahan ({selectedAddons.length} Add-on)</span><span className="font-semibold">+ {formatRupiah(addonsTotal)}</span></div>}
                                            {appliedDiscount > 0 && <div className="flex justify-between items-center mb-2 text-green-400"><span className="text-sm">Diskon Voucher</span><span className="font-semibold">- {formatRupiah(appliedDiscount)}</span></div>}
                                            <div className="flex justify-between items-center mb-2 mt-2 pt-2 border-t border-white/10"><span className="text-sm text-gray-300">Total Biaya</span><span className="font-semibold">{formatRupiah(finalPrice)}</span></div>
                                            <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-300">Minimal DP</span><span className="font-semibold">{formatRupiah(dpAmount)}</span></div>
                                            <div className="w-full h-px bg-white/20 my-3"></div>
                                            <div className="flex justify-between items-center"><span className="font-semibold">Sisa Pelunasan</span><span className="text-lg font-bold text-green-400">{formatRupiah(sisaAmount)}</span></div>
                                            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-300 leading-relaxed text-left"><strong>Ketentuan Penting:</strong> Batal sepihak DP hangus, tidak bisa refund kecuali pihak lapanbelas yang mecancel, pelunasan batas akhir H+1, tidak bisa DP dialihkan dengan moment lainnya.</div>
                                        </div>

                                        <div className="flex items-start gap-3 mt-4 mb-2 px-2">
                                            <div className="pt-0.5">
                                                <input type="checkbox" id="tac" checked={isTacAccepted} onChange={(e) => setIsTacAccepted(e.target.checked)} className="w-4 h-4 rounded border-gray-600 bg-black/50 checked:bg-blue-500 cursor-pointer accent-blue-500" />
                                            </div>
                                            <label htmlFor="tac" className="text-[11px] text-gray-300 leading-snug cursor-pointer select-none text-left">
                                                Saya telah membaca dan menyetujui <strong className="text-white">Syarat & Ketentuan 18Studio</strong> yang akan dicetak pada faktur pesanan ini.
                                            </label>
                                        </div>

                                        <div className="flex gap-3 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setBookingStep(3)}
                                                className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                            >
                                                Kembali
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!isTacAccepted}
                                                className="flex-1 bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Konfirmasi Pesanan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Navigation */}
            {view === 'home' && (
                <div
                    className="fixed left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-center z-[9999] pt-2 border-t border-white/10 rounded-t-3xl"
                    style={{
                        bottom: '0px',
                        background: 'rgba(1, 6, 5, 0.65)',
                        WebkitBackdropFilter: 'blur(24px)',
                        backdropFilter: 'blur(24px)',
                        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
                    }}
                >
                    <button onClick={() => handleTabClick('beranda')} className={`flex flex-col items-center gap-1 py-1.5 px-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'beranda' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                        <SvgIcon name="home" className="w-5 h-5" /><span className="text-[10px] font-medium">Beranda</span>
                    </button>
                    <button onClick={() => handleTabClick('package')} className={`flex flex-col items-center gap-1 py-1.5 px-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'package' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                        <SvgIcon name="package" className="w-5 h-5" /><span className="text-[10px] font-medium">Package</span>
                    </button>
                    <button onClick={() => handleTabClick('sample')} className={`flex flex-col items-center gap-1 py-1.5 px-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'sample' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                        <SvgIcon name="layout-template" className="w-5 h-5" /><span className="text-[10px] font-medium">Sample</span>
                    </button>
                    <button onClick={() => handleTabClick('order')} className={`flex flex-col items-center gap-1 py-1.5 px-2 w-[4.5rem] transition-all duration-300 relative ${activeTab === 'order' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                        <div className="relative">
                            <SvgIcon name="clipboard-list" className="w-5 h-5" />
                            {orders.filter(o => o.status === 'Menunggu DP' || (o.progressFoto && o.progressFoto !== 'Done') || (o.progressVideo && o.progressVideo !== 'Done')).length > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full shadow-lg border border-black/20 z-10">
                                    {orders.filter(o => o.status === 'Menunggu DP' || (o.progressFoto && o.progressFoto !== 'Done') || (o.progressVideo && o.progressVideo !== 'Done')).length}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">My Order</span>
                    </button>
                    <button onClick={() => handleTabClick('profile')} className={`flex flex-col items-center gap-1 py-1.5 px-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'profile' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                        <SvgIcon name="user" className="w-5 h-5" /><span className="text-[10px] font-medium">Profile</span>
                    </button>
                </div>
            )}

            {/* Media Modal (Lightbox) */}
            {mediaModalOpen && portfolio.length > 0 && (() => {
                const activeItem = portfolio[currentMediaIndex];
                const imageUrls = activeItem.type === 'photo' ? parseUrls(activeItem.url) : [];
                return (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-300">
                        <div className="flex justify-between items-center p-4 text-white z-20 absolute top-0 w-full bg-gradient-to-b from-black/80 to-transparent">
                            <h3 className="font-semibold text-sm truncate pr-4 drop-shadow-md">{activeItem.title}</h3>
                            <button onClick={() => setMediaModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0 backdrop-blur-md">
                                <SvgIcon name="x" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 w-full h-full flex items-center justify-center relative touch-pan-y"
                            onTouchStart={(e) => { window.touchStartX = e.changedTouches[0].screenX; }}
                            onTouchEnd={(e) => {
                                const touchEndX = e.changedTouches[0].screenX;
                                if (window.touchStartX - touchEndX > 50) {
                                    if (activeItem.type === 'photo' && imageUrls.length > 1) {
                                        setCurrentPhotoIndex((prev) => (prev < imageUrls.length - 1 ? prev + 1 : 0));
                                    }
                                } else if (touchEndX - window.touchStartX > 50) {
                                    if (activeItem.type === 'photo' && imageUrls.length > 1) {
                                        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : imageUrls.length - 1));
                                    }
                                }
                            }}
                        >
                            {activeItem.type === 'video' ? (
                                <iframe
                                    src={getYouTubeEmbedUrl(activeItem.url)}
                                    className="w-full h-[60vh] max-h-full border-0 z-10 relative"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen>
                                </iframe>
                            ) : (
                                <img src={imageUrls[currentPhotoIndex] || activeItem.url} className="w-full h-auto max-h-[85vh] object-contain z-10 relative pointer-events-none animate-in fade-in duration-300" key={currentPhotoIndex} />
                            )}

                            {activeItem.type === 'photo' && imageUrls.length > 1 && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(p => p > 0 ? p - 1 : imageUrls.length - 1); }} className="absolute left-2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white z-20 backdrop-blur-md hover:bg-black/60 transition">
                                        <SvgIcon name="chevron-left" className="w-6 h-6" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(p => p < imageUrls.length - 1 ? p + 1 : 0); }} className="absolute right-2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white z-20 backdrop-blur-md hover:bg-black/60 transition">
                                        <SvgIcon name="chevron-right" className="w-6 h-6" />
                                    </button>
                                </>
                            )}
                        </div>

                        {activeItem.type === 'photo' && imageUrls.length > 1 && (
                            <div className="p-4 flex justify-center items-center gap-2 absolute bottom-6 w-full z-20">
                                {imageUrls.map((_, idx) => (
                                    <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentPhotoIndex ? 'bg-white w-4' : 'bg-white/30 w-1.5'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Room Studio Preview Modal */}
            {roomPreview && (() => {
                const dbPhotos = roomPhotosDb[roomPreview.name];
                const images = (dbPhotos && dbPhotos.length > 0) ? dbPhotos : (roomSampleImages[roomPreview.name] || []);
                return (
                    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="glass-panel p-5 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative flex flex-col gap-4">
                            <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                <div>
                                    <h3 className="font-bold text-sm text-white">{roomPreview.name}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{roomPreview.desc}</p>
                                </div>
                                <button
                                    onClick={() => setRoomPreview(null)}
                                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/20 flex items-center justify-center transition"
                                >
                                    <SvgIcon name="x" className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 hide-scrollbar">
                                {images.map((imgUrl, index) => (
                                    <div key={index} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
                                        <img
                                            src={imgUrl}
                                            alt={`${roomPreview.name} Sample ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 rounded-lg text-[9px] font-bold text-white border border-white/5">
                                            Sample {index + 1}
                                        </div>
                                    </div>
                                ))}
                                {images.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 py-6">Belum ada foto contoh untuk ruangan ini.</p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedRoom(roomPreview.name);
                                    setRoomPreview(null);
                                }}
                                className="w-full bg-emerald-500 text-white font-semibold py-3.5 rounded-full text-xs hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/10 mt-1"
                            >
                                Pilih Room Ini
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);