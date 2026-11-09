import React from "react";
import {
    supabase,
    adminFetch,
    formatDateUI,
    formatRupiah,
    parseNotesField,
    getOrderDivisions,
    DEFAULT_CREW_RATE_ITEMS,
    parseCrewRates,
    getRateForSession
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function CrewEventAssignmentsManager({ adminFetch, onShowToast, crewList = [], division = 'all' }) {
    const [events, setEvents] = React.useState([]);
    const [packagesList, setPackagesList] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQ, setSearchQ] = React.useState('');
    const [filterCategory, setFilterCategory] = React.useState('all');
    const [filterStatus, setFilterStatus] = React.useState('all'); // 'all', 'complete', 'partial', 'unassigned'
    const [filterMonth, setFilterMonth] = React.useState('current_plus'); // 'current_plus' (Bulan ini & mendatang), 'all', or 'YYYY-MM'
    const [editingEvent, setEditingEvent] = React.useState(null);
    const [isEventWithVideo, setIsEventWithVideo] = React.useState(false);
    const [forceShowVideographer, setForceShowVideographer] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [sendingWa, setSendingWa] = React.useState(null); // 'photographer_akad' | 'videographer_resepsi' | etc.
    const [showSecondFgResepsi, setShowSecondFgResepsi] = React.useState(false);
    const [showSecondFgAkad, setShowSecondFgAkad] = React.useState(false);
    const [showSecondFgSingle, setShowSecondFgSingle] = React.useState(false);
    const [manualModes, setManualModes] = React.useState({});
    const [rateCards, setRateCards] = React.useState([]);

    const toggleManual = (fieldKey) => {
        setManualModes(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
    };

    const defaultForm = {
        mode: 'single', // 'single' (1 hari / full day) | 'split' (2 hari: akad & resepsi terpisah)
        photographer: '',
        photographer2: '',
        photographerSession: 'Full Day (Akad + Resepsi)',
        photographerFee: '',
        photographer2Fee: '',
        videographer: '',
        videographerSession: 'Full Day (Akad + Resepsi)',
        videographerFee: '',

        photographerAkad: '',
        photographerAkad2: '',
        photographerAkadSession: 'Akad Saja',
        photographerAkadFee: '',
        photographerAkad2Fee: '',
        photographerResepsi: '',
        photographerResepsi2: '',
        photographerResepsiSession: 'Resepsi Saja',
        photographerResepsiFee: '',
        photographerResepsi2Fee: '',

        videographerAkad: '',
        videographerAkadSession: 'Akad Saja',
        videographerAkadFee: '',
        videographerResepsi: '',
        videographerResepsiSession: 'Resepsi Saja',
        videographerResepsiFee: ''
    };
    const [form, setForm] = React.useState(defaultForm);

    React.useEffect(() => {
        const fetcher = typeof adminFetch === 'function' ? adminFetch : fetch;
        fetcher('/api/crew/rate-cards')
            .then(r => r.json())
            .then(d => { if (d && d.rateCards) setRateCards(d.rateCards); })
            .catch(err => console.warn('Fetch rate-cards error:', err));
    }, []);

    const getEventRateCategory = (pkgName) => {
        const p = (pkgName || '').toLowerCase();
        if (p.includes('engagement') || p.includes('lamaran') || p.includes('tunangan')) return 'Tunangan / Lamaran';
        if (p.includes('prewed')) return 'Prewedding';
        if (p.includes('wisuda')) return 'Wisuda';
        if (p.includes('studio') || p.includes('passphoto')) return 'Studio Lapanbelas';
        return 'Wedding';
    };

    const checkAllowSplitMode = (evt) => {
        if (!evt) return false;
        const pkgLower = (evt.package_name || '').toLowerCase();
        // 1. Paket Silver: Wajib 1 hari acara (Akad & Resepsi bersamaan)
        if (pkgLower.includes('silver')) return false;

        // 2. Paket 1 hari murni
        const isSingleDayPkg = 
            pkgLower.includes('engagement') || 
            pkgLower.includes('lamaran') || 
            pkgLower.includes('tunangan') || 
            pkgLower.includes('prewed') || 
            pkgLower.includes('wisuda') || 
            pkgLower.includes('tasyakuran') || 
            pkgLower.includes('studio') || 
            pkgLower.includes('intimate') || 
            pkgLower.includes('postwed');
        if (isSingleDayPkg) return false;

        // 3. Paket wedding yang boleh beda hari
        const isMultiDayWeddingPkg = ['bronze', 'gold', 'platinum', 'royal', 'bravo', 'centro', 'delta'].some(k => pkgLower.includes(k));
        const isDifferentDate = Boolean(evt.resepsi_date && evt.resepsi_date !== evt.event_date);

        return isMultiDayWeddingPkg || isDifferentDate;
    };

    const findCrewObj = (crewVal) => {
        if (!crewVal) return null;
        const cleanDigits = crewVal.replace(/[^0-9]/g, '');
        return (crewList || []).find(c => {
            const cPhoneDigits = (c.phone || '').replace(/[^0-9]/g, '');
            if (cleanDigits && cPhoneDigits && (cPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(cPhoneDigits))) return true;
            if (c.name && crewVal.toLowerCase().includes(c.name.toLowerCase())) return true;
            return false;
        });
    };

    const handleSelectCrewWithFee = (crewField, feeField, crewVal, sessionVal, isSecondShooter = false) => {
        const crewObj = findCrewObj(crewVal);
        let autoFee = '';
        if (crewObj) {
            const rates = parseCrewRates(crewObj.notes);
            autoFee = String(getRateForSession(rates, sessionVal || form[crewField + 'Session'] || form.photographerSession || '', isSecondShooter) || '');
        }
        setForm(prev => ({
            ...prev,
            [crewField]: crewVal,
            [feeField]: autoFee || prev[feeField]
        }));
    };

    const handleChangeSessionWithFee = (sessionField, crewField, feeField, newSessionVal, isSecondShooter = false) => {
        const crewVal = form[crewField];
        const crewObj = findCrewObj(crewVal);
        let autoFee = form[feeField];
        if (crewObj) {
            const rates = parseCrewRates(crewObj.notes);
            autoFee = String(getRateForSession(rates, newSessionVal, isSecondShooter) || autoFee);
        }
        setForm(prev => ({
            ...prev,
            [sessionField]: newSessionVal,
            [feeField]: autoFee
        }));
    };

    const renderFeeSelector = (feeKey, role, label, crewVal = null) => {
        const currentFee = form[feeKey] || '';
        const crewObj = findCrewObj(crewVal);
        const crewRates = crewObj ? parseCrewRates(crewObj.notes) : null;

        return (
            <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                    <span className="font-semibold text-amber-300/90 flex items-center gap-1">
                        💰 {label}:
                    </span>
                    {currentFee ? (
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                                Rp {Number(String(currentFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                            </span>
                            {crewObj && (
                                <span className="text-[10px] text-gray-400">
                                    (Tarif {crewObj.name})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[10px] text-gray-400 italic">
                            {crewObj ? `Pilih tarif ${crewObj.name} di bawah` : 'Pilih kru terlebih dahulu'}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                        onChange={e => {
                            if (e.target.value) {
                                setForm(prev => ({ ...prev, [feeKey]: e.target.value }));
                            }
                        }}
                        value={currentFee ? String(currentFee) : ''}
                        className="bg-gray-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 outline-none focus:border-amber-500 appearance-none truncate"
                    >
                        <option value="">{crewObj ? `-- Pilih Tarif ${crewObj.name} --` : '-- Pilih Tarif --'}</option>
                        {crewObj && crewRates && Array.isArray(crewRates.items) && crewRates.items.length > 0 ? (
                            crewRates.items.map((it, idx) => (
                                <option key={it.id || idx} value={it.val}>
                                    {it.icon || '📌'} {it.label}: Rp {Number(it.val).toLocaleString('id-ID')}
                                </option>
                            ))
                        ) : (
                            DEFAULT_CREW_RATE_ITEMS.map((f, idx) => (
                                <option key={f.id || idx} value={f.val}>
                                    {f.icon || '📌'} {f.label}: Rp {Number(f.val).toLocaleString('id-ID')}
                                </option>
                            ))
                        )}
                    </select>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-mono pointer-events-none">Rp</span>
                        <input
                            type="text"
                            value={currentFee ? Number(String(currentFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                            onChange={e => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                setForm(prev => ({ ...prev, [feeKey]: raw }));
                            }}
                            placeholder="Ketik Nominal Gaji"
                            className="w-full bg-gray-950 border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono text-white placeholder-gray-500 outline-none focus:border-amber-500"
                        />
                    </div>
                </div>
            </div>
        );
    };

    const SESSION_OPTIONS = [
        'Full Day (Akad + Resepsi)',
        'Akad Saja',
        'Resepsi Saja',
        'Engagement',
        'Lamaran / Tunangan',
        'Sesi Prewedding',
        'Wisuda / Event',
        'Lead / Solo',
        'Backup / Second'
    ];

    const getAutoSessionForPackage = (pkgName) => {
        const p = (pkgName || '').toLowerCase();
        if (p.includes('engagement')) return 'Engagement';
        if (p.includes('lamaran') || p.includes('tunangan')) return 'Lamaran / Tunangan';
        if (p.includes('prewed')) return 'Sesi Prewedding';
        if (p.includes('wisuda')) return 'Wisuda / Event';
        if (p.includes('akad')) return 'Akad Saja';
        return 'Full Day (Akad + Resepsi)';
    };

    const [assignments, setAssignments] = React.useState([]);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const [{ data: apptsData, error: apptErr }, { data: pkgsData, error: pkgErr }, { data: asgsData }] = await Promise.all([
                supabase.from('appointments').select('*').order('event_date', { ascending: false }),
                supabase.from('packages').select('*'),
                supabase.from('crew_job_assignments').select('*')
            ]);

            if (apptErr) throw apptErr;
            if (pkgErr) console.warn('Fetch packages warning:', pkgErr);

            let allAsgs = asgsData || [];
            if (!allAsgs.length) {
                try {
                    const { data: cur } = await supabase.from('settings').select('value').eq('key', 'crew_job_assignments').maybeSingle();
                    if (cur?.value) allAsgs = JSON.parse(cur.value) || [];
                } catch(e) {}
            }
            setAssignments(allAsgs);
            setPackagesList(pkgsData || []);

            const pkgMap = {};
            (pkgsData || []).forEach(p => { pkgMap[p.title] = p; });

            // Filter pesanan dokumentasi foto/video (Lapanbelas.id dan Studio Lapanbelas)
            // Pesanan murni Lady Makeup atau Dekorasi tidak masuk ke penugasan kru dokumentasi
            const validEvents = (apptsData || []).filter(appt => {
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
        } catch (err) {
            console.error('Fetch crew events error:', err);
            onShowToast?.('Gagal memuat daftar acara: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getCrewStatusBadge = (apptId, crewVal, sessionKey = null) => {
        if (!crewVal) return null;
        const phoneMatch = crewVal.match(/\((?:(\+?[0-9\s-]+))\)/);
        const digits = phoneMatch ? phoneMatch[1].replace(/[^0-9]/g, '') : crewVal.replace(/[^0-9]/g, '');
        const asg = (assignments || []).find(a => 
            String(a.appointment_id) === String(apptId) && 
            (
                (digits && a.crew_phone && (a.crew_phone.endsWith(digits) || digits.endsWith(a.crew_phone))) ||
                (a.crew_name && crewVal.toLowerCase().includes(a.crew_name.toLowerCase()))
            ) &&
            (!sessionKey || !a.session_key || a.session_key === sessionKey)
        );
        if (!asg) return <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium whitespace-nowrap shrink-0 inline-flex items-center">⏳ Menunggu</span>;
        if (asg.status === 'ACCEPTED') return <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap shrink-0 inline-flex items-center">✓ Diterima</span>;
        if (asg.status === 'READY_ON_SITE') return <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap shrink-0 inline-flex items-center">📍 Hadir (PAP)</span>;
        if (asg.status === 'REJECTED') return <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold whitespace-nowrap shrink-0 inline-flex items-center">✕ Ditolak</span>;
        if (asg.status === 'FILES_SUBMITTED') return <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium whitespace-nowrap shrink-0 inline-flex items-center">📁 File Disetor</span>;
        return <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium whitespace-nowrap shrink-0 inline-flex items-center">⏳ Menunggu</span>;
    };

    React.useEffect(() => {
        fetchEvents();

        let debounceTimer;
        const scheduleRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    fetchEvents();
                }
            }, 500);
        };

        const channel = supabase
            .channel('realtime_crew_event_assignments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_job_assignments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.crew_job_assignments' }, scheduleRefresh)
            .on('broadcast', { event: 'CREW_LIVE_SYNC' }, scheduleRefresh)
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [division]);

    const getCrewDivision = (c) => {
        const notesLower = (c.notes || '').toLowerCase();
        if (notesLower.includes('[divisi]: studio') || notesLower.includes('spesialis studio')) return 'studio';
        if (notesLower.includes('[divisi]: lapanbelas.id') || notesLower.includes('wedding') || notesLower.includes('wediding')) return 'lapanbelas.id';
        return 'both';
    };

    const eligibleCrew = crewList.filter(c => {
        if (c.is_active === false) return false;
        const cDiv = getCrewDivision(c);
        if (division === 'lapanbelas.id' && cDiv === 'studio') return false;
        if (division === 'studio' && cDiv === 'lapanbelas.id') return false;
        return true;
    });

    const fgCrewOptions = eligibleCrew.filter(c => ['fotografer', 'foto', 'fg', 'foto_video', 'all'].includes((c.role || '').toLowerCase()));
    const vgCrewOptions = eligibleCrew.filter(c => ['videografer', 'video', 'vg', 'foto_video', 'all'].includes((c.role || '').toLowerCase()));

    const checkEventHasVideo = (evt, customPkg = null) => {
        if (!evt) return false;
        const pkgObj = customPkg || (packagesList || []).find(p => p.title === evt.package_name);
        const pkgName = (evt.package_name || '').toLowerCase();

        // 1. Cek paket yang HANYA FOTO (Tanpa Video sama sekali)
        const purePhotoPackages = [
            'gold combo', 'gold package', 'bronze', 'silver', 
            'akad intimate', 'akad postwed', 'prewed package 1', 
            'engagement', 'lamaran', 'tunangan', 'tasyakuran', 'wisuda'
        ];
        const isPurePhotoPkg = purePhotoPackages.some(k => pkgName.includes(k));

        // 2. Cek apakah ada kata video eksplisit di judul paket
        const hasExplicitVideoInTitle = /video|cinematic|cinema|teaser|clip|drone|videografer/i.test(pkgName);

        // 3. Paket Wedding yang memang INCLUDE video secara baku
        const knownVideoPackages = ['platinum', 'delta', 'bravo', 'centro', 'royal', 'prewed package 2'];
        const isKnownVideoPackage = knownVideoPackages.some(k => pkgName.includes(k));

        // 4. Cek deskripsi paket jika bukan pure photo pkg
        let hasVideoInDesc = false;
        if (pkgObj && pkgObj.description) {
            const cleanDesc = pkgObj.description.replace(/\[HPP_ITEMS\]:[\s\S]*$/, '');
            hasVideoInDesc = /video|cinematic|cinema|teaser|clip|drone|videografer/i.test(cleanDesc);
        }

        let packageHasVideo = isKnownVideoPackage || hasExplicitVideoInTitle || (!isPurePhotoPkg && hasVideoInDesc);

        // 5. Cek Add-ons (invoice_addons)
        let hasVideoAddon = false;
        const testText = (text) => text && /video|cinematic|cinema|teaser|clip|drone|videografer/i.test(String(text));

        if (evt.invoice_addons) {
            let addons = evt.invoice_addons;
            if (typeof addons === 'string') {
                try { addons = JSON.parse(addons); } catch(e) {}
            }
            if (Array.isArray(addons)) {
                if (addons.some(a => testText(a?.name || a?.label || ''))) {
                    hasVideoAddon = true;
                }
            }
        }

        // 6. Cek custom_fees (Biaya Tambahan / Paket Tambahan)
        let hasVideoCustomFee = false;
        if (evt.custom_fees) {
            let fees = evt.custom_fees;
            if (typeof fees === 'string') {
                try { fees = JSON.parse(fees); } catch(e) {}
            }
            if (Array.isArray(fees)) {
                if (fees.some(f => testText(f?.name || f?.description || f?.title || ''))) {
                    hasVideoCustomFee = true;
                }
            }
        }

        // 7. Cek catatan tambahan [LAYANAN TAMBAHAN] atau [BIAYA LAINNYA]
        let hasVideoInNotes = false;
        const notesStr = evt.additional_notes || '';
        const addonMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:[\s\S]*?(?=\n\n\[|\n$|$)/i);
        if (addonMatch && testText(addonMatch[0])) hasVideoInNotes = true;
        const feeMatch = notesStr.match(/\[BIAYA LAINNYA\]:[\s\S]*?(?=\n\n\[|\n$|$)/i);
        if (feeMatch && testText(feeMatch[0])) hasVideoInNotes = true;

        return Boolean(packageHasVideo || hasVideoAddon || hasVideoCustomFee || hasVideoInNotes);
    };

    const getEventCrewInfo = (evt) => {
        const parsed = parseNotesField(evt.additional_notes || '');
        const isTwoDays = Boolean(evt.resepsi_date && evt.resepsi_date !== evt.event_date);
        const hasSplitCrew = Boolean(
            parsed.photographerAkad || parsed.photographerResepsi ||
            parsed.videographerAkad || parsed.videographerResepsi
        );
        const isSplit = isTwoDays || hasSplitCrew;
        const hasVideo = checkEventHasVideo(evt);

        let status = 'unassigned';
        if (isSplit) {
            const hasFgAkad = Boolean(parsed.photographerAkad || parsed.photographer);
            const hasFgResepsi = Boolean(parsed.photographerResepsi || parsed.photographer);
            const hasVgAkad = Boolean(parsed.videographerAkad || parsed.videographer);
            const hasVgResepsi = Boolean(parsed.videographerResepsi || parsed.videographer);

            const allFgDone = hasFgAkad && hasFgResepsi;
            const allVgDone = hasVgAkad && hasVgResepsi;

            if (hasVideo) {
                const anyAssigned = hasFgAkad || hasFgResepsi || hasVgAkad || hasVgResepsi;
                if (allFgDone && allVgDone) status = 'complete';
                else if (anyAssigned) status = 'partial';
                else status = 'unassigned';
            } else {
                const anyFgAssigned = hasFgAkad || hasFgResepsi;
                if (allFgDone) status = 'complete';
                else if (anyFgAssigned) status = 'partial';
                else status = 'unassigned';
            }
        } else {
            const hasFg = Boolean(parsed.photographer);
            const hasVg = Boolean(parsed.videographer);

            if (hasVideo) {
                if (hasFg && hasVg) status = 'complete';
                else if (hasFg || hasVg) status = 'partial';
                else status = 'unassigned';
            } else {
                if (hasFg) status = 'complete';
                else status = 'unassigned';
            }
        }

        return { parsed, isTwoDays, isSplit, hasVideo, status };
    };

    const soleVgCandidate = vgCrewOptions.length === 1 ? `${vgCrewOptions[0].name} (${vgCrewOptions[0].phone})` : '';

    const handleOpenAssign = (evt) => {
        const parsed = parseNotesField(evt.additional_notes || '');
        const isTwoDays = Boolean(evt.resepsi_date && evt.resepsi_date !== evt.event_date);
        const hasSplitCrew = Boolean(
            parsed.photographerAkad || parsed.photographerResepsi ||
            parsed.videographerAkad || parsed.videographerResepsi
        );

        // Validasi apakah paket diizinkan menggunakan mode split (Akad & Resepsi beda sesi/hari)
        const allowSplit = checkAllowSplitMode(evt);
        const initialMode = (allowSplit && (isTwoDays || hasSplitCrew)) ? 'split' : 'single';

        const pkgLower = (evt.package_name || '').toLowerCase();
        const defaultSingleSession = getAutoSessionForPackage(evt.package_name);
        const isNonWedding = pkgLower.includes('engagement') || pkgLower.includes('lamaran') || pkgLower.includes('tunangan') || pkgLower.includes('prewed') || pkgLower.includes('wisuda') || pkgLower.includes('intimate');

        const rawFgSession = (parsed.photographerSession || '').trim();
        const selectedFgSession = (!rawFgSession || (isNonWedding && rawFgSession.toLowerCase().includes('full day')))
            ? defaultSingleSession
            : rawFgSession;

        const rawVgSession = (parsed.videographerSession || '').trim();
        const selectedVgSession = (!rawVgSession || (isNonWedding && rawVgSession.toLowerCase().includes('full day')))
            ? defaultSingleSession
            : rawVgSession;

        // Deteksi apakah pesanan ini mencakup layanan video dari paket atau add-on invoice
        const hasVideo = checkEventHasVideo(evt);
        setIsEventWithVideo(hasVideo);
        setForceShowVideographer(false);

        // Auto-select videografer ke Visual18 HANYA jika pesanan memang menyertakan video
        const defaultVg = hasVideo ? (parsed.videographer || soleVgCandidate) : '';
        const defaultVgAkad = hasVideo ? (parsed.videographerAkad || parsed.videographer || soleVgCandidate) : '';
        const defaultVgResepsi = hasVideo ? (parsed.videographerResepsi || parsed.videographer || soleVgCandidate) : '';

        const valAkad = parsed.photographerAkad || parsed.photographer || '';
        const valAkad2 = parsed.photographerAkad2 || '';
        const valResepsi = parsed.photographerResepsi || parsed.photographer || parsed.photographerAkad || '';
        const valResepsi2 = parsed.photographerResepsi2 || '';
        const valSingleFg = parsed.photographer || '';
        const valSingleFg2 = parsed.photographer2 || '';

        // Deteksi apakah nilai yang tersimpan sebelumnya merupakan input manual (tidak ada di list dropdown)
        const isFgManual = (val) => Boolean(val && !fgCrewOptions.some(c => `${c.name} (${c.phone})` === val || c.name === val));
        const isVgManual = (val) => Boolean(val && !vgCrewOptions.some(c => `${c.name} (${c.phone})` === val || c.name === val));

        setManualModes({
            photographer: isFgManual(valSingleFg),
            photographer2: isFgManual(valSingleFg2),
            photographerAkad: isFgManual(valAkad),
            photographerAkad2: isFgManual(valAkad2),
            photographerResepsi: isFgManual(valResepsi),
            photographerResepsi2: isFgManual(valResepsi2),
            videographer: isVgManual(defaultVg),
            videographerAkad: isVgManual(defaultVgAkad),
            videographerResepsi: isVgManual(defaultVgResepsi)
        });

        setShowSecondFgResepsi(Boolean(valResepsi2));
        setShowSecondFgAkad(Boolean(valAkad2));
        setShowSecondFgSingle(Boolean(valSingleFg2));

        // Auto-calculate initial fees dari tarif khusus kru jika belum tersimpan
        const initialFgCrew = findCrewObj(valSingleFg);
        const autoFgFee = parsed.photographerFee || (initialFgCrew ? String(getRateForSession(parseCrewRates(initialFgCrew.notes), selectedFgSession, false) || '') : '');

        const initialFg2Crew = findCrewObj(valSingleFg2);
        const autoFg2Fee = parsed.photographer2Fee || (initialFg2Crew ? String(getRateForSession(parseCrewRates(initialFg2Crew.notes), selectedFgSession, true) || '') : '');

        const initialVgCrew = findCrewObj(defaultVg);
        const autoVgFee = hasVideo ? (parsed.videographerFee || (initialVgCrew ? String(getRateForSession(parseCrewRates(initialVgCrew.notes), selectedVgSession, false) || '') : '')) : '';

        const initialAkadCrew = findCrewObj(valAkad);
        const autoAkadFee = parsed.photographerAkadFee || (initialAkadCrew ? String(getRateForSession(parseCrewRates(initialAkadCrew.notes), parsed.photographerAkadSession || 'Akad Saja', false) || '') : '');

        const initialAkad2Crew = findCrewObj(valAkad2);
        const autoAkad2Fee = parsed.photographerAkad2Fee || (initialAkad2Crew ? String(getRateForSession(parseCrewRates(initialAkad2Crew.notes), parsed.photographerAkadSession || 'Akad Saja', true) || '') : '');

        const initialResepsiCrew = findCrewObj(valResepsi);
        const autoResepsiFee = parsed.photographerResepsiFee || (initialResepsiCrew ? String(getRateForSession(parseCrewRates(initialResepsiCrew.notes), parsed.photographerResepsiSession || 'Resepsi Saja', false) || '') : '');

        const initialResepsi2Crew = findCrewObj(valResepsi2);
        const autoResepsi2Fee = parsed.photographerResepsi2Fee || (initialResepsi2Crew ? String(getRateForSession(parseCrewRates(initialResepsi2Crew.notes), parsed.photographerResepsiSession || 'Resepsi Saja', true) || '') : '');

        const initialVgAkadCrew = findCrewObj(defaultVgAkad);
        const autoVgAkadFee = hasVideo ? (parsed.videographerAkadFee || (initialVgAkadCrew ? String(getRateForSession(parseCrewRates(initialVgAkadCrew.notes), parsed.videographerAkadSession || 'Akad Saja', false) || '') : '')) : '';

        const initialVgResepsiCrew = findCrewObj(defaultVgResepsi);
        const autoVgResepsiFee = hasVideo ? (parsed.videographerResepsiFee || (initialVgResepsiCrew ? String(getRateForSession(parseCrewRates(initialVgResepsiCrew.notes), parsed.videographerResepsiSession || 'Resepsi Saja', false) || '') : '')) : '';

        setEditingEvent(evt);
        setForm({
            mode: initialMode,
            photographer: valSingleFg,
            photographer2: valSingleFg2,
            photographerSession: selectedFgSession,
            photographerFee: autoFgFee,
            photographer2Fee: autoFg2Fee,
            videographer: defaultVg,
            videographerSession: selectedVgSession,
            videographerFee: autoVgFee,

            // Prefill: jika ada tag akad/resepsi pakai itu, jika belum ada pakai tag umum
            photographerAkad: valAkad,
            photographerAkad2: valAkad2,
            photographerAkadSession: parsed.photographerAkadSession || 'Akad Saja',
            photographerAkadFee: autoAkadFee,
            photographerAkad2Fee: autoAkad2Fee,
            photographerResepsi: valResepsi,
            photographerResepsi2: valResepsi2,
            photographerResepsiSession: parsed.photographerResepsiSession || 'Resepsi Saja',
            photographerResepsiFee: autoResepsiFee,
            photographerResepsi2Fee: autoResepsi2Fee,

            videographerAkad: defaultVgAkad,
            videographerAkadSession: parsed.videographerAkadSession || 'Akad Saja',
            videographerAkadFee: autoVgAkadFee,
            videographerResepsi: defaultVgResepsi,
            videographerResepsiSession: parsed.videographerResepsiSession || 'Resepsi Saja',
            videographerResepsiFee: autoVgResepsiFee
        });
        setIsModalOpen(true);
    };

    const handleCopyAkadToResepsi = () => {
        setForm(prev => ({
            ...prev,
            photographerResepsi: prev.photographerAkad,
            photographerResepsi2: prev.photographerAkad2,
            photographerResepsiFee: prev.photographerAkadFee,
            photographerResepsi2Fee: prev.photographerAkad2Fee,
            videographerResepsi: prev.videographerAkad,
            videographerResepsiFee: prev.videographerAkadFee
        }));
        if (form.photographerAkad2) {
            setShowSecondFgResepsi(true);
        }
        setManualModes(prev => ({
            ...prev,
            photographerResepsi: prev.photographerAkad,
            photographerResepsi2: prev.photographerAkad2,
            videographerResepsi: prev.videographerAkad
        }));
        onShowToast?.('Kru & tarif Akad disalin ke jadwal Resepsi! 📋', 'info');
    };

    const handleSaveAssignment = async (e) => {
        e.preventDefault();
        if (!editingEvent) return;
        setIsSubmitting(true);
        try {
            let currentNotes = editingEvent.additional_notes || '';

            // Bersihkan semua tag penugasan kru & tarif lama (single dan split)
            currentNotes = currentNotes
                .replace(/\[PHOTOGRAPHER\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_2\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_SESSION\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_FEE\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_2_FEE\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_2\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_SESSION\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_FEE\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_AKAD\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_AKAD_2\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_AKAD_SESSION\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_AKAD_FEE\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_AKAD_2_FEE\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_RESEPSI\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_RESEPSI_2\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_RESEPSI_SESSION\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_RESEPSI_FEE\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER_RESEPSI_2_FEE\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_AKAD\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_AKAD_SESSION\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_AKAD_FEE\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_RESEPSI\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_RESEPSI_SESSION\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER_RESEPSI_FEE\]:.*?\n*/g, '')
                .trim();

            let tagsToAdd = '';
            if (form.mode === 'split') {
                if (form.photographerAkad) {
                    tagsToAdd += `\n[PHOTOGRAPHER_AKAD]: ${form.photographerAkad}`;
                    tagsToAdd += `\n[PHOTOGRAPHER_AKAD_SESSION]: ${form.photographerAkadSession || 'Akad Saja'}`;
                    if (form.photographerAkadFee) {
                        tagsToAdd += `\n[PHOTOGRAPHER_AKAD_FEE]: ${form.photographerAkadFee}`;
                    }
                }
                if (form.photographerAkad2 && showSecondFgAkad) {
                    tagsToAdd += `\n[PHOTOGRAPHER_AKAD_2]: ${form.photographerAkad2}`;
                    if (form.photographerAkad2Fee) {
                        tagsToAdd += `\n[PHOTOGRAPHER_AKAD_2_FEE]: ${form.photographerAkad2Fee}`;
                    }
                }
                if (form.photographerResepsi) {
                    tagsToAdd += `\n[PHOTOGRAPHER_RESEPSI]: ${form.photographerResepsi}`;
                    tagsToAdd += `\n[PHOTOGRAPHER_RESEPSI_SESSION]: ${form.photographerResepsiSession || 'Resepsi Saja'}`;
                    if (form.photographerResepsiFee) {
                        tagsToAdd += `\n[PHOTOGRAPHER_RESEPSI_FEE]: ${form.photographerResepsiFee}`;
                    }
                }
                if (form.photographerResepsi2 && showSecondFgResepsi) {
                    tagsToAdd += `\n[PHOTOGRAPHER_RESEPSI_2]: ${form.photographerResepsi2}`;
                    if (form.photographerResepsi2Fee) {
                        tagsToAdd += `\n[PHOTOGRAPHER_RESEPSI_2_FEE]: ${form.photographerResepsi2Fee}`;
                    }
                }
                const shouldSaveVg = isEventWithVideo || forceShowVideographer;

                if (shouldSaveVg && form.videographerAkad) {
                    tagsToAdd += `\n[VIDEOGRAPHER_AKAD]: ${form.videographerAkad}`;
                    tagsToAdd += `\n[VIDEOGRAPHER_AKAD_SESSION]: ${form.videographerAkadSession || 'Akad Saja'}`;
                    if (form.videographerAkadFee) {
                        tagsToAdd += `\n[VIDEOGRAPHER_AKAD_FEE]: ${form.videographerAkadFee}`;
                    }
                }
                if (shouldSaveVg && form.videographerResepsi) {
                    tagsToAdd += `\n[VIDEOGRAPHER_RESEPSI]: ${form.videographerResepsi}`;
                    tagsToAdd += `\n[VIDEOGRAPHER_RESEPSI_SESSION]: ${form.videographerResepsiSession || 'Resepsi Saja'}`;
                    if (form.videographerResepsiFee) {
                        tagsToAdd += `\n[VIDEOGRAPHER_RESEPSI_FEE]: ${form.videographerResepsiFee}`;
                    }
                }

                // Tag gabungan untuk kompatibilitas tampilan umum
                const fgAkadAll = [form.photographerAkad, (showSecondFgAkad ? form.photographerAkad2 : '')].filter(Boolean).join(' + ');
                const fgResepsiAll = [form.photographerResepsi, (showSecondFgResepsi ? form.photographerResepsi2 : '')].filter(Boolean).join(' + ');

                if (fgAkadAll && fgResepsiAll) {
                    if (fgAkadAll === fgResepsiAll) {
                        tagsToAdd += `\n[PHOTOGRAPHER]: ${fgAkadAll}`;
                        tagsToAdd += `\n[PHOTOGRAPHER_SESSION]: 2 Hari (Akad & Resepsi)`;
                    } else {
                        tagsToAdd += `\n[PHOTOGRAPHER]: ${fgAkadAll} (Akad) & ${fgResepsiAll} (Resepsi)`;
                    }
                } else if (fgAkadAll) {
                    tagsToAdd += `\n[PHOTOGRAPHER]: ${fgAkadAll} (Akad)`;
                } else if (fgResepsiAll) {
                    tagsToAdd += `\n[PHOTOGRAPHER]: ${fgResepsiAll} (Resepsi)`;
                }

                if (shouldSaveVg) {
                    if (form.videographerAkad && form.videographerResepsi) {
                        if (form.videographerAkad === form.videographerResepsi) {
                            tagsToAdd += `\n[VIDEOGRAPHER]: ${form.videographerAkad}`;
                            tagsToAdd += `\n[VIDEOGRAPHER_SESSION]: 2 Hari (Akad & Resepsi)`;
                        } else {
                            tagsToAdd += `\n[VIDEOGRAPHER]: ${form.videographerAkad} (Akad) & ${form.videographerResepsi} (Resepsi)`;
                        }
                    } else if (form.videographerAkad) {
                        tagsToAdd += `\n[VIDEOGRAPHER]: ${form.videographerAkad} (Akad)`;
                    } else if (form.videographerResepsi) {
                        tagsToAdd += `\n[VIDEOGRAPHER]: ${form.videographerResepsi} (Resepsi)`;
                    }
                }
            } else {
                if (form.photographer) {
                    tagsToAdd += `\n[PHOTOGRAPHER]: ${form.photographer}`;
                    if (form.photographerSession) {
                        tagsToAdd += `\n[PHOTOGRAPHER_SESSION]: ${form.photographerSession}`;
                    }
                    if (form.photographerFee) {
                        tagsToAdd += `\n[PHOTOGRAPHER_FEE]: ${form.photographerFee}`;
                    }
                }
                if (form.photographer2 && showSecondFgSingle) {
                    tagsToAdd += `\n[PHOTOGRAPHER_2]: ${form.photographer2}`;
                    if (form.photographer2Fee) {
                        tagsToAdd += `\n[PHOTOGRAPHER_2_FEE]: ${form.photographer2Fee}`;
                    }
                }
                const shouldSaveVg = isEventWithVideo || forceShowVideographer;
                if (shouldSaveVg && form.videographer) {
                    tagsToAdd += `\n[VIDEOGRAPHER]: ${form.videographer}`;
                    if (form.videographerSession) {
                        tagsToAdd += `\n[VIDEOGRAPHER_SESSION]: ${form.videographerSession}`;
                    }
                    if (form.videographerFee) {
                        tagsToAdd += `\n[VIDEOGRAPHER_FEE]: ${form.videographerFee}`;
                    }
                }
            }

            const newNotes = (currentNotes + tagsToAdd).trim();

            const { error } = await supabase
                .from('appointments')
                .update({ additional_notes: newNotes })
                .eq('id', editingEvent.id);

            if (error) throw error;

            // Trigger Web Push Notification Banner ke kru yang ditugaskan
            const shouldSaveVg = isEventWithVideo || forceShowVideographer;
            const assignedCrew = [];
            if (form.mode === 'split') {
                if (form.photographerAkad) assignedCrew.push({ name: form.photographerAkad, role: 'Fotografer (Utama)', session: form.photographerAkadSession || 'Akad Saja', fee: form.photographerAkadFee });
                if (form.photographerAkad2 && showSecondFgAkad) assignedCrew.push({ name: form.photographerAkad2, role: 'Fotografer (Second Shooter)', session: 'Akad (Second)', fee: form.photographerAkad2Fee });
                if (form.photographerResepsi) assignedCrew.push({ name: form.photographerResepsi, role: 'Fotografer (Utama)', session: form.photographerResepsiSession || 'Resepsi Saja', fee: form.photographerResepsiFee });
                if (form.photographerResepsi2 && showSecondFgResepsi) assignedCrew.push({ name: form.photographerResepsi2, role: 'Fotografer (Second Shooter)', session: 'Resepsi (Second)', fee: form.photographerResepsi2Fee });
                if (shouldSaveVg && form.videographerAkad) assignedCrew.push({ name: form.videographerAkad, role: 'Videografer', session: form.videographerAkadSession || 'Akad Saja', fee: form.videographerAkadFee });
                if (shouldSaveVg && form.videographerResepsi) assignedCrew.push({ name: form.videographerResepsi, role: 'Videografer', session: form.videographerResepsiSession || 'Resepsi Saja', fee: form.videographerResepsiFee });
            } else {
                if (form.photographer) assignedCrew.push({ name: form.photographer, role: 'Fotografer (Utama)', session: form.photographerSession || 'Dokumentasi', fee: form.photographerFee });
                if (form.photographer2 && showSecondFgSingle) assignedCrew.push({ name: form.photographer2, role: 'Fotografer (Second Shooter)', session: 'Dokumentasi (Second)', fee: form.photographer2Fee });
                if (shouldSaveVg && form.videographer) assignedCrew.push({ name: form.videographer, role: 'Videografer', session: form.videographerSession || 'Dokumentasi', fee: form.videographerFee });
            }

            if (assignedCrew.length > 0) {
                try {
                    const notifyPayload = {
                        appointmentId: editingEvent.id,
                        clientName: editingEvent.client_name,
                        eventDate: editingEvent.event_date,
                        packageTitle: editingEvent.package_name,
                        assignedCrew
                    };
                    const notifyFetch = adminFetch || fetch;
                    const notifyRes = await notifyFetch('/api/crew/admin/notify-assignment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(notifyPayload)
                    });
                    const notifyData = await notifyRes.json().catch(() => ({}));
                    if (notifyData && notifyData.sentCount > 0) {
                        onShowToast?.(`Penugasan kru disimpan & notifikasi banner HP terkirim ke ${notifyData.sentCount} kru! 📲🔔`, 'success');
                    } else {
                        onShowToast?.('Penugasan kru berhasil disimpan! ✅', 'success');
                    }
                } catch (notifyErr) {
                    console.warn('Gagal kirim notif push kru:', notifyErr);
                    onShowToast?.('Penugasan kru berhasil disimpan! ✅', 'success');
                }
            } else {
                onShowToast?.('Penugasan kru berhasil disimpan! ✅', 'success');
            }
            setIsModalOpen(false);
            fetchEvents();
        } catch (err) {
            console.error('Save assignment error:', err);
            onShowToast?.('Gagal menyimpan penugasan: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendCrewWa = async (role, crewValue, crewSession, targetDate = null, sessionLabel = '') => {
        if (!editingEvent || !crewValue) return;
        const sendKey = `${role}_${sessionLabel || 'default'}`;
        setSendingWa(sendKey);
        try {
            const body = {
                appointmentId: editingEvent.id,
                crewRole: role === 'photographer' ? 'Fotografer' : 'Videografer',
                crewName: crewValue,
                crewSession: crewSession || (sessionLabel ? `${sessionLabel}` : 'Full Day (Akad + Resepsi)'),
                eventDate: targetDate || editingEvent.event_date
            };
            const res = await (adminFetch ? adminFetch('/api/send-crew-assignment-wa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }) : fetch('/api/send-crew-assignment-wa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }));

            const data = await res.json();
            if (data.success) {
                onShowToast?.(`Notifikasi WA penugasan ${role === 'photographer' ? 'FG' : 'VG'} (${sessionLabel || 'Tugas'}) berhasil dikirim! 📲`, 'success');
            } else if (data.waUrl) {
                window.open(data.waUrl, '_blank');
                onShowToast?.('Membuka WhatsApp penugasan...', 'info');
            } else {
                onShowToast?.(data.error || 'Gagal mengirim WA', 'error');
            }
        } catch (err) {
            onShowToast?.('Gagal mengirim WA: ' + err.message, 'error');
        } finally {
            setSendingWa(null);
        }
    };

    // Ekstrak opsi bulan unik dari data acara
    const monthOptions = React.useMemo(() => {
        const monthMap = new Map();
        const indonesianMonths = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        events.forEach(evt => {
            const dateStr = evt.event_date || '';
            const ymMatch = dateStr.match(/^(\d{4})-(\d{2})/);
            if (ymMatch) {
                const year = ymMatch[1];
                const monthNum = parseInt(ymMatch[2], 10);
                const key = `${year}-${ymMatch[2]}`;
                if (!monthMap.has(key) && monthNum >= 1 && monthNum <= 12) {
                    const label = `${indonesianMonths[monthNum - 1]} ${year}`;
                    monthMap.set(key, { key, label, year: parseInt(year, 10), month: monthNum });
                }
            }
        });

        return Array.from(monthMap.values()).sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [events]);

    // Acara berdasarkan bulan terpilih (digunakan juga untuk statistik kartu)
    const monthFilteredEvents = React.useMemo(() => {
        const currentYm = new Date().toISOString().slice(0, 7);
        if (filterMonth === 'current_plus') {
            return events.filter(evt => {
                const dateStr = evt.event_date || '';
                return dateStr >= currentYm;
            });
        }
        if (filterMonth === 'all') return events;
        return events.filter(evt => {
            const dateStr = evt.event_date || '';
            return dateStr.startsWith(filterMonth);
        });
    }, [events, filterMonth]);

    // Filter daftar acara (search, status, kategori, bulan)
    const filteredEvents = monthFilteredEvents.filter(evt => {
        const { parsed, status } = getEventCrewInfo(evt);
        const pkgName = (evt.package_name || '').toLowerCase();
        const clientName = (evt.client_name || '').toLowerCase();
        const idStr = String(evt.id || '').toLowerCase();

        const allCrewNames = [
            parsed.photographer, parsed.videographer,
            parsed.photographerAkad, parsed.photographerResepsi,
            parsed.videographerAkad, parsed.videographerResepsi
        ].filter(Boolean).join(' ').toLowerCase();

        // Filter search
        const matchSearch = !searchQ || 
            clientName.includes(searchQ.toLowerCase()) || 
            idStr.includes(searchQ.toLowerCase()) || 
            allCrewNames.includes(searchQ.toLowerCase());

        // Filter status penugasan
        let matchStatus = true;
        if (filterStatus !== 'all') matchStatus = (status === filterStatus);

        // Filter kategori
        let matchCategory = true;
        if (filterCategory === 'wedding') matchCategory = pkgName.includes('wedding') || pkgName.includes('nikah') || pkgName.includes('akad') || pkgName.includes('resepsi');
        else if (filterCategory === 'prewedding') matchCategory = pkgName.includes('prewed');
        else if (filterCategory === 'lamaran') matchCategory = pkgName.includes('lamaran') || pkgName.includes('tunangan') || pkgName.includes('engagement');
        else if (filterCategory === 'wisuda') matchCategory = pkgName.includes('wisuda');

        return matchSearch && matchStatus && matchCategory;
    });

    const stats = React.useMemo(() => {
        let complete = 0;
        let partial = 0;
        let unassigned = 0;
        monthFilteredEvents.forEach(e => {
            const { status } = getEventCrewInfo(e);
            if (status === 'complete') complete++;
            else if (status === 'partial') partial++;
            else unassigned++;
        });
        return { total: monthFilteredEvents.length, complete, partial, unassigned };
    }, [monthFilteredEvents]);

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <SvgIcon name="calendar-days" className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        Penugasan Kru Dokumentasi Acara (lapanbelas.id)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        Atur penugasan Fotografer (FG) dan Videografer (VG) untuk acara dokumentasi lapangan. Mendukung pembagian jadwal mandiri untuk acara 2 hari (Akad & Resepsi).
                    </p>
                </div>
                <button
                    onClick={fetchEvents}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-300 rounded-xl text-xs font-semibold transition shrink-0 self-start sm:self-auto border border-slate-200 dark:border-white/10"
                >
                    <SvgIcon name="refresh-cw" className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Segarkan Data</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Total Acara Dokumentasi</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.complete}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Lengkap (FG & VG)</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.partial}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Sebagian (FG / VG saja)</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5">
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.unassigned}</p>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">Belum Ada Kru</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Cari nama klien, ID booking, atau nama kru..."
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder-gray-500 outline-none focus:border-emerald-500"
                    />
                </div>
                <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none font-medium"
                >
                    <option value="current_plus">🗓️ Bulan Ini & Seterusnya (Aktif)</option>
                    <option value="all">📁 Semua Bulan (Termasuk Acara Lewat)</option>
                    {monthOptions.map(opt => (
                        <option key={opt.key} value={opt.key}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none"
                >
                    <option value="all">Semua Status Kru</option>
                    <option value="complete">✅ Lengkap (FG & VG)</option>
                    <option value="partial">⏳ Sebagian (Salah Satu)</option>
                    <option value="unassigned">⚠️ Belum Ada Kru</option>
                </select>
                <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 appearance-none"
                >
                    <option value="all">Semua Kategori</option>
                    <option value="wedding">Wedding / Pernikahan</option>
                    <option value="prewedding">Prewedding</option>
                    <option value="lamaran">Lamaran / Engagement</option>
                    <option value="wisuda">Wisuda / Event</option>
                </select>
            </div>

            {/* Event List / Table */}
            {isLoading ? (
                <div className="text-center py-16 text-slate-400 dark:text-gray-500 text-xs">Memuat data jadwal acara dokumentasi...</div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-white/3 rounded-2xl border border-slate-200 dark:border-white/8 space-y-2">
                    <p className="text-3xl">📅</p>
                    <p className="text-slate-900 dark:text-white font-semibold text-sm">Tidak ada jadwal acara dokumentasi yang cocok</p>
                    <p className="text-slate-500 dark:text-gray-400 text-xs">Pesanan murni Studio, Makeup, dan Pelaminan tidak dimuat di sini kecuali memiliki paket/add-on foto atau video.</p>
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-white/3 rounded-2xl border border-slate-200/90 dark:border-white/8 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[1100px]">
                            <thead>
                                <tr className="border-b border-slate-200/90 dark:border-white/10 text-slate-500 dark:text-gray-400 font-semibold bg-slate-100 dark:bg-white/5 whitespace-nowrap">
                                    <th className="px-4 py-3.5 whitespace-nowrap w-[150px]">Tanggal Acara</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Klien & Paket</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[310px]">Fotografer (FG)</th>
                                    <th className="px-4 py-3.5 whitespace-nowrap min-w-[310px]">Videografer (VG)</th>
                                    <th className="px-4 py-3.5 text-center whitespace-nowrap w-[120px]">Status</th>
                                    <th className="px-4 py-3.5 text-right whitespace-nowrap w-[120px]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredEvents.map(evt => {
                                    const { parsed, isTwoDays, isSplit, hasVideo, status } = getEventCrewInfo(evt);

                                    return (
                                        <tr key={evt.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {isTwoDays ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25 shrink-0">
                                                                2 Hari
                                                            </span>
                                                            <span className="font-semibold text-slate-900 dark:text-white text-xs">{formatDateUI(evt.event_date)}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 dark:text-gray-400 pl-0.5 flex items-center gap-1 whitespace-nowrap">
                                                            <span>Resepsi:</span>
                                                            <span className="text-slate-700 dark:text-gray-300 font-medium">{formatDateUI(evt.resepsi_date)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-nowrap">
                                                        <p className="font-semibold text-slate-900 dark:text-white text-xs">{formatDateUI(evt.event_date)}</p>
                                                        {(evt.jam_akad || evt.jam_resepsi) && (
                                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                                                                {evt.jam_akad ? `Akad: ${evt.jam_akad}` : ''}
                                                                {evt.jam_akad && evt.jam_resepsi ? ' • ' : ''}
                                                                {evt.jam_resepsi ? `Resepsi: ${evt.jam_resepsi}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="font-semibold text-slate-900 dark:text-white text-xs leading-snug">{evt.client_name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{evt.package_name}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500">#{evt.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {isSplit ? (
                                                    (() => {
                                                        const hasFgAny = Boolean(parsed.photographerAkad || parsed.photographerResepsi || parsed.photographer);
                                                        if (!hasFgAny) return <span className="text-gray-500 italic text-[11px] whitespace-nowrap">— Belum ditugaskan —</span>;
                                                        return (
                                                            <div className="space-y-1.5 py-0.5 whitespace-nowrap">
                                                                <div className="flex items-center justify-between gap-3 text-xs whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">Akad:</span>
                                                                        {parsed.photographerAkad || parsed.photographer ? (
                                                                            <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                                                                                {parsed.photographerAkad || parsed.photographer}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-gray-500 italic text-[10px]">—</span>
                                                                        )}
                                                                    </div>
                                                                    {(parsed.photographerAkad || parsed.photographer) && (
                                                                        getCrewStatusBadge(evt.id, parsed.photographerAkad || parsed.photographer, 'akad')
                                                                    )}
                                                                </div>
                                                                {parsed.photographerAkad2 && (
                                                                    <div className="flex items-center justify-between gap-3 text-[10px] whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 text-amber-600 dark:text-amber-300">
                                                                        <span className="font-medium whitespace-nowrap">FG 2: {parsed.photographerAkad2}</span>
                                                                        {getCrewStatusBadge(evt.id, parsed.photographerAkad2, 'akad_2')}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center justify-between gap-3 text-xs whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">Resepsi:</span>
                                                                        {parsed.photographerResepsi || parsed.photographer ? (
                                                                            <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                                                                                {parsed.photographerResepsi || parsed.photographer}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-gray-500 italic text-[10px]">—</span>
                                                                        )}
                                                                    </div>
                                                                    {(parsed.photographerResepsi || parsed.photographer) && (
                                                                        getCrewStatusBadge(evt.id, parsed.photographerResepsi || parsed.photographer, 'resepsi')
                                                                    )}
                                                                </div>
                                                                {parsed.photographerResepsi2 && (
                                                                    <div className="flex items-center justify-between gap-3 text-[10px] whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 text-amber-600 dark:text-amber-300">
                                                                        <span className="font-medium whitespace-nowrap">FG 2: {parsed.photographerResepsi2}</span>
                                                                        {getCrewStatusBadge(evt.id, parsed.photographerResepsi2, 'resepsi_2')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <div>
                                                        {parsed.photographer ? (
                                                            <div className="space-y-1 py-0.5 whitespace-nowrap">
                                                                <div className="flex items-center justify-between gap-3 text-xs whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                                    <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                                                                        {parsed.photographer}
                                                                    </span>
                                                                    {getCrewStatusBadge(evt.id, parsed.photographer, 'full')}
                                                                </div>
                                                                {parsed.photographer2 && (
                                                                    <div className="flex items-center justify-between gap-3 text-[10px] whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 text-amber-600 dark:text-amber-300">
                                                                        <span className="font-medium whitespace-nowrap">FG 2: {parsed.photographer2}</span>
                                                                        {getCrewStatusBadge(evt.id, parsed.photographer2, 'full_2')}
                                                                    </div>
                                                                )}
                                                                <span className="text-[10px] text-slate-500 dark:text-gray-400 block whitespace-nowrap pl-1">
                                                                    {(() => {
                                                                        const autoS = getAutoSessionForPackage(evt.package_name);
                                                                        const isNonW = autoS !== 'Full Day (Akad + Resepsi)';
                                                                        if (isNonW) return autoS;
                                                                        return parsed.photographerSession || 'Full Day';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-gray-500 italic text-[11px] whitespace-nowrap">— Belum ditugaskan —</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {!hasVideo ? (
                                                    <span className="text-slate-400 dark:text-gray-500 italic text-[11px] whitespace-nowrap bg-slate-100/80 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 inline-flex items-center gap-1.5">
                                                        <span>📸</span> Khusus Foto (Tanpa Video)
                                                    </span>
                                                ) : isSplit ? (
                                                    (() => {
                                                        const hasVgAny = Boolean(parsed.videographerAkad || parsed.videographerResepsi || parsed.videographer);
                                                        if (!hasVgAny) return <span className="text-slate-400 dark:text-gray-500 italic text-[11px] whitespace-nowrap">— Belum ditugaskan —</span>;
                                                        return (
                                                            <div className="space-y-1.5 py-0.5 whitespace-nowrap">
                                                                <div className="flex items-center justify-between gap-3 text-xs whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 shrink-0">Akad:</span>
                                                                        {parsed.videographerAkad || parsed.videographer ? (
                                                                            <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                                                                                {parsed.videographerAkad || parsed.videographer}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-gray-500 italic text-[10px]">—</span>
                                                                        )}
                                                                    </div>
                                                                    {(parsed.videographerAkad || parsed.videographer) && (
                                                                        getCrewStatusBadge(evt.id, parsed.videographerAkad || parsed.videographer, 'akad')
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center justify-between gap-3 text-xs whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 shrink-0">Resepsi:</span>
                                                                        {parsed.videographerResepsi || parsed.videographer ? (
                                                                            <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                                                                                {parsed.videographerResepsi || parsed.videographer}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-gray-500 italic text-[10px]">—</span>
                                                                        )}
                                                                    </div>
                                                                    {(parsed.videographerResepsi || parsed.videographer) && (
                                                                        getCrewStatusBadge(evt.id, parsed.videographerResepsi || parsed.videographer, 'resepsi')
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <div>
                                                        {parsed.videographer ? (
                                                            <div className="space-y-1 py-0.5 whitespace-nowrap">
                                                                <div className="flex items-center justify-between gap-3 text-xs whitespace-nowrap bg-slate-100/90 dark:bg-white/3 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                                                    <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                                                                        {parsed.videographer}
                                                                    </span>
                                                                    {getCrewStatusBadge(evt.id, parsed.videographer, 'full')}
                                                                </div>
                                                                <span className="text-[10px] text-slate-500 dark:text-gray-400 block whitespace-nowrap pl-1">
                                                                    {(() => {
                                                                        const autoS = getAutoSessionForPackage(evt.package_name);
                                                                        const isNonW = autoS !== 'Full Day (Akad + Resepsi)';
                                                                        if (isNonW) return autoS;
                                                                        return parsed.videographerSession || 'Full Day';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-gray-500 italic text-[11px] whitespace-nowrap">— Belum ditugaskan —</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {status === 'complete' ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap inline-flex items-center">
                                                        ✅ Lengkap
                                                    </span>
                                                ) : status === 'partial' ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap inline-flex items-center">
                                                        ⏳ Parsial
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap inline-flex items-center">
                                                        ⚠️ Kosong
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => handleOpenAssign(evt)}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0"
                                                >
                                                    <SvgIcon name="edit" className="w-3.5 h-3.5" />
                                                    <span>Atur Kru</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-200 dark:divide-white/5">
                        {filteredEvents.map(evt => {
                            const { parsed, isTwoDays, isSplit, hasVideo, status } = getEventCrewInfo(evt);

                            return (
                                <div key={evt.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{evt.client_name}</p>
                                                {isTwoDays && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                                        2 Hari
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{evt.package_name}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                                                📅 {formatDateUI(evt.event_date)} {isTwoDays ? `& ${formatDateUI(evt.resepsi_date)}` : ''} • #{evt.id}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {status === 'complete' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                    ✅ Lengkap
                                                </span>
                                            ) : status === 'partial' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                    ⏳ Parsial
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                                    ⚠️ Kosong
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleOpenAssign(evt)}
                                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                                            >
                                                <SvgIcon name="edit" className="w-3.5 h-3.5" />
                                                <span>Atur</span>
                                            </button>
                                        </div>
                                    </div>

                                    {isSplit ? (
                                        <div className="space-y-2 text-xs">
                                            <div className="bg-amber-500/10 dark:bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/25">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">💍 Jadwal Hari 1 (Akad)</span>
                                                    <span className="text-[10px] text-slate-500 dark:text-gray-400">{formatDateUI(evt.event_date)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-[11px]">
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white truncate font-medium">
                                                            FG: {parsed.photographerAkad || parsed.photographer || <span className="text-slate-400 dark:text-gray-500 italic">Belum ada</span>}
                                                            {(parsed.photographerAkadFee || parsed.photographerFee) && (
                                                                <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                    Rp {Number(String(parsed.photographerAkadFee || parsed.photographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {parsed.photographerAkad2 && (
                                                            <p className="text-amber-700 dark:text-amber-300/80 text-[10px] truncate font-medium">
                                                                FG 2: {parsed.photographerAkad2}
                                                                {parsed.photographerAkad2Fee && (
                                                                    <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                        Rp {Number(String(parsed.photographerAkad2Fee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white truncate font-medium">
                                                            VG: {!hasVideo ? (
                                                                <span className="text-slate-400 dark:text-gray-500 italic text-[10px]">Khusus Foto</span>
                                                            ) : (
                                                                parsed.videographerAkad || parsed.videographer || <span className="text-slate-400 dark:text-gray-500 italic">Belum ada</span>
                                                            )}
                                                            {hasVideo && (parsed.videographerAkadFee || parsed.videographerFee) && (
                                                                <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                    Rp {Number(String(parsed.videographerAkadFee || parsed.videographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-cyan-500/10 dark:bg-cyan-500/5 p-2.5 rounded-xl border border-cyan-500/25">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 uppercase">🎉 Jadwal Hari 2 (Resepsi)</span>
                                                    <span className="text-[10px] text-slate-500 dark:text-gray-400">{formatDateUI(evt.resepsi_date || evt.event_date)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-[11px]">
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white truncate font-medium">
                                                            FG: {parsed.photographerResepsi || parsed.photographer || <span className="text-slate-400 dark:text-gray-500 italic">Belum ada</span>}
                                                            {(parsed.photographerResepsiFee || parsed.photographerFee) && (
                                                                <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                    Rp {Number(String(parsed.photographerResepsiFee || parsed.photographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {parsed.photographerResepsi2 && (
                                                            <p className="text-amber-700 dark:text-amber-300/80 text-[10px] truncate font-medium">
                                                                FG 2: {parsed.photographerResepsi2}
                                                                {parsed.photographerResepsi2Fee && (
                                                                    <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                        Rp {Number(String(parsed.photographerResepsi2Fee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 dark:text-white truncate font-medium">
                                                            VG: {!hasVideo ? (
                                                                <span className="text-slate-400 dark:text-gray-500 italic text-[10px]">Khusus Foto</span>
                                                            ) : (
                                                                parsed.videographerResepsi || parsed.videographer || <span className="text-slate-400 dark:text-gray-500 italic">Belum ada</span>
                                                            )}
                                                            {hasVideo && (parsed.videographerResepsiFee || parsed.videographerFee) && (
                                                                <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                    Rp {Number(String(parsed.videographerResepsiFee || parsed.videographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-100 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                                            <div>
                                                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">Fotografer:</span>
                                                <p className="text-slate-900 dark:text-white mt-0.5 truncate font-medium">
                                                    {parsed.photographer ? `📸 ${parsed.photographer}` : <span className="text-slate-400 dark:text-gray-500 italic">Belum ada</span>}
                                                    {parsed.photographerFee && (
                                                        <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                            Rp {Number(String(parsed.photographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                        </span>
                                                    )}
                                                </p>
                                                {parsed.photographer2 && (
                                                    <p className="text-amber-700 dark:text-amber-300/80 text-[10px] truncate font-medium">
                                                        📸 2: {parsed.photographer2}
                                                        {parsed.photographer2Fee && (
                                                            <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                Rp {Number(String(parsed.photographer2Fee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                            </span>
                                                        )}
                                                    </p>
                                                )}
                                                {parsed.photographer && (
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                                                        {(() => {
                                                            const autoS = getAutoSessionForPackage(evt.package_name);
                                                            const isNonW = autoS !== 'Full Day (Akad + Resepsi)';
                                                            if (isNonW) return autoS;
                                                            return parsed.photographerSession || 'Full Day';
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">Videografer:</span>
                                                {!hasVideo ? (
                                                    <p className="text-slate-400 dark:text-gray-500 mt-0.5 truncate font-medium italic text-[10px]">
                                                        Khusus Foto (Tanpa Video)
                                                    </p>
                                                ) : (
                                                    <>
                                                        <p className="text-slate-900 dark:text-white mt-0.5 truncate font-medium">
                                                            {parsed.videographer ? `🎬 ${parsed.videographer}` : <span className="text-slate-400 dark:text-gray-500 italic">Belum ada</span>}
                                                            {parsed.videographerFee && (
                                                                <span className="ml-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                                                    Rp {Number(String(parsed.videographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {parsed.videographer && (
                                                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-medium">
                                                                {(() => {
                                                                    const autoS = getAutoSessionForPackage(evt.package_name);
                                                                    const isNonW = autoS !== 'Full Day (Akad + Resepsi)';
                                                                    if (isNonW) return autoS;
                                                                    return parsed.videographerSession || 'Full Day';
                                                                })()}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal: Atur Penugasan Kru */}
            {isModalOpen && editingEvent && (() => {
                const isTwoDays = Boolean(editingEvent.resepsi_date && editingEvent.resepsi_date !== editingEvent.event_date);
                const pkgLower = (editingEvent.package_name || '').toLowerCase();
                const isSilver = pkgLower.includes('silver');
                const isNonWeddingOrSingle = 
                    pkgLower.includes('engagement') || 
                    pkgLower.includes('lamaran') || 
                    pkgLower.includes('tunangan') || 
                    pkgLower.includes('prewed') || 
                    pkgLower.includes('wisuda') || 
                    pkgLower.includes('tasyakuran') || 
                    pkgLower.includes('studio') || 
                    pkgLower.includes('intimate') || 
                    pkgLower.includes('postwed');
                const allowSplitMode = checkAllowSplitMode(editingEvent);

                return (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                        <SvgIcon name="users" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        Penugasan Kru Acara
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                        {editingEvent.client_name} • #{editingEvent.id}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-400 dark:hover:text-white transition"
                                >
                                    <SvgIcon name="x" className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSaveAssignment} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                {/* Summary Box */}
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/8 space-y-1.5 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-gray-400">Paket:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{editingEvent.package_name}</span>
                                    </div>
                                    {isTwoDays ? (
                                        <div className="pt-1 border-t border-slate-200 dark:border-white/5 space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-amber-700 dark:text-amber-300 font-medium">💍 Hari 1 (Akad):</span>
                                                <span className="text-slate-900 dark:text-white font-semibold">
                                                    {formatDateUI(editingEvent.event_date)} {editingEvent.jam_akad ? `• ${editingEvent.jam_akad} WIB` : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-cyan-700 dark:text-cyan-300 font-medium">🎉 Hari 2 (Resepsi):</span>
                                                <span className="text-slate-900 dark:text-white font-semibold">
                                                    {formatDateUI(editingEvent.resepsi_date)} {editingEvent.jam_resepsi ? `• ${editingEvent.jam_resepsi} WIB` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-gray-400">Tanggal Acara:</span>
                                                <span className="text-slate-900 dark:text-white font-medium">{formatDateUI(editingEvent.event_date)}</span>
                                            </div>
                                            {editingEvent.jam_akad && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 dark:text-gray-400">Jam Akad:</span>
                                                    <span className="text-slate-900 dark:text-white font-mono">{editingEvent.jam_akad} WIB</span>
                                                </div>
                                            )}
                                            {editingEvent.jam_resepsi && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 dark:text-gray-400">Jam Resepsi:</span>
                                                    <span className="text-slate-900 dark:text-white font-mono">{editingEvent.jam_resepsi} WIB</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Videographer Auto-Tag & Fee Info Banner */}
                                {(!isEventWithVideo && !forceShowVideographer) ? (
                                    <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white flex-wrap">
                                                <span className="text-amber-500">📸</span>
                                                <span>Paket Khusus Foto (Tanpa Layanan Video)</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 font-medium">
                                                    Hanya Fotografer
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-gray-400">
                                                Pesanan ini tidak menyertakan videografer sesuai rincian invoice/paket. Form videografer disembunyikan.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForceShowVideographer(true)}
                                            className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-semibold shrink-0 transition flex items-center gap-1 self-start sm:self-auto"
                                        >
                                            <span>+</span> Tambah Videografer Manual
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gradient-to-r from-cyan-50/70 via-blue-50/50 to-emerald-50/50 dark:from-cyan-950/40 dark:via-blue-950/30 dark:to-emerald-950/30 rounded-xl border border-cyan-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white flex-wrap">
                                                <span className="text-cyan-600 dark:text-cyan-400">🎬</span>
                                                <span>Videografer: <strong className="text-cyan-700 dark:text-cyan-300">Visual18</strong></span>
                                                {!isNonWeddingOrSingle && (
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/25">Rp 1.500.000</span>
                                                )}
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-medium">
                                                    {forceShowVideographer && !isEventWithVideo ? 'Manual Diaktifkan' : 'Otomatis Ditag'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-gray-300">
                                                {isNonWeddingOrSingle 
                                                    ? '✨ Dokumentasi Video Acara (Satu Hari Selesai)' 
                                                    : form.mode === 'split' 
                                                        ? '✨ Walaupun beda hari: Akad Rp 750.000 + Resepsi Rp 750.000 = Total Tetap Rp 1.500.000' 
                                                        : isSilver
                                                            ? '✨ Paket Silver: Wajib 1 Hari Acara (Akad & Resepsi) - Flat Rp 1.500.000'
                                                            : '✨ Paket Komplit Full Day Akad + Resepsi: Flat Rp 1.500.000'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                                            {forceShowVideographer && !isEventWithVideo && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setForceShowVideographer(false);
                                                        setForm(prev => ({
                                                            ...prev,
                                                            videographer: '',
                                                            videographerFee: '',
                                                            videographerAkad: '',
                                                            videographerAkadFee: '',
                                                            videographerResepsi: '',
                                                            videographerResepsiFee: ''
                                                        }));
                                                    }}
                                                    className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-semibold transition"
                                                >
                                                    ✕ Batal
                                                </button>
                                            )}
                                            {soleVgCandidate && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setForm(prev => ({
                                                            ...prev,
                                                            videographer: soleVgCandidate,
                                                            videographerAkad: soleVgCandidate,
                                                            videographerResepsi: soleVgCandidate
                                                        }));
                                                        onShowToast?.('Visual18 berhasil di-tag ke semua sesi video! 🎬', 'success');
                                                    }}
                                                    className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                                >
                                                    <span>⚡</span> Tag Visual18 Saja
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Mode Penugasan: 2 Hari Terpisah vs 1 Hari / Sama */}
                                {allowSplitMode ? (
                                    <div className="bg-slate-100 dark:bg-black/40 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, mode: 'split' })}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${form.mode === 'split' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
                                        >
                                            <span>📅 {isTwoDays ? 'Jadwal 2 Hari (Akad & Resepsi Terpisah)' : 'Bagi Sesi (Akad & Resepsi)'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, mode: 'single' })}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${form.mode === 'single' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
                                        >
                                            <span>⚡ Satu Kru (Full Day)</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                                            ⚡ {isSilver ? 'Paket Silver: Wajib 1 Hari Acara (Akad & Resepsi Bersamaan)' : 'Acara 1 Hari Penuh (Single Session / Full Day)'}
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-gray-300 border border-white/10 font-mono">
                                            Mode 1 Hari Aktif
                                        </span>
                                    </div>
                                )}

                                {form.mode === 'split' ? (
                                    /* =================== FORM MODE SPLIT (2 HARI) =================== */
                                    <div className="space-y-4">
                                        {/* Quick Copy Button */}
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleCopyAkadToResepsi}
                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5"
                                            >
                                                <span>📋 Salin Kru Akad ke Resepsi (Kru Sama Sendiri)</span>
                                            </button>
                                        </div>

                                        {/* HARI 1: AKAD NIKAH */}
                                        <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/25 space-y-3.5">
                                            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                                                <div>
                                                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                                        💍 JADWAL HARI 1: AKAD NIKAH
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                                                        {formatDateUI(editingEvent.event_date)} {editingEvent.jam_akad ? `• ${editingEvent.jam_akad} WIB` : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* FG Akad 1 (Utama) */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between flex-wrap gap-1">
                                                    <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                                                        📸 Fotografer Akad 1 (Utama):
                                                    </label>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleManual('photographerAkad')}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                manualModes.photographerAkad
                                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>{manualModes.photographerAkad ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                        </button>
                                                        {form.photographerAkad && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendCrewWa('photographer', form.photographerAkad, form.photographerAkadSession, editingEvent.event_date, 'Akad')}
                                                                disabled={sendingWa === 'photographer_Akad'}
                                                                className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                            >
                                                                <SvgIcon name="send" className="w-3 h-3" />
                                                                <span>{sendingWa === 'photographer_Akad' ? 'Mengirim...' : 'Kirim WA FG'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {manualModes.photographerAkad ? (
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={form.photographerAkad}
                                                            onChange={e => setForm({ ...form, photographerAkad: e.target.value })}
                                                            placeholder="Ketik manual nama & nomor HP (cth: Dami • 08123456789)"
                                                            className="w-full bg-gray-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                                                        />
                                                        <span className="absolute right-2.5 top-2 text-[10px] text-amber-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={form.photographerAkad}
                                                        onChange={e => handleSelectCrewWithFee('photographerAkad', 'photographerAkadFee', e.target.value, form.photographerAkadSession, false)}
                                                        className="w-full bg-gray-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 appearance-none"
                                                    >
                                                        <option value="">-- Pilih Fotografer Akad (misal: Juwan) --</option>
                                                        {fgCrewOptions.map(c => (
                                                            <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                {c.name} • {c.phone} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                {renderFeeSelector('photographerAkadFee', 'fotografer', 'Tarif Gaji FG Akad 1 (Utama)', form.photographerAkad)}
                                            </div>

                                            {/* FG Akad 2 (Second Shooter / Candid) */}
                                            {showSecondFgAkad ? (
                                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                        <label className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                                                            📸 Fotografer Akad 2 (Second Shooter / Candid):
                                                        </label>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleManual('photographerAkad2')}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                    manualModes.photographerAkad2
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span>{manualModes.photographerAkad2 ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowSecondFgAkad(false);
                                                                    setForm(prev => ({ ...prev, photographerAkad2: '', photographerAkad2Fee: '' }));
                                                                }}
                                                                className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded text-[10px] font-medium transition"
                                                            >
                                                                ✕ Hapus FG 2
                                                            </button>
                                                            {form.photographerAkad2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendCrewWa('photographer', form.photographerAkad2, 'Akad (Second Shooter)', editingEvent.event_date, 'Akad (FG 2)')}
                                                                    disabled={sendingWa === 'photographer_Akad (FG 2)'}
                                                                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                                >
                                                                    <SvgIcon name="send" className="w-3 h-3" />
                                                                    <span>{sendingWa === 'photographer_Akad (FG 2)' ? 'Mengirim...' : 'Kirim WA'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {manualModes.photographerAkad2 ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.photographerAkad2}
                                                                onChange={e => setForm({ ...form, photographerAkad2: e.target.value })}
                                                                placeholder="Ketik manual nama & nomor HP FG 2 Akad (cth: Fajar • 08123456789)"
                                                                className="w-full bg-gray-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                                                            />
                                                            <span className="absolute right-2.5 top-2 text-[10px] text-amber-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={form.photographerAkad2}
                                                            onChange={e => handleSelectCrewWithFee('photographerAkad2', 'photographerAkad2Fee', e.target.value, form.photographerAkadSession, true)}
                                                            className="w-full bg-gray-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 appearance-none"
                                                        >
                                                            <option value="">-- Pilih Fotografer 2 Akad (Second Shooter) --</option>
                                                            {fgCrewOptions.map(c => (
                                                                <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                    {c.name} • {c.phone} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {renderFeeSelector('photographerAkad2Fee', 'fotografer', 'Tarif Gaji FG Akad 2 (Second Shooter)', form.photographerAkad2)}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecondFgAkad(true)}
                                                    className="w-full py-1.5 px-3 border border-dashed border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl text-[11px] font-semibold text-amber-300 transition flex items-center justify-center gap-1"
                                                >
                                                    <span>+ Tambah Fotografer 2 Akad (Second Shooter / Candid)</span>
                                                </button>
                                            )}

                                            {/* VG Akad */}
                                            {(isEventWithVideo || forceShowVideographer) && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                        <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                                                            🎬 Videografer Akad:
                                                        </label>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleManual('videographerAkad')}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                    manualModes.videographerAkad
                                                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span>{manualModes.videographerAkad ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                            </button>
                                                            {form.videographerAkad && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendCrewWa('videographer', form.videographerAkad, form.videographerAkadSession, editingEvent.event_date, 'Akad')}
                                                                    disabled={sendingWa === 'videographer_Akad'}
                                                                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                                >
                                                                    <SvgIcon name="send" className="w-3 h-3" />
                                                                    <span>{sendingWa === 'videographer_Akad' ? 'Mengirim...' : 'Kirim WA VG'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {manualModes.videographerAkad ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.videographerAkad}
                                                                onChange={e => setForm({ ...form, videographerAkad: e.target.value })}
                                                                placeholder="Ketik manual nama & nomor HP (cth: Visual18 • 6281362132800)"
                                                                className="w-full bg-gray-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                                                            />
                                                            <span className="absolute right-2.5 top-2 text-[10px] text-cyan-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={form.videographerAkad}
                                                            onChange={e => handleSelectCrewWithFee('videographerAkad', 'videographerAkadFee', e.target.value, form.videographerAkadSession, false)}
                                                            className="w-full bg-gray-900 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 appearance-none"
                                                        >
                                                            <option value="">-- Pilih Videografer Akad --</option>
                                                            {vgCrewOptions.map(c => (
                                                                <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                    {c.name.toLowerCase().includes('visual') ? '⭐ ' : ''}{c.name} • {c.phone} {c.name.toLowerCase().includes('visual') ? '(Videografer Utama)' : (c.type === 'freelance' ? '(Freelance)' : '(Staff)')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {renderFeeSelector('videographerAkadFee', 'videografer', 'Tarif Gaji VG Akad', form.videographerAkad)}
                                                </div>
                                            )}
                                        </div>

                                        {/* HARI 2: RESEPSI */}
                                        <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/25 space-y-3.5">
                                            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                                                <div>
                                                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                                                        🎉 JADWAL HARI 2: RESEPSI
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                                                        {formatDateUI(editingEvent.resepsi_date || editingEvent.event_date)} {editingEvent.jam_resepsi ? `• ${editingEvent.jam_resepsi} WIB` : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* FG Resepsi 1 (Utama) */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between flex-wrap gap-1">
                                                    <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                                                        📸 Fotografer Resepsi 1 (Utama):
                                                    </label>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleManual('photographerResepsi')}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                manualModes.photographerResepsi
                                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>{manualModes.photographerResepsi ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                        </button>
                                                        {form.photographerResepsi && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendCrewWa('photographer', form.photographerResepsi, form.photographerResepsiSession, (editingEvent.resepsi_date || editingEvent.event_date), 'Resepsi')}
                                                                disabled={sendingWa === 'photographer_Resepsi'}
                                                                className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                            >
                                                                <SvgIcon name="send" className="w-3 h-3" />
                                                                <span>{sendingWa === 'photographer_Resepsi' ? 'Mengirim...' : 'Kirim WA FG'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {manualModes.photographerResepsi ? (
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={form.photographerResepsi}
                                                            onChange={e => setForm({ ...form, photographerResepsi: e.target.value })}
                                                            placeholder="Ketik manual nama & nomor HP (cth: Dami • 08123456789)"
                                                            className="w-full bg-gray-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                                                        />
                                                        <span className="absolute right-2.5 top-2 text-[10px] text-amber-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={form.photographerResepsi}
                                                        onChange={e => handleSelectCrewWithFee('photographerResepsi', 'photographerResepsiFee', e.target.value, form.photographerResepsiSession, false)}
                                                        className="w-full bg-gray-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 appearance-none"
                                                    >
                                                        <option value="">-- Pilih Fotografer Resepsi (misal: Dami / Juwan) --</option>
                                                        {fgCrewOptions.map(c => (
                                                            <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                {c.name} • {c.phone} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                {renderFeeSelector('photographerResepsiFee', 'fotografer', 'Tarif Gaji FG Resepsi 1 (Utama)', form.photographerResepsi)}
                                            </div>

                                            {/* FG Resepsi 2 (Second Shooter / Candid) */}
                                            {showSecondFgResepsi ? (
                                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                        <label className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                                                            📸 Fotografer Resepsi 2 (Second Shooter / Candid):
                                                        </label>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleManual('photographerResepsi2')}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                    manualModes.photographerResepsi2
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span>{manualModes.photographerResepsi2 ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowSecondFgResepsi(false);
                                                                    setForm(prev => ({ ...prev, photographerResepsi2: '', photographerResepsi2Fee: '' }));
                                                                }}
                                                                className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded text-[10px] font-medium transition"
                                                            >
                                                                ✕ Hapus FG 2
                                                            </button>
                                                            {form.photographerResepsi2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendCrewWa('photographer', form.photographerResepsi2, 'Resepsi (Second Shooter)', (editingEvent.resepsi_date || editingEvent.event_date), 'Resepsi (FG 2)')}
                                                                    disabled={sendingWa === 'photographer_Resepsi (FG 2)'}
                                                                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                                >
                                                                    <SvgIcon name="send" className="w-3 h-3" />
                                                                    <span>{sendingWa === 'photographer_Resepsi (FG 2)' ? 'Mengirim...' : 'Kirim WA'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {manualModes.photographerResepsi2 ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.photographerResepsi2}
                                                                onChange={e => setForm({ ...form, photographerResepsi2: e.target.value })}
                                                                placeholder="Ketik manual nama & nomor HP FG 2 Resepsi (cth: Fajar • 08123456789)"
                                                                className="w-full bg-gray-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                                                            />
                                                            <span className="absolute right-2.5 top-2 text-[10px] text-amber-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={form.photographerResepsi2}
                                                            onChange={e => handleSelectCrewWithFee('photographerResepsi2', 'photographerResepsi2Fee', e.target.value, form.photographerResepsiSession, true)}
                                                            className="w-full bg-gray-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 appearance-none"
                                                        >
                                                            <option value="">-- Pilih Fotografer 2 Resepsi (Second Shooter) --</option>
                                                            {fgCrewOptions.map(c => (
                                                                <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                    {c.name} • {c.phone} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {renderFeeSelector('photographerResepsi2Fee', 'fotografer', 'Tarif Gaji FG Resepsi 2 (Second Shooter)', form.photographerResepsi2)}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecondFgResepsi(true)}
                                                    className="w-full py-2 px-3 border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl text-xs font-semibold text-cyan-300 transition flex items-center justify-center gap-1.5"
                                                >
                                                    <span>+ Tambah Fotografer 2 Resepsi (Second Shooter / Candid)</span>
                                                </button>
                                            )}

                                            {/* VG Resepsi */}
                                            {(isEventWithVideo || forceShowVideographer) && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                        <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                                                            🎬 Videografer Resepsi:
                                                        </label>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleManual('videographerResepsi')}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                    manualModes.videographerResepsi
                                                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span>{manualModes.videographerResepsi ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                            </button>
                                                            {form.videographerResepsi && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendCrewWa('videographer', form.videographerResepsi, form.videographerResepsiSession, (editingEvent.resepsi_date || editingEvent.event_date), 'Resepsi')}
                                                                    disabled={sendingWa === 'videographer_Resepsi'}
                                                                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                                >
                                                                    <SvgIcon name="send" className="w-3 h-3" />
                                                                    <span>{sendingWa === 'videographer_Resepsi' ? 'Mengirim...' : 'Kirim WA VG'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {manualModes.videographerResepsi ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.videographerResepsi}
                                                                onChange={e => setForm({ ...form, videographerResepsi: e.target.value })}
                                                                placeholder="Ketik manual nama & nomor HP (cth: Visual18 • 6281362132800)"
                                                                className="w-full bg-gray-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                                                            />
                                                            <span className="absolute right-2.5 top-2 text-[10px] text-cyan-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={form.videographerResepsi}
                                                            onChange={e => handleSelectCrewWithFee('videographerResepsi', 'videographerResepsiFee', e.target.value, form.videographerResepsiSession, false)}
                                                            className="w-full bg-gray-900 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 appearance-none"
                                                        >
                                                            <option value="">-- Pilih Videografer Resepsi --</option>
                                                            {vgCrewOptions.map(c => (
                                                                <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                    {c.name.toLowerCase().includes('visual') ? '⭐ ' : ''}{c.name} • {c.phone} {c.name.toLowerCase().includes('visual') ? '(Videografer Utama)' : (c.type === 'freelance' ? '(Freelance)' : '(Staff)')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {renderFeeSelector('videographerResepsiFee', 'videografer', 'Tarif Gaji VG Resepsi', form.videographerResepsi)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* =================== FORM MODE SINGLE (1 HARI / FULL DAY) =================== */
                                    <div className="space-y-4">
                                        {/* Section Fotografer (FG) */}
                                        <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 space-y-3.5">
                                            <div className="flex items-center justify-between flex-wrap gap-1">
                                                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <SvgIcon name="camera" className="w-4 h-4 text-amber-400" />
                                                    Fotografer Utama (FG 1)
                                                </label>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleManual('photographer')}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                            manualModes.photographer
                                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <span>{manualModes.photographer ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                    </button>
                                                    {form.photographer && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendCrewWa('photographer', form.photographer, form.photographerSession, editingEvent.event_date, 'Full Day')}
                                                            disabled={sendingWa === 'photographer_Full Day'}
                                                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                                                        >
                                                            <SvgIcon name="send" className="w-3 h-3" />
                                                            <span>{sendingWa === 'photographer_Full Day' ? 'Mengirim...' : 'Kirim WA FG'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {manualModes.photographer ? (
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={form.photographer}
                                                        onChange={e => setForm({ ...form, photographer: e.target.value })}
                                                        placeholder="Ketik manual nama & nomor HP (cth: Dami • 08123456789)"
                                                        className="w-full bg-gray-900 border border-amber-500/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                                                    />
                                                    <span className="absolute right-2.5 top-2.5 text-[10px] text-amber-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                </div>
                                            ) : (
                                                <select
                                                    value={form.photographer}
                                                    onChange={e => handleSelectCrewWithFee('photographer', 'photographerFee', e.target.value, form.photographerSession, false)}
                                                    className="w-full bg-gray-900 border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 appearance-none"
                                                >
                                                    <option value="">-- Pilih Fotografer --</option>
                                                    {fgCrewOptions.map(c => (
                                                        <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                            {c.name} • {c.phone} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            {renderFeeSelector('photographerFee', 'fotografer', 'Tarif Gaji FG 1 (Utama)', form.photographer)}

                                            {/* Fotografer 2 Single (Second Shooter) */}
                                            {showSecondFgSingle ? (
                                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                        <label className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                                                            📸 Fotografer 2 (Second Shooter / Candid):
                                                        </label>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleManual('photographer2')}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                    manualModes.photographer2
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span>{manualModes.photographer2 ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowSecondFgSingle(false);
                                                                    setForm(prev => ({ ...prev, photographer2: '', photographer2Fee: '' }));
                                                                }}
                                                                className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded text-[10px] font-medium transition"
                                                            >
                                                                ✕ Hapus FG 2
                                                            </button>
                                                            {form.photographer2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendCrewWa('photographer', form.photographer2, 'Second Shooter', editingEvent.event_date, 'FG 2')}
                                                                    disabled={sendingWa === 'photographer_FG 2'}
                                                                    className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                                                >
                                                                    <SvgIcon name="send" className="w-3 h-3" />
                                                                    <span>{sendingWa === 'photographer_FG 2' ? 'Mengirim...' : 'Kirim WA'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {manualModes.photographer2 ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={form.photographer2}
                                                                onChange={e => setForm({ ...form, photographer2: e.target.value })}
                                                                placeholder="Ketik manual nama & nomor HP (cth: Fajar • 08123456789)"
                                                                className="w-full bg-gray-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                                                            />
                                                            <span className="absolute right-2.5 top-2 text-[10px] text-amber-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={form.photographer2}
                                                            onChange={e => handleSelectCrewWithFee('photographer2', 'photographer2Fee', e.target.value, form.photographerSession, true)}
                                                            className="w-full bg-gray-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 appearance-none"
                                                        >
                                                            <option value="">-- Pilih Fotografer 2 --</option>
                                                            {fgCrewOptions.map(c => (
                                                                <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                    {c.name} • {c.phone} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {renderFeeSelector('photographer2Fee', 'fotografer', 'Tarif Gaji FG 2 (Second Shooter)', form.photographer2)}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecondFgSingle(true)}
                                                    className="w-full py-1.5 px-3 border border-dashed border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl text-[11px] font-semibold text-amber-300 transition flex items-center justify-center gap-1"
                                                >
                                                    <span>+ Tambah Fotografer 2 (Second Shooter / Candid)</span>
                                                </button>
                                            )}

                                            {form.photographer && (
                                                <div>
                                                    <label className="text-[11px] text-gray-400 block mb-1">Sesi Kerja FG</label>
                                                    <select
                                                        value={form.photographerSession}
                                                        onChange={e => handleChangeSessionWithFee('photographerSession', 'photographer', 'photographerFee', e.target.value, false)}
                                                        className="w-full bg-gray-950 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-amber-200 outline-none focus:border-amber-500 appearance-none"
                                                    >
                                                        {Array.from(new Set([form.photographerSession, ...SESSION_OPTIONS].filter(Boolean))).map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section Videografer (VG) */}
                                        {(isEventWithVideo || forceShowVideographer) && (
                                            <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/20 space-y-3.5">
                                                <div className="flex items-center justify-between flex-wrap gap-1">
                                                    <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                                                        <SvgIcon name="camera" className="w-4 h-4 text-cyan-400" />
                                                        Videografer (VG)
                                                    </label>
                                                    <div className="flex items-center gap-1.5">
                                                        {form.videographer && (
                                                            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                                                {form.videographerFee 
                                                                    ? `Honor: Rp ${Number(String(form.videographerFee).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}`
                                                                    : (!isNonWeddingOrSingle ? 'Honor Full Day: Rp 1.500.000' : 'Sesuai Tarif Gaji')}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleManual('videographer')}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                                                                manualModes.videographer
                                                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>{manualModes.videographer ? '📋 Pilih Kru' : '✏️ Ketik Manual'}</span>
                                                        </button>
                                                        {form.videographer && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendCrewWa('videographer', form.videographer, form.videographerSession, editingEvent.event_date, 'Full Day')}
                                                                disabled={sendingWa === 'videographer_Full Day'}
                                                                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                                                            >
                                                                <SvgIcon name="send" className="w-3 h-3" />
                                                                <span>{sendingWa === 'videographer_Full Day' ? 'Mengirim...' : 'Kirim WA VG'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {manualModes.videographer ? (
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={form.videographer}
                                                            onChange={e => setForm({ ...form, videographer: e.target.value })}
                                                            placeholder="Ketik manual nama & nomor HP (cth: Visual18 • 6281362132800)"
                                                            className="w-full bg-gray-900 border border-cyan-500/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                                                        />
                                                        <span className="absolute right-2.5 top-2.5 text-[10px] text-cyan-400/80 font-mono pointer-events-none">✏️ Manual</span>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={form.videographer}
                                                        onChange={e => handleSelectCrewWithFee('videographer', 'videographerFee', e.target.value, form.videographerSession, false)}
                                                        className="w-full bg-gray-900 border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500 appearance-none"
                                                    >
                                                        <option value="">-- Pilih Videografer --</option>
                                                        {vgCrewOptions.map(c => (
                                                            <option key={c.id} value={`${c.name} (${c.phone})`}>
                                                                {c.name.toLowerCase().includes('visual') ? '⭐ ' : ''}{c.name} • {c.phone} {c.name.toLowerCase().includes('visual') ? '(Videografer Utama)' : (c.type === 'freelance' ? '(Freelance)' : '(Staff)')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                {renderFeeSelector('videographerFee', 'videografer', 'Tarif Gaji VG', form.videographer)}
                                                {form.videographer && (
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 block mb-1">Sesi Kerja VG</label>
                                                        <select
                                                            value={form.videographerSession}
                                                            onChange={e => handleChangeSessionWithFee('videographerSession', 'videographer', 'videographerFee', e.target.value, false)}
                                                            className="w-full bg-gray-950 border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-500 appearance-none"
                                                        >
                                                            {Array.from(new Set([form.videographerSession, ...SESSION_OPTIONS].filter(Boolean))).map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-gray-400 rounded-xl text-xs font-semibold transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                                    >
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Penugasan Kru'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// ============================================================

export default CrewEventAssignmentsManager;
export { CrewEventAssignmentsManager };
