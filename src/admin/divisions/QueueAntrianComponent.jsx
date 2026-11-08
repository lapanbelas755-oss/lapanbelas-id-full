import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatDateUI,
    formatSelectedDateUI,
    parseNotesField,
    getOrderDivisions,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function QueueAntrianComponent({ onShowToast, session }) {
    const [currentDate, setCurrentDate] = React.useState(new Date().toISOString().substring(0, 10));
    const [appointments, setAppointments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [queueState, setQueueState] = React.useState({});
    const [tick, setTick] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchAppts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('event_date', currentDate)
                .order('created_at', { ascending: true });

            if (data) {
                const newQueueState = {};
                const parsed = data.map(appt => {
                    const notesStr = appt.additional_notes || '';
                    const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/i);
                    const divisi = divisiMatch ? divisiMatch[1].trim().toLowerCase() : '';

                    const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/i);
                    const roomStudio = roomMatch ? roomMatch[1].trim() : '';

                    // Hanya masukkan jika divisi adalah studio atau jika ada spesifikasi Room Studio
                    if (!divisi.includes('studio') && !roomStudio) {
                        return null;
                    }

                    let jamSesi = appt.jam_akad ? appt.jam_akad.slice(0, 5) : '';
                    let durasiSesi = 45; // default
                    const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/i);
                    if (jamMatch) jamSesi = jamMatch[1].trim();
                    const durasiMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
                    if (durasiMatch) durasiSesi = parseInt(durasiMatch[1].trim(), 10);

                    // Parse queue status and activeSince directly from DB notes
                    let queueStatus = 'Menunggu';
                    let queueActiveSince = null;

                    const statusMatch = notesStr.match(/\[QUEUE_STATUS\]:\s*([^\n]+)/i);
                    if (statusMatch) {
                        const s = statusMatch[1].trim();
                        if (['Menunggu', 'Aktif', 'Selesai'].includes(s)) {
                            queueStatus = s;
                        }
                    }

                    const activeSinceMatch = notesStr.match(/\[QUEUE_ACTIVE_SINCE\]:\s*([0-9]+)/i);
                    if (activeSinceMatch) {
                        queueActiveSince = parseInt(activeSinceMatch[1].trim(), 10);
                    }

                    newQueueState[appt.id] = { status: queueStatus, activeSince: queueActiveSince };

                    return {
                        id: appt.id,
                        name: appt.client_name,
                        pkg: appt.package_name,
                        eventDate: appt.event_date,
                        jam: jamSesi,
                        room: roomStudio,
                        durasi: durasiSesi,
                        rawNotes: notesStr
                    };
                }).filter(Boolean);

                // Sort by time
                parsed.sort((a, b) => a.jam.localeCompare(b.jam));

                setAppointments(parsed);
                setQueueState(newQueueState);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAppts();

        const channel = supabase
            .channel(`admin-studio-queue-${currentDate}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments'
                },
                () => {
                    fetchAppts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentDate]);

    // Save to localStorage as local cache
    React.useEffect(() => {
        if (loading) return;
        const arr = appointments.map(a => {
            const st = queueState[a.id] || { status: 'Menunggu', activeSince: null };
            return {
                ...a,
                statusObj: st,
                status: st.status,
                activeSince: st.activeSince,
                date: currentDate
            };
        });
        localStorage.setItem('studio_queue', JSON.stringify(arr));
    }, [queueState, appointments, currentDate, loading]);

    const setStatus = async (id, status) => {
        let newActiveSince = null;
        setQueueState(prev => {
            const current = prev[id] || {};
            newActiveSince = current.activeSince;
            if (status === 'Aktif') {
                if (current.status !== 'Aktif' || !newActiveSince) {
                    newActiveSince = Date.now();
                }
            } else {
                newActiveSince = null;
            }
            return { ...prev, [id]: { status, activeSince: newActiveSince } };
        });

        // Persist to Supabase appointments.additional_notes in real-time
        try {
            const targetAppt = appointments.find(a => a.id === id);
            let notes = targetAppt?.rawNotes || '';
            if (!notes) {
                const { data: cur } = await supabase.from('appointments').select('additional_notes').eq('id', id).single();
                if (cur) notes = cur.additional_notes || '';
            }

            let updatedNotes = notes
                .replace(/\[QUEUE_STATUS\]:\s*[^\n]*(\n|$)/gi, '')
                .replace(/\[QUEUE_ACTIVE_SINCE\]:\s*[^\n]*(\n|$)/gi, '')
                .trim();

            updatedNotes = `${updatedNotes}\n\n[QUEUE_STATUS]: ${status}`;
            if (newActiveSince) {
                updatedNotes += `\n[QUEUE_ACTIVE_SINCE]: ${newActiveSince}`;
            }
            updatedNotes = updatedNotes.trim();

            await supabase
                .from('appointments')
                .update({ additional_notes: updatedNotes })
                .eq('id', id);

            setAppointments(prev => prev.map(a => a.id === id ? { ...a, rawNotes: updatedNotes } : a));
        } catch (dbErr) {
            console.error('Failed to sync queue status to Supabase:', dbErr);
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/queue.html?date=${currentDate}`;
        navigator.clipboard.writeText(url);
        onShowToast("Link disalin!", "success");
    };

    const renderApptCard = (appt, i) => {
        const stObj = queueState[appt.id] || { status: 'Menunggu', activeSince: null };
        const st = stObj.status;

        // Calculate timer
        let timerText = "";
        if (st === 'Aktif' && stObj.activeSince) {
            const elapsedMs = Date.now() - stObj.activeSince;
            const elapsedMin = Math.floor(elapsedMs / 60000);
            const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
            const remainingMin = Math.max(0, appt.durasi - elapsedMin - 1);
            const remainingSec = 59 - elapsedSec;
            if (elapsedMin >= appt.durasi) {
                timerText = "Waktu Habis";
            } else {
                timerText = `${remainingMin}:${remainingSec < 10 ? '0' : ''}${Math.max(0, remainingSec)}`;
            }
        }

        return (
            <div key={appt.id} className="glass-panel border border-white/10 hover:border-white/20 transition rounded-2xl p-4 flex flex-col 2xl:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4 w-full 2xl:w-auto">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-gray-300">
                        {i + 1}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-bold text-white text-sm lg:text-base truncate max-w-[150px] lg:max-w-[200px]">{appt.name}</h4>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${st === 'Aktif' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                st === 'Selesai' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                                    'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                }`}>{st}</span>
                            {st === 'Aktif' && (
                                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    ⏱ {timerText}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mb-1 truncate max-w-[200px] lg:max-w-[250px]">{appt.pkg}</p>
                        <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-mono font-semibold text-gray-300">
                            <span className="text-red-400">⏰</span> {appt.jam || '--:--'} WIB <span className="text-gray-500 mx-1">•</span> {appt.durasi} Menit
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 w-full 2xl:w-auto overflow-x-auto pb-2 2xl:pb-0 hide-scrollbar">
                    <button
                        onClick={() => setStatus(appt.id, 'Menunggu')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl text-[10px] lg:text-xs font-bold transition border shrink-0 ${st === 'Menunggu'
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 opacity-50 cursor-not-allowed'
                            : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                            }`}
                    >
                        Menunggu
                    </button>
                    <button
                        onClick={() => setStatus(appt.id, 'Aktif')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl text-[10px] lg:text-xs font-bold transition border flex items-center gap-1 shrink-0 ${st === 'Aktif'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 opacity-50 cursor-not-allowed'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                    >
                        ▶ Aktifkan
                    </button>
                    <button
                        onClick={() => setStatus(appt.id, 'Selesai')}
                        className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl text-[10px] lg:text-xs font-bold transition border flex items-center gap-1 shrink-0 ${st === 'Selesai'
                            ? 'bg-white/5 text-gray-400 border-white/10 opacity-50 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-white/10 text-white border-white/20'
                            }`}
                    >
                        ✓ Selesai
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold">Queue Antrian Studio</h2>
                    <p className="text-xs text-gray-400 mt-1">Kelola antrian sesi pemotretan dan bagikan link ke customer.</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="date"
                        value={currentDate}
                        onChange={e => setCurrentDate(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-white/30"
                        style={{ colorScheme: 'dark' }}
                    />
                    <button onClick={fetchAppts} className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold transition">
                        Refresh
                    </button>
                </div>
            </div>

            <div className="glass-panel border border-blue-500/20 bg-blue-500/5 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-1.5">
                            <SvgIcon name="link" className="w-3.5 h-3.5" /> Link Publik Antrian (Bagikan ke Customer)
                        </h3>
                        <p className="text-sm font-mono text-gray-300">{window.location.origin}/queue.html?date={currentDate}</p>
                    </div>
                    <button onClick={copyLink} className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-bold px-4 py-2 rounded-xl text-xs transition">
                        Salin Link
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="text-center text-sm text-gray-500 py-10">Memuat antrian...</div>
                ) : appointments.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-10 glass-panel border border-white/10 rounded-2xl">Tidak ada antrian pada tanggal ini.</div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full items-start">
                        {/* KIRI: ANTRIAN BERJALAN & MENUNGGU */}
                        <div className="flex flex-col gap-4 bg-black/20 rounded-2xl p-4 border border-white/5 h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Antrian Berjalan & Menunggu</h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                {appointments.map((appt, idx) => {
                                    const st = (queueState[appt.id] || {}).status || 'Menunggu';
                                    if (st !== 'Selesai') {
                                        return renderApptCard(appt, idx);
                                    }
                                    return null;
                                })}
                                {appointments.filter(a => ((queueState[a.id] || {}).status || 'Menunggu') !== 'Selesai').length === 0 && (
                                    <div className="text-center text-xs text-gray-500 py-6 glass-panel border border-white/10 rounded-2xl">Tidak ada antrian berjalan</div>
                                )}
                            </div>
                        </div>

                        {/* KANAN: SELESAI */}
                        <div className="flex flex-col gap-4 bg-black/20 rounded-2xl p-4 border border-white/5 h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Selesai</h3>
                            </div>
                            <div className="flex flex-col gap-3 opacity-80">
                                {appointments.map((appt, idx) => {
                                    const st = (queueState[appt.id] || {}).status || 'Menunggu';
                                    if (st === 'Selesai') {
                                        return renderApptCard(appt, idx);
                                    }
                                    return null;
                                })}
                                {appointments.filter(a => ((queueState[a.id] || {}).status || 'Menunggu') === 'Selesai').length === 0 && (
                                    <div className="text-center text-xs text-gray-500 py-6 glass-panel border border-white/10 rounded-2xl">Belum ada antrian selesai</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 glass-panel border border-white/5 rounded-xl p-3 flex items-start gap-2 bg-white/5 text-[10px] text-gray-400 shrink-0">
                <span>💡</span>
                <p><strong>Catatan:</strong> Status antrian disimpan di browser admin dan otomatis ditampilkan di link publik. Customer dapat membuka link antrian dari HP mereka untuk memantau giliran secara real-time.</p>
            </div>
        </div>
    );
}


export default QueueAntrianComponent;
export { QueueAntrianComponent };
