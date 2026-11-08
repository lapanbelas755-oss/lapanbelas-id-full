import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatSelectedDateUI,
    getOrderDivisions,
    getPackageDivision,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function DateAvailableComponent({ onShowToast, mode }) {
    const isMakeupMode = mode === 'makeup';
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [selectedDate, setSelectedDate] = React.useState(null);
    const [availabilities, setAvailabilities] = React.useState([]);
    const [allMappedAppts, setAllMappedAppts] = React.useState([]);
    const [divisionFilter, setDivisionFilter] = React.useState(mode || 'all');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (mode) setDivisionFilter(mode);
    }, [mode]);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const formatDateString = (y, m, d) => {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const { data: avails, error: errAvail } = await supabase.from('date_availability').select('*');
            const { data: appts, error: errAppts } = await supabase.from('appointments').select('*');

            if (errAvail) console.error("Error date_availability:", errAvail);
            if (errAppts) console.error("Error appointments:", errAppts);

            if (avails) setAvailabilities(avails);
            if (appts) {
                const { data: pkgs } = await supabase.from('packages').select('*');
                const pkgMap = {};
                if (pkgs) pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mapped = appts.map(a => {
                    const pkg = pkgMap[a.package_name];
                    const division = getPackageDivision(pkg);
                    const divisions = getOrderDivisions(a, pkg);
                    return { ...a, division, divisions, packages: pkg };
                });

                setAllMappedAppts(mapped);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchCalendarData();
    }, []);

    // Filter appointments berdasarkan tab divisi aktif
    const filteredAppointments = React.useMemo(() => {
        return allMappedAppts.filter(a => {
            if (a.status === 'Dibatalkan' || a.status === 'Batal') return false;
            if (divisionFilter === 'makeup') return a.divisions?.includes('Lady Makeup');
            if (divisionFilter === 'studio') return a.divisions?.includes('Studio Lapanbelas');
            if (divisionFilter === 'dekor') return a.divisions?.includes('Lapanbelas Dekorasi');
            if (divisionFilter === 'wedding') return a.divisions?.includes('lapanbelas.id');
            return true; // 'all' -> Semua Divisi
        });
    }, [allMappedAppts, divisionFilter]);

    // Dapatkan list appointment yang terjadwal di tanggal tersebut
    const getAppointmentsForDate = (dateStr) => {
        return filteredAppointments.filter(appt => appt.event_date === dateStr || appt.resepsi_date === dateStr);
    };

    const getShiftedDate = (dateStr) => {
        if (mode === 'makeup' || divisionFilter === 'makeup') {
            const d = new Date(dateStr);
            d.setFullYear(d.getFullYear() + 10);
            return d.toISOString().split('T')[0];
        }
        if (mode === 'dekor' || divisionFilter === 'dekor') {
            const d = new Date(dateStr);
            d.setFullYear(d.getFullYear() + 20);
            return d.toISOString().split('T')[0];
        }
        return dateStr;
    };

    // Dapatkan status ketersediaan di database (termasuk nilai max_slots dinamis)
    const getAvailabilityForDate = (dateStr) => {
        const targetDate = getShiftedDate(dateStr);
        const found = availabilities.find(a => a.date === targetDate);
        if (!found) {
            return { slots_booked: 0, is_manually_closed: false, max_slots: 2 };
        }
        // Batasi default ke 2 slot jika tidak ada 3 booking aktual
        const appts = getAppointmentsForDate(dateStr);
        let maxSlots = found.max_slots || 2;
        if (maxSlots === 3 && appts.length < 3 && (!found.slots_booked || found.slots_booked < 3)) {
            maxSlots = 2;
        }
        return { ...found, max_slots: maxSlots };
    };

    const [isSyncingCalendar, setIsSyncingCalendar] = React.useState(false);

    const handleSyncAllAvailability = async () => {
        setIsSyncingCalendar(true);
        onShowToast("Menyinkronkan status ketersediaan ke Google Calendar...", "info");
        try {
            const res = await adminFetch('/api/calendar/sync-availability', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || "Status ketersediaan berhasil disinkronkan ke Google Calendar! 🗓️", "success");
            } else {
                onShowToast("Gagal sinkronisasi: " + (data.error || "Unknown error"), "error");
            }
        } catch (err) {
            onShowToast("Error: " + err.message, "error");
        } finally {
            setIsSyncingCalendar(false);
        }
    };

    // Merubah slot maksimal secara real-time
    const handleUpdateMaxSlots = async (dateStr, newMax) => {
        const targetDate = getShiftedDate(dateStr);
        const currentAvail = getAvailabilityForDate(dateStr);

        const payload = {
            date: targetDate,
            slots_booked: getAppointmentsForDate(dateStr).length,
            is_manually_closed: currentAvail.is_manually_closed || false,
            max_slots: newMax
        };

        const { error } = await supabase.from('date_availability').upsert([payload]);
        if (error) {
            onShowToast("Gagal mengubah limit slot: " + error.message, "error");
        } else {
            onShowToast(`Kapasitas slot berhasil diatur menjadi ${newMax}!`, "success");
            fetchCalendarData();
            // Background sync ke Google Calendar
            adminFetch('/api/calendar/sync-date', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => console.warn('Calendar sync error:', err));
        }
    };

    const handleToggleClose = async (dateStr) => {
        const targetDate = getShiftedDate(dateStr);
        const currentAvail = getAvailabilityForDate(dateStr);
        const nextClosed = !currentAvail.is_manually_closed;

        const payload = {
            date: targetDate,
            slots_booked: getAppointmentsForDate(dateStr).length,
            is_manually_closed: nextClosed,
            max_slots: currentAvail.max_slots || 2
        };

        const { error } = await supabase.from('date_availability').upsert([payload]);
        if (error) {
            onShowToast("Gagal mengubah ketersediaan: " + error.message, "error");
        } else {
            onShowToast(nextClosed ? "Tanggal berhasil ditutup!" : "Tanggal dibuka kembali!", "success");
            fetchCalendarData();
            // Background sync ke Google Calendar
            adminFetch('/api/calendar/sync-date', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => console.warn('Calendar sync error:', err));
        }
    };

    const renderCalendar = () => {
        if (loading) {
            return (
                <div className="flex-1 flex items-center justify-center py-20 text-gray-400">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3"></div>
                    Sedang memuat kalender...
                </div>
            );
        }

        const days = [];
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const dayHeaders = [
            { id: 0, label: 'Min', full: 'Minggu', isSunday: true },
            { id: 1, label: 'Sen', full: 'Senin' },
            { id: 2, label: 'Sel', full: 'Selasa' },
            { id: 3, label: 'Rab', full: 'Rabu' },
            { id: 4, label: 'Kam', full: 'Kamis' },
            { id: 5, label: 'Jum', full: 'Jumat' },
            { id: 6, label: 'Sab', full: 'Sabtu' },
        ];

        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

        const headers = dayHeaders.map(dh => (
            <div
                key={dh.id}
                className={`text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-white/5 bg-white/[0.03] shadow-sm select-none ${
                    dh.isSunday ? 'text-red-400 border-red-500/20 bg-red-500/[0.04]' : 'text-gray-300'
                }`}
            >
                {dh.label}
            </div>
        ));

        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div
                    key={`empty-${i}`}
                    className="min-h-[105px] rounded-xl bg-white/[0.01] border border-white/[0.02]"
                ></div>
            );
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = formatDateString(year, month, i);
            const apptsOnDate = getAppointmentsForDate(dateStr);
            const avail = getAvailabilityForDate(dateStr);

            const bookedCount = apptsOnDate.length;
            const maxSlots = avail.max_slots || 2;
            const manuallyClosed = avail.is_manually_closed;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const dayOfWeek = (firstDay + i - 1) % 7;
            const isSunday = dayOfWeek === 0;

            let statusClass = "status-available";
            let statusText = (mode === 'studio' || divisionFilter === 'studio')
                ? (bookedCount > 0 ? `${bookedCount} Sesi` : "Tersedia")
                : divisionFilter === 'all'
                    ? (bookedCount > 0 ? `${bookedCount} Jadwal` : "Tersedia")
                    : `${Math.max(0, maxSlots - bookedCount)} Tersisa`;

            if (manuallyClosed) {
                statusClass = "status-closed";
                statusText = "Ditutup Admin";
            } else if (mode === 'studio' || divisionFilter === 'studio' || divisionFilter === 'all') {
                if (bookedCount > 0) {
                    statusClass = "status-filling";
                }
            } else {
                if (bookedCount >= maxSlots) {
                    statusClass = "status-full";
                    statusText = "Penuh";
                } else if (bookedCount > 0) {
                    statusClass = "status-filling";
                }
            }

            days.push(
                <div
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[105px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                        isSelected
                            ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-500/40 text-white shadow-lg shadow-blue-500/10'
                            : isToday
                            ? 'bg-white/[0.06] border-blue-400/50 hover:border-blue-400/80 hover:bg-white/[0.08]'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                >
                    <div className="flex justify-between items-center w-full">
                        <span className={`text-xs font-bold flex items-center justify-center ${
                            isToday
                                ? 'w-5 h-5 rounded-full bg-blue-500 text-white shadow-sm'
                                : isSunday
                                ? 'text-red-400'
                                : 'text-gray-200'
                        }`}>
                            {i}
                        </span>

                        {bookedCount > 0 && !manuallyClosed && mode !== 'studio' && divisionFilter !== 'studio' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                bookedCount >= maxSlots
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                                {bookedCount}/{maxSlots}
                            </span>
                        )}
                        {bookedCount > 0 && !manuallyClosed && (mode === 'studio' || divisionFilter === 'studio') && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                                {bookedCount} Sesi
                            </span>
                        )}
                        {manuallyClosed && (
                            <span className="text-[9px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-1 py-0.5 rounded font-semibold">
                                Tutup
                            </span>
                        )}
                    </div>

                    {/* DAFTAR NAMA KLIEN DI TANGGAL KALENDER */}
                    {bookedCount > 0 && !manuallyClosed && (
                        <div className="my-1.5 space-y-1 overflow-hidden w-full">
                            {apptsOnDate.slice(0, 2).map((a, aIdx) => (
                                <div
                                    key={a.id || aIdx}
                                    className="text-[10px] font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-1.5 py-0.5 rounded truncate text-left transition-colors shadow-sm"
                                    title={`${a.client_name} - ${a.package_name}`}
                                >
                                    {a.client_name}
                                </div>
                            ))}
                            {bookedCount > 2 && (
                                <div className="text-[9px] font-semibold text-gray-400 text-left px-1">
                                    +{bookedCount - 2} klien lagi
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-auto pt-1 w-full">
                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mb-1">
                            <div
                                className={`h-full transition-all ${
                                    manuallyClosed
                                        ? 'bg-gray-500'
                                        : statusClass === 'status-full'
                                        ? 'bg-red-500'
                                        : statusClass === 'status-filling'
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400'
                                }`}
                                style={{
                                    width: manuallyClosed
                                        ? '100%'
                                        : `${Math.min(100, Math.max(10, (bookedCount / maxSlots) * 100))}%`
                                }}
                            ></div>
                        </div>
                        <p className={`text-[9px] truncate text-center font-medium ${
                            manuallyClosed
                                ? 'text-gray-400'
                                : statusClass === 'status-full'
                                ? 'text-red-400'
                                : statusClass === 'status-filling'
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                        }`}>
                            {statusText}
                        </p>
                    </div>
                </div>
            );
        }

        const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];
        const selectedDateAvailability = selectedDate ? getAvailabilityForDate(selectedDate) : null;
        const selectedMaxSlots = selectedDateAvailability?.max_slots || 2;

        return (
            <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in">
                <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">{monthNames[month]} {year}</h3>
                            <div className="flex gap-1.5">
                                <button onClick={prevMonth} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white" title="Bulan Sebelumnya"><SvgIcon name="chevron-left" className="w-5 h-5" /></button>
                                <button onClick={nextMonth} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white" title="Bulan Selanjutnya"><SvgIcon name="chevron-right" className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={isSyncingCalendar}
                            onClick={handleSyncAllAvailability}
                            className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            title="Sinkronkan status ketersediaan & penutupan tanggal ke Google Calendar"
                        >
                            {isSyncingCalendar ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Menyinkronkan...</span>
                                </>
                            ) : (
                                <>
                                    <SvgIcon name="calendar-days" className="w-3.5 h-3.5" />
                                    <span>Sync ke Google Calendar</span>
                                </>
                            )}
                        </button>
                    </div>

                    {!mode && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-4 bg-white/5 p-1.5 rounded-xl border border-white/10 w-fit">
                            {[
                                { id: 'all', label: 'Semua Divisi' },
                                { id: 'studio', label: '📸 Studio Lapanbelas' },
                                { id: 'wedding', label: '💍 Lapanbelas ID' },
                                { id: 'makeup', label: '💄 Lady Makeup' },
                                { id: 'dekor', label: '🌸 Dekorasi' }
                            ].map(tab => {
                                const count = tab.id === 'all'
                                    ? allMappedAppts.filter(a => a.status !== 'Dibatalkan' && a.status !== 'Batal').length
                                    : tab.id === 'studio'
                                        ? allMappedAppts.filter(a => a.divisions?.includes('Studio Lapanbelas') && a.status !== 'Dibatalkan' && a.status !== 'Batal').length
                                        : tab.id === 'wedding'
                                            ? allMappedAppts.filter(a => a.divisions?.includes('lapanbelas.id') && a.status !== 'Dibatalkan' && a.status !== 'Batal').length
                                            : tab.id === 'makeup'
                                                ? allMappedAppts.filter(a => a.divisions?.includes('Lady Makeup') && a.status !== 'Dibatalkan' && a.status !== 'Batal').length
                                                : allMappedAppts.filter(a => a.divisions?.includes('Lapanbelas Dekorasi') && a.status !== 'Dibatalkan' && a.status !== 'Batal').length;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setDivisionFilter(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                            divisionFilter === tab.id
                                                ? 'bg-blue-500 text-white shadow'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                            divisionFilter === tab.id ? 'bg-white/20 text-white' : 'bg-black/30 text-gray-400'
                                        }`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                        <div className="min-w-[560px]">
                            <div className="grid grid-cols-7 gap-2 mb-2.5">{headers}</div>
                            <div className="grid grid-cols-7 gap-2">{days}</div>
                        </div>
                    </div>
                </div>

                {/* PANEL DETAILS KANAN */}
                <div className="w-full lg:w-96 glass-panel rounded-2xl p-6 flex flex-col shrink-0 text-left">
                    <h3 className="text-lg font-semibold border-b border-white/10 pb-4 mb-4 text-white">Manajemen Slot</h3>

                    {!selectedDate ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center">
                            <SvgIcon name="mouse-pointer-click" className="w-12 h-12 mb-3 opacity-50 text-gray-400" />
                            <p className="text-sm px-4">Pilih tanggal pada kalender untuk mengatur ketersediaan slot & melihat riwayat klien.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 max-h-[60dvh] overscroll-contain custom-scrollbar">
                            <div className="bg-white/5 p-4 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Tanggal Terpilih</p>
                                <p className="font-bold text-base text-blue-400 text-left">
                                    {formatSelectedDateUI(selectedDate)}
                                </p>
                            </div>

                            {/* ATUR SLOT MANUAL (Only for non-studio) */}
                            {mode !== 'studio' && (
                                <>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300 font-medium">Batas Maksimal Slot</span>
                                            <div className="flex items-center gap-3 bg-black/40 px-2 py-1.5 rounded-lg border border-white/10">
                                                <button
                                                    onClick={() => handleUpdateMaxSlots(selectedDate, Math.max(1, selectedMaxSlots - 1))}
                                                    className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 transition flex items-center justify-center text-white font-bold"
                                                    title="Kurangi Slot"
                                                >
                                                    -
                                                </button>
                                                <span className="font-bold text-white w-6 text-center text-sm">{selectedMaxSlots}</span>
                                                <button
                                                    onClick={() => handleUpdateMaxSlots(selectedDate, selectedMaxSlots + 1)}
                                                    className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 transition flex items-center justify-center text-white font-bold"
                                                    title="Tambah Slot"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-left leading-relaxed">
                                            Atur kapasitas booking harian secara fleksibel sesuai kesiapan tim di lapangan.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Status Tanggal</span>
                                            {selectedDateAvailability?.is_manually_closed ? (
                                                <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded font-semibold">Ditutup Manual</span>
                                            ) : selectedDateAppointments.length >= selectedMaxSlots ? (
                                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold">Penuh</span>
                                            ) : (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">Tersedia</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Slot Terisi (Klien)</span>
                                            <span className="font-bold text-white">{selectedDateAppointments.length} / {selectedMaxSlots}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {mode === 'studio' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-300">Status Tanggal</span>
                                        {selectedDateAvailability?.is_manually_closed ? (
                                            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded font-semibold">Ditutup Manual</span>
                                        ) : (
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">Tersedia</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-300">Total Sesi Terisi</span>
                                        <span className="font-bold text-white">{selectedDateAppointments.length}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => handleToggleClose(selectedDate)}
                                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${selectedDateAvailability?.is_manually_closed ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'}`}
                            >
                                <SvgIcon name={selectedDateAvailability?.is_manually_closed ? "unlock" : "lock"} className="w-3.5 h-3.5" />
                                {selectedDateAvailability?.is_manually_closed ? 'Buka Kembali Tanggal Ini' : 'Tutup Tanggal Ini'}
                            </button>

                            <div className="w-full h-px bg-white/10 my-1"></div>

                            {/* DAFTAR APPOINTMENT PADA TANGGAL TERPILIH */}
                            <div className="space-y-3 text-left">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Klien Terjadwal ({selectedDateAppointments.length})</h4>

                                {selectedDateAppointments.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-3 text-center bg-white/5 rounded-xl">Belum ada klien di tanggal ini.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                                        {selectedDateAppointments.map((appt) => {
                                            const notesStr = appt.additional_notes || '';
                                            const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
                                            const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
                                            const roomName = roomMatch ? roomMatch[1].trim() : null;
                                            const timeDisplay = jamMatch ? jamMatch[1].trim() : (appt.jam_akad ? appt.jam_akad.slice(0, 5) : null);
                                            const divName = appt.divisions?.[0] || appt.division || 'Studio Lapanbelas';

                                            return (
                                                <div key={appt.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-1.5 text-left">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-xs text-gray-200">{appt.client_name}</span>
                                                        <span className="font-mono text-[9px] text-gray-400">{appt.id}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-0.5">
                                                        <span className="text-[10px] text-blue-300 font-medium">{appt.package_name}</span>
                                                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${appt.status === 'Lunas' ? 'bg-green-500/10 text-green-400' :
                                                            appt.status === 'Sudah DP' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'
                                                            }`}>{appt.status}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 mt-1 pt-1 border-t border-white/5">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                                            divName === 'Studio Lapanbelas' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20' :
                                                            divName === 'Lady Makeup' ? 'bg-pink-500/15 text-pink-300 border border-pink-500/20' :
                                                            divName === 'Lapanbelas Dekorasi' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                                                            'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                                        }`}>
                                                            {divName}
                                                        </span>
                                                        {roomName && <span className="text-purple-300 font-medium text-[10px]">🏠 {roomName}</span>}
                                                        {timeDisplay && (
                                                            <span className="flex items-center gap-1 text-emerald-400 font-medium text-[10px] ml-auto">
                                                                <SvgIcon name="clock" className="w-3 h-3 text-emerald-400" />
                                                                {timeDisplay} WIB
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return renderCalendar();
}

export default DateAvailableComponent;
export { DateAvailableComponent };
