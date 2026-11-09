import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import BestSellerCarousel from './components/BestSellerCarousel';
import PhotoLightboxModal from './components/PhotoLightboxModal';
import InAppPaymentModal from './components/InAppPaymentModal';
import RoomPreviewModal from './components/RoomPreviewModal';
import RescheduleModal from './components/RescheduleModal';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

// Inisialisasi Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Konstanta Harga Addons Studio (agar perhitungan tidak pecah karena perubahan label teks)
const STUDIO_ADDONS_PRICING = {
    people: {
        "Tanpa Tambahan Orang": 0,
        "+1 Orang": 50000,
        "+2 Orang": 100000,
        "+3 Orang": 150000,
        "+4 Orang": 200000,
        "+5 Orang": 250000
    },
    time: {
        "Tanpa Tambahan Waktu": 0,
        "+10 Menit": 100000,
        "+20 Menit": 200000,
        "+30 Menit": 300000
    },
    print: {
        "Tanpa Cetak Foto": 0,
        "Cetak 1 Foto 10R": 25000,
        "Cetak 2 Foto 10R": 50000,
        "Cetak 3 Foto 10R": 75000
    },
    frame: {
        "Tanpa Bingkai Foto": 0,
        "Bingkai Kaca Minimalis 10R Hitam": 40000,
        "Bingkai Kaca Minimalis 10R Putih": 40000
    }
};

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

const getCategoryIcon = (catId) => {
    switch (catId) {
        case MAIN_CATEGORIES.WEDDING: // Lapanbelas (Camera Icon matching Reference)
            return (
                <svg className="w-[18px] h-[18px] text-[#0d9488] dark:text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3.5" />
                </svg>
            );
        case MAIN_CATEGORIES.PHOTO_STUDIO: // Studio (House / Studio Icon in Warm Gold matching Reference)
            return (
                <svg className="w-[18px] h-[18px] text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" />
                    <path d="M9 21V14h6v7" />
                    <circle cx="12" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
                </svg>
            );
        case MAIN_CATEGORIES.MAKEUP: // Makeup (Brush / Lipstick Wand with Sparkles matching Reference)
            return (
                <svg className="w-[18px] h-[18px] text-[#0d9488] dark:text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 5 4 4L8 20H4v-4L15 5z" />
                    <path d="m12.5 7.5 4 4" />
                    <path d="M19 2v3M17.5 3.5h3" />
                    <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
                </svg>
            );
        case MAIN_CATEGORIES.DEKORASI: // Dekorasi (Flower / Floral Arch matching Reference)
            return (
                <svg className="w-[18px] h-[18px] text-teal-600 dark:text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4c1.5 2 2.5 4 2.5 6A2.5 2.5 0 0 1 12 12.5 2.5 2.5 0 0 1 9.5 10c0-2 1-4 2.5-6z" />
                    <path d="M12 12.5c2-1.5 4.5-1.5 6.5 0-1 2.5-3 4-6.5 4s-5.5-1.5-6.5-4c2-1.5 4.5-1.5 6.5 0z" />
                    <path d="M12 16.5V21" />
                    <path d="M8 19c1.5 0 3 .8 4 2 1-1.2 2.5-2 4-2" />
                </svg>
            );
        default:
            return null;
    }
};

const getSubcategories = (mainCat, pkgs) => {
    const subcats = new Set();
    pkgs.forEach(pkg => {
        if (pkg.is_active !== false && getMainCategory(pkg.category) === mainCat && pkg.category) {
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

// Membersihkan seluruh tag konfigurasi internal agar tidak tampil ke klien publik
export const cleanPackageDescription = (desc) => {
    if (!desc) return '';
    return desc
        .replace(/\[HPP_ITEMS\]:[\s\S]*?(?=(\n\s*\[|\n\s*Note|\n\s*\-|$))/gi, '')
        .replace(/\[[A-Z0-9_]+\]:?[^\n]*/gi, '')
        .replace(/%5B%7B[\s\S]*?%5D/gi, '')
        .replace(/%5B[^\n]*/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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
    const bufferMinutes = 10;

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
        "/logo.png",
        "/logo.png"
    ],
    "Room B - Luxury": [
        "/logo.png",
        "/logo.png"
    ],
    "Room C - Modern": [
        "/logo.png",
        "/logo.png"
    ],
    "Room D - Kubah": [
        "/logo.png",
        "/logo.png"
    ],
    "Room E - Custom": [
        "/logo.png",
        "/logo.png"
    ]
};

// Format Rupiah Helper
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
};

// Helper to parse addon category and labelOnly from label string [Category] Label
const parseAddon = (addon) => {
    if (!addon) return { category: 'Foto & Cetak', labelOnly: '' };
    const rawLabel = (addon.label || addon.name || '').trim();
    const l = rawLabel.toLowerCase();

    let category = 'Foto & Cetak';
    let labelOnly = rawLabel.replace(/^\[.*?\]\s*/, '').trim();

    if (l.includes('[makeup') || l.includes('baju') || l.includes('melati') || l.includes('sunting') || l.includes('paes') || l.includes('gaun') || l.includes('henna')) {
        category = 'Makeup & Busana';
    } else if (l.includes('[dekorasi') || l.includes('tenda') || l.includes('blower') || l.includes('kursi') || l.includes('pelaminan') || l.includes('dekor')) {
        category = 'Dekorasi';
    } else if (l.includes('[video') || l.includes('drone') || l.includes('cinema') || l.includes('live akad') || l.includes('recording') || l.includes('teaser') || l.includes('same day')) {
        category = 'Video & Drone';
    } else {
        category = 'Foto & Cetak';
    }

    return {
        ...addon,
        category,
        labelOnly: labelOnly || rawLabel
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

export const calculateMinDp = (pkg, category, totalPrice) => {
    if (!pkg) return 0;
    
    // 1. Cek jika paket memiliki konfigurasi DP custom di description [DP]: 50000 atau [MIN_DP]: 50000
    if (pkg.description) {
        const dpMatch = pkg.description.match(/\[(?:DP|MIN_DP)\]:\s*(\d+)/i);
        if (dpMatch) {
            const customDp = parseInt(dpMatch[1], 10);
            return Math.min(customDp, totalPrice);
        }
    }

    // 2. Cek jika kolom min_dp atau dp_amount ada di objek paket
    if (pkg.min_dp || pkg.dp_amount) {
        const fieldDp = Number(pkg.min_dp || pkg.dp_amount);
        if (fieldDp > 0) return Math.min(fieldDp, totalPrice);
    }

    const pkgPrice = Number(pkg.price || 0);

    // 3. Logika Pintar Nominal DP Berdasarkan Kategori & Skala Harga:
    let defaultDp = 1000000;

    if (category === MAIN_CATEGORIES.PHOTO_STUDIO) {
        // Self Photo / Paket Mini (<= 150rb, misal Self Photo 100k - 150k): DP 50rb
        if (pkgPrice <= 150000) {
            defaultDp = 50000;
        } 
        // Self Photo Superstar / Medium (<= 250rb, misal Megastar 220k): DP 100rb
        else if (pkgPrice <= 250000) {
            defaultDp = 100000;
        } 
        // Group / Wisuda / Family / Studio Reguler (> 250rb, misal 350k - 1jt): DP 200rb
        else {
            defaultDp = 200000;
        }
    } else if (category === MAIN_CATEGORIES.MAKEUP) {
        // Makeup Wisuda / Event (<= 500rb): DP 200rb
        if (pkgPrice <= 500000) {
            defaultDp = 200000;
        } else {
            defaultDp = 500000;
        }
    } else if (category === MAIN_CATEGORIES.DEKORASI) {
        // Dekorasi Mini / Lamaran (<= 2.5jt): DP 1jt
        if (pkgPrice <= 2500000) {
            defaultDp = 1000000;
        } else {
            defaultDp = 2000000;
        }
    } else if (category === MAIN_CATEGORIES.WEDDING) {
        // Lamaran / Prewedding Basic / Engagement (<= 1.5jt): DP 500rb
        if (pkgPrice <= 1500000) {
            defaultDp = 500000;
        } else {
            defaultDp = 1000000;
        }
    }

    return Math.min(defaultDp, totalPrice);
};

// Format nominal hemat (contoh: Hemat 1 Juta, Hemat 600rb, Hemat 297rb)
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

// Default Slideshow Banners jika belum dikonfigurasi di Pengaturan Admin
const DEFAULT_SLIDESHOW = [
    {
        id: 1,
        title: "Cerita Indah, Abadi, Berkesan.",
        subtitle: "Dapatkan diskon Rp 100.000 untuk booking bulan ini! Special promo lock-date.",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85",
        badge: "PROMO AGUSTUS"
    },
    {
        id: 2,
        title: "Abadikan Moment Bahagia.",
        subtitle: "Wisuda, Group, dan Couple Studio dengan Background Premium 18Studio.",
        image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85",
        badge: "STUDIO EKSKLUSIF"
    },
    {
        id: 3,
        title: "Mahakarya Sinematik & Elegan.",
        subtitle: "Wujudkan pelaminan & dokumentasi impian dengan sentuhan berkelas.",
        image: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85",
        badge: "WEDDING & DEKOR"
    }
];

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
        "x": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
        "grid": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
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
    const trimmed = url.trim();
    let videoId = '';
    if (trimmed.includes('youtu.be/')) videoId = trimmed.split('youtu.be/')[1].split('?')[0].split('&')[0];
    else if (trimmed.includes('youtube.com/shorts/')) videoId = trimmed.split('youtube.com/shorts/')[1].split('?')[0].split('&')[0];
    else if (trimmed.includes('youtube.com/watch')) videoId = new URLSearchParams(new URL(trimmed).search).get('v');
    else if (trimmed.includes('youtube.com/embed/')) videoId = trimmed.split('youtube.com/embed/')[1].split('?')[0].split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : trimmed;
};

const getYouTubeThumbnail = (url) => {
    if (!url) return "/logo.png";
    const trimmed = url.trim();
    let videoId = '';
    if (trimmed.includes('youtu.be/')) videoId = trimmed.split('youtu.be/')[1].split('?')[0].split('&')[0];
    else if (trimmed.includes('youtube.com/shorts/')) videoId = trimmed.split('youtube.com/shorts/')[1].split('?')[0].split('&')[0];
    else if (trimmed.includes('youtube.com/watch')) videoId = new URLSearchParams(new URL(trimmed).search).get('v');
    else if (trimmed.includes('youtube.com/embed/')) videoId = trimmed.split('youtube.com/embed/')[1].split('?')[0].split('&')[0];
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "/logo.png";
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [userEmail, setUserEmail] = React.useState("");
    const [userName, setUserName] = React.useState("");
    const [view, setView] = React.useState('home');
    const [selectedPkg, setSelectedPkg] = React.useState(null);
    const [activeCategory, setActiveCategory] = React.useState("All");
    const [mainCategory, setMainCategory] = React.useState(MAIN_CATEGORIES.WEDDING);
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
    const lightboxScrollRef = React.useRef(null);
    // Swipe gesture state
    const touchStartXRef = React.useRef(0);
    const touchStartYRef = React.useRef(0);
    const touchStartScrollYRef = React.useRef(0);
    const isSwiping = React.useRef(false);
    const isVertical = React.useRef(false);
    const [dragOffsetX, setDragOffsetX] = React.useState(0);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
    const [mediaModalOpen, setMediaModalOpen] = React.useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);
    const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);
    const [fullscreenPhoto, setFullscreenPhoto] = React.useState(null);
    const [promoBannerActive, setPromoBannerActive] = React.useState(false);
    const [promoBannerText, setPromoBannerText] = React.useState("");
    const [promoBannerTheme, setPromoBannerTheme] = React.useState("emerald_gold");
    const [promoDismissed, setPromoDismissed] = React.useState(false);
    const [expandedCategoryAccordion, setExpandedCategoryAccordion] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [sampleSearch, setSampleSearch] = React.useState("");
    const [sampleFilter, setSampleFilter] = React.useState("Semua");
    const [orderFilter, setOrderFilter] = React.useState("Semua");

    const [slideshowList, setSlideshowList] = React.useState(DEFAULT_SLIDESHOW);
    const [bestSellerConfig, setBestSellerConfig] = React.useState({});
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [slideStartX, setSlideStartX] = React.useState(null);

    React.useEffect(() => {
        if (activeTab !== 'beranda' || slideshowList.length === 0) return;
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % (slideshowList.length || 1));
        }, 4000);
        return () => clearInterval(interval);
    }, [activeTab, slideshowList.length]);

    const handleSlideTouchStart = (e) => {
        setSlideStartX(e.touches[0].clientX);
    };

    const handleSlideTouchEnd = (e) => {
        if (slideStartX === null || slideshowList.length <= 1) return;
        const diffX = e.changedTouches[0].clientX - slideStartX;
        const threshold = 40; // minimum swiping distance in pixels
        const total = slideshowList.length;
        if (diffX > threshold) {
            // Swipe right -> previous slide
            setCurrentSlide(prev => (prev - 1 + total) % total);
        } else if (diffX < -threshold) {
            // Swipe left -> next slide
            setCurrentSlide(prev => (prev + 1) % total);
        }
        setSlideStartX(null);
    };

    const [readNotifs, setReadNotifs] = React.useState({});
    const [activePackageIndex, setActivePackageIndex] = React.useState(0);

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
    const [phoneCountryCode, setPhoneCountryCode] = React.useState("+62");
    const [bookingPhone, setBookingPhone] = React.useState("");
    const [bookingAddress, setBookingAddress] = React.useState("");
    const [bookingNotes, setBookingNotes] = React.useState("");

    const [addonOptions, setAddonOptions] = React.useState([]);
    const [selectedAddons, setSelectedAddons] = React.useState([]);
    const [addonsDropdownOpen, setAddonsDropdownOpen] = React.useState(false);

    // Multi-Package cross-division state
    const [extraPackages, setExtraPackages] = React.useState([]);
    const [showCrossPkgBox, setShowCrossPkgBox] = React.useState(false);
    const [crossPkgDiv, setCrossPkgDiv] = React.useState('Lady Makeup');
    const [selectedCrossPkgTitle, setSelectedCrossPkgTitle] = React.useState('');

    const [voucherCodeInput, setVoucherCodeInput] = React.useState("");
    const [appliedDiscount, setAppliedDiscount] = React.useState(0);

    const [isTacAccepted, setIsTacAccepted] = React.useState(false);
    const [inAppPaymentData, setInAppPaymentData] = React.useState(null);
    const [isInAppPaymentOpen, setIsInAppPaymentOpen] = React.useState(false);
    const [selectedRescheduleOrder, setSelectedRescheduleOrder] = React.useState(null);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = React.useState(false);

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

    // Handle manual swiping in lightbox
    const handleLightboxScroll = (e) => {
        const scrollLeft = e.target.scrollLeft;
        const width = e.target.clientWidth;
        if (width > 0) {
            const newIndex = Math.round(scrollLeft / width);
            if (newIndex !== currentPhotoIndex) {
                setCurrentPhotoIndex(newIndex);
            }
        }
    };

    // Scroll programmatically to target image in lightbox
    const scrollToImage = (index) => {
        if (lightboxScrollRef.current) {
            lightboxScrollRef.current.scrollTo({
                left: index * lightboxScrollRef.current.clientWidth,
                behavior: 'smooth'
            });
        }
    };

    // Keep lightbox scroll position in sync with state changes
    React.useEffect(() => {
        if (mediaModalOpen) {
            const timer = setTimeout(() => {
                if (lightboxScrollRef.current) {
                    lightboxScrollRef.current.scrollLeft = currentPhotoIndex * lightboxScrollRef.current.clientWidth;
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [mediaModalOpen, currentMediaIndex]);

    const TABS_LIST = ['beranda', 'package', 'sample', 'order', 'profile'];

    // [DISABLED] Swipe gesture tab switching — navigation via Bottom Nav only
    // Tab berpindah HANYA lewat klik Bottom Navigation Bar
    const handleTouchStart = () => {};
    const handleTouchMove = () => {};
    const handleTouchEnd = () => {};

    // Reset active package coverflow index when category changes
    React.useEffect(() => {
        setActivePackageIndex(0);
    }, [mainCategory]);

    // (touchmove listener removed to prevent interference)

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

    // Disable top/bottom pull-down elastic rubber-band bounce effect on iOS Safari
    React.useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        let touchStartY = 0;

        const handleTouchStart = (e) => {
            if (e.touches.length === 1) {
                touchStartY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length !== 1) return;

            const touchY = e.touches[0].clientY;
            const deltaY = touchY - touchStartY;

            // If user is at the top of the container and dragging down (trying to overscroll top)
            if (el.scrollTop <= 0 && deltaY > 0) {
                if (e.cancelable) e.preventDefault();
            }

            // If user is at the bottom of the container and dragging up (trying to overscroll bottom)
            const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 1;
            if (isAtBottom && deltaY < 0) {
                if (e.cancelable) e.preventDefault();
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
        };
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
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
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
                        dateMap[eventDateKey] = { slots: Number(d.slots_booked), closed: d.is_manually_closed, max: d.max_slots || 2 };
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
                    const slideshowSet = settingsData.find(s => s.key === 'slideshow_banners');
                    const bestSellerSet = settingsData.find(s => s.key === 'bestseller_package_ids');

                    if (nameSet) setStudioName(nameSet.value);
                    if (descSet) setStudioDesc(descSet.value);
                    if (waSet) setAdminWhatsapp(waSet.value);
                    if (promoActiveSet) setPromoBannerActive(promoActiveSet.value === 'true');
                    if (promoTextSet) setPromoBannerText(promoTextSet.value);
                    if (promoThemeSet) setPromoBannerTheme(promoThemeSet.value);

                    if (slideshowSet && slideshowSet.value) {
                        try {
                            const parsed = JSON.parse(slideshowSet.value);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setSlideshowList(parsed);
                            }
                        } catch (e) {}
                    }
                    if (bestSellerSet && bestSellerSet.value) {
                        try {
                            const parsed = JSON.parse(bestSellerSet.value);
                            if (parsed && typeof parsed === 'object') {
                                setBestSellerConfig(parsed);
                            }
                        } catch (e) {}
                    }
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
                            description: cleanPackageDescription(appt.packages?.description || packages.find(p => p.title === appt.package_name)?.description || ''),
                            image: appt.packages?.image_url || packages.find(p => p.title === appt.package_name)?.image_url || "/logo.png"
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchUserOrders();
            })
            .subscribe();

        const progressChannel = supabase
            .channel('client-progress-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'editor_assignments' }, () => {
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

    const calculateEstimation = (pkgTitle, photoSelectionDateStr, pkgCategory) => {
        if (!photoSelectionDateStr) return null;
        const dateObj = new Date(photoSelectionDateStr);
        if (isNaN(dateObj.getTime())) return null;

        const mainCat = getMainCategory(pkgCategory);
        const isStudio = mainCat === MAIN_CATEGORIES.PHOTO_STUDIO;

        const lowerPkg = (pkgTitle || '').toLowerCase();
        const is60Days = ['delta', 'centro', 'bravo', 'platinum', 'gold combo', 'royal'].some(keyword => lowerPkg.includes(keyword));
        const daysToAdd = isStudio ? 7 : (is60Days ? 60 : 30);

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
            is60Days,
            isStudio
        };
    };

    const bestSellerPackages = React.useMemo(() => {
        // Prioritaskan pilihan admin dari Pengaturan Sistem jika ada
        const customIds = bestSellerConfig[mainCategory];
        if (Array.isArray(customIds) && customIds.length > 0) {
            const customPkgs = customIds
                .map(id => packages.find(p => String(p.id) === String(id) && p.is_active !== false))
                .filter(Boolean);
            if (customPkgs.length > 0) {
                return customPkgs;
            }
        }

        // Fallback default logic
        return packages
            .filter(pkg => pkg.is_active !== false)
            .filter(pkg => getMainCategory(pkg.category) === mainCategory)
            .filter(pkg => {
                if (mainCategory === MAIN_CATEGORIES.WEDDING) {
                    const bestSellerTitles = ["delta", "centro", "bravo", "platinum", "royal", "gold", "silver", "prewed package 2"];
                    return bestSellerTitles.some(title => pkg.title.toLowerCase().includes(title));
                }
                return true;
            })
            .slice(0, 6)
            .sort((a, b) => getDiscountedPriceInfo(b).price - getDiscountedPriceInfo(a).price);
    }, [bestSellerConfig, mainCategory, packages]);

    const handleCardClick = React.useCallback((pkg) => {
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
        setExtraPackages([]);
        setShowCrossPkgBox(false);
        setSelectedCrossPkgTitle('');
    }, []);

    const handleSeeAllPackages = React.useCallback(() => {
        setActiveTab('package');
        setView('home');
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, []);

    const handleNameInputChange = (e) => {
        setBookingName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
    };

    const handlePhoneInputChange = (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        // Otomatis buang awalan angka 0 agar cocok dengan prefix negara (+62/+60)
        if (val.startsWith('0')) {
            val = val.replace(/^0+/, '');
        }
        setBookingPhone(val);
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
            let data = null;

            // 1. Prioritaskan API Backend resmi (Case-Insensitive 100% aman: huruf besar/kecil dianggap sama)
            try {
                const apiRes = await fetch('/api/client/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: loginBookingId.trim().toUpperCase(),
                        password: loginPassword.trim()
                    })
                });
                const apiData = await apiRes.json();
                if (apiRes.ok && apiData.success && apiData.client) {
                    data = apiData.client;
                }
            } catch (apiErr) {
                console.warn('[Client Login API Warn, fallback to RPC]', apiErr);
            }

            // 2. Fallback Supabase RPC (coba input asli, lowercase, & uppercase)
            if (!data) {
                const cleanInput = loginPassword.trim();
                const variants = Array.from(new Set([cleanInput, cleanInput.toLowerCase(), cleanInput.toUpperCase()]));
                for (const variant of variants) {
                    const { data: rpcData } = await supabase.rpc('login_booking_id', {
                        p_booking_id: loginBookingId.trim().toUpperCase(),
                        p_password: variant
                    });
                    if (rpcData && rpcData.length > 0) {
                        data = rpcData[0];
                        break;
                    }
                }
            }

            if (!data) {
                showToast('Booking ID atau Sandi tidak valid. Silakan periksa kembali.', 'error');
            } else {
                // Save to localStorage for persistence
                localStorage.setItem('bookingSession', JSON.stringify({
                    isLoggedIn: true,
                    email: data.client_email || '',
                    name: data.client_name || 'Klien',
                    bookingId: data.id || loginBookingId.trim().toUpperCase(),
                    client_password: data.client_password || loginPassword.trim()
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

    // Helper untuk memvalidasi dan mengecek sisa kuota slot tanggal secara real-time
    const validateAndCheckSlot = async (dateStr, fieldLabel = 'Tanggal Acara') => {
        if (!dateStr) return false;

        const mainCat = selectedPkg ? getMainCategory(selectedPkg.category) : MAIN_CATEGORIES.WEDDING;
        const isPhotoStudio = mainCat === MAIN_CATEGORIES.PHOTO_STUDIO;
        const lookupDate = getShiftedDateClient(dateStr, mainCat);
        const checkDate = dateAvailability[lookupDate];
        const limitSlots = checkDate?.max || (isPhotoStudio ? 12 : 2);

        const formatDmy = (d) => {
            if (!d) return '';
            const parts = d.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return d;
        };
        const dateFormatted = formatDmy(dateStr);

        // 1. Cek apakah tanggal ditutup oleh Admin
        if (checkDate && checkDate.closed) {
            showToast(`Mohon maaf, ${fieldLabel} (${dateFormatted}) telah DITUTUP oleh Admin! Silakan cari tanggal lain.`, "error");
            return false;
        }

        // 2. Cek kuota booking di database
        if (isPhotoStudio) {
            try {
                let data = null;
                try {
                    const res = await fetch(`/api/public/booked-slots/${dateStr}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success && Array.isArray(json.bookedSlots)) {
                            data = json.bookedSlots;
                        }
                    }
                } catch (e) { }

                if (!data) {
                    const resSup = await supabase
                        .from('appointments')
                        .select('jam_akad, additional_notes, package_name')
                        .eq('event_date', dateStr);
                    data = resSup.data;
                }

                if (data) {
                    const bookings = data.map(d => {
                        const jam = d.jam_akad ? d.jam_akad.slice(0, 5) : '';
                        const match = d.additional_notes ? d.additional_notes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/) : null;
                        const room = match ? match[1].trim() : '';

                        let duration = 45;
                        if (d.additional_notes) {
                            const durMatch = d.additional_notes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
                            if (durMatch) duration = parseInt(durMatch[1].trim(), 10);
                        }
                        if (!d.additional_notes || !d.additional_notes.includes('[DURASI SESI]')) {
                            const pkgObj = packages.find(p => p.title === d.package_name);
                            if (pkgObj) duration = getPackageDuration(pkgObj);
                        }
                        if (d.additional_notes) {
                            const addTimeMatch = d.additional_notes.match(/- Tambahan Durasi: \+(\d+) Menit/i);
                            if (addTimeMatch) duration += parseInt(addTimeMatch[1], 10);
                        }
                        return { jam, room, duration };
                    }).filter(b => b.jam !== '');
                    setDayBookings(bookings);

                    if (bookings.length >= limitSlots) {
                        showToast(`Maaf, seluruh slot photoshoot pada tanggal ${dateFormatted} sudah PENUH! Silakan cari tanggal lain.`, "error");
                        return false;
                    }
                    const sisa = limitSlots - bookings.length;
                    showToast(`Tanggal ${dateFormatted} tersedia! Tersisa ${sisa} slot. Silakan pilih jam photoshoot di bawah.`, "success");
                    return true;
                }
            } catch (err) {
                console.error("Error fetching studio bookings:", err);
            }
            showToast(`Tanggal ${dateFormatted} tersedia! Silakan pilih jam photoshoot di bawah.`, "success");
            return true;
        } else {
            try {
                let data = null;
                try {
                    const res = await fetch(`/api/public/booked-slots/${dateStr}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success && Array.isArray(json.nonStudioAppointments)) {
                            data = json.nonStudioAppointments;
                        }
                    }
                } catch (e) { }

                if (!data) {
                    const resSup = await supabase
                        .from('appointments')
                        .select('package_name')
                        .or(`event_date.eq.${dateStr},resepsi_date.eq.${dateStr},prewed_date.eq.${dateStr}`);
                    data = resSup.data;
                }

                let bookedCount = 0;
                if (data) {
                    bookedCount = data.filter(d => {
                        const pkgObj = packages.find(p => p.title === d.package_name);
                        return pkgObj && getMainCategory(pkgObj.category) === mainCat;
                    }).length;
                } else if (checkDate) {
                    bookedCount = checkDate.slots || 0;
                }

                if (bookedCount >= limitSlots) {
                    showToast(`Maaf, slot untuk ${fieldLabel} (${dateFormatted}) sudah PENUH! Silakan cari tanggal lain.`, "error");
                    return false;
                } else {
                    const sisa = limitSlots - bookedCount;
                    showToast(`Tanggal ${dateFormatted} tersedia! Tersisa ${sisa} slot lagi.`, "success");
                    return true;
                }
            } catch (err) {
                const sisa = checkDate ? Math.max(0, limitSlots - checkDate.slots) : limitSlots;
                if (sisa <= 0) {
                    showToast(`Maaf, slot untuk ${fieldLabel} (${dateFormatted}) sudah PENUH! Silakan cari tanggal lain.`, "error");
                    return false;
                }
                showToast(`Tanggal ${dateFormatted} tersedia! Tersisa ${sisa} slot lagi.`, "success");
                return true;
            }
        }
    };

    const handleDateChange = async (e) => {
        const val = e.target.value;
        if (!val) {
            setSelectedEventDate('');
            setSelectedTimeSlot('');
            setDayBookings([]);
            return;
        }
        const isValid = await validateAndCheckSlot(val, 'Tanggal Acara / Akad');
        if (isValid) {
            setSelectedEventDate(val);
            setSelectedTimeSlot('');
        } else {
            e.target.value = '';
            setSelectedEventDate('');
            setSelectedTimeSlot('');
            setDayBookings([]);
        }
    };

    const handlePrewedDateChange = async (e) => {
        const val = e.target.value;
        if (!val) {
            setSelectedPrewedDate('');
            return;
        }
        const isValid = await validateAndCheckSlot(val, 'Tanggal Prewed');
        if (isValid) {
            setSelectedPrewedDate(val);
        } else {
            e.target.value = '';
            setSelectedPrewedDate('');
        }
    };

    const handleResepsiDateChange = async (e) => {
        const val = e.target.value;
        if (!val) {
            setSelectedResepsiDate('');
            return;
        }
        const isValid = await validateAndCheckSlot(val, 'Tanggal Resepsi');
        if (isValid) {
            setSelectedResepsiDate(val);
        } else {
            e.target.value = '';
            setSelectedResepsiDate('');
        }
    };

    const handleNextStep3 = () => {
        if (bookingName.trim().length < 3) {
            return showToast("Nama pemesan minimal 3 karakter!", "error");
        }
        if (!/^\d+$/.test(bookingPhone.replace(/\+/g, ''))) {
            return showToast("Nomor telepon hanya boleh berisi angka!", "error");
        }
        const cleanPhone = bookingPhone.replace(/\D/g, '');
        if (cleanPhone.length < 9 || cleanPhone.length > 14) {
            return showToast("Nomor telepon tidak valid (minimal 9, maksimal 14 angka).", "error");
        }
        if (userEmail && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(userEmail)) {
            return showToast("Format email tidak valid!", "error");
        }
        if (bookingAddress.trim().length < 5) {
            return showToast("Alamat terlalu pendek, mohon lengkapi alamat Anda.", "error");
        }
        setBookingStep(4);
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
        const limitSlots = checkDate?.max || 2;

        if (checkDate) {
            if (checkDate.closed) return showToast("Mohon maaf, tanggal tersebut ditutup oleh Admin!", "error");
            if (!isPhotoStudio && checkDate.slots >= limitSlots) return showToast(`Maaf tanggal sudah full.`, "error");
        }

        const getAddonsPrice = () => {
            let price = 0;
            if (addonPeople && STUDIO_ADDONS_PRICING.people[addonPeople]) {
                price += STUDIO_ADDONS_PRICING.people[addonPeople];
            }
            if (addonTime && STUDIO_ADDONS_PRICING.time[addonTime]) {
                price += STUDIO_ADDONS_PRICING.time[addonTime];
            }
            if (addonPrint && STUDIO_ADDONS_PRICING.print[addonPrint]) {
                price += STUDIO_ADDONS_PRICING.print[addonPrint];
            }
            if (addonFrame && STUDIO_ADDONS_PRICING.frame[addonFrame]) {
                price += STUDIO_ADDONS_PRICING.frame[addonFrame];
            }
            return price;
        };

        const priceInfo = getDiscountedPriceInfo(selectedPkg);
        const addonsTotal = isPhotoStudio ? getAddonsPrice() : selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
        const extraPkgsTotal = extraPackages.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
        const extraPkgsDp = extraPackages.reduce((sum, p) => sum + calculateMinDp(p, getMainCategory(p.category), Number(p.price || 0)), 0);
        const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal + extraPkgsTotal;
        const primaryDp = calculateMinDp(selectedPkg, mainCat, Number(priceInfo.price) + addonsTotal);
        const dpMin = Math.min(primaryDp + extraPkgsDp, finalPrice);

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

        if (extraPackages.length > 0) {
            formattedNotes += `[PAKET TAMBAHAN]:\n` + extraPackages.map(p => `- ${p.title} (${formatRupiah(p.price)})`).join('\n') + `\n\n`;
        }

        if (!isPhotoStudio && selectedAddons.length > 0) {
            formattedNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + selectedAddons.map(a => `- ${a.label} (${formatRupiah(a.price)})`).join('\n') + `\n\n`;
        }
        if (bookingNotes && bookingNotes.trim() !== "") {
            formattedNotes += `[KETERANGAN TAMBAHAN]:\n${bookingNotes.trim()}`;
        }

        if (isPhotoStudio) {
            // Validasi double booking sebelum insert ke database untuk mencegah bentrok
            let checkAppts = null;
            try {
                const res = await fetch(`/api/public/booked-slots/${eventDate}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.bookedSlots)) {
                        checkAppts = json.bookedSlots;
                    }
                }
            } catch (e) { }

            if (!checkAppts) {
                const resSup = await supabase
                    .from('appointments')
                    .select('jam_akad, additional_notes, package_name, status')
                    .eq('event_date', eventDate);
                checkAppts = resSup.data;
            }

            if (checkAppts) {
                const duration = getPackageDuration(selectedPkg);
                let totalDuration = duration;
                if (addonTime !== 'Tanpa Tambahan Waktu') {
                    const addTimeMatch = addonTime.match(/\+(\d+)\s*Menit/i);
                    if (addTimeMatch) totalDuration += parseInt(addTimeMatch[1], 10);
                }

                const mapRoomKey = (name) => {
                    if (!name) return '';
                    const t = name.toLowerCase().trim();
                    if (t.includes('studio white') || t.includes('limbo') || t.includes('room a') || t.includes('room 1')) return 'limbo';
                    if (t.includes('luxury') || t.includes('room b') || t.includes('room 2')) return 'luxury';
                    if (t.includes('colorful') || t.includes('modern') || t.includes('room c') || t.includes('room 3')) return 'modern';
                    if (t.includes('classic') || t.includes('abstrak') || t.includes('kubah') || t.includes('room d') || t.includes('room 4')) return 'abstrak';
                    if (t.includes('outdoor') || t.includes('garden') || t.includes('custom') || t.includes('room e') || t.includes('room 5')) return 'custom';
                    return t;
                };

                const slotStart = timeToMinutes(selectedTimeSlot);
                const slotEnd = slotStart + totalDuration;
                const selectedKey = mapRoomKey(selectedRoom);

                const isConflict = checkAppts.some(d => {
                    // Abaikan pesanan yang dibatalkan
                    if (d.status === 'Dibatalkan' || d.status === 'Batal') return false;

                    let jam = d.jam_akad ? d.jam_akad.slice(0, 5) : '';
                    const jamMatch = d.additional_notes ? d.additional_notes.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i) : null;
                    if (jamMatch) jam = jamMatch[1].trim();
                    if (!jam) return false;

                    const match = d.additional_notes ? d.additional_notes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i) : null;
                    const room = match ? match[1].trim() : '';
                    if (mapRoomKey(room) !== selectedKey) return false;

                    let bDuration = 45;
                    if (d.additional_notes) {
                        const durMatch = d.additional_notes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
                        if (durMatch) bDuration = parseInt(durMatch[1].trim(), 10);
                    }
                    if (!d.additional_notes || !d.additional_notes.includes('[DURASI SESI]')) {
                        const pkgObj = packages.find(p => p.title === d.package_name);
                        if (pkgObj) bDuration = getPackageDuration(pkgObj);
                    }
                    if (d.additional_notes) {
                        const addTimeMatch = d.additional_notes.match(/- Tambahan Durasi: \+(\d+) Menit/i);
                        if (addTimeMatch) bDuration += parseInt(addTimeMatch[1], 10);
                    }

                    const bookingStart = timeToMinutes(jam);
                    const bookingEnd = bookingStart + bDuration + 10; // Jeda break 10 menit antar sesi
                    return slotStart < bookingEnd && (slotEnd + 10) > bookingStart;
                });

                if (isConflict) {
                    showToast("Maaf, slot waktu dan room ini baru saja dibooking oleh klien lain. Silakan pilih jadwal lain.", "error");
                    setBookingStep(2);
                    return;
                }
            }
        }

        // Generate Booking ID (8-digit combination)
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code8 = '';
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const bytes = new Uint8Array(8);
            crypto.getRandomValues(bytes);
            for (let i = 0; i < 8; i++) code8 += chars[bytes[i] % chars.length];
        } else {
            for (let i = 0; i < 8; i++) code8 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const bookingId = `BK-${code8}`;
        // Generate a simple password for Booking ID login
        const clientPassword = Math.random().toString(36).slice(-6).toUpperCase();

        const cleanDigits = bookingPhone.trim().replace(/^(\+?62|0)+/, '');
        const fullPhone = `${phoneCountryCode}${cleanDigits}`;

        const customFeesData = extraPackages.map(p => ({
            name: p.title,
            amount: Number(p.price || 0)
        }));

        const newApptData = {
            id: bookingId,
            client_name: bookingName,
            client_email: userEmail,
            client_phone: fullPhone,
            client_address: bookingAddress || '-',
            additional_notes: formattedNotes,
            package_name: selectedPkg.title,
            custom_fees: customFeesData,
            event_date: eventDate || null,
            resepsi_date: resepsiDate || null,
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
            const currentAvail = dateAvailability[lDate] || { slots: 0, max: 2, closed: false };
            await supabase.from('date_availability').upsert([{
                date: lDate,
                slots_booked: currentAvail.slots + 1,
                max_slots: currentAvail.max || 2,
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
                dateMap[eventDateKey] = { slots: Number(d.slots_booked), closed: d.is_manually_closed, max: d.max_slots || 2 };
            });
            setDateAvailability(dateMap);
        }

        // Redirect immediately to payment
        const division = selectedPkg ? getMainCategory(selectedPkg.category) : 'Wedding';
        handleBayarDP(bookingId, dpMin, bookingName, userEmail, division);
    };

    const handleBayarDP = async (orderId, amount, clientName, clientEmail, division = 'Wedding') => {
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
                    division: division,
                    callback_url: window.location.origin + '/'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.payment_url) {
                    setInAppPaymentData({
                        orderId: orderId,
                        amount: amount,
                        paymentUrl: data.payment_url,
                        snapToken: data.snap_token,
                        qrUrl: data.qr_url,
                        qrString: data.qr_string,
                        expiryTime: data.expiry_time,
                        gateway: data.gateway,
                        clientKey: data.client_key,
                        isProduction: data.is_production,
                        pkgTitle: selectedPkg ? selectedPkg.title : 'Paket 18Studio',
                        eventDate: selectedEventDate,
                        clientName: clientName,
                        clientEmail: clientEmail,
                        roomStudio: selectedRoom,
                        jamSesi: selectedTimeSlot,
                        totalPrice: amount,
                        dpAmount: amount
                    });
                    setIsInAppPaymentOpen(true);
                } else {
                    showToast("Gagal memproses pembayaran.", "error");
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                showToast(errData.error || "Gagal menghubungi server pembayaran.", "error");
                if (response.status === 409) {
                    setBookingStep(2);
                }
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
                description: cleanPackageDescription(order.pkg.description || '')
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
        window.open(`/invoice.html?id=${order.id}&preview=true`, '_blank');
    };

    if (loading) {
        return (
            <div className={`w-full bg-black flex flex-col items-center justify-center text-white ${loadingFadingOut ? 'animate-fade-out' : ''}`} style={{ height: 'var(--app-height)' }}>
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-sm tracking-wider">Loading {studioName}...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full mx-auto overflow-hidden bg-[#e8faf7] dark:bg-[#062427] max-w-md text-slate-900 dark:text-white animate-fade-in" style={{ height: 'var(--app-height)' }}>
            {toast.show && (
                <div className="absolute top-5 left-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                        toast.type === 'success' 
                            ? 'bg-[#041a13]/95 border-emerald-500/40 text-emerald-300 shadow-[0_8px_30px_rgba(16,185,129,0.3)]' 
                            : 'bg-[#200609]/95 border-rose-500/40 text-rose-300 shadow-[0_8px_30px_rgba(244,63,94,0.3)]'
                    }`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                            <SvgIcon name={toast.type === 'success' ? "check-circle" : "alert-circle"} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-semibold text-white leading-snug break-words">{toast.message}</p>
                        </div>
                        <button type="button" onClick={() => setToast({ show: false, message: '', type: 'success' })} className="w-6 h-6 rounded-lg bg-white/5 text-gray-400 hover:text-white flex items-center justify-center">
                            <SvgIcon name="x" className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {isNotifOpen && (
                <div
                    onClick={() => setIsNotifOpen(false)}
                    className="fixed inset-0 bg-[#021214]/65 dark:bg-[#021214]/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-sm rounded-[28px] p-5 overflow-hidden bg-gradient-to-b from-white/95 to-[#e8faf7]/95 dark:from-[#083337]/92 dark:to-[#041d20]/95 backdrop-blur-2xl border border-teal-400/40 dark:border-teal-300/30 shadow-[0_20px_50px_rgba(2,18,20,0.75),0_0_25px_rgba(45,212,191,0.18)] animate-in zoom-in-95 duration-200"
                    >
                        {/* Top glowing line accent */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#2dd4bf] to-transparent"></div>
                        {/* Ambient teal glow inside modal */}
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-teal-400/20 rounded-full blur-2xl pointer-events-none"></div>

                        <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-teal-500/15 dark:border-teal-300/15">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-[#0d9488]/15 dark:bg-[#0d9488]/25 border border-teal-400/40 flex items-center justify-center shadow-[0_0_12px_rgba(45,212,191,0.25)] shrink-0">
                                    <SvgIcon name="bell" className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white leading-tight">
                                        Notifikasi & Promo
                                    </h3>
                                    <p className="text-[10px] font-semibold text-teal-700/80 dark:text-teal-200/70">
                                        Update pesanan & penawaran spesial
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNotifOpen(false)}
                                className="w-8 h-8 rounded-full bg-teal-500/10 dark:bg-[#0b3d42]/80 border border-teal-400/30 text-slate-600 dark:text-teal-100 hover:bg-teal-500 hover:text-white flex items-center justify-center transition shadow-sm cursor-pointer"
                            >
                                <SvgIcon name="x" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative z-10 space-y-2.5 max-h-80 overflow-y-auto pr-1 hide-scrollbar">
                            {isPromoActive && (
                                <div className="bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 border border-teal-400/35 p-3.5 rounded-2xl flex flex-col gap-1.5 text-left shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-extrabold text-[#0d9488] dark:text-[#2dd4bf] tracking-wider uppercase flex items-center gap-1">
                                            <span>🔥</span> Promo Khusus
                                        </span>
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/30">
                                            AKTIF
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-teal-50/90 leading-relaxed">
                                        Gunakan kode diskon <strong className="font-mono text-amber-600 dark:text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded">18STUDIO</strong> saat pemesanan untuk potongan langsung Rp 200.000!
                                    </p>
                                </div>
                            )}

                            {orders.length > 0 ? orders.map((order, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white/75 dark:bg-[#0a383c]/75 hover:dark:bg-[#0d4348]/85 border border-teal-400/30 dark:border-teal-300/25 p-3.5 rounded-2xl flex flex-col gap-1.5 text-left shadow-[0_4px_14px_rgba(2,18,20,0.2)] transition"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10.5px] font-mono font-bold text-teal-800/80 dark:text-teal-200/85">
                                            Order ID: #{order.id}
                                        </span>
                                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                            order.status === 'Lunas'
                                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-[#2dd4bf] border-emerald-400/35'
                                                : order.status === 'Sudah DP'
                                                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/35'
                                                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/35'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-white/95 leading-snug">
                                        Pesanan paket <strong className="text-[#0f766e] dark:text-[#5eead4] font-extrabold">{order.pkg.title}</strong> Anda telah tercatat.
                                    </p>
                                    <p className="text-[10.5px] text-slate-500 dark:text-teal-100/70 leading-relaxed">
                                        {order.status === 'Menunggu DP'
                                            ? `Silakan selesaikan pembayaran DP sebesar ${formatRupiah(order.dp)} untuk mengunci jadwal pemotretan.`
                                            : 'Terima kasih telah melakukan pembayaran, jadwal pemotretan Anda aman.'}
                                    </p>
                                </div>
                            )) : (
                                <div className="text-center py-8 px-4 rounded-2xl bg-white/50 dark:bg-[#093236]/50 border border-teal-400/20 text-slate-500 dark:text-teal-200/70 text-xs">
                                    Belum ada pemesanan aktif saat ini.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Symmetrical Smooth Ambient Teal Background (Zero Black Side on Left/Right) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-500" style={{ background: 'var(--theme-ambient-gradient)' }}>
                <div className="absolute top-12 -left-16 w-80 h-80 bg-teal-400/15 dark:bg-[#0f5259]/35 rounded-full blur-[110px] pointer-events-none"></div>
                <div className="absolute top-1/3 -right-16 w-80 h-80 bg-teal-500/15 dark:bg-[#0f5259]/35 rounded-full blur-[110px] pointer-events-none"></div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-96 h-72 bg-emerald-400/15 dark:bg-[#0d4a50]/35 rounded-full blur-[110px] pointer-events-none"></div>
            </div>

            <div ref={scrollContainerRef} className="relative z-10 w-full h-full overflow-y-auto hide-scrollbar pb-nav scroll-smooth">

                {view === 'home' && (
                    <div>
                        {/* === SHARED HEADER: Seamless Transparent Glass over Hero matching Reference === */}
                        <div className={`sticky top-0 z-40 px-5 pt-3.5 pb-3 transition-all ${
                            activeTab === 'beranda'
                                ? 'bg-gradient-to-b from-white/90 via-white/55 to-transparent dark:from-[#042023]/95 dark:via-[#042023]/65 dark:to-transparent backdrop-blur-[6px]'
                                : 'bg-white/85 dark:bg-[#052225]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-teal-400/15'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col items-start select-none">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none drop-shadow-sm">
                                            ByLapanbelasid
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] dark:bg-[#5eead4] shadow-[0_0_8px_#5eead4]"></span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <svg className="w-3 h-3 text-[#0d9488] dark:text-[#2dd4bf] shrink-0 fill-current" viewBox="0 0 24 24">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                                        </svg>
                                        <span className="text-[9.5px] font-extrabold tracking-wider text-[#0f766e] dark:text-teal-200/90 uppercase whitespace-nowrap">
                                            ACEH | MEDAN - INDONESIA
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Theme Switcher Button (Dark / Light Mode) */}
                                    <ThemeToggle />

                                    {/* Notification Bell Button */}
                                    <button
                                        type="button"
                                        onClick={handleOpenNotifs}
                                        className="w-9 h-9 rounded-full bg-white/80 dark:bg-[#0b3b3f]/80 border border-teal-300/50 dark:border-teal-300/35 flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-[0_0_14px_rgba(45,212,191,0.2)]"
                                        aria-label="Notifikasi"
                                    >
                                        <SvgIcon name="bell" className="w-4 h-4 text-slate-800 dark:text-white" />
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#062427]"></span>
                                        {totalUnreadNotifs > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-lg border border-black/20 z-10">
                                                {totalUnreadNotifs}
                                            </span>
                                        )}
                                    </button>

                                    {/* User Profile Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleTabClick('profile')}
                                        className="w-9 h-9 rounded-full bg-[#094245] dark:bg-[#0b3b3f]/80 border border-teal-400/40 dark:border-teal-300/35 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-[0_0_14px_rgba(45,212,191,0.2)]"
                                        aria-label="Profil"
                                    >
                                        <SvgIcon name="user" className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>{/* === END SHARED HEADER === */}

                        {/* TAB VIEWS */}
                        <div className="w-full">
                        {/* =========== TAB: BERANDA (100% Exact Gradient & Full-Bleed Hero matching Reference) =========== */}
                        {activeTab === 'beranda' && (
                        <div className="w-full pb-16 animate-in fade-in duration-150">
                            {/* === 1. FULL-BLEED SEAMLESS HERO BANNER (No Box Cut, Melts into Header & Search Bar) === */}
                            <div 
                                className="relative w-full h-[395px] sm:h-[415px] -mt-[62px] overflow-hidden select-none group"
                                onTouchStart={(e) => {
                                    e.stopPropagation();
                                    handleSlideTouchStart(e);
                                }}
                                onTouchMove={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => {
                                    e.stopPropagation();
                                    handleSlideTouchEnd(e);
                                }}
                                style={{ touchAction: 'pan-x pan-y' }}
                            >
                                <div 
                                    className="flex h-full transition-transform duration-500 ease-out"
                                    style={{ 
                                        width: `${slideshowList.length * 100}%`,
                                        transform: `translateX(-${currentSlide * (100 / (slideshowList.length || 1))}%)` 
                                    }}
                                >
                                    {slideshowList.map((slide, sIdx) => {
                                        const referenceHeroImages = [
                                            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85",
                                            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85",
                                            "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85"
                                        ];
                                        // Gunakan foto pasangan pengantin hangat sesuai gambar referensi pada slide utama
                                        const heroImg = (sIdx === 0 || !slide.image || slide.image === '/logo.png')
                                            ? referenceHeroImages[sIdx % referenceHeroImages.length]
                                            : slide.image;
                                        return (
                                            <div key={slide.id || sIdx} className="relative h-full select-none" style={{ width: `${100 / (slideshowList.length || 1)}%` }}>
                                                <img
                                                    src={heroImg}
                                                    alt={slide.title || "Promo Banner"}
                                                    className="w-full h-full object-cover object-[center_22%]"
                                                />
                                                {/* Top Gradient: Blends top of photo smoothly into Header */}
                                                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#e8faf7] via-[#e8faf7]/65 to-transparent dark:from-[#052225] dark:via-[#052225]/65 dark:to-transparent pointer-events-none"></div>

                                                {/* Side Vignette Gradient: Softens left & right edges */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#e8faf7]/35 via-transparent to-[#e8faf7]/35 dark:from-[#052225]/55 dark:via-transparent dark:to-[#052225]/55 pointer-events-none"></div>

                                                {/* Multi-Stop Bottom Gradient: Melts bottom of photo 100% seamlessly into Canvas */}
                                                <div
                                                    className="absolute inset-x-0 bottom-0 h-[62%] pointer-events-none dark:hidden"
                                                    style={{
                                                        background: 'linear-gradient(to top, #e8faf7 0%, #e8faf7 12%, rgba(232,250,247,0.92) 28%, rgba(232,250,247,0.62) 50%, rgba(232,250,247,0.18) 74%, transparent 100%)'
                                                    }}
                                                ></div>
                                                <div
                                                    className="absolute inset-x-0 bottom-0 h-[64%] pointer-events-none hidden dark:block"
                                                    style={{
                                                        background: 'linear-gradient(to top, #062427 0%, #062427 12%, rgba(6,36,39,0.94) 28%, rgba(7,44,48,0.68) 50%, rgba(7,44,48,0.22) 74%, transparent 100%)'
                                                    }}
                                                ></div>

                                                {/* Hero Copywriting Overlay matching Reference */}
                                                <div className="absolute bottom-5 left-5 right-5 text-left z-10">
                                                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 text-slate-950 font-extrabold text-[10px] tracking-wider uppercase shadow-[0_4px_14px_rgba(245,158,11,0.4)] mb-2.5">
                                                        <span>⚡</span>
                                                        <span>PROMO AGUSTUS</span>
                                                    </div>
                                                    <p
                                                        className="text-[19px] sm:text-xl font-semibold italic text-[#0d9488] dark:text-[#2dd4bf] leading-tight mb-0.5 drop-shadow-sm"
                                                        style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
                                                    >
                                                        Indahnya Momen Bahagia
                                                    </p>
                                                    <h3 className="text-[26px] sm:text-[28px] font-extrabold text-slate-900 dark:text-white leading-[1.12] tracking-tight mb-2 drop-shadow-sm">
                                                        Cerita Indah,<br />Abadi, Berkesan.
                                                    </h3>
                                                    <p className="text-[11.5px] text-slate-600 dark:text-teal-50/90 leading-relaxed max-w-[92%]">
                                                        Dapatkan diskon Rp 100.000 untuk booking bulan ini! Special promo lock-date.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Content Wrapper below Full-Bleed Hero */}
                            <div className="px-4 -mt-1 relative z-20">
                                {/* === 2. SEARCH BAR & FILTER CAPSULE (Exact Luminous Cyan-Teal Rim & Glow) === */}
                                <div className="relative flex items-center mb-4">
                                    <div
                                        className="w-full flex items-center gap-3 pl-4 pr-14 py-3.5 rounded-full bg-white/95 dark:bg-transparent backdrop-blur-xl border border-teal-300/80 dark:border-[#2dd4bf]/40 shadow-[0_8px_24px_-4px_rgba(13,148,136,0.15)] dark:shadow-[0_10px_30px_-4px_rgba(2,18,20,0.75),inset_0_1px_1px_rgba(94,234,212,0.35)]"
                                        style={{
                                            backgroundImage: 'radial-gradient(ellipse 85% 120% at 30% 50%, rgba(17, 94, 99, 0.55) 0%, rgba(8, 47, 51, 0.85) 65%, rgba(5, 31, 34, 0.94) 100%)'
                                        }}
                                    >
                                        <svg className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleTabClick('package');
                                            }}
                                            placeholder="Cari paket wedding, studio, makeup..."
                                            className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-teal-100/70 focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleTabClick('package')}
                                        className="absolute right-1 w-11 h-11 rounded-full border border-teal-300/60 dark:border-[#5eead4]/55 text-white flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(45,212,191,0.35),inset_0_1px_2px_rgba(153,246,228,0.45)] hover:scale-105 active:scale-95 transition cursor-pointer"
                                        style={{
                                            background: 'radial-gradient(circle at 50% 25%, #16787e 0%, #0b464b 65%, #072c30 100%)'
                                        }}
                                        aria-label="Filter Paket"
                                    >
                                        <svg className="w-4 h-4 text-[#5eead4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16M8 5v4m8 1v4m-6 1v4" />
                                        </svg>
                                    </button>
                                </div>

                                {/* === 3. 4 KATEGORI UTAMA (Compact Squircle Cards with Top Cyan Spotlight Glow) === */}
                                <div
                                    className="grid grid-cols-4 gap-1.5 mb-5 p-1.5 rounded-[24px] bg-white/85 dark:bg-[#052023]/85 backdrop-blur-xl border border-teal-200/80 dark:border-teal-400/25 shadow-[0_8px_24px_-6px_rgba(2,18,20,0.65)]"
                                >
                                    {[
                                        { id: MAIN_CATEGORIES.WEDDING, label: "Lapanbelas" },
                                        { id: MAIN_CATEGORIES.PHOTO_STUDIO, label: "Studio" },
                                        { id: MAIN_CATEGORIES.MAKEUP, label: "Makeup" },
                                        { id: MAIN_CATEGORIES.DEKORASI, label: "Dekorasi" }
                                    ].map((cat) => {
                                        const isActive = mainCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                data-category={cat.id}
                                                onClick={() => {
                                                    setMainCategory(cat.id);
                                                    setActiveCategory("All");
                                                }}
                                                className={`relative flex flex-col items-center gap-1.5 py-2 px-1 rounded-[18px] border transition-all duration-300 cursor-pointer active:scale-95 overflow-hidden ${
                                                    isActive
                                                        ? 'border-[#5eead4]/55 shadow-[0_0_16px_rgba(45,212,191,0.22),inset_0_1px_2px_rgba(153,246,228,0.45)]'
                                                        : 'border-teal-200/70 dark:border-teal-400/25 shadow-[inset_0_1px_1px_rgba(94,234,212,0.25)] hover:border-teal-300/45'
                                                }`}
                                                style={{
                                                    background: isActive
                                                        ? 'radial-gradient(circle at 50% 0%, rgba(45, 212, 191, 0.45) 0%, rgba(12, 66, 71, 0.85) 55%, rgba(6, 34, 37, 0.95) 100%)'
                                                        : 'radial-gradient(circle at 50% 0%, rgba(45, 212, 191, 0.28) 0%, rgba(9, 50, 54, 0.78) 58%, rgba(5, 30, 33, 0.92) 100%)'
                                                }}
                                            >
                                                {/* Top Highlight Rim */}
                                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-[#5eead4]/70 blur-[0.5px]"></span>

                                                {/* Circular Glowing Icon Orb */}
                                                <div
                                                    className="w-9 h-9 rounded-full flex items-center justify-center border border-[#5eead4]/40 shadow-[0_0_14px_rgba(45,212,191,0.28)] transition-transform duration-300 group-hover:scale-105"
                                                    style={{
                                                        background: 'radial-gradient(circle at 50% 25%, rgba(20, 184, 166, 0.42) 0%, rgba(8, 45, 49, 0.92) 78%)'
                                                    }}
                                                >
                                                    {getCategoryIcon(cat.id)}
                                                </div>

                                                <span className="text-[10px] font-extrabold text-center tracking-tight text-slate-800 dark:text-white line-clamp-1">
                                                    {cat.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                            {/* === 4. BEST SELLER PACKAGE 2026 CAROUSEL === */}
                            <BestSellerCarousel
                                packages={bestSellerPackages}
                                activeIndex={activePackageIndex}
                                onActiveIndexChange={setActivePackageIndex}
                                onCardClick={handleCardClick}
                                onSeeAll={handleSeeAllPackages}
                                getDiscountedPriceInfo={getDiscountedPriceInfo}
                                formatHemat={formatHemat}
                                formatRupiah={formatRupiah}
                                SvgIcon={SvgIcon}
                            />

                            {/* === 5. BANNER JADIKAN KONSULTASI GRATIS (With Studio Interior Photo matching Reference) === */}
                            <div className="relative w-full mt-5 rounded-[24px] overflow-hidden shadow-lg border border-slate-200/80 dark:border-teal-400/25 group">
                                <img
                                    src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"
                                    alt="Studio 18 Consultation"
                                    className="absolute inset-0 w-full h-full object-cover object-right group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#062628] via-[#072d30]/90 to-black/25"></div>
                                <div className="relative z-10 p-4 text-left">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-extrabold uppercase tracking-wider">
                                        <span>🎗️</span>
                                        <span>STUDIO 18 • BEST DEAL</span>
                                    </div>
                                    <h4 className="text-[17px] font-extrabold text-white mt-1.5 leading-snug">
                                        Jadikan Konsultasi Gratis
                                    </h4>
                                    <p className="text-[11px] text-gray-200 mt-0.5 max-w-[78%] leading-relaxed">
                                        Diskusikan rencana pernikahan impianmu bersama tim profesional kami.
                                    </p>
                                    <a
                                        href={`https://wa.me/${adminWhatsapp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition"
                                    >
                                        <span>Hubungi Admin</span>
                                        <span className="text-sm leading-none">›</span>
                                    </a>
                                </div>
                            </div>

                            {/* === 6. GARANSI HASIL MEWAH & TERUKUR CARD === */}
                            <div
                                onClick={() => handleTabClick('package')}
                                className="w-full mt-3.5 p-3.5 rounded-[22px] bg-white/90 dark:bg-[#072224]/90 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-teal-400/50 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-teal-500/15 text-[#0d9488] dark:text-[#2dd4bf] flex items-center justify-center shrink-0 border border-teal-500/30">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                    <div className="text-left min-w-0">
                                        <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                            Garansi Hasil Mewah & Terukur!
                                        </h5>
                                        <p className="text-[10.5px] text-slate-500 dark:text-gray-300 truncate">
                                            Editing tone berkelas + flash drive eksklusif
                                        </p>
                                    </div>
                                </div>
                                <span className="text-slate-400 dark:text-teal-300 text-base font-bold shrink-0">›</span>
                            </div>
                            </div>
                        </div>
                        )}

                        {/* =========== TAB: PACKAGE (100% Matching Reference Katalog Mockup) =========== */}
                        {activeTab === 'package' && (
                        <div className="w-full px-4 pt-1 pb-12 animate-in fade-in duration-150">
                            {/* 1. HERO KATALOG BANNER */}
                            <div className="relative w-full h-[225px] rounded-[26px] overflow-hidden shadow-xl border border-slate-200/80 dark:border-teal-400/25 mb-3.5 group">
                                <img
                                    src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85"
                                    alt="Katalog Wedding Package"
                                    className="absolute inset-0 w-full h-full object-cover object-right group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#042224] via-[#062d30]/90 to-transparent"></div>
                                <div className="relative z-10 h-full p-5 flex flex-col justify-between text-left max-w-[68%]">
                                    <div>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/35 text-[#2dd4bf] text-[8.5px] font-extrabold uppercase tracking-wider">
                                            KATALOG {mainCategory === MAIN_CATEGORIES.PHOTO_STUDIO ? 'STUDIO' : mainCategory === MAIN_CATEGORIES.MAKEUP ? 'MAKEUP' : mainCategory === MAIN_CATEGORIES.DEKORASI ? 'DEKORASI' : 'WEDDING'} PACKAGE
                                        </span>
                                        <h2 className="text-xl sm:text-2xl font-bold text-[#2dd4bf] leading-tight mt-2">
                                            Abadikan Moment
                                            <span className="block font-serif text-white text-2xl sm:text-[26px] font-extrabold tracking-tight">
                                                Bahagia
                                            </span>
                                        </h2>
                                        <p className="text-[10.5px] text-gray-200 mt-1 leading-relaxed">
                                            Paket eksklusif untuk hari istimewa bersama Lapanbelas.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategory("All")}
                                        className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#093538]/90 hover:bg-[#0d464a] border border-teal-400/35 text-white text-[10.5px] font-bold shadow-md transition"
                                    >
                                        <span className="text-teal-300">▦</span>
                                        <span>Lihat Semua Paket</span>
                                        <span className="text-teal-300">→</span>
                                    </button>
                                </div>
                                {/* Dot Indicators */}
                                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                                    <span className="w-2 h-2 rounded-full bg-[#2dd4bf]"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                                </div>
                            </div>

                            {/* 2. SEARCH BAR + FILTER BUTTON */}
                            <div className="flex items-center gap-2.5 mb-3.5">
                                <div className="flex-1 flex items-center gap-2.5 h-11 px-4 rounded-full bg-white/95 dark:bg-[#082224]/90 border border-slate-200/90 dark:border-teal-400/25 shadow-sm backdrop-blur-md">
                                    <svg className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari paket wedding, studio, makeup..."
                                        className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="text-slate-400 hover:text-slate-600 dark:text-gray-400 text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveCategory("All")}
                                    className="w-11 h-11 rounded-full bg-[#0d6e6e] dark:bg-[#0a383a] border border-teal-400/35 text-white flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition shrink-0"
                                    title="Reset Filter"
                                >
                                    <svg className="w-4 h-4 text-white dark:text-[#2dd4bf]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M8 6v4m8 2v4m-6 2v2" />
                                    </svg>
                                </button>
                            </div>

                            {/* 3. HORIZONTAL CATEGORY CAPSULES */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {[
                                    { id: MAIN_CATEGORIES.WEDDING, label: "Lapanbelas" },
                                    { id: MAIN_CATEGORIES.PHOTO_STUDIO, label: "Studio" },
                                    { id: MAIN_CATEGORIES.MAKEUP, label: "Makeup" },
                                    { id: MAIN_CATEGORIES.DEKORASI, label: "Dekorasi" }
                                ].map((cat) => {
                                    const isActive = mainCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            data-category={cat.id}
                                            onClick={() => {
                                                setMainCategory(cat.id);
                                                setActiveCategory("All");
                                            }}
                                            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 ${
                                                isActive
                                                    ? 'bg-[#0d6e6e] dark:bg-[#0b4245] border-teal-400 text-white shadow-md shadow-teal-500/20'
                                                    : 'bg-white/90 dark:bg-[#072224]/85 border-slate-200/90 dark:border-teal-500/25 text-slate-700 dark:text-gray-300 hover:border-teal-400/40'
                                            }`}
                                        >
                                            <div className="w-4 h-4 flex items-center justify-center shrink-0 scale-75">
                                                {getCategoryIcon(cat.id)}
                                            </div>
                                            <span className={`text-[10.5px] font-bold truncate ${isActive ? 'text-white' : 'text-slate-700 dark:text-gray-200'}`}>
                                                {cat.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Subcategory Filter Chips */}
                            {(() => {
                                const subcats = getSubcategories(mainCategory, packages);
                                if (subcats.length <= 2) return null;
                                return (
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-2.5">
                                        {subcats.map((sub) => {
                                            const active = activeCategory === sub;
                                            return (
                                                <button
                                                    key={sub}
                                                    type="button"
                                                    onClick={() => setActiveCategory(sub)}
                                                    className={`px-3 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap transition border ${
                                                        active
                                                            ? 'bg-teal-500/20 border-teal-400 text-[#0d9488] dark:text-[#2dd4bf]'
                                                            : 'bg-white/70 dark:bg-[#061c1e]/70 border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-gray-400'
                                                    }`}
                                                >
                                                    {sub === 'All' ? 'Semua Kategori' : sub}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {/* 4. VERTICAL LIST OF HORIZONTAL PACKAGE CARDS (Matching Katalog Reference) */}
                            <div className="flex flex-col gap-3">
                                {(() => {
                                    const filteredList = packages
                                        .filter(pkg => {
                                            if (pkg.is_active === false) return false;
                                            if (getMainCategory(pkg.category) !== mainCategory) return false;
                                            if (activeCategory !== 'All' && pkg.category !== activeCategory) return false;
                                            if (searchQuery.trim() !== '') {
                                                const q = searchQuery.toLowerCase();
                                                return (
                                                    (pkg.title && pkg.title.toLowerCase().includes(q)) ||
                                                    (pkg.category && pkg.category.toLowerCase().includes(q)) ||
                                                    (pkg.description && pkg.description.toLowerCase().includes(q))
                                                );
                                            }
                                            return true;
                                        })
                                        .sort((a, b) => getDiscountedPriceInfo(b).price - getDiscountedPriceInfo(a).price);

                                    const badgeVariants = [
                                        { label: '🔥 BEST SELLER', cls: 'bg-gradient-to-r from-red-600 to-rose-500 text-white border-red-400/40' },
                                        { label: '👑 PREMIUM', cls: 'bg-[#093b3e]/95 text-[#2dd4bf] border-teal-400/40' },
                                        { label: '⭐ RECOMMENDED', cls: 'bg-amber-600/95 text-amber-100 border-amber-400/40' },
                                        { label: '★ NEW', cls: 'bg-teal-600/95 text-white border-teal-300/40' },
                                        { label: '💎 SPECIAL', cls: 'bg-indigo-600/95 text-indigo-100 border-indigo-400/40' },
                                    ];

                                    if (filteredList.length === 0) {
                                        return (
                                            <div className="p-8 rounded-[24px] bg-white/80 dark:bg-[#072224]/85 border border-slate-200 dark:border-teal-400/20 text-center">
                                                <p className="text-xs text-slate-500 dark:text-gray-300">Paket tidak ditemukan untuk pencarian ini.</p>
                                            </div>
                                        );
                                    }

                                    return filteredList.map((pkg, idx) => {
                                        const priceInfo = getDiscountedPriceInfo(pkg);
                                        const originalDisplay = priceInfo.original && priceInfo.original > priceInfo.price
                                            ? priceInfo.original
                                            : Math.round(priceInfo.price * 1.12 / 100000) * 100000;
                                        const badge = badgeVariants[idx % badgeVariants.length];

                                        return (
                                            <div
                                                key={pkg.id || idx}
                                                onClick={() => handleCardClick(pkg)}
                                                className="p-2.5 rounded-[24px] bg-white/90 dark:bg-[#072427]/90 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-md hover:border-teal-400/60 active:scale-[0.99] transition-all duration-200 flex items-center gap-3.5 cursor-pointer group"
                                            >
                                                {/* Left Thumbnail with Badge & Heart */}
                                                <div className="relative w-[132px] sm:w-[146px] h-[106px] rounded-[18px] overflow-hidden shrink-0 bg-slate-900">
                                                    <img
                                                        src={pkg.image_url}
                                                        alt={pkg.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15"></div>
                                                    {/* Top Left Badge */}
                                                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border shadow-sm ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                    {/* Top Right Heart Icon */}
                                                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/35 backdrop-blur-md border border-white/25 text-white flex items-center justify-center">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                        </svg>
                                                    </span>
                                                </div>

                                                {/* Right Details */}
                                                <div className="flex-1 flex flex-col justify-between text-left min-w-0 py-0.5 h-[102px]">
                                                    <div>
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-300 truncate">
                                                                {pkg.category || 'Wedding Package'}
                                                            </span>
                                                            {idx === 0 && (
                                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-[#0d9488] dark:text-[#2dd4bf] text-[8px] font-bold shrink-0">
                                                                    <span>★</span> Paling Populer
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white leading-snug truncate mt-0.5">
                                                            {pkg.title}
                                                        </h3>
                                                    </div>

                                                    <div className="flex items-end justify-between gap-2 pt-1">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-slate-400 dark:text-gray-400 line-through leading-none mb-1">
                                                                {formatRupiah(originalDisplay)}
                                                            </p>
                                                            <p className="text-[15px] sm:text-base font-extrabold text-[#0d9488] dark:text-[#2dd4bf] leading-none tracking-tight">
                                                                {formatRupiah(priceInfo.price)}
                                                            </p>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-[#0d6e6e] dark:bg-[#0c3b3e] border border-teal-400/40 text-white dark:text-[#2dd4bf] flex items-center justify-center shadow-md group-hover:scale-105 transition shrink-0">
                                                            <span className="text-lg leading-none font-medium">+</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* 5. BOTTOM BANTUAN & GARANSI CARDS (Matching Reference Katalog Bottom) */}
                            <div className="mt-4 p-4 rounded-[24px] bg-white/90 dark:bg-[#072427]/90 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-sm flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 text-left">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-400/30 text-[#0d9488] dark:text-[#2dd4bf] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8m16 0V8a2 2 0 00-2-2h-3.5M4 12V8a2 2 0 012-2h3.5m5 0a2.5 2.5 0 10-5 0m5 0a2.5 2.5 0 11-5 0m2.5 0v14" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                                            Butuh bantuan dengan pesanan Anda?
                                        </h4>
                                        <p className="text-[10px] text-slate-500 dark:text-gray-300 mt-0.5 line-clamp-2">
                                            Konsultasikan jadwal atau perubahan konsep bersama tim kami.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://wa.me/${adminWhatsapp}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2 rounded-full bg-[#0d6e6e] dark:bg-[#0b3d40] border border-teal-400/40 text-white dark:text-[#2dd4bf] text-[10.5px] font-bold whitespace-nowrap shrink-0 hover:brightness-110 transition"
                                >
                                    Hubungi Admin →
                                </a>
                            </div>

                            <div className="mt-3 p-3.5 rounded-[22px] bg-white/90 dark:bg-[#072427]/90 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-sm flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 text-left">
                                    <div className="w-9 h-9 rounded-full bg-teal-500/15 border border-teal-400/30 text-[#0d9488] dark:text-[#2dd4bf] flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                            Garansi Hasil Mewah & Terukur!
                                        </h5>
                                        <p className="text-[10.5px] text-slate-500 dark:text-gray-300 truncate">
                                            Editing tone berkelas + flash drive eksklusif
                                        </p>
                                    </div>
                                </div>
                                <span className="text-slate-400 dark:text-teal-300 text-base font-bold shrink-0">›</span>
                            </div>
                        </div>
                        )}

                        {/* =========== TAB: SAMPLE (100% Matching Reference Portfolio & Sample Screen) =========== */}
                        {activeTab === 'sample' && (
                        <div className="w-full px-4 pt-1 pb-12 animate-in fade-in duration-150">
                            {/* 1. HEADER BOX WITH SEARCH BAR */}
                            <div className="p-4 rounded-[26px] bg-white/90 dark:bg-[#072427]/90 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-sm text-left mb-3">
                                <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-[#0d9488] dark:text-[#2dd4bf]">
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-teal-500/20 text-[#0d9488] dark:text-[#2dd4bf] text-[8px]">✓</span>
                                    <span>Verified CURATED ARCHIVES</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight">
                                        Portfolio & Sample
                                    </h2>
                                    <svg className="w-5 h-5 text-teal-600/60 dark:text-teal-300/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-gray-300 mt-0.5 mb-3">
                                    Jelajahi momen magis & mahakarya sinematik kami.
                                </p>

                                {/* Search Input inside Header Card */}
                                <div className="flex items-center gap-2 h-10 pl-3.5 pr-1.5 rounded-full bg-slate-100/90 dark:bg-[#051a1c]/90 border border-slate-200 dark:border-teal-400/30">
                                    <svg className="w-4 h-4 text-slate-500 dark:text-[#2dd4bf] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={sampleSearch}
                                        onChange={(e) => setSampleSearch(e.target.value)}
                                        placeholder="Cari nama pasangan, tema, atau lokasi..."
                                        className="w-full bg-transparent text-[11px] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSampleFilter('Semua')}
                                        className="w-7 h-7 rounded-full bg-[#0d6e6e] dark:bg-[#0c3e41] text-white flex items-center justify-center shrink-0"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* 2. FILTER PILLS */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
                                {[
                                    { id: 'Semua', label: 'Semua', icon: '✦' },
                                    { id: 'Video', label: 'Video Album', icon: '🎬' },
                                    { id: 'Foto', label: 'Foto', icon: '📷' },
                                    { id: 'Album', label: 'Album', icon: '📖' },
                                    { id: 'Favorit', label: 'Favorit', icon: '♡' },
                                ].map((pill) => {
                                    const active = sampleFilter === pill.id;
                                    return (
                                        <button
                                            key={pill.id}
                                            type="button"
                                            onClick={() => setSampleFilter(pill.id)}
                                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                                                active
                                                    ? 'bg-[#09383a] dark:bg-[#0c3f42] text-white border-teal-400/50 shadow-sm'
                                                    : 'bg-white/85 dark:bg-[#072224]/80 text-slate-600 dark:text-gray-300 border-slate-200/90 dark:border-teal-500/20 hover:border-teal-400/40'
                                            }`}
                                        >
                                            <span className="text-[10px] text-[#2dd4bf]">{pill.icon}</span>
                                            <span>{pill.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 3. FEATURED VIDEO ALBUM CARD */}
                            {(() => {
                                const firstVideoIdx = portfolio.findIndex(p => p.type === 'video');
                                const targetIdx = firstVideoIdx >= 0 ? firstVideoIdx : 0;
                                const featuredItem = portfolio[targetIdx] || {
                                    title: 'Sample Album Fullpress',
                                    type: 'video',
                                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                                };
                                const featuredCover = featuredItem.type === 'video' && featuredItem.url
                                    ? getYouTubeThumbnail(featuredItem.url)
                                    : 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85';

                                return (
                                    <div className="rounded-[26px] overflow-hidden bg-[#f4f7f6] dark:bg-[#082629] border border-slate-200/90 dark:border-teal-400/30 shadow-lg mb-5">
                                        <div
                                            onClick={() => {
                                                if (portfolio.length > 0) {
                                                    setCurrentMediaIndex(targetIdx);
                                                    setCurrentPhotoIndex(0);
                                                    setFullscreenPhoto(null);
                                                    setMediaModalOpen(true);
                                                }
                                            }}
                                            className="relative w-full h-[196px] overflow-hidden cursor-pointer group bg-slate-900"
                                        >
                                            <img
                                                src={featuredCover}
                                                alt={featuredItem.title}
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85';
                                                }}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20"></div>

                                            {/* Top Badges */}
                                            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/95 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md">
                                                    <span>🎥</span> VIDEO ALBUM
                                                </span>
                                                <span className="px-2.5 py-1 rounded-full bg-white/90 text-slate-900 text-[9.5px] font-extrabold shadow-sm">
                                                    01:45 Min
                                                </span>
                                            </div>

                                            {/* Top Right Heart */}
                                            <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-black/45 backdrop-blur-md border border-white/30 text-slate-700 dark:text-white flex items-center justify-center z-10"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </button>

                                            {/* Center Play Button */}
                                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                                <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                                    <SvgIcon name="play" className="w-6 h-6 text-white ml-0.5" />
                                                </div>
                                            </div>

                                            {/* Bottom Overlay Text */}
                                            <div className="absolute bottom-3 left-3.5 right-3.5 text-left z-10">
                                                <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-400">
                                                    CLIENT STORY
                                                </p>
                                                <h3 className="text-base sm:text-[17px] font-extrabold text-white leading-snug truncate">
                                                    {featuredItem.title || 'Sample Album Fullpress'}
                                                </h3>
                                                <p className="text-[10.5px] text-gray-200 flex items-center gap-1 mt-0.5">
                                                    <span>😊</span>
                                                    <span>Rian & Dinda — Takengon, Aceh</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Card Bottom Action Bar */}
                                        <div className="p-3 bg-[#e9efee] dark:bg-[#062022] flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 text-[9.5px] font-extrabold leading-tight text-center shrink-0">
                                                    Hardcover<br />Fullpress
                                                </span>
                                                <div className="text-left min-w-0">
                                                    <p className="text-[9.5px] text-slate-500 dark:text-gray-400 leading-tight">Inklusi: Mini</p>
                                                    <p className="text-[10.5px] font-bold text-slate-800 dark:text-white truncate">Teaser Reel</p>
                                                </div>
                                            </div>
                                            <a
                                                href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent('Halo Admin 18Studio, saya tertarik dengan Sample Album Fullpress')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#083538] hover:bg-[#0b464a] border border-teal-400/35 text-white text-[10.5px] font-bold shrink-0 shadow-sm transition"
                                            >
                                                <span className="text-left leading-tight">Tanya<br />Paket ini</span>
                                                <span className="text-[#2dd4bf] text-xs">→</span>
                                            </a>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 4. INSPIRASI PILIHAN SECTION */}
                            <div className="flex items-end justify-between mb-3">
                                <div className="text-left">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                                        Inspirasi Pilihan
                                    </h3>
                                    <p className="text-[10.5px] text-slate-500 dark:text-gray-400">
                                        Konsep terbaik untuk momen bahagiamu
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSampleFilter('Semua')}
                                    className="text-xs font-bold text-[#0d9488] dark:text-[#2dd4bf] flex items-center gap-0.5 hover:opacity-80"
                                >
                                    <span>Lihat Semua</span>
                                    <span className="text-sm leading-none">›</span>
                                </button>
                            </div>

                            {/* 2-Column Portfolio Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-3.5">
                                {(() => {
                                    const filteredPortfolio = portfolio.filter((p) => {
                                        if (sampleFilter === 'Video' && p.type !== 'video') return false;
                                        if (sampleFilter === 'Foto' && p.type !== 'photo') return false;
                                        if (sampleSearch.trim() !== '') {
                                            return p.title && p.title.toLowerCase().includes(sampleSearch.toLowerCase());
                                        }
                                        return true;
                                    });

                                    const displayItems = filteredPortfolio.length > 0 ? filteredPortfolio : [
                                        {
                                            id: 'sample-1',
                                            title: 'Album Fullpress Video',
                                            type: 'video',
                                            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                                            fallbackImg: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80'
                                        },
                                        {
                                            id: 'sample-2',
                                            title: 'Sample Prewedd Indoor',
                                            type: 'photo',
                                            url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80',
                                            fallbackImg: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80'
                                        }
                                    ];

                                    return displayItems.map((port, idx) => {
                                        const realIdx = portfolio.findIndex(p => p.id === port.id);
                                        const imageUrls = port.type === 'photo' ? parseUrls(port.url) : [];
                                        const coverImage = port.fallbackImg || (port.type === 'video'
                                            ? getYouTubeThumbnail(port.url)
                                            : (imageUrls[0] || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80'));

                                        const isVideo = port.type === 'video';
                                        const subtitleText = idx % 2 === 0 ? 'Cinematic highlight 4K...' : 'Minimalist Pure Studio';
                                        const tagText = idx % 2 === 0 ? 'Wedding Day' : 'Indoor Prewed';

                                        return (
                                            <div
                                                key={port.id || idx}
                                                onClick={() => {
                                                    if (portfolio.length > 0) {
                                                        setCurrentMediaIndex(realIdx >= 0 ? realIdx : 0);
                                                        setCurrentPhotoIndex(0);
                                                        setFullscreenPhoto(null);
                                                        setMediaModalOpen(true);
                                                    }
                                                }}
                                                className="rounded-[22px] overflow-hidden bg-[#f4f7f6] dark:bg-[#e9efee] border border-slate-200/90 dark:border-teal-400/25 shadow-md flex flex-col cursor-pointer group"
                                            >
                                                {/* Image Top */}
                                                <div className="relative w-full h-[138px] overflow-hidden bg-slate-900">
                                                    <img
                                                        src={coverImage}
                                                        alt={port.title}
                                                        onError={(e) => {
                                                            e.currentTarget.src = idx % 2 === 0
                                                                ? 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80'
                                                                : 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80';
                                                        }}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                                                    {/* Top Left Pill */}
                                                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white text-[9px] font-bold border border-white/15">
                                                        {isVideo ? '👁 2.4k' : `❐ ${imageUrls.length > 1 ? imageUrls.length : 3} Photos`}
                                                    </span>

                                                    {/* Top Right Heart */}
                                                    <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/80 text-slate-700 flex items-center justify-center text-[11px]">
                                                        ♡
                                                    </span>

                                                    {/* Center Play Icon */}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center">
                                                            <SvgIcon name="play" className="w-4 h-4 text-white ml-0.5" />
                                                        </div>
                                                    </div>

                                                    {/* Bottom Title inside Image */}
                                                    <div className="absolute bottom-2 left-2.5 right-2.5 text-left">
                                                        <p className="text-[7.5px] font-extrabold uppercase tracking-wider text-amber-300">
                                                            HIGHLIGHT REEL
                                                        </p>
                                                        <h4 className="text-xs font-extrabold text-white truncate">
                                                            {port.title}
                                                        </h4>
                                                    </div>
                                                </div>

                                                {/* High Contrast Ivory Footer matching Reference */}
                                                <div className="p-2.5 text-left bg-[#f4f7f6] dark:bg-[#e9efee]">
                                                    <p className="text-[10px] text-slate-600 truncate">
                                                        {subtitleText}
                                                    </p>
                                                    <div className="flex items-center justify-between gap-1 mt-1.5">
                                                        <span className={`text-[9.5px] font-extrabold ${idx % 2 === 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                                                            {tagText}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-[#0d9488] text-[9px] font-extrabold">
                                                            chat
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* 5. FULL-WIDTH LANDSCAPE BANNER (Outdoor Romantic Sunset) */}
                            <div
                                onClick={() => {
                                    if (portfolio.length > 0) {
                                        setCurrentMediaIndex(0);
                                        setCurrentPhotoIndex(0);
                                        setFullscreenPhoto(null);
                                        setMediaModalOpen(true);
                                    }
                                }}
                                className="relative w-full h-[142px] rounded-[24px] overflow-hidden shadow-lg border border-slate-200/90 dark:border-teal-400/25 mb-3.5 cursor-pointer group"
                            >
                                <img
                                    src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80"
                                    alt="Outdoor Romantic Sunset"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15"></div>
                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-extrabold">
                                        🖼 8 Photos
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-slate-900 text-[9px] font-bold">
                                        📍 Sabang & Pantai Lampuuk
                                    </span>
                                </div>
                                <div className="absolute bottom-3 left-3.5 right-3.5 text-left">
                                    <h4 className="text-base font-extrabold text-white leading-snug">
                                        Outdoor Romantic Sunset
                                    </h4>
                                    <p className="text-[10.5px] text-gray-200 truncate">
                                        Sesi hangat dengan lanskap matahari terbenam alami.
                                    </p>
                                </div>
                            </div>

                            {/* 6. BOTTOM BINGUNG PILIH KONSEP BAR */}
                            <div className="p-3 rounded-[22px] bg-[#e9efee] dark:bg-[#d8e6e4] border border-slate-200/90 dark:border-teal-400/30 flex items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-2.5 min-w-0 text-left">
                                    <div className="w-9 h-9 rounded-full bg-teal-600/15 text-[#0d9488] flex items-center justify-center shrink-0 font-bold text-sm">
                                        ✨
                                    </div>
                                    <div className="min-w-0">
                                        <h5 className="text-xs font-extrabold text-slate-900 truncate">
                                            Bingung Pilih Konsep?
                                        </h5>
                                        <p className="text-[10px] text-slate-600 truncate">
                                            Konsultasi santai gratis bersama kami.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://wa.me/${adminWhatsapp}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2 rounded-full bg-[#083538] text-white text-[10.5px] font-bold whitespace-nowrap shrink-0 hover:brightness-110 transition"
                                >
                                    Chat WA
                                </a>
                            </div>
                        </div>
                        )}

                        {/* =========== TAB: ORDER (100% Matching Reference Pesanan Saya Screen) =========== */}
                        {activeTab === 'order' && (
                        <div className="w-full px-4 pt-1 pb-12 animate-in fade-in duration-150">
                            {(() => {
                                const showcaseOrders = [
                                    {
                                        id: 'BK-549454',
                                        isShowcase: true,
                                        status: 'Lunas',
                                        badgeTag: 'STUDIO',
                                        pkg: {
                                            title: 'Keluarga Cerita',
                                            category: 'Photo Studio',
                                            image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80'
                                        },
                                        eventDate: '2026-06-24',
                                        total: 550000,
                                        dp: 200000,
                                        progressFoto: 'Proses Edit',
                                        progressVideo: 'Proses Edit'
                                    },
                                    {
                                        id: 'BK-144234',
                                        isShowcase: true,
                                        status: 'Lunas',
                                        badgeTag: 'OUTDOOR',
                                        pkg: {
                                            title: 'Keluarga Cerita',
                                            category: 'Outdoor Session',
                                            image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'
                                        },
                                        eventDate: '2026-06-24',
                                        total: 550000,
                                        dp: 200000,
                                        progressFoto: 'Proses Edit',
                                        progressVideo: 'Proses Edit'
                                    }
                                ];

                                const isOrderHasVideo = (o) => {
                                    const fullP = packages.find(p => p.title === o.pkg?.title);
                                    const rCat = String(o.pkg?.category || fullP?.category || '').toLowerCase();
                                    const rTitle = String(o.pkg?.title || '').toLowerCase();
                                    const rDesc = String(o.pkg?.description || fullP?.description || '').toLowerCase();
                                    const rNotes = String(o.notes || '').toLowerCase();
                                    const isStudio = getMainCategory(o.pkg?.category || fullP?.category || '') === MAIN_CATEGORIES.PHOTO_STUDIO ||
                                        o.badgeTag === 'STUDIO' ||
                                        o.badgeTag === 'OUTDOOR' ||
                                        ['studio', 'family', 'keluarga', 'maternity', 'group', 'graduation', 'wisuda', 'personal', 'couple', 'pas foto', 'product', 'outdoor session'].some(k => rCat.includes(k) || rTitle.includes(k));
                                    const hasVid = ['video', 'cinematic', 'teaser', 'reel', 'highlight', 'clip', 'videografer', 'videographer'].some(k => rDesc.includes(k) || rTitle.includes(k) || rNotes.includes(k)) ||
                                        (o.progressVideo && o.progressVideo !== 'Belum Diproses' && o.progressVideo !== '-' && !o.isShowcase) ||
                                        !!o.linkHasilVideo;
                                    return isStudio ? hasVid : (hasVid || !rDesc || rDesc.includes('video') || rCat.includes('wedding'));
                                };

                                const isOrderCompleted = (o) => {
                                    const hasVid = isOrderHasVideo(o);
                                    return hasVid ? (o.progressFoto === 'Done' && o.progressVideo === 'Done') : (o.progressFoto === 'Done');
                                };

                                const sourceOrders = orders.length > 0 ? orders : showcaseOrders;
                                const filteredOrders = sourceOrders.filter(o => {
                                    if (orderFilter === 'Berjalan') return o.status !== 'Batal' && !isOrderCompleted(o);
                                    if (orderFilter === 'Selesai') return isOrderCompleted(o);
                                    if (orderFilter === 'Dibatalkan') return o.status === 'Batal';
                                    return true;
                                });

                                return (
                                    <>
                                        {/* 1. HEADER PESANAN SAYA */}
                                        <div className="text-left mb-3.5 px-1">
                                            <p className="text-[10.5px] font-semibold text-slate-500 dark:text-teal-300/80">
                                                Koleksi Pilihan
                                            </p>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                    Pesanan Saya
                                                </h2>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 dark:bg-[#0b3d40] border border-teal-400/35 text-[#0d9488] dark:text-[#2dd4bf] text-[10.5px] font-extrabold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]"></span>
                                                    <span>{sourceOrders.length} Aktif</span>
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-300 mt-1 leading-relaxed">
                                                Pantau jadwal pemotretan, invoice, dan kemajuan proses editing Anda.
                                            </p>
                                        </div>

                                        {/* 2. FILTER PILLS */}
                                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3.5">
                                            {[
                                                { id: 'Semua', label: `Semua (${sourceOrders.length})` },
                                                { id: 'Berjalan', label: `Berjalan (${sourceOrders.length})` },
                                                { id: 'Selesai', label: 'Selesai (0)' },
                                                { id: 'Dibatalkan', label: 'Dibatalkan' }
                                            ].map((tab) => {
                                                const active = orderFilter === tab.id;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setOrderFilter(tab.id)}
                                                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                                                            active
                                                                ? 'bg-[#09383a] dark:bg-[#0c4144] text-white border-teal-400/50 shadow-sm'
                                                                : 'bg-white/80 dark:bg-[#072224]/80 text-slate-600 dark:text-gray-300 border-slate-200/90 dark:border-teal-500/20'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* 3. ORDER RECEIPT CARDS (Ivory/Alabaster High-Contrast Style matching Reference) */}
                                        <div className="flex flex-col gap-3.5">
                                            {filteredOrders.map((order, oIdx) => {
                                                const isExpanded = !!expandedOrders[order.id];

                                                // Lookup full package object to inspect category & description
                                                const fullPkgObj = packages.find(p => p.title === order.pkg?.title);
                                                const rawCat = String(order.pkg?.category || fullPkgObj?.category || '').toLowerCase();
                                                const rawTitle = String(order.pkg?.title || '').toLowerCase();
                                                const rawDesc = String(order.pkg?.description || fullPkgObj?.description || '').toLowerCase();
                                                const rawNotes = String(order.notes || '').toLowerCase();

                                                const isPhotoStudioPkg = getMainCategory(order.pkg?.category || fullPkgObj?.category || '') === MAIN_CATEGORIES.PHOTO_STUDIO ||
                                                    order.badgeTag === 'STUDIO' ||
                                                    order.badgeTag === 'OUTDOOR' ||
                                                    ['studio', 'family', 'keluarga', 'maternity', 'group', 'graduation', 'wisuda', 'personal', 'couple', 'pas foto', 'product', 'outdoor session'].some(k => rawCat.includes(k) || rawTitle.includes(k));

                                                const hasExplicitVideo =
                                                    ['video', 'cinematic', 'teaser', 'reel', 'highlight', 'clip', 'videografer', 'videographer'].some(k => rawDesc.includes(k) || rawTitle.includes(k) || rawNotes.includes(k)) ||
                                                    (order.progressVideo && order.progressVideo !== 'Belum Diproses' && order.progressVideo !== '-' && !order.isShowcase) ||
                                                    !!order.linkHasilVideo;

                                                // Paket memiliki progres video HANYA jika bukan paket Studio/Foto murni (kecuali ada keterangan/add-on video eksplisit)
                                                const hasVideoDeliverable = isPhotoStudioPkg ? hasExplicitVideo : (hasExplicitVideo || !rawDesc || rawDesc.includes('video') || rawCat.includes('wedding'));

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

                                                // 7. Done (Menyesuaikan apakah paket punya Video atau Foto saja)
                                                const doneCompleted = hasVideoDeliverable
                                                    ? (fotoSelesai && videoSelesai && fotoStatus !== 'Belum Diproses' && videoStatus !== 'Belum Diproses')
                                                    : (fotoSelesai && fotoStatus !== 'Belum Diproses');

                                                const isMakeup = order.pkg && (
                                                    (order.pkg.category && (
                                                        order.pkg.category.toLowerCase().includes('makeup') ||
                                                        order.pkg.category.toLowerCase().includes('rias') ||
                                                        order.pkg.category.toLowerCase().includes('lady')
                                                    )) ||
                                                    (order.pkg.title && (
                                                        order.pkg.title.toLowerCase().includes('makeup') ||
                                                        order.pkg.title.toLowerCase().includes('rias')
                                                    ))
                                                );

                                                const notesStr = order.notes || '';
                                                const fittingDateMatch = notesStr.match(/\[JADWAL FITTING\]:\s*([^\n]+)/);
                                                const statusFittingMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
                                                const fittingDate = fittingDateMatch ? fittingDateMatch[1].trim() : '';
                                                const statusFitting = statusFittingMatch ? statusFittingMatch[1].trim() : 'Menunggu Fitting';
                                                const fittingCompleted = statusFitting === 'Selesai Fitting';
                                                const fittingActive = dpCompleted && statusFitting !== 'Selesai Fitting';

                                                const toggleOrderExpand = (id) => {
                                                    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
                                                };

                                                const thumbTag = order.badgeTag || (isPhotoStudioPkg ? 'STUDIO' : 'WEDDING');

                                                return (
                                                    <div
                                                        key={order.id}
                                                        className="relative p-4 rounded-[26px] overflow-hidden bg-gradient-to-br from-white/90 to-[#e8faf7]/90 dark:from-[#083337]/85 dark:to-[#052124]/90 backdrop-blur-xl text-slate-900 dark:text-white border border-teal-400/35 dark:border-teal-300/25 shadow-[0_12px_32px_rgba(2,18,20,0.45)] flex flex-col gap-3 transition-all"
                                                    >
                                                        {/* Top Row: Booking ID + Status Pill */}
                                                        <div className="flex items-center justify-between pb-2.5 border-b border-teal-500/15 dark:border-teal-300/15">
                                                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-teal-50">
                                                                <span className="text-[#0d9488] dark:text-[#2dd4bf] font-semibold">🔖</span>
                                                                <span>#{String(order.id).replace(/^#/, '')}</span>
                                                            </div>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/15 dark:bg-[#0d9488]/25 border border-teal-400/35 text-[#0d9488] dark:text-[#5eead4] text-[9.5px] font-extrabold uppercase tracking-wider shadow-sm">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] dark:bg-[#2dd4bf] shadow-[0_0_6px_#2dd4bf]"></span>
                                                                <span>{order.status === 'Menunggu DP' ? 'MENUNGGU DP' : order.status === 'Sudah DP' ? 'SUDAH DP' : 'LUNAS'}</span>
                                                            </span>
                                                        </div>

                                                        {/* Middle Row: Thumbnail + Title + Date + Price Box */}
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="relative w-[84px] h-[84px] rounded-[18px] overflow-hidden shrink-0 shadow-md border border-teal-400/30 dark:border-teal-300/25 bg-[#041a1c]">
                                                                <img
                                                                    src={order.pkg?.image || 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80'}
                                                                    alt={order.pkg?.title || 'Paket'}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#06292c]/90 backdrop-blur-md border border-teal-300/35 text-[#5eead4] text-[8px] font-extrabold uppercase tracking-wider shadow-sm">
                                                                    {thumbTag}
                                                                </span>
                                                            </div>

                                                            <div className="flex-1 text-left min-w-0">
                                                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate leading-snug">
                                                                    {order.pkg?.title || 'Keluarga Cerita'}
                                                                </h3>
                                                                <p className="text-[11px] text-slate-600 dark:text-teal-100/80 mt-0.5 flex items-center gap-1">
                                                                    <span className="text-amber-500 font-semibold">📅</span>
                                                                    <span>Acara: <strong className="text-slate-900 dark:text-white">{order.isShowcase ? '24 Jun 2026' : formatDateString(order.eventDate)}</strong></span>
                                                                </p>

                                                                {/* Total Paket & Uang Muka Sub-box */}
                                                                <div className="mt-2 pt-2 border-t border-teal-500/15 dark:border-teal-300/15 grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-teal-200/70">
                                                                            TOTAL PAKET
                                                                        </p>
                                                                        <p className="text-xs font-extrabold text-[#0d9488] dark:text-[#2dd4bf]">
                                                                            {formatRupiah(order.total)}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-teal-200/70">
                                                                            UANG MUKA (DP)
                                                                        </p>
                                                                        <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                                                                            {formatRupiah(order.dp)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Row: 3 Action Pill Buttons in Teal Glass Theme */}
                                                        <div className="grid grid-cols-3 gap-2 pt-1">
                                                            {order.status === 'Menunggu DP' && !order.isShowcase ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleBayarDP(order.id, order.dp, order.client_name, userEmail, order.pkg ? order.pkg.category : 'Wedding')}
                                                                    className="col-span-3 py-2.5 px-3 rounded-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6] text-white text-[11px] font-extrabold shadow-[0_6px_18px_rgba(20,184,166,0.35)] hover:brightness-110 transition cursor-pointer"
                                                                >
                                                                    Bayar DP via {order.pkg && (
                                                                        order.pkg.category.toLowerCase().includes('studio') ||
                                                                        ['family', 'maternity', 'group', 'graduation', 'personal', 'couple', 'prewedding studio', 'poto product', 'studio lapanbelas', 'wisuda', 'pas foto'].some(c => order.pkg.category.toLowerCase().includes(c))
                                                                    ) ? 'Midtrans' : 'DOKU'}
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (order.isShowcase) {
                                                                                handleTabClick('profile');
                                                                            } else {
                                                                                handleDownloadInvoice(order);
                                                                            }
                                                                        }}
                                                                        className="py-2 px-2.5 rounded-full bg-teal-500/15 dark:bg-[#0b3f43]/80 hover:bg-teal-500/25 dark:hover:bg-[#0f5257] border border-teal-400/35 text-[#0f5256] dark:text-teal-100 text-[10.5px] font-extrabold truncate transition cursor-pointer"
                                                                    >
                                                                        🧾 Invoice
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleOrderExpand(order.id)}
                                                                        className={`py-2 px-2.5 rounded-full border text-[10.5px] font-extrabold truncate transition cursor-pointer shadow-sm ${
                                                                            isExpanded
                                                                                ? 'bg-[#14b8a6] border-teal-300 text-slate-950 shadow-[0_0_14px_rgba(45,212,191,0.4)]'
                                                                                : 'bg-[#0c4a4e] dark:bg-[#0d5257] hover:bg-[#0f5e63] border-teal-300/40 text-white'
                                                                        }`}
                                                                    >
                                                                        {isExpanded ? 'Tutup ▲' : 'Progres ▼'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (order.isShowcase) {
                                                                                handleTabClick('profile');
                                                                            } else {
                                                                                setSelectedRescheduleOrder(order);
                                                                                setIsRescheduleModalOpen(true);
                                                                            }
                                                                        }}
                                                                        className="py-2 px-2.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500/25 border border-amber-400/35 text-amber-800 dark:text-amber-300 text-[10.5px] font-extrabold truncate transition cursor-pointer"
                                                                    >
                                                                        🗓️ Jadwal
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Expandable Progress Timeline (Teal Glass Theme + Package-Aware Steps) */}
                                                        {isExpanded && (
                                                            <div className="mt-1 pt-3.5 text-left animate-in slide-in-from-top-2 duration-300 bg-white/80 dark:bg-[#041d20]/90 backdrop-blur-xl text-slate-900 dark:text-white p-4 rounded-2xl border border-teal-400/35 dark:border-teal-300/25 shadow-inner">
                                                                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-teal-500/15 dark:border-teal-300/15">
                                                                    <h4 className="text-[11px] font-extrabold text-[#0d9488] dark:text-[#2dd4bf] uppercase tracking-wider flex items-center gap-1.5">
                                                                        <SvgIcon name="clipboard-list" className="w-3.5 h-3.5 text-[#0d9488] dark:text-[#2dd4bf]" /> Detail Pelacakan Progres
                                                                    </h4>
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 dark:bg-teal-400/15 text-[#0d9488] dark:text-teal-200 border border-teal-400/30">
                                                                        {isMakeup ? 'Paket Makeup' : hasVideoDeliverable ? 'Foto & Video' : 'Khusus Foto'}
                                                                    </span>
                                                                </div>

                                                                <div className="relative pl-7 flex flex-col gap-4">
                                                                    <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-teal-500/25 dark:bg-teal-300/20"></div>

                                                                    {isMakeup ? (
                                                                        <>
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${dpCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : dpActive ? 'bg-teal-600 border-teal-400 text-white' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {dpCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">1</span>}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">DP (Down Payment)</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">{dpCompleted ? "DP Terbayar - Jadwal Booking Aman" : "Menunggu Pembayaran DP"}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${fittingCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : fittingActive ? 'bg-teal-600 border-teal-400 text-white' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {fittingCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">2</span>}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Jadwal Fitting</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">
                                                                                        {fittingCompleted ? "Fitting Selesai" : fittingDate ? `Jadwal Fitting: ${fittingDate} (${statusFitting})` : "Menunggu konfirmasi jadwal fitting"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${lunasCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {lunasCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">3</span>}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Pembayaran Lunas</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">{lunasCompleted ? "Pelunasan Terverifikasi" : "Menunggu Pelunasan"}</p>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {/* Step 1: DP */}
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${dpCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {dpCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">1</span>}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">DP (Down Payment)</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">{dpCompleted ? "DP Terbayar - Jadwal Pemotretan Aman" : "Menunggu Pembayaran DP"}</p>
                                                                                </div>
                                                                            </div>

                                                                            {/* Step 2: Pelunasan */}
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${lunasCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {lunasCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">2</span>}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Pembayaran Lunas</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">{lunasCompleted ? "Pelunasan Terverifikasi" : "Menunggu Pelunasan"}</p>
                                                                                </div>
                                                                            </div>

                                                                            {/* Step 3: Link Drive Foto Mentah */}
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${driveSeleksiCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {driveSeleksiCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">3</span>}
                                                                                </div>
                                                                                <div className="flex flex-col items-start">
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Pengiriman Link Drive (Foto Mentah)</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">{driveSeleksiCompleted ? "Seluruh foto mentah berhasil diunggah ke Google Drive." : "Menunggu sesi pemotretan & unggah file"}</p>
                                                                                    {driveSeleksiCompleted && order.driveLinkSeleksi && (
                                                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                                            <a href={`/pilih-foto/${order.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#0d9488] to-[#14b8a6] hover:brightness-110 text-white font-extrabold px-3 py-1 rounded-full text-[10px] shadow-[0_4px_12px_rgba(20,184,166,0.35)]">🎯 Pilih Foto di Aplikasi</a>
                                                                                            <a href={order.driveLinkSeleksi} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-teal-500/15 dark:bg-[#0b3f43] text-[#0d9488] dark:text-[#5eead4] border border-teal-400/35 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-teal-500/25">📁 Buka Google Drive</a>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Step 4: Progres Edit Foto */}
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${fotoSelesai ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : fotoActive ? 'bg-[#0d9488] border-teal-300 text-white' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {fotoSelesai ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">4</span>}
                                                                                </div>
                                                                                <div className="flex flex-col items-start">
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Progres Edit Foto</h5>
                                                                                    <p className="text-[10.5px] font-semibold text-[#0d9488] dark:text-[#2dd4bf] mt-0.5">
                                                                                        Status Foto: {fotoStatus}
                                                                                    </p>
                                                                                    {fotoPreview && order.linkHasilFoto && (
                                                                                        <a href={order.linkHasilFoto} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 bg-teal-500/15 dark:bg-[#0b3f43] text-[#0d9488] dark:text-[#5eead4] border border-teal-400/40 px-3 py-1 rounded-full text-[10px] font-bold">📁 Preview Hasil Foto</a>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Step 5 (Opsional): Progres Edit Video — HANYA TAMPIL JIKA PAKET MEMILIKI VIDEO */}
                                                                            {hasVideoDeliverable && (
                                                                                <div className="relative flex gap-3.5">
                                                                                    <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${videoSelesai ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : videoActive ? 'bg-[#0d9488] border-teal-300 text-white' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                        {videoSelesai ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">5</span>}
                                                                                    </div>
                                                                                    <div className="flex flex-col items-start">
                                                                                        <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Progres Edit Video</h5>
                                                                                        <p className="text-[10.5px] font-semibold text-[#0d9488] dark:text-[#2dd4bf] mt-0.5">
                                                                                            Status Video: {videoStatus}
                                                                                        </p>
                                                                                        {videoPreview && order.linkHasilVideo && (
                                                                                            <a href={order.linkHasilVideo} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 bg-teal-500/15 dark:bg-[#0b3f43] text-[#0d9488] dark:text-[#5eead4] border border-teal-400/40 px-3 py-1 rounded-full text-[10px] font-bold">🎬 Preview Hasil Video</a>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Step Terakhir: Selesai */}
                                                                            <div className="relative flex gap-3.5">
                                                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${doneCompleted ? 'bg-[#10b981] border-emerald-300 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-[#093236] border-teal-400/30 text-slate-500 dark:text-teal-200/60'}`}>
                                                                                    {doneCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-bold">{hasVideoDeliverable ? '6' : '5'}</span>}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Selesai</h5>
                                                                                    <p className="text-[10.5px] text-slate-600 dark:text-teal-100/75 mt-0.5">{doneCompleted ? "Seluruh proses selesai sempurna!" : "Menunggu proses akhir"}</p>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* 4. BOTTOM SUPPORT CARD (BANTUAN 24/7 matching Reference) */}
                                        <div className="mt-4 p-4 rounded-[26px] bg-gradient-to-br from-[#0c595cf0] to-[#063235] dark:from-[#072c2f] dark:to-[#041a1c] border border-teal-400/35 text-left shadow-xl relative overflow-hidden">
                                            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-teal-400/10 blur-xl pointer-events-none"></div>
                                            <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#5eead4] flex items-center gap-1.5">
                                                <span>🎧</span>
                                                <span>BANTUAN 24/7</span>
                                            </p>
                                            <h3 className="text-base font-extrabold text-white mt-1 leading-snug">
                                                Butuh bantuan dengan pesanan Anda?
                                            </h3>
                                            <p className="text-[11px] text-gray-200 mt-1 leading-relaxed">
                                                Konsultasikan jadwal atau perubahan konsep bersama tim kami.
                                            </p>
                                            <a
                                                href={`https://wa.me/${adminWhatsapp}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3.5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#5eead4] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-105 active:scale-95 transition"
                                            >
                                                <span>Hubungi Layanan</span>
                                                <span>→</span>
                                            </a>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        )}

                        {/* =========== TAB: PROFILE (Login / User Account) =========== */}
                        {activeTab === 'profile' && (
                        <div className="w-full px-4 pt-2 pb-12 animate-in fade-in duration-150">
                            {!isLoggedIn ? (
                                <div className="p-6 rounded-[28px] bg-white/90 dark:bg-[#072427]/95 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-xl text-center">
                                    <img src="/logo.png" alt="18Studio Logo" className="h-16 w-auto mx-auto mb-3 object-contain" />
                                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Masuk ke Akun Klien</h2>
                                    <p className="text-xs text-slate-500 dark:text-gray-300 mt-1 mb-5">
                                        Pantau pesanan, pilih foto mentah, atau unduh invoice resmi Anda.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-extrabold py-3.5 px-6 rounded-full flex items-center justify-center gap-3 shadow-md hover:opacity-95 transition cursor-pointer text-xs"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        <span>Sign in with Google</span>
                                    </button>

                                    <div className="flex items-center gap-3 my-5">
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
                                        <span className="text-[10px] text-slate-400 dark:text-gray-400 uppercase tracking-widest font-bold">Atau Cek Booking ID</span>
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
                                    </div>

                                    <form onSubmit={handleBookingLogin} className="flex flex-col gap-3 text-left">
                                        <div>
                                            <label className="text-[10px] text-slate-600 dark:text-gray-300 font-bold uppercase tracking-wider ml-2 mb-1 block">ID Booking / Invoice</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: 125 atau #125"
                                                value={loginBookingId}
                                                onChange={(e) => setLoginBookingId(e.target.value)}
                                                className="w-full h-11 px-4 rounded-2xl bg-slate-100 dark:bg-[#051a1c] border border-slate-200 dark:border-teal-400/30 text-xs text-slate-900 dark:text-white focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-600 dark:text-gray-300 font-bold uppercase tracking-wider ml-2 mb-1 block">Nomor WhatsApp</label>
                                            <input
                                                type="tel"
                                                placeholder="Contoh: 08123456789"
                                                value={loginPhone}
                                                onChange={(e) => setLoginPhone(e.target.value)}
                                                className="w-full h-11 px-4 rounded-2xl bg-slate-100 dark:bg-[#051a1c] border border-slate-200 dark:border-teal-400/30 text-xs text-slate-900 dark:text-white focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isVerifyingBooking}
                                            className="w-full mt-1 py-3.5 rounded-full bg-[#0d6e6e] hover:bg-[#0f8282] text-white font-extrabold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                                        >
                                            {isVerifyingBooking ? 'Memverifikasi...' : 'Cek Pesanan Saya'}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="p-6 rounded-[28px] bg-white/90 dark:bg-[#072427]/95 backdrop-blur-md border border-slate-200/90 dark:border-teal-400/25 shadow-xl text-center">
                                    <div className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-teal-400/40 bg-gradient-to-tr from-[#0d9488] to-teal-400 flex items-center justify-center shadow-lg">
                                        <span className="text-2xl font-extrabold text-white tracking-widest">{getInitials(userName)}</span>
                                    </div>
                                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{userName}</h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-300 mb-6">{userEmail}</p>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full bg-red-500/15 text-red-600 dark:text-red-400 py-3 rounded-full text-xs font-extrabold border border-red-500/30 hover:bg-red-500/25 transition duration-300 cursor-pointer"
                                    >
                                        Logout dari App
                                    </button>
                                </div>
                            )}
                        </div>
                        )}
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
                            {(() => {
                                const priceInfo = getDiscountedPriceInfo(selectedPkg);
                                return (
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        <p className="text-emerald-400 font-bold text-xl">{formatRupiah(priceInfo.price)}</p>
                                        {priceInfo.original && (priceInfo.original > priceInfo.price) && (
                                            <>
                                                <span className="text-xs line-through text-gray-400">{formatRupiah(priceInfo.original)}</span>
                                                <span className="bg-[#ff4d4d] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                                    <span>★</span> Hemat {formatHemat(priceInfo.original - priceInfo.price)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                            <p className="text-sm text-gray-400 leading-relaxed mb-6 whitespace-pre-line">{cleanPackageDescription(selectedPkg.description)}</p>
                        </div>
                        <div className="fixed bottom-0 left-0 right-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-50 max-w-md mx-auto">
                            <button onClick={() => {
                                setBookingStep(2);
                                setView('booking');
                            }} className="w-full bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition">Booking Sekarang</button>
                        </div>
                    </div>
                )}

                {/* BOOKING FORM VIEW */}
                {view === 'booking' && selectedPkg && (() => {
                    const pkgTitleLower = (selectedPkg?.title || '').toLowerCase();
                    const pkgCategoryLower = (selectedPkg?.category || '').toLowerCase();
                    const isSingleDate =
                        pkgTitleLower.includes("royal") ||
                        pkgTitleLower.includes("bronze") ||
                        pkgTitleLower.includes("akad postwed") ||
                        pkgTitleLower.includes("akad intimate") ||
                        pkgTitleLower.includes("intimate") ||
                        pkgTitleLower.includes("tasyakuran") ||
                        pkgTitleLower.includes("engagement") ||
                        pkgTitleLower.includes("lamaran") ||
                        pkgTitleLower.includes("prewed") ||
                        pkgTitleLower.includes("prewedding") ||
                        pkgCategoryLower.includes("prewed") ||
                        pkgCategoryLower.includes("engagement") ||
                        pkgCategoryLower.includes("lamaran") ||
                        pkgCategoryLower.includes("tasyakuran") ||
                        getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.MAKEUP ||
                        getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.DEKORASI;
                    const isThreeDates = pkgTitleLower.includes("delta") || pkgTitleLower.includes("centro");
                    const isSpecialAkadResepsi = (getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.MAKEUP || getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.DEKORASI) &&
                        ((pkgTitleLower.includes("akad") && pkgTitleLower.includes("resepsi")) ||
                            (pkgCategoryLower.includes("akad") && pkgCategoryLower.includes("resepsi")));
                    const isResepsiFlow = (!isSingleDate && !isThreeDates && getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.WEDDING) || (isSpecialAkadResepsi && !isSingleDate);
                    const isPhotoStudio = getMainCategory(selectedPkg.category) === MAIN_CATEGORIES.PHOTO_STUDIO;

                    const priceInfo = getDiscountedPriceInfo(selectedPkg);
                    const extraPkgsTotal = (extraPackages || []).reduce((sum, p) => sum + (Number(p.price) || 0), 0);
                    const extraPkgsDp = (extraPackages || []).reduce((sum, p) => sum + calculateMinDp(p, getMainCategory(p.category), Number(p.price || 0)), 0);
                    const addonsTotal = selectedAddons.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
                    const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal + extraPkgsTotal;
                    const primaryDp = calculateMinDp(selectedPkg, getMainCategory(selectedPkg.category), Number(priceInfo.price) + addonsTotal);
                    const dpAmount = Math.min(primaryDp + extraPkgsDp, finalPrice);
                    const sisaAmount = Math.max(0, finalPrice - dpAmount);

                    if (isPhotoStudio) {
                        return (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col p-6 pt-10 text-left">
                                <div className="flex items-center gap-4 mb-8">
                                    <button type="button" onClick={() => {
                                        if (bookingStep > 2) {
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
                                            if (p.is_active === false) return false;
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
                                            { name: "Room C - Modern", desc: "Dynamic vibrant colorful background", color: "from-pink-800 to-indigo-950" },
                                            { name: "Room D - Kubah", desc: "Retro & classic vintage background", color: "from-yellow-900 to-orange-950" },
                                            { name: "Room E - Custom", desc: "Ada biaya tambahan, silakan hubungi admin terlebih dahulu", color: "from-green-800 to-emerald-950" }
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
                                                        className="input-glass mt-1 w-full"
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
                                                                    const bookingEnd = bookingStart + (b.duration || 45) + 10; // Jeda 10 menit
                                                                    return slotStart < bookingEnd && (slotEnd + 10) > bookingStart;
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
                                                                    const bookingEnd = bookingStart + (b.duration || 45) + 10; // Jeda 10 menit
                                                                    return slotStart < bookingEnd && (slotEnd + 10) > bookingStart;
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
                                                        onClick={() => setView('detail')}
                                                        className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-full text-sm hover:bg-white/10 transition"
                                                    >
                                                        Kembali
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!selectedEventDate || !selectedTimeSlot || !selectedRoom}
                                                        onClick={() => {
                                                            if (selectedRoom === 'Room E - Custom') {
                                                                const waText = `Halo admin 18Studio, saya ingin memesan paket "${selectedPkg?.title}" menggunakan Room E - Custom. Mohon dibantu untuk info biaya tambahan dan kelanjutan booking.`;
                                                                window.open(`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(waText)}`, '_blank');
                                                                return;
                                                            }
                                                            setBookingStep(3);
                                                        }}
                                                        className="flex-1 bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {selectedRoom === 'Room E - Custom' ? 'Tanya Admin (WA)' : 'Lanjut'}
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
                                                    <div className="flex gap-2 items-center">
                                                        <div className="relative shrink-0">
                                                            <select
                                                                value={phoneCountryCode}
                                                                onChange={(e) => setPhoneCountryCode(e.target.value)}
                                                                className="input-glass py-3.5 pl-3 pr-7 rounded-2xl bg-[#141820] text-white text-xs font-semibold appearance-none cursor-pointer focus:border-white/40 shadow-sm border border-white/10"
                                                            >
                                                                <option value="+62" className="bg-[#121212] text-white">🇮🇩 +62</option>
                                                                <option value="+60" className="bg-[#121212] text-white">🇲🇾 +60</option>
                                                            </select>
                                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[9px]">▼</div>
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="tel"
                                                                value={bookingPhone}
                                                                onChange={handlePhoneInputChange}
                                                                placeholder={phoneCountryCode === '+62' ? "812-3456-7890 (Contoh)" : "12-345-6789 (Contoh)"}
                                                                className="input-glass w-full py-3.5 text-sm placeholder:text-gray-500 placeholder:text-xs"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400/80 mt-1 ml-1 leading-tight">Cukup lanjutkan sisa nomor Anda tanpa angka 0 di awal.</p>
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
                                                    onClick={handleNextStep3}
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
                                            if (addonPeople && STUDIO_ADDONS_PRICING.people[addonPeople] !== undefined) {
                                                price += STUDIO_ADDONS_PRICING.people[addonPeople];
                                            } else if (addonPeople) {
                                                const match = addonPeople.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            if (addonTime && STUDIO_ADDONS_PRICING.time[addonTime] !== undefined) {
                                                price += STUDIO_ADDONS_PRICING.time[addonTime];
                                            } else if (addonTime) {
                                                const match = addonTime.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            if (addonPrint && STUDIO_ADDONS_PRICING.print[addonPrint] !== undefined) {
                                                price += STUDIO_ADDONS_PRICING.print[addonPrint];
                                            } else if (addonPrint) {
                                                const match = addonPrint.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            if (addonFrame && STUDIO_ADDONS_PRICING.frame[addonFrame] !== undefined) {
                                                price += STUDIO_ADDONS_PRICING.frame[addonFrame];
                                            } else if (addonFrame) {
                                                const match = addonFrame.match(/\+Rp\s*([\d.]+)/);
                                                if (match) price += parseInt(match[1].replace(/\./g, ''), 10);
                                            }
                                            return price;
                                        };

                                        const extraPkgsTotal = (extraPackages || []).reduce((sum, p) => sum + (Number(p.price) || 0), 0);
                                        const extraPkgsDp = (extraPackages || []).reduce((sum, p) => sum + calculateMinDp(p, getMainCategory(p.category), Number(p.price || 0)), 0);
                                        const addonsTotal = getAddonsPrice();
                                        const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal + extraPkgsTotal;
                                        const primaryDp = calculateMinDp(selectedPkg, getMainCategory(selectedPkg.category), Number(priceInfo.price) + addonsTotal);
                                        const dpAmount = Math.min(primaryDp + extraPkgsDp, finalPrice);
                                        const sisaAmount = Math.max(0, finalPrice - dpAmount);

                                        return (
                                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                {/* Tambah Layanan Lainnya (Bundling) */}
                                                <div className="glass-panel p-4 rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-blue-500/10 flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">✨</span>
                                                            <span className="text-sm font-semibold text-teal-300">Tambah Layanan Lainnya (Bundling)</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCrossPkgBox(!showCrossPkgBox)}
                                                            className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl transition font-semibold"
                                                        >
                                                            {showCrossPkgBox ? '✕ Batal' : '➕ Tambah Layanan Lain'}
                                                        </button>
                                                    </div>

                                                    <p className="text-xs text-gray-300 leading-relaxed text-left">
                                                        Mau sekalian pesan layanan lainnya? (Contoh: <em>Foto Studio + Makeup Rias</em>, atau <em>Wedding + Dekorasi</em>). Seluruh rincian fasilitas &amp; garansi langsung terbit rapi dalam 1 invoice resmi.
                                                    </p>

                                                    {showCrossPkgBox && (
                                                        <div className="bg-black/50 border border-teal-500/30 p-3.5 rounded-2xl flex flex-col gap-3 animate-in fade-in">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                <div className="flex flex-col gap-1 text-left">
                                                                    <label className="text-[10px] text-gray-400 ml-1">Pilih Kategori Layanan</label>
                                                                    <select
                                                                        value={crossPkgDiv}
                                                                        onChange={e => {
                                                                            setCrossPkgDiv(e.target.value);
                                                                            setSelectedCrossPkgTitle('');
                                                                        }}
                                                                        className="input-glass bg-[#18262b] text-xs py-2 text-white appearance-none cursor-pointer"
                                                                    >
                                                                        <option value="Lady Makeup">💄 Lady Makeup (Rias &amp; Gaun)</option>
                                                                        <option value="lapanbelas.id">💍 Wedding / Lapanbelas (Dokumentasi)</option>
                                                                        <option value="Studio Lapanbelas">📸 Studio Lapanbelas (Photoshoot)</option>
                                                                        <option value="Lapanbelas Dekorasi">🎪 Lapanbelas Dekorasi (Pelaminan)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1 text-left">
                                                                    <label className="text-[10px] text-gray-400 ml-1">Pilih Paket Layanan</label>
                                                                    <select
                                                                        value={selectedCrossPkgTitle}
                                                                        onChange={e => setSelectedCrossPkgTitle(e.target.value)}
                                                                        className="input-glass bg-[#18262b] text-xs py-2 text-white appearance-none cursor-pointer"
                                                                    >
                                                                        <option value="">-- Pilih Paket Layanan Tambahan --</option>
                                                                        {packages.filter(p => {
                                                                            const cat = (p.category || '').toLowerCase();
                                                                            if (crossPkgDiv === 'Lady Makeup') return cat.includes('makeup');
                                                                            if (crossPkgDiv === 'Studio Lapanbelas') return cat.includes('studio') || ['wisuda', 'family', 'couple', 'photo self', 'group studio'].some(k => cat.includes(k));
                                                                            if (crossPkgDiv === 'Lapanbelas Dekorasi') return cat.includes('dekor');
                                                                            return cat.includes('wedding') || ['gold', 'silver', 'bronze', 'platinum', 'centro', 'delta', 'bravo', 'royal'].some(k => p.title.toLowerCase().includes(k));
                                                                        }).map(p => (
                                                                            <option key={p.id} value={p.title}>{p.title} ({formatRupiah(p.price)})</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                disabled={!selectedCrossPkgTitle}
                                                                onClick={() => {
                                                                    const found = packages.find(p => p.title === selectedCrossPkgTitle);
                                                                    if (found && !extraPackages.some(ep => ep.title === found.title)) {
                                                                        setExtraPackages([...extraPackages, found]);
                                                                        setSelectedCrossPkgTitle('');
                                                                        setShowCrossPkgBox(false);
                                                                        showToast(`Layanan ${found.title} (${formatRupiah(found.price)}) berhasil ditambahkan! 📦`, 'success');
                                                                    }
                                                                }}
                                                                className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-lg"
                                                            >
                                                                ✓ Masukkan Layanan Ini ke Pesanan Saya
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Daftar Paket Tambahan Terpilih */}
                                                    {extraPackages.length > 0 && (
                                                        <div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20 text-left">
                                                            <div className="text-[11px] text-teal-300 font-semibold uppercase tracking-wider">
                                                                Paket Tambahan Terpilih:
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {extraPackages.map(pkg => (
                                                                    <div
                                                                        key={pkg.id || pkg.title}
                                                                        className="flex items-center justify-between p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/30 text-xs"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-teal-400 font-bold">📦</span>
                                                                            <div>
                                                                                <div className="font-semibold text-white">{pkg.title}</div>
                                                                                <div className="text-[10px] text-teal-300">{formatRupiah(pkg.price)} • {pkg.category || 'Paket Layanan'}</div>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExtraPackages(extraPackages.filter(p => p.title !== pkg.title))}
                                                                            className="text-red-400 hover:text-red-300 p-1 text-xs"
                                                                            title="Hapus Paket"
                                                                        >
                                                                            ✕ Hapus
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

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
                                                            {Object.entries(STUDIO_ADDONS_PRICING.people).map(([label, price]) => (
                                                                <option key={label} value={label}>
                                                                    {label} {price > 0 ? `(+${formatRupiah(price)})` : ''}
                                                                </option>
                                                            ))}
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
                                                            {Object.entries(STUDIO_ADDONS_PRICING.time).map(([label, price]) => (
                                                                <option key={label} value={label}>
                                                                    {label} {price > 0 ? `(+${formatRupiah(price)})` : ''}
                                                                </option>
                                                            ))}
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
                                                            {Object.entries(STUDIO_ADDONS_PRICING.print).map(([label, price]) => (
                                                                <option key={label} value={label}>
                                                                    {label} {price > 0 ? `(+${formatRupiah(price)})` : ''}
                                                                </option>
                                                            ))}
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
                                                            {Object.entries(STUDIO_ADDONS_PRICING.frame).map(([label, price]) => (
                                                                <option key={label} value={label}>
                                                                    {label} {price > 0 ? `(+${formatRupiah(price)})` : ''}
                                                                </option>
                                                            ))}
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

                                                    {extraPackages && extraPackages.length > 0 && (
                                                        <div className="flex justify-between items-center mb-2 text-teal-300">
                                                            <span className="text-sm">Paket Tambahan ({extraPackages.length} Paket)</span>
                                                            <span className="font-semibold">+ {formatRupiah(extraPkgsTotal)}</span>
                                                        </div>
                                                    )}

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
                                    if (bookingStep > 2) {
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
                                        if (p.is_active === false) return false;
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
                                                <div className="w-full">
                                                    <label className="text-[11px] text-gray-400 ml-2">
                                                        {(pkgTitleLower.includes('prewed') || pkgCategoryLower.includes('prewed'))
                                                            ? "Tanggal Sesi Prewed *"
                                                            : (pkgTitleLower.includes('engagement') || pkgTitleLower.includes('lamaran') || pkgCategoryLower.includes('engagement') || pkgCategoryLower.includes('lamaran'))
                                                            ? "Tanggal Acara Lamaran *"
                                                            : "Tanggal Acara *"}
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={selectedEventDate}
                                                        onChange={handleDateChange}
                                                        className="input-glass mt-1 w-full"
                                                        required
                                                    />
                                                </div>
                                            )}

                                            {isThreeDates && (
                                                <>
                                                    <div className="w-full">
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Prewed (Opsional)</label>
                                                        <input
                                                            type="date"
                                                            value={selectedPrewedDate}
                                                            onChange={handlePrewedDateChange}
                                                            className="input-glass mt-1 w-full"
                                                        />
                                                    </div>
                                                    <div className="w-full">
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Akad *</label>
                                                        <input
                                                            type="date"
                                                            value={selectedEventDate}
                                                            onChange={handleDateChange}
                                                            className="input-glass mt-1 w-full"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="w-full">
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Resepsi</label>
                                                        <input
                                                            type="date"
                                                            value={selectedResepsiDate}
                                                            onChange={handleResepsiDateChange}
                                                            className="input-glass mt-1 w-full"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {(!isSingleDate && !isThreeDates) && (
                                                isResepsiFlow ? (
                                                    <>
                                                        <div className="w-full">
                                                            <label className="text-[11px] text-gray-400 ml-2">Tanggal Akad *</label>
                                                            <input
                                                                type="date"
                                                                value={selectedEventDate}
                                                                onChange={handleDateChange}
                                                                className="input-glass mt-1 w-full"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="w-full">
                                                            <label className="text-[11px] text-gray-400 ml-2">Tanggal Resepsi</label>
                                                            <input
                                                                type="date"
                                                                value={selectedResepsiDate}
                                                                onChange={handleResepsiDateChange}
                                                                className="input-glass mt-1 w-full"
                                                                required={isResepsiFlow}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full">
                                                        <label className="text-[11px] text-gray-400 ml-2">Tanggal Acara *</label>
                                                        <input
                                                            type="date"
                                                            value={selectedEventDate}
                                                            onChange={handleDateChange}
                                                            className="input-glass mt-1 w-full"
                                                            required
                                                        />
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="flex gap-3 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setView('detail')}
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
                                            <div>
                                                <label className="text-[11px] text-gray-400 ml-2 block font-semibold mb-1 uppercase">No WhatsApp *</label>
                                                <div className="flex gap-2 items-center">
                                                    <div className="relative shrink-0">
                                                        <select
                                                            value={phoneCountryCode}
                                                            onChange={(e) => setPhoneCountryCode(e.target.value)}
                                                            className="input-glass py-3.5 pl-3 pr-7 rounded-2xl bg-[#141820] text-white text-xs font-semibold appearance-none cursor-pointer focus:border-white/40 shadow-sm border border-white/10"
                                                        >
                                                            <option value="+62" className="bg-[#121212] text-white">🇮🇩 +62</option>
                                                            <option value="+60" className="bg-[#121212] text-white">🇲🇾 +60</option>
                                                        </select>
                                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[9px]">▼</div>
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="tel"
                                                            value={bookingPhone}
                                                            onChange={handlePhoneInputChange}
                                                            placeholder={phoneCountryCode === '+62' ? "812-3456-7890 (Contoh)" : "12-345-6789 (Contoh)"}
                                                            className="input-glass w-full py-3.5 text-sm placeholder:text-gray-500 placeholder:text-xs"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-gray-400/80 mt-1 ml-2 leading-tight">Cukup lanjutkan sisa nomor Anda tanpa angka 0 di awal.</p>
                                            </div>
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
                                                onClick={handleNextStep3}
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
                                        {/* Tambah Layanan Lainnya (Bundling) */}
                                        <div className="glass-panel p-4 rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-blue-500/10 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">✨</span>
                                                    <span className="text-sm font-semibold text-teal-300">Tambah Layanan Lainnya (Bundling)</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCrossPkgBox(!showCrossPkgBox)}
                                                    className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl transition font-semibold"
                                                >
                                                    {showCrossPkgBox ? '✕ Batal' : '➕ Tambah Layanan Lain'}
                                                </button>
                                            </div>

                                            <p className="text-xs text-gray-300 leading-relaxed text-left">
                                                Mau sekalian pesan layanan lainnya? (Contoh: <em>Foto Studio + Makeup Rias</em>, atau <em>Wedding + Dekorasi</em>). Seluruh rincian fasilitas &amp; garansi langsung terbit rapi dalam 1 invoice resmi.
                                            </p>

                                            {showCrossPkgBox && (
                                                <div className="bg-black/50 border border-teal-500/30 p-3.5 rounded-2xl flex flex-col gap-3 animate-in fade-in">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        <div className="flex flex-col gap-1 text-left">
                                                            <label className="text-[10px] text-gray-400 ml-1">Pilih Kategori Layanan</label>
                                                            <select
                                                                value={crossPkgDiv}
                                                                onChange={e => {
                                                                    setCrossPkgDiv(e.target.value);
                                                                    setSelectedCrossPkgTitle('');
                                                                }}
                                                                className="input-glass bg-[#18262b] text-xs py-2 text-white appearance-none cursor-pointer"
                                                            >
                                                                <option value="Lady Makeup">💄 Lady Makeup (Rias &amp; Gaun)</option>
                                                                <option value="Studio Lapanbelas">📸 Studio Lapanbelas (Photoshoot)</option>
                                                                <option value="lapanbelas.id">💍 Wedding / Lapanbelas (Dokumentasi)</option>
                                                                <option value="Lapanbelas Dekorasi">🎪 Lapanbelas Dekorasi (Pelaminan)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1 text-left">
                                                            <label className="text-[10px] text-gray-400 ml-1">Pilih Paket Layanan</label>
                                                            <select
                                                                value={selectedCrossPkgTitle}
                                                                onChange={e => setSelectedCrossPkgTitle(e.target.value)}
                                                                className="input-glass bg-[#18262b] text-xs py-2 text-white appearance-none cursor-pointer"
                                                            >
                                                                <option value="">-- Pilih Paket Layanan Tambahan --</option>
                                                                {packages.filter(p => {
                                                                    const cat = (p.category || '').toLowerCase();
                                                                    if (crossPkgDiv === 'Lady Makeup') return cat.includes('makeup');
                                                                    if (crossPkgDiv === 'Studio Lapanbelas') return cat.includes('studio') || ['wisuda', 'family', 'couple', 'photo self', 'group studio'].some(k => cat.includes(k));
                                                                    if (crossPkgDiv === 'Lapanbelas Dekorasi') return cat.includes('dekor');
                                                                    return cat.includes('wedding') || ['gold', 'silver', 'bronze', 'platinum', 'centro', 'delta', 'bravo', 'royal'].some(k => p.title.toLowerCase().includes(k));
                                                                }).map(p => (
                                                                    <option key={p.id} value={p.title}>{p.title} ({formatRupiah(p.price)})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={!selectedCrossPkgTitle}
                                                        onClick={() => {
                                                            const found = packages.find(p => p.title === selectedCrossPkgTitle);
                                                            if (found && !extraPackages.some(ep => ep.title === found.title)) {
                                                                setExtraPackages([...extraPackages, found]);
                                                                setSelectedCrossPkgTitle('');
                                                                setShowCrossPkgBox(false);
                                                                showToast(`Layanan ${found.title} (${formatRupiah(found.price)}) berhasil ditambahkan! 📦`, 'success');
                                                            }
                                                        }}
                                                        className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-lg"
                                                    >
                                                        ✓ Masukkan Layanan Ini ke Pesanan Saya
                                                    </button>
                                                </div>
                                            )}

                                            {/* Daftar Paket Tambahan Terpilih */}
                                            {extraPackages.length > 0 && (
                                                <div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20 text-left">
                                                    <div className="text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
                                                        Paket Tambahan Terpilih:
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {extraPackages.map(pkg => (
                                                            <div key={pkg.id || pkg.title} className="flex justify-between items-center bg-black/40 border border-teal-500/30 px-3.5 py-2.5 rounded-2xl text-xs text-white">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold text-teal-300">📦 {pkg.title}</span>
                                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/20 text-teal-200 border border-teal-500/30">
                                                                            {pkg.category || 'Paket Tambahan'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11px] text-emerald-400 font-semibold">{formatRupiah(pkg.price)}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExtraPackages(extraPackages.filter(p => p.title !== pkg.title))}
                                                                    className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-white/5 rounded-lg transition"
                                                                    title="Hapus paket tambahan ini"
                                                                >
                                                                    ✕ Hapus
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <SvgIcon name="package" className="w-4 h-4 text-white" />
                                                <span className="text-sm font-semibold">Layanan Tambahan (Add-on)</span>
                                            </div>

                                            {/* Dropdown 1: Makeup & Busana */}
                                            {addonOptions.map(parseAddon).some(p => p.category === 'Makeup & Busana') && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-400 ml-2">💄 Makeup Artis & Busana</label>
                                                    <select
                                                        value={getSelectedAddonIdForCategory('Makeup & Busana')}
                                                        onChange={(e) => handleCategorySelect('Makeup & Busana', e.target.value)}
                                                        className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                    >
                                                        <option value="" className="bg-[#121212] text-gray-400">-- Pilih Makeup & Busana (Optional) --</option>
                                                        {addonOptions
                                                            .map(parseAddon)
                                                            .filter(p => p.category === 'Makeup & Busana')
                                                            .map(p => (
                                                                <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                    {p.labelOnly} ({formatRupiah(p.price)})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Dropdown 2: Foto & Cetak */}
                                            {addonOptions.map(parseAddon).some(p => p.category === 'Foto & Cetak') && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-400 ml-2">📸 Foto & Cetak (Bingkai/Album)</label>
                                                    <select
                                                        value={getSelectedAddonIdForCategory('Foto & Cetak')}
                                                        onChange={(e) => handleCategorySelect('Foto & Cetak', e.target.value)}
                                                        className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                    >
                                                        <option value="" className="bg-[#121212] text-gray-400">-- Pilih Foto & Cetak (Optional) --</option>
                                                        {addonOptions
                                                            .map(parseAddon)
                                                            .filter(p => p.category === 'Foto & Cetak')
                                                            .map(p => (
                                                                <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                    {p.labelOnly} ({formatRupiah(p.price)})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Dropdown 3: Video & Drone */}
                                            {addonOptions.map(parseAddon).some(p => p.category === 'Video & Drone') && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-400 ml-2">🎬 Video Cinema & Drone</label>
                                                    <select
                                                        value={getSelectedAddonIdForCategory('Video & Drone')}
                                                        onChange={(e) => handleCategorySelect('Video & Drone', e.target.value)}
                                                        className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                    >
                                                        <option value="" className="bg-[#121212] text-gray-400">-- Pilih Video / Drone (Optional) --</option>
                                                        {addonOptions
                                                            .map(parseAddon)
                                                            .filter(p => p.category === 'Video & Drone')
                                                            .map(p => (
                                                                <option key={p.id} value={p.id} className="bg-[#121212] text-white">
                                                                    {p.labelOnly} ({formatRupiah(p.price)})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Dropdown 4: Dekorasi */}
                                            {addonOptions.map(parseAddon).some(p => p.category === 'Dekorasi') && (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-gray-400 ml-2">🎪 Dekorasi & Acara</label>
                                                    <select
                                                        value={getSelectedAddonIdForCategory('Dekorasi')}
                                                        onChange={(e) => handleCategorySelect('Dekorasi', e.target.value)}
                                                        className="input-glass mt-1 bg-[#1e1e1e] text-white outline-none focus:border-white/40"
                                                    >
                                                        <option value="" className="bg-[#121212] text-gray-400">-- Pilih Dekorasi & Acara (Optional) --</option>
                                                        {addonOptions
                                                            .map(parseAddon)
                                                            .filter(p => p.category === 'Dekorasi')
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
                                                            let cBadge = "bg-blue-500/10 border border-blue-500/20 text-blue-400";
                                                            if (parsed.category === 'Makeup & Busana') {
                                                                cBadge = "bg-pink-500/10 border border-pink-500/20 text-pink-400";
                                                            } else if (parsed.category === 'Video & Drone') {
                                                                cBadge = "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400";
                                                            } else if (parsed.category === 'Dekorasi') {
                                                                cBadge = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
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
                                            {extraPackages && extraPackages.length > 0 && (
                                                <div className="flex justify-between items-center mb-2 text-teal-300">
                                                    <span className="text-sm">Paket Tambahan ({extraPackages.length} Paket)</span>
                                                    <span className="font-semibold">+ {formatRupiah(extraPackages.reduce((sum, p) => sum + Number(p.price || 0), 0))}</span>
                                                </div>
                                            )}
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

            {/* Bottom Navigation (100% Matching Reference Dock) */}
            {view === 'home' && (
                <div
                    className="fixed left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-center z-[9999] pt-2 bg-white/95 dark:bg-[#051d1f]/95 border-t border-slate-200/90 dark:border-teal-400/25 rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] transition-colors duration-300"
                    style={{
                        bottom: '0px',
                        WebkitBackdropFilter: 'blur(24px)',
                        backdropFilter: 'blur(24px)',
                        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
                    }}
                >
                    {/* 1. Beranda */}
                    <button
                        type="button"
                        onClick={() => handleTabClick('beranda')}
                        className={`relative flex flex-col items-center gap-1 py-1 px-2 min-w-[3.8rem] transition-all duration-200 cursor-pointer ${
                            activeTab === 'beranda'
                                ? 'text-[#0d9488] dark:text-[#2dd4bf] font-extrabold'
                                : 'text-slate-500 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white font-medium'
                        }`}
                    >
                        <svg className="w-5 h-5" fill={activeTab === 'beranda' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5.5v-6h-5v6H4a1 1 0 01-1-1v-9.5z" />
                        </svg>
                        <span className="text-[10px] tracking-tight">Beranda</span>
                        {activeTab === 'beranda' && (
                            <span className="absolute -bottom-1 w-8 h-[3px] rounded-full bg-[#0d9488] dark:bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]"></span>
                        )}
                    </button>

                    {/* 2. Paket */}
                    <button
                        type="button"
                        onClick={() => handleTabClick('package')}
                        className={`relative flex flex-col items-center gap-1 py-1 px-2 min-w-[3.8rem] transition-all duration-200 cursor-pointer ${
                            activeTab === 'package'
                                ? 'text-[#0d9488] dark:text-[#2dd4bf] font-extrabold'
                                : 'text-slate-500 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white font-medium'
                        }`}
                    >
                        <svg className="w-5 h-5" fill={activeTab === 'package' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-[10px] tracking-tight">Paket</span>
                        {activeTab === 'package' && (
                            <span className="absolute -bottom-1 w-8 h-[3px] rounded-full bg-[#0d9488] dark:bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]"></span>
                        )}
                    </button>

                    {/* 3. Sample */}
                    <button
                        type="button"
                        onClick={() => handleTabClick('sample')}
                        className={`relative flex flex-col items-center gap-1 py-1 px-2 min-w-[3.8rem] transition-all duration-200 cursor-pointer ${
                            activeTab === 'sample'
                                ? 'text-[#0d9488] dark:text-[#2dd4bf] font-extrabold'
                                : 'text-slate-500 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white font-medium'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        </svg>
                        <span className="text-[10px] tracking-tight">Sample</span>
                        {activeTab === 'sample' && (
                            <span className="absolute -bottom-1 w-8 h-[3px] rounded-full bg-[#0d9488] dark:bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]"></span>
                        )}
                    </button>

                    {/* 4. My Order (Cart with Red Badge matching Reference) */}
                    <button
                        type="button"
                        onClick={() => handleTabClick('order')}
                        className={`relative flex flex-col items-center gap-1 py-1 px-2 min-w-[3.8rem] transition-all duration-200 cursor-pointer ${
                            activeTab === 'order'
                                ? 'text-[#0d9488] dark:text-[#2dd4bf] font-extrabold'
                                : 'text-slate-500 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white font-medium'
                        }`}
                    >
                        <div className="relative">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12m-9 3a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                            </svg>
                            <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-md border border-white/20 z-10">
                                {orders.length > 0 ? orders.length : 2}
                            </span>
                        </div>
                        <span className="text-[10px] tracking-tight">My Order</span>
                        {activeTab === 'order' && (
                            <span className="absolute -bottom-1 w-8 h-[3px] rounded-full bg-[#0d9488] dark:bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]"></span>
                        )}
                    </button>

                    {/* 5. Profile */}
                    <button
                        type="button"
                        onClick={() => handleTabClick('profile')}
                        className={`relative flex flex-col items-center gap-1 py-1 px-2 min-w-[3.8rem] transition-all duration-200 cursor-pointer ${
                            activeTab === 'profile'
                                ? 'text-[#0d9488] dark:text-[#2dd4bf] font-extrabold'
                                : 'text-slate-500 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white font-medium'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-[10px] tracking-tight">Profile</span>
                        {activeTab === 'profile' && (
                            <span className="absolute -bottom-1 w-8 h-[3px] rounded-full bg-[#0d9488] dark:bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]"></span>
                        )}
                    </button>
                </div>
            )}

            {/* Media Modal: Video Player / Vertical Grid Photo Album */}
            {mediaModalOpen && portfolio.length > 0 && (() => {
                const activeItem = portfolio[currentMediaIndex];
                if (!activeItem) return null;
                const imageUrls = activeItem.type === 'photo' ? parseUrls(activeItem.url) : [];
                
                return (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-4 py-3.5 text-white z-20 sticky top-0 w-full bg-black/80 backdrop-blur-md border-b border-white/10">
                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                                <SvgIcon name={activeItem.type === 'video' ? 'video' : 'image'} className="w-4 h-4 text-emerald-400 shrink-0" />
                                <h3 className="font-semibold text-sm truncate text-white drop-shadow-md">{activeItem.title}</h3>
                                {activeItem.type === 'photo' && imageUrls.length > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium shrink-0">
                                        {imageUrls.length} Foto
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => {
                                    setMediaModalOpen(false);
                                    setFullscreenPhoto(null);
                                }} 
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-md transition"
                            >
                                <SvgIcon name="x" className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        {activeItem.type === 'video' ? (
                            /* Video Player View */
                            <div className="flex-1 w-full h-full flex items-center justify-center p-4">
                                <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/15 relative">
                                    <iframe
                                        src={getYouTubeEmbedUrl(activeItem.url)}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        title={activeItem.title}
                                    ></iframe>
                                </div>
                            </div>
                        ) : (
                            /* Vertical Scrollable Grid Layout for Photos */
                            <div className="flex-1 w-full h-full overflow-y-auto p-4 overscroll-contain">
                                <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto pb-12">
                                    {imageUrls.map((url, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => setFullscreenPhoto({
                                                url,
                                                index: idx,
                                                total: imageUrls.length,
                                                urls: imageUrls,
                                                title: activeItem.title
                                            })}
                                            className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer hover:border-white/30 transition-all duration-300 shadow-md active:scale-95"
                                        >
                                            <img 
                                                src={url} 
                                                alt={`${activeItem.title} Foto ${idx + 1}`} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-2.5">
                                                <span className="text-[10px] font-medium text-white/90 drop-shadow">Foto {idx + 1}</span>
                                                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                                    <SvgIcon name="arrow-up-right" className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Lightbox / Fullscreen Image View with Touch Swipe & Gesture Navigation */}
            <PhotoLightboxModal
                isOpen={!!fullscreenPhoto}
                photoData={fullscreenPhoto}
                onClose={() => setFullscreenPhoto(null)}
                onIndexChange={(newIdx, newUrl) => {
                    setFullscreenPhoto(prev => prev ? { ...prev, index: newIdx, url: newUrl } : null);
                }}
                SvgIcon={SvgIcon}
            />

            {/* Room Studio Preview Modal */}
            {roomPreview && (() => {
                const dbPhotos = roomPhotosDb[roomPreview.name];
                const images = (dbPhotos && dbPhotos.length > 0) ? dbPhotos : (roomSampleImages[roomPreview.name] || []);
                return (
                    <RoomPreviewModal
                        roomPreview={roomPreview}
                        images={images}
                        onClose={() => setRoomPreview(null)}
                        onSelectRoom={(name) => {
                            setSelectedRoom(name);
                            setRoomPreview(null);
                        }}
                    />
                );
            })()}

            {/* In-App Native Payment & E-Ticket Modal */}
            <InAppPaymentModal
                isOpen={isInAppPaymentOpen}
                onClose={() => {
                    setIsInAppPaymentOpen(false);
                    fetchOrders();
                }}
                paymentData={inAppPaymentData}
                onPaymentSuccess={(appt) => {
                    showToast("Pembayaran DP Berhasil Diterima!", "success");
                    fetchOrders();
                }}
            />

            {/* Modal Reschedule Mandiri Klien */}
            <RescheduleModal
                isOpen={isRescheduleModalOpen}
                onClose={() => {
                    setIsRescheduleModalOpen(false);
                    setSelectedRescheduleOrder(null);
                }}
                order={selectedRescheduleOrder}
                userEmail={userEmail}
                showToast={showToast}
                onRescheduleSuccess={(newDate, newTime) => {
                    fetchOrders();
                }}
            />
        </div>
    );
}

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("[18Studio App Error caught]", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#030708] text-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-teal-950/40 border border-teal-500/20 backdrop-blur-xl rounded-3xl p-6 text-center space-y-4 shadow-2xl">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-3xl">
                            📸
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white">18Studio Memuat Ulang</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Terjadi kendala visual sementara pada aplikasi. Klik tombol di bawah untuk melanjutkan kembali dengan lancar.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-bold rounded-2xl shadow-lg transition active:scale-95"
                        >
                            🔄 Muat Ulang Halaman
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <AppErrorBoundary>
        <App />
    </AppErrorBoundary>
);