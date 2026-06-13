import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const roomsData = [
    { id: 'limbo', name: 'Room 1 (Limbo)', desc: 'SOLID WHITE STUDIO', badge: 'LIMBO', color: 'gray' },
    { id: 'luxury', name: 'Room 2 (Luxury)', desc: 'GREEN GOLD VELVET', badge: 'LUXURY', color: 'emerald' },
    { id: 'modern', name: 'Room 3 (Modern)', desc: 'INDUSTRIAL GRAY CONCRETE', badge: 'MODERN', color: 'blue' },
    { id: 'abstrak', name: 'Room 4 (Abstrak)', desc: 'FINE ART CANVAS', badge: 'ABSTRAK', color: 'purple' },
    { id: 'custom', name: 'Room 5 (Custom)', desc: 'CHROMA GREEN BACKDROP', badge: 'CUSTOM', color: 'orange' }
];

function QueueApp() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [queueData, setQueueData] = useState([]);
    const [syncTimer, setSyncTimer] = useState(6);
    const announced1Min = useRef(new Set());
    const [audioEnabled, setAudioEnabled] = useState(false);

    const playAnnouncement = (roomName) => {
        if (!audioEnabled) return;
        if ('speechSynthesis' in window) {
            const chime = new Audio('https://www.myinstants.com/media/sounds/airport-chime.mp3');
            chime.play().catch(e => console.log(e));
            
            setTimeout(() => {
                const text = `${roomName}, waktu photoshoot akan berakhir dalam 1 menit lagi, terima kasih`;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'id-ID';
                utterance.rate = 0.9;
                utterance.pitch = 1.2;
                
                const voices = window.speechSynthesis.getVoices();
                const idVoices = voices.filter(v => v.lang === 'id-ID');
                if (idVoices.length > 0) {
                    utterance.voice = idVoices.find(v => v.name.toLowerCase().includes('female')) || idVoices[0];
                }
                
                window.speechSynthesis.speak(utterance);
            }, 1500);
        }
    };

    useEffect(() => {
        const fetchQueue = () => {
            const dataStr = localStorage.getItem('studio_queue');
            if (dataStr) {
                try {
                    const parsed = JSON.parse(dataStr);
                    // Get date from URL or use today
                    const urlParams = new URLSearchParams(window.location.search);
                    const queryDate = urlParams.get('date');
                    const todayStr = queryDate || new Date().toISOString().substring(0, 10);
                    
                    const todaysQueue = parsed.filter(item => item.date === todayStr);
                    setQueueData(todaysQueue);
                } catch (e) {
                    console.error("Failed to parse queue data");
                }
            } else {
                setQueueData([]);
            }
        };

        fetchQueue();
        
        // Listen to storage events (if changed in another tab)
        const handleStorage = (e) => {
            if (e.key === 'studio_queue') {
                fetchQueue();
            }
        };
        window.addEventListener('storage', handleStorage);

        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setSyncTimer(prev => {
                if (prev <= 1) {
                    fetchQueue();
                    return 6;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const formatDate = (date) => {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const mapRoomKey = (name) => {
        if (!name) return '';
        const t = name.toLowerCase().trim();
        if (t.includes('studio white') || t.includes('limbo') || t.includes('room a') || t.includes('room 1')) return 'limbo';
        if (t.includes('luxury') || t.includes('room b') || t.includes('room 2')) return 'luxury';
        if (t.includes('colorful') || t.includes('modern') || t.includes('room c') || t.includes('room 3')) return 'modern';
        if (t.includes('classic') || t.includes('abstrak') || t.includes('room d') || t.includes('room 4')) return 'abstrak';
        if (t.includes('outdoor') || t.includes('garden') || t.includes('custom') || t.includes('room e') || t.includes('room 5')) return 'custom';
        return t;
    };

    const getRoomQueues = (roomId) => {
        return queueData.filter(q => mapRoomKey(q.room) === mapRoomKey(roomId)).sort((a, b) => a.jam.localeCompare(b.jam));
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans p-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">18Studio Queue</h1>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1">Antrian Sesi Pemotretan Studio Lapanbelas</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {!audioEnabled && (
                        <button 
                            onClick={() => setAudioEnabled(true)} 
                            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 h-[60px]"
                        >
                            <span>🔊</span> Aktifkan Audio
                        </button>
                    )}
                    <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 flex flex-col items-end">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Tanggal Antrian</span>
                        <span className="text-sm font-bold">{formatDate(currentTime)}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 flex flex-col items-end min-w-[140px]">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Sinkronisasi Otomatis</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-sm font-bold text-emerald-400">{syncTimer}s</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Rooms Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
                {roomsData.map(room => {
                    const queues = getRoomQueues(room.id);
                    const activeQueue = queues.find(q => q.status === 'Aktif');
                    const pendingQueues = queues.filter(q => q.status === 'Menunggu');
                    const finishedQueues = queues.filter(q => q.status === 'Selesai');

                    let activeTimerText = "";
                    if (activeQueue && activeQueue.activeSince) {
                        const elapsedMs = Date.now() - activeQueue.activeSince;
                        const elapsedMin = Math.floor(elapsedMs / 60000);
                        const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
                        const durasi = activeQueue.durasi || 45;
                        const remainingMin = Math.max(0, durasi - elapsedMin - 1);
                        const remainingSec = 59 - elapsedSec;
                        
                        // Check for 1 minute warning
                        const totalSecondsRemaining = Math.max(0, Math.floor(((activeQueue.activeSince + durasi * 60000) - Date.now()) / 1000));
                        if (totalSecondsRemaining <= 60 && totalSecondsRemaining > 55) {
                            if (!announced1Min.current.has(activeQueue.id)) {
                                announced1Min.current.add(activeQueue.id);
                                playAnnouncement(room.name);
                            }
                        }

                        if (elapsedMin >= durasi) {
                            activeTimerText = "Waktu Habis";
                        } else {
                            activeTimerText = `${remainingMin}:${remainingSec < 10 ? '0' : ''}${Math.max(0, remainingSec)}`;
                        }
                    }

                    return (
                        <div key={room.id} className="flex flex-col border-r border-white/5 last:border-0 pr-6 last:pr-0">
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{room.desc}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-${room.color}-500/20 text-${room.color}-400 border border-${room.color}-500/30`}>
                                        {room.badge}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold">{room.name}</h2>
                            </div>

                            {/* Status Card */}
                            <div className={`rounded-2xl p-6 mb-8 flex flex-col items-center justify-center text-center border shadow-lg ${
                                activeQueue 
                                    ? (activeTimerText === "Waktu Habis" ? 'bg-red-500/10 border-red-500/30 shadow-red-500/10' : 'bg-blue-500/10 border-blue-500/30 shadow-blue-500/10')
                                    : pendingQueues.length > 0 
                                        ? 'bg-yellow-500/5 border-yellow-500/20 shadow-yellow-500/5' 
                                        : 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'
                            }`}>
                                {activeQueue ? (
                                    <>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${activeTimerText === "Waktu Habis" ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                            <svg className={`w-5 h-5 ${activeTimerText !== "Waktu Habis" ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        </div>
                                        <h3 className={`font-bold text-lg mb-1 ${activeTimerText === "Waktu Habis" ? 'text-red-500' : 'text-blue-400'}`}>Sedang Pemotretan</h3>
                                        <p className={`text-xs ${activeTimerText === "Waktu Habis" ? 'text-red-400/80' : 'text-blue-300/70'}`}>{activeQueue.name}</p>
                                        {activeTimerText && (
                                            <div className={`mt-3 font-mono font-bold text-sm px-4 py-1.5 rounded-full border ${activeTimerText === "Waktu Habis" ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                ⏱ {activeTimerText}
                                            </div>
                                        )}
                                    </>
                                ) : pendingQueues.length > 0 ? (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mb-3">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </div>
                                        <h3 className="text-yellow-500 font-bold text-lg mb-1">Menunggu Sesi Dimulai</h3>
                                        <p className="text-xs text-yellow-500/60">Sedang mempersiapkan background...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <h3 className="text-emerald-400 font-bold text-lg mb-1">Studio Kosong</h3>
                                        <p className="text-xs text-emerald-400/60">Tersedia untuk disewa</p>
                                    </>
                                )}
                            </div>

                            {/* Queue & Finished Lists */}
                            <div className="grid grid-cols-2 gap-3 flex-1">
                                {/* Kiri: Antrian */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <div className="w-1.5 h-1.5 rounded bg-yellow-500/50"></div>
                                        <h4 className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Antrian</h4>
                                    </div>
                                    {pendingQueues.length > 0 ? (
                                        <div className="space-y-2">
                                            {pendingQueues.map((q, i) => (
                                                <div key={q.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-white text-[10px] truncate">{q.name}</h5>
                                                        <p className="text-[8px] text-gray-400 truncate font-mono">{q.jam}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-white/10 rounded-lg p-2.5 text-center">
                                            <p className="text-[9px] text-gray-500 italic">Kosong</p>
                                        </div>
                                    )}
                                </div>

                                {/* Kanan: Selesai */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <div className="w-1.5 h-1.5 rounded bg-emerald-500/50"></div>
                                        <h4 className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Selesai</h4>
                                    </div>
                                    {finishedQueues.length > 0 ? (
                                        <div className="space-y-2">
                                            {finishedQueues.map((q, i) => (
                                                <div key={q.id} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 flex items-center gap-2 opacity-70">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        ✓
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-emerald-400 text-[10px] truncate">{q.name}</h5>
                                                        <p className="text-[8px] text-emerald-500/60 truncate font-mono">{q.jam}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-white/10 rounded-lg p-2.5 text-center">
                                            <p className="text-[9px] text-gray-500 italic">Kosong</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<QueueApp />);
