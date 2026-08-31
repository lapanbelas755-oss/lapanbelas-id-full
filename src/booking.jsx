import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import PhotoLightboxModal from './components/PhotoLightboxModal';
import InAppPaymentModal from './components/InAppPaymentModal';
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

const getCategoryIcon = (catId) => {
    switch (catId) {
        case MAIN_CATEGORIES.WEDDING:
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-13a2 2 0 0 1 2-2h12" />
                    <rect x="7" y="6.5" width="14" height="14" rx="2.5" />
                    <path d="m7 17.5 4-4a1 1 0 0 1 1.4 0l1.6 1.6" />
                    <polygon points="14,10 18,12.5 14,15" fill="#fbbf24" stroke="none" />
                    <circle cx="11" cy="10.5" r="1" fill="#fbbf24" />
                </svg>
            );
        case MAIN_CATEGORIES.PHOTO_STUDIO:
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                </svg>
            );
        case MAIN_CATEGORIES.MAKEUP:
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 8V5.5a2.5 2.5 0 0 1 2.5-2.5h0a1 1 0 0 1 .9.5l2.6 4.5" />
                    <path d="M9 8h6" />
                    <rect x="8" y="8" width="8" height="5" rx="0.5" />
                    <rect x="7" y="13" width="10" height="8" rx="1.5" />
                    <path d="M19 3.5h2M20 2.5v2" />
                </svg>
            );
        case MAIN_CATEGORIES.DEKORASI:
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3h4l1 3H4L5 3z" />
                    <path d="M7 6v15" />
                    <path d="M5 21h4" />
                    <path d="M11 13a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-4z" />
                    <path d="M12 11V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M13 18v2M19 18v2" />
                </svg>
            );
        default:
            return null;
    }
};

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
};

const getDiscountedPriceInfo = (pkg) => {
    if (!pkg || !pkg.title) return { original: null, price: 0 };
    const title = pkg.title.toLowerCase();
    if (title.includes("delta")) return { original: 18000000, price: 17000000 };
    if (title.includes("centro")) return { original: 9700000, price: 8700000 };
    if (title.includes("bravo")) return { original: 7900000, price: 7300000 };
    if (title.includes("platinum")) return { original: 6800000, price: 6500000 };
    return { original: null, price: pkg.price };
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

const getPackageDuration = (pkg) => {
    if (!pkg || !pkg.description) return 15;
    const match = pkg.description.match(/\[DURATION\]:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 15;
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
    "Room C - Modern": [
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800"
    ],
    "Room D - Kubah": [
        "https://images.unsplash.com/photo-1581850518616-bcb8077fa212?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800"
    ],
    "Room E - Custom": [
        "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800"
    ]
};

const roomDescriptions = {
    "Room A - Studio White": "Foto studio konsep modern minimalis serba putih, cocok untuk wisuda, personal, dan keluarga.",
    "Room B - Luxury": "Suasana elegan bertema luxury wedding & prewedding dengan pencahayaan mewah.",
    "Room C - Modern": "Desain kontemporer estetik dengan sentuhan arsitektur modern kekinian.",
    "Room D - Kubah": "Latar lengkungan kubah klasik ikonik yang artistik dan fotogenik.",
    "Room E - Custom": "Ruangan tematik khusus dengan dekorasi dinamis sesuai konsep photoshoot Anda."
};

function BookingApp() {
    // Stepper state: 1 (Paket & Kategori) -> 2 (Jadwal) -> 3 (Data Diri) -> 4 (Bayar / Selesai)
    const [step, setStep] = useState(1);

    // Data packages & addons from DB
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [addonOptions, setAddonOptions] = useState([]);
    const [roomPhotosDb, setRoomPhotosDb] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Step 1: Category & Package selection
    const [selectedCategory, setSelectedCategory] = useState(MAIN_CATEGORIES.PHOTO_STUDIO);
    const [selectedSubcat, setSelectedSubcat] = useState("");
    const [selectedPkg, setSelectedPkg] = useState(null);

    // Photo Studio Options
    const [selectedRoom, setSelectedRoom] = useState("Room A - Studio White");
    const [addonPeople, setAddonPeople] = useState("Tanpa Tambahan Orang");
    const [addonTime, setAddonTime] = useState("Tanpa Tambahan Waktu");
    const [addonPrint, setAddonPrint] = useState("Tanpa Cetak Foto");
    const [addonFrame, setAddonFrame] = useState("Tanpa Bingkai Foto");

    // Non-studio addons
    const [selectedAddons, setSelectedAddons] = useState([]);

    // Step 2: Schedule state
    const [prewedDate, setPrewedDate] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [resepsiDate, setResepsiDate] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00 - 09:45');
    const [bookedSlots, setBookedSlots] = useState([]);
    const [dateSlotStatus, setDateSlotStatus] = useState({
        checking: false,
        date: '',
        remainingSlots: 3,
        maxSlots: 3,
        bookedCount: 0,
        isClosed: false
    });

    // Step 3: Customer Data
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState('+62');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');

    // Step 4: Payment state
    const [paymentType, setPaymentType] = useState('dp'); // 'dp' | 'full'
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherInput, setVoucherInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [isTacAccepted, setIsTacAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedOrder, setCompletedOrder] = useState(null);
    const [inAppPaymentData, setInAppPaymentData] = useState(null);
    const [isInAppPaymentOpen, setIsInAppPaymentOpen] = useState(false);

    // Room Preview Modal state
    const [roomPreview, setRoomPreview] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    // Load initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Check query params for pre-selected category
                const params = new URLSearchParams(window.location.search);
                const catParam = params.get('cat') || params.get('category');
                if (catParam) {
                    const c = catParam.toLowerCase();
                    if (c.includes('wedding') || c.includes('lapanbelas')) setSelectedCategory(MAIN_CATEGORIES.WEDDING);
                    else if (c.includes('makeup') || c.includes('mua')) setSelectedCategory(MAIN_CATEGORIES.MAKEUP);
                    else if (c.includes('dekor')) setSelectedCategory(MAIN_CATEGORIES.DEKORASI);
                    else setSelectedCategory(MAIN_CATEGORIES.PHOTO_STUDIO);
                }

                // 1. Fetch packages
                const { data: pkgs, error: pErr } = await supabase
                    .from('packages')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (!pErr && pkgs) {
                    setPackages(pkgs);
                }

                // 2. Fetch addons
                const { data: addons, error: aErr } = await supabase
                    .from('addons')
                    .select('*')
                    .order('price', { ascending: true });

                if (!aErr && addons) {
                    setAddonOptions(addons);
                }

                // 3. Fetch room photos from DB
                const { data: roomPhotosData } = await supabase
                    .from('room_photos')
                    .select('room_name, photo_url')
                    .order('created_at', { ascending: true });

                if (roomPhotosData) {
                    const photosByRoom = {};
                    roomPhotosData.forEach(item => {
                        if (!photosByRoom[item.room_name]) photosByRoom[item.room_name] = [];
                        photosByRoom[item.room_name].push(item.photo_url);
                    });
                    setRoomPhotosDb(photosByRoom);
                }
            } catch (err) {
                console.error("Failed to load packages/addons:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Filter packages by active category
    const filteredPackages = useMemo(() => {
        return packages.filter(pkg => {
            const mainCat = getMainCategory(pkg.category);
            const matchesCat = mainCat === selectedCategory;
            if (!matchesCat) return false;
            if (selectedSubcat !== "All") {
                return pkg.category === selectedSubcat;
            }
            return true;
        });
    }, [packages, selectedCategory, selectedSubcat]);

    // Available subcategories for the selected category
    const availableSubcategories = useMemo(() => {
        const subcats = new Set();
        packages.forEach(pkg => {
            if (getMainCategory(pkg.category) === selectedCategory && pkg.category) {
                subcats.add(pkg.category);
            }
        });
        return ["All", ...Array.from(subcats).sort()];
    }, [packages, selectedCategory]);

    const isPhotoStudio = selectedCategory === MAIN_CATEGORIES.PHOTO_STUDIO;

    const pkgTitleLower = selectedPkg ? selectedPkg.title.toLowerCase() : "";
    const pkgCategoryLower = selectedPkg && selectedPkg.category ? selectedPkg.category.toLowerCase() : "";

    // Single Date: Prewed, Prewedding, Couple, Engagement, Lamaran, Royal, Bronze, Akad Intimate, Intimate, Tasyakuran, Siraman, Pengajian, Wisuda, Family, dsb.
    const isSingleDate = pkgTitleLower.includes("royal") || 
        pkgTitleLower.includes("bronze") || 
        pkgTitleLower.includes("akad postwed") || 
        pkgTitleLower.includes("akad intimate") || 
        pkgTitleLower.includes("intimate") || 
        pkgTitleLower.includes("tasyakuran") || 
        pkgTitleLower.includes("prewed") || 
        pkgTitleLower.includes("prewedding") || 
        pkgTitleLower.includes("engagement") || 
        pkgTitleLower.includes("lamaran") || 
        pkgTitleLower.includes("siraman") || 
        pkgTitleLower.includes("pengajian") ||
        pkgCategoryLower.includes("prewed") ||
        pkgCategoryLower.includes("prewedding") ||
        pkgCategoryLower.includes("engagement") ||
        pkgCategoryLower.includes("lamaran");

    // 3 Dates: Paket Delta & Centro (Prewed + Akad + Resepsi)
    const isThreeDates = pkgTitleLower.includes("delta") || pkgTitleLower.includes("centro");

    // Special Akad + Resepsi untuk MUA & Dekorasi
    const isSpecialAkadResepsi = (selectedCategory === MAIN_CATEGORIES.MAKEUP || selectedCategory === MAIN_CATEGORIES.DEKORASI) &&
        ((pkgTitleLower.includes("akad") && pkgTitleLower.includes("resepsi")) ||
         (pkgCategoryLower.includes("akad") && pkgCategoryLower.includes("resepsi")));

    // Resepsi Flow: Paket Wedding standar (Akad + Resepsi) atau Paket Bundling Akad-Resepsi
    const isResepsiFlow = (!isSingleDate && !isThreeDates && selectedCategory === MAIN_CATEGORIES.WEDDING) || (isSpecialAkadResepsi && !isSingleDate);

    // Fetch booked slots for double-booking guard
    useEffect(() => {
        if (!isPhotoStudio || !eventDate) {
            setBookedSlots([]);
            return;
        }

        const fetchBooked = async () => {
            try {
                // 1. Coba fetch dari endpoint backend (melewati RLS Supabase)
                const res = await fetch(`/api/public/booked-slots/${eventDate}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.bookedSlots)) {
                        setBookedSlots(data.bookedSlots);
                        return;
                    }
                }

                // 2. Fallback ke Supabase query jika API tidak tersedia
                const { data, error } = await supabase
                    .from('appointments')
                    .select('jam_akad, additional_notes, package_name, status')
                    .eq('event_date', eventDate);

                if (!error && data) {
                    const validAppts = data.filter(d => d.status !== 'Dibatalkan' && d.status !== 'Batal');
                    setBookedSlots(validAppts);
                }
            } catch (err) {
                console.error("Error fetching booked slots:", err);
            }
        };

        fetchBooked();
    }, [isPhotoStudio, eventDate]);

    // Format DMY Helper
    const formatDmy = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    // Fetch remaining slot availability for Non-Studio dates
    useEffect(() => {
        if (isPhotoStudio || !eventDate) {
            setDateSlotStatus({
                checking: false,
                date: '',
                remainingSlots: 3,
                maxSlots: 3,
                bookedCount: 0,
                isClosed: false
            });
            return;
        }

        let isMounted = true;
        const fetchNonStudioSlot = async () => {
            setDateSlotStatus(prev => ({ ...prev, checking: true, date: eventDate }));
            try {
                // 1. Coba fetch dari endpoint backend
                let dateAvail = null;
                let appts = null;

                try {
                    const res = await fetch(`/api/public/booked-slots/${eventDate}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) {
                            dateAvail = json.dateAvailability;
                            appts = json.nonStudioAppointments;
                        }
                    }
                } catch (e) { }

                // 2. Fallback ke Supabase jika belum terisi
                if (!dateAvail && !appts) {
                    const [resAvail, resAppts] = await Promise.all([
                        supabase.from('date_availability').select('*').eq('date', eventDate).maybeSingle(),
                        supabase.from('appointments')
                            .select('id, package_name, status')
                            .or(`event_date.eq.${eventDate},resepsi_date.eq.${eventDate},prewed_date.eq.${eventDate}`)
                            .not('status', 'in', '("Dibatalkan","Batal")')
                    ]);
                    dateAvail = resAvail.data;
                    appts = resAppts.data;
                }

                if (!isMounted) return;

                const maxSlots = dateAvail?.max_slots || 3;
                const isClosed = Boolean(dateAvail?.is_manually_closed);

                let bookedCount = 0;
                if (appts && appts.length > 0) {
                    bookedCount = appts.filter(a => {
                        const pkg = packages.find(p => p.title === a.package_name);
                        return !pkg || getMainCategory(pkg.category) === selectedCategory;
                    }).length;
                } else if (dateAvail && dateAvail.slots_booked) {
                    bookedCount = Number(dateAvail.slots_booked);
                }

                const remainingSlots = Math.max(0, maxSlots - bookedCount);

                setDateSlotStatus({
                    checking: false,
                    date: eventDate,
                    remainingSlots,
                    maxSlots,
                    bookedCount,
                    isClosed
                });
            } catch (err) {
                console.error("Error fetching non-studio slot availability:", err);
                if (isMounted) {
                    setDateSlotStatus(prev => ({ ...prev, checking: false }));
                }
            }
        };

        fetchNonStudioSlot();
        return () => { isMounted = false; };
    }, [isPhotoStudio, eventDate, selectedCategory, packages]);

    // Addon category selection helpers (matching app.lapanbelas.id)
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

    // Calculate add-on price for studio
    const getStudioAddonsPrice = () => {
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

    const addonsTotal = isPhotoStudio ? getStudioAddonsPrice() : selectedAddons.reduce((sum, item) => sum + Number(item.price), 0);
    const priceInfo = getDiscountedPriceInfo(selectedPkg);
    const totalPrice = selectedPkg ? Math.max(0, Number(priceInfo.price) + addonsTotal - appliedDiscount) : 0;

    // Minimal DP Dinamis & Pintar (Custom DP via deskripsi [DP]: xxx atau Tier Kategori)
    const dpAmount = useMemo(() => {
        return calculateMinDp(selectedPkg, selectedCategory, totalPrice);
    }, [selectedPkg, selectedCategory, totalPrice]);

    const finalPayAmount = paymentType === 'dp' ? dpAmount : totalPrice;

    // Apply Voucher
    const handleApplyVoucher = async () => {
        const code = voucherCode.trim().toUpperCase();
        if (!code) return;

        try {
            const { data: voucher, error } = await supabase
                .from('vouchers')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (error || !voucher) {
                setAppliedDiscount(0);
                showToast("Voucher tidak valid atau tidak aktif!", "error");
                return;
            }

            if (voucher.used_count >= voucher.quota) {
                showToast("Kuota voucher ini sudah habis!", "error");
                return;
            }

            setAppliedDiscount(Number(voucher.discount_amount));
            showToast(`Voucher berhasil digunakan! Hemat ${formatRupiah(voucher.discount_amount)}`, "success");
        } catch (err) {
            showToast("Gagal memvalidasi voucher.", "error");
        }
    };

    // Navigation Step Guards
    const handleNextStep = () => {
        if (step === 1) {
            if (!selectedCategory) {
                showToast("Silakan pilih kategori layanan terlebih dahulu.", "error");
                return;
            }
            if (!selectedPkg) {
                showToast("Silakan pilih salah satu paket terlebih dahulu.", "error");
                return;
            }
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (step === 2) {
            if (isPhotoStudio) {
                if (!selectedRoom) {
                    showToast("Silakan pilih salah satu Room Studio terlebih dahulu!", "error");
                    return;
                }
                if (!eventDate) {
                    showToast("Tanggal Booking wajib dipilih!", "error");
                    return;
                }
                if (!selectedTimeSlot) {
                    showToast("Silakan pilih Sesi Jam Studio terlebih dahulu!", "error");
                    return;
                }
            } else if (isThreeDates || isResepsiFlow) {
                if (!eventDate) {
                    showToast("Tanggal Akad wajib diisi!", "error");
                    return;
                }
                if (dateSlotStatus.isClosed) {
                    showToast("Mohon maaf, tanggal acara telah ditutup oleh Admin. Silakan pilih tanggal lain.", "error");
                    return;
                }
                if (dateSlotStatus.remainingSlots <= 0) {
                    showToast("Mohon maaf, slot pada tanggal ini sudah PENUH! Silakan pilih tanggal lain.", "error");
                    return;
                }
            } else {
                if (!eventDate) {
                    const label = (pkgTitleLower.includes('prewed') || pkgCategoryLower.includes('prewed'))
                        ? "Tanggal Sesi Prewed"
                        : (pkgTitleLower.includes('engagement') || pkgTitleLower.includes('lamaran'))
                        ? "Tanggal Acara Lamaran"
                        : "Tanggal Acara / Sesi";
                    showToast(`${label} wajib diisi!`, "error");
                    return;
                }
                if (dateSlotStatus.isClosed) {
                    showToast("Mohon maaf, tanggal acara telah ditutup oleh Admin. Silakan pilih tanggal lain.", "error");
                    return;
                }
                if (dateSlotStatus.remainingSlots <= 0) {
                    showToast("Mohon maaf, slot pada tanggal ini sudah PENUH! Silakan pilih tanggal lain.", "error");
                    return;
                }
            }
            setStep(3);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (step === 3) {
            if (!customerName.trim()) {
                showToast("Nama Lengkap wajib diisi!", "error");
                return;
            }
            if (!customerPhone.trim()) {
                showToast("Nomor WhatsApp wajib diisi!", "error");
                return;
            }
            if (!customerEmail.trim() || !customerEmail.includes('@') || !customerEmail.includes('.')) {
                showToast("Alamat Email aktif wajib diisi dengan format yang benar (contoh@email.com)!", "error");
                return;
            }
            if (!customerAddress.trim()) {
                showToast("Alamat Lengkap wajib diisi!", "error");
                return;
            }
            setStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevStep = () => {
        if (step > 1) {
            setStep(step - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Helper Room Key Mapping (sama persis dengan backend & main app)
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

    // Submit Booking & Direct Payment Checkout
    const handleSubmitBookingAndPay = async () => {
        if (isSubmitting) return;
        if (!isTacAccepted) {
            showToast("Anda wajib menyetujui Syarat & Ketentuan 18Studio untuk melanjutkan.", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            const isStudio = selectedCategory === MAIN_CATEGORIES.PHOTO_STUDIO;

            // 1. Format notes
            let formattedNotes = "";
            if (isStudio) {
                formattedNotes += `[ROOM STUDIO]: ${selectedRoom}\n`;
                formattedNotes += `[JAM PHOTOSHOOT]: ${selectedTimeSlot}\n`;
                formattedNotes += `[DURASI SESI]: ${getPackageDuration(selectedPkg)} Menit\n`;
                if (addonPeople !== 'Tanpa Tambahan Orang') formattedNotes += `- Tambahan Orang: ${addonPeople}\n`;
                if (addonTime !== 'Tanpa Tambahan Waktu') formattedNotes += `- Tambahan Durasi: ${addonTime}\n`;
                if (addonPrint !== 'Tanpa Cetak Foto') formattedNotes += `- Cetak Foto: ${addonPrint}\n`;
                if (addonFrame !== 'Tanpa Bingkai Foto') formattedNotes += `- Bingkai Foto: ${addonFrame}\n`;
                formattedNotes += `\n`;
            }

            if (prewedDate) {
                formattedNotes += `[TANGGAL PREWED]: ${prewedDate}\n\n`;
            }

            if (!isStudio && selectedAddons.length > 0) {
                formattedNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + selectedAddons.map(a => `- ${a.name || a.label} (${formatRupiah(a.price)})`).join('\n') + `\n\n`;
            }
            if (customerNotes && customerNotes.trim() !== "") {
                formattedNotes += `[KETERANGAN TAMBAHAN]:\n${customerNotes.trim()}`;
            }

            // 2. Concurrency Conflict Check for Studio
            if (isStudio) {
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
                    const { data } = await supabase
                        .from('appointments')
                        .select('jam_akad, additional_notes, package_name, status')
                        .eq('event_date', eventDate);
                    checkAppts = data || [];
                }

                if (checkAppts && checkAppts.length > 0) {
                    const duration = getPackageDuration(selectedPkg);
                    let totalDuration = duration;
                    if (addonTime !== 'Tanpa Tambahan Waktu') {
                        const addTimeMatch = addonTime.match(/\+(\d+)\s*Menit/i);
                        if (addTimeMatch) totalDuration += parseInt(addTimeMatch[1], 10);
                    }

                    const slotStart = timeToMinutes(selectedTimeSlot.split(' - ')[0] || selectedTimeSlot);
                    const slotEnd = slotStart + totalDuration;
                    const selectedKey = mapRoomKey(selectedRoom);

                    const isConflict = checkAppts.some(d => {
                        if (d.status === 'Dibatalkan' || d.status === 'Batal') return false;
                        let jam = d.jam_akad ? d.jam_akad.slice(0, 5) : '';
                        const jamMatch = d.additional_notes ? d.additional_notes.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i) : null;
                        if (jamMatch) jam = jamMatch[1].trim();
                        if (!jam) return false;

                        const match = d.additional_notes ? d.additional_notes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i) : null;
                        const room = match ? match[1].trim() : '';
                        if (mapRoomKey(room) !== selectedKey) return false;

                        let bDuration = 45;
                        const durMatch = d.additional_notes ? d.additional_notes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i) : null;
                        if (durMatch) bDuration = parseInt(durMatch[1].trim(), 10);
                        else {
                            const pkgObj = packages.find(p => p.title === d.package_name);
                            if (pkgObj) bDuration = getPackageDuration(pkgObj);
                        }
                        if (d.additional_notes) {
                            const addTimeMatch = d.additional_notes.match(/- Tambahan Durasi: \+(\d+)\s*Menit/i);
                            if (addTimeMatch) bDuration += parseInt(addTimeMatch[1], 10);
                        }
                        const bookingStart = timeToMinutes(jam);
                        const bookingEnd = bookingStart + bDuration;
                        return slotStart < bookingEnd && slotEnd > bookingStart;
                    });

                    if (isConflict) {
                        showToast("Maaf, slot waktu dan ruangan ini baru saja dipesan orang lain. Silakan pilih jadwal lain.", "error");
                        setStep(2);
                        setIsSubmitting(false);
                        return;
                    }
                }
            }

            // 3. Generate Booking ID & credentials
            const bookingId = `BK-${Date.now().toString().slice(-6)}`;
            const clientPassword = Math.random().toString(36).slice(-6).toUpperCase();
            const cleanPhoneDigits = customerPhone.trim().replace(/^(\+?62|0)+/, '');
            const fullPhone = `${phoneCountryCode}${cleanPhoneDigits}`;

            // Sesuai skema appointments Supabase aktual (tanpa kolom division / tanpa tabel invoices terpisah)
            const newApptData = {
                id: bookingId,
                client_name: customerName.trim(),
                client_email: customerEmail.trim().toLowerCase(),
                client_phone: fullPhone,
                client_address: customerAddress.trim() || '-',
                additional_notes: formattedNotes,
                package_name: selectedPkg.title,
                event_date: eventDate || null,
                resepsi_date: resepsiDate || null,
                status: 'Menunggu DP',
                total_amount: totalPrice,
                dp_amount: dpAmount,
                client_password: clientPassword,
                jam_akad: isStudio ? (selectedTimeSlot ? selectedTimeSlot.split(' - ')[0] : null) : null
            };

            // 4. Insert appointment record ke Supabase
            const { error: apptError } = await supabase.from('appointments').insert([newApptData]);
            if (apptError) {
                throw new Error("Gagal menyimpan data booking: " + apptError.message);
            }

            // 5. Update voucher used count jika voucher berhasil diterapkan
            if (appliedDiscount > 0 && voucherCode.trim()) {
                const cleanCode = voucherCode.trim().toUpperCase();
                const { data: currentV } = await supabase.from('vouchers').select('used_count').eq('code', cleanCode).single();
                if (currentV) {
                    await supabase.from('vouchers').update({ used_count: (currentV.used_count || 0) + 1 }).eq('code', cleanCode);
                }
            }

            // 6. Update date_availability untuk sinkronisasi ketersediaan tanggal
            const datesToUpdate = [eventDate, resepsiDate, prewedDate].filter(Boolean);
            for (const rawDate of datesToUpdate) {
                try {
                    const { data: curAvail } = await supabase.from('date_availability').select('*').eq('date', rawDate).maybeSingle();
                    if (curAvail) {
                        await supabase.from('date_availability').update({
                            slots_booked: (curAvail.slots_booked || 0) + 1
                        }).eq('date', rawDate);
                    } else {
                        await supabase.from('date_availability').insert([{
                            date: rawDate,
                            slots_booked: 1,
                            max_slots: 3,
                            is_manually_closed: false
                        }]);
                    }
                } catch (e) {
                    console.warn("Date availability sync err:", e);
                }
            }

            // 7. Kirim email invoice "Menunggu DP" secara asynchronous
            fetch('/api/send-invoice-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'menunggu_dp',
                    order: newApptData
                })
            }).catch(e => console.error("Error sending invoice email:", e));

            showToast("Pemesanan berhasil disimpan! Mengarahkan ke pembayaran...", "success");

            // 8. Request payment URL dari backend (/api/payment)
            const division = selectedPkg ? getMainCategory(selectedPkg.category) : selectedCategory;
            const payResponse = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: bookingId,
                    amount: finalPayAmount,
                    customer_name: customerName.trim(),
                    customer_email: customerEmail.trim().toLowerCase(),
                    division: division,
                    callback_url: `${window.location.origin}/booking?status=success&order_id=${bookingId}`
                })
            });

            if (payResponse.ok) {
                const data = await payResponse.json();
                if (data.payment_url) {
                    setInAppPaymentData({
                        orderId: bookingId,
                        amount: finalPayAmount,
                        paymentUrl: data.payment_url,
                        snapToken: data.snap_token,
                        qrUrl: data.qr_url,
                        qrString: data.qr_string,
                        expiryTime: data.expiry_time,
                        gateway: data.gateway,
                        clientKey: data.client_key,
                        isProduction: data.is_production,
                        pkgTitle: selectedPkg ? selectedPkg.title : 'Paket 18Studio',
                        eventDate: eventDate,
                        clientName: customerName,
                        clientEmail: customerEmail,
                        roomStudio: selectedRoom,
                        jamSesi: selectedTimeSlot,
                        totalPrice: totalPrice,
                        dpAmount: finalPayAmount
                    });
                    setIsInAppPaymentOpen(true);
                } else {
                    showToast("Order berhasil dibuat! Hubungi admin untuk konfirmasi pembayaran.", "success");
                }
            } else {
                const errData = await payResponse.json().catch(() => ({}));
                showToast(errData.error || "Gagal menghubungkan ke gerbang pembayaran.", "error");
            }
        } catch (error) {
            console.error("Booking submit error:", error);
            showToast(error.message || "Terjadi kesalahan sistem.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-[#020607] flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-sm tracking-wider font-medium text-gray-300">Memuat Formulir Booking...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#020607] text-white flex flex-col relative pb-32">
            {/* Ambient Lighting Background */}
            <div className="fixed inset-0 z-0 pointer-events-none" style={{
                background: 'linear-gradient(180deg, #010406 0%, #030c0f 30%, #082329 65%, #031013 100%)'
            }}>
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-[#0e3b43]/30 rounded-full blur-[120px] pointer-events-none"></div>
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed top-5 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                        toast.type === 'success'
                            ? 'bg-[#041a13]/95 border-emerald-500/40 text-emerald-300 shadow-[0_8px_30px_rgba(16,185,129,0.3)]'
                            : 'bg-[#200609]/95 border-rose-500/40 text-rose-300 shadow-[0_8px_30px_rgba(244,63,94,0.3)]'
                    }`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                            {toast.type === 'success' ? '✓' : '!'}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-semibold text-white leading-snug">{toast.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Navigation Header */}
            <header className="relative z-10 w-full max-w-xl mx-auto pt-6 px-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    {step > 1 ? (
                        <button
                            onClick={handlePrevStep}
                            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                            18
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-wide">Booking Form</h1>
                        <p className="text-xs text-gray-400">
                            {selectedPkg ? selectedPkg.title : "Pilih Kategori & Paket"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full">
                        Step {step} of 4
                    </span>
                </div>
            </header>

            {/* Stepper Progress Bar */}
            <div className="relative z-10 w-full max-w-xl mx-auto px-5 mt-6 mb-6">
                <div className="flex items-center justify-between relative">
                    {/* Background track line */}
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-white/10 z-0"></div>
                    {/* Active progress line */}
                    <div
                        className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 bg-emerald-500 transition-all duration-500 z-0"
                        style={{ width: `${((step - 1) / 3) * 100}%` }}
                    ></div>

                    {[
                        { num: 1, label: 'Paket' },
                        { num: 2, label: 'Jadwal' },
                        { num: 3, label: 'Data' },
                        { num: 4, label: 'Bayar' }
                    ].map((s) => {
                        const isDone = step > s.num;
                        const isCurrent = step === s.num;
                        return (
                            <div key={s.num} className="flex flex-col items-center relative z-10">
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                        isDone
                                            ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                            : isCurrent
                                            ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                            : 'bg-[#121c20] text-gray-400 border border-white/10'
                                    }`}
                                >
                                    {isDone ? '✓' : s.num}
                                </div>
                                <span className={`text-[11px] mt-1.5 font-medium ${isCurrent ? 'text-emerald-400' : isDone ? 'text-gray-300' : 'text-gray-400'}`}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Form Content Container */}
            <main className="relative z-10 w-full max-w-xl mx-auto px-5 flex-1 flex flex-col pb-36">
                {/* ================= STEP 1: PILIH KATEGORI & PAKET ================= */}
                {step === 1 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Dropdown Kategori Utama */}
                        {/* Card: Dropdown Kategori Utama */}
                        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                                1. Pilih Kategori Layanan
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSelectedSubcat("");
                                        setSelectedPkg(null);
                                    }}
                                    className="input-glass text-sm font-semibold pr-10 appearance-none bg-[#0e171b] border-emerald-500/40 text-white cursor-pointer py-3.5"
                                >
                                    <option value="" disabled>-- Pilih Kategori Layanan --</option>
                                    <option value={MAIN_CATEGORIES.PHOTO_STUDIO}>📷 Photo Studio</option>
                                    <option value={MAIN_CATEGORIES.WEDDING}>💍 Photo Wedding (lapanbelas.id)</option>
                                    <option value={MAIN_CATEGORIES.MAKEUP}>💄 Makeup Artist (MUA)</option>
                                    <option value={MAIN_CATEGORIES.DEKORASI}>🌸 Dekorasi</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pills Subkategori */}
                        {selectedCategory && availableSubcategories.filter(s => s !== "All").length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[11px] font-semibold text-gray-400 block px-0.5">
                                    Pilih Kategori Photoshoot / Layanan:
                                </span>
                                <div 
                                    className="flex flex-nowrap items-center gap-2 overflow-x-auto w-full pb-2 pt-0.5 hide-scrollbar scroll-smooth"
                                    style={{
                                        WebkitOverflowScrolling: 'touch',
                                        touchAction: 'pan-x pan-y',
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none'
                                    }}
                                >
                                    {availableSubcategories.filter(s => s !== "All").map((sub) => {
                                        const isActive = selectedSubcat === sub;
                                        return (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSubcat(sub);
                                                    setSelectedPkg(null);
                                                }}
                                                style={{ flexShrink: 0 }}
                                                className={`flex-shrink-0 shrink-0 whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer select-none ${
                                                    isActive
                                                        ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/25 border border-emerald-400'
                                                        : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                                                }`}
                                            >
                                                {sub}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. PILIH PAKET PRICELIST: Hanya Muncul Ketika Klien Sudah Klik Kategori / Subkategori */}
                        {selectedCategory && (selectedSubcat || availableSubcategories.filter(s => s !== "All").length === 0) ? (
                            <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                                            2. Pilih Paket Pricelist
                                        </label>
                                        {selectedSubcat && (
                                            <span className="text-[10px] text-emerald-400 font-medium">
                                                Kategori: {selectedSubcat}
                                            </span>
                                        )}
                                    </div>
                                    {selectedPkg && (
                                        <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                            Terpilih
                                        </span>
                                    )}
                                </div>

                                {/* Quick Dropdown Selector untuk memilih cepat */}
                                <div className="relative">
                                    <select
                                        value={selectedPkg ? selectedPkg.id : ""}
                                        onChange={(e) => {
                                            const found = filteredPackages.find(p => String(p.id) === String(e.target.value));
                                            setSelectedPkg(found || null);
                                        }}
                                        className="input-glass text-xs font-medium pr-10 appearance-none bg-[#0e171b] border-white/15 text-white cursor-pointer py-3"
                                    >
                                        <option value="">-- Pilih dari Daftar Paket ({filteredPackages.length} paket) --</option>
                                        {filteredPackages.map(pkg => {
                                            const pInfo = getDiscountedPriceInfo(pkg);
                                            return (
                                                <option key={pkg.id} value={pkg.id}>
                                                    {pkg.title} - {formatRupiah(pInfo.price)}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Preview Detail Card Paket Terpilih */}
                                {selectedPkg ? (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-start gap-4">
                                        <img
                                            src={selectedPkg.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=300"}
                                            alt={selectedPkg.title}
                                            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-white truncate">{selectedPkg.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getDiscountedPriceInfo(selectedPkg).original && (
                                                    <span className="text-[11px] line-through text-gray-500">
                                                        {formatRupiah(getDiscountedPriceInfo(selectedPkg).original)}
                                                    </span>
                                                )}
                                                <span className="text-base font-extrabold text-emerald-400">
                                                    {formatRupiah(getDiscountedPriceInfo(selectedPkg).price)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-300 mt-1.5 line-clamp-3 leading-relaxed">
                                                {selectedPkg.description?.replace(/\[.*?\]:\s*.*?\n/g, '') || "Paket foto profesional dengan kualitas terbaik."}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-xs text-gray-400 py-2">
                                        Silakan pilih salah satu paket dari menu di atas untuk melanjutkan.
                                    </p>
                                )}
                            </div>
                        ) : selectedCategory && (
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center text-gray-400 text-xs py-7 animate-in fade-in">
                                <span className="text-xl block mb-1.5">👆</span>
                                <p className="font-semibold text-gray-300">Pilih salah satu kategori di atas</p>
                                <p className="text-[11px] text-gray-500 mt-1">Daftar paket pricelist akan otomatis muncul setelah kategori diklik.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ================= STEP 2: JADWAL ACARA ================= */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-5">
                            <div className="flex items-center gap-2.5 text-white font-bold text-base border-b border-white/10 pb-4">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"></line>
                                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"></line>
                                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"></line>
                                </svg>
                                <span>Jadwal Acara</span>
                            </div>

                            {/* ================= A. KHUSUS PHOTO STUDIO ================= */}
                            {isPhotoStudio && (
                                <div className="space-y-5">
                                    {/* Pilihan Room Studio (Dengan Tombol Preview Suasana) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                                                PILIH ROOM STUDIO <span className="text-rose-400">*</span>
                                            </label>
                                            <span className="text-[10px] text-sky-400">
                                                Klik tombol Preview 👁️ untuk lihat foto room
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {Object.keys(roomSampleImages).map((room) => {
                                                const isSelected = selectedRoom === room;
                                                const images = (roomPhotosDb[room] && roomPhotosDb[room].length > 0) ? roomPhotosDb[room] : (roomSampleImages[room] || []);
                                                return (
                                                    <div
                                                        key={room}
                                                        onClick={() => setSelectedRoom(room)}
                                                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-sky-500/15 border-sky-400 text-white shadow-md shadow-sky-500/10'
                                                                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                                isSelected ? 'border-sky-400 bg-sky-400 text-black text-[10px] font-bold' : 'border-gray-500'
                                                            }`}>
                                                                {isSelected && '✓'}
                                                            </div>
                                                            <span className={`text-xs truncate ${isSelected ? 'font-bold text-white' : 'font-medium'}`}>
                                                                {room}
                                                            </span>
                                                        </div>

                                                        {/* Tombol Preview Foto Room */}
                                                        {images.length > 0 && (
                                                            <button
                                                                type="button"
                                                                title="Lihat Preview Suasana Room"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRoomPreview({
                                                                        name: room,
                                                                        desc: roomDescriptions[room] || "Foto studio konsep elegan dan modern."
                                                                    });
                                                                }}
                                                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 border border-white/10 transition-all active:scale-95"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                <span>Preview</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Tanggal Booking Studio */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            Tanggal Booking / Sesi <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="input-glass border-emerald-500/30"
                                        />
                                    </div>

                                    {/* Sesi Jam Studio */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-2">
                                            Pilih Sesi Jam Studio <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {generateTimeSlots(getPackageDuration(selectedPkg)).map((slot) => {
                                                const slotStart = timeToMinutes(slot.start);
                                                const slotEnd = timeToMinutes(slot.end);
                                                const selectedKey = mapRoomKey(selectedRoom);

                                                const isSlotBooked = bookedSlots.some(b => {
                                                    const notes = b.additional_notes || '';
                                                    const roomMatch = notes.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
                                                    const room = roomMatch ? roomMatch[1].trim() : '';
                                                    if (mapRoomKey(room) !== selectedKey) return false;

                                                    let jam = b.jam_akad ? b.jam_akad.slice(0, 5) : '';
                                                    const jamMatch = notes.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
                                                    if (jamMatch) jam = jamMatch[1].trim();
                                                    if (!jam) return false;

                                                    let dur = 45;
                                                    const durMatch = notes.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
                                                    if (durMatch) dur = parseInt(durMatch[1].trim(), 10);
                                                    else {
                                                        const pkgObj = packages.find(p => p.title === b.package_name);
                                                        if (pkgObj) dur = getPackageDuration(pkgObj);
                                                    }
                                                    const bStart = timeToMinutes(jam);
                                                    const bEnd = bStart + dur;
                                                    return slotStart < bEnd && slotEnd > bStart;
                                                });

                                                const isSelected = selectedTimeSlot === slot.label;
                                                return (
                                                    <button
                                                        key={slot.label}
                                                        type="button"
                                                        disabled={isSlotBooked}
                                                        onClick={() => !isSlotBooked && setSelectedTimeSlot(slot.label)}
                                                        className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                                                            isSlotBooked
                                                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300/60 cursor-not-allowed line-through'
                                                                : isSelected
                                                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md font-bold'
                                                                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {slot.label} {isSlotBooked ? '(Penuh)' : ''}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ================= B. KHUSUS PAKET 3 TANGGAL (DELTA / CENTRO) ================= */}
                            {!isPhotoStudio && isThreeDates && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            Tanggal Prewed (Opsional)
                                        </label>
                                        <input
                                            type="date"
                                            value={prewedDate}
                                            onChange={(e) => setPrewedDate(e.target.value)}
                                            className="input-glass"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            Tanggal Akad <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="input-glass border-emerald-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            Tanggal Resepsi (Opsional)
                                        </label>
                                        <input
                                            type="date"
                                            value={resepsiDate}
                                            onChange={(e) => setResepsiDate(e.target.value)}
                                            className="input-glass"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ================= C. KHUSUS PAKET AKAD + RESEPSI (WEDDING STANDARD) ================= */}
                            {!isPhotoStudio && !isThreeDates && isResepsiFlow && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            Tanggal Akad <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="input-glass border-emerald-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            Tanggal Resepsi (Opsional)
                                        </label>
                                        <input
                                            type="date"
                                            value={resepsiDate}
                                            onChange={(e) => setResepsiDate(e.target.value)}
                                            className="input-glass"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ================= D. KHUSUS SINGLE DATE (PREWED, ENGAGEMENT, LAMARAN, ROYAL, BRONZE, MAKEUP, DEKORASI, DLL) ================= */}
                            {!isPhotoStudio && !isThreeDates && !isResepsiFlow && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                                            {(pkgTitleLower.includes('prewed') || pkgCategoryLower.includes('prewed'))
                                                ? "Tanggal Sesi Prewed"
                                                : (pkgTitleLower.includes('engagement') || pkgTitleLower.includes('lamaran') || pkgCategoryLower.includes('engagement'))
                                                ? "Tanggal Acara Lamaran / Engagement"
                                                : (selectedCategory === MAIN_CATEGORIES.MAKEUP || selectedCategory === MAIN_CATEGORIES.DEKORASI)
                                                ? "Tanggal Acara / Sesi"
                                                : "Tanggal Acara"} <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="input-glass border-emerald-500/30"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ================= ALERT SISA SLOT TANGGAL (KHUSUS NON-STUDIO) ================= */}
                            {!isPhotoStudio && eventDate && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {dateSlotStatus.checking ? (
                                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-gray-300 text-xs animate-pulse">
                                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Mengecek ketersediaan sisa slot tanggal {formatDmy(eventDate)}...</span>
                                        </div>
                                    ) : dateSlotStatus.isClosed ? (
                                        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 animate-in fade-in">
                                            <span className="text-xl leading-none mt-0.5">⛔</span>
                                            <div>
                                                <p className="text-xs font-bold text-rose-200">Tanggal Ditutup oleh Admin</p>
                                                <p className="text-[11px] text-rose-300/80 mt-1 leading-relaxed">
                                                    Mohon maaf, kuota booking pada tanggal <strong>{formatDmy(eventDate)}</strong> telah ditutup oleh Admin. Silakan pilih tanggal lain.
                                                </p>
                                            </div>
                                        </div>
                                    ) : dateSlotStatus.remainingSlots <= 0 ? (
                                        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 animate-in fade-in">
                                            <span className="text-xl leading-none mt-0.5">❌</span>
                                            <div>
                                                <p className="text-xs font-bold text-rose-200">Slot Tanggal Ini Penuh (0 Slot Tersisa)</p>
                                                <p className="text-[11px] text-rose-300/80 mt-1 leading-relaxed">
                                                    Seluruh {dateSlotStatus.maxSlots} kuota slot pada tanggal <strong>{formatDmy(eventDate)}</strong> sudah terisi penuh. Silakan cari tanggal lain.
                                                </p>
                                            </div>
                                        </div>
                                    ) : dateSlotStatus.remainingSlots === 1 ? (
                                        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-3 text-amber-300 animate-in fade-in shadow-lg shadow-amber-500/5">
                                            <span className="text-xl leading-none mt-0.5">⚡</span>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-amber-200">Sisa 1 Slot Terakhir!</p>
                                                    <span className="text-[10px] font-extrabold bg-amber-500/30 border border-amber-500/50 text-amber-200 px-2.5 py-0.5 rounded-full">
                                                        1 / {dateSlotStatus.maxSlots} Slot
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-amber-300/90 mt-1 leading-relaxed">
                                                    Hanya tersisa 1 slot lagi untuk tanggal <strong>{formatDmy(eventDate)}</strong>. Segera amankan jadwal acara Anda sebelum terisi!
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 animate-in fade-in shadow-lg shadow-emerald-500/5">
                                            <span className="text-xl leading-none mt-0.5">✅</span>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-emerald-200">Slot Tersedia</p>
                                                    <span className="text-[10px] font-extrabold bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full">
                                                        Tersisa {dateSlotStatus.remainingSlots} dari {dateSlotStatus.maxSlots} Slot
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-emerald-300/90 mt-1 leading-relaxed">
                                                    Tanggal <strong>{formatDmy(eventDate)}</strong> tersedia untuk pemesanan. Silakan lanjutkan ke langkah berikutnya.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ================= STEP 3: DATA PEMESAN (PERSIS GAMBAR 3) ================= */}
                {step === 3 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                                    NAMA PEMESAN <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Rian & Nisa"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="input-glass py-3.5"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                                    NO WHATSAPP <span className="text-rose-400">*</span>
                                </label>
                                <div className="flex gap-2 items-center w-full">
                                    <div className="relative shrink-0">
                                        <select
                                            value={phoneCountryCode}
                                            onChange={(e) => setPhoneCountryCode(e.target.value)}
                                            className="input-glass py-3.5 pl-3 pr-7 rounded-2xl bg-[#141820] text-white text-xs font-semibold appearance-none cursor-pointer focus:border-white/40 shadow-sm border border-white/10"
                                        >
                                            <option value="+62" className="bg-[#121212] text-white">🇮🇩 +62</option>
                                            <option value="+60" className="bg-[#121212] text-white">🇲🇾 +60</option>
                                            <option value="+65" className="bg-[#121212] text-white">🇸🇬 +65</option>
                                        </select>
                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[9px]">▼</div>
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="812-3456-7890 (Contoh)"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="input-glass flex-1 py-3.5 font-mono min-w-0"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400/80 mt-1 ml-1 leading-tight">
                                    Cukup lanjutkan sisa nomor Anda tanpa angka 0 di awal.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                                    ALAMAT EMAIL <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="nama@email.com"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    className="input-glass py-3.5 border-sky-500/30"
                                />
                                <p className="text-[10px] text-gray-400/80 mt-1 ml-1 leading-tight">
                                    Invoice resmi PDF & link akses portal dikirim ke email ini.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                                    ALAMAT LENGKAP <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Alamat Lengkap"
                                    value={customerAddress}
                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                    className="input-glass resize-none"
                                ></textarea>
                                <p className="text-[10px] text-gray-400/80 mt-1 ml-1 leading-tight">
                                    *Catatan: Total biaya belum termasuk akomodasi/transportasi untuk lokasi acara di luar Kota Langsa.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                                    KETERANGAN TAMBAHAN (OPSIONAL)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Catatan khusus"
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                    className="input-glass resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= STEP 4: LAYANAN TAMBAHAN, VOUCHER & RINGKASAN PESANAN (PERSIS GAMBAR 2) ================= */}
                {step === 4 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* 1. Layanan Tambahan (Add-on) Card */}
                        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <span>Layanan Tambahan (Add-on)</span>
                            </div>

                            {isPhotoStudio ? (
                                <div className="space-y-3.5">
                                    {/* Tambahan Orang */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-gray-400 font-medium ml-1">Tambahan Orang</label>
                                        <select
                                            value={addonPeople}
                                            onChange={(e) => setAddonPeople(e.target.value)}
                                            className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                        >
                                            <option value="Tanpa Tambahan Orang">Tanpa Tambahan Orang</option>
                                            <option value="+1 Orang (+Rp 50.000)">+1 Orang (+Rp 50.000)</option>
                                            <option value="+2 Orang (+Rp 100.000)">+2 Orang (+Rp 100.000)</option>
                                            <option value="+3 Orang (+Rp 150.000)">+3 Orang (+Rp 150.000)</option>
                                            <option value="+4 Orang (+Rp 200.000)">+4 Orang (+Rp 200.000)</option>
                                            <option value="+5 Orang (+Rp 250.000)">+5 Orang (+Rp 250.000)</option>
                                        </select>
                                    </div>

                                    {/* Tambahan Durasi */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-gray-400 font-medium ml-1">Tambahan Durasi</label>
                                        <select
                                            value={addonTime}
                                            onChange={(e) => setAddonTime(e.target.value)}
                                            className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                        >
                                            <option value="Tanpa Tambahan Waktu">Tanpa Tambahan Waktu</option>
                                            <option value="+10 Menit (+Rp 50.000)">+10 Menit (+Rp 50.000)</option>
                                            <option value="+20 Menit (+Rp 100.000)">+20 Menit (+Rp 100.000)</option>
                                            <option value="+30 Menit (+Rp 150.000)">+30 Menit (+Rp 150.000)</option>
                                        </select>
                                    </div>

                                    {/* Cetak Foto Premium */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-gray-400 font-medium ml-1">Cetak Foto Premium</label>
                                        <select
                                            value={addonPrint}
                                            onChange={(e) => setAddonPrint(e.target.value)}
                                            className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                        >
                                            <option value="Tanpa Cetak Foto">Tanpa Cetak Foto</option>
                                            <option value="Cetak 4R (+Rp 15.000)">Cetak 4R (+Rp 15.000)</option>
                                            <option value="Cetak 10R (+Rp 50.000)">Cetak 10R (+Rp 50.000)</option>
                                            <option value="Cetak 16R (+Rp 100.000)">Cetak 16R (+Rp 100.000)</option>
                                        </select>
                                    </div>

                                    {/* Bingkai Foto Eksklusif */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-gray-400 font-medium ml-1">Bingkai Foto Eksklusif</label>
                                        <select
                                            value={addonFrame}
                                            onChange={(e) => setAddonFrame(e.target.value)}
                                            className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                        >
                                            <option value="Tanpa Bingkai Foto">Tanpa Bingkai Foto</option>
                                            <option value="Bingkai Minimalis 4R (+Rp 20.000)">Bingkai Minimalis 4R (+Rp 20.000)</option>
                                            <option value="Bingkai Minimalis 10R (+Rp 65.000)">Bingkai Minimalis 10R (+Rp 65.000)</option>
                                            <option value="Bingkai Minimalis 16R (+Rp 130.000)">Bingkai Minimalis 16R (+Rp 130.000)</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Dropdown 1: Makeup Artis */}
                                    {addonOptions.map(parseAddon).some(p => p.category === 'Makeup Artis') && (
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-gray-400 font-medium ml-1">Makeup Artis</label>
                                            <select
                                                value={getSelectedAddonIdForCategory('Makeup Artis')}
                                                onChange={(e) => handleCategorySelect('Makeup Artis', e.target.value)}
                                                className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#121c20] text-gray-400">-- Pilih Makeup Artis (Opsional) --</option>
                                                {addonOptions
                                                    .map(parseAddon)
                                                    .filter(p => p.category === 'Makeup Artis')
                                                    .map(p => (
                                                        <option key={p.id} value={p.id} className="bg-[#121c20] text-white">
                                                            {p.labelOnly || p.label} ({formatRupiah(p.price)})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Dropdown 2: Video */}
                                    {addonOptions.map(parseAddon).some(p => p.category === 'Video') && (
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-gray-400 font-medium ml-1">Video & Dokumentasi</label>
                                            <select
                                                value={getSelectedAddonIdForCategory('Video')}
                                                onChange={(e) => handleCategorySelect('Video', e.target.value)}
                                                className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#121c20] text-gray-400">-- Pilih Video (Opsional) --</option>
                                                {addonOptions
                                                    .map(parseAddon)
                                                    .filter(p => p.category === 'Video')
                                                    .map(p => (
                                                        <option key={p.id} value={p.id} className="bg-[#121c20] text-white">
                                                            {p.labelOnly || p.label} ({formatRupiah(p.price)})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Dropdown 3: Add-on Best Seller */}
                                    {addonOptions.map(parseAddon).some(p => p.category === 'Add-on Best Seller') && (
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-gray-400 font-medium ml-1">Add-on Best Seller</label>
                                            <select
                                                value={getSelectedAddonIdForCategory('Add-on Best Seller')}
                                                onChange={(e) => handleCategorySelect('Add-on Best Seller', e.target.value)}
                                                className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#121c20] text-gray-400">-- Pilih Add-on Best Seller (Opsional) --</option>
                                                {addonOptions
                                                    .map(parseAddon)
                                                    .filter(p => p.category === 'Add-on Best Seller')
                                                    .map(p => (
                                                        <option key={p.id} value={p.id} className="bg-[#121c20] text-white">
                                                            {p.labelOnly || p.label} ({formatRupiah(p.price)})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Dropdown 4: Add-on Lainnya */}
                                    {addonOptions.map(parseAddon).some(p => p.category === 'Lainnya') && (
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-gray-400 font-medium ml-1">Add-on Lainnya</label>
                                            <select
                                                value={getSelectedAddonIdForCategory('Lainnya')}
                                                onChange={(e) => handleCategorySelect('Lainnya', e.target.value)}
                                                className="input-glass bg-[#121c20] text-xs py-3 text-white appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#121c20] text-gray-400">-- Pilih Add-on Lainnya (Opsional) --</option>
                                                {addonOptions
                                                    .map(parseAddon)
                                                    .filter(p => p.category === 'Lainnya')
                                                    .map(p => (
                                                        <option key={p.id} value={p.id} className="bg-[#121c20] text-white">
                                                            {p.labelOnly || p.label} ({formatRupiah(p.price)})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Interactive Selected Add-ons Badges */}
                                    {selectedAddons.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                                Layanan Tambahan Terpilih:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedAddons.map(addon => {
                                                    const parsed = parseAddon(addon);
                                                    let cBadge = "bg-white/10 text-gray-300 border-white/10";
                                                    if (parsed.category === 'Makeup Artis') {
                                                        cBadge = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
                                                    } else if (parsed.category === 'Video') {
                                                        cBadge = "bg-sky-500/15 border-sky-500/30 text-sky-400";
                                                    } else if (parsed.category === 'Add-on Best Seller') {
                                                        cBadge = "bg-amber-500/15 border-amber-500/30 text-amber-400";
                                                    }
                                                    return (
                                                        <div
                                                            key={addon.id}
                                                            onClick={() => handleRemoveAddon(addon.id)}
                                                            className="bg-white/5 hover:bg-rose-500/15 hover:border-rose-500/30 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-white flex items-center gap-2 cursor-pointer transition-all duration-200 group"
                                                            title="Klik untuk menghapus add-on"
                                                        >
                                                            <span className={`font-semibold text-[9px] px-1.5 py-0.5 rounded-full border ${cBadge}`}>
                                                                {parsed.category}
                                                            </span>
                                                            <span className="font-medium text-xs">
                                                                {parsed.labelOnly || addon.label}
                                                            </span>
                                                            <span className="text-emerald-400 font-bold text-[11px]">
                                                                +{formatRupiah(addon.price)}
                                                            </span>
                                                            <span className="text-gray-400 group-hover:text-rose-400 text-xs font-bold ml-0.5">✕</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Voucher Diskon Card */}
                        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                <span>Voucher Diskon</span>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="MASUKKAN KODE VOUCHER"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                    className="input-glass flex-1 py-3 text-xs font-mono uppercase tracking-wider"
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyVoucher}
                                    className="px-5 py-3 rounded-2xl bg-[#1e2930] hover:bg-white/20 text-xs font-bold text-white shrink-0 border border-white/10 transition-all active:scale-95"
                                >
                                    Terapkan
                                </button>
                            </div>
                            {appliedDiscount > 0 && (
                                <p className="text-xs text-emerald-400 font-semibold">
                                    ✓ Diskon voucher {formatRupiah(appliedDiscount)} berhasil diterapkan!
                                </p>
                            )}
                        </div>

                        {/* 3. RINGKASAN PESANAN Card (Persis Gambar 2) */}
                        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                            <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                                RINGKASAN PESANAN
                            </h4>

                            <div className="space-y-2.5 text-xs text-gray-300">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-white">Paket: {selectedPkg?.title}</span>
                                    <span className="font-bold text-white">{formatRupiah(priceInfo.price)}</span>
                                </div>
                                {isPhotoStudio ? (
                                    <>
                                        <div className="flex justify-between items-center text-gray-300">
                                            <span>Room Studio:</span>
                                            <span className="font-semibold text-white">{selectedRoom}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-300">
                                            <span>Jadwal Sesi:</span>
                                            <span className="font-semibold text-white">{eventDate} {selectedTimeSlot ? `(${selectedTimeSlot.split(' - ')[0]})` : ''}</span>
                                        </div>
                                    </>
                                ) : isThreeDates ? (
                                    <div className="space-y-1">
                                        {prewedDate && (
                                            <div className="flex justify-between items-center text-gray-300">
                                                <span>Tanggal Prewed:</span>
                                                <span className="font-semibold text-white">{prewedDate}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-gray-300">
                                            <span>Tanggal Akad:</span>
                                            <span className="font-semibold text-white">{eventDate}</span>
                                        </div>
                                        {resepsiDate && (
                                            <div className="flex justify-between items-center text-gray-300">
                                                <span>Tanggal Resepsi:</span>
                                                <span className="font-semibold text-white">{resepsiDate}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : isResepsiFlow ? (
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-gray-300">
                                            <span>Tanggal Akad:</span>
                                            <span className="font-semibold text-white">{eventDate}</span>
                                        </div>
                                        {resepsiDate && (
                                            <div className="flex justify-between items-center text-gray-300">
                                                <span>Tanggal Resepsi:</span>
                                                <span className="font-semibold text-white">{resepsiDate}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center text-gray-300">
                                        <span>
                                            {(pkgTitleLower.includes('prewed') || pkgCategoryLower.includes('prewed'))
                                                ? "Tanggal Prewed:"
                                                : (pkgTitleLower.includes('engagement') || pkgTitleLower.includes('lamaran'))
                                                ? "Tanggal Lamaran:"
                                                : "Tanggal Acara:"}
                                        </span>
                                        <span className="font-semibold text-white">{eventDate}</span>
                                    </div>
                                )}
                                {addonsTotal > 0 && (
                                    <div className="flex justify-between items-center text-sky-400">
                                        <span>Layanan Tambahan (Add-on):</span>
                                        <span className="font-bold">+{formatRupiah(addonsTotal)}</span>
                                    </div>
                                )}
                                {appliedDiscount > 0 && (
                                    <div className="flex justify-between items-center text-rose-400">
                                        <span>Diskon Voucher:</span>
                                        <span className="font-bold">-{formatRupiah(appliedDiscount)}</span>
                                    </div>
                                )}

                                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                    <span className="font-semibold text-white">Total Biaya</span>
                                    <span className="font-bold text-white">{formatRupiah(totalPrice)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-white">Minimal DP (Booking Slot)</span>
                                    <span className="font-bold text-emerald-400">{formatRupiah(Math.min(dpAmount, totalPrice))}</span>
                                </div>

                                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                    <span className="text-sm font-extrabold text-white">Sisa Pelunasan (di Studio)</span>
                                    <span className="text-base font-extrabold text-white">
                                        {formatRupiah(Math.max(0, totalPrice - Math.min(dpAmount, totalPrice)))}
                                    </span>
                                </div>
                            </div>

                            {/* Ketentuan Penting (Box Merah) */}
                            <div className="p-3.5 bg-rose-950/40 border border-rose-500/20 rounded-2xl text-[11px] text-rose-300 leading-relaxed">
                                <strong className="text-rose-200">Ketentuan Penting:</strong> Batal sepihak DP hangus, tidak bisa refund kecuali pihak 18Studio yang membatalkan. Sisa pelunasan dibayar di studio saat hari H photoshoot.
                            </div>
                        </div>

                        {/* 4. Checkbox Syarat & Ketentuan */}
                        <div className="flex items-start gap-3 px-1 pt-1">
                            <input
                                type="checkbox"
                                id="booking-tac"
                                checked={isTacAccepted}
                                onChange={(e) => setIsTacAccepted(e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-black/50 accent-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="booking-tac" className="text-xs text-gray-300 leading-snug cursor-pointer select-none">
                                Saya telah membaca dan menyetujui <strong className="text-white">Syarat & Ketentuan 18Studio</strong> yang berlaku untuk pesanan ini.
                            </label>
                        </div>
                    </div>
                )}

                {/* Bottom Action Navigation Buttons (Fixed Sticky di Bawah) */}
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#030708]/90 backdrop-blur-xl border-t border-white/10 py-3.5 px-5">
                    <div className="max-w-xl mx-auto flex items-center gap-3">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="flex-1 py-3 px-4 rounded-2xl bg-[#121c20] hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition-all active:scale-[0.98]"
                            >
                                Kembali
                            </button>
                        )}
                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-gray-200 text-black font-bold text-xs shadow-[0_10px_25px_rgba(255,255,255,0.15)] transition-all active:scale-[0.98]"
                            >
                                Lanjut
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={isSubmitting || !isTacAccepted}
                                onClick={handleSubmitBookingAndPay}
                                className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        <span>Menyiapkan Pembayaran...</span>
                                    </>
                                ) : (
                                    <span>Bayar Sekarang ({formatRupiah(Math.min(dpAmount, totalPrice))})</span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* Room Studio Preview Modal (Sama Persis dengan app.lapanbelas.id) */}
            {roomPreview && (() => {
                const dbPhotos = roomPhotosDb[roomPreview.name];
                const images = (dbPhotos && dbPhotos.length > 0) ? dbPhotos : (roomSampleImages[roomPreview.name] || []);
                return (
                    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-[#121c20]/95 backdrop-blur-2xl p-5 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative flex flex-col gap-4">
                            <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                <div>
                                    <h3 className="font-bold text-sm text-white">{roomPreview.name}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{roomPreview.desc}</p>
                                </div>
                                <button
                                    onClick={() => setRoomPreview(null)}
                                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/20 flex items-center justify-center transition text-white"
                                >
                                    ✕
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
                                className="w-full bg-emerald-500 text-black font-bold py-3.5 rounded-2xl text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/10 mt-1"
                            >
                                Pilih Room Ini
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* In-App Native Payment & E-Ticket Modal */}
            <InAppPaymentModal
                isOpen={isInAppPaymentOpen}
                onClose={() => {
                    setIsInAppPaymentOpen(false);
                    window.location.href = '/';
                }}
                paymentData={inAppPaymentData}
                onPaymentSuccess={(appt) => {
                    showToast("Pembayaran DP Berhasil Diterima!", "success");
                }}
            />
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<BookingApp />);
}
