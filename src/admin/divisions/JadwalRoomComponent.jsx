import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatDateUI,
    formatSelectedDateUI,
    parseNotesField,
    getOrderDivisions,
    getPackageDivision,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function JadwalRoomComponent({ onShowToast, session }) {
    const [selectedDate, setSelectedDate] = React.useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [availableFreelancers, setAvailableFreelancers] = React.useState([]);

    // === ROOM PHOTO MANAGEMENT ===
    const [roomPhotos, setRoomPhotos] = React.useState({});  // { roomName: [{ id, photo_url }] }
    const [editPhotoRoom, setEditPhotoRoom] = React.useState(null); // room name being edited
    const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
    const [deletingPhotoId, setDeletingPhotoId] = React.useState(null);

    // === PINDAH ROOM STATE ===
    const [pindahRoomAppt, setPindahRoomAppt] = React.useState(null);
    const [targetRoomName, setTargetRoomName] = React.useState('');
    const [isPindahModalOpen, setIsPindahModalOpen] = React.useState(false);

    const fetchRoomPhotos = async () => {
        try {
            const { data, error } = await supabase.from('room_photos').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            const grouped = {};
            (data || []).forEach(row => {
                if (!grouped[row.room_name]) grouped[row.room_name] = [];
                grouped[row.room_name].push(row);
            });
            setRoomPhotos(grouped);
        } catch (err) {
            console.error('Gagal load room photos:', err);
        }
    };

    React.useEffect(() => { fetchRoomPhotos(); }, []);

    const handleUploadRoomPhoto = async (e, roomName) => {
        const file = e.target.files[0];
        if (!file) return;
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            onShowToast('Ukuran file maksimal 5MB', 'error');
            e.target.value = '';
            return;
        }
        setUploadingPhoto(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${roomName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${ext}`;
            const { data: storageData, error: storageErr } = await supabase.storage
                .from('room-photos')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (storageErr) throw storageErr;
            const { data: publicUrlData } = supabase.storage.from('room-photos').getPublicUrl(fileName);
            const publicUrl = publicUrlData.publicUrl;
            const { error: dbErr } = await supabase.from('room_photos').insert({ room_name: roomName, photo_url: publicUrl, file_path: fileName });
            if (dbErr) throw dbErr;
            onShowToast('Foto berhasil diunggah!', 'success');
            fetchRoomPhotos();
        } catch (err) {
            console.error(err);
            onShowToast('Gagal upload foto: ' + (err.message || ''), 'error');
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const handleDeleteRoomPhoto = async (photoRow) => {
        setDeletingPhotoId(photoRow.id);
        try {
            if (photoRow.file_path) {
                await supabase.storage.from('room-photos').remove([photoRow.file_path]);
            }
            const { error } = await supabase.from('room_photos').delete().eq('id', photoRow.id);
            if (error) throw error;
            onShowToast('Foto dihapus', 'success');
            fetchRoomPhotos();
        } catch (err) {
            onShowToast('Gagal hapus foto', 'error');
        } finally {
            setDeletingPhotoId(null);
        }
    };

    React.useEffect(() => {
        const stored = localStorage.getItem('freelanceDates');
        if (stored) {
            const parsed = JSON.parse(stored);
            const available = Object.keys(parsed).filter(key => parsed[key].includes(selectedDate));
            setAvailableFreelancers(available);
        } else {
            setAvailableFreelancers([]);
        }
    }, [selectedDate]);

    const rooms = ['Room A - Studio White', 'Room B - Luxury', 'Room C - Modern', 'Room D - Kubah', 'Room E - Custom'];

    // Normalize room name for fuzzy matching (e.g. 'Room D - Kubah' -> 'kubah')
    const normalizeRoomName = (name) => {
        if (!name) return '';
        const n = name.toLowerCase().trim();
        if (n.includes('studio white') || n.includes('limbo') || n.includes('room a') || n.includes('room 1')) return 'room-a';
        if (n.includes('luxury') || n.includes('room b') || n.includes('room 2')) return 'room-b';
        if (n.includes('colorful') || n.includes('modern') || n.includes('room c') || n.includes('room 3')) return 'room-c';
        if (n.includes('classic') || n.includes('abstrak') || n.includes('kubah') || n.includes('room d') || n.includes('room 4')) return 'room-d';
        if (n.includes('outdoor') || n.includes('garden') || n.includes('custom') || n.includes('room e') || n.includes('room 5')) return 'room-e';
        return n;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resAppts, resPkgs] = await Promise.all([
                supabase.from('appointments').select('*'),
                supabase.from('packages').select('*')
            ]);

            if (resPkgs.data) setPackages(resPkgs.data);
            if (resAppts.data && resPkgs.data) {
                const pkgMap = {};
                resPkgs.data.forEach(p => { pkgMap[p.title] = p; });

                const mapped = resAppts.data.map(appt => {
                    const pkg = pkgMap[appt.package_name];
                    let division = getPackageDivision(pkg);

                    // Parse notes for roomStudio and photographer and jamSesi
                    let roomStudio = '';
                    let photographer = '';
                    let jamSesi = '';
                    let durasiSesi = 45; // default 45 mins
                    const notesStr = appt.additional_notes || '';

                    const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/);
                    if (roomMatch) roomStudio = roomMatch[1].trim(); // e.g. 'Room D - Classic'

                    const photoMatch = notesStr.match(/\[PHOTOGRAPHER\]:\s*([^\n]+)/);
                    if (photoMatch) photographer = photoMatch[1].trim();

                    const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/);
                    if (jamMatch) {
                        jamSesi = jamMatch[1].trim();
                    } else if (appt.jam_akad) {
                        // Fallback: jam_akad e.g. "16:00:00" or "13:30 - 13:45"
                        const rawJam = String(appt.jam_akad).trim();
                        if (rawJam.includes('-')) {
                            jamSesi = rawJam.split('-')[0].trim().substring(0, 5);
                        } else {
                            jamSesi = rawJam.substring(0, 5);
                        }
                    }

                    const durasiMatch = notesStr.match(/\[DURASI SESI\]:\s*([^\n]+)/);
                    if (durasiMatch) durasiSesi = parseInt(durasiMatch[1].trim(), 10) || 45;

                    const pkgNameLower = (appt.package_name || '').toLowerCase();
                    const pkgCatLower = (pkg?.category || '').toLowerCase();
                    const notesLower = notesStr.toLowerCase();
                    const isStudioJob = division === 'Studio Lapanbelas' ||
                        Boolean(roomMatch) ||
                        Boolean(jamMatch) ||
                        notesLower.includes('[divisi]: studio') ||
                        pkgCatLower.includes('studio') ||
                        pkgCatLower.includes('wisuda') ||
                        pkgCatLower.includes('photo self') ||
                        pkgCatLower.includes('photobox') ||
                        pkgNameLower.includes('wisuda') ||
                        pkgNameLower.includes('photo self') ||
                        pkgNameLower.includes('together') ||
                        pkgNameLower.includes('kawan kita') ||
                        pkgNameLower.includes('corporate');

                    if (isStudioJob) {
                        division = 'Studio Lapanbelas';
                    }

                    return {
                        id: appt.id,
                        name: appt.client_name,
                        pkg: appt.package_name,
                        eventDate: appt.event_date,
                        status: appt.status,
                        division,
                        roomStudio,
                        photographer,
                        jamSesi,
                        durasiSesi,
                        additionalNotes: notesStr
                    };
                });

                // Filter by selected date and Studio division (or has studio room assigned)
                const filtered = mapped.filter(a =>
                    a.eventDate === selectedDate &&
                    a.status !== 'Dibatalkan' &&
                    a.status !== 'Batal' &&
                    (a.division === 'Studio Lapanbelas' || a.roomStudio)
                );
                setAppointments(filtered);
            }
        } catch (err) {
            console.error("Gagal load room schedule:", err);
            onShowToast("Gagal memuat jadwal room", "error");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [selectedDate]);

    // Helper to calculate end time
    const getEndTime = (startTime, durationMinutes) => {
        if (!startTime) return '';
        const parts = startTime.split(':');
        if (parts.length < 2) return startTime;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const totalMinutes = hours * 60 + minutes + durationMinutes;
        const endHours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
        const endMinutes = String(totalMinutes % 60).padStart(2, '0');
        return `${endHours}:${endMinutes}`;
    };

    const handleAssignFotografer = async (apptId, currentNotes, fotograferName) => {
        let newNotes = currentNotes || '';
        if (newNotes.includes('[PHOTOGRAPHER]:')) {
            newNotes = newNotes.replace(/\[PHOTOGRAPHER\]:\s*[^\n]*/, `[PHOTOGRAPHER]: ${fotograferName}`);
        } else {
            newNotes += `\n[PHOTOGRAPHER]: ${fotograferName}`;
        }

        try {
            const { error } = await supabase.from('appointments').update({ additional_notes: newNotes.trim() }).eq('id', apptId);
            if (error) throw error;
            onShowToast("Fotografer berhasil diassign!", "success");
            fetchData();

            // Auto notify fotografer via Web Push
            if (fotograferName) {
                const notifyFetch = adminFetch || fetch;
                notifyFetch('/api/crew/admin/notify-assignment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointmentId: apptId,
                        clientName: 'Klien Studio',
                        eventDate: '',
                        packageTitle: 'Studio Lapanbelas',
                        assignedCrew: [{ name: fotograferName, role: 'Fotografer', session: 'Photoshoot Studio' }]
                    })
                }).catch(e => console.warn('[Auto Notify Studio Fotografer]', e));
            }
        } catch (err) {
            onShowToast("Gagal mengassign fotografer", "error");
        }
    };

    const handleOpenPindahModal = (appt) => {
        setPindahRoomAppt(appt);
        setTargetRoomName(appt.roomStudio || rooms[0]);
        setIsPindahModalOpen(true);
    };

    const handleSavePindahRoom = async () => {
        if (!pindahRoomAppt) return;
        let newNotes = pindahRoomAppt.additionalNotes || '';
        if (newNotes.includes('[ROOM STUDIO]:')) {
            newNotes = newNotes.replace(/\[ROOM STUDIO\]:\s*[^\n]*/, `[ROOM STUDIO]: ${targetRoomName}`);
        } else {
            newNotes += `\n[ROOM STUDIO]: ${targetRoomName}`;
        }

        try {
            const { error } = await supabase.from('appointments').update({ additional_notes: newNotes.trim() }).eq('id', pindahRoomAppt.id);
            if (error) throw error;
            onShowToast("Room berhasil dipindahkan!", "success");
            setIsPindahModalOpen(false);
            fetchData();
            adminFetch('/api/calendar/sync-all', { method: 'POST' }).catch(() => {});
        } catch (err) {
            onShowToast("Gagal memindahkan room", "error");
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Jadwal Harian Studio</h2>
                    <p className="text-xs text-gray-400 mt-1">Timeline jadwal booking dan penugasan fotografer per room studio.</p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Toggle Per Room / Per Fotografer */}
                    <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden p-1">
                        <button className="bg-white text-black px-4 py-1.5 text-xs font-bold rounded-md">Per Room</button>
                        <button className="text-gray-400 hover:text-white px-4 py-1.5 text-xs font-bold rounded-md transition">Per Fotografer</button>
                    </div>

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                        <span className="text-gray-400 text-xs">Pilih Tanggal:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-transparent text-white outline-none focus:ring-0 [color-scheme:dark] w-32 font-bold cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Alert / List Booking Studio yang Belum Ditentukan Ruangannya */}
            {!loading && (() => {
                const unassignedBookings = appointments.filter(a => {
                    return !rooms.some(r => r === a.roomStudio || normalizeRoomName(r) === normalizeRoomName(a.roomStudio));
                });
                if (unassignedBookings.length === 0) return null;
                return (
                    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h4 className="text-sm font-bold text-amber-300">
                                    {unassignedBookings.length} Tamu Studio Belum Ditentukan Ruangannya
                                </h4>
                                <p className="text-xs text-gray-400">
                                    Tamu ini terjadwal di tanggal ini tetapi belum memiliki ruangan. Klik tombol untuk menetapkan room.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            {unassignedBookings.map(b => (
                                <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs">
                                    <span className="font-bold text-white">{b.name}</span>
                                    <span className="text-blue-400 font-mono">({b.jamSesi || '--:--'})</span>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPindahModal(b)}
                                        className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                                    >
                                        Pilih Room
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Memuat jadwal...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                    {rooms.map(roomName => {
                        const roomBookings = appointments
                            .filter(a => a.roomStudio === roomName || normalizeRoomName(a.roomStudio) === normalizeRoomName(roomName))
                            .sort((a, b) => (a.jamSesi || '').localeCompare(b.jamSesi || ''));

                        const roomDesc = roomName.includes('Studio White') ? 'Minimalist white backdrop' :
                            roomName.includes('Luxury') ? 'Standard luxury theme wedding room' :
                                roomName.includes('Modern') ? 'Dynamic vibrant colorful background' :
                                    roomName.includes('Kubah') ? 'Retro & classic vintage background' :
                                        'Ada biaya tambahan, silakan hubungi admin';

                        return (
                            <div key={roomName} className="glass-panel border border-white/10 rounded-2xl flex flex-col min-h-[500px] overflow-hidden">
                                <div className="pb-4 pt-5 border-b border-white/10 flex flex-col items-center justify-center text-center px-2 relative">
                                    <span className="font-bold text-base text-white">{roomName}</span>
                                    <span className="text-[10px] text-gray-400 italic mt-1">{roomDesc}</span>
                                    {/* Foto preview thumbnail + tombol edit */}
                                    {(roomPhotos[roomName] || []).length > 0 && (
                                        <div className="flex gap-1 mt-2 justify-center">
                                            {(roomPhotos[roomName] || []).slice(0, 3).map((ph, i) => (
                                                <img key={i} src={ph.photo_url} alt={`preview ${i + 1}`} className="w-8 h-8 rounded-md object-cover border border-white/20" />
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setEditPhotoRoom(roomName)}
                                        className="mt-2 text-[9px] px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition font-semibold flex items-center gap-1"
                                    >
                                        🖼️ Edit Foto ({(roomPhotos[roomName] || []).length})
                                    </button>
                                </div>
                                <div className="flex-1 space-y-3 p-4 overflow-y-auto max-h-[80dvh] md:max-h-[500px] overscroll-contain custom-scrollbar flex flex-col">
                                    {roomBookings.map(b => (
                                        <div key={b.id} className="p-3 bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 rounded-xl transition flex flex-col shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                                                    <SvgIcon name="clock" className="w-3.5 h-3.5" />
                                                    {b.jamSesi || '--:--'}
                                                </div>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${b.status === 'Lunas' ? 'bg-green-500/20 text-green-400' :
                                                    b.status === 'Sudah DP' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                    {b.status}
                                                </span>
                                            </div>

                                            <div className="mb-4">
                                                <span className="font-bold text-sm text-white block truncate">{b.name}</span>
                                                <span className="text-[11px] text-gray-400 truncate block">{b.pkg}</span>
                                            </div>

                                            <button onClick={() => handleOpenPindahModal(b)} className="w-full py-1.5 mb-3 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg transition text-center flex justify-center items-center gap-1.5 shadow-md">
                                                <span className="text-[10px]">🚪</span> Pindahkan Room
                                            </button>

                                            <div className="border-t border-white/10 pt-3">
                                                <label className="text-[10px] text-gray-400 font-semibold mb-1 flex items-center gap-1">
                                                    <span>📷</span> Assign Fotografer:
                                                </label>
                                                <select
                                                    value={b.photographer || ''}
                                                    onChange={(e) => handleAssignFotografer(b.id, b.additionalNotes, e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-blue-500 [color-scheme:dark] mt-1 appearance-none cursor-pointer"
                                                >
                                                    <option value="">-- Belum Ditugaskan --</option>
                                                    <option value="Fotografer 1 (permanent)">Fotografer 1 (permanent)</option>
                                                    <option value="Fotografer 2 (permanent)">Fotografer 2 (permanent)</option>
                                                    {(availableFreelancers.includes('freelance-1') || b.photographer === 'Fotografer 3 (freelance)') && <option value="Fotografer 3 (freelance)">Fotografer 3 (freelance)</option>}
                                                    {(availableFreelancers.includes('freelance-2') || b.photographer === 'Fotografer 4 (freelance)') && <option value="Fotografer 4 (freelance)">Fotografer 4 (freelance)</option>}
                                                    {(availableFreelancers.includes('freelance-3') || b.photographer === 'Fotografer 5 (freelance)') && <option value="Fotografer 5 (freelance)">Fotografer 5 (freelance)</option>}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    {roomBookings.length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-60">
                                            <div className="text-green-500 mb-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" /></svg>
                                            </div>
                                            <div className="text-sm text-gray-400 font-semibold mb-1">Tersedia</div>
                                            <div className="text-[10px] text-gray-500">Belum ada booking</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Edit Foto Room */}
            {editPhotoRoom && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl" style={{ maxHeight: '85vh' }}>
                        <div className="flex justify-between items-center p-5 border-b border-white/10">
                            <div>
                                <h3 className="font-bold text-white">🖼️ Foto Preview — {editPhotoRoom}</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Kelola foto yang ditampilkan ke klien saat memilih room ini</p>
                            </div>
                            <button onClick={() => setEditPhotoRoom(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                                <span className="text-white text-sm">✕</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-4">
                            {/* Foto yang sudah ada */}
                            {(roomPhotos[editPhotoRoom] || []).length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">Belum ada foto. Upload foto pertama!</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {(roomPhotos[editPhotoRoom] || []).map((ph, idx) => (
                                        <div key={ph.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group">
                                            <img src={ph.photo_url} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                                                <button
                                                    onClick={() => handleDeleteRoomPhoto(ph)}
                                                    disabled={deletingPhotoId === ph.id}
                                                    className="opacity-0 group-hover:opacity-100 transition bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow"
                                                >
                                                    {deletingPhotoId === ph.id ? '...' : '🗑 Hapus'}
                                                </button>
                                            </div>
                                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Foto {idx + 1}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload area */}
                            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition ${uploadingPhoto ? 'border-blue-500/50 opacity-50 pointer-events-none' : 'border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
                                <span className="text-2xl mb-2">📁</span>
                                <span className="text-sm font-semibold text-white">{uploadingPhoto ? 'Mengupload...' : 'Klik untuk upload foto'}</span>
                                <span className="text-[10px] text-gray-400 mt-1">JPG, PNG, WEBP — Maks. 5MB</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingPhoto}
                                    onChange={(e) => handleUploadRoomPhoto(e, editPhotoRoom)}
                                />
                            </label>
                        </div>

                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={() => setEditPhotoRoom(null)}
                                className="w-full py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 transition"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Pindah Room */}
            {isPindahModalOpen && pindahRoomAppt && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-sm relative animate-in zoom-in-95 text-left">
                        <button onClick={() => setIsPindahModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-1">Pindahkan Room</h3>
                        <p className="text-xs text-gray-400 mb-6">Klien: {pindahRoomAppt.name}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1.5">Pilih Room Baru *</label>
                                <select
                                    value={targetRoomName}
                                    onChange={e => setTargetRoomName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark] appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-gray-900">-- Pilih Room --</option>
                                    {rooms.map(r => (
                                        <option key={r} value={r} className="bg-gray-900">{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsPindahModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition text-gray-400"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSavePindahRoom}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                                >
                                    Pindahkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default JadwalRoomComponent;
export { JadwalRoomComponent };
