import React from 'react';
import ReactDOM from 'react-dom/client';
import SmartClientTracker from './components/SmartClientTracker';
import ThemeToggle from './components/ThemeToggle';
import './index.css';
import {
    MAX_SLOTS_PER_DAY,
    supabase,
    adminCache,
    compressImageIfNeeded,
    adminFetch,
    syncDateAvailabilityForDates,
    menus,
    makeupSubmenus,
    dekorSubmenus,
    studioSubmenus,
    formatRupiah,
    formatDateUI,
    formatSelectedDateUI,
    getPackageDivision,
    parseNotesField,
    checkOrderPhotoVideoAddons,
    getOrderDivisions,
    checkRole
} from './admin/adminUtils';
import SvgIcon from './admin/SvgIcon';

export { parseNotesField, checkOrderPhotoVideoAddons };

const OverviewComponent = React.lazy(() => import("./admin/tabs/OverviewComponent"));
const AppointmentComponent = React.lazy(() => import("./admin/tabs/AppointmentComponent"));
const AssignComponent = React.lazy(() => import("./admin/tabs/AssignComponent"));
const PricelistComponent = React.lazy(() => import("./admin/tabs/PricelistComponent"));
const AddonsComponent = React.lazy(() => import("./admin/tabs/AddonsComponent"));
const DateAvailableComponent = React.lazy(() => import("./admin/tabs/DateAvailableComponent"));
const VoucherComponent = React.lazy(() => import("./admin/tabs/VoucherComponent"));
const SampleEmbedComponent = React.lazy(() => import("./admin/tabs/SampleEmbedComponent"));
const SettingComponent = React.lazy(() => import("./admin/tabs/SettingComponent"));
const UserManagementComponent = React.lazy(() => import("./admin/tabs/UserManagementComponent"));

const JadwalRiasComponent = React.lazy(() => import("./admin/divisions/JadwalRiasComponent"));
const JadwalRoomComponent = React.lazy(() => import("./admin/divisions/JadwalRoomComponent"));
const FotograferComponent = React.lazy(() => import("./admin/divisions/FotograferComponent"));
const QueueAntrianComponent = React.lazy(() => import("./admin/divisions/QueueAntrianComponent"));
const LogistikDekorComponent = React.lazy(() => import("./admin/divisions/LogistikDekorComponent"));
const UnifiedHandoverFeedbackComponent = React.lazy(() => import("./admin/divisions/UnifiedHandoverFeedbackComponent"));
const FeedbackListComponent = UnifiedHandoverFeedbackComponent;
const HandoverReportsComponent = UnifiedHandoverFeedbackComponent;

const CrewManagementComponent = React.lazy(() => import("./admin/crew/CrewManagementComponent"));

import { bufferToBase64Url, base64UrlToBuffer, FaceIdIcon, checkBiometricSupport } from "./admin/auth/biometricUtils";
import LoginComponent from "./admin/auth/LoginComponent";

class AdminErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("[Admin ErrorBoundary caught]", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 m-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-white space-y-3">
                    <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
                        <span>⚠️</span> Terjadi Kendala Saat Memuat Modul
                    </h3>
                    <p className="text-xs text-slate-300">
                        {this.state.error?.message || "Kesalahan internal komponen."}
                    </p>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                    >
                        Coba Muat Ulang
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}


function AdminDashboard() {
    const [session, setSession] = React.useState(null);
    const [isChecking, setIsChecking] = React.useState(true);

    // Continuous 24/7 Keep-Alive: Auto-refresh session token in background & on window focus
    React.useEffect(() => {
        if (!session) return;

        // Interval background refresh setiap 5 menit
        const heartbeatInterval = setInterval(async () => {
            try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) {
                    console.warn('[Keep-Alive 24/7] Background refresh notice:', error.message);
                }
            } catch (err) {
                console.warn('[Keep-Alive 24/7] Heartbeat check:', err);
            }
        }, 5 * 60 * 1000);

        // Instant refresh saat admin kembali membuka tab / komputer aktif setelah ditinggal
        const handleVisibilityOrFocus = async () => {
            if (document.visibilityState === 'visible') {
                try {
                    await supabase.auth.refreshSession();
                } catch (err) {
                    console.warn('[Keep-Alive 24/7] Focus refresh check:', err);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            clearInterval(heartbeatInterval);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, [session]);

    React.useEffect(() => {
        async function restoreSession() {
            const saved = localStorage.getItem('adminSession');
            if (saved) {
                try {
                    const parsedSession = JSON.parse(saved);

                    // Restore Supabase Auth session to make sure the client is authenticated
                    let { data: { session: sbSession } } = await supabase.auth.getSession();
                    if (!sbSession) {
                        const { data: refreshData } = await supabase.auth.refreshSession();
                        if (refreshData?.session) {
                            sbSession = refreshData.session;
                        }
                    }

                    if (sbSession) {
                        // Fetch role from DB to prevent localStorage tampering
                        const { data: dbUser } = await supabase
                            .from('admin_users')
                            .select('*')
                            .eq('username', sbSession.user.email)
                            .single();
                        
                        let secureRole = 'karyawan';
                        if (dbUser) {
                            secureRole = dbUser.role;
                        } else if (['admin@lapanbelas.id', 'owner@lapanbelas.id', 'andresindo6@gmail.com'].includes(sbSession.user.email)) {
                            secureRole = 'owner';
                        }
                        
                        const updatedSession = { ...parsedSession, role: secureRole };
                        localStorage.setItem('adminSession', JSON.stringify(updatedSession));
                        setSession(updatedSession);
                        
                        // Defer defaultMenu resolution so getDefaultMenuForRole is defined
                        const roles = (secureRole || '').split(',').map(r => r.trim());
                        let defaultMenu = 'overview';
                        if (roles.includes('owner') || roles.includes('admin')) defaultMenu = 'overview';
                        else if (roles.includes('makeup')) defaultMenu = 'overview-makeup';
                        else if (roles.includes('studio')) defaultMenu = 'overview-studio';
                        else if (roles.includes('dekor')) defaultMenu = 'overview-dekor';
                        else if (roles.includes('karyawan') || roles.includes('editor_foto')) defaultMenu = 'assign-foto';
                        else if (roles.includes('editor_foto_studio')) defaultMenu = 'assign-foto-studio';
                        else if (roles.includes('editor_video')) defaultMenu = 'assign-video';
                        setActiveMenu(defaultMenu);
                    } else {
                        // If Supabase auth session is expired/not found, force re-login
                        localStorage.removeItem('adminSession');
                        setSession(null);
                    }
                } catch (e) {
                    localStorage.removeItem('adminSession');
                    setSession(null);
                }
            }
            setIsChecking(false);
        }
        restoreSession();
    }, []);

    const getDefaultMenuForRole = (roleStr) => {
        if (!roleStr) return 'overview';
        const roles = roleStr.split(',').map(r => r.trim());
        if (roles.includes('owner') || roles.includes('admin')) return 'overview';
        if (roles.includes('makeup')) return 'overview-makeup';
        if (roles.includes('studio')) return 'overview-studio';
        if (roles.includes('dekor')) return 'overview-dekor';
        if (roles.includes('karyawan') || roles.includes('editor_foto')) return 'assign-foto';
        if (roles.includes('editor_foto_studio')) return 'assign-foto-studio';
        if (roles.includes('editor_video')) return 'assign-video';
        return 'overview';
    };

    const handleLogin = (sessData) => {
        localStorage.setItem('adminSession', JSON.stringify(sessData));
        setSession(sessData);
        setActiveMenu(getDefaultMenuForRole(sessData?.role));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('adminSession');
        setSession(null);
        setActiveMenu('overview');
    };
    const [activeMenu, setActiveMenu] = React.useState('overview');
    const [isMakeupMenuOpen, setIsMakeupMenuOpen] = React.useState(false);
    const [isStudioMenuOpen, setIsStudioMenuOpen] = React.useState(false);
    const [isDecorMenuOpen, setIsDecorMenuOpen] = React.useState(false);
    const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [menuParams, setMenuParams] = React.useState({});
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            } else if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Biometric state in Dashboard
    const [isBiometricSupported, setIsBiometricSupported] = React.useState(checkBiometricSupport);
    const [bioLoading, setBioLoading] = React.useState(false);
    const [savedBio, setSavedBio] = React.useState(() => {
        try {
            const raw = localStorage.getItem('18studio_admin_biometric');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    });

    React.useEffect(() => {
        setIsBiometricSupported(checkBiometricSupport());
    }, []);

    const handleDashboardRegisterBiometric = async () => {
        if (!session) return;
        setBioLoading(true);
        try {
            const { data: { session: sbSession } } = await supabase.auth.getSession();
            const userEmail = sbSession?.user?.email || session?.username;
            if (!userEmail) throw new Error('Sesi login tidak valid. Silakan login ulang.');

            const chRes = await fetch('/api/admin/biometric/challenge').then(r => r.json());
            if (!chRes.success || !chRes.challenge) {
                throw new Error('Gagal mendapatkan challenge keamanan dari server.');
            }

            const challengeBuffer = base64UrlToBuffer(chRes.challenge);
            const userIdBuffer = new TextEncoder().encode(userEmail);
            const deviceName = navigator.userAgent.includes('iPhone') ? 'iPhone'
                : navigator.userAgent.includes('iPad') ? 'iPad'
                : navigator.userAgent.includes('Android') ? 'Android'
                : 'Perangkat Ini';

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challengeBuffer,
                    rp: { name: '18Studio Admin' },
                    user: {
                        id: userIdBuffer,
                        name: userEmail,
                        displayName: session.username || userEmail
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },
                        { alg: -257, type: 'public-key' }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000
                }
            });

            if (!credential) throw new Error('Pemindaian biometrik dibatalkan.');
            const credId = bufferToBase64Url(credential.rawId);

            const regRes = await fetch('/api/admin/biometric/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    credentialId: credId,
                    deviceName
                })
            });

            const regData = await regRes.json();
            if (!regRes.ok || !regData.success) {
                throw new Error(regData.error || 'Gagal mendaftarkan biometrik di server.');
            }

            const bioRecord = { credentialId: credId, email: userEmail, deviceName };
            localStorage.setItem('18studio_admin_biometric', JSON.stringify(bioRecord));
            setSavedBio(bioRecord);
            showToast('Face ID / Sidik Jari berhasil didaftarkan!', 'success');
        } catch (err) {
            console.error('[Biometric Dashboard Register] Error:', err);
            if (err.name === 'NotAllowedError') {
                showToast('Pendaftaran Face ID / Touch ID dibatalkan.', 'info');
            } else {
                showToast(err.message || 'Pendaftaran biometrik gagal.', 'error');
            }
        } finally {
            setBioLoading(false);
        }
    };

    const handleDashboardRemoveBiometric = async () => {
        if (!savedBio) return;
        if (!confirm('Apakah Anda yakin ingin menghapus Face ID / Sidik Jari dari perangkat ini?')) return;
        setBioLoading(true);
        try {
            await fetch('/api/admin/biometric/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: savedBio.credentialId,
                    email: savedBio.email
                })
            });
            localStorage.removeItem('18studio_admin_biometric');
            setSavedBio(null);
            showToast('Face ID / Sidik Jari berhasil dinonaktifkan.', 'info');
        } catch (err) {
            localStorage.removeItem('18studio_admin_biometric');
            setSavedBio(null);
            showToast('Face ID / Sidik Jari dihapus dari perangkat.', 'info');
        } finally {
            setBioLoading(false);
        }
    };

    React.useEffect(() => {
        if (['overview-makeup', 'appointment-makeup', 'jadwal-rias', 'date-available-makeup', 'pricelist-makeup', 'addons-makeup'].includes(activeMenu)) {
            setIsMakeupMenuOpen(true);
        }
        if (['overview-studio', 'appointment-studio', 'queue-studio', 'photographer-studio', 'room-studio', 'assign-studio', 'pricelist-studio', 'addons-studio', 'date-available-studio', 'voucher-studio'].includes(activeMenu)) {
            setIsStudioMenuOpen(true);
        }
        if (['overview-dekor', 'appointment-dekor', 'logistik-dekor', 'date-available-dekor', 'pricelist-dekor', 'addons-dekor'].includes(activeMenu)) {
            setIsDecorMenuOpen(true);
        }
    }, [activeMenu]);

    // getVisibleMenus must be defined before any conditional returns (Rules of Hooks)
    const getVisibleMenus = (sessRole) => {
        if (!sessRole) return [];
        const roles = sessRole.split(',').map(r => r.trim());
        if (roles.includes('owner')) return menus;
        if (roles.includes('admin')) return menus.filter(m => m.id !== 'users');

        const allowedMenus = [];
        const addMenu = (m) => { if (!allowedMenus.find(x => x.id === m.id)) allowedMenus.push(m); };

        roles.forEach(role => {
            if (role === 'makeup') {
                [
                    { id: 'overview-makeup', label: 'Overview', icon: 'layout-dashboard' },
                    { id: 'appointment-makeup', label: 'Appointment', icon: 'calendar-days' },
                    { id: 'jadwal-rias', label: 'Jadwal Rias', icon: 'wand-sparkles' },
                    { id: 'date-available-makeup', label: 'Date Available', icon: 'calendar-check' },
                    { id: 'pricelist-makeup', label: 'Pricelist', icon: 'tags' },
                    { id: 'addons-makeup', label: 'Add-on Layanan', icon: 'package' },
                    { id: 'voucher', label: 'Voucher', icon: 'ticket' }
                ].forEach(addMenu);
            }
            if (role === 'studio') studioSubmenus.forEach(addMenu);
            if (role === 'dekor') dekorSubmenus.forEach(addMenu);
            if (role === 'karyawan') menus.filter(m => m.id === 'assign-foto' || m.id === 'assign-video' || m.id === 'assign-foto-studio').forEach(addMenu);
            if (role === 'editor_foto') menus.filter(m => m.id === 'assign-foto').forEach(addMenu);
            if (role === 'editor_foto_studio') menus.filter(m => m.id === 'assign-foto-studio').forEach(addMenu);
            if (role === 'editor_video') menus.filter(m => m.id === 'assign-video').forEach(addMenu);
        });
        return allowedMenus.length > 0 ? allowedMenus : menus.filter(m => m.id !== 'users');
    };

    // Validate activeMenu against visibleMenus - must be before conditional returns
    React.useEffect(() => {
        if (!session) return;
        const computed = getVisibleMenus(session?.role);
        if (computed.length > 0) {
            const hasDirectAccess = computed.find(m => m.id === activeMenu);
            const isSubmenuAccess =
                (computed.find(m => m.id === 'divisi-makeup-group') && makeupSubmenus.find(s => s.id === activeMenu)) ||
                (computed.find(m => m.id === 'divisi-studio-group') && studioSubmenus.find(s => s.id === activeMenu)) ||
                (computed.find(m => m.id === 'divisi-dekorasi-group') && dekorSubmenus.find(s => s.id === activeMenu));

            if (!hasDirectAccess && !isSubmenuAccess) {
                setActiveMenu(computed[0].id);
            }
        }
    }, [session, activeMenu]);

    const visibleMenus = getVisibleMenus(session?.role);

    const allFlatMenus = React.useMemo(() => {
        const list = [];
        visibleMenus.forEach(m => {
            if (!m.isGroupHeader) list.push(m);
            if (m.id === 'divisi-makeup-group') makeupSubmenus.forEach(s => list.push({ ...s, label: `Makeup: ${s.label}` }));
            if (m.id === 'divisi-studio-group') studioSubmenus.forEach(s => list.push({ ...s, label: `Studio: ${s.label}` }));
            if (m.id === 'divisi-dekorasi-group') dekorSubmenus.forEach(s => list.push({ ...s, label: `Dekor: ${s.label}` }));
        });
        return list;
    }, [visibleMenus]);

    const userInitials = React.useMemo(() => {
        const name = session?.username || 'LB';
        const parts = name.split(/[@.\s_-]+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }, [session]);

    if (isChecking) return null;
    if (!session) return <LoginComponent onLogin={handleLogin} />;


    const navigateTo = (menuId, params = {}) => {
        setActiveMenu(menuId);
        setMenuParams(params);
        setIsSidebarOpen(false);
    };


    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    return (
        <div className="flex h-screen overflow-hidden relative bg-slate-50 dark:bg-[#020c0e] text-slate-900 dark:text-white p-0 md:p-3 gap-0 md:gap-3">
            {/* Ambient Teal Glow Background (RevenuePulse AI Style) */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 hidden dark:block">
                <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] rounded-full bg-teal-500/10 blur-[130px]" />
                <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[140px]" />
                <div className="absolute -bottom-32 left-10 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
            </div>

            {/* Quick Command Search Modal (⌘K) */}
            {isSearchOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-start justify-center pt-20 p-4" onClick={() => setIsSearchOpen(false)}>
                    <div className="bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-400/25 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-white/10">
                            <SvgIcon name="search" className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari menu, fitur, atau halaman (contoh: Kru, Invoice, Jadwal)..."
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none"
                            />
                            <button onClick={() => setIsSearchOpen(false)} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400">ESC</button>
                        </div>
                        <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {allFlatMenus
                                .filter(m => !searchQuery.trim() || m.label.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            navigateTo(m.id);
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                                            activeMenu === m.id
                                                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                                                : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <SvgIcon name={m.icon || 'layout-grid'} className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                                            {m.label}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-gray-500">Buka →</span>
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Professional Floating SaaS Toast Notification */}
            {toast.show && (
                <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 z-[9999] animate-in slide-in-from-top-3 fade-in duration-300 pointer-events-auto">
                    <div className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-all duration-300 min-w-0 sm:min-w-[320px] max-w-md w-full ${
                        toast.type === 'success' 
                            ? 'bg-[#041a13]/95 border-emerald-500/40 text-emerald-300 shadow-[0_12px_40px_rgba(16,185,129,0.3)]' 
                            : 'bg-[#200609]/95 border-rose-500/40 text-rose-300 shadow-[0_12px_40px_rgba(244,63,94,0.3)]'
                    }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                            toast.type === 'success' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                            <SvgIcon name={toast.type === 'success' ? "check-circle" : "alert-circle"} className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${toast.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {toast.type === 'success' ? 'Sukses' : 'Pemberitahuan'}
                            </p>
                            <p className="text-xs font-semibold text-white leading-snug break-words mt-0.5">{toast.message}</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setToast({ show: false, message: '', type: 'success' })}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition shrink-0 ml-1"
                        >
                            <SvgIcon name="x" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <aside 
                className={`w-64 bg-white dark:bg-[#051a1d]/90 backdrop-blur-xl border-r md:border border-slate-200 dark:border-teal-400/15 md:rounded-3xl flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
                style={{
                    paddingTop: 'calc(env(safe-area-inset-top, 0px))',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)'
                }}
            >
                {/* Ambient Sidebar Glow */}
                <div className="pointer-events-none absolute top-12 -right-12 w-36 h-36 rounded-full bg-teal-400/10 blur-2xl hidden dark:block" />

                <div className="px-5 pt-5 pb-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400/25 via-emerald-500/20 to-cyan-500/25 border border-teal-400/35 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                        <svg className="w-5 h-5 text-teal-500 dark:text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                            <span>{checkRole(session?.role, 'studio') ? 'Studio 18' : checkRole(session?.role, 'dekor') ? '18 Dekorasi' : checkRole(session?.role, 'makeup') ? 'Lady Makeup' : 'Lapanbelas'}</span>
                            <span className="text-teal-600 dark:text-[#2dd4bf] font-extrabold">AI</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">RevenuePulse Workspace</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                    <ul className="space-y-1">
                        {visibleMenus.map((menu, idx) => {
                            // Inject RevenuePulse AI Section Headers cleanly
                            let sectionHeader = null;
                            if (menu.id === 'smart-client') {
                                sectionHeader = 'ANALYTICS & ORDERS';
                            } else if (menu.id === 'divisi-makeup-group') {
                                sectionHeader = 'DIVISIONS';
                            } else if (menu.id === 'pricelist') {
                                sectionHeader = 'OPERATIONS';
                            } else if (menu.id === 'setting') {
                                sectionHeader = 'SETTINGS';
                            }

                            if (menu.isGroupHeader) {
                                if (menu.id === 'divisi-makeup-group') {
                                    const isAnySubActive = ['overview-makeup', 'appointment-makeup', 'jadwal-rias', 'date-available-makeup', 'pricelist-makeup', 'addons-makeup'].includes(activeMenu);
                                    return (
                                        <React.Fragment key={menu.id}>
                                            {sectionHeader && (
                                                <li className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400/80 select-none">
                                                    {sectionHeader}
                                                </li>
                                            )}
                                            <li className="flex flex-col">
                                                <button
                                                    onClick={() => setIsMakeupMenuOpen(!isMakeupMenuOpen)}
                                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-left transition-all ${isAnySubActive
                                                        ? 'font-semibold bg-gradient-to-r from-pink-500/20 to-pink-500/5 text-pink-600 dark:text-pink-300 border border-pink-500/30'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <SvgIcon name={menu.icon} className={`w-4 h-4 ${isAnySubActive ? 'text-pink-500 dark:text-pink-400' : 'text-slate-400 dark:text-teal-300/70'}`} />
                                                        <span className="truncate">{menu.label}</span>
                                                    </div>
                                                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isMakeupMenuOpen ? 'transform rotate-90 text-pink-500 dark:text-pink-400' : 'text-slate-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </button>
                                                {isMakeupMenuOpen && (
                                                    <ul className="mt-1 space-y-0.5 bg-slate-50 dark:bg-black/25 py-1.5 rounded-xl border-l border-slate-200 dark:border-teal-400/15 ml-4 pl-2">
                                                        {makeupSubmenus.map(sub => (
                                                            <li key={sub.id}>
                                                                <button
                                                                    onClick={() => navigateTo(sub.id)}
                                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-all ${activeMenu === sub.id
                                                                        ? 'font-bold text-pink-600 dark:text-pink-300 bg-pink-500/15'
                                                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    <SvgIcon name={sub.icon} className={`w-3.5 h-3.5 ${activeMenu === sub.id ? 'text-pink-500 dark:text-pink-400' : 'text-slate-400 dark:text-gray-500'}`} />
                                                                    <span className="truncate">{sub.label}</span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        </React.Fragment>
                                    );
                                } else if (menu.id === 'divisi-studio-group') {
                                    const isAnySubActive = ['overview-studio', 'appointment-studio', 'queue-studio', 'photographer-studio', 'room-studio', 'assign-studio', 'pricelist-studio', 'addons-studio', 'date-available-studio', 'voucher-studio'].includes(activeMenu);
                                    return (
                                        <li key={menu.id} className="flex flex-col">
                                            <button
                                                onClick={() => setIsStudioMenuOpen(!isStudioMenuOpen)}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-left transition-all ${isAnySubActive
                                                    ? 'font-semibold bg-gradient-to-r from-cyan-500/20 to-blue-500/5 text-blue-600 dark:text-cyan-300 border border-cyan-500/30'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <SvgIcon name={menu.icon} className={`w-4 h-4 ${isAnySubActive ? 'text-blue-500 dark:text-cyan-400' : 'text-slate-400 dark:text-teal-300/70'}`} />
                                                    <span className="truncate">{menu.label}</span>
                                                </div>
                                                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isStudioMenuOpen ? 'transform rotate-90 text-blue-500 dark:text-cyan-400' : 'text-slate-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
                                            {isStudioMenuOpen && (
                                                <ul className="mt-1 space-y-0.5 bg-slate-50 dark:bg-black/25 py-1.5 rounded-xl border-l border-slate-200 dark:border-teal-400/15 ml-4 pl-2">
                                                    {studioSubmenus.map(sub => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigateTo(sub.id)}
                                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-all ${activeMenu === sub.id
                                                                    ? 'font-bold text-blue-600 dark:text-cyan-300 bg-cyan-500/15'
                                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <SvgIcon name={sub.icon} className={`w-3.5 h-3.5 ${activeMenu === sub.id ? 'text-blue-500 dark:text-cyan-400' : 'text-slate-400 dark:text-gray-500'}`} />
                                                                <span className="truncate">{sub.label}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                } else if (menu.id === 'divisi-dekorasi-group') {
                                    const isAnySubActive = ['overview-dekor', 'appointment-dekor', 'logistik-dekor', 'date-available-dekor', 'pricelist-dekor', 'addons-dekor'].includes(activeMenu);
                                    return (
                                        <li key={menu.id} className="flex flex-col">
                                            <button
                                                onClick={() => setIsDecorMenuOpen(!isDecorMenuOpen)}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-left transition-all ${isAnySubActive
                                                    ? 'font-semibold bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <SvgIcon name={menu.icon} className={`w-4 h-4 ${isAnySubActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-teal-300/70'}`} />
                                                    <span className="truncate">{menu.label}</span>
                                                </div>
                                                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isDecorMenuOpen ? 'transform rotate-90 text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
                                            {isDecorMenuOpen && (
                                                <ul className="mt-1 space-y-0.5 bg-slate-50 dark:bg-black/25 py-1.5 rounded-xl border-l border-slate-200 dark:border-teal-400/15 ml-4 pl-2">
                                                    {dekorSubmenus.map(sub => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigateTo(sub.id)}
                                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-all ${activeMenu === sub.id
                                                                    ? 'font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-500/15'
                                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <SvgIcon name={sub.icon} className={`w-3.5 h-3.5 ${activeMenu === sub.id ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-gray-500'}`} />
                                                                <span className="truncate">{sub.label}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                }
                                return null;
                            }

                            const isActive = activeMenu === menu.id;

                            return (
                                <React.Fragment key={menu.id}>
                                    {sectionHeader && (
                                        <li className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400/80 select-none">
                                            {sectionHeader}
                                        </li>
                                    )}
                                    <li>
                                        <button
                                            onClick={() => navigateTo(menu.id)}
                                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left transition-all ${isActive
                                                ? 'font-semibold bg-gradient-to-r from-teal-500/30 via-teal-500/15 to-transparent text-teal-800 dark:text-white border border-teal-500/35 shadow-[0_0_20px_rgba(20,184,166,0.18)]'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <SvgIcon name={menu.id === 'overview' ? 'layout-grid' : menu.icon} className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-600 dark:text-[#2dd4bf]' : 'text-slate-400 dark:text-teal-300/70'}`} />
                                            <span className="truncate">{menu.label}</span>
                                        </button>
                                    </li>
                                </React.Fragment>
                            );
                        })}
                    </ul>
                </nav>
                <div className="p-3 border-t border-slate-200 dark:border-teal-400/15 space-y-1.5">
                    {isBiometricSupported && (
                        <button
                            type="button"
                            disabled={bioLoading}
                            onClick={savedBio ? handleDashboardRemoveBiometric : handleDashboardRegisterBiometric}
                            className={`flex items-center justify-between text-xs px-3.5 py-2 w-full transition rounded-xl border ${
                                savedBio
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <FaceIdIcon className={`w-4 h-4 ${bioLoading ? 'animate-spin' : ''}`} />
                                <span className="font-semibold text-[11px]">{savedBio ? 'Face ID Aktif' : 'Aktifkan Face ID'}</span>
                            </div>
                            <span className="text-[10px] opacity-75 font-mono">
                                {savedBio ? 'Hapus' : 'Scan'}
                            </span>
                        </button>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-2.5 text-xs text-red-600 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-300 px-3.5 py-2 w-full transition rounded-xl hover:bg-red-500/10">
                        <SvgIcon name="log-out" className="w-4 h-4 text-red-500 dark:text-rose-400" /> Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 bg-slate-50 dark:bg-transparent flex flex-col overflow-hidden relative min-w-0 z-10">
                <header 
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0 z-10 relative transition-all"
                    style={{
                        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
                        paddingBottom: '8px',
                        minHeight: 'calc(env(safe-area-inset-top, 0px) + 54px)'
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
                        <button 
                            type="button"
                            onClick={() => setIsSidebarOpen(true)} 
                            className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white rounded-xl bg-white dark:bg-[#072226] border border-slate-200 dark:border-teal-400/20 transition shrink-0"
                            title="Buka Menu"
                        >
                            <SvgIcon name="menu" className="w-5 h-5" />
                        </button>

                        {/* Search Bar Pill (RevenuePulse AI Top Bar) */}
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className="w-full max-w-[340px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-[#061e21]/90 border border-slate-200/90 dark:border-teal-400/20 text-slate-400 dark:text-gray-400 hover:border-teal-500/40 transition shadow-sm group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <SvgIcon name="search" className="w-4 h-4 text-slate-400 dark:text-gray-400 group-hover:text-teal-400 transition shrink-0" />
                                <span className="text-xs truncate">Search...</span>
                            </div>
                            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-white/10 rounded border border-slate-200 dark:border-white/10 shrink-0">
                                ⌘K
                            </kbd>
                        </button>
                    </div>

                    {/* Right Quick Actions (Bell, ThemeToggle, Avatar LB) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <ThemeToggle />

                        {isBiometricSupported && (
                            <button
                                type="button"
                                disabled={bioLoading}
                                onClick={savedBio ? handleDashboardRemoveBiometric : handleDashboardRegisterBiometric}
                                className={`hidden sm:flex px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition active:scale-95 shadow-sm ${
                                    savedBio
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                        : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                                }`}
                                title={savedBio ? 'Face ID Aktif di Perangkat Ini' : 'Daftarkan Face ID / Fingerprint'}
                            >
                                <FaceIdIcon className={`w-3.5 h-3.5 ${bioLoading ? 'animate-spin' : ''}`} />
                                <span className="text-[11px] font-medium leading-none">
                                    {savedBio ? 'Face ID' : 'Scan ID'}
                                </span>
                            </button>
                        )}

                        {/* Notification Bell with Red Dot */}
                        <button
                            type="button"
                            onClick={() => navigateTo('appointment', { status: 'Menunggu DP', division: 'All' })}
                            title="Cek Pesanan & Notifikasi"
                            className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#061e21]/90 border border-slate-200 dark:border-teal-400/20 flex items-center justify-center text-slate-600 dark:text-gray-300 hover:text-teal-500 dark:hover:text-white transition relative cursor-pointer"
                        >
                            <SvgIcon name="bell" className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#061e21]" />
                        </button>

                        {/* User Profile Badge (LB) */}
                        <button
                            type="button"
                            onClick={() => navigateTo('setting')}
                            title={session?.username || 'Admin Profile'}
                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/90 dark:bg-[#061e21]/90 border border-slate-200 dark:border-teal-400/20 hover:border-teal-400/40 transition cursor-pointer"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-sm">
                                {userInitials}
                            </div>
                            <SvgIcon name="chevron-down" className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />
                        </button>
                    </div>
                </header>

                <div 
                    className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-32 pt-2 z-10 min-w-0 custom-scrollbar"
                    style={{
                        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
                    }}
                >
                    <AdminErrorBoundary>
                        <React.Suspense fallback={
                            <div className="flex flex-col items-center justify-center min-h-[350px] text-gray-400 gap-3">
                                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                                <span className="text-xs font-mono text-gray-400">Memuat modul...</span>
                            </div>
                        }>
                            {(() => {
                            switch (activeMenu) {
                                case 'overview': return <OverviewComponent key="overview" onShowToast={showToast} onNavigate={navigateTo} session={session} />;
                                case 'smart-client': return <SmartClientTracker supabase={supabase} adminFetch={adminFetch} onShowToast={showToast} onNavigate={navigateTo} session={session} />;
                                case 'overview-makeup': return <OverviewComponent key="overview-makeup" onShowToast={showToast} onNavigate={navigateTo} mode="makeup" session={session} />;
                                case 'overview-studio': return <OverviewComponent key="overview-studio" onShowToast={showToast} onNavigate={navigateTo} mode="studio" session={session} />;
                                case 'overview-dekor': return <OverviewComponent key="overview-dekor" onShowToast={showToast} onNavigate={navigateTo} mode="dekor" session={session} />;
                                case 'appointment': return <AppointmentComponent onShowToast={showToast} onNavigate={navigateTo} initialFilter={menuParams} session={session} />;
                                case 'appointment-makeup': return <AppointmentComponent key="appointment-makeup" onShowToast={showToast} onNavigate={navigateTo} initialFilter={menuParams} session={session} mode="makeup" />;
                                case 'appointment-studio': return <AppointmentComponent key="appointment-studio" onShowToast={showToast} onNavigate={navigateTo} initialFilter={menuParams} session={session} mode="studio" />;
                                case 'appointment-dekor': return <AppointmentComponent key="appointment-dekor" onShowToast={showToast} onNavigate={navigateTo} initialFilter={menuParams} session={session} mode="dekor" />;
                                case 'queue-studio': return <QueueAntrianComponent onShowToast={showToast} session={session} />;
                                case 'photographer-studio': return <FotograferComponent onShowToast={showToast} session={session} />;
                                case 'room-studio': return <JadwalRoomComponent onShowToast={showToast} session={session} />;
                                case 'assign-foto': return <AssignComponent onShowToast={showToast} session={session} mode="foto" />;
                                case 'assign-video': return <AssignComponent onShowToast={showToast} session={session} mode="video" />;
                                case 'assign-foto-studio': return <AssignComponent onShowToast={showToast} session={session} mode="foto-studio" />;
                                case 'assign-studio': return <AssignComponent key="assign-studio" onShowToast={showToast} session={session} mode="foto-studio" />;
                                case 'pricelist': return <PricelistComponent key="pricelist-gen" onShowToast={showToast} session={session} />;
                                case 'pricelist-makeup': return <PricelistComponent key="pricelist-makeup" onShowToast={showToast} session={session} mode="makeup" />;
                                case 'pricelist-studio': return <PricelistComponent key="pricelist-studio" onShowToast={showToast} session={session} mode="studio" />;
                                case 'pricelist-dekor': return <PricelistComponent key="pricelist-dekor" onShowToast={showToast} session={session} mode="dekor" />;
                                case 'addons': return <AddonsComponent key="addons-gen" onShowToast={showToast} session={session} />;
                                case 'addons-makeup': return <AddonsComponent key="addons-makeup" onShowToast={showToast} session={session} mode="makeup" />;
                                case 'addons-studio': return <AddonsComponent key="addons-studio" onShowToast={showToast} session={session} mode="studio" />;
                                case 'addons-dekor': return <AddonsComponent key="addons-dekor" onShowToast={showToast} session={session} mode="dekor" />;
                                case 'date-available': return <DateAvailableComponent key="date-available-gen" onShowToast={showToast} />;
                                case 'date-available-makeup': return <DateAvailableComponent key="date-available-makeup" onShowToast={showToast} mode="makeup" />;
                                case 'date-available-studio': return <DateAvailableComponent key="date-available-studio" onShowToast={showToast} mode="studio" />;
                                case 'date-available-dekor': return <DateAvailableComponent key="date-available-dekor" onShowToast={showToast} mode="dekor" />;
                                case 'logistik-dekor': return <LogistikDekorComponent onShowToast={showToast} session={session} />;
                                case 'voucher': return <VoucherComponent onShowToast={showToast} />;
                                case 'voucher-studio': return <VoucherComponent onShowToast={showToast} />;
                                case 'sample-embed': return <SampleEmbedComponent onShowToast={showToast} />;
                                case 'setting': return <SettingComponent onShowToast={showToast} />;
                                case 'users': return <UserManagementComponent onShowToast={showToast} />;
                                case 'manajemen-kru': return <CrewManagementComponent onShowToast={showToast} adminFetch={adminFetch} menuParams={menuParams} />;
                                case 'serah-terima-feedback': return <UnifiedHandoverFeedbackComponent onShowToast={showToast} session={session} />;
                                case 'feedback': return <FeedbackListComponent onShowToast={showToast} session={session} />;
                                case 'handover-gallery': return <HandoverReportsComponent onShowToast={showToast} session={session} />;
                                case 'jadwal-rias': return <JadwalRiasComponent onShowToast={showToast} session={session} onNavigate={navigateTo} />;
                                default: {
                                    const firstMenu = visibleMenus[0];
                                    return firstMenu ? null : <OverviewComponent onShowToast={showToast} session={session} />;
                                }
                            }
                        })()}
                        </React.Suspense>
                    </AdminErrorBoundary>
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminDashboard />);