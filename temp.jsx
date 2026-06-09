// Inisialisasi Supabase Client
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const categories = ["All", "Wedding", "Pre-Wedding", "Engagement", "Tasyakuran"];

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

const getDPMin = (pkg) => {
    if (!pkg) return 1000000;
    const cat = pkg.category || '';
    if (cat === 'Studio Lapanbelas' || cat.startsWith('Studio Lapanbelas:')) return 200000;
    if (cat === 'Lady Makeup' || cat.startsWith('Lady Makeup:')) return 1000000;
    if (cat === 'Lapanbelas Dekorasi' || cat.startsWith('Lapanbelas Dekorasi:')) return 2000000;
    return 1000000; // lapanbelas.id (Wedding)
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

const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
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
    const [activeTab, setActiveTab] = React.useState("beranda");
    const [orders, setOrders] = React.useState([]);
    const [expandedOrders, setExpandedOrders] = React.useState({});
    const [packages, setPackages] = React.useState([]);
    const [portfolio, setPortfolio] = React.useState([]);
    const [dateAvailability, setDateAvailability] = React.useState({});
    const [studioName, setStudioName] = React.useState("18Studio");
    const [studioDesc, setStudioDesc] = React.useState("Capture your beautiful moments.");
    const [adminWhatsapp, setAdminWhatsapp] = React.useState("6281234567890");
    const [loading, setLoading] = React.useState(true);
    const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const scrollContainerRef = React.useRef(null);
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
    const [mediaModalOpen, setMediaModalOpen] = React.useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);

    const [authLoading, setAuthLoading] = React.useState(false);
    const [loginMethod, setLoginMethod] = React.useState("booking"); // 'booking' or 'google'
    const [authTab, setAuthTab] = React.useState("masuk");
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

                // Load public data (packages, portfolio, settings, dates)
                const { data: pkgs } = await supabase.from('packages').select('*').eq('is_active', true);
                if (pkgs) setPackages(pkgs);

                const { data: port } = await supabase.from('portfolio').select('*');
                if (port) setPortfolio(port);

                const { data: addonsData, error: addonsError } = await supabase.from('addons').select('*').order('created_at', { ascending: true });
                if (!addonsError && addonsData && addonsData.length > 0) {
                    setAddonOptions(addonsData);
                } else {
                    setAddonOptions([
                        { id: "drone", label: "Aerial Drone + Operator (Approx 20 Minutes)", price: 1500000 },
                        { id: "video_dok", label: "Video Dokumentasi 60 Minutes", price: 2000000 },
                        { id: "sde", label: "Same Day Edit", price: 1500000 }
                    ]);
                }

                const { data: dates } = await supabase.from('date_availability').select('*');
                if (dates) {
                    const dateMap = {};
                    dates.forEach(d => {
                        dateMap[d.date] = { slots: d.slots_booked, closed: d.is_manually_closed, max: d.max_slots || 3 };
                    });
                    setDateAvailability(dateMap);
                }

                const { data: settingsData } = await supabase.from('settings').select('*');
                if (settingsData) {
                    const nameSet = settingsData.find(s => s.key === 'studio_name');
                    const descSet = settingsData.find(s => s.key === 'studio_description');
                    const waSet = settingsData.find(s => s.key === 'admin_whatsapp');
                    if (nameSet) setStudioName(nameSet.value);
                    if (descSet) setStudioDesc(descSet.value);
                    if (waSet) setAdminWhatsapp(waSet.value);
                }
            } catch (e) {
                console.error("Gagal load data awal:", e);
            } finally {
                setLoading(false);
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
            const { data: userAppts } = await supabase
                .from('appointments')
                .select('*, packages(*)')
                .eq('client_email', userEmail)
                .order('created_at', { ascending: false });

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
                            category: appt.packages?.category || 'Photography',
                            description: appt.packages?.description || '',
                            image: appt.packages?.image_url || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop"
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
                        progressStatus: ass ? ass.status : ''
                    };
                });
                setOrders(mappedOrders);
            } else {
                setOrders([]);
            }
        }
        fetchUserOrders();
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

    const handleSignUp = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: e.target.email.value,
            password: e.target.password.value,
            options: { data: { full_name: e.target.name.value } }
        });
        setAuthLoading(false);
        if (error) showToast("Gagal mendaftar: " + error.message, "error");
        else showToast(data?.session ? "Pendaftaran berhasil! Sesi aktif." : "Pendaftaran sukses! Cek email untuk konfirmasi.", "success");
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: e.target.email.value,
            password: e.target.password.value,
            options: { data: { full_name: e.target.name.value } }
        });
        setAuthLoading(false);
        if (error) showToast("Gagal mendaftar: " + error.message, "error");
        else showToast(data?.session ? "Pendaftaran berhasil! Sesi aktif." : "Pendaftaran sukses! Cek email untuk konfirmasi.", "success");
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: e.target.email.value,
            password: e.target.password.value
        });
        setAuthLoading(false);
        if (error) showToast("Gagal masuk: " + error.message, "error");
        else showToast("Berhasil masuk!", "success");
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
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', loginBookingId.trim().toUpperCase())
                .eq('client_password', loginPassword.trim())
                .single();

            if (error || !data) {
                showToast('Booking ID atau Sandi tidak valid. Silakan periksa kembali.', 'error');
            } else {
                // Save to localStorage for persistence
                localStorage.setItem('bookingSession', JSON.stringify({
                    isLoggedIn: true,
                    email: data.client_email || '',
                    name: data.client_name || 'Klien',
                    bookingId: loginBookingId.trim().toUpperCase()
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

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        const eventDate = e.target.eventDate.value;
        const resepsiDate = e.target.resepsiDate ? e.target.resepsiDate.value : null;
        const prewedDate = e.target.prewedDate ? e.target.prewedDate.value : null;

        if (!bookingName.trim()) return showToast("Nama pemesan wajib diisi!", "error");
        if (!bookingPhone.trim()) return showToast("Nomor WhatsApp wajib diisi!", "error");
        if (!bookingAddress.trim()) return showToast("Alamat lengkap wajib diisi!", "error");

        const checkDate = dateAvailability[eventDate];
        const limitSlots = checkDate?.max || 3;

        if (checkDate) {
            if (checkDate.closed) return showToast("Mohon maaf, tanggal tersebut ditutup oleh Admin!", "error");
            if (checkDate.slots >= limitSlots) return showToast(`Slot foto tanggal tersebut PENUH (Maksimal ${limitSlots})!`, "error");
        }

        const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
        const priceInfo = getDiscountedPriceInfo(selectedPkg);
        const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal;
        const dpMin = getDPMin(selectedPkg);

        let formattedNotes = "";
        if (prewedDate) {
            formattedNotes += `[TANGGAL PREWED]: ${prewedDate}\n\n`;
        }

        if (selectedAddons.length > 0) {
            formattedNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + selectedAddons.map(a => `- ${a.label} (${formatRupiah(a.price)})`).join('\n') + `\n\n`;
        }
        if (bookingNotes && bookingNotes.trim() !== "") {
            formattedNotes += `[KETERANGAN TAMBAHAN]:\n${bookingNotes.trim()}`;
        }

        const bookingId = `BK-${Date.now().toString().slice(-6)}`;

        const newApptData = {
            id: bookingId,
            client_name: bookingName,
            client_email: userEmail,
            client_phone: bookingPhone,
            client_address: bookingAddress,
            additional_notes: formattedNotes,
            package_name: selectedPkg.title,
            event_date: eventDate,
            resepsi_date: resepsiDate,
            status: 'Menunggu DP',
            total_amount: finalPrice,
            dp_amount: dpMin
        };

        const { error: apptErr } = await supabase.from('appointments').insert([newApptData]);
        if (apptErr) return showToast("Gagal melakukan booking: " + apptErr.message, "error");

        if (checkDate) {
            await supabase.from('date_availability').update({ slots_booked: checkDate.slots + 1 }).eq('date', eventDate);
        } else {
            await supabase.from('date_availability').insert([{ date: eventDate, slots_booked: 1, max_slots: 3 }]);
        }

        if (appliedDiscount > 0) {
            const { data: currentV } = await supabase.from('vouchers').select('used_count').eq('code', voucherCodeInput.toUpperCase()).single();
            if (currentV) await supabase.from('vouchers').update({ used_count: currentV.used_count + 1 }).eq('code', voucherCodeInput.toUpperCase());
        }

        showToast('Pemesanan berhasil disimpan! Mengarahkan ke pembayaran...', "success");

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
            updatedDates.forEach(d => { dateMap[d.date] = { slots: d.slots_booked, closed: d.is_manually_closed, max: d.max_slots || 3 }; });
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
        window.open(`/api/invoice-pdf/${order.id}`, '_blank');
    };

    if (loading) {
        return (
            <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-sm tracking-wider">Loading {studioName}...</p>
            </div>
        );
    }

    const bestSellerTitles = ["delta", "centro", "bravo", "platinum", "royal"];
    const bestSellerPackages = packages.filter(pkg => bestSellerTitles.some(title => pkg.title.toLowerCase().includes(title)));

    if (!isLoggedIn) {
        return (
            <div className="relative w-full h-screen mx-auto overflow-hidden bg-[#010605] max-w-md sm:border sm:border-gray-800 text-white flex flex-col justify-end pb-10">
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
                            <button onClick={() => setLoginMethod("booking")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${loginMethod === "booking" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>Sudah Booking</button>
                            <button onClick={() => setLoginMethod("google")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${loginMethod === "google" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>Self Order Baru</button>
                        </div>

                        {loginMethod === "booking" ? (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="text-center mb-4">
                                    <p className="text-sm font-semibold text-white">Akses Portal Klien</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Gunakan Booking ID dan Sandi dari admin studio.</p>
                                </div>
                                <form onSubmit={handleBookingLogin} className="space-y-3">
                                    <div>
                                        <input type="text" required placeholder="Booking ID (Cth: BK-1234)" value={loginBookingId} onChange={e => setLoginBookingId(e.target.value.toUpperCase())} className="input-glass font-mono tracking-widest text-center" />
                                    </div>
                                    <div>
                                        <input type="password" required placeholder="Sandi Login" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="input-glass text-center" />
                                    </div>
                                    <button type="submit" disabled={authLoading} className="w-full bg-white text-black font-semibold py-3.5 rounded-full text-xs hover:bg-gray-200 transition duration-300 shadow-lg shadow-white/5 mt-2">
                                        {authLoading ? "Memeriksa..." : "Masuk ke Portal"}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-4">
                                <div className="flex border-b border-white/10 mb-2">
                                    <button type="button" onClick={() => setAuthTab('masuk')} className={`pb-2 px-4 text-xs font-semibold transition-colors ${authTab === 'masuk' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}>Masuk Email</button>
                                    <button type="button" onClick={() => setAuthTab('daftar')} className={`pb-2 px-4 text-xs font-semibold transition-colors ${authTab === 'daftar' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}>Daftar Baru</button>
                                </div>

                                {authTab === "masuk" ? (
                                    <form onSubmit={handleEmailLogin} className="space-y-3">
                                        <input type="email" name="email" required placeholder="Alamat Email Anda" className="input-glass" />
                                        <input type="password" name="password" required placeholder="Password Akun" className="input-glass" />
                                        <button type="submit" disabled={authLoading} className="w-full bg-white text-black font-semibold py-3.5 rounded-full text-xs hover:bg-gray-200 transition duration-300 shadow-lg shadow-white/5">{authLoading ? "Sedang Masuk..." : "Masuk dengan Email"}</button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleSignUp} className="space-y-3">
                                        <input type="text" name="name" required placeholder="Nama Lengkap Anda" className="input-glass" />
                                        <input type="email" name="email" required placeholder="Alamat Email Aktif" className="input-glass" />
                                        <input type="password" name="password" required placeholder="Buat Password" className="input-glass" />
                                        <button type="submit" disabled={authLoading} className="w-full bg-white text-black font-semibold py-3.5 rounded-full text-xs hover:bg-gray-200 transition duration-300 shadow-lg shadow-white/5">{authLoading ? "Sedang Mendaftar..." : "Daftar Akun Baru"}</button>
                                    </form>
                                )}

                                <div className="flex items-center justify-center my-1">
                                    <span className="w-full h-px bg-white/10"></span>
                                    <span className="text-[10px] text-gray-500 uppercase px-3 font-medium">atau</span>
                                    <span className="w-full h-px bg-white/10"></span>
                                </div>

                                <button onClick={handleGoogleLogin} type="button" className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3.5 rounded-full text-xs transition duration-300 flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.104C18.281 1.055 15.426 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.83 11.57-11.77 0-.79-.085-1.4-.185-1.945H12.24z" /></svg> Masuk dengan Google
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
        <div className="relative w-full h-screen mx-auto overflow-hidden bg-[#010605] max-w-md sm:border sm:border-gray-800 text-white">
            {toast.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl w-[90%] animate-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
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
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl flex flex-col gap-1.5 text-left">
                                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-blue-400 tracking-wide uppercase">Promo Khusus 🔥</span><span className="text-[9px] text-gray-400">Baru</span></div>
                                <p className="text-xs text-gray-200 leading-relaxed">Gunakan kode diskon <strong className="font-mono text-yellow-400">18STUDIO</strong> saat melakukan pemesanan untuk potongan langsung sebesar Rp 200.000!</p>
                            </div>
                            {orders.length > 0 ? orders.map((order, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex flex-col gap-1.5 text-left">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-mono text-gray-400">Order ID: #{order.id}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${order.status === 'Lunas' ? 'bg-green-500/20 text-green-400' : order.status === 'Sudah DP' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span>
                                    </div>
                                    <p className="text-xs text-gray-200">Pesanan paket <strong className="text-white font-semibold">{order.pkg.title}</strong> Anda telah tercatat.</p>
                                    <p className="text-[10px] text-gray-400 leading-snug">{order.status === 'Menunggu DP' ? `Silakan selesaikan pembayaran DP sebesar ${formatRupiah(order.dp)} untuk mengunci jadwal pemotretan.` : 'Terima kasih telah membayar DP, jadwal pemotretan Anda aman.'}</p>
                                </div>
                            )) : <div className="text-center py-8 text-gray-500 text-xs">Belum ada pemesanan aktif.</div>}
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 25%, #0c3832 0%, #010605 85%)' }}>
                <div className="absolute bottom-1/3 right-1/10 w-72 h-72 bg-[#092d28]/15 rounded-full blur-[100px] pointer-events-none"></div>
            </div>

            <div ref={scrollContainerRef} className="relative z-10 w-full h-full overflow-y-auto hide-scrollbar pb-28 scroll-smooth">

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
                            <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform">
                                <SvgIcon name="bell" className="w-5 h-5 text-white" />
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                        </div>

                        {activeTab === 'beranda' && orders.length > 0 && orders[0].eventDate && (() => {
                            const order = orders[0];
                            const dates = [];
                            let prewedDate = null;
                            if (order.notes) {
                                const match = order.notes.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
                                if (match) prewedDate = match[1];
                            }
                            if (prewedDate) dates.push({ type: 'Prewed', dateStr: prewedDate, label: 'Prewed' });
                            if (order.eventDate) dates.push({ type: 'Akad', dateStr: order.eventDate, label: 'Akad' });
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

                                    <div className="relative z-10 p-5 rounded-[calc(1.8rem-1px)] h-full w-full bg-black/25 backdrop-blur-md" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))' }}>
                                        <div className="relative z-10 flex flex-col gap-3">
                                            <div className="flex items-start justify-between w-full">
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                    <p className="text-[10px] text-gray-300 uppercase tracking-wider font-semibold">
                                                        {activeTarget && !activeTarget.isPast ? `Countdown ${activeTarget.label} ✨` : 'Moment Bahagiaku ✨'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 text-right z-10">
                                                    {dates.map((d, index) => {
                                                        const isTarget = activeTarget && activeTarget.type === d.type && !activeTarget.isPast;
                                                        const eventTime = new Date(d.dateStr);
                                                        eventTime.setHours(0, 0, 0, 0);
                                                        const isPast = eventTime.getTime() < now.getTime();
                                                        if (!isPast && !isTarget) {
                                                            return (
                                                                <div key={`future-${index}`} className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-lg border border-white/5 backdrop-blur-sm">
                                                                    <span className="text-[10px] text-gray-300 font-medium">{d.label}: {formatDateString(d.dateStr)}</span>
                                                                    <span className="text-[8px] bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider select-none">
                                                                        Coming Soon
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col text-left gap-2 max-w-[55%] z-10">
                                                    {dates.map((d, index) => {
                                                        const isTarget = activeTarget && activeTarget.type === d.type && !activeTarget.isPast;
                                                        const eventTime = new Date(d.dateStr);
                                                        eventTime.setHours(0, 0, 0, 0);
                                                        const isPast = eventTime.getTime() < now.getTime();
                                                        if (isPast || isTarget) {
                                                            return (
                                                                <div key={`active-${index}`} className="flex items-center gap-1.5">
                                                                    {isPast ? (
                                                                        <div className="flex items-center gap-1 opacity-60 line-through decoration-white/30">
                                                                            <span className="text-[11px] text-green-400 font-semibold">✓</span>
                                                                            <span className="text-[11px] text-gray-400 font-medium">{d.label}: {formatDateString(d.dateStr)}</span>
                                                                        </div>
                                                                    ) : isTarget ? (
                                                                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/25 shadow-[0_0_10px_rgba(255,255,255,0.08)]">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                                                            <span className="text-[11px] text-white font-bold">{d.label}: {formatDateString(d.dateStr)}</span>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                    <h3 className="text-xs font-bold mt-1.5 text-white/95 uppercase tracking-wide bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl w-fit">{orders[0].pkg.title}</h3>
                                                </div>

                                                {activeTarget && activeTarget.isPast ? (
                                                    <div className="flex flex-col items-center justify-center bg-black/40 border border-green-500/20 px-4 py-3 rounded-2xl backdrop-blur-sm text-center shrink-0">
                                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Acara Telah Selesai</span>
                                                        <span className="text-xs font-semibold text-white mt-1">Selamat Berbahagia! 🎉</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1.5 text-center shrink-0">
                                                        <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 w-10 backdrop-blur-sm flex flex-col items-center"><span className="text-xs font-semibold leading-none">{timeLeft.days}</span><p className="text-[6.5px] text-gray-400 uppercase mt-0.5">Hari</p></div>
                                                        <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 w-10 backdrop-blur-sm flex flex-col items-center"><span className="text-xs font-semibold leading-none">{String(timeLeft.hours).padStart(2, '0')}</span><p className="text-[6.5px] text-gray-400 uppercase mt-0.5">Jam</p></div>
                                                        <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 w-10 backdrop-blur-sm flex flex-col items-center"><span className="text-xs font-semibold leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span><p className="text-[6.5px] text-gray-400 uppercase mt-0.5">Mnt</p></div>
                                                        <div className="bg-black/40 border border-blue-500/30 rounded-lg py-1.5 w-10 backdrop-blur-sm flex flex-col items-center"><span className="text-xs font-bold text-blue-400 leading-none">{String(timeLeft.seconds).padStart(2, '0')}</span><p className="text-[6.5px] text-blue-300 uppercase mt-0.5 font-semibold">Dtk</p></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeTab === 'package' && (
                            <div className="flex gap-3 overflow-x-auto hide-scrollbar mb-6 -mx-6 px-6">
                                {categories.map((cat, idx) => (
                                    <button key={idx} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap px-5 py-2 rounded-full text-sm transition-all duration-300 ${activeCategory === cat ? 'bg-white text-black font-medium' : 'glass-panel text-gray-200'}`}>{cat}</button>
                                ))}
                            </div>
                        )}

                        <div className={`transition-all duration-500 transform ${activeTab === 'beranda' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
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
                            <h2 className="text-2xl font-bold mb-6 text-left">Daftar Paket</h2>
                            <div className="flex flex-col gap-4">
                                {packages.filter(pkg => activeCategory === "All" || pkg.category === activeCategory).map((pkg) => {
                                    const priceInfo = getDiscountedPriceInfo(pkg);
                                    return (
                                        <div key={pkg.id} onClick={() => handleCardClick(pkg)} className="glass-panel rounded-3xl p-3 cursor-pointer flex items-center gap-4 hover:bg-white/5 transition-all duration-300">
                                            <img src={pkg.image_url} alt={pkg.title} className="w-24 h-24 rounded-2xl object-cover shrink-0" />
                                            <div className="flex flex-col flex-1 text-left min-w-0">
                                                <h3 className="text-base font-semibold mb-1 truncate">{pkg.title}</h3>
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    {priceInfo.original && <span className="text-xs line-through text-gray-500">{formatRupiah(priceInfo.original)}</span>}
                                                    <span className="text-sm font-bold text-white">{formatRupiah(priceInfo.price)}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 bg-white/10 px-2 py-0.5 rounded-full w-max">{pkg.category}</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><SvgIcon name="chevron-right" className="w-4 h-4 text-white" /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`transition-all duration-500 transform ${activeTab === 'sample' ? 'opacity-100 translate-y-0 scale-100 block' : 'opacity-0 translate-y-4 scale-95 pointer-events-none hidden'}`}>
                            <h2 className="text-2xl font-bold mb-6 text-left">Portfolio & Sample</h2>
                            <div className="flex flex-col gap-5">
                                {portfolio.map((port, idx) => (
                                    <div key={idx} onClick={() => { setCurrentMediaIndex(idx); setMediaModalOpen(true); }} className="glass-panel p-4 rounded-3xl cursor-pointer hover:bg-white/5 transition duration-300">
                                        <div className="flex items-center gap-2 mb-3"><SvgIcon name={port.type === 'video' ? 'video' : 'image'} className="w-5 h-5 text-gray-300" /><h3 className="font-semibold text-sm text-left">{port.title}</h3></div>
                                        {port.type === 'video' ? (
                                            <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                                                <img src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover opacity-50 pointer-events-none" />
                                                <div className="absolute w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-none"><SvgIcon name="play" className="w-5 h-5 text-white ml-1" /></div>
                                            </div>
                                        ) : <img src={port.url} className="w-full h-40 object-cover rounded-2xl pointer-events-none" />}
                                    </div>
                                ))}
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

                                        // 5. Sedang di Edit
                                        const editCompleted = order.progressStatus === 'Selesai untuk Preview' || order.progressStatus === 'Done';
                                        const editActive = order.progressStatus === 'Proses Edit' || (order.progressStatus === 'Antrian Pengerjaan' && order.tanggalPilihFoto);

                                        // 6. Preview & Approve
                                        const previewCompleted = order.progressStatus === 'Done';
                                        const previewActive = order.progressStatus === 'Selesai untuk Preview';

                                        // 7. Done
                                        const doneCompleted = order.progressStatus === 'Done';

                                        const getGeneralProgressInfo = (order) => {
                                            if (order.status === 'Menunggu DP') {
                                                return { text: 'Menunggu DP', style: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
                                            }
                                            switch (order.progressStatus) {
                                                case 'Done':
                                                    return { text: 'Selesai Sepenuhnya 🎉', style: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
                                                case 'Selesai untuk Preview':
                                                    return { text: 'Siap Preview 🔥', style: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
                                                case 'Proses Edit':
                                                    return { text: 'Sedang Di-edit 🎨', style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
                                                case 'Antrian Pengerjaan':
                                                    return { text: 'Antrian Edit ⏳', style: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' };
                                                case 'Menunggu Seleksi Foto':
                                                    return { text: 'Pilih Foto Mentah 📁', style: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' };
                                                default:
                                                    if (order.status === 'Sudah DP') {
                                                        return { text: 'DP Diterima', style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
                                                    } else if (order.status === 'Lunas') {
                                                        return { text: 'Lunas', style: 'bg-green-500/20 text-green-400 border border-green-500/30' };
                                                    }
                                                    return { text: 'Diproses', style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
                                            }
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
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${editCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : editActive ? 'pulse-active bg-blue-600 border-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {editCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">5</span>}
                                                                </div>
                                                                <div>
                                                                    <h5 className={`text-xs font-bold ${editCompleted ? 'text-white' : editActive ? 'text-blue-400 font-extrabold' : 'text-gray-500'}`}>Sedang di Edit</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{editCompleted ? "Proses penyuntingan selesai dikerjakan." : editActive ? "Editor kami sedang melakukan penyuntingan (editing) intensif." : "Menunggu daftar foto masuk antrean"}</p>
                                                                    {editActive && order.editorName && (
                                                                        <span className="mt-2 inline-block text-[9px] bg-blue-500/10 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                                                            Editor: {order.editorName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="relative flex gap-3.5">
                                                                <div className={`absolute -left-[23px] w-5 h-5 rounded-full flex items-center justify-center border z-10 ${previewCompleted ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' : previewActive ? 'pulse-active bg-amber-600 border-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-neutral-800 border-neutral-700 text-gray-500'}`}>
                                                                    {previewCompleted ? <span className="text-[10px] font-bold">✓</span> : <span className="text-[8px] font-semibold">6</span>}
                                                                </div>
                                                                <div className="flex flex-col items-start">
                                                                    <h5 className={`text-xs font-bold ${previewCompleted ? 'text-white' : previewActive ? 'text-amber-400 font-extrabold' : 'text-gray-500'}`}>Preview & Link Drive Hasil</h5>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{previewCompleted ? "Hasil pengerjaan disetujui sepenuhnya." : previewActive ? "Hasil pengerjaan siap ditinjau!" : "Menunggu proses penyuntingan selesai"}</p>
                                                                    {previewActive && (
                                                                        <div className="flex flex-col gap-2 mt-3 w-full sm:flex-row">
                                                                            {order.driveLink && (
                                                                                <a href={order.driveLink} target="_blank" className="inline-flex items-center justify-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition duration-300 shadow-sm shadow-blue-500/10 w-full sm:w-auto">
                                                                                    📁 Buka Preview Google Drive
                                                                                </a>
                                                                            )}
                                                                            <a href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent("halo kak saya mau konfirmasi untuk foto yang sudah di edit sudah sesuai , lanjutkan ke finishing")}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition duration-300 shadow-sm shadow-emerald-500/10 w-full sm:w-auto">
                                                                                💬 Konfirmasi Hasil Sesuai (WhatsApp)
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

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
                        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-50 max-w-md mx-auto">
                            <button onClick={() => setView('booking')} className="w-full bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition">Booking Sekarang</button>
                        </div>
                    </div>
                )}

                {/* BOOKING FORM VIEW */}
                {view === 'booking' && selectedPkg && (() => {
                    const pkgTitleLower = selectedPkg.title.toLowerCase();
                    const isSingleDate = pkgTitleLower.includes("royal") || pkgTitleLower.includes("bronze");
                    const isThreeDates = pkgTitleLower.includes("delta") || pkgTitleLower.includes("centro");
                    const isResepsiFlow = !isSingleDate && !isThreeDates && selectedPkg.category === "Wedding";

                    const dpAmount = getDPMin(selectedPkg);
                    const priceInfo = getDiscountedPriceInfo(selectedPkg);
                    const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
                    const finalPrice = Number(priceInfo.price) - appliedDiscount + addonsTotal;
                    const sisaAmount = finalPrice - dpAmount;

                    return (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col p-6 pt-10 text-left">
                            <div className="flex items-center gap-4 mb-8">
                                <button onClick={() => setView('detail')} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center shrink-0"><SvgIcon name="arrow-left" className="w-5 h-5 text-white" /></button>
                                <div><h2 className="text-xl font-bold">Booking Form</h2><p className="text-xs text-gray-400">{selectedPkg.title}</p></div>
                            </div>

                            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4 pb-10">
                                <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><SvgIcon name="calendar" className="w-4 h-4 text-white" /> Jadwal Acara</h3>

                                    {isSingleDate && (
                                        <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Acara *</label><input type="date" name="eventDate" className="input-glass mt-1" required /></div>
                                    )}

                                    {isThreeDates && (
                                        <>
                                            <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Prewed (Opsional)</label><input type="date" name="prewedDate" className="input-glass mt-1" /></div>
                                            <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Akad *</label><input type="date" name="eventDate" className="input-glass mt-1" required /></div>
                                            <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Resepsi</label><input type="date" name="resepsiDate" className="input-glass mt-1" /></div>
                                        </>
                                    )}

                                    {(!isSingleDate && !isThreeDates) && (
                                        isResepsiFlow ? (
                                            <>
                                                <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Akad *</label><input type="date" name="eventDate" className="input-glass mt-1" required /></div>
                                                <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Resepsi</label><input type="date" name="resepsiDate" className="input-glass mt-1" /></div>
                                            </>
                                        ) : (
                                            <div><label className="text-[11px] text-gray-400 ml-2">Tanggal Acara *</label><input type="date" name="eventDate" className="input-glass mt-1" required /></div>
                                        )
                                    )}
                                </div>

                                <div className="glass-panel p-4 rounded-3xl flex flex-col gap-3">
                                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><SvgIcon name="user" className="w-4 h-4 text-white" /> Data Pemesan</h3>
                                    <div><label className="text-[11px] text-gray-400 ml-2">Nama Pemesan *</label><input type="text" value={bookingName} onChange={handleNameInputChange} placeholder="Hanya dapat diisi huruf" className="input-glass mt-1" required /></div>
                                    <div><label className="text-[11px] text-gray-400 ml-2">No WhatsApp *</label><input type="tel" value={bookingPhone} onChange={handlePhoneInputChange} placeholder="Hanya dapat diisi angka" className="input-glass mt-1" required /></div>
                                    <div><label className="text-[11px] text-gray-400 ml-2">Alamat Lengkap *</label><textarea value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} placeholder="Alamat Lengkap" className="input-glass min-h-[80px] mt-1" required></textarea></div>
                                    <div><label className="text-[11px] text-gray-400 ml-2">Keterangan Tambahan (Opsional)</label><textarea value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="Keterangan tambahan" className="input-glass min-h-[60px] mt-1"></textarea></div>
                                </div>

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

                                    {/* Dropdown 4: Add-on Lainnya (Fallback jika ada item uncategorized) */}
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

                                <button type="submit" className="w-full bg-white text-black font-semibold py-4 rounded-full text-sm hover:bg-gray-200 transition mt-4 mb-10 shadow-lg shadow-white/10">Konfirmasi Pesanan</button>
                            </form>
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Navigation */}
            {view === 'home' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[400px] glass-panel rounded-[2rem] p-1.5 flex justify-between items-center z-50 px-2">
                    <button onClick={() => handleTabClick('beranda')} className={`flex flex-col items-center gap-1 p-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'beranda' ? 'text-white bg-white/10 rounded-2xl' : 'text-gray-400 hover:text-white'}`}>
                        <SvgIcon name="home" className="w-4 h-4" /><span className="text-[9px] font-medium">Beranda</span>
                    </button>
                    <button onClick={() => handleTabClick('package')} className={`flex flex-col items-center gap-1 p-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'package' ? 'text-white bg-white/10 rounded-2xl' : 'text-gray-400 hover:text-white'}`}>
                        <SvgIcon name="package" className="w-4 h-4" /><span className="text-[9px] font-medium">Package</span>
                    </button>
                    <button onClick={() => handleTabClick('sample')} className={`flex flex-col items-center gap-1 p-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'sample' ? 'text-white bg-white/10 rounded-2xl' : 'text-gray-400 hover:text-white'}`}>
                        <SvgIcon name="layout-template" className="w-4 h-4" /><span className="text-[9px] font-medium">Sample</span>
                    </button>
                    <button onClick={() => handleTabClick('order')} className={`flex flex-col items-center gap-1 p-2 w-[4.5rem] transition-all duration-300 relative ${activeTab === 'order' ? 'text-white bg-white/10 rounded-2xl' : 'text-gray-400 hover:text-white'}`}>
                        <div className="relative">
                            <SvgIcon name="clipboard-list" className="w-4 h-4" />
                            {orders.filter(o => o.status && o.status.toLowerCase() === 'menunggu dp').length > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full shadow-lg border border-black/20 z-10">
                                    {orders.filter(o => o.status && o.status.toLowerCase() === 'menunggu dp').length}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-medium">My Order</span>
                    </button>
                    <button onClick={() => handleTabClick('profile')} className={`flex flex-col items-center gap-1 p-2 w-[4.5rem] transition-all duration-300 ${activeTab === 'profile' ? 'text-white bg-white/10 rounded-2xl' : 'text-gray-400 hover:text-white'}`}>
                        <SvgIcon name="user" className="w-4 h-4" /><span className="text-[9px] font-medium">Profile</span>
                    </button>
                </div>
            )}

            {/* Media Modal (Lightbox) */}
            {mediaModalOpen && portfolio.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-300">
                    <div className="flex justify-between items-center p-4 text-white z-20 absolute top-0 w-full bg-gradient-to-b from-black/80 to-transparent">
                        <h3 className="font-semibold text-sm truncate pr-4 drop-shadow-md">{portfolio[currentMediaIndex].title}</h3>
                        <button onClick={() => setMediaModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0 backdrop-blur-md">
                            <SvgIcon name="x" className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 w-full h-full flex items-center justify-center relative touch-pan-y"
                        onTouchStart={(e) => { window.touchStartX = e.changedTouches[0].screenX; }}
                        onTouchEnd={(e) => {
                            const touchEndX = e.changedTouches[0].screenX;
                            if (window.touchStartX - touchEndX > 50) {
                                setCurrentMediaIndex((prev) => (prev < portfolio.length - 1 ? prev + 1 : 0));
                            } else if (touchEndX - window.touchStartX > 50) {
                                setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : portfolio.length - 1));
                            }
                        }}
                    >
                        {portfolio[currentMediaIndex].type === 'video' ? (
                            <iframe
                                src={getYouTubeEmbedUrl(portfolio[currentMediaIndex].url)}
                                className="w-full h-[60vh] max-h-full border-0 z-10 relative"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen>
                            </iframe>
                        ) : (
                            <img src={portfolio[currentMediaIndex].url} className="w-full h-auto max-h-[85vh] object-contain z-10 relative pointer-events-none" />
                        )}

                        <button onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(p => p > 0 ? p - 1 : portfolio.length - 1); }} className="absolute left-2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white z-20 backdrop-blur-md">
                            <SvgIcon name="chevron-left" className="w-6 h-6" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(p => p < portfolio.length - 1 ? p + 1 : 0); }} className="absolute right-2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white z-20 backdrop-blur-md">
                            <SvgIcon name="chevron-right" className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-4 flex justify-center items-center gap-2 absolute bottom-6 w-full z-20">
                        {portfolio.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentMediaIndex ? 'bg-white w-4' : 'bg-white/30 w-1.5'}`} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
