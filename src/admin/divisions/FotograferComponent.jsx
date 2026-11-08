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

function FotograferComponent({ onShowToast, session }) {
    const photographers = [
        { id: 'tetap-1', display_name: 'Fotografer 1', role: 'TETAP' },
        { id: 'tetap-2', display_name: 'Fotografer 2', role: 'TETAP' },
        { id: 'freelance-1', display_name: 'Fotografer 3', role: 'FREELANCE' },
        { id: 'freelance-2', display_name: 'Fotografer 4', role: 'FREELANCE' },
        { id: 'freelance-3', display_name: 'Fotografer 5', role: 'FREELANCE' }
    ];

    const [selectedPhotographer, setSelectedPhotographer] = React.useState(null);
    const [freelanceDates, setFreelanceDates] = React.useState(() => {
        const stored = localStorage.getItem('freelanceDates');
        return stored ? JSON.parse(stored) : {};
    });
    const [newDate, setNewDate] = React.useState('');
    const [photographerStatus, setPhotographerStatus] = React.useState(() => {
        const stored = localStorage.getItem('photographerStatus');
        return stored ? JSON.parse(stored) : {
            'tetap-1': true,
            'tetap-2': true,
            'freelance-1': true,
            'freelance-2': true,
            'freelance-3': true
        };
    });

    React.useEffect(() => {
        localStorage.setItem('freelanceDates', JSON.stringify(freelanceDates));
    }, [freelanceDates]);

    React.useEffect(() => {
        localStorage.setItem('photographerStatus', JSON.stringify(photographerStatus));
    }, [photographerStatus]);

    const toggleStatus = (e, pId) => {
        e.stopPropagation();
        setPhotographerStatus(prev => ({ ...prev, [pId]: !prev[pId] }));
    };

    const handleAddDate = () => {
        if (!selectedPhotographer || !newDate) return;
        const pId = selectedPhotographer.id;
        setFreelanceDates(prev => {
            const existing = prev[pId] || [];
            if (!existing.includes(newDate)) {
                return { ...prev, [pId]: [...existing, newDate].sort() };
            }
            return prev;
        });
        setNewDate('');
    };

    const handleRemoveDate = (pId, dateToRemove) => {
        setFreelanceDates(prev => {
            const existing = prev[pId] || [];
            return { ...prev, [pId]: existing.filter(d => d !== dateToRemove) };
        });
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="mb-6">
                <p className="text-sm text-gray-300">Kelola ketersediaan fotografer tetap dan freelancer untuk booking sesi foto.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1">
                {/* LEFT: Photographer cards */}
                <div className="flex-[2] glass-panel border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-xl">👥</span>
                        <h3 className="text-lg font-bold text-gray-200">DAFTAR FOTOGRAFER</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {photographers.map(p => {
                            const isSelected = selectedPhotographer?.id === p.id;
                            const isTetap = p.role === 'TETAP';

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => !isTetap && setSelectedPhotographer(p)}
                                    className={`border rounded-xl p-5 flex flex-col justify-between transition-all ${!isTetap ? 'cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5' : ''} ${isSelected
                                        ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/10'
                                        : 'border-white/10 bg-white/5'
                                        }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-white text-lg">{p.display_name}</h3>
                                            <button
                                                onClick={(e) => toggleStatus(e, p.id)}
                                                className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${photographerStatus[p.id]
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                                    }`}
                                            >
                                                {photographerStatus[p.id] ? 'Aktif' : 'Non Aktif'}
                                            </button>
                                        </div>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider ${isTetap ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                            }`}>
                                            {p.role}
                                        </span>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
                                        {isTetap ? (
                                            <span className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Selalu tersedia setiap hari</span>
                                        ) : (
                                            <span className="flex items-center gap-1.5"><span className="text-gray-300">📅</span> Klik untuk atur tanggal aktif</span>
                                        )}
                                        {!isTetap && (
                                            <span className="bg-white/10 w-5 h-5 rounded flex items-center justify-center text-[10px]">➔</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Detail Panel */}
                <div className="flex-1 shrink-0">
                    {selectedPhotographer && selectedPhotographer.role === 'FREELANCE' && (
                        <div className="glass-panel border border-white/10 rounded-2xl p-6 flex flex-col h-full min-h-[400px]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">{selectedPhotographer.display_name}</h2>
                                    <div className="text-xs font-bold text-orange-500 tracking-wider">KETERSEDIAAN FREELANCE</div>
                                </div>
                                <button onClick={() => setSelectedPhotographer(null)} className="text-sm text-gray-400 hover:text-white">Tutup</button>
                            </div>

                            <div className="flex items-center gap-3 mb-8">
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <button
                                    onClick={handleAddDate}
                                    className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors shrink-0"
                                >
                                    + Tambah
                                </button>
                            </div>

                            <div className="flex flex-col flex-1">
                                <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-4 flex items-center gap-2">
                                    <span>📅</span> TANGGAL TERSEDIA ({(freelanceDates[selectedPhotographer.id] || []).length})
                                </h3>

                                {(freelanceDates[selectedPhotographer.id] || []).length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-center px-6">
                                        <p className="text-sm text-gray-500 italic">Belum ada tanggal aktif. Klien tidak dapat memesan fotografer ini.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[40dvh] overscroll-contain custom-scrollbar">
                                        {(freelanceDates[selectedPhotographer.id] || []).map(date => (
                                            <div key={date} className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                                                <span className="text-white text-sm font-semibold">{date.split('-').reverse().join('/')}</span>
                                                <button
                                                    onClick={() => handleRemoveDate(selectedPhotographer.id, date)}
                                                    className="text-red-400 hover:text-red-300 text-xs font-bold"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


export default FotograferComponent;
export { FotograferComponent };
