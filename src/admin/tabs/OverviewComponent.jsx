import React from "react";
import {
    MAX_SLOTS_PER_DAY,
    supabase,
    adminCache,
    adminFetch,
    syncDateAvailabilityForDates,
    formatRupiah,
    formatDateUI,
    formatSelectedDateUI,
    getPackageDivision,
    parseNotesField,
    checkOrderPhotoVideoAddons,
    getOrderDivisions,
    checkRole
} from "../adminUtils";
import SvgIcon from "../SvgIcon";
import SmartClientTracker from "../../components/SmartClientTracker";

function OverviewComponent({ onShowToast, onNavigate, mode, session }) {

    const isPink = mode === 'makeup' || (!mode && checkRole(session?.role, 'makeup'));
    const isGreen = mode === 'dekor' || (!mode && checkRole(session?.role, 'dekor'));
    const isBlue = mode === 'studio' || (!mode && checkRole(session?.role, 'studio'));

    const borderCol = isPink ? 'border-pink-500' : isGreen ? 'border-emerald-500' : 'border-blue-500';
    const textCol = isPink ? 'text-pink-600 dark:text-pink-400' : isGreen ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';
    const bgCol = isPink ? 'bg-pink-500' : isGreen ? 'bg-emerald-500' : 'bg-blue-500';
    const bgLightCol = isPink ? 'bg-pink-500/15 dark:bg-pink-500/20' : isGreen ? 'bg-emerald-500/15 dark:bg-emerald-500/20' : 'bg-blue-500/15 dark:bg-blue-500/20';
    const targetMenu = mode ? `appointment-${mode}` : 'appointment';

    const [stats, setStats] = React.useState({
        totalDP: 0,
        totalPelunasan: 0,
        totalIncome: 0,
        totalHpp: 0,
        netProfit: 0,
        profitMargin: '0',
        divisionBreakdown: {},
        waitingDp: 0,
        activeBookings: 0,
        totalOrdersCount: 0,
        lunasCount: 0,
        dpCount: 0,
        topPackages: [],
        clients: 0,
        activities: [],
        reminders: [],
        pelunasanReminders: [],
        uniqueClientsList: [],
        monthOptions: []
    });
    const [showClientsModal, setShowClientsModal] = React.useState(false);
    const [selectedMonth, setSelectedMonth] = React.useState('all');
    const [selectedDivision, setSelectedDivision] = React.useState(
        mode === 'makeup' ? 'Lady Makeup' : mode === 'studio' ? 'Studio Lapanbelas' : mode === 'dekor' ? 'Lapanbelas Dekorasi' : 'all'
    );
    const allApptsRef = React.useRef([]);
    const allMappedApptsRef = React.useRef([]);

    const parsePkgHppItems = (pkg) => {
        if (!pkg || !pkg.description) return [];
        try {
            const match = pkg.description.match(/\[HPP_ITEMS\]:\s*([^\r\n]+)/);
            if (match && match[1]) {
                const raw = match[1].trim();
                if (raw.startsWith('%5B') || raw.startsWith('%7B')) {
                    return JSON.parse(decodeURIComponent(raw));
                }
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error("Error parsing HPP items in Overview:", e);
        }
        return [];
    };

    const computeStats = (appts, month, allRawAppts = appts) => {
        let totalDP = 0;
        let totalPelunasan = 0;
        let totalHpp = 0;
        let waitingDp = 0;
        let activeBookings = 0;
        let totalOrdersCount = 0;
        let lunasCount = 0;
        let dpCount = 0;
        const pkgCountMap = new Map();
        const clientMap = new Map();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        const reminders = [];
        const pelunasanReminders = [];

        appts.forEach(appt => {
            // Monthly income filter uses created_at
            const createdMonth = appt.created_at ? appt.created_at.substring(0, 7) : null;
            const inSelectedMonth = (month === 'all') || (createdMonth === month);

            const isCancelled = appt.status === 'Batal' || appt.status === 'Dibatalkan';
            if (!isCancelled && inSelectedMonth) {
                totalOrdersCount++;
                const pName = appt.package_name || 'Paket Kustom';
                pkgCountMap.set(pName, (pkgCountMap.get(pName) || 0) + 1);
            }

            const isBooked = appt.status === 'Lunas' || appt.status === 'Sudah DP';
            if (isBooked) {
                activeBookings++;
                if (inSelectedMonth) {
                    totalDP += Number(appt.dp_amount || 0);
                    totalHpp += Number(appt.hppAmount || 0);
                    if (appt.status === 'Lunas') lunasCount++;
                    else if (appt.status === 'Sudah DP') dpCount++;
                }
            } else if (!isCancelled) {
                waitingDp++;
            }
            if (appt.status === 'Lunas' && inSelectedMonth) {
                totalPelunasan += Math.max(0, Number(appt.total_amount || 0) - Number(appt.dp_amount || 0));
            }

            if (appt.client_email && !clientMap.has(appt.client_email)) {
                clientMap.set(appt.client_email, appt.client_name);
            }

            // Cek Acara Mendatang (H-7) - Baik Akad maupun Resepsi (Multi-Day Wedding Support)
            const evDate = appt.event_date ? new Date(appt.event_date) : null;
            if (evDate) evDate.setHours(0, 0, 0, 0);

            const resDate = appt.resepsi_date ? new Date(appt.resepsi_date) : null;
            if (resDate) resDate.setHours(0, 0, 0, 0);

            let upcomingDate = null;
            let sessionType = '';

            if (evDate && evDate >= today && evDate <= next7Days) {
                upcomingDate = appt.event_date;
                sessionType = resDate ? 'Akad' : '';
            } else if (resDate && resDate >= today && resDate <= next7Days) {
                upcomingDate = appt.resepsi_date;
                sessionType = 'Resepsi';
            }

            if (upcomingDate && !isCancelled) {
                reminders.push({
                    ...appt,
                    active_reminder_date: upcomingDate,
                    session_type: sessionType
                });
            }

            // Cek Pelunasan Pasca-Acara (H+1)
            // Acara dianggap selesai HANYA jika sesi terakhir (resepsi jika ada, atau akad) sudah lewat dari hari ini
            const finalEventDate = resDate || evDate;
            if (appt.status === 'Sudah DP' && finalEventDate && finalEventDate < today && !isCancelled) {
                pelunasanReminders.push(appt);
            }
        });

        const topPackages = Array.from(pkgCountMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Compute division breakdown across all divisions
        const divisionBreakdown = {
            'lapanbelas.id': { key: 'lapanbelas.id', label: 'Wedding (Lapanbelas ID)', icon: '💍', dp: 0, pelunasan: 0, income: 0, hpp: 0, profit: 0, margin: '0', bookings: 0 },
            'Studio Lapanbelas': { key: 'Studio Lapanbelas', label: 'Studio Lapanbelas', icon: '📸', dp: 0, pelunasan: 0, income: 0, hpp: 0, profit: 0, margin: '0', bookings: 0 },
            'Lady Makeup': { key: 'Lady Makeup', label: 'Lady Makeup', icon: '💄', dp: 0, pelunasan: 0, income: 0, hpp: 0, profit: 0, margin: '0', bookings: 0 },
            'Lapanbelas Dekorasi': { key: 'Lapanbelas Dekorasi', label: 'Lapanbelas Dekorasi', icon: '🌸', dp: 0, pelunasan: 0, income: 0, hpp: 0, profit: 0, margin: '0', bookings: 0 }
        };

        allRawAppts.forEach(appt => {
            const createdMonth = appt.created_at ? appt.created_at.substring(0, 7) : null;
            const inSelectedMonth = (month === 'all') || (createdMonth === month);
            if (!inSelectedMonth) return;

            const isBooked = appt.status === 'Lunas' || appt.status === 'Sudah DP';
            if (!isBooked) return;

            const div = appt.division || 'lapanbelas.id';
            const targetDiv = divisionBreakdown[div] || divisionBreakdown['lapanbelas.id'];

            const dp = Number(appt.dp_amount || 0);
            const pelunasan = appt.status === 'Lunas' ? Math.max(0, Number(appt.total_amount || 0) - Number(appt.dp_amount || 0)) : 0;
            const hpp = Number(appt.hppAmount || 0);

            targetDiv.dp += dp;
            targetDiv.pelunasan += pelunasan;
            targetDiv.income += (dp + pelunasan);
            targetDiv.hpp += hpp;
            targetDiv.bookings += 1;
        });

        Object.keys(divisionBreakdown).forEach(k => {
            const item = divisionBreakdown[k];
            item.profit = item.income - item.hpp;
            item.margin = item.income > 0 ? ((item.profit / item.income) * 100).toFixed(1) : '0';
        });

        const totalIncome = totalDP + totalPelunasan;
        const netProfit = totalIncome - totalHpp;
        const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

        const uniqueClientsList = Array.from(clientMap).map(([email, name]) => ({ email, name }));
        reminders.sort((a, b) => new Date(a.active_reminder_date || a.event_date) - new Date(b.active_reminder_date || b.event_date));
        pelunasanReminders.sort((a, b) => new Date(b.resepsi_date || b.event_date) - new Date(a.resepsi_date || a.event_date));

        return {
            totalDP,
            totalPelunasan,
            totalIncome,
            totalHpp,
            netProfit,
            profitMargin,
            divisionBreakdown,
            waitingDp,
            activeBookings,
            totalOrdersCount,
            lunasCount,
            dpCount,
            topPackages,
            clients: uniqueClientsList.length,
            reminders,
            pelunasanReminders,
            uniqueClientsList
        };
    };

    React.useEffect(() => {
        async function fetchOverview() {
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('id, client_name, client_email, client_phone, client_address, additional_notes, package_name, event_date, resepsi_date, status, dp_amount, total_amount, created_at, jam_akad, jam_resepsi, invoice_addons');
            
            let pkgs = adminCache.packages;
            if (!pkgs) {
                const { data, error: pkgErr } = await supabase.from('packages').select('*');
                if (!pkgErr && data) {
                    adminCache.packages = data;
                    pkgs = data;
                }
            }
            if (error) { console.error("Gagal memuat overview:", error.message); return; }
            if (appts) {
                const pkgMap = {};
                if (pkgs) pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mappedAppts = appts.map(appt => {
                    const pkg = pkgMap[appt.package_name];
                    const division = getPackageDivision(pkg);
                    const divisions = getOrderDivisions(appt, pkg);
                    const hppItems = parsePkgHppItems(pkg);
                    const hppAmount = hppItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
                    return { ...appt, division, divisions, pkg, hppItems, hppAmount };
                });

                allMappedApptsRef.current = mappedAppts;

                // Filter by mode or selected division
                const activeDiv = mode === 'makeup' ? 'Lady Makeup' : mode === 'studio' ? 'Studio Lapanbelas' : mode === 'dekor' ? 'Lapanbelas Dekorasi' : selectedDivision;
                const filteredAppts = activeDiv === 'all'
                    ? mappedAppts
                    : mappedAppts.filter(a => a.divisions.includes(activeDiv));

                allApptsRef.current = filteredAppts;

                // Build month options from created_at
                const months = [...new Set(mappedAppts.map(a => a.created_at ? a.created_at.substring(0, 7) : null).filter(Boolean))].sort().reverse();
                const computed = computeStats(filteredAppts, selectedMonth, mappedAppts);

                // Sort and slice recent activities
                const sortedRecent = [...filteredAppts]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 4);

                setStats(prev => ({ ...prev, ...computed, activities: sortedRecent, monthOptions: months }));
            }
        }
        fetchOverview();

        // Listen for real-time updates
        const channel = supabase
            .channel('overview-appointments-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchOverview();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    React.useEffect(() => {
        if (allMappedApptsRef.current.length > 0) {
            const activeDiv = mode === 'makeup' ? 'Lady Makeup' : mode === 'studio' ? 'Studio Lapanbelas' : mode === 'dekor' ? 'Lapanbelas Dekorasi' : selectedDivision;
            const filtered = activeDiv === 'all'
                ? allMappedApptsRef.current
                : allMappedApptsRef.current.filter(a => a.divisions.includes(activeDiv));
            allApptsRef.current = filtered;
            const computed = computeStats(filtered, selectedMonth, allMappedApptsRef.current);
            const sortedRecent = [...filtered]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 4);
            setStats(prev => ({ ...prev, ...computed, activities: sortedRecent }));
        }
    }, [selectedMonth, selectedDivision]);

    const handleSendReminderEmail = async (apt) => {
        const toastId = onShowToast("Mengirim email reminder pelunasan...", "success");
        try {
            const response = await adminFetch('/api/send-invoice-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'reminder_pelunasan',
                    order: {
                        id: apt.id,
                        client_name: apt.client_name,
                        client_email: apt.client_email,
                        package_name: apt.package_name,
                        total_amount: apt.total_amount,
                        dp_amount: apt.dp_amount
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast("Email reminder pelunasan berhasil dikirim!", "success");
            } else {
                onShowToast("Gagal mengirim email: " + (resData.error || "Unknown error"), "error");
            }
        } catch (error) {
            onShowToast("Error server: " + error.message, "error");
        }
    };

    const getWaLink = (rem) => {
        let phone = rem.client_phone || '';
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '62' + phone.slice(1);
        }
        const sisa = Number(rem.total_amount || 0) - Number(rem.dp_amount || 0);
        const formattedSisa = 'Rp' + sisa.toLocaleString('en-US');
        const boldName = rem.client_name ? rem.client_name.toUpperCase() : '';

        const text = `Halo Kak *${boldName}*,

mengingatkan pada hari ini sudah bisa melakukan pembayaran sisa tagihanya 

*${formattedSisa}*

Kamu dapat mengirimkan ke Rekening berikut :
—————————————————
*BANK MANDIRI*
1060019115370
*MUHAMMAD ANDREANSYAH*
—————————————————

_Sertakan bukti transfer_

Abaikan pesan ini apabila telah melakukan pembayaran.

Terima kasih, selamat beraktifitas dan selalu jaga kesehatan.

_Pesan ini adalah pesan otomatis dan hanya dikirimkan melalui Whatsapp resmi LAPANBELAS ID._`;

        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    };

    const getUpcomingWaLink = (rem) => {
        let phone = rem.client_phone || '';
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '62' + phone.slice(1);
        }
        const boldName = rem.client_name ? rem.client_name.toUpperCase() : '';
        const targetDate = rem.active_reminder_date || rem.event_date;
        const dateFormatted = formatSelectedDateUI(targetDate);
        const sessionLabel = rem.session_type ? ` sesi ${rem.session_type}` : '';
        const text = `Halo Kak *${boldName}*,

Mengingatkan untuk jadwal${sessionLabel} *${rem.package_name || ''}* Anda pada:
📅 *${dateFormatted}*

Mohon pastikan persiapan sudah siap dan hadir tepat waktu. Jika ada kebutuhan briefing atau koordinasi lanjutan, tim kami siap membantu.

Terima kasih dan sampai jumpa di hari bahagia! 🙏
*18Studio Official*`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    };

    const divItems = React.useMemo(() => {
        const bd = stats.divisionBreakdown || {};
        return [
            { ...(bd['lapanbelas.id'] || { key: 'lapanbelas.id', label: 'Wedding (18 ID)', income: 0, profit: 0, bookings: 0 }), color: '#3b82f6', dotClass: 'bg-blue-500' },
            { ...(bd['Studio Lapanbelas'] || { key: 'Studio Lapanbelas', label: 'Studio 18', income: 0, profit: 0, bookings: 0 }), color: '#06b6d4', dotClass: 'bg-cyan-400' },
            { ...(bd['Lady Makeup'] || { key: 'Lady Makeup', label: 'Lady Makeup', income: 0, profit: 0, bookings: 0 }), color: '#6366f1', dotClass: 'bg-indigo-500' },
            { ...(bd['Lapanbelas Dekorasi'] || { key: 'Lapanbelas Dekorasi', label: '18 Dekorasi', income: 0, profit: 0, bookings: 0 }), color: '#2dd4bf', dotClass: 'bg-teal-400' }
        ];
    }, [stats.divisionBreakdown]);

    const totalDivIncome = React.useMemo(() => {
        const sum = divItems.reduce((acc, d) => acc + (d.income || 0), 0);
        return sum > 0 ? sum : 1;
    }, [divItems]);

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return 'Baru saja';
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const mins = Math.max(1, Math.floor(diffMs / 60000));
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="animate-in fade-in flex flex-col gap-5">

            {/* Division Filter & Month Selector Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                {!mode ? (
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar shrink-0">
                        {[
                            { id: 'all', label: 'Semua Divisi', icon: '🌐' },
                            { id: 'lapanbelas.id', label: 'Wedding 18 ID', icon: '💍' },
                            { id: 'Studio Lapanbelas', label: 'Studio 18', icon: '📸' },
                            { id: 'Lady Makeup', label: 'Lady Makeup', icon: '💄' },
                            { id: 'Lapanbelas Dekorasi', label: '18 Dekorasi', icon: '🌸' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSelectedDivision(tab.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    selectedDivision === tab.id
                                        ? 'bg-gradient-to-r from-teal-500/30 to-emerald-500/15 text-teal-800 dark:text-white border border-teal-400/40 shadow-[0_0_16px_rgba(20,184,166,0.2)]'
                                        : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 dark:bg-[#061e21]/70 dark:text-gray-400 dark:border-teal-400/15 dark:hover:text-white dark:hover:border-teal-400/30'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Overview Keuangan Divisi</h2>
                    </div>
                )}

                <div className="flex items-center gap-2 self-start lg:self-auto">
                    <div className="relative flex items-center">
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="bg-white/90 dark:bg-[#061e21]/90 border border-slate-200 dark:border-teal-400/25 rounded-xl pl-3.5 pr-8 py-1.5 text-xs font-semibold outline-none focus:border-teal-400 text-slate-800 dark:text-gray-200 appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="all">Semua Waktu (All Time)</option>
                            {stats.monthOptions.map(m => {
                                const [yr, mo] = m.split('-');
                                const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                                return <option key={m} value={m}>{label}</option>;
                            })}
                        </select>
                        <SvgIcon name="chevron-down" className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400 absolute right-2.5 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* ROW 1: 1 Layout Terpadu Keuangan (Total Revenue, Net Profit, HPP, Conversion Margin) di Kiri + Active Bookings di Ujung Kanan */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* KIRI (8 Kolom / 9 Kolom di Layar Lebar): 1 Kartu Terpadu Keuangan */}
                <div className="lg:col-span-8 xl:col-span-9 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 flex flex-col justify-between relative overflow-hidden">
                    {/* Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200/80 dark:border-teal-400/15">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                <SvgIcon name="trending-up" className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                    Ringkasan Keuangan & Profitabilitas
                                </h3>
                                <p className="text-[10.5px] text-slate-500 dark:text-gray-400">
                                    Total Revenue, Net Profit, HPP & Conversion Margin dalam satu tampilan
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {stats.waitingDp > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onNavigate && onNavigate(targetMenu, { status: 'Menunggu DP', division: selectedDivision === 'all' ? 'All' : selectedDivision })}
                                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition cursor-pointer whitespace-nowrap"
                                >
                                    {stats.waitingDp} Menunggu DP
                                </button>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-[#2dd4bf] border border-emerald-400/30 shrink-0 shadow-[0_0_10px_rgba(45,212,191,0.2)] whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live
                            </span>
                        </div>
                    </div>

                    {/* 4 Metrik Keuangan (Angka Utuh 100% Tanpa Terpotong) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 py-3.5">
                        {/* 1. Total Revenue */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#04181b]/70 border border-slate-200/80 dark:border-teal-400/15 flex flex-col justify-between min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">Total Revenue</span>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] shrink-0">
                                    Omset
                                </span>
                            </div>
                            <div className="text-[16px] sm:text-[18px] xl:text-[16px] 2xl:text-[18px] font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap leading-snug py-0.5" title={formatRupiah(stats.totalIncome)}>
                                {formatRupiah(stats.totalIncome)}
                            </div>
                            <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-1 whitespace-nowrap">
                                <span className="text-emerald-600 dark:text-[#2dd4bf] font-bold">
                                    ↑ {stats.totalIncome > 0 ? `${Math.round((stats.totalDP / stats.totalIncome) * 100)}% DP` : '0%'}
                                </span>
                                <span>vs Pelunasan</span>
                            </p>
                        </div>

                        {/* 2. Net Profit (Laba Bersih) */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#04181b]/70 border border-slate-200/80 dark:border-teal-400/15 flex flex-col justify-between min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">Net Profit (Laba)</span>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                                    Bersih
                                </span>
                            </div>
                            <div className={`text-[16px] sm:text-[18px] xl:text-[16px] 2xl:text-[18px] font-extrabold tracking-tight whitespace-nowrap leading-snug py-0.5 ${stats.netProfit >= 0 ? 'text-emerald-600 dark:text-[#2dd4bf]' : 'text-rose-500'}`} title={formatRupiah(stats.netProfit)}>
                                {formatRupiah(stats.netProfit)}
                            </div>
                            <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-1 whitespace-nowrap">
                                <span className="text-emerald-600 dark:text-[#2dd4bf] font-bold">↑ {stats.profitMargin}%</span>
                                <span>Margin Laba</span>
                            </p>
                        </div>

                        {/* 3. Total HPP (Modal Produksi) */}
                        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#04181b]/70 border border-slate-200/80 dark:border-teal-400/15 flex flex-col justify-between min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">Total HPP</span>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 shrink-0">
                                    Modal
                                </span>
                            </div>
                            <div className="text-[16px] sm:text-[18px] xl:text-[16px] 2xl:text-[18px] font-extrabold text-slate-900 dark:text-amber-300 tracking-tight whitespace-nowrap leading-snug py-0.5" title={formatRupiah(stats.totalHpp)}>
                                {formatRupiah(stats.totalHpp)}
                            </div>
                            <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-1 whitespace-nowrap">
                                <span className="text-amber-600 dark:text-amber-300 font-bold">
                                    {stats.totalIncome > 0 ? `${Math.round((stats.totalHpp / stats.totalIncome) * 100)}%` : '0%'}
                                </span>
                                <span>dari Total Revenue</span>
                            </p>
                        </div>

                        {/* 4. Conversion & Margin */}
                        <div
                            onClick={() => onNavigate && onNavigate(targetMenu, { status: 'Menunggu DP', division: selectedDivision === 'all' ? 'All' : selectedDivision })}
                            className="p-3 sm:p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#04181b]/70 border border-slate-200/80 dark:border-teal-400/15 hover:border-teal-400/40 transition cursor-pointer flex flex-col justify-between min-w-0"
                        >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">Conversion & Margin</span>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 shrink-0">
                                    Rasio
                                </span>
                            </div>
                            <div className="text-[16px] sm:text-[18px] xl:text-[16px] 2xl:text-[18px] font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap leading-snug py-0.5">
                                {stats.profitMargin}%
                            </div>
                            <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-1 whitespace-nowrap">
                                <span className="text-emerald-600 dark:text-[#2dd4bf] font-bold">
                                    ↑ {stats.totalOrdersCount > 0 ? `${Math.round((stats.activeBookings / stats.totalOrdersCount) * 100)}%` : '100%'}
                                </span>
                                <span>Paid Booking Rate</span>
                            </p>
                        </div>
                    </div>

                    {/* Visual Progress Bar Proporsi Net Profit vs HPP + Smooth Wave Sparkline */}
                    <div className="pt-2 border-t border-slate-200/80 dark:border-teal-400/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between text-[10.5px] font-semibold">
                                <span className="text-emerald-600 dark:text-[#2dd4bf]">
                                    ● Laba Bersih ({stats.profitMargin}%)
                                </span>
                                <span className="text-amber-600 dark:text-amber-300">
                                    ● Beban HPP ({stats.totalIncome > 0 ? (100 - Number(stats.profitMargin || 0)).toFixed(1).replace(/\.0$/, '') : 0}%)
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-amber-500/25 overflow-hidden flex">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#2dd4bf] shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, Number(stats.profitMargin || 0)))}%` }}
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-44 h-8 shrink-0">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 36" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="rp-grad-unified" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.38" />
                                        <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                <path d="M0,30 C30,26 55,14 85,18 C115,22 145,8 175,12 C188,14 195,8 200,5 L200,36 L0,36 Z" fill="url(#rp-grad-unified)" />
                                <path d="M0,30 C30,26 55,14 85,18 C115,22 145,8 175,12 C188,14 195,8 200,5" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* KANAN UJUNG (4 Kolom / 3 Kolom di Layar Lebar): Active Bookings + Menunggu DP + Realtime Matrix Grid */}
                <div
                    onClick={() => setShowClientsModal(true)}
                    className="lg:col-span-4 xl:col-span-3 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 hover:border-teal-400/45 transition cursor-pointer flex flex-col justify-between relative overflow-hidden group"
                >
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                    <SvgIcon name="users" className="w-4 h-4" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                                    Active Bookings
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {stats.waitingDp > 0 && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate && onNavigate(targetMenu, { status: 'Menunggu DP', division: selectedDivision === 'all' ? 'All' : selectedDivision });
                                        }}
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/35 hover:bg-amber-500/30 transition cursor-pointer"
                                        title="Klik untuk lihat pesanan Menunggu DP"
                                    >
                                        {stats.waitingDp} Wait DP
                                    </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-500/15 text-teal-700 dark:text-[#2dd4bf] border border-teal-400/30 group-hover:underline">
                                    {stats.clients} Klien
                                </span>
                            </div>
                        </div>

                        <div className="mt-1">
                            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                {stats.activeBookings.toLocaleString('id-ID')}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-1">
                                <span className="text-emerald-600 dark:text-[#2dd4bf] font-bold">↑ {stats.lunasCount} Lunas</span>
                                <span>• {stats.dpCount} Sudah DP</span>
                                {stats.waitingDp > 0 && (
                                    <span className="text-amber-600 dark:text-amber-300 font-semibold">• {stats.waitingDp} Menunggu DP</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 4x12 Realtime Dot-Matrix Grid */}
                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-teal-400/15 flex items-center">
                        <div className="grid grid-cols-12 gap-2 w-full">
                            {Array.from({ length: 48 }).map((_, idx) => {
                                const totalBookings = Math.max(1, stats.activeBookings + stats.waitingDp);
                                const lunasDots = Math.round((stats.lunasCount / totalBookings) * 48);
                                const dpDots = lunasDots + Math.round((stats.dpCount / totalBookings) * 48);
                                const waitDots = dpDots + Math.round((stats.waitingDp / totalBookings) * 48);

                                const isTeal = idx < lunasDots;
                                const isBlue = !isTeal && idx < dpDots;
                                const isAmber = !isTeal && !isBlue && idx < waitDots;

                                return (
                                    <span
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                            isTeal
                                                ? 'bg-[#2dd4bf] shadow-[0_0_5px_rgba(45,212,191,0.5)]'
                                                : isBlue
                                                    ? 'bg-blue-500/80'
                                                    : isAmber
                                                        ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]'
                                                        : 'bg-slate-200 dark:bg-teal-950/90'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: Revenue by Division (Donut Chart) & Order Funnel (Stream Funnel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left (5 cols): Revenue by Product / Division Donut Chart */}
                <div className="lg:col-span-5 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                <SvgIcon name="pie-chart" className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue by Division</h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/10">
                            {selectedMonth === 'all' ? 'All Time' : selectedMonth} ▾
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 my-auto py-2">
                        {/* SVG Multi-segment Donut Chart */}
                        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(45,212,191,0.1)" strokeWidth="16" />
                                {(() => {
                                    const circumference = 2 * Math.PI * 46;
                                    let accumulatedPercent = 0;
                                    const hasRealIncome = divItems.some(d => d.income > 0);
                                    const fallbackPercents = [0.40, 0.29, 0.22, 0.09];

                                    return divItems.map((div, idx) => {
                                        const pct = hasRealIncome ? (div.income / totalDivIncome) : fallbackPercents[idx];
                                        const strokeLength = Math.max(0, pct * circumference);
                                        const strokeOffset = -accumulatedPercent * circumference;
                                        accumulatedPercent += pct;
                                        return (
                                            <circle
                                                key={div.key}
                                                cx="60"
                                                cy="60"
                                                r="46"
                                                fill="none"
                                                stroke={div.color}
                                                strokeWidth="16"
                                                strokeDasharray={`${strokeLength} ${circumference}`}
                                                strokeDashoffset={strokeOffset}
                                                className="transition-all duration-700"
                                            />
                                        );
                                    });
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                                <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight whitespace-nowrap px-1" title={formatRupiah(stats.totalIncome)}>
                                    {formatRupiah(stats.totalIncome)}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">Total Revenue</span>
                            </div>
                        </div>

                        {/* Division Legend Breakdown */}
                        <div className="flex-1 w-full space-y-3">
                            {divItems.map((div) => {
                                const pct = stats.totalIncome > 0 ? ((div.income / totalDivIncome) * 100).toFixed(1) : '0.0';
                                return (
                                    <div
                                        key={div.key}
                                        onClick={() => !mode && setSelectedDivision(selectedDivision === div.key ? 'all' : div.key)}
                                        className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/5 transition cursor-pointer"
                                    >
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${div.dotClass} shadow-sm`} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-800 dark:text-gray-200 truncate">{div.label}</p>
                                                <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">{formatRupiah(div.income)}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-gray-300 shrink-0">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right (7 cols): Client Acquisition & Events Breakdown (Unified Layout - Menggabungkan Funnel & Events Breakdown) */}
                <div className="lg:col-span-7 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                <SvgIcon name="users" className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Client Acquisition & Events Breakdown</h3>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400">Tahapan konversi pesanan dan distribusi status acara</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-semibold text-teal-600 dark:text-[#2dd4bf] bg-teal-500/10 border border-teal-400/20 px-2.5 py-0.5 rounded-full">
                            Real-time Lifecycle
                        </span>
                    </div>

                    {/* 4 Stage Columns Header */}
                    {(() => {
                        const s1 = Math.max(stats.totalOrdersCount, stats.activeBookings + stats.waitingDp);
                        const s2 = stats.activeBookings;
                        const s3 = stats.dpCount;
                        const s4 = stats.lunasCount;
                        const p2 = s1 > 0 ? ((s2 / s1) * 100).toFixed(1) : '100';
                        const p3 = s1 > 0 ? ((s3 / s1) * 100).toFixed(1) : '0.0';
                        const p4 = s1 > 0 ? ((s4 / s1) * 100).toFixed(1) : '0.0';

                        const totalEvents = Math.max(1, stats.lunasCount + stats.dpCount + stats.waitingDp);
                        const lunasPct = Math.round((stats.lunasCount / totalEvents) * 100);
                        const dpPct = Math.round((stats.dpCount / totalEvents) * 100);
                        const waitPct = Math.max(0, 100 - lunasPct - dpPct);

                        return (
                            <>
                                <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-1">
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-teal-400/10">
                                        <p className="text-[10.5px] text-slate-500 dark:text-gray-400">1. Total Orders</p>
                                        <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{s1}</p>
                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300">
                                            100%
                                        </span>
                                    </div>
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-teal-400/10">
                                        <p className="text-[10.5px] text-slate-500 dark:text-gray-400">2. Confirmed</p>
                                        <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{s2}</p>
                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-300">
                                            {p2}%
                                        </span>
                                    </div>
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-teal-400/10">
                                        <p className="text-[10.5px] text-slate-500 dark:text-gray-400">3. Sudah DP</p>
                                        <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{s3}</p>
                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-[#2dd4bf]">
                                            {p3}%
                                        </span>
                                    </div>
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-teal-400/10">
                                        <p className="text-[10.5px] text-slate-500 dark:text-gray-400">4. Lunas Full</p>
                                        <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{s4}</p>
                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
                                            {p4}%
                                        </span>
                                    </div>
                                </div>

                                {/* Smooth 3D Horizontal Funnel Wave SVG */}
                                <div className="relative my-2.5 h-14 w-full">
                                    <svg className="w-full h-full" viewBox="0 0 400 65" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="rp-funnel-grad-unified" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.85" />
                                                <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.9" />
                                                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.9" />
                                                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.95" />
                                            </linearGradient>
                                        </defs>
                                        <line x1="100" y1="0" x2="100" y2="65" stroke="rgba(45,212,191,0.18)" strokeDasharray="3 3" />
                                        <line x1="200" y1="0" x2="200" y2="65" stroke="rgba(45,212,191,0.18)" strokeDasharray="3 3" />
                                        <line x1="300" y1="0" x2="300" y2="65" stroke="rgba(45,212,191,0.18)" strokeDasharray="3 3" />
                                        <path
                                            d="M 0,6 C 60,9 90,18 140,22 C 190,26 220,28 260,27 C 300,26 340,31 400,32 L 400,34 C 340,35 300,40 260,39 C 220,38 190,40 140,44 C 90,48 60,57 0,60 Z"
                                            fill="url(#rp-funnel-grad-unified)"
                                        />
                                    </svg>
                                </div>

                                {/* Events Breakdown Mini-Pills & Distribution Matrix (Penggabungan Visual) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                                    <div
                                        onClick={() => onNavigate && onNavigate(targetMenu, { status: 'Lunas', division: selectedDivision === 'all' ? 'All' : selectedDivision })}
                                        className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 transition cursor-pointer flex items-center justify-between"
                                        title="Klik untuk filter pesanan Lunas"
                                    >
                                        <div>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Lunas ({stats.lunasCount})</p>
                                            <p className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-300">{lunasPct}%</p>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                    </div>
                                    <div
                                        onClick={() => onNavigate && onNavigate(targetMenu, { status: 'Sudah DP', division: selectedDivision === 'all' ? 'All' : selectedDivision })}
                                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition cursor-pointer flex items-center justify-between"
                                        title="Klik untuk filter pesanan Sudah DP"
                                    >
                                        <div>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Sudah DP ({stats.dpCount})</p>
                                            <p className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-[#2dd4bf]">{dpPct}%</p>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-[#2dd4bf] shrink-0"></span>
                                    </div>
                                    <div
                                        onClick={() => onNavigate && onNavigate(targetMenu, { status: 'Menunggu DP', division: selectedDivision === 'all' ? 'All' : selectedDivision })}
                                        className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 transition cursor-pointer flex items-center justify-between"
                                        title="Klik untuk filter pesanan Menunggu DP"
                                    >
                                        <div>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Wait DP ({stats.waitingDp})</p>
                                            <p className="text-xs sm:text-sm font-extrabold text-purple-600 dark:text-purple-300">{waitPct}%</p>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                                    </div>
                                    <div
                                        className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Acara H-7</p>
                                            <p className="text-xs sm:text-sm font-extrabold text-cyan-600 dark:text-cyan-300">{stats.reminders.length} Acara</p>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                                    </div>
                                </div>

                                {/* Bottom Conversion Rate Pill Bar */}
                                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-[#041518]/90 border border-slate-200 dark:border-teal-400/20 text-xs">
                                    <span className="text-slate-600 dark:text-gray-300 font-medium">Overall Paid Settlement Rate (Lunas + DP)</span>
                                    <span className="font-extrabold text-teal-600 dark:text-[#2dd4bf]">{p2}%</span>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* ROW 3: Top Packages (Horizontal Bars), Events Breakdown (3 Overlapping Bubbles), Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left (4 cols): Top Packages / Channels */}
                <div className="lg:col-span-4 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                <SvgIcon name="bar-chart-2" className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Packages</h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/10">
                            {selectedMonth === 'all' ? 'All Time' : 'This Month'}
                        </span>
                    </div>

                    <div className="space-y-3.5 my-auto">
                        {(stats.topPackages.length > 0 ? stats.topPackages : [
                            { name: 'Wedding Exclusive', count: 0 },
                            { name: 'Silver Package', count: 0 },
                            { name: 'Studio Session', count: 0 },
                            { name: 'Lady Makeup', count: 0 },
                            { name: 'Dekorasi Pelaminan', count: 0 }
                        ]).map((pkg, i) => {
                            const maxCount = stats.topPackages[0]?.count || 1;
                            const widthPct = pkg.count > 0 ? Math.max(18, Math.round((pkg.count / maxCount) * 100)) : (85 - i * 15);
                            return (
                                <div key={i} className="grid grid-cols-12 items-center gap-2 text-xs">
                                    <span className="col-span-5 text-slate-700 dark:text-gray-300 truncate font-medium" title={pkg.name}>
                                        {pkg.name}
                                    </span>
                                    <div className="col-span-5 h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${widthPct}%` }}
                                            className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-300 shadow-[0_0_10px_rgba(45,212,191,0.4)] transition-all duration-700"
                                        />
                                    </div>
                                    <span className="col-span-2 text-right font-mono font-bold text-slate-800 dark:text-gray-200">
                                        {pkg.count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Center (4 cols): Reminder Acara H-7 (Menggantikan Events Breakdown) */}
                <div className="lg:col-span-4 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                <SvgIcon name="calendar-days" className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reminder Acara (H-7)</h3>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400">Jadwal acara dalam 7 hari ke depan</p>
                            </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30">
                            {stats.reminders.length} Acara Dekat
                        </span>
                    </div>

                    <div className="space-y-2.5 my-auto max-h-[220px] overflow-y-auto pr-1">
                        {stats.reminders.map((rem, i) => {
                            const todayClear = new Date();
                            todayClear.setHours(0, 0, 0, 0);
                            const targetDate = rem.active_reminder_date || rem.event_date;
                            const evDate = new Date(targetDate);
                            evDate.setHours(0, 0, 0, 0);
                            const diffDays = Math.ceil((evDate - todayClear) / (1000 * 60 * 60 * 24));
                            const labelH = diffDays === 0 ? 'Hari Ini' : diffDays === 1 ? 'Besok (H-1)' : `H-${diffDays}`;

                            return (
                                <div
                                    key={i}
                                    onClick={() => onNavigate && onNavigate(targetMenu, { order_id: rem.id })}
                                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/60 dark:border-teal-400/10 transition cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/25 flex items-center justify-center text-[11px] font-bold shrink-0">
                                            {(rem.client_name || 'K')[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {rem.client_name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                                                {rem.package_name}{rem.session_type ? ` (${rem.session_type})` : ''} • {formatSelectedDateUI(targetDate)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                            diffDays <= 1
                                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/25'
                                                : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25'
                                        }`}>
                                            {labelH}
                                        </span>
                                        <a
                                            href={getUpcomingWaLink(rem)}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition"
                                            title="Kirim Pengingat WA"
                                        >
                                            WA
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                        {stats.reminders.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-xs text-slate-400 dark:text-gray-500">Tidak ada jadwal acara dalam 7 hari ke depan.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right (4 cols): Recent Account Activity */}
                <div className="lg:col-span-4 rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-teal-400/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                <SvgIcon name="activity" className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Account Activity</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => onNavigate && onNavigate(targetMenu)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 transition cursor-pointer"
                        >
                            View all
                        </button>
                    </div>

                    <div className="space-y-2.5 my-auto">
                        {stats.activities.map((act, i) => (
                            <div
                                key={i}
                                onClick={() => onNavigate && onNavigate(targetMenu, { order_id: act.id })}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/60 dark:border-teal-400/10 transition cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                                        <SvgIcon name="check-circle" className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-gray-300 truncate">
                                        <span className="font-bold text-slate-900 dark:text-white">{act.client_name}</span>{' '}
                                        booked <span className="text-teal-600 dark:text-teal-300 font-medium">{act.package_name}</span>
                                    </p>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-gray-400 shrink-0">
                                    {formatRelativeTime(act.created_at)}
                                </span>
                            </div>
                        ))}
                        {stats.activities.length === 0 && (
                            <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6">Belum ada aktivitas baru.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ROW 4: Khusus Accounts Follow-Up (Pelunasan H+1) */}
            <div className="rp-card bg-white/90 dark:bg-[#072125]/85 backdrop-blur-xl rounded-2xl p-5 flex flex-col border border-slate-200/80 dark:border-teal-400/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2dd4bf] border border-teal-400/25 flex items-center justify-center shrink-0">
                            <SvgIcon name="shield-check" className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Accounts Follow-Up (Pelunasan H+1)
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-gray-400">
                                Prioritas penagihan pelunasan pasca-acara (H+1) bagi pesanan yang masih memiliki sisa tagihan
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/25 font-bold">
                            {stats.pelunasanReminders.length} Tagihan H+1 Belum Lunas
                        </span>
                    </div>
                </div>

                {(() => {
                    if (stats.pelunasanReminders.length === 0) {
                        return (
                            <p className="text-xs text-slate-500 dark:text-gray-400 text-center py-6">
                                Semua tagihan pasca-acara (H+1) sudah lunas 100%. Tidak ada tagihan tertunda.
                            </p>
                        );
                    }

                    return (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="pb-2.5 pr-4">Account / Client</th>
                                        <th className="pb-2.5 px-4">Health Score</th>
                                        <th className="pb-2.5 px-4">Trend</th>
                                        <th className="pb-2.5 px-4">Event Date</th>
                                        <th className="pb-2.5 px-4">Paid Ratio</th>
                                        <th className="pb-2.5 px-4">Sisa Tagihan</th>
                                        <th className="pb-2.5 pl-4 text-right">Follow-Up</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-xs">
                                    {stats.pelunasanReminders.map((rem, idx) => {
                                        const totalAmt = Number(rem.total_amount || 0);
                                        const dpAmt = Number(rem.dp_amount || 0);
                                        const sisa = Math.max(0, totalAmt - dpAmt);
                                        const paidPct = totalAmt > 0 ? Math.min(100, Math.round((dpAmt / totalAmt) * 100)) : 50;
                                        const score = 45;

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition">
                                                <td
                                                    onClick={() => onNavigate && onNavigate(targetMenu, { order_id: rem.id })}
                                                    className="py-3 pr-4 font-semibold text-slate-900 dark:text-white cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-400/25 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                            {(rem.client_name || 'K')[0].toUpperCase()}
                                                        </span>
                                                        <div>
                                                            <p className="truncate max-w-[160px] font-bold">{rem.client_name}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-normal truncate max-w-[160px]">{rem.package_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                                        {score}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                                                        <path d="M2,6 L18,12 L36,9 L56,16" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" />
                                                        <circle cx="18" cy="12" r="2" fill="#f43f5e" />
                                                        <circle cx="36" cy="9" r="2" fill="#f43f5e" />
                                                        <circle cx="56" cy="16" r="2" fill="#f43f5e" />
                                                    </svg>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-gray-300 font-mono text-[11px]">
                                                    {formatSelectedDateUI(rem.event_date)}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-700 dark:text-gray-200">
                                                    {paidPct}%
                                                </td>
                                                <td className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">
                                                    {formatRupiah(sisa)}
                                                </td>
                                                <td className="py-3 pl-4 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendReminderEmail(rem)}
                                                            className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                                            title="Kirim Email Reminder"
                                                        >
                                                            ✉ Email
                                                        </button>
                                                        <a
                                                            href={getWaLink(rem)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition"
                                                            title="Follow-Up WhatsApp"
                                                        >
                                                            💬 WA
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>

            {/* Smart Client & Project Tracker Component */}
            <SmartClientTracker
                supabase={supabase}
                adminFetch={adminFetch}
                onShowToast={onShowToast}
                onNavigate={onNavigate}
                mode={mode}
                isEmbedded={true}
            />

            {/* Modal Unique Clients */}
            {showClientsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-300/80 dark:border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95 shadow-xl">
                        <button onClick={() => setShowClientsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-slate-400 dark:text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><SvgIcon name="user-plus" className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Daftar Klien Unik</h3>
                        <div className="max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {stats.uniqueClientsList.map((c, i) => (
                                <div key={i} className="bg-slate-100/70 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/70 dark:border-white/10 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{c.name}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{c.email}</p>
                                    </div>
                                </div>
                            ))}
                            {stats.uniqueClientsList.length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-gray-500 text-center py-4">Belum ada klien terdaftar.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OverviewComponent;
export { OverviewComponent };
