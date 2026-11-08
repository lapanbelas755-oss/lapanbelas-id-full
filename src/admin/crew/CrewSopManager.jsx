import React from "react";
import {
    supabase,
    adminFetch,
    formatDateUI,
    formatRupiah,
    parseNotesField,
    getOrderDivisions,
    normalizePhoneID,
    SOP_MOMENTS,
    detectJobMoments,
    filterSopTemplatesForJob
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function extractCrewCandidates(notes, appt = {}) {
    const candidates = [];
    if (!notes) return candidates;

    const getTag = (pattern) => {
        const m = notes.match(pattern);
        return m ? m[1].trim() : null;
    };

    const customCategory = getTag(/\[KATEGORI_ACARA\]:\s*([^\n]+)/i);

    const fgAkad = getTag(/\[PHOTOGRAPHER_AKAD\]:\s*([^\n]+)/i);
    const fgResepsi = getTag(/\[PHOTOGRAPHER_RESEPSI\]:\s*([^\n]+)/i);
    const vgAkad = getTag(/\[VIDEOGRAPHER_AKAD\]:\s*([^\n]+)/i);
    const vgResepsi = getTag(/\[VIDEOGRAPHER_RESEPSI\]:\s*([^\n]+)/i);

    // 1. Full Day Fotografer
    const fg = getTag(/\[PHOTOGRAPHER\]:\s*([^\n]+)/i);
    if (fg && !fgAkad && !fgResepsi) {
        candidates.push({
            role: 'Fotografer',
            raw: fg,
            sessionKey: 'full',
            session: getTag(/\[PHOTOGRAPHER_SESSION\]:\s*([^\n]+)/i) || 'Full Day (Akad + Resepsi)',
            fee: getTag(/\[PHOTOGRAPHER_FEE\]:\s*([^\n]+)/i),
            customCategory,
            eventDate: appt.event_date,
            timeInfo: appt.jam_akad ? (appt.jam_resepsi ? `Akad: ${appt.jam_akad} | Resepsi: ${appt.jam_resepsi}` : appt.jam_akad) : (appt.jam_resepsi || '')
        });
    }

    // 2. Full Day Videografer
    const vg = getTag(/\[VIDEOGRAPHER\]:\s*([^\n]+)/i);
    if (vg && !vgAkad && !vgResepsi) {
        candidates.push({
            role: 'Videografer',
            raw: vg,
            sessionKey: 'full',
            session: getTag(/\[VIDEOGRAPHER_SESSION\]:\s*([^\n]+)/i) || 'Full Day (Akad + Resepsi)',
            fee: getTag(/\[VIDEOGRAPHER_FEE\]:\s*([^\n]+)/i),
            customCategory,
            eventDate: appt.event_date,
            timeInfo: appt.jam_akad ? (appt.jam_resepsi ? `Akad: ${appt.jam_akad} | Resepsi: ${appt.jam_resepsi}` : appt.jam_akad) : (appt.jam_resepsi || '')
        });
    }

    // 3. Split: Fotografer Akad
    if (fgAkad) {
        candidates.push({
            role: 'Fotografer',
            raw: fgAkad,
            sessionKey: 'akad',
            session: getTag(/\[PHOTOGRAPHER_AKAD_SESSION\]:\s*([^\n]+)/i) || 'Akad Saja',
            fee: getTag(/\[PHOTOGRAPHER_AKAD_FEE\]:\s*([^\n]+)/i),
            customCategory,
            eventDate: appt.event_date,
            timeInfo: appt.jam_akad ? `Akad: ${appt.jam_akad}` : ''
        });
    }

    // 4. Split: Fotografer Resepsi
    if (fgResepsi) {
        candidates.push({
            role: 'Fotografer',
            raw: fgResepsi,
            sessionKey: 'resepsi',
            session: getTag(/\[PHOTOGRAPHER_RESEPSI_SESSION\]:\s*([^\n]+)/i) || 'Resepsi Saja',
            fee: getTag(/\[PHOTOGRAPHER_RESEPSI_FEE\]:\s*([^\n]+)/i),
            customCategory,
            eventDate: appt.resepsi_date || appt.event_date,
            timeInfo: appt.jam_resepsi ? `Resepsi: ${appt.jam_resepsi}` : ''
        });
    }

    // 5. Split: Videografer Akad
    if (vgAkad) {
        candidates.push({
            role: 'Videografer',
            raw: vgAkad,
            sessionKey: 'akad',
            session: getTag(/\[VIDEOGRAPHER_AKAD_SESSION\]:\s*([^\n]+)/i) || 'Akad Saja',
            fee: getTag(/\[VIDEOGRAPHER_AKAD_FEE\]:\s*([^\n]+)/i),
            customCategory,
            eventDate: appt.event_date,
            timeInfo: appt.jam_akad ? `Akad: ${appt.jam_akad}` : ''
        });
    }

    // 6. Split: Videografer Resepsi
    if (vgResepsi) {
        candidates.push({
            role: 'Videografer',
            raw: vgResepsi,
            sessionKey: 'resepsi',
            session: getTag(/\[VIDEOGRAPHER_RESEPSI_SESSION\]:\s*([^\n]+)/i) || 'Resepsi Saja',
            fee: getTag(/\[VIDEOGRAPHER_RESEPSI_FEE\]:\s*([^\n]+)/i),
            customCategory,
            eventDate: appt.resepsi_date || appt.event_date,
            timeInfo: appt.jam_resepsi ? `Resepsi: ${appt.jam_resepsi}` : ''
        });
    }

    return candidates;
}

function CrewSopManager({ adminFetch, onShowToast, crewList = [], division = 'all', initialMode = 'monitoring', hideModeSwitch = false }) {
    const [subMode, setSubMode] = React.useState(initialMode); // 'monitoring' | 'templates'
    const [events, setEvents] = React.useState([]);
    const [assignments, setAssignments] = React.useState([]);
    const [templates, setTemplates] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQ, setSearchQ] = React.useState('');
    const [selectedJobDetail, setSelectedJobDetail] = React.useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = React.useState(false);
    const [selectedMomentFilter, setSelectedMomentFilter] = React.useState('all_filter');
    const [newTemplateText, setNewTemplateText] = React.useState('');
    const [newTemplateImage, setNewTemplateImage] = React.useState('');
    const [previewImage, setPreviewImage] = React.useState(null);
    const [newTemplatePhase, setNewTemplatePhase] = React.useState('on');
    const [newTemplateRole, setNewTemplateRole] = React.useState('all');
    const [newTemplateMoment, setNewTemplateMoment] = React.useState('all');
    const [editingTemplate, setEditingTemplate] = React.useState(null);

    // State for Custom Client Request in Job Detail Modal
    const [customSopText, setCustomSopText] = React.useState('');
    const [customSopPhase, setCustomSopPhase] = React.useState('on');
    const [isSavingCustomSop, setIsSavingCustomSop] = React.useState(false);

    const defaultTemplates = [
        // --- UMUM (SEMUA ACARA) ---
        { id: 'pre_battery', phase: 'pre', moment: 'all', text: 'Baterai kamera, flash & lighting terisi 100% (bawa cadangan min 2-3 unit)', role: 'all', image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80' },
        { id: 'pre_sdcard', phase: 'pre', moment: 'all', text: 'Memory card sudah diformat & speed class terverifikasi (bebas file lama)', role: 'all' },
        { id: 'pre_clean', phase: 'pre', moment: 'all', text: 'Sensor kamera & optik lensa sudah dibersihkan (bebas debu/jamur)', role: 'all' },
        { id: 'pre_rundown', phase: 'pre', moment: 'all', text: 'Pahami jam acara, lokasi venue, serta kontak pengantin/PIC', role: 'all' },
        { id: 'pre_dresscode', phase: 'pre', moment: 'all', text: 'Dresscode seragam rapi & bersepatu sesuai standar Lapanbelas ID', role: 'all', image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80' },
        { id: 'on_standby', phase: 'on', moment: 'all', text: 'Tiba di lokasi standby minimal 45-60 menit sebelum acara dimulai', role: 'all' },
        { id: 'on_checkin', phase: 'on', moment: 'all', text: 'Presensi kehadiran (PAP & GPS) di lokasi via tombol portal kru', role: 'all' },
        { id: 'post_count', phase: 'post', moment: 'all', text: 'Verifikasi jumlah file RAW / durasi klip video tidak ada yang terhapus', role: 'all' },
        { id: 'post_backup', phase: 'post', moment: 'all', text: 'Backup file RAW ke storage server / Google Drive Lapanbelas ID', role: 'all' },
        { id: 'post_verify', phase: 'post', moment: 'all', text: 'Verifikasi file dapat dibuka sempurna & tidak corrupt sebelum format kartu', role: 'all' },
        { id: 'post_submit', phase: 'post', moment: 'all', text: 'Setor link drive hasil dokumentasi di portal kru untuk klaim honor', role: 'all' },

        // --- MOMEN AKAD NIKAH ---
        { id: 'akad_detail', phase: 'on', moment: 'akad', text: 'Detail shot: Cincin nikah, kotak mahar, buku nikah, seserahan & dekorasi akad', role: 'all', image_url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&auto=format&fit=crop&q=80' },
        { id: 'akad_prep', phase: 'on', moment: 'akad', text: 'Preparation: Makeup touch-up pengantin, pasang ronce melati/veil & doa bersama', role: 'all' },
        { id: 'akad_ijab', phase: 'on', moment: 'akad', text: 'Momen sakral: Ijab kabul penghulu, jabat tangan wali, pembacaan ta\'lik & ketukan sah', role: 'all', image_url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=80' },
        { id: 'akad_cincin', phase: 'on', moment: 'akad', text: 'Pemasangan cincin di jari manis pengantin & pose pamer buku nikah/mahar', role: 'all' },
        { id: 'akad_sungkem', phase: 'on', moment: 'akad', text: 'Sungkeman haru kedua pengantin ke orang tua inti (tangis, pelukan, restu)', role: 'all' },
        { id: 'akad_family', phase: 'on', moment: 'akad', text: 'Foto bersama formasi keluarga inti kedua belah pihak & saksi di area akad', role: 'all', image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80' },

        // --- MOMEN RESEPSI ---
        { id: 'resepsi_kirab', phase: 'on', moment: 'resepsi', text: 'Kirab pengantin / grand entrance masuk ballroom/pelaminan dengan langkah teratur', role: 'all' },
        { id: 'resepsi_stage', phase: 'on', moment: 'resepsi', text: 'Foto panggung pelaminan: Pengantin berdua aesthetic & formasi keluarga besar bergantian', role: 'all', image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80' },
        { id: 'resepsi_toss', phase: 'on', moment: 'resepsi', text: 'Momen lempar hand bouquet / wedding toss / games bersama sahabat & tamu', role: 'all' },
        { id: 'resepsi_vip', phase: 'on', moment: 'resepsi', text: 'Candid interaksi ucapan selamat dari tamu VIP, relasi, dan kerabat di pelaminan', role: 'all' },

        // --- MOMEN TASYAKURAN / AQIQAH ---
        { id: 'tasya_doa', phase: 'on', moment: 'tasyakuran', text: 'Pembacaan doa bersama, lantunan shalawat/marhaban, dan tausiyah berkah', role: 'all' },
        { id: 'tasya_prosesi', phase: 'on', moment: 'tasyakuran', text: 'Prosesi potong tumpeng berkah atau simbolis pencukuran rambut aqiqah', role: 'all' },
        { id: 'tasya_family', phase: 'on', moment: 'tasyakuran', text: 'Foto keluarga inti bersama anak/bayi & ramah tamah bersama tamu undangan', role: 'all' },

        // --- MOMEN ENGAGEMENT / LAMARAN ---
        { id: 'eng_detail', phase: 'on', moment: 'engagement', text: 'Detail seserahan, kotak cincin lamaran, dekorasi backdrop & busana senada', role: 'all' },
        { id: 'eng_prosesi', phase: 'on', moment: 'engagement', text: 'Prosesi perkenalan keluarga, penyampaian maksud lamaran & penyematan cincin tunangan', role: 'all' },
        { id: 'eng_couple', phase: 'on', moment: 'engagement', text: 'Foto berdua pasangan calon pengantin (romantis & elegan) serta foto keluarga besar', role: 'all' },

        // --- MOMEN PREWEDDING ---
        { id: 'prewed_wardrobe', phase: 'on', moment: 'prewedding', text: 'Detail wardrobe outfit, aksesoris, sepatu, dan properti pendukung prewedding', role: 'all' },
        { id: 'prewed_concept', phase: 'on', moment: 'prewedding', text: 'Pengambilan shot intim, romantic couple poses, dan cinematic movement sesuai konsep', role: 'all' },
        { id: 'prewed_golden', phase: 'on', moment: 'prewedding', text: 'Pemanfaatan golden hour matahari / lighting ambience dramatis sesuai moodboard', role: 'all' },

        // --- MOMEN WISUDA ---
        { id: 'wisuda_detail', phase: 'on', moment: 'wisuda', text: 'Detail toga, kalung medali kelulusan, selempang gelar, & map ijazah', role: 'all' },
        { id: 'wisuda_lempar', phase: 'on', moment: 'wisuda', text: 'Momen lempar topi toga ke udara ceria bersama rekan-rekan wisudawan', role: 'all' },
        { id: 'wisuda_family', phase: 'on', moment: 'wisuda', text: 'Foto formal & candid haru wisudawan bersama kedua orang tua tercinta', role: 'all' },

        // --- MOMEN STUDIO PHOTOSHOOT ---
        { id: 'studio_lighting', phase: 'on', moment: 'studio', text: 'Setting lighting key/fill/rim & background backdrop studio sesuai tema pilihan klien', role: 'all' },
        { id: 'studio_pose', phase: 'on', moment: 'studio', text: 'Arahkan pose ekspresi variatif (formal tegap, semi-formal ceria, dan candid santai)', role: 'all' },
        { id: 'studio_review', phase: 'on', moment: 'studio', text: 'Review kilat hasil jepretan di layar preview bersama klien sebelum sesi diakhiri', role: 'all' }
    ];

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            // 1. Fetch templates: Cek database Supabase terlebih dahulu agar selalu realtime & tidak kembali ke default
            try {
                const { data: cur } = await supabase.from('settings').select('value').eq('key', 'crew_sop_templates').maybeSingle();
                if (cur && cur.value) {
                    const parsed = JSON.parse(cur.value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setTemplates(parsed);
                    } else {
                        setTemplates(defaultTemplates);
                    }
                } else {
                    const tRes = await fetcher('/api/crew/sop-templates');
                    const tData = await tRes.json();
                    if (tData && Array.isArray(tData.templates) && tData.templates.length > 0) {
                        setTemplates(tData.templates);
                    } else {
                        setTemplates(defaultTemplates);
                    }
                }
            } catch (e) {
                console.warn('[Fetch SOP templates error, fallback to API]', e);
                try {
                    const tRes = await fetcher('/api/crew/sop-templates');
                    const tData = await tRes.json();
                    if (tData && Array.isArray(tData.templates)) {
                        setTemplates(tData.templates);
                    } else {
                        setTemplates(defaultTemplates);
                    }
                } catch(err2) {
                    setTemplates(defaultTemplates);
                }
            }

            // 2. Fetch appointments (filter to photo/video documentation divisions only)
            const [{ data: appts }, { data: pkgsData }] = await Promise.all([
                supabase.from('appointments').select('*').order('event_date', { ascending: false }).limit(100),
                supabase.from('packages').select('*')
            ]);
            const pkgMap = {};
            (pkgsData || []).forEach(p => { pkgMap[p.title] = p; });

            const validEvents = (appts || []).filter(appt => {
                if (appt.status === 'Dibatalkan' || appt.status === 'Batal') return false;
                const pkg = pkgMap[appt.package_name];
                const divs = getOrderDivisions(appt, pkg);
                const isLapanbelas = divs.includes('lapanbelas.id');
                const isStudio = divs.includes('Studio Lapanbelas') || (appt.package_name || '').toLowerCase().includes('studio');
                if (!isLapanbelas && !isStudio) return false;
                if (division === 'lapanbelas.id') return isLapanbelas && !isStudio;
                if (division === 'studio') return isStudio;
                return true;
            });
            setEvents(validEvents);

            // 3. Fetch stored assignments (merge db rows with settings for complete SOP checklist state)
            const { data: asgs } = await supabase.from('crew_job_assignments').select('*');
            let settingsList = [];
            try {
                const { data: cur } = await supabase.from('settings').select('value').eq('key', 'crew_job_assignments').maybeSingle();
                if (cur?.value) {
                    try { settingsList = JSON.parse(cur.value) || []; } catch(e) {}
                }
            } catch (e) {}

            let list = (asgs || []).map(dbRow => {
                const extra = settingsList.find(s => 
                    s.appointment_id === dbRow.appointment_id && 
                    (s.crew_phone === dbRow.crew_phone || (dbRow.crew_name && s.crew_name === dbRow.crew_name))
                );
                return extra ? { 
                    ...extra, 
                    ...dbRow, 
                    sop_checklist: extra.sop_checklist || dbRow.sop_checklist || null,
                    custom_sop_items: extra.custom_sop_items || dbRow.custom_sop_items || []
                } : dbRow;
            });
            if (list.length === 0) list = settingsList;
            setAssignments(list);
        } catch (e) {
            console.error('Fetch SOP Error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();

        // Realtime Subscription: Update master SOP secara live jika ada perubahan dari admin mana pun
        const channel = supabase
            .channel('realtime_crew_sop_templates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'settings',
                filter: 'key=eq.crew_sop_templates'
            }, (payload) => {
                if (payload.new && payload.new.value) {
                    try {
                        const parsed = JSON.parse(payload.new.value);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setTemplates(parsed);
                        }
                    } catch (err) {}
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [division]);

    const handleSaveTemplates = async (newTemplates) => {
        setIsSavingTemplate(true);
        // 1. Optimistic update langsung di UI
        setTemplates(newTemplates);

        try {
            // 2. Simpan langsung ke Supabase settings table (Realtime trigger)
            const { error: sbError } = await supabase.from('settings').upsert({
                key: 'crew_sop_templates',
                value: JSON.stringify(newTemplates),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            if (sbError) {
                console.warn('[Supabase save error, fallback to API]', sbError);
            }

            // 3. Simpan juga melalui backend API
            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/sop-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templates: newTemplates })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                onShowToast?.('Template SOP berhasil disimpan secara realtime! ✅', 'success');
            } else {
                throw new Error(data.error || 'Gagal menyimpan ke server');
            }
        } catch (e) {
            onShowToast?.('Error: ' + e.message, 'error');
            // Re-fetch jika terjadi error
            fetchData();
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleAddTemplate = () => {
        if (!newTemplateText.trim()) return;
        const newItem = {
            id: `sop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            phase: newTemplatePhase,
            moment: newTemplateMoment,
            text: newTemplateText.trim(),
            role: newTemplateRole,
            image_url: newTemplateImage.trim() || null
        };
        const updated = [...templates, newItem];
        setNewTemplateText('');
        setNewTemplateImage('');
        handleSaveTemplates(updated);
    };

    const handleDeleteTemplate = (id) => {
        const updated = templates.filter(t => t.id !== id);
        handleSaveTemplates(updated);
    };

    const handleUpdateTemplate = () => {
        if (!editingTemplate || !editingTemplate.text?.trim()) return;
        const updated = templates.map(t => t.id === editingTemplate.id ? {
            ...t,
            moment: editingTemplate.moment || 'all',
            phase: editingTemplate.phase || 'on',
            role: editingTemplate.role || 'all',
            text: editingTemplate.text.trim(),
            image_url: editingTemplate.image_url ? editingTemplate.image_url.trim() : null
        } : t);
        setEditingTemplate(null);
        handleSaveTemplates(updated);
    };

    // Client Footage Request (Job-Specific Custom SOP)
    const handleAddCustomJobSop = async () => {
        if (!selectedJobDetail || !customSopText.trim()) return;
        setIsSavingCustomSop(true);
        try {
            const newItem = {
                id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                phase: customSopPhase,
                moment: 'custom',
                text: customSopText.trim(),
                role: 'all',
                is_custom: true,
                created_at: new Date().toISOString()
            };

            const existingCustom = selectedJobDetail.customSopItems || [];
            const updatedCustom = [...existingCustom, newItem];

            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/save-custom-sop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: selectedJobDetail.appointment.id,
                    crewPhone: selectedJobDetail.crewPhone,
                    role: selectedJobDetail.role,
                    sessionKey: selectedJobDetail.sessionKey,
                    items: updatedCustom
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAssignments(prev => {
                    const matchIdx = prev.findIndex(a => 
                        a.appointment_id === selectedJobDetail.appointment.id && 
                        normalizePhoneID(a.crew_phone) === normalizePhoneID(selectedJobDetail.crewPhone)
                    );
                    if (matchIdx >= 0) {
                        const copy = [...prev];
                        copy[matchIdx] = { ...copy[matchIdx], custom_sop_items: updatedCustom };
                        return copy;
                    }
                    return [...prev, {
                        appointment_id: selectedJobDetail.appointment.id,
                        crew_phone: selectedJobDetail.crewPhone,
                        role: selectedJobDetail.role,
                        session_key: selectedJobDetail.sessionKey,
                        custom_sop_items: updatedCustom
                    }];
                });

                setSelectedJobDetail(prev => ({
                    ...prev,
                    customSopItems: updatedCustom,
                    relevantTemplates: [...(prev.relevantTemplates || []), newItem]
                }));
                setCustomSopText('');
                onShowToast?.('Request footage klien berhasil ditambahkan!', 'success');
            } else {
                throw new Error(data.error || 'Gagal menyimpan');
            }
        } catch (e) {
            onShowToast?.('Error: ' + e.message, 'error');
        } finally {
            setIsSavingCustomSop(false);
        }
    };

    const handleDeleteCustomJobSop = async (itemId) => {
        if (!selectedJobDetail) return;
        setIsSavingCustomSop(true);
        try {
            const existingCustom = selectedJobDetail.customSopItems || [];
            const updatedCustom = existingCustom.filter(i => i.id !== itemId);

            const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
            const res = await fetcher('/api/crew/save-custom-sop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: selectedJobDetail.appointment.id,
                    crewPhone: selectedJobDetail.crewPhone,
                    role: selectedJobDetail.role,
                    sessionKey: selectedJobDetail.sessionKey,
                    items: updatedCustom
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAssignments(prev => prev.map(a => 
                    (a.appointment_id === selectedJobDetail.appointment.id && normalizePhoneID(a.crew_phone) === normalizePhoneID(selectedJobDetail.crewPhone))
                        ? { ...a, custom_sop_items: updatedCustom }
                        : a
                ));

                setSelectedJobDetail(prev => ({
                    ...prev,
                    customSopItems: updatedCustom,
                    relevantTemplates: (prev.relevantTemplates || []).filter(i => i.id !== itemId)
                }));
                onShowToast?.('Request footage berhasil dihapus', 'info');
            } else {
                throw new Error(data.error || 'Gagal menghapus');
            }
        } catch (e) {
            onShowToast?.('Error: ' + e.message, 'error');
        } finally {
            setIsSavingCustomSop(false);
        }
    };

    // Build flattened job list for monitoring
    const monitoringJobs = React.useMemo(() => {
        try {
            const result = [];
            (events || []).forEach(appt => {
                const candidates = extractCrewCandidates(appt.additional_notes || '', appt);
                candidates.forEach(cand => {
                    const raw = cand.raw || '';
                    const pMatch = raw.match(/\(([^)]+)\)/);
                    const phone = pMatch ? pMatch[1].trim() : '';
                    const name = raw.replace(/\([^)]+\)/, '').trim();

                    const asg = (assignments || []).find(a => 
                        a.appointment_id === appt.id && 
                        (!phone || normalizePhoneID(a.crew_phone) === normalizePhoneID(phone) || (a.crew_name && a.crew_name.toLowerCase() === name.toLowerCase()))
                    );

                    let rawChecklist = asg?.sop_checklist;
                    let checklistArray = [];
                    if (Array.isArray(rawChecklist)) {
                        checklistArray = rawChecklist;
                    } else if (rawChecklist && typeof rawChecklist === 'object') {
                        checklistArray = Object.keys(rawChecklist).map(id => ({ id, checked: !!rawChecklist[id] }));
                    }

                    const isChecked = (itemId) => {
                        const it = checklistArray.find(c => c.id === itemId);
                        return !!it?.checked;
                    };

                    const jobObj = {
                        role: cand.role,
                        session: cand.session,
                        session_key: cand.sessionKey,
                        package_name: appt.package_name,
                        category: cand.customCategory,
                        notes: appt.additional_notes,
                        custom_sop_items: asg?.custom_sop_items || []
                    };

                    const relevantTemplates = filterSopTemplatesForJob(templates, jobObj);
                    const jobMoments = detectJobMoments(jobObj);

                    const preTemplates = relevantTemplates.filter(i => i.phase === 'pre');
                    const preDone = preTemplates.filter(i => isChecked(i.id)).length;
                    const preTotal = preTemplates.length;

                    const onTemplates = relevantTemplates.filter(i => i.phase === 'on');
                    const onDone = onTemplates.filter(i => isChecked(i.id)).length;
                    const onTotal = onTemplates.length;

                    const postTemplates = relevantTemplates.filter(i => i.phase === 'post');
                    const postDone = postTemplates.filter(i => isChecked(i.id)).length;
                    const postTotal = postTemplates.length;

                    const totalDone = relevantTemplates.filter(i => isChecked(i.id)).length;
                    const totalTarget = relevantTemplates.length;
                    const pct = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

                    result.push({
                        key: `${appt.id}_${name}_${cand.role}_${cand.sessionKey || ''}`,
                        appointment: appt,
                        crewName: name || asg?.crew_name || 'Kru Belum Assign',
                        crewPhone: phone || asg?.crew_phone || '',
                        role: cand.role,
                        session: cand.session,
                        sessionKey: cand.sessionKey,
                        assignment: asg,
                        checklist: checklistArray,
                        jobMoments,
                        relevantTemplates,
                        customSopItems: asg?.custom_sop_items || [],
                        preDone,
                        preTotal,
                        onDone,
                        onTotal,
                        postDone,
                        postTotal,
                        totalDone,
                        totalTarget,
                        pct,
                        hasCheckin: !!(asg?.checkin_at || asg?.checkin_photo_url),
                        hasFile: !!(asg?.submission_link || asg?.submitted_at)
                    });
                });
            });

            if (!searchQ) return result;
            const q = searchQ.toLowerCase();
            return result.filter(r => 
                (r.appointment.client_name || '').toLowerCase().includes(q) ||
                r.crewName.toLowerCase().includes(q) ||
                (r.appointment.package_name || '').toLowerCase().includes(q)
            );
        } catch (err) {
            console.error('[monitoringJobs calculation error]', err);
            return [];
        }
    }, [events, assignments, templates, searchQ]);

    return (
        <div className="space-y-6">
            {/* Sub-Mode Switcher */}
            {!hideModeSwitch && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => setSubMode('monitoring')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                            subMode === 'monitoring'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>📊</span> Monitoring Kepatuhan Hari-H ({monitoringJobs.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubMode('templates')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                            subMode === 'templates'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>⚙️</span> Master Standar Template SOP ({templates.length})
                    </button>
                </div>

                {subMode === 'monitoring' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Cari acara / nama kru..."
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 w-full sm:w-60"
                        />
                    </div>
                )}
            </div>
            )}

            {/* TAB 1: MONITORING KEPATUHAN KRU */}
            {subMode === 'monitoring' && (
                <div className="space-y-4">
                    {/* Stats Header */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="glass-panel p-4 rounded-xl border border-white/10">
                            <span className="text-gray-400 text-xs block mb-1">Total Penugasan Kru</span>
                            <p className="text-xl font-bold text-white">{monitoringJobs.length}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                            <span className="text-blue-300 text-xs block mb-1">Pre-Event Siap (H-1)</span>
                            <p className="text-xl font-bold text-blue-400 font-mono">
                                {monitoringJobs.filter(j => j.preDone === j.preTotal && j.preTotal > 0).length} Kru
                            </p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                            <span className="text-amber-300 text-xs block mb-1">Sudah Presensi PAP Hari H</span>
                            <p className="text-xl font-bold text-amber-400 font-mono">
                                {monitoringJobs.filter(j => j.hasCheckin).length} Kru
                            </p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                            <span className="text-emerald-300 text-xs block mb-1">SOP Lengkap 100%</span>
                            <p className="text-xl font-bold text-emerald-400 font-mono">
                                {monitoringJobs.filter(j => j.pct === 100).length} Kru
                            </p>
                        </div>
                    </div>

                    {/* Monitoring Table */}
                    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider bg-white/5">
                                        <th className="py-3 px-3.5">Tanggal Acara</th>
                                        <th className="py-3 px-3">Klien & Paket</th>
                                        <th className="py-3 px-3">Kru & Peran</th>
                                        <th className="py-3 px-3 text-center">Pre-Event (H-1)</th>
                                        <th className="py-3 px-3 text-center">Hari-H</th>
                                        <th className="py-3 px-3 text-center">Pasca Acara</th>
                                        <th className="py-3 px-3 text-center">Total SOP</th>
                                        <th className="py-3 px-3 text-center">Presensi PAP</th>
                                        <th className="py-3 px-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {monitoringJobs.map(job => (
                                        <tr key={job.key} className="hover:bg-white/5 transition">
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <span className="font-semibold text-white block">
                                                    {typeof formatDateUI === 'function' ? formatDateUI(job.appointment.event_date) : job.appointment.event_date}
                                                </span>
                                                <span className="text-[10px] text-gray-400 block mt-0.5">
                                                    Standby: {job.appointment.jam_akad || job.appointment.jam_resepsi || 'Sesuai Rundown'}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3">
                                                <span className="font-semibold text-white block truncate max-w-[150px]">
                                                    {job.appointment.client_name}
                                                </span>
                                                <span className="text-[10px] text-amber-300 block truncate max-w-[150px]">
                                                    {job.appointment.package_name}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white">{job.crewName}</span>
                                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300 uppercase">
                                                        {job.role}
                                                    </span>
                                                </div>
                                                {job.crewPhone && (
                                                    <a
                                                        href={`https://wa.me/${job.crewPhone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] text-emerald-400 hover:underline block mt-0.5"
                                                    >
                                                        WA: {job.crewPhone}
                                                    </a>
                                                )}
                                            </td>

                                            {/* Pre-Event Badge */}
                                            <td className="py-3 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    job.preDone === job.preTotal && job.preTotal > 0
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        : job.preDone > 0
                                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                            : 'bg-white/5 text-gray-500'
                                                }`}>
                                                    {job.preDone}/{job.preTotal}
                                                </span>
                                            </td>

                                            {/* Hari-H Badge */}
                                            <td className="py-3 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    job.onDone === job.onTotal && job.onTotal > 0
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        : job.onDone > 0
                                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                            : 'bg-white/5 text-gray-500'
                                                }`}>
                                                    {job.onDone}/{job.onTotal}
                                                </span>
                                            </td>

                                            {/* Pasca Acara Badge */}
                                            <td className="py-3 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    job.postDone === job.postTotal && job.postTotal > 0
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        : job.postDone > 0
                                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                            : 'bg-white/5 text-gray-500'
                                                }`}>
                                                    {job.postDone}/{job.postTotal}
                                                </span>
                                            </td>

                                            {/* Overall Completion Bar */}
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                <div className="w-16 mx-auto">
                                                    <span className={`text-[11px] font-bold ${job.pct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {job.pct}%
                                                    </span>
                                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-0.5">
                                                        <div
                                                            style={{ width: `${job.pct}%` }}
                                                            className={`h-full rounded-full ${job.pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Presensi PAP */}
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                {job.hasCheckin ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        ✓ Ready di Lokasi
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500">Belum Check-in</span>
                                                )}
                                            </td>

                                            {/* Detail Action */}
                                            <td className="py-3 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedJobDetail(job);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-medium transition"
                                                >
                                                    Detail SOP
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {monitoringJobs.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="py-10 text-center text-gray-500">
                                                Belum ada penugasan kru untuk acara mendatang.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MASTER TEMPLATE SOP */}
            {subMode === 'templates' && (
                <div className="space-y-6">
                    {/* Filter Momen SOP */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            type="button"
                            onClick={() => setSelectedMomentFilter('all_filter')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                                selectedMomentFilter === 'all_filter'
                                    ? 'bg-amber-500 text-black shadow'
                                    : 'bg-white/5 text-gray-400 hover:text-white'
                            }`}
                        >
                            ✨ Semua Momen ({templates.length})
                        </button>
                        {SOP_MOMENTS.map(m => {
                            const count = templates.filter(t => (t.moment || 'all') === m.id).length;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setSelectedMomentFilter(m.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                                        selectedMomentFilter === m.id
                                            ? 'bg-emerald-500 text-white shadow'
                                            : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>{m.icon}</span>
                                    <span>{m.label} ({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Add New Template Form */}
                    <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>+</span> Tambah Standar Checklist Baru
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-3">
                                <label className="text-[11px] text-gray-400 block mb-1">Momen Acara</label>
                                <select
                                    value={newTemplateMoment}
                                    onChange={(e) => setNewTemplateMoment(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                >
                                    {SOP_MOMENTS.map(m => (
                                        <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="text-[11px] text-gray-400 block mb-1">Fase Kerja</label>
                                <select
                                    value={newTemplatePhase}
                                    onChange={(e) => setNewTemplatePhase(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="pre">🔋 Pre-Event (H-1)</option>
                                    <option value="on">📸 On-Event (Hari-H)</option>
                                    <option value="post">💾 Pasca Acara (Handover)</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="text-[11px] text-gray-400 block mb-1">Target Peran (Role)</label>
                                <select
                                    value={newTemplateRole}
                                    onChange={(e) => setNewTemplateRole(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="all">Semua Peran (FG / VG)</option>
                                    <option value="fotografer">Khusus Fotografer (FG)</option>
                                    <option value="videografer">Khusus Videografer (VG)</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="text-[11px] text-gray-400 block mb-1">URL Foto Contoh <span className="text-gray-500">(Opsional)</span></label>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={newTemplateImage}
                                    onChange={(e) => setNewTemplateImage(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="sm:col-span-12 flex flex-col sm:flex-row gap-2 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-[11px] text-gray-400 block mb-1">Deskripsi Tugas SOP / Instruksi Footage</label>
                                    <input
                                        type="text"
                                        placeholder="Cth: Siapkan stabilizer / footage close-up cincin & buku nikah..."
                                        value={newTemplateText}
                                        onChange={(e) => setNewTemplateText(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddTemplate}
                                    disabled={!newTemplateText.trim() || isSavingTemplate}
                                    className="w-full sm:w-auto px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shrink-0"
                                >
                                    + Tambah SOP
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Template Items List by Phase */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { phase: 'pre', title: '🔋 Pre-Event (H-1)', desc: 'Persiapan gear, baterai, memory & koordinasi rundown' },
                            { phase: 'on', title: '📸 On-Event (Hari-H)', desc: 'Kehadiran tepat waktu & kelengkapan shot list per momen' },
                            { phase: 'post', title: '💾 Pasca Acara', desc: 'Backup file RAW, cek integritas & handover file' }
                        ].map(col => {
                            const phaseItems = templates.filter(t => {
                                if (t.phase !== col.phase) return false;
                                if (selectedMomentFilter === 'all_filter') return true;
                                return (t.moment || 'all') === selectedMomentFilter;
                            });
                            return (
                                <div key={col.phase} className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                                    <div>
                                        <div className="border-b border-white/10 pb-2 mb-3">
                                            <h4 className="text-sm font-bold text-white">{col.title}</h4>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{col.desc}</p>
                                        </div>

                                        <div className="space-y-2">
                                            {phaseItems.map(item => {
                                                const mInfo = SOP_MOMENTS.find(m => m.id === (item.moment || 'all'));
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-2.5 text-xs"
                                                    >
                                                        {item.image_url && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewImage({ url: item.image_url, title: item.text, phase: item.phase === 'pre' ? 'Pre-Event' : item.phase === 'on' ? 'Hari-H' : 'Pasca Acara' })}
                                                                className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/30 bg-black shrink-0 relative group hover:ring-2 hover:ring-amber-400 transition"
                                                                title="Klik untuk lihat contoh gambar"
                                                            >
                                                                <img
                                                                    src={item.image_url}
                                                                    alt={item.text}
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                                    <span className="text-[10px] text-white">🔍</span>
                                                                </div>
                                                            </button>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium inline-flex items-center gap-0.5">
                                                                    <span>{mInfo?.icon || '📌'}</span>
                                                                    <span>{mInfo?.label || item.moment}</span>
                                                                </span>
                                                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/10 text-gray-400 font-mono inline-block">
                                                                    {item.role || 'all'}
                                                                </span>
                                                                {item.image_url && (
                                                                    <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5">
                                                                        <span>🖼️</span> Contoh Ada
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-200 leading-snug">{item.text}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingTemplate({ ...item })}
                                                                className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-500/10 rounded transition"
                                                                title="Edit SOP"
                                                            >
                                                                <SvgIcon name="edit" className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTemplate(item.id)}
                                                                className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition"
                                                                title="Hapus SOP"
                                                            >
                                                                <SvgIcon name="trash-2" className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {phaseItems.length === 0 && (
                                                <p className="text-[11px] text-gray-500 italic py-4 text-center">Belum ada item untuk filter ini.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-white/10 mt-3 text-[11px] text-gray-500 text-right">
                                        Total: {phaseItems.length} Checklist
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* DETAIL MODAL: LIHAT CHECKLIST KRU PER EVENT & REQUEST KHUSUS KLIEN */}
            {isDetailModalOpen && selectedJobDetail && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
                    <div className="glass-panel border border-white/10 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4">
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <SvgIcon name="x" className="w-5 h-5" />
                        </button>

                        <div className="pb-3 border-b border-white/10">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                                    Checklist Kepatuhan SOP
                                </span>
                                {(selectedJobDetail.jobMoments || []).map(mId => {
                                    const mObj = SOP_MOMENTS.find(m => m.id === mId);
                                    return (
                                        <span key={mId} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                                            <span>{mObj?.icon || '💍'}</span>
                                            <span>{mObj?.label || mId}</span>
                                        </span>
                                    );
                                })}
                            </div>
                            <h3 className="text-base font-bold text-white">
                                {selectedJobDetail.appointment.client_name}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Kru: <strong className="text-white">{selectedJobDetail.crewName}</strong> ({selectedJobDetail.role}) • Sesi: <span className="text-amber-300">{selectedJobDetail.session}</span> • Paket: {selectedJobDetail.appointment.package_name}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Total Kepatuhan SOP Momen Ini:</span>
                                <span className="font-bold text-emerald-400">{selectedJobDetail.totalDone} / {selectedJobDetail.totalTarget} ({selectedJobDetail.pct}%)</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${selectedJobDetail.pct}%` }}
                                    className={`h-full rounded-full transition-all ${selectedJobDetail.pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                />
                            </div>
                        </div>

                        {/* FITUR REQUEST KHUSUS KLIEN (FOOTAGE TAMBAHAN) */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <span>✨</span> Request Khusus Klien (Footage Tambahan)
                                </h4>
                                <span className="text-[10px] text-amber-200/80 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                                    {(selectedJobDetail.customSopItems || []).length} Request
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-300 leading-snug">
                                Tambahkan permintaan footage kustom dari klien untuk acara ini. Otomatis tampil di portal HP kru dengan tanda khusus agar tidak terlewat.
                            </p>

                            {/* List of Custom Items */}
                            {Array.isArray(selectedJobDetail.customSopItems) && selectedJobDetail.customSopItems.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    {selectedJobDetail.customSopItems.map((cItem, cIdx) => (
                                        <div key={cItem.id || cIdx} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-black/40 border border-amber-500/20 text-xs">
                                            <div className="flex-1">
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold uppercase mr-1.5">
                                                    🎯 Request Klien
                                                </span>
                                                <span className="text-white font-medium">{cItem.text}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomSopText(cItem.text);
                                                        setCustomSopPhase(cItem.phase || 'on');
                                                        handleDeleteCustomJobSop(cItem.id);
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-500/10 rounded transition"
                                                    title="Edit Request Ini"
                                                >
                                                    <SvgIcon name="edit" className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCustomJobSop(cItem.id)}
                                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition"
                                                    title="Hapus Request Ini"
                                                >
                                                    <SvgIcon name="trash-2" className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Custom Request Form */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                <select
                                    value={customSopPhase}
                                    onChange={(e) => setCustomSopPhase(e.target.value)}
                                    className="bg-black/60 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none shrink-0"
                                >
                                    <option value="on">📸 Hari-H</option>
                                    <option value="pre">🔋 Pre-Event</option>
                                    <option value="post">💾 Pasca Acara</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Cth: Banyakin candid kakek nenek saat sungkeman..."
                                    value={customSopText}
                                    onChange={(e) => setCustomSopText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomJobSop(); } }}
                                    className="flex-1 bg-black/60 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white outline-none placeholder-gray-400 focus:border-amber-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomJobSop}
                                    disabled={!customSopText.trim() || isSavingCustomSop}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-lg text-xs transition shrink-0 shadow"
                                >
                                    {isSavingCustomSop ? 'Menyimpan...' : '+ Tambah Request'}
                                </button>
                            </div>
                        </div>

                        {/* Checklist Details (Filtered to relevant moments + custom items) */}
                        <div className="space-y-2 text-xs">
                            <h4 className="text-xs font-bold text-gray-300 pt-1">
                                Daftar Checklist Sesuai Momen Acara:
                            </h4>
                            {(selectedJobDetail.relevantTemplates || []).map(tpl => {
                                const checkedItem = (selectedJobDetail.checklist || []).find(c => c.id === tpl.id && c.checked);
                                const isChecked = !!checkedItem;
                                const mObj = SOP_MOMENTS.find(m => m.id === (tpl.moment || 'all'));

                                return (
                                    <div
                                        key={tpl.id}
                                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                                            tpl.is_custom
                                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                                                : isChecked
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-gray-200'
                                                    : 'bg-white/5 border-white/5 text-gray-400'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                                            isChecked ? 'bg-emerald-500 text-black font-bold' : 'border border-white/20'
                                        }`}>
                                            {isChecked && '✓'}
                                        </div>

                                        {tpl.image_url && (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImage({ url: tpl.image_url, title: tpl.text, phase: tpl.phase === 'pre' ? 'Pre-Event' : tpl.phase === 'on' ? 'Hari-H' : 'Pasca Acara' })}
                                                className="w-10 h-10 rounded-lg overflow-hidden border border-amber-500/30 bg-black shrink-0 relative group hover:ring-2 hover:ring-amber-400 transition"
                                                title="Lihat contoh"
                                            >
                                                <img
                                                    src={tpl.image_url}
                                                    alt={tpl.text}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                    <span className="text-[9px] text-white">🔍</span>
                                                </div>
                                            </button>
                                        )}

                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                {tpl.is_custom ? (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold uppercase">
                                                        🎯 Request Klien
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-medium">
                                                        {mObj?.icon || '📌'} {mObj?.label || tpl.moment}
                                                    </span>
                                                )}
                                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                                                    {tpl.phase === 'pre' ? 'Pre-Event' : tpl.phase === 'on' ? 'Hari-H' : 'Pasca Acara'}
                                                </span>
                                                {tpl.image_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewImage({ url: tpl.image_url, title: tpl.text, phase: tpl.phase === 'pre' ? 'Pre-Event' : tpl.phase === 'on' ? 'Hari-H' : 'Pasca Acara' })}
                                                        className="text-[9px] text-amber-300 hover:text-amber-200 underline font-medium"
                                                    >
                                                        Lihat Contoh 🔍
                                                    </button>
                                                )}
                                            </div>
                                            <span className={tpl.is_custom ? 'font-semibold text-amber-200' : ''}>{tpl.text}</span>
                                            {isChecked && checkedItem.checked_at && (
                                                <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                                                    Dicentang: {new Date(checkedItem.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT MASTER TEMPLATE SOP */}
            {editingTemplate && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
                    <div className="glass-panel border border-amber-500/30 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <span>✏️</span> Edit Standar Template SOP
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingTemplate(null)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg"
                            >
                                <SvgIcon name="x" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Momen Acara</label>
                                    <select
                                        value={editingTemplate.moment || 'all'}
                                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, moment: e.target.value }))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                                    >
                                        {SOP_MOMENTS.map(m => (
                                            <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Fase Kerja</label>
                                    <select
                                        value={editingTemplate.phase || 'on'}
                                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, phase: e.target.value }))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                                    >
                                        <option value="pre">🔋 Pre-Event (H-1)</option>
                                        <option value="on">📸 On-Event (Hari-H)</option>
                                        <option value="post">💾 Pasca Acara</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Target Peran</label>
                                    <select
                                        value={editingTemplate.role || 'all'}
                                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                                    >
                                        <option value="all">Semua Peran (FG / VG)</option>
                                        <option value="fotografer">Khusus FG</option>
                                        <option value="videografer">Khusus VG</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-400 block mb-1">Deskripsi Tugas SOP</label>
                                <textarea
                                    rows="3"
                                    value={editingTemplate.text || ''}
                                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, text: e.target.value }))}
                                    placeholder="Deskripsi tugas SOP..."
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-400 block mb-1">URL Foto Contoh (Opsional)</label>
                                <input
                                    type="url"
                                    value={editingTemplate.image_url || ''}
                                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, image_url: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setEditingTemplate(null)}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateTemplate}
                                disabled={!editingTemplate.text?.trim() || isSavingTemplate}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl text-xs font-bold transition shadow"
                            >
                                {isSavingTemplate ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX PREVIEW CONTOH GAMBAR (CEPAT & RINGAN) */}
            {previewImage && (
                <div
                    onClick={() => setPreviewImage(null)}
                    className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                            <div className="flex-1 pr-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {previewImage.phase || 'Contoh SOP'}
                                </span>
                                <p className="text-xs font-semibold text-white mt-1.5 leading-snug">
                                    {previewImage.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewImage(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition shrink-0"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="relative bg-black flex items-center justify-center min-h-[220px] max-h-[65vh] overflow-hidden p-2">
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                loading="eager"
                                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain mx-auto shadow-lg"
                            />
                        </div>

                        <div className="p-3 bg-slate-950/90 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
                            <span className="text-[11px] flex items-center gap-1">
                                <span>💡</span> Referensi standar visual Lapanbelas ID
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewImage(null)}
                                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================

export default CrewSopManager;
export { CrewSopManager };
