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

function AppointmentComponent({ onShowToast, initialFilter, session, mode, onNavigate }) {
    const isMakeup = mode === 'makeup' || checkRole(session?.role, 'makeup');
    const isStudio = mode === 'studio' || checkRole(session?.role, 'studio');
    const isDecor = mode === 'dekor' || checkRole(session?.role, 'dekor');
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [vouchers, setVouchers] = React.useState([]);
    const [addonsList, setAddonsList] = React.useState([]);
    const [staffList, setStaffList] = React.useState([]);
    const [crewList, setCrewList] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('All');
    const [filterMonth, setFilterMonth] = React.useState('All');
    const [filterDivision, setFilterDivision] = React.useState(
        // Admin pusat: default filter ke lapanbelas.id, divisi lain bisa dipilih manual
        (!isMakeup && !isStudio && !isDecor) ? 'lapanbelas.id' : 'All'
    );
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(50);

    // Form dynamic sub-states
    const [selectedVoucherCode, setSelectedVoucherCode] = React.useState('');
    const [selectedAddonIds, setSelectedAddonIds] = React.useState([]);
    const [customFees, setCustomFees] = React.useState([]);
    const [notesText, setNotesText] = React.useState('');
    const [addonPeople, setAddonPeople] = React.useState('Tanpa Tambahan Orang');
    const [addonTime, setAddonTime] = React.useState('Tanpa Tambahan Waktu');
    const [addonPrint, setAddonPrint] = React.useState('Tanpa Cetak Foto');
    const [addonFrame, setAddonFrame] = React.useState('Tanpa Bingkai Foto');
    const [sendNotification, setSendNotification] = React.useState(true);

    // Add-on categorization & cross-package states
    const [addonCategoryTab, setAddonCategoryTab] = React.useState('all');
    const [showAddCrossPkg, setShowAddCrossPkg] = React.useState(false);
    const [crossPkgDiv, setCrossPkgDiv] = React.useState('Lady Makeup');
    const [selectedCrossPkgTitle, setSelectedCrossPkgTitle] = React.useState('');

    const getAddonCategory = (label) => {
        const l = (label || '').toLowerCase();
        if (l.includes('[makeup') || l.includes('baju') || l.includes('melati') || l.includes('sunting') || l.includes('paes') || l.includes('gaun') || l.includes('henna')) {
            return 'makeup';
        }
        if (l.includes('[dekorasi') || l.includes('tenda') || l.includes('blower') || l.includes('kursi') || l.includes('pelaminan') || l.includes('dekor')) {
            return 'dekor';
        }
        if (l.includes('[video') || l.includes('drone') || l.includes('cinema') || l.includes('live akad') || l.includes('recording') || l.includes('teaser') || l.includes('same day')) {
            return 'video';
        }
        return 'foto';
    };

    // Studio collision check states
    const [collisionWarnings, setCollisionWarnings] = React.useState([]);
    const [showCollisionModal, setShowCollisionModal] = React.useState(false);
    const [pendingSubmitData, setPendingSubmitData] = React.useState(null);

    // Google Calendar Sync State & Handler
    const [isSyncingCalendar, setIsSyncingCalendar] = React.useState(false);
    const handleSyncGoogleCalendar = async () => {
        setIsSyncingCalendar(true);
        onShowToast("Sedang menyinkronkan seluruh jadwal ke Google Calendar...", "info");
        try {
            const res = await adminFetch('/api/calendar/sync-all', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || "Sinkronisasi Google Calendar berhasil! 🗓️", "success");
            } else {
                onShowToast("Gagal: " + (data.error || "Terjadi kesalahan"), "error");
            }
        } catch (err) {
            onShowToast("Error: " + err.message, "error");
        } finally {
            setIsSyncingCalendar(false);
        }
    };

    // Modal Album Selesai Cetak (Upload Foto Fisik Album -> WA Klien)
    const [albumReadyModal, setAlbumReadyModal] = React.useState({
        open: false,
        apt: null,
        photoBase64: '',
        photoPreview: '',
        pickupLocation: 'Studio Lapanbelas',
        mapsUrl: '',
        daysOpen: 'Senin - Sabtu',
        daysClosed: 'Minggu',
        operationalHours: '09.00 - 17.30 WIB',
        notes: '',
        loading: false
    });

    // Modal Serah Terima Hard Gate (Foto Klien Memegang Album + Recipient + Portfolio -> Status Selesai + Auto Link Feedback WA)
    const [handoverModal, setHandoverModal] = React.useState({
        open: false,
        apt: null,
        photoBase64: '',
        photoPreview: '',
        recipientName: '',
        method: 'Ambil di Studio',
        isPortfolio: true,
        notes: '',
        loading: false
    });

    // Modal Serah Terima File Mentah Fotografer (Raw Files Handover)
    const [rawHandoverModal, setRawHandoverModal] = React.useState({
        open: false,
        apt: null,
        photographer: '',
        videographer: '',
        fileCount: '',
        folderSize: '',
        cardChecked: true,
        backupChecked: true,
        formatChecked: true,
        notes: '',
        loading: false
    });

    // Parser for structured notes
    const parseNotesField = (notesStr) => {
        let prewedDate = '';
        let selectedAddonNames = [];
        let voucherCode = '';
        let customFees = [];
        let keterangan = '';

        let div = 'lapanbelas.id';
        let namaPria = ''; let namaWanita = ''; let jamSesi = ''; let roomStudio = '';
        let photographer = ''; let videographer = ''; let durasiSesi = ''; let jadwalFitting = '';
        let photographerSession = ''; let videographerSession = '';
        let jadwalSurvei = ''; let jadwalPemasangan = '';
        let addonPeople = 'Tanpa Tambahan Orang';
        let addonTime = 'Tanpa Tambahan Waktu';
        let addonPrint = 'Tanpa Cetak Foto';
        let addonFrame = 'Tanpa Bingkai Foto';
        let rawHandover = null;

        if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, videographer, photographerSession, videographerSession, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, addonPeople, addonTime, addonPrint, addonFrame, rawHandover };

        const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/);
        if (divisiMatch) div = divisiMatch[1].trim();
        const namaPriaMatch = notesStr.match(/\[NAMA PRIA\]:\s*([^\n]+)/);
        if (namaPriaMatch) namaPria = namaPriaMatch[1].trim();
        const namaWanitaMatch = notesStr.match(/\[NAMA WANITA\]:\s*([^\n]+)/);
        if (namaWanitaMatch) namaWanita = namaWanitaMatch[1].trim();
        const jamSesiMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/);
        if (jamSesiMatch) jamSesi = jamSesiMatch[1].trim();
        const roomStudioMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/);
        if (roomStudioMatch) roomStudio = roomStudioMatch[1].trim();
        const photographerMatch = notesStr.match(/\[PHOTOGRAPHER\]:\s*([^\n]+)/);
        if (photographerMatch) photographer = photographerMatch[1].trim();
        const photographerSessionMatch = notesStr.match(/\[PHOTOGRAPHER_SESSION\]:\s*([^\n]+)/);
        if (photographerSessionMatch) photographerSession = photographerSessionMatch[1].trim();
        const videographerMatch = notesStr.match(/\[VIDEOGRAPHER\]:\s*([^\n]+)/);
        if (videographerMatch) videographer = videographerMatch[1].trim();
        const videographerSessionMatch = notesStr.match(/\[VIDEOGRAPHER_SESSION\]:\s*([^\n]+)/);
        if (videographerSessionMatch) videographerSession = videographerSessionMatch[1].trim();
        const rawHandoverMatch = notesStr.match(/\[RAW_FILES_HANDOVER\]:\s*([^\n]+)/);
        if (rawHandoverMatch) rawHandover = rawHandoverMatch[1].trim();
        const durasiSesiMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/);
        if (durasiSesiMatch) durasiSesi = durasiSesiMatch[1].trim();
        const jadwalFittingMatch = notesStr.match(/\[JADWAL FITTING\]:\s*([^\n]+)/);
        if (jadwalFittingMatch) jadwalFitting = jadwalFittingMatch[1].trim();
        const jadwalSurveiMatch = notesStr.match(/\[JADWAL SURVEI\]:\s*([^\n]+)/);
        if (jadwalSurveiMatch) jadwalSurvei = jadwalSurveiMatch[1].trim();
        const jadwalPemasanganMatch = notesStr.match(/\[JADWAL PEMASANGAN\]:\s*([^\n]+)/);
        if (jadwalPemasanganMatch) jadwalPemasangan = jadwalPemasanganMatch[1].trim();

        const addonPeopleMatch = notesStr.match(/-\s*Tambahan Orang:\s*([^\n]+)/);
        if (addonPeopleMatch) addonPeople = addonPeopleMatch[1].trim();
        const addonTimeMatch = notesStr.match(/-\s*Tambahan Durasi:\s*([^\n]+)/);
        if (addonTimeMatch) addonTime = addonTimeMatch[1].trim();
        const addonPrintMatch = notesStr.match(/-\s*Cetak Foto:\s*([^\n]+)/);
        if (addonPrintMatch) addonPrint = addonPrintMatch[1].trim();
        const addonFrameMatch = notesStr.match(/-\s*Bingkai Foto:\s*([^\n]+)/);
        if (addonFrameMatch) addonFrame = addonFrameMatch[1].trim();

        const prewedMatch = notesStr.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (prewedMatch) prewedDate = prewedMatch[1];

        const voucherMatch = notesStr.match(/\[VOUCHER\]:\s*([A-Za-z0-9_-]+)/);
        if (voucherMatch) voucherCode = voucherMatch[1];

        const addonSectionMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/);
        if (addonSectionMatch) {
            const lines = addonSectionMatch[1].split('\n');
            lines.forEach(line => {
                const clean = line.replace(/^-\s*/, '').trim();
                if (clean) {
                    const nameMatch = clean.match(/^(.*?)\s*\(Rp/);
                    if (nameMatch) {
                        selectedAddonNames.push(nameMatch[1].trim());
                    } else {
                        selectedAddonNames.push(clean);
                    }
                }
            });
        }

        const customFeesSectionMatch = notesStr.match(/\[BIAYA LAINNYA\]:\s*\n?((?:- .*\n?)*)/);
        if (customFeesSectionMatch) {
            const lines = customFeesSectionMatch[1].split('\n');
            lines.forEach(line => {
                const clean = line.replace(/^-\s*/, '').trim();
                if (clean) {
                    const partsMatch = clean.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (partsMatch) {
                        const desc = partsMatch[1].trim();
                        const val = Number(partsMatch[2].replace(/\./g, ''));
                        customFees.push({ description: desc, amount: val });
                    }
                }
            });
        }

        const ketMatch = notesStr.match(/\[KETERANGAN TAMBAHAN\]:\s*\n?([\s\S]*)$/);
        if (ketMatch) {
            keterangan = ketMatch[1].trim();
        } else {
            let cleanText = notesStr
                .replace(/\[DIVISI\]:.*?\n*/g, '')
                .replace(/\[NAMA PRIA\]:.*?\n*/g, '')
                .replace(/\[NAMA WANITA\]:.*?\n*/g, '')
                .replace(/\[JAM (?:SESI|PHOTOSHOOT)\]:.*?\n*/g, '')
                .replace(/\[ROOM STUDIO\]:.*?\n*/g, '')
                .replace(/\[PHOTOGRAPHER\]:.*?\n*/g, '')
                .replace(/\[VIDEOGRAPHER\]:.*?\n*/g, '')
                .replace(/\[RAW_FILES_HANDOVER\]:.*?\n*/g, '')
                .replace(/\[DURASI SESI\]:.*?\n*/g, '')
                .replace(/\[JADWAL FITTING\]:.*?\n*/g, '')
                .replace(/\[JADWAL SURVEI\]:.*?\n*/g, '')
                .replace(/\[JADWAL PEMASANGAN\]:.*?\n*/g, '')
                .replace(/\[TANGGAL PREWED\]:.*?\n*/g, '')
                .replace(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
                .replace(/\[VOUCHER\]:.*?\n*/g, '')
                .replace(/\[BIAYA LAINNYA\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
                .replace(/\[KETERANGAN TAMBAHAN\]:\s*\n?/g, '')
                .trim();
            keterangan = cleanText;
        }

        return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, videographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, addonPeople, addonTime, addonPrint, addonFrame, rawHandover };
    };
    const parseNotes = parseNotesField;

    const handleOpenRawHandover = (apt) => {
        const parsed = parseNotesField(apt.notes);
        setRawHandoverModal({
            open: true,
            apt,
            photographer: parsed.photographer || '',
            videographer: parsed.videographer || '',
            fileCount: '',
            folderSize: '',
            cardChecked: true,
            backupChecked: true,
            formatChecked: true,
            notes: '',
            loading: false
        });
    };

    const handleSaveRawHandover = async (e) => {
        e.preventDefault();
        if (!rawHandoverModal.apt) return;
        if (!rawHandoverModal.cardChecked || !rawHandoverModal.backupChecked) {
            onShowToast("Checklist verifikasi salin memori & backup wajib dicentang!", "error");
            return;
        }
        setRawHandoverModal(prev => ({ ...prev, loading: true }));
        try {
            const res = await adminFetch('/api/confirm-raw-files-handover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: rawHandoverModal.apt.id,
                    photographer: rawHandoverModal.photographer,
                    videographer: rawHandoverModal.videographer,
                    fileCount: rawHandoverModal.fileCount,
                    folderSize: rawHandoverModal.folderSize,
                    notes: rawHandoverModal.notes,
                    cardChecked: rawHandoverModal.cardChecked,
                    backupChecked: rawHandoverModal.backupChecked,
                    formatChecked: rawHandoverModal.formatChecked
                })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || "Serah terima file mentah berhasil dicatat! ✅", "success");
                setRawHandoverModal(prev => ({ ...prev, open: false, loading: false }));
                fetchAppointments();
            } else {
                onShowToast("Gagal: " + (data.error || "Terjadi kesalahan"), "error");
                setRawHandoverModal(prev => ({ ...prev, loading: false }));
            }
        } catch (err) {
            onShowToast("Error server: " + err.message, "error");
            setRawHandoverModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleRemindPhotographerRaw = async (apt) => {
        const parsed = parseNotesField(apt.notes);
        let rawFg = (parsed.photographer || 'Fotografer').trim();
        let fgPhone = '';
        let cleanFg = rawFg;
        const pMatch = rawFg.match(/\((?:(\+?[0-9\s-]+))\)/);
        if (pMatch) {
            fgPhone = pMatch[1].replace(/[^0-9]/g, '');
            cleanFg = rawFg.replace(/\(.*?\)/g, '').trim();
        }
        onShowToast(`Mengirim pengingat WhatsApp ke ${cleanFg}...`, "info");
        try {
            const res = await adminFetch('/api/remind-photographer-raw-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: apt.id, photographerName: cleanFg, crewPhone: fgPhone })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || `Pengingat berhasil dikirim ke WhatsApp ${cleanFg}! 📲`, "success");
            } else {
                onShowToast("Gagal: " + (data.error || "Gagal mengirim pesan"), "error");
                if (data.waUrl) {
                    window.open(data.waUrl, '_blank');
                }
            }
        } catch (err) {
            onShowToast("Error server: " + err.message, "error");
        }
    };

    const handleSendCrewAssignmentWa = async (apt, role, name) => {
        let rawName = (name || '').trim();
        let crewPhone = '';
        let cleanName = rawName;
        const pMatch = rawName.match(/\((?:(\+?[0-9\s-]+))\)/);
        if (pMatch) {
            crewPhone = pMatch[1].replace(/[^0-9]/g, '');
            cleanName = rawName.replace(/\(.*?\)/g, '').trim();
        }
        onShowToast(`Mengirim surat tugas ke WhatsApp ${cleanName || role}...`, "info");
        try {
            const res = await adminFetch('/api/send-crew-assignment-wa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: apt.id, crewRole: role, crewName: cleanName, crewPhone })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || `Surat tugas berhasil dikirim ke WhatsApp ${cleanName || role}! 📲`, "success");
            } else {
                onShowToast("Gagal: " + (data.error || "Gagal mengirim WhatsApp"), "error");
            }
        } catch (err) {
            onShowToast("Error server: " + err.message, "error");
        }
    };

    const handleSendH1Briefing = async (apt, role, name) => {
        let cleanName = (name || '').trim();
        let crewPhone = '';
        const pMatch = cleanName.match(/\((?:(\+?[0-9\s-]+))\)/);
        if (pMatch) {
            crewPhone = pMatch[1].replace(/[^0-9]/g, '');
            cleanName = cleanName.replace(/\(.*?\)/g, '').trim();
        }
        onShowToast(`Mengirim Briefing H-1 & Sharelock ke WhatsApp ${cleanName || role}...`, "info");
        try {
            const res = await adminFetch('/api/crew/admin/send-h1-briefing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: apt.id, crewRole: role, crewName: cleanName, crewPhone })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(data.message || `Briefing H-1 berhasil dikirim ke WhatsApp ${cleanName || role}! 📲`, "success");
            } else {
                onShowToast("Gagal: " + (data.error || "Gagal mengirim briefing WhatsApp"), "error");
            }
        } catch (err) {
            onShowToast("Error server: " + err.message, "error");
        }
    };

    React.useEffect(() => {
        if (initialFilter?.status) {
            setFilterStatus(initialFilter.status);
            // Jika navigasi membawa status (misal: 'Menunggu DP' dari Overview), buka filter divisi agar tidak blank
            if (initialFilter.division) {
                setFilterDivision(initialFilter.division);
            } else {
                setFilterDivision('All');
            }
        } else {
            setFilterStatus('All');
            if (initialFilter?.division) setFilterDivision(initialFilter.division);
        }

        if (initialFilter?.order_id) setSearchQuery(initialFilter.order_id);
        else setSearchQuery('');
    }, [initialFilter]);

    const [divisi, setDivisi] = React.useState(isMakeup ? 'Lady Makeup' : isStudio ? 'Studio Lapanbelas' : isDecor ? 'Lapanbelas Dekorasi' : 'lapanbelas.id');
    const defaultForm = {
        name: '', client_email: '', phone: '', address: '', password: '',
        pkg: '', eventDate: '', resepsiDate: '', prewedDate: '',
        jamAkad: '', jamResepsi: '', status: 'Menunggu DP', dp: 1000000, total: 1700000, notes: '',
        namaPria: '', namaWanita: '', jamSesi: '', roomStudio: '', photographer: '', videographer: '', durasiSesi: '',
        photographerSession: 'Full Day (Akad + Resepsi)', videographerSession: 'Full Day (Akad + Resepsi)',
        jadwalFitting: '', jadwalSurvei: '', jadwalPemasangan: ''
    };
    const [formData, setFormData] = React.useState(defaultForm);

    const pkgNameLower = (formData.pkg || '').toLowerCase();
    const selectedPackageObj = packages.find(p => p.title === formData.pkg);
    const selectedCategory = selectedPackageObj ? selectedPackageObj.category : '';

    const isDeltaCentro = pkgNameLower.includes('delta') || pkgNameLower.includes('centro');
    const isSingleDate = pkgNameLower.includes("royal") || pkgNameLower.includes("bronze") || pkgNameLower.includes("akad postwed") || pkgNameLower.includes("akad intimate") || pkgNameLower.includes("intimate");

    const isMultiDate = !isDeltaCentro && !isSingleDate && selectedCategory === 'Wedding';
    const isRoyalBronze = pkgNameLower.includes('royal') || pkgNameLower.includes('bronze');

    const fetchAppointments = async (forceRefetch = false) => {
        try {
            const fetchPromises = [
                supabase.from('appointments').select('*').order('created_at', { ascending: false }),
                supabase.from('editor_assignments').select('*')
            ];

            const fetchPkgs = !adminCache.packages || forceRefetch;
            const fetchVouchers = !adminCache.vouchers || forceRefetch;
            const fetchAddons = !adminCache.addons || forceRefetch;

            if (fetchPkgs) {
                fetchPromises.push(supabase.from('packages').select('*'));
            } else {
                fetchPromises.push(Promise.resolve({ data: adminCache.packages }));
            }

            if (fetchVouchers) {
                fetchPromises.push(supabase.from('vouchers').select('*'));
            } else {
                fetchPromises.push(Promise.resolve({ data: adminCache.vouchers }));
            }

            if (fetchAddons) {
                fetchPromises.push(supabase.from('addons').select('*'));
            } else {
                fetchPromises.push(Promise.resolve({ data: adminCache.addons }));
            }

            const [resAppts, resAssigns, resPkgs, resV, resA] = await Promise.all(fetchPromises);

            // Fetch crew members (always fresh)
            const { data: crewData } = await supabase.from('crew_members').select('*').eq('is_active', true).order('name', { ascending: true });
            if (crewData) setCrewList(crewData);

            if (resPkgs.error) {
                console.error("Gagal fetch packages:", resPkgs.error.message);
            } else if (resPkgs.data) {
                adminCache.packages = resPkgs.data;
                setPackages(resPkgs.data);
            }

            if (resAppts.error) {
                console.error("Gagal fetch appointments:", resAppts.error.message);
            } else if (resAppts.data && resPkgs.data) {
                const pkgMap = {};
                resPkgs.data.forEach(p => { pkgMap[p.title] = p; });

                const mapped = resAppts.data.map(a => {
                    const pkg = pkgMap[a.package_name];
                    const division = getPackageDivision(pkg);
                    const divisions = getOrderDivisions(a, pkg);
                    
                    const notesStr = a.additional_notes || '';
                    const hasHandover = notesStr.includes('[HANDOVER_RECORD]');
                    const hasAlbumReady = notesStr.includes('[ALBUM_FINISHED_PHOTO]');

                    // Hitung status progres operasional / editing
                    const ass = resAssigns.data?.find(e => e.appointment_id === a.id);
                    let progressStatus = a.status;
                    if (hasHandover || a.status === 'Selesai') {
                        progressStatus = 'Selesai (Diambil)';
                    } else if (hasAlbumReady) {
                        progressStatus = 'Album Siap Ambil';
                    } else if (a.status === 'Lunas') {
                        if (ass) {
                            const sf = ass.status_foto || 'Belum Diproses';
                            const sv = ass.status_video || 'Belum Diproses';
                            
                            const fotoActive = sf !== 'Belum Diproses';
                            const videoActive = sv !== 'Belum Diproses';
                            
                            const fotoDone = sf === 'Done';
                            const videoDone = sv === 'Done';
                            
                            const isAllDone = (fotoActive ? fotoDone : true) && (videoActive ? videoDone : true) && (fotoActive || videoActive);
                            
                            if (isAllDone) {
                                progressStatus = 'Done';
                            } else if (sf === 'Selesai untuk Preview' || sv === 'Selesai untuk Preview') {
                                progressStatus = 'Selesai untuk Preview';
                            } else if (sf === 'Proses Edit' || sv === 'Proses Edit') {
                                progressStatus = 'Proses Edit';
                            } else if (sf === 'Antrian Pengerjaan' || sv === 'Antrian Pengerjaan') {
                                progressStatus = 'Antrian Pengerjaan';
                            } else if (a.drive_link) {
                                progressStatus = 'Menunggu Seleksi Foto';
                            } else {
                                progressStatus = 'Lunas';
                            }
                        } else if (a.drive_link) {
                            progressStatus = 'Menunggu Seleksi Foto';
                        }
                    }

                    return {
                        id: a.id,
                        name: a.client_name,
                        email: a.client_email,
                        phone: a.client_phone || '',
                        address: a.client_address || '',
                        password: a.client_password || '',
                        notes: a.additional_notes,
                        pkg: a.package_name,
                        eventDate: a.event_date,
                        resepsiDate: a.resepsi_date,
                        jamAkad: a.jam_akad,
                        jamResepsi: a.jam_resepsi,
                        status: a.status,
                        dp: Number(a.dp_amount),
                        total: Number(a.total_amount),
                        division: division,
                        divisions: divisions,
                        drive_link: a.drive_link || '',
                        progressStatus: progressStatus,
                        hasAlbumReady: hasAlbumReady,
                        hasHandover: hasHandover
                    };
                });

                const filtered = isMakeup
                    ? mapped.filter(a => a.divisions.includes('Lady Makeup'))
                    : isStudio
                        ? mapped.filter(a => a.divisions.includes('Studio Lapanbelas'))
                        : isDecor
                            ? mapped.filter(a => a.divisions.includes('Lapanbelas Dekorasi'))
                            : mapped; // admin pusat: load semua, filter via dropdown
                setAppointments(filtered);
            }

            if (resV.data) adminCache.vouchers = resV.data;
            if (resA.data) adminCache.addons = resA.data;
            setVouchers(resV.data || []);
            setAddonsList(resA.data || []);
        } catch (e) {
            console.error("Parallel fetch appointments crashed:", e);
        }
    };

    const fetchStaffList = async () => {
        if (adminCache.staff) {
            setStaffList(adminCache.staff);
            return;
        }
        const { data } = await supabase.from('admin_users').select('display_name, role');
        if (data) {
            adminCache.staff = data;
            setStaffList(data);
        }
    };

    React.useEffect(() => {
        fetchAppointments();
        fetchStaffList();

        // Listen for real-time updates (Supabase Realtime postgres_changes + debounce)
        let debounceTimer;
        const scheduleRefresh = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    fetchAppointments();
                }
            }, 500);
        };

        const channel = supabase
            .channel('appointment-menu-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'editor_assignments' }, scheduleRefresh)
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, []);

    // (parseNotesField moved to top of component)


    // Calculate auto total
    React.useEffect(() => {
        if (!isModalOpen) return;
        const selectedPkgObj = packages.find(p => p.title === formData.pkg);
        const basePrice = selectedPkgObj ? Number(selectedPkgObj.price) : 0;

        const addonsPrice = selectedAddonIds.reduce((sum, id) => {
            const found = addonsList.find(a => a.id.toString() === id.toString());
            return sum + (found ? Number(found.price) : 0);
        }, 0);

        let studioAddonsPrice = 0;
        if (divisi === 'Studio Lapanbelas') {
            const getStudioPrice = (val) => {
                if (!val) return 0;
                const match = val.match(/\+Rp\s*([\d.]+)/);
                return match ? parseInt(match[1].replace(/\./g, ''), 10) : 0;
            };
            studioAddonsPrice = getStudioPrice(addonPeople) + getStudioPrice(addonTime) + getStudioPrice(addonPrint) + getStudioPrice(addonFrame);
        }

        const customFeesPrice = customFees.reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const voucherObj = vouchers.find(v => v.code === selectedVoucherCode);
        const voucherDiscount = voucherObj ? Number(voucherObj.discount_amount) : 0;

        const computedTotal = Math.max(0, basePrice + addonsPrice + studioAddonsPrice + customFeesPrice - voucherDiscount);
        setFormData(prev => ({ ...prev, total: computedTotal }));
    }, [formData.pkg, selectedAddonIds, customFees, selectedVoucherCode, packages, addonsList, vouchers, isModalOpen, divisi, addonPeople, addonTime, addonPrint, addonFrame]);

    const handleAddClick = () => {
        setEditId(null);
        setSendNotification(true);
        const activeDiv = isMakeup ? 'Lady Makeup' : isStudio ? 'Studio Lapanbelas' : isDecor ? 'Lapanbelas Dekorasi' : 'lapanbelas.id';
        setDivisi(activeDiv);
        const defaultPkg = packages.find(p =>
            isMakeup ? getPackageDivision(p) === 'Lady Makeup' :
                isStudio ? getPackageDivision(p) === 'Studio Lapanbelas' :
                    isDecor ? getPackageDivision(p) === 'Lapanbelas Dekorasi' :
                        true
        );
        setFormData({
            ...defaultForm,
            pkg: defaultPkg?.title || '',
            dp: activeDiv === 'Studio Lapanbelas' ? 200000 : 1000000
        });
        setSelectedVoucherCode('');
        setSelectedAddonIds([]);
        setCustomFees([]);
        setNotesText('');
        setAddonPeople('Tanpa Tambahan Orang');
        setAddonTime('Tanpa Tambahan Waktu');
        setAddonPrint('Tanpa Cetak Foto');
        setAddonFrame('Tanpa Bingkai Foto');
        setIsModalOpen(true);
    };

    const handleEditClick = (apt) => {
        setEditId(apt.id);
        setSendNotification(false);
        const parsed = parseNotesField(apt.notes);

        const matchedAddonIds = [];
        parsed.selectedAddonNames.forEach(name => {
            const found = addonsList.find(a => (a.label || a.name || '').toLowerCase() === name.toLowerCase());
            if (found) matchedAddonIds.push(found.id.toString());
        });

        setDivisi(apt.division || parsed.div || 'lapanbelas.id');
        setFormData({
            name: apt.name, client_email: apt.email || '',
            phone: apt.phone || '', address: apt.address || '', password: apt.password || '',
            pkg: apt.pkg, eventDate: apt.eventDate, resepsiDate: apt.resepsiDate || '', prewedDate: parsed.prewedDate || '',
            jamAkad: apt.jamAkad || '', jamResepsi: apt.jamResepsi || '', status: apt.status,
            dp: apt.dp, total: apt.total, notes: apt.notes || '',
            namaPria: parsed.namaPria || '',
            namaWanita: parsed.namaWanita || '',
            jamSesi: parsed.jamSesi || '',
            roomStudio: parsed.roomStudio || '',
            photographer: parsed.photographer || '',
            photographerSession: parsed.photographerSession || 'Full Day (Akad + Resepsi)',
            videographer: parsed.videographer || '',
            videographerSession: parsed.videographerSession || 'Full Day (Akad + Resepsi)',
            durasiSesi: parsed.durasiSesi || '',
            jadwalFitting: parsed.jadwalFitting || '',
            jadwalSurvei: parsed.jadwalSurvei || '',
            jadwalPemasangan: parsed.jadwalPemasangan || ''
        });

        setAddonPeople(parsed.addonPeople || 'Tanpa Tambahan Orang');
        setAddonTime(parsed.addonTime || 'Tanpa Tambahan Waktu');
        setAddonPrint(parsed.addonPrint || 'Tanpa Cetak Foto');
        setAddonFrame(parsed.addonFrame || 'Tanpa Bingkai Foto');
        setSelectedVoucherCode(parsed.voucherCode);
        setSelectedAddonIds(matchedAddonIds);
        setCustomFees(parsed.customFees);
        setNotesText(parsed.keterangan);
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        const toDelete = appointments.find(a => a.id === confirmDeleteId);
        if (toDelete) {
            adminFetch('/api/calendar/sync-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: confirmDeleteId, action: 'delete' })
            }).catch(() => {});
        }
        const { error } = await supabase.from('appointments').delete().eq('id', confirmDeleteId);
        if (error) {
            onShowToast("Gagal menghapus: " + error.message, "error");
        } else {
            onShowToast("Appointment berhasil dihapus!", "success");
            if (toDelete) {
                syncDateAvailabilityForDates(supabase, [toDelete.event_date, toDelete.resepsi_date]);
            }
            setConfirmDeleteId(null);
            fetchAppointments();
        }
    };

    // === STUDIO COLLISION CHECK HELPERS ===
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
        if (match) {
            return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        }
        return 0;
    };

    const getEndTimeStr = (startTime, durationMinutes) => {
        if (!startTime) return '';
        const parts = startTime.split(':');
        if (parts.length < 2) return startTime;
        const totalMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + durationMinutes;
        const endHours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
        const endMinutes = String(totalMinutes % 60).padStart(2, '0');
        return `${endHours}:${endMinutes}`;
    };

    const checkStudioCollision = () => {
        if (divisi !== 'Studio Lapanbelas') return [];
        if (!formData.eventDate || !formData.jamSesi) return [];

        const warnings = [];
        const newStart = timeToMinutes(formData.jamSesi);
        const newDuration = parseInt(formData.durasiSesi, 10) || 45;
        const newEnd = newStart + newDuration;

        const sameDayAppts = appointments.filter(a =>
            a.eventDate === formData.eventDate && a.id !== editId
        );

        for (const apt of sameDayAppts) {
            const parsed = parseNotesField(apt.notes);
            if (!parsed.jamSesi) continue;

            const existStart = timeToMinutes(parsed.jamSesi);
            const existDuration = parseInt(parsed.durasiSesi, 10) || 45;
            const existEnd = existStart + existDuration;

            const isOverlap = newStart < existEnd && newEnd > existStart;
            if (!isOverlap) continue;

            if (formData.roomStudio && parsed.roomStudio === formData.roomStudio) {
                warnings.push({
                    type: 'room',
                    message: `Room "${formData.roomStudio}" sudah terisi oleh ${apt.name} pada jam ${parsed.jamSesi} - ${getEndTimeStr(parsed.jamSesi, existDuration)}`
                });
            }

            if (formData.photographer && parsed.photographer === formData.photographer) {
                warnings.push({
                    type: 'photographer',
                    message: `Fotografer "${formData.photographer}" sudah dijadwalkan untuk ${apt.name} pada jam ${parsed.jamSesi} - ${getEndTimeStr(parsed.jamSesi, existDuration)}`
                });
            }
        }

        return warnings;
    };

    // Computed real-time collision indicators
    const liveCollisions = React.useMemo(() => checkStudioCollision(), [
        formData.eventDate, formData.jamSesi, formData.roomStudio, formData.photographer, formData.durasiSesi, appointments, editId, divisi
    ]);

    const roomCollisions = liveCollisions.filter(w => w.type === 'room');
    const photographerCollisions = liveCollisions.filter(w => w.type === 'photographer');

    // Actual submit logic (called directly or after collision confirmation)
    const executeSubmit = async () => {
        const submitData = pendingSubmitData;
        if (!submitData) return;

        let responseError = null;
        let finalId = editId;

        if (editId) {
            const { error } = await supabase.from('appointments').update(submitData.dbPayload).eq('id', editId);
            responseError = error;
        } else {
            finalId = `BK-${Date.now().toString().slice(-6)}`;
            const { error } = await supabase.from('appointments').insert([{ id: finalId, ...submitData.dbPayload }]);
            responseError = error;
        }

        if (responseError) {
            onShowToast("Gagal menyimpan ke Supabase: " + responseError.message, "error");
        } else {
            const shouldSend = submitData.sendNotification !== undefined ? submitData.sendNotification : sendNotification;
            if (shouldSend) {
                onShowToast(editId ? "Data berhasil diperbarui & notifikasi terkirim!" : "Data berhasil disimpan & notifikasi terkirim!", "success");
            } else {
                onShowToast(editId ? "Data berhasil diperbarui (tanpa notifikasi)." : "Data berhasil disimpan (tanpa notifikasi).", "success");
            }

            if (shouldSend && (submitData.formData.status === 'Menunggu DP' || submitData.formData.status === 'Sudah DP' || submitData.formData.status === 'Lunas')) {
                let type = 'menunggu_dp';
                if (submitData.formData.status === 'Sudah DP') type = 'sudah_dp';
                if (submitData.formData.status === 'Lunas') type = 'lunas';
                adminFetch('/api/send-invoice-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        order: {
                            id: finalId,
                            client_name: submitData.formData.name,
                            client_email: (submitData.formData.client_email || '').trim().toLowerCase().replace(/\s+/g, ''),
                            client_phone: submitData.formData.phone,
                            client_address: submitData.formData.address,
                            client_password: submitData.formData.password,
                            package_name: submitData.formData.pkg,
                            total_amount: submitData.formData.total,
                            dp_amount: submitData.formData.dp,
                            notes: submitData.dbPayload.additional_notes
                        }
                    })
                }).then(async res => {
                    const data = await res.json();
                    if (!data.success) {
                        onShowToast(`⚠️ Invoice otomatis gagal terkirim ke "${submitData.formData.client_email}": ${data.error}`, "error");
                    }
                }).catch(e => {
                    console.error('Auto-email send failed:', e);
                    onShowToast(`⚠️ Gagal koneksi email: ${e.message}`, "error");
                });
            }

            // Sinkronisasi slot ketersediaan tanggal
            const oldAppt = editId ? appointments.find(a => a.id === editId) : null;
            const affectedDates = [
                submitData.formData.event_date,
                submitData.formData.resepsi_date,
                oldAppt?.event_date,
                oldAppt?.resepsi_date
            ].filter(Boolean);
            syncDateAvailabilityForDates(supabase, affectedDates);

            // Auto-sync Google Calendar in background (single event sync + bulk sync)
            if (submitData.formData.status !== 'Dibatalkan' && submitData.formData.status !== 'Batal') {
                adminFetch('/api/calendar/sync-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: finalId, oldDate: oldAppt?.event_date })
                }).catch(err => console.error('Auto calendar sync-order error:', err));
                adminFetch('/api/calendar/sync-all', { method: 'POST' }).catch(err => console.error('Auto calendar sync error:', err));
            } else {
                adminFetch('/api/calendar/sync-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: finalId, action: 'delete' })
                }).catch(() => {});
            }

            setIsModalOpen(false);
            setEditId(null);
            setSelectedVoucherCode('');
            setSelectedAddonIds([]);
            setCustomFees([]);
            setNotesText('');
            fetchAppointments();
        }

        setPendingSubmitData(null);
        setShowCollisionModal(false);
        setCollisionWarnings([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let formattedNotes = "";
        formattedNotes += `[DIVISI]: ${divisi}\n\n`;

        if (divisi === 'Lapanbelas Dekorasi') {
            if (formData.namaPria) formattedNotes += `[NAMA PRIA]: ${formData.namaPria}\n`;
            if (formData.namaWanita) formattedNotes += `[NAMA WANITA]: ${formData.namaWanita}\n`;
            if (formData.namaPria || formData.namaWanita) formattedNotes += `\n`;
        }

        if (divisi === 'Studio Lapanbelas') {
            if (formData.roomStudio) formattedNotes += `[ROOM STUDIO]: ${formData.roomStudio}\n`;
            if (formData.jamSesi) formattedNotes += `[JAM PHOTOSHOOT]: ${formData.jamSesi}\n`;
            if (addonPeople && addonPeople !== 'Tanpa Tambahan Orang') formattedNotes += `- Tambahan Orang: ${addonPeople}\n`;
            if (addonTime && addonTime !== 'Tanpa Tambahan Waktu') formattedNotes += `- Tambahan Durasi: ${addonTime}\n`;
            if (addonPrint && addonPrint !== 'Tanpa Cetak Foto') formattedNotes += `- Cetak Foto: ${addonPrint}\n`;
            if (addonFrame && addonFrame !== 'Tanpa Bingkai Foto') formattedNotes += `- Bingkai Foto: ${addonFrame}\n`;
            if (formData.photographer) formattedNotes += `[PHOTOGRAPHER]: ${formData.photographer}\n`;
            if (formData.videographer) formattedNotes += `[VIDEOGRAPHER]: ${formData.videographer}\n`;
            if (formData.durasiSesi) formattedNotes += `[DURASI SESI]: ${formData.durasiSesi} Menit\n`;
            formattedNotes += `\n`;
        } else if (divisi === 'lapanbelas.id') {
            if (formData.photographer) {
                formattedNotes += `[PHOTOGRAPHER]: ${formData.photographer}\n`;
                if (formData.photographerSession) formattedNotes += `[PHOTOGRAPHER_SESSION]: ${formData.photographerSession}\n`;
            }
            if (formData.videographer) {
                formattedNotes += `[VIDEOGRAPHER]: ${formData.videographer}\n`;
                if (formData.videographerSession) formattedNotes += `[VIDEOGRAPHER_SESSION]: ${formData.videographerSession}\n`;
            }
            formattedNotes += `\n`;
        } else if (divisi === 'Lady Makeup') {
            if (formData.jadwalFitting) formattedNotes += `[JADWAL FITTING]: ${formData.jadwalFitting}\n\n`;
        } else if (divisi === 'Lapanbelas Dekorasi') {
            if (formData.jadwalSurvei) formattedNotes += `[JADWAL SURVEI]: ${formData.jadwalSurvei}\n`;
            if (formData.jadwalPemasangan) formattedNotes += `[JADWAL PEMASANGAN]: ${formData.jadwalPemasangan}\n\n`;
        }

        if (formData.prewedDate && divisi === 'lapanbelas.id') {
            formattedNotes += `[TANGGAL PREWED]: ${formData.prewedDate}\n\n`;
        }

        let invoice_addons_json = null;
        if (selectedAddonIds.length > 0) {
            const selectedAddonsObjs = selectedAddonIds.map(id => addonsList.find(a => a.id.toString() === id.toString())).filter(Boolean);
            invoice_addons_json = selectedAddonsObjs.map(a => ({ name: a.label || a.name || '', amount: a.price }));
            formattedNotes += `[LAYANAN TAMBAHAN \/ ADD-ON]:\n` + selectedAddonsObjs.map(a => `- ${a.label || a.name || ''} (${formatRupiah(a.price)})`).join('\n') + `\n\n`;
        }

        if (selectedVoucherCode) {
            const voucherObj = vouchers.find(v => v.code === selectedVoucherCode);
            const disc = voucherObj ? voucherObj.discount_amount : 0;
            formattedNotes += `[VOUCHER]: ${selectedVoucherCode} (-${formatRupiah(disc)})\n\n`;
        }

        let custom_fees_json = null;
        if (customFees.length > 0) {
            custom_fees_json = customFees.map(f => ({ name: f.description, amount: f.amount }));
            formattedNotes += `[BIAYA LAINNYA]:\n` + customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
        }

        if (notesText && notesText.trim() !== "") {
            formattedNotes += `[KETERANGAN TAMBAHAN]:\n${notesText.trim()}`;
        }

        // Pertahankan record serah terima jika sedang mengedit
        if (editId) {
            const originalApt = appointments.find(a => a.id === editId);
            if (originalApt && originalApt.notes) {
                if (originalApt.notes.includes('[RAW_FILES_HANDOVER]') && !formattedNotes.includes('[RAW_FILES_HANDOVER]')) {
                    const match = originalApt.notes.match(/\[RAW_FILES_HANDOVER\]([\s\S]*?)(\n\[[A-Z_\s]+\]|$)/i);
                    if (match) formattedNotes += `\n\n[RAW_FILES_HANDOVER]${match[1]}`.trim();
                }
                if (originalApt.notes.includes('[ALBUM READY RECORD]') && !formattedNotes.includes('[ALBUM READY RECORD]')) {
                    const matchA = originalApt.notes.match(/\[ALBUM READY RECORD\]([\s\S]*?)(\n\[[A-Z_\s]+\]|$)/i);
                    if (matchA) formattedNotes += `\n\n[ALBUM READY RECORD]${matchA[1]}`.trim();
                }
                if (originalApt.notes.includes('[HANDOVER RECORD]') && !formattedNotes.includes('[HANDOVER RECORD]')) {
                    const matchH = originalApt.notes.match(/\[HANDOVER RECORD\]([\s\S]*?)(\n\[[A-Z_\s]+\]|$)/i);
                    if (matchH) formattedNotes += `\n\n[HANDOVER RECORD]${matchH[1]}`.trim();
                }
            }
        }

        if (isRoyalBronze) {
            formData.resepsiDate = '';
        }

        const dbPayload = {
            client_name: formData.name,
            client_email: (formData.client_email || '').trim().toLowerCase().replace(/\s+/g, ''),
            client_phone: formData.phone || null,
            client_address: formData.address || null,
            client_password: formData.password || null,
            package_name: formData.pkg,
            event_date: formData.eventDate || null,
            resepsi_date: formData.resepsiDate || null,
            additional_notes: formattedNotes.trim(),
            jam_akad: divisi === 'Studio Lapanbelas' ? (formData.jamSesi || null) : (formData.jamAkad || null),
            jam_resepsi: formData.jamResepsi || null,
            status: formData.status,
            dp_amount: formData.dp ? Number(formData.dp) : 0,
            total_amount: formData.total ? Number(formData.total) : 0,
            invoice_addons: invoice_addons_json,
            custom_fees: custom_fees_json
        };

        // Prepare submit data package
        const submitDataPackage = {
            dbPayload,
            formData: { ...formData },
            sendNotification
        };

        // Run collision check for Studio bookings
        const warnings = checkStudioCollision();
        if (warnings.length > 0) {
            setCollisionWarnings(warnings);
            setPendingSubmitData(submitDataPackage);
            setShowCollisionModal(true);
            return; // Wait for user confirmation
        }

        // No collision — save directly
        setPendingSubmitData(submitDataPackage);
        // Use setTimeout to ensure state is set before executeSubmit reads it
        setTimeout(async () => {
            // Inline direct save (same as executeSubmit but without pending state dependency)
            let responseError = null;
            let finalId = editId;

            if (editId) {
                const { error } = await supabase.from('appointments').update(dbPayload).eq('id', editId);
                responseError = error;
            } else {
                finalId = `BK-${Date.now().toString().slice(-6)}`;
                const { error } = await supabase.from('appointments').insert([{ id: finalId, ...dbPayload }]);
                responseError = error;
            }

            if (responseError) {
                onShowToast("Gagal menyimpan ke Supabase: " + responseError.message, "error");
            } else {
                if (sendNotification) {
                    onShowToast(editId ? "Data berhasil diperbarui & notifikasi terkirim!" : "Data berhasil disimpan & notifikasi terkirim!", "success");
                } else {
                    onShowToast(editId ? "Data berhasil diperbarui (tanpa notifikasi)." : "Data berhasil disimpan (tanpa notifikasi).", "success");
                }

                // Auto trigger Web Push Notification ke Kru jika ada Fotografer / Videografer yang ditugaskan
                const notifyCrew = [];
                if (formData.photographer) {
                    notifyCrew.push({
                        name: formData.photographer,
                        role: 'Fotografer',
                        session: formData.photographerSession || 'Dokumentasi'
                    });
                }
                if (formData.videographer) {
                    notifyCrew.push({
                        name: formData.videographer,
                        role: 'Videografer',
                        session: formData.videographerSession || 'Dokumentasi'
                    });
                }
                if (notifyCrew.length > 0) {
                    const notifyFetch = adminFetch || fetch;
                    notifyFetch('/api/crew/admin/notify-assignment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: finalId,
                            clientName: formData.name,
                            eventDate: formData.eventDate,
                            packageTitle: formData.pkg,
                            assignedCrew: notifyCrew
                        })
                    }).catch(e => console.warn('[Auto Notify Crew Push Error]', e));
                }

                if (sendNotification && (formData.status === 'Menunggu DP' || formData.status === 'Sudah DP' || formData.status === 'Lunas')) {
                    let type = 'menunggu_dp';
                    if (formData.status === 'Sudah DP') type = 'sudah_dp';
                    if (formData.status === 'Lunas') type = 'lunas';
                    adminFetch('/api/send-invoice-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type,
                            order: {
                                id: finalId,
                                client_name: formData.name,
                                client_email: (formData.client_email || '').trim().toLowerCase().replace(/\s+/g, ''),
                                client_phone: formData.phone,
                                client_address: formData.address,
                                client_password: formData.password,
                                package_name: formData.pkg,
                                total_amount: formData.total,
                                dp_amount: formData.dp,
                                notes: formattedNotes.trim()
                            }
                        })
                    }).then(async res => {
                        const data = await res.json();
                        if (!data.success) {
                            onShowToast(`⚠️ Invoice otomatis gagal terkirim ke "${formData.client_email}": ${data.error}`, "error");
                        }
                    }).catch(e => console.error('Auto-email send failed:', e));
                }

                // Sinkronisasi slot ketersediaan tanggal
                const oldAppt = editId ? appointments.find(a => a.id === editId) : null;
                const affectedDates = [
                    formData.event_date,
                    formData.resepsi_date,
                    oldAppt?.event_date,
                    oldAppt?.resepsi_date
                ].filter(Boolean);
                syncDateAvailabilityForDates(supabase, affectedDates);

                // Auto-sync Google Calendar in background (single event sync + bulk sync)
                if (formData.status !== 'Dibatalkan' && formData.status !== 'Batal') {
                    adminFetch('/api/calendar/sync-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: finalId, oldDate: oldAppt?.event_date })
                    }).catch(err => console.error('Auto calendar sync-order error:', err));
                    adminFetch('/api/calendar/sync-all', { method: 'POST' }).catch(err => console.error('Auto calendar sync error:', err));
                } else {
                    adminFetch('/api/calendar/sync-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: finalId, action: 'delete' })
                    }).catch(() => {});
                }

                setIsModalOpen(false);
                setEditId(null);
                setSelectedVoucherCode('');
                setSelectedAddonIds([]);
                setCustomFees([]);
                setNotesText('');
                fetchAppointments();
            }
            setPendingSubmitData(null);
        }, 0);
    };


    const filteredAppointments = appointments.filter(apt => {
        if (filterStatus !== 'All' && apt.status !== filterStatus) return false;
        if (filterDivision !== 'All' && !apt.divisions?.includes(filterDivision)) return false;

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            const matchesSearch =
                (apt.id || '').toLowerCase().includes(lowerQ) ||
                (apt.name || '').toLowerCase().includes(lowerQ) ||
                (apt.pkg || '').toLowerCase().includes(lowerQ) ||
                (apt.eventDate || '').toLowerCase().includes(lowerQ);
            if (!matchesSearch) return false;
        }

        if (filterMonth !== 'All' && apt.eventDate) {
            const aptMonth = apt.eventDate.substring(0, 7);
            if (aptMonth !== filterMonth) return false;
        } else if (filterMonth !== 'All' && !apt.eventDate) {
            return false;
        }

        return true;
    });

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterMonth, filterDivision]);

    const totalPages = pageSize === 'All' ? 1 : Math.ceil(filteredAppointments.length / Number(pageSize)) || 1;
    const startIndex = pageSize === 'All' ? 0 : (currentPage - 1) * Number(pageSize);
    const endIndex = pageSize === 'All' ? filteredAppointments.length : Math.min(startIndex + Number(pageSize), filteredAppointments.length);
    const paginatedAppointments = pageSize === 'All'
        ? filteredAppointments
        : filteredAppointments.slice(startIndex, endIndex);

    const handleSendEmail = async (apt) => {
        let type = 'menunggu_dp';
        if (apt.status === 'Sudah DP') type = 'sudah_dp';
        if (apt.status === 'Lunas') type = 'lunas';
        const toastId = onShowToast("Mengirim Invoice ke email klien...", "success");
        try {
            const response = await adminFetch('/api/send-invoice-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    order: {
                        id: apt.id,
                        client_name: apt.name,
                        client_email: apt.email,
                        client_phone: apt.phone,
                        client_address: apt.address,
                        client_password: apt.password,
                        package_name: apt.pkg,
                        total_amount: apt.total,
                        dp_amount: apt.dp,
                        notes: apt.notes
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast("Invoice berhasil dikirim ke email klien!", "success");
            } else {
                onShowToast("Gagal mengirim email: " + (resData.error || "Unknown error"), "error");
            }
        } catch (error) {
            onShowToast("Error server: " + error.message, "error");
        }
    };

    const handleSendPhotoReminder = async (apt) => {
        onShowToast("Mengirim Pengingat Pilih Foto (Email & WhatsApp)...", "info");
        try {
            const response = await adminFetch('/api/send-photo-selection-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: apt.id,
                    order: {
                        id: apt.id,
                        client_name: apt.name,
                        client_email: apt.email,
                        client_phone: apt.phone,
                        package_name: apt.pkg,
                        drive_link: apt.drive_link || apt.driveLink,
                        event_date: apt.eventDate,
                        additional_notes: apt.notes
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                const parts = [];
                if (resData.emailSent) parts.push("Email");
                if (resData.waSent) parts.push("WhatsApp");
                onShowToast(`Pengingat berhasil dikirim via ${parts.join(' & ') || 'sistem'}! ⏰`, "success");
                if (fetchAppointments) fetchAppointments();
            } else {
                onShowToast("Gagal mengirim: " + (resData.error || "Unknown error"), "error");
            }
        } catch (error) {
            onShowToast("Error server: " + error.message, "error");
        }
    };

    const handleSendFeedbackRequest = async (apt) => {
        onShowToast("Mengirim Permintaan Ulasan via WhatsApp...", "info");
        try {
            const response = await adminFetch('/api/send-feedback-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: apt.id,
                    order: {
                        id: apt.id,
                        client_name: apt.name,
                        client_phone: apt.phone,
                        package_name: apt.pkg
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast(resData.message || "Permintaan ulasan berhasil dikirim via WhatsApp! ⭐", "success");
                if (fetchAppointments) fetchAppointments();
            } else {
                onShowToast("Gagal: " + (resData.error || "Gagal mengirim WhatsApp"), "error");
            }
        } catch (error) {
            onShowToast("Error server: " + error.message, "error");
        }
    };

    const handleFileToBase64 = (file, callback) => {
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            onShowToast("Ukuran foto maksimal 25MB", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawResult = e.target.result;
            // Kompresi otomatis via canvas jika format gambar, agar upload super cepat & hemat bandwidth
            if (file.type && file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    try {
                        const MAX_DIM = 1600;
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_DIM || height > MAX_DIM) {
                            if (width > height) {
                                height = Math.round((height * MAX_DIM) / width);
                                width = MAX_DIM;
                            } else {
                                width = Math.round((width * MAX_DIM) / height);
                                height = MAX_DIM;
                            }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
                        callback(compressedBase64);
                    } catch (canvasErr) {
                        console.warn('[Image Compression Error, fallback to raw]:', canvasErr);
                        callback(rawResult);
                    }
                };
                img.onerror = () => callback(rawResult);
                img.src = rawResult;
            } else {
                callback(rawResult);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleOpenAlbumReady = async (apt) => {
        let existingNotes = '';
        if (apt.notes) {
            const matchNotes = apt.notes.match(/\[ALBUM_STATUS\]:[^\n|]+\s*\|\s*Catatan:\s*([^\n|]+)/);
            if (matchNotes) existingNotes = matchNotes[1].trim();
        }

        // Ambil default lokasi, maps, hari operasional & jam dari database settings
        let defaultLoc = 'Studio Lapanbelas';
        let defaultHours = '09.00 - 17.30 WIB';
        let defaultMapsUrl = '';
        let defaultDaysOpen = 'Senin - Sabtu';
        let defaultDaysClosed = 'Minggu';
        try {
            const { data: sData } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', [
                    'studio_address', 'pickup_location',
                    'studio_hours', 'pickup_hours',
                    'studio_maps_url', 'pickup_maps_url',
                    'studio_days_open', 'pickup_days_open',
                    'studio_days_closed', 'pickup_days_closed'
                ]);
            if (sData) {
                sData.forEach(s => {
                    if ((s.key === 'studio_address' || s.key === 'pickup_location') && s.value) defaultLoc = s.value;
                    if ((s.key === 'studio_hours' || s.key === 'pickup_hours') && s.value) defaultHours = s.value;
                    if ((s.key === 'studio_maps_url' || s.key === 'pickup_maps_url') && s.value) defaultMapsUrl = s.value;
                    if ((s.key === 'studio_days_open' || s.key === 'pickup_days_open') && s.value) defaultDaysOpen = s.value;
                    if ((s.key === 'studio_days_closed' || s.key === 'pickup_days_closed') && s.value) defaultDaysClosed = s.value;
                });
            }
        } catch (e) {
            console.warn('[handleOpenAlbumReady] Error loading settings:', e);
        }

        setAlbumReadyModal({
            open: true,
            apt,
            photoBase64: '',
            photoPreview: '',
            pickupLocation: defaultLoc,
            mapsUrl: defaultMapsUrl,
            daysOpen: defaultDaysOpen,
            daysClosed: defaultDaysClosed,
            operationalHours: defaultHours,
            notes: existingNotes,
            loading: false
        });
    };

    const handleSubmitAlbumReady = async (e) => {
        e.preventDefault();
        if (!albumReadyModal.photoBase64) {
            onShowToast("Silakan ambil atau pilih foto fisik album terlebih dahulu!", "error");
            return;
        }
        setAlbumReadyModal(prev => ({ ...prev, loading: true }));
        try {
            // 1. Upload photo to storage
            const upRes = await adminFetch('/api/upload-handover-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: albumReadyModal.photoBase64,
                    type: 'album-ready'
                })
            });

            let upData;
            try {
                upData = await upRes.json();
            } catch (jsonErr) {
                const text = await upRes.text().catch(() => '');
                throw new Error(`Server (${upRes.status}): ${text.slice(0, 100) || 'Gagal memproses gambar'}`);
            }

            if (!upRes.ok || !upData?.success || !upData?.url) {
                throw new Error(upData?.error || 'Gagal mengunggah foto fisik album');
            }

            // 2. Confirm album ready & trigger automated WA notification with media
            const confRes = await adminFetch('/api/confirm-album-ready', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: albumReadyModal.apt.id,
                    albumPhotoUrl: upData.url,
                    pickupLocation: albumReadyModal.pickupLocation,
                    mapsUrl: albumReadyModal.mapsUrl,
                    daysOpen: albumReadyModal.daysOpen,
                    daysClosed: albumReadyModal.daysClosed,
                    operationalHours: albumReadyModal.operationalHours,
                    notes: albumReadyModal.notes
                })
            });

            let confData;
            try {
                confData = await confRes.json();
            } catch (jsonErr) {
                const text = await confRes.text().catch(() => '');
                throw new Error(`Server (${confRes.status}): ${text.slice(0, 100) || 'Gagal menyimpan status'}`);
            }

            if (!confRes.ok || !confData?.success) {
                throw new Error(confData?.error || 'Gagal menyimpan status album');
            }

            onShowToast("📦 Foto album berhasil diunggah & WhatsApp notifikasi terkirim ke klien!", "success");
            setAlbumReadyModal({ open: false, apt: null, photoBase64: '', photoPreview: '', pickupLocation: 'Studio Lapanbelas', mapsUrl: '', daysOpen: 'Senin - Sabtu', daysClosed: 'Minggu', operationalHours: '09.00 - 17.30 WIB', notes: '', loading: false });
            fetchAppointments(true);
        } catch (err) {
            onShowToast("Gagal: " + err.message, "error");
            setAlbumReadyModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleOpenHandover = (apt) => {
        let recipient = apt.name || '';
        let isPort = true;
        let method = 'Ambil di Studio';
        let notes = '';

        if (apt.notes) {
            const m = apt.notes.match(/\[HANDOVER_RECORD\]:\s*Diambil oleh ([^()]+)\(([^)]+)\)[^|]*\|\s*Foto:\s*([^|]+)\s*\|\s*Portofolio:\s*([^\n|]+)(?:\s*\|\s*Catatan:\s*([^\n|]+))?/);
            if (m) {
                recipient = m[1].trim();
                method = m[2].trim();
                isPort = m[4].trim().toUpperCase() === 'YES';
                if (m[5]) notes = m[5].trim();
            }
        }

        setHandoverModal({
            open: true,
            apt,
            photoBase64: '',
            photoPreview: '',
            recipientName: recipient,
            method: method,
            isPortfolio: isPort,
            notes: notes,
            loading: false
        });
    };

    const handleSubmitHandover = async (e) => {
        e.preventDefault();
        if (!handoverModal.photoBase64) {
            onShowToast("WAJIB: Foto bukti klien memegang album fisik tidak boleh kosong!", "error");
            return;
        }
        if (!handoverModal.recipientName.trim()) {
            onShowToast("Nama penerima album wajib diisi!", "error");
            return;
        }
        setHandoverModal(prev => ({ ...prev, loading: true }));
        try {
            // 1. Upload handover proof photo
            const upRes = await adminFetch('/api/upload-handover-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: handoverModal.photoBase64,
                    type: 'client-handover'
                })
            });

            let upData;
            try {
                upData = await upRes.json();
            } catch (jsonErr) {
                const text = await upRes.text().catch(() => '');
                throw new Error(`Server (${upRes.status}): ${text.slice(0, 100) || 'Gagal mengunggah bukti'}`);
            }

            if (!upRes.ok || !upData?.success || !upData?.url) {
                throw new Error(upData?.error || 'Gagal mengunggah foto bukti serah terima');
            }

            // 2. Confirm handover (marks Selesai, auto dispatches feedback WhatsApp)
            const confRes = await adminFetch('/api/confirm-album-handover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: handoverModal.apt.id,
                    recipientName: handoverModal.recipientName,
                    handoverPhotoUrl: upData.url,
                    method: handoverModal.method,
                    isPortfolio: handoverModal.isPortfolio,
                    notes: handoverModal.notes
                })
            });

            let confData;
            try {
                confData = await confRes.json();
            } catch (jsonErr) {
                const text = await confRes.text().catch(() => '');
                throw new Error(`Server (${confRes.status}): ${text.slice(0, 100) || 'Gagal memproses serah terima'}`);
            }

            if (!confRes.ok || !confData?.success) {
                throw new Error(confData?.error || 'Gagal mengonfirmasi serah terima');
            }

            onShowToast("🎉 Serah terima berhasil! Status: Selesai & Link Feedback otomatis terkirim ke WhatsApp klien!", "success");
            setHandoverModal({ open: false, apt: null, photoBase64: '', photoPreview: '', recipientName: '', method: 'Ambil di Studio', isPortfolio: true, notes: '', loading: false });
            fetchAppointments(true);
        } catch (err) {
            onShowToast("Gagal: " + err.message, "error");
            setHandoverModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handlePreviewInvoice = (apt) => {
        const pkgData = packages.find(p => p.title === apt.pkg) || {};

        let prewedDate = '';
        if (apt.notes) {
            const match = apt.notes.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
            if (match) prewedDate = match[1];
        }

        const orderData = {
            id: apt.id,
            client_name: apt.name,
            client_email: apt.email || '-',
            client_phone: apt.phone || '-',
            client_address: apt.address || '-',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: apt.status,
            pkg: {
                title: apt.pkg,
                category: pkgData.category || 'Package',
                description: pkgData.description || ''
            },
            eventDate: apt.eventDate,
            resepsiDate: apt.resepsiDate,
            prewedDate: prewedDate,
            total: apt.total,
            dp: apt.dp,
            notes: apt.notes,
            payment_method: 'CASH PAYMENT'
        };
        localStorage.setItem('printInvoiceData', JSON.stringify(orderData));
        window.open(`/invoice.html?id=${apt.id}&preview=true`, '_blank');
    };

    const monthOptions = Array.from(new Set(appointments.filter(a => a.eventDate).map(a => a.eventDate.substring(0, 7)))).sort().reverse();

    // --- Drive Link & Sessions Modal State ---
    const [driveModal, setDriveModal] = React.useState({
        open: false,
        apt: null,
        link: '',
        sessions: [],
        loadingSessions: false,
        sending: false,
        savingOnly: false
    });

    const openDriveModal = async (apt) => {
        setDriveModal({
            open: true,
            apt,
            link: apt.drive_link || '',
            sessions: [],
            loadingSessions: true,
            sending: false,
            savingOnly: false
        });
        try {
            const response = await adminFetch(`/api/admin/appointment-sessions/${apt.id}`);
            const data = await response.json();
            if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
                setDriveModal(prev => ({
                    ...prev,
                    link: prev.link || data.drive_link || '',
                    sessions: data.sessions.map((s, idx) => ({
                        id: s.id || `session-${idx + 1}`,
                        title: s.title || `Sesi ${idx + 1}`,
                        subtitle: s.subtitle || '',
                        limit: s.limit || 80
                    })),
                    loadingSessions: false
                }));
            } else {
                setDriveModal(prev => ({
                    ...prev,
                    sessions: [{ id: 'session-1', title: apt.pkg || 'Paket Utama', subtitle: 'Sesi Utama', limit: 80 }],
                    loadingSessions: false
                }));
            }
        } catch (err) {
            console.error('Failed to load sessions:', err);
            setDriveModal(prev => ({
                ...prev,
                sessions: [{ id: 'session-1', title: apt.pkg || 'Paket Utama', subtitle: 'Sesi Utama', limit: 80 }],
                loadingSessions: false
            }));
        }
    };

    const handleAddSessionRow = () => {
        setDriveModal(prev => {
            const nextIdx = prev.sessions.length + 1;
            return {
                ...prev,
                sessions: [
                    ...prev.sessions,
                    {
                        id: `session-${Date.now()}`,
                        title: `Sesi Tambahan ${nextIdx}`,
                        subtitle: 'Acara / Album Tambahan',
                        limit: 30
                    }
                ]
            };
        });
    };

    const handleRemoveSessionRow = (sessionIdx) => {
        setDriveModal(prev => ({
            ...prev,
            sessions: prev.sessions.filter((_, idx) => idx !== sessionIdx)
        }));
    };

    const handleUpdateSessionField = (sessionIdx, field, value) => {
        setDriveModal(prev => {
            const updated = [...prev.sessions];
            updated[sessionIdx] = {
                ...updated[sessionIdx],
                [field]: field === 'limit' ? Math.max(1, parseInt(value, 10) || 0) : value
            };
            return { ...prev, sessions: updated };
        });
    };

    const handleSaveSessionsOnly = async () => {
        const apt = driveModal.apt;
        if (!apt) return;
        setDriveModal(prev => ({ ...prev, savingOnly: true }));
        try {
            const response = await adminFetch('/api/admin/save-sessions-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: apt.id,
                    sessions_config: driveModal.sessions,
                    drive_link: driveModal.link ? driveModal.link.trim() : undefined
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast('Pengaturan sesi & link berhasil disimpan! 💾', 'success');
                setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, drive_link: driveModal.link.trim() } : a));
                setDriveModal({ open: false, apt: null, link: '', sessions: [], loadingSessions: false, sending: false, savingOnly: false });
            } else {
                onShowToast('Gagal menyimpan: ' + (resData.error || 'Unknown error'), 'error');
                setDriveModal(prev => ({ ...prev, savingOnly: false }));
            }
        } catch (error) {
            onShowToast('Error server: ' + error.message, 'error');
            setDriveModal(prev => ({ ...prev, savingOnly: false }));
        }
    };

    const handleSendDriveLink = async () => {
        if (!driveModal.link || !driveModal.link.trim()) {
            onShowToast('Link Google Drive tidak boleh kosong!', 'error');
            return;
        }
        setDriveModal(prev => ({ ...prev, sending: true }));
        try {
            const apt = driveModal.apt;
            const isStudio = apt.division === 'Studio Lapanbelas';
            const pkgNameLower = (apt.pkg || '').toLowerCase();
            const isLongPackage = ['delta', 'centro', 'bravo', 'platinum', 'gold combo', 'royal'].some(k => pkgNameLower.includes(k));
            const estimasiHari = isStudio ? "3-7" : (isLongPackage ? 60 : 30);

            const response = await adminFetch('/api/send-drive-link-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: {
                        id: apt.id,
                        client_name: apt.name,
                        client_email: apt.email,
                        package_name: apt.pkg,
                        drive_link: driveModal.link.trim(),
                        sessions_config: driveModal.sessions,
                        estimasi_hari: estimasiHari
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast('Link Drive & Sesi berhasil dikirim ke email klien! 📁', 'success');
                setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, drive_link: driveModal.link.trim() } : a));
                setDriveModal({ open: false, apt: null, link: '', sessions: [], loadingSessions: false, sending: false, savingOnly: false });
            } else {
                onShowToast('Gagal mengirim: ' + (resData.error || 'Unknown error'), 'error');
                setDriveModal(prev => ({ ...prev, sending: false }));
            }
        } catch (error) {
            onShowToast('Error server: ' + error.message, 'error');
            setDriveModal(prev => ({ ...prev, sending: false }));
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full relative text-left min-w-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Appointment</h2>

                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Cari nama, ID, paket..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 min-w-[200px]"
                    />
                    <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white appearance-none"
                    >
                        <option value="All">Semua Bulan</option>
                        {monthOptions.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={filterDivision}
                        onChange={e => setFilterDivision(e.target.value)}
                        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white appearance-none"
                    >
                        <option value="All">Semua Divisi</option>
                        <option value="lapanbelas.id">Lapanbelas ID (Wedding)</option>
                        <option value="Studio Lapanbelas">Studio Lapanbelas</option>
                        <option value="Lady Makeup">Lady Makeup</option>
                        <option value="Lapanbelas Dekorasi">Lapanbelas Dekorasi</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-slate-800 dark:text-white appearance-none"
                    >
                        <option value="All">Semua Status</option>
                        <option value="Menunggu DP">Menunggu DP</option>
                        <option value="Sudah DP">Sudah DP</option>
                        <option value="Lunas">Lunas</option>
                    </select>
                    <button
                        type="button"
                        disabled={isSyncingCalendar}
                        onClick={handleSyncGoogleCalendar}
                        className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 dark:border-blue-500/40 px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                        title="Sinkronkan seluruh jadwal aktif langsung ke Google Calendar"
                    >
                        {isSyncingCalendar ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="hidden sm:inline">Syncing...</span>
                            </>
                        ) : (
                            <>
                                <span>🗓️</span>
                                <span className="hidden sm:inline">Sync Calendar</span>
                            </>
                        )}
                    </button>
                    <button onClick={handleAddClick} className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                        <SvgIcon name="plus" className="w-4 h-4 text-white dark:text-black" /> Tambah
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto overflow-x-auto h-full custom-scrollbar pb-10 min-w-0">
                    <table className="hidden md:table w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100/90 dark:bg-[#111318] border-b border-slate-200/90 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                <th className="px-2.5 py-3 whitespace-nowrap">Order ID</th>
                                <th className="px-2.5 py-3 whitespace-nowrap">Klien</th>
                                <th className="px-2.5 py-3 whitespace-nowrap">Paket</th>
                                <th className="px-2.5 py-3 whitespace-nowrap">Divisi</th>
                                <th className="px-2.5 py-3 whitespace-nowrap">Tgl Acara</th>
                                <th className="px-2.5 py-3 whitespace-nowrap text-center">Status</th>
                                <th className="px-2.5 py-3 whitespace-nowrap">Keuangan</th>
                                <th className="px-2.5 py-3 text-center whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {paginatedAppointments.map((apt, idx) => {
                                const parsedNotes = parseNotesField(apt.notes);
                                const isCompletedOrder = ['Done', 'Selesai', 'Selesai (Diambil)', 'Album Siap Ambil'].includes(apt.progressStatus || apt.status);
                                const isSelfPhotoOrBooth = ['photo self', 'photobox', 'self photo'].some(k => (apt.pkg || '').toLowerCase().includes(k));
                                const hasRawHandover = !!parsedNotes.rawHandover || !!apt.drive_link || isCompletedOrder || isSelfPhotoOrBooth;
                                let daysSinceEvent = null;
                                if (apt.eventDate) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const evDate = new Date(apt.eventDate);
                                    evDate.setHours(0, 0, 0, 0);
                                    daysSinceEvent = Math.floor((today - evDate) / (1000 * 60 * 60 * 24));
                                }
                                const isEventPassed = daysSinceEvent !== null && daysSinceEvent >= 0;
                                const isLateRaw = isEventPassed && !hasRawHandover && daysSinceEvent >= 1 && !['Batal', 'Cancelled'].includes(apt.status);

                                return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors align-middle text-xs">
                                    {/* Order ID */}
                                    <td className="px-2.5 py-2.5">
                                        <span className="font-mono text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">{apt.id}</span>
                                    </td>
                                    {/* Klien */}
                                    <td className="px-2.5 py-2.5">
                                        <div className="font-medium text-slate-900 dark:text-white max-w-[140px] truncate" title={apt.name}>{apt.name}</div>
                                    </td>
                                    {/* Paket */}
                                    <td className="px-2.5 py-2.5">
                                        <div className="text-slate-700 dark:text-gray-200 max-w-[160px] truncate font-normal" title={apt.pkg}>{apt.pkg}</div>
                                    </td>
                                    {/* Divisi */}
                                    <td className="px-2.5 py-2.5">
                                        <div className="flex flex-col gap-1">
                                            {apt.divisions?.map((div, i) => (
                                                <span key={i} className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide whitespace-nowrap w-fit ${
                                                    div === 'lapanbelas.id' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                                    div === 'Studio Lapanbelas' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                                    div === 'Lady Makeup' ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400' :
                                                    div === 'Lapanbelas Dekorasi' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                                    'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    {div || 'Umum'}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    {/* Tgl Acara & Serah Terima File Mentah */}
                                    <td className="px-2.5 py-2.5">
                                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-600 dark:text-gray-300">
                                            {apt.resepsiDate ? (
                                                <>
                                                    <span className="whitespace-nowrap">Akad: {formatDateUI(apt.eventDate)}</span>
                                                    <span className="whitespace-nowrap text-slate-500 dark:text-gray-400">Rsp: {formatDateUI(apt.resepsiDate)}</span>
                                                </>
                                            ) : (
                                                <span className="whitespace-nowrap">{formatDateUI(apt.eventDate)}</span>
                                            )}
                                            {apt.notes && apt.notes.includes('[RESCHEDULE RECORD]') && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 w-fit mt-0.5">
                                                    🗓️ Rescheduled
                                                </span>
                                            )}
                                            {/* Gate Serah Terima File Mentah FG */}
                                            {hasRawHandover ? (
                                                !isSelfPhotoOrBooth && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 w-fit mt-0.5" title="File Mentah sudah diserahkan Fotografer">
                                                        📁 Mentah Disetor
                                                    </span>
                                                )
                                            ) : isLateRaw ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30 w-fit animate-pulse" title="File Mentah belum disetor oleh FG!">
                                                        ⚠️ H+{daysSinceEvent} Blm Setor
                                                    </span>
                                                    <button 
                                                        onClick={() => handleRemindPhotographerRaw(apt)}
                                                        title="Kirim Peringatan ke WhatsApp Fotografer" 
                                                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap"
                                                    >
                                                        Tagih FG
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </td>
                                    {/* Status */}
                                    <td className="px-2.5 py-2.5 text-center">
                                        {(() => {
                                            const dispStatus = apt.progressStatus || apt.status;
                                            const badgeColorClass = 
                                                dispStatus === 'Selesai (Diambil)' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/40' :
                                                dispStatus === 'Album Siap Ambil' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/40' :
                                                dispStatus === 'Done' || dispStatus === 'Lunas' ? 'bg-green-500/15 text-green-700 dark:text-green-400 ring-1 ring-green-500/30' :
                                                dispStatus === 'Selesai untuk Preview' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30' :
                                                dispStatus === 'Proses Edit' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30' :
                                                dispStatus === 'Antrian Pengerjaan' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 ring-1 ring-purple-500/30' :
                                                dispStatus === 'Menunggu Seleksi Foto' ? 'bg-pink-500/15 text-pink-700 dark:text-pink-400 ring-1 ring-pink-500/30' :
                                                dispStatus === 'Sudah DP' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400 ring-1 ring-sky-500/30' :
                                                'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-1 ring-yellow-500/30';
                                            return (
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${badgeColorClass}`}>
                                                    {dispStatus}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    {/* Keuangan */}
                                    <td className="px-2.5 py-2.5">
                                        <div className="flex flex-col gap-0.5 text-[10px] whitespace-nowrap">
                                            <span className="text-slate-500 dark:text-gray-400">Total: <span className="text-slate-900 dark:text-white font-medium">{formatRupiah(apt.total)}</span></span>
                                            <span className="text-slate-500 dark:text-gray-400">DP: <span className="text-emerald-600 dark:text-green-400 font-medium">{formatRupiah(apt.dp)}</span></span>
                                            <span className="text-slate-500 dark:text-gray-400">Sisa: <span className={`font-semibold ${apt.status === 'Lunas' ? 'text-emerald-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {apt.status === 'Lunas' ? formatRupiah(0) : formatRupiah(apt.total - apt.dp)}
                                            </span></span>
                                        </div>
                                    </td>
                                    {/* Aksi */}
                                    <td className="px-2.5 py-2.5">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handlePreviewInvoice(apt)} title="Pratinjau Invoice" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-500/15 text-blue-600 dark:bg-white/8 dark:hover:bg-blue-500/20 dark:text-blue-400 transition-all">
                                                <SvgIcon name="file-text" className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleSendEmail(apt)} title="Kirim Invoice (Email)" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-500/15 text-emerald-600 dark:bg-white/8 dark:hover:bg-green-500/20 dark:text-green-400 transition-all">
                                                <SvgIcon name="mail" className="w-3.5 h-3.5" />
                                            </button>
                                            {/* Gate Terima File Mentah dari Fotografer */}
                                            <button 
                                                onClick={() => handleOpenRawHandover(apt)} 
                                                title={hasRawHandover ? "File Mentah Sudah Disetor FG (Klik untuk cek/update rincian)" : isLateRaw ? "PERINGATAN: File Mentah Belum Diserahkan FG! Klik untuk Verifikasi & Terima File" : "Verifikasi & Terima File Mentah dari Fotografer"} 
                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                                    hasRawHandover 
                                                        ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40' 
                                                        : isLateRaw 
                                                            ? 'bg-red-500/25 text-red-600 dark:text-red-300 ring-1 ring-red-500/50 animate-pulse' 
                                                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300'
                                                }`}
                                            >
                                                <SvgIcon name="folder-down" className="w-3.5 h-3.5" />
                                            </button>
                                            {apt.status === 'Lunas' && (
                                                <button onClick={() => openDriveModal(apt)} title="Kirim Link Google Drive & Atur Sesi" className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-all">
                                                    <SvgIcon name="folder-pen" className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {apt.status === 'Lunas' && (
                                                <button onClick={() => handleSendPhotoReminder(apt)} title="Kirim Pengingat Pilih Foto (Email & WA)" className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-all">
                                                    <SvgIcon name="bell" className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {/* Tahap A: Album Selesai Cetak */}
                                            <button 
                                                onClick={() => handleOpenAlbumReady(apt)} 
                                                title={apt.hasAlbumReady ? "Foto Album Selesai Sudah Diunggah (Klik untuk perbarui/kirim ulang)" : "Upload Foto Album Fisik Selesai & Kirim WA Klien"} 
                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${apt.hasAlbumReady ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/40' : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300'}`}
                                            >
                                                <SvgIcon name="package-check" className="w-3.5 h-3.5" />
                                            </button>
                                            {/* Tahap B (Hard Gate): Bukti Serah Terima Klien + Auto Feedback Link */}
                                            <button 
                                                onClick={() => handleOpenHandover(apt)} 
                                                title={apt.hasHandover ? "Serah Terima Selesai (Klik untuk lihat/perbarui bukti foto)" : "Serah Terima Album ke Klien (Wajib Foto & Auto Feedback)"} 
                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${apt.hasHandover ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/50' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300'}`}
                                            >
                                                <SvgIcon name="handshake" className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleSendFeedbackRequest(apt)} title="Kirim Permintaan Ulasan (WhatsApp)" className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 transition-all">
                                                <SvgIcon name="star" className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleEditClick(apt)} title="Edit Data" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-yellow-500/15 text-yellow-600 dark:bg-white/8 dark:hover:bg-yellow-500/20 dark:text-yellow-400 transition-all">
                                                <SvgIcon name="edit" className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(apt.id)} title="Hapus" className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all">
                                                <SvgIcon name="trash-2" className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                            {filteredAppointments.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400 dark:text-gray-500">Belum ada appointment terdaftar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                        {paginatedAppointments.map((apt, idx) => {
                            const parsedNotes = parseNotesField(apt.notes);
                            const isCompletedOrder = ['Done', 'Selesai', 'Selesai (Diambil)', 'Album Siap Ambil'].includes(apt.progressStatus || apt.status);
                            const isSelfPhotoOrBooth = ['photo self', 'photobox', 'self photo'].some(k => (apt.pkg || '').toLowerCase().includes(k));
                            const hasRawHandover = !!parsedNotes.rawHandover || !!apt.drive_link || isCompletedOrder || isSelfPhotoOrBooth;
                            let daysSinceEvent = null;
                            if (apt.eventDate) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const evDate = new Date(apt.eventDate);
                                evDate.setHours(0, 0, 0, 0);
                                daysSinceEvent = Math.floor((today - evDate) / (1000 * 60 * 60 * 24));
                            }
                            const isEventPassed = daysSinceEvent !== null && daysSinceEvent >= 0;
                            const isLateRaw = isEventPassed && !hasRawHandover && daysSinceEvent >= 1 && !['Batal', 'Cancelled'].includes(apt.status);

                            return (
                            <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-mono text-slate-500 dark:text-gray-400 mb-1">{apt.id}</div>
                                        <div className="font-bold text-base text-slate-900 dark:text-white">{apt.name}</div>
                                        <div className="text-sm text-slate-600 dark:text-gray-300 truncate max-w-[250px]" title={apt.pkg}>{apt.pkg}</div>
                                    </div>
                                    {(() => {
                                        const dispStatus = apt.progressStatus || apt.status;
                                        const badgeColorClass = 
                                            dispStatus === 'Selesai (Diambil)' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                            dispStatus === 'Album Siap Ambil' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' :
                                            dispStatus === 'Done' || dispStatus === 'Lunas' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                                            dispStatus === 'Selesai untuk Preview' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                                            dispStatus === 'Proses Edit' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                                            dispStatus === 'Antrian Pengerjaan' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                                            dispStatus === 'Menunggu Seleksi Foto' ? 'bg-pink-500/20 text-pink-700 dark:text-pink-400' :
                                            dispStatus === 'Sudah DP' ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400' :
                                            'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
                                        return (
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 ${badgeColorClass}`}>
                                                {dispStatus}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div className="flex flex-wrap gap-1 items-center">
                                    {apt.divisions?.map((div, i) => (
                                        <span key={i} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                            div === 'lapanbelas.id' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                            div === 'Studio Lapanbelas' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                            div === 'Lady Makeup' ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400' :
                                            div === 'Lapanbelas Dekorasi' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                            'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                                        }`}>
                                            {div || 'Umum'}
                                        </span>
                                    ))}
                                    {hasRawHandover && !isSelfPhotoOrBooth && (
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                            📁 File Mentah Disetor
                                        </span>
                                    )}
                                    {isLateRaw && (
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30 animate-pulse">
                                            ⚠️ H+{daysSinceEvent} Belum Setor File Mentah
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-black/20 p-3 rounded-lg border border-slate-200/80 dark:border-white/5 mt-1">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 dark:text-gray-500 font-semibold mb-1">Tanggal</span>
                                        {apt.resepsiDate ? (
                                            <>
                                                <span className="text-slate-700 dark:text-gray-300">Akad: {formatDateUI(apt.eventDate)}</span>
                                                <span className="text-slate-700 dark:text-gray-300">Rsp: {formatDateUI(apt.resepsiDate)}</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-700 dark:text-gray-300">{formatDateUI(apt.eventDate)}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 text-right">
                                        <span className="text-slate-500 dark:text-gray-500 font-semibold mb-1">Keuangan</span>
                                        <span className="text-slate-700 dark:text-gray-300">Tot: {formatRupiah(apt.total)}</span>
                                        <span className="text-emerald-600 dark:text-green-400">DP: {formatRupiah(apt.dp)}</span>
                                        <span className={apt.status === 'Lunas' ? 'text-emerald-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                                            Sisa: {apt.status === 'Lunas' ? formatRupiah(0) : formatRupiah(apt.total - apt.dp)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <button onClick={() => handlePreviewInvoice(apt)} className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg transition text-blue-600 dark:text-blue-400" title="Pratinjau Invoice"><SvgIcon name="file-text" className="w-4 h-4 text-blue-600 dark:text-blue-400" /></button>
                                    <button onClick={() => handleSendEmail(apt)} className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg transition text-emerald-600 dark:text-green-400" title="Kirim Invoice"><SvgIcon name="mail" className="w-4 h-4 text-emerald-600 dark:text-green-400" /></button>
                                    {/* Gate Terima File Mentah (Mobile) */}
                                    <button
                                        onClick={() => handleOpenRawHandover(apt)}
                                        className={`flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center rounded-lg transition ${
                                            hasRawHandover
                                                ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                                                : isLateRaw
                                                    ? 'bg-red-500/25 text-red-600 dark:text-red-300 ring-1 ring-red-500/50 animate-pulse'
                                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                        }`}
                                        title="Verifikasi & Terima File Mentah dari Fotografer"
                                    >
                                        <SvgIcon name="folder-down" className="w-4 h-4" />
                                    </button>
                                    {apt.status === 'Lunas' && (
                                        <button
                                            onClick={() => openDriveModal(apt)}
                                            className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition text-purple-600 dark:text-purple-400"
                                            title="Kirim Link Drive & Atur Sesi"
                                        >
                                            <SvgIcon name="folder-pen" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        </button>
                                    )}
                                    {apt.status === 'Lunas' && (
                                        <button
                                            onClick={() => handleSendPhotoReminder(apt)}
                                            className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition text-amber-600 dark:text-amber-400"
                                            title="Kirim Pengingat Pilih Foto"
                                        >
                                            <SvgIcon name="bell" className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </button>
                                    )}
                                    {/* Tahap A: Album Selesai */}
                                    <button
                                        onClick={() => handleOpenAlbumReady(apt)}
                                        className={`flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center rounded-lg transition ${apt.hasAlbumReady ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/40' : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'}`}
                                        title="Upload Foto Album Selesai"
                                    >
                                        <SvgIcon name="package-check" className="w-4 h-4" />
                                    </button>
                                    {/* Tahap B: Serah Terima */}
                                    <button
                                        onClick={() => handleOpenHandover(apt)}
                                        className={`flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center rounded-lg transition ${apt.hasHandover ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/50' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}
                                        title="Serah Terima Album (Wajib Foto)"
                                    >
                                        <SvgIcon name="handshake" className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleSendFeedbackRequest(apt)}
                                        className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition text-yellow-600 dark:text-yellow-400"
                                        title="Kirim Permintaan Ulasan (WhatsApp)"
                                    >
                                        <SvgIcon name="star" className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                    </button>
                                    <button onClick={() => handleEditClick(apt)} className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg transition text-yellow-600 dark:text-yellow-400" title="Edit Data"><SvgIcon name="edit" className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></button>
                                    <button onClick={() => setConfirmDeleteId(apt.id)} className="flex-1 min-w-[38px] min-h-[38px] flex justify-center items-center bg-red-500/10 hover:bg-red-500/20 rounded-lg transition text-red-600 dark:text-red-400" title="Hapus"><SvgIcon name="trash-2" className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
                                </div>
                            </div>
                            );
                        })}
                        {filteredAppointments.length === 0 && (
                            <div className="p-8 text-center text-slate-400 dark:text-gray-500">Belum ada appointment terdaftar.</div>
                        )}
                    </div>

                    {/* Pagination Bar */}
                    {filteredAppointments.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 dark:bg-black/30 border-t border-slate-200/90 dark:border-white/10 text-xs text-slate-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <span>Menampilkan <strong>{filteredAppointments.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> dari <strong>{filteredAppointments.length}</strong> pesanan</span>
                                <div className="hidden sm:flex items-center gap-1.5 ml-3 border-l border-slate-200 dark:border-white/10 pl-3">
                                    <span className="text-[11px] text-slate-400 dark:text-gray-500">Per Hal:</span>
                                    {[25, 50, 100, 'All'].map(sz => (
                                        <button
                                            key={sz}
                                            type="button"
                                            onClick={() => { setPageSize(sz); setCurrentPage(1); }}
                                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                                                pageSize === sz
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-slate-200/70 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300'
                                            }`}
                                        >
                                            {sz === 'All' ? 'Semua' : sz}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {pageSize !== 'All' && totalPages > 1 && (
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-semibold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/10 transition"
                                    >
                                        ‹ Sebelumnya
                                    </button>
                                    <span className="px-2 font-bold text-slate-900 dark:text-white">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-semibold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/10 transition"
                                    >
                                        Berikutnya ›
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Drive Link & Session Configuration Modal */}
            {driveModal.open && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <button onClick={() => setDriveModal({ open: false, apt: null, link: '', sessions: [], loadingSessions: false, sending: false, savingOnly: false })} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>

                        <div className="flex items-center gap-3 mb-1 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                                <SvgIcon name="folder-pen" className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold truncate">Kirim Link Drive &amp; Konfigurasi Sesi</h3>
                                <p className="text-xs text-gray-400 truncate">ke {driveModal.apt?.name} &bull; {driveModal.apt?.pkg}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4 custom-scrollbar">
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 text-xs text-gray-300 space-y-1">
                                <p className="font-semibold text-purple-300 mb-1">📋 Panduan Pengaturan Sesi &amp; Kuota Foto:</p>
                                <p>• Sesuaikan nama sesi dan jumlah kuota foto untuk masing-masing album/acara klien.</p>
                                <p>• Estimasi pengerjaan: <span className="font-bold text-white">{(() => { if (driveModal.apt?.division === 'Studio Lapanbelas') return '3-7 hari'; const p = (driveModal.apt?.pkg || '').toLowerCase(); return ['delta', 'centro', 'bravo', 'platinum', 'gold combo', 'royal'].some(k => p.includes(k)) ? '60 hari' : '30 hari'; })()}</span> terhitung dari klien selesai pilih foto.</p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Link Google Drive (Folder Foto Mentah) *</label>
                                <input
                                    type="url"
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    value={driveModal.link}
                                    onChange={e => setDriveModal(prev => ({ ...prev, link: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-500 text-white font-mono"
                                />
                            </div>

                            {/* Section Sesi Foto */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">📦</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Daftar Sesi &amp; Batas Foto Klien</span>
                                    </div>
                                    <span className="text-[11px] font-semibold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                                        {driveModal.sessions.length} Sesi Terdaftar
                                    </span>
                                </div>

                                {driveModal.loadingSessions ? (
                                    <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Mendeteksi &amp; memuat konfigurasi sesi...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {driveModal.sessions.map((ses, idx) => (
                                            <div key={ses.id || idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 relative space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                                        Sesi #{idx + 1}
                                                    </span>
                                                    {driveModal.sessions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSessionRow(idx)}
                                                            className="text-xs text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition"
                                                            title="Hapus sesi ini"
                                                        >
                                                            ✕ Hapus Sesi
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                                    <div className="sm:col-span-6">
                                                        <label className="text-[10px] text-gray-400 block mb-1">Nama Sesi / Album *</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Cth: Album Fullpress"
                                                            value={ses.title}
                                                            onChange={e => handleUpdateSessionField(idx, 'title', e.target.value)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="text-[10px] text-gray-400 block mb-1">Keterangan</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Cth: Akad &amp; Resepsi"
                                                            value={ses.subtitle}
                                                            onChange={e => handleUpdateSessionField(idx, 'subtitle', e.target.value)}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-purple-500"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="text-[10px] text-emerald-400 font-semibold block mb-1">Batas Kuota *</label>
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                placeholder="80"
                                                                value={ses.limit}
                                                                onChange={e => handleUpdateSessionField(idx, 'limit', e.target.value)}
                                                                className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold outline-none focus:border-emerald-400 text-center"
                                                            />
                                                            <span className="text-[10px] text-gray-400 shrink-0">Foto</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={handleAddSessionRow}
                                            className="w-full py-2 border border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                                        >
                                            <span>+ Tambah Sesi Foto Baru</span>
                                        </button>

                                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-300 px-1">
                                            <span>Total Keseluruhan Kuota Foto:</span>
                                            <span className="font-bold text-emerald-400 text-sm">
                                                {driveModal.sessions.reduce((acc, s) => acc + (parseInt(s.limit, 10) || 0), 0)} Foto
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-white/10 shrink-0">
                            <button
                                onClick={() => setDriveModal({ open: false, apt: null, link: '', sessions: [], loadingSessions: false, sending: false, savingOnly: false })}
                                className="sm:w-24 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-2.5 rounded-xl text-xs font-medium transition"
                            >Batal</button>
                            <button
                                type="button"
                                onClick={handleSaveSessionsOnly}
                                disabled={driveModal.savingOnly || driveModal.sending || driveModal.loadingSessions}
                                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/20 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                                {driveModal.savingOnly ? 'Menyimpan...' : '💾 Simpan Sesi Saja'}
                            </button>
                            <button
                                onClick={handleSendDriveLink}
                                disabled={driveModal.sending || driveModal.savingOnly || driveModal.loadingSessions}
                                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                            >
                                {driveModal.sending ? (
                                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Mengirim...</>
                                ) : (
                                    <>📨 Simpan &amp; Kirim Email</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90dvh] overscroll-contain custom-scrollbar">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-1">{editId ? 'Edit Appointment' : 'Tambah Appointment Manual'}</h3>
                        <p className="text-xs text-gray-500 mb-4">Lengkapi data klien & detail booking</p>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Seksi: Pilih Divisi */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3 mb-4">
                                <label className="text-xs text-gray-400 block mb-1">Divisi (Layanan) *</label>
                                <select required disabled={isMakeup || isStudio || isDecor} value={divisi} onChange={e => {
                                    const targetDiv = e.target.value;
                                    setDivisi(targetDiv);
                                    setFormData(prev => ({
                                        ...prev,
                                        pkg: '',
                                        dp: targetDiv === 'Studio Lapanbelas' ? 200000 : 1000000
                                    }));
                                }} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none disabled:opacity-50">
                                    <option value="lapanbelas.id">Lapanbelas ID (Wedding Documentation)</option>
                                    <option value="Studio Lapanbelas">Studio Lapanbelas</option>
                                    <option value="Lady Makeup">Lady Makeup</option>
                                    <option value="Lapanbelas Dekorasi">Lapanbelas Dekorasi</option>
                                </select>
                            </div>

                            {/* Seksi: Data Klien */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">👤 Data Klien</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Nama Klien *</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Email Klien *</label>
                                        <input 
                                            type="email" 
                                            required 
                                            placeholder="nama@email.com"
                                            value={formData.client_email} 
                                            onChange={e => {
                                                const cleaned = e.target.value.toLowerCase().replace(/\s+/g, '');
                                                setFormData({ ...formData, client_email: cleaned });
                                            }} 
                                            onPaste={e => {
                                                e.preventDefault();
                                                const pasteText = (e.clipboardData || window.clipboardData).getData('text');
                                                const cleaned = pasteText.toLowerCase().replace(/\s+/g, '');
                                                setFormData({ ...formData, client_email: cleaned });
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono" 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">No. WhatsApp</label>
                                        <input type="tel" value={formData.phone} placeholder="08xx-xxxx-xxxx" onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1 flex items-center gap-1">
                                            Sandi Login Portal
                                            <button type="button" onClick={() => setFormData({ ...formData, password: Math.random().toString(36).slice(2, 8).toUpperCase() })} className="ml-auto text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full transition">🔄 Generate</button>
                                        </label>
                                        <input type="text" value={formData.password} placeholder="Isi manual atau klik Generate" onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono tracking-widest" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Alamat Lengkap</label>
                                    <textarea value={formData.address} rows={2} placeholder="Jl. Contoh No. 1, Kota, Provinsi" onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white resize-none" />
                                </div>

                                {divisi === 'Lapanbelas Dekorasi' && (
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Nama Pria</label>
                                            <input type="text" value={formData.namaPria} onChange={e => setFormData({ ...formData, namaPria: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Nama Wanita</label>
                                            <input type="text" value={formData.namaWanita} onChange={e => setFormData({ ...formData, namaWanita: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Seksi: Detail Booking */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">📋 Detail Booking</p>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Pilih Paket *</label>
                                    <select required value={formData.pkg} onChange={e => {
                                        const pkgName = e.target.value;
                                        const pkgObj = packages.find(p => p.title === pkgName);
                                        const price = pkgObj?.price || 0;

                                        let dur = '';
                                        if (divisi === 'Studio Lapanbelas' && pkgObj) {
                                            const desc = pkgObj.description || '';
                                            const durationMatch = desc.match(/\[DURATION\]:\s*(\d+)/);
                                            if (durationMatch) {
                                                dur = durationMatch[1];
                                            }
                                            setAddonPeople('Tanpa Tambahan Orang');
                                            setAddonTime('Tanpa Tambahan Waktu');
                                            setAddonPrint('Tanpa Cetak Foto');
                                            setAddonFrame('Tanpa Bingkai Foto');
                                        }

                                        setFormData(prev => ({
                                            ...prev,
                                            pkg: pkgName,
                                            total: Number(price),
                                            durasiSesi: dur || prev.durasiSesi
                                        }));

                                        // Auto-switch addon tab sesuai paket yang dipilih
                                        if (pkgObj) {
                                            const pCat = (pkgObj.category || '').toLowerCase();
                                            if (pCat.includes('makeup') || divisi === 'Lady Makeup') setAddonCategoryTab('makeup');
                                            else if (pCat.includes('dekor') || divisi === 'Lapanbelas Dekorasi') setAddonCategoryTab('dekor');
                                            else if (pCat.includes('video')) setAddonCategoryTab('video');
                                            else setAddonCategoryTab('foto');
                                        }
                                    }} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                        <option value="">-- Pilih Paket --</option>
                                        {packages.filter(p => {
                                            const cat = p.category || '';
                                            if (divisi === 'lapanbelas.id') {
                                                return cat === 'lapanbelas.id' || cat === 'Wedding' || cat === 'Pre-Wedding' || cat === 'Engagement' || cat === 'Tasyakuran' || !p.category;
                                            }
                                            if (divisi === 'Studio Lapanbelas') {
                                                return cat === 'Studio Lapanbelas' || ['Photo Self', 'Self Photo', 'Photobox', 'Photo Box', 'Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'].includes(cat);
                                            }
                                            if (divisi === 'Lady Makeup') {
                                                return cat === 'Lady Makeup' || cat.startsWith('Lady Makeup:');
                                            }
                                            if (divisi === 'Lapanbelas Dekorasi') {
                                                return cat === 'Lapanbelas Dekorasi' || cat.startsWith('Lapanbelas Dekorasi:');
                                            }
                                            return cat === divisi;
                                        }).map(p => (
                                            <option key={p.id} value={p.title}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>

                                {divisi === 'Studio Lapanbelas' && (
                                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Tanggal Photoshoot *</label>
                                                <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Jam Sesi</label>
                                                <input type="time" value={formData.jamSesi} onChange={e => setFormData({ ...formData, jamSesi: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Assign Room</label>
                                                <select value={formData.roomStudio} onChange={e => setFormData({ ...formData, roomStudio: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                                    <option value="">-- Pilih Room --</option>
                                                    <option value="Room A - Studio White">Room A - Studio White</option>
                                                    <option value="Room B - Luxury">Room B - Luxury</option>
                                                    <option value="Room C - Modern">Room C - Modern</option>
                                                    <option value="Room D - Kubah">Room D - Kubah</option>
                                                    <option value="Room E - Custom">Room E - Custom</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Assign Photographer</label>
                                                <select value={formData.photographer} onChange={e => setFormData({ ...formData, photographer: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                                    <option value="">-- Pilih Fotografer --</option>
                                                    {crewList.filter(c => ['fotografer', 'foto', 'fg', 'foto_video', 'all'].includes((c.role || '').toLowerCase())).map(c => (
                                                        <option key={c.id} value={`${c.name} (${c.phone})`}>{c.name} {c.type === 'freelance' ? '(Freelance)' : '(Staff)'}</option>
                                                    ))}
                                                    {crewList.filter(c => ['fotografer', 'foto', 'fg', 'foto_video', 'all'].includes((c.role || '').toLowerCase())).length === 0 && (
                                                        <option disabled>Belum ada kru terdaftar</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Durasi (Menit)</label>
                                                <input type="number" value={formData.durasiSesi} onChange={e => setFormData({ ...formData, durasiSesi: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                        </div>
                                        {/* Studio Addons */}
                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Tambahan Orang</label>
                                                <select
                                                    value={addonPeople}
                                                    onChange={(e) => setAddonPeople(e.target.value)}
                                                    className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white appearance-none"
                                                >
                                                    <option value="Tanpa Tambahan Orang">Tanpa Tambahan Orang</option>
                                                    <option value="+1 Orang (+Rp 50.000)">+1 Orang (+Rp 50.000)</option>
                                                    <option value="+2 Orang (+Rp 100.000)">+2 Orang (+Rp 100.000)</option>
                                                    <option value="+3 Orang (+Rp 150.000)">+3 Orang (+Rp 150.000)</option>
                                                    <option value="+4 Orang (+Rp 200.000)">+4 Orang (+Rp 200.000)</option>
                                                    <option value="+5 Orang (+Rp 250.000)">+5 Orang (+Rp 250.000)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Tambahan Durasi</label>
                                                <select
                                                    value={addonTime}
                                                    onChange={(e) => setAddonTime(e.target.value)}
                                                    className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white appearance-none"
                                                >
                                                    <option value="Tanpa Tambahan Waktu">Tanpa Tambahan Waktu</option>
                                                    <option value="+10 Menit (+Rp 100.000)">+10 Menit (+Rp 100.000)</option>
                                                    <option value="+20 Menit (+Rp 200.000)">+20 Menit (+Rp 200.000)</option>
                                                    <option value="+30 Menit (+Rp 300.000)">+30 Menit (+Rp 300.000)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pb-2">
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Cetak Foto Premium</label>
                                                <select
                                                    value={addonPrint}
                                                    onChange={(e) => setAddonPrint(e.target.value)}
                                                    className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white appearance-none"
                                                >
                                                    <option value="Tanpa Cetak Foto">Tanpa Cetak Foto</option>
                                                    <option value="Cetak 4R (+Rp 15.000)">Cetak 4R (+Rp 15.000)</option>
                                                    <option value="Cetak 10R (+Rp 50.000)">Cetak 10R (+Rp 50.000)</option>
                                                    <option value="Cetak 16R (+Rp 100.000)">Cetak 16R (+Rp 100.000)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Bingkai Foto Eksklusif</label>
                                                <select
                                                    value={addonFrame}
                                                    onChange={(e) => setAddonFrame(e.target.value)}
                                                    className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white appearance-none"
                                                >
                                                    <option value="Tanpa Bingkai Foto">Tanpa Bingkai Foto</option>
                                                    <option value="Bingkai Minimalis 4R (+Rp 20.000)">Bingkai Minimalis 4R (+Rp 20.000)</option>
                                                    <option value="Bingkai Kayu Klasik 10R (+Rp 75.000)">Bingkai Kayu Klasik 10R (+Rp 75.000)</option>
                                                    <option value="Bingkai Premium Ukiran 16R (+Rp 150.000)">Bingkai Premium Ukiran 16R (+Rp 150.000)</option>
                                                </select>
                                            </div>
                                        </div>
                                        {/* Real-time collision indicators */}
                                        {formData.eventDate && formData.jamSesi && (
                                            <div className="space-y-1.5 mt-1">
                                                {roomCollisions.length > 0 ? (
                                                    roomCollisions.map((w, i) => (
                                                        <div key={`rc-${i}`} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-400 animate-in fade-in">
                                                            <SvgIcon name="alert-triangle" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                                                            <span>{w.message}</span>
                                                        </div>
                                                    ))
                                                ) : formData.roomStudio && (
                                                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-[11px] text-green-400 animate-in fade-in">
                                                        <SvgIcon name="check-circle" className="w-3.5 h-3.5 shrink-0 text-green-400" />
                                                        <span>Room tersedia pada jam ini</span>
                                                    </div>
                                                )}
                                                {photographerCollisions.length > 0 && (
                                                    photographerCollisions.map((w, i) => (
                                                        <div key={`pc-${i}`} className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-[11px] text-orange-400 animate-in fade-in">
                                                            <SvgIcon name="alert-circle" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-400" />
                                                            <span>{w.message}</span>
                                                        </div>
                                                    ))
                                                )}
                                                {photographerCollisions.length === 0 && formData.photographer && (
                                                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-[11px] text-green-400 animate-in fade-in">
                                                        <SvgIcon name="check-circle" className="w-3.5 h-3.5 shrink-0 text-green-400" />
                                                        <span>Fotografer tersedia pada jam ini</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {divisi === 'Lady Makeup' && (() => {
                                    const selectedPkgObj = packages.find(p => p.title === formData.pkg);
                                    const selectedPkgCat = selectedPkgObj?.category || '';
                                    const isMakeupAkadResepsi = (selectedPkgCat.toLowerCase().includes('akad') && selectedPkgCat.toLowerCase().includes('resepsi')) ||
                                        (formData.pkg && formData.pkg.toLowerCase().includes('akad') && formData.pkg.toLowerCase().includes('resepsi'));

                                    if (isMakeupAkadResepsi) {
                                        return (
                                            <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 block mb-1">Tanggal Akad *</label>
                                                        <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 block mb-1">Tanggal Resepsi *</label>
                                                        <input type="date" required value={formData.resepsiDate} onChange={e => setFormData({ ...formData, resepsiDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-gray-400 block mb-1">Jadwal Fitting</label>
                                                    <input type="date" value={formData.jadwalFitting} onChange={e => setFormData({ ...formData, jadwalFitting: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 block mb-1">Tanggal Acara *</label>
                                                        <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 block mb-1">Jadwal Fitting</label>
                                                        <input type="date" value={formData.jadwalFitting} onChange={e => setFormData({ ...formData, jadwalFitting: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}

                                {divisi === 'Lapanbelas Dekorasi' && (
                                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                        {(() => {
                                            const selectedPkgObj = packages.find(p => p.title === formData.pkg);
                                            const selectedPkgCat = selectedPkgObj?.category || '';
                                            const isBundlingAkadResepsi = selectedPkgCat === 'Lapanbelas Dekorasi: Bundling Akad Resepsi' || selectedPkgCat.toLowerCase().includes('bundling akad resepsi') || formData.pkg.toLowerCase().includes('bundling akad resepsi');

                                            if (isBundlingAkadResepsi) {
                                                return (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[11px] text-gray-400 block mb-1">Tanggal Akad *</label>
                                                            <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] text-gray-400 block mb-1">Tanggal Resepsi *</label>
                                                            <input type="date" required value={formData.resepsiDate} onChange={e => setFormData({ ...formData, resepsiDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div>
                                                        <label className="text-[11px] text-gray-400 block mb-1">Tanggal Acara *</label>
                                                        <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                                    </div>
                                                );
                                            }
                                        })()}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Jadwal Survei</label>
                                                <input type="date" value={formData.jadwalSurvei} onChange={e => setFormData({ ...formData, jadwalSurvei: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Jadwal Pemasangan</label>
                                                <input type="date" value={formData.jadwalPemasangan} onChange={e => setFormData({ ...formData, jadwalPemasangan: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tanggal — lapanbelas.id: Delta/Centro dll */}
                                {divisi === 'lapanbelas.id' && (isDeltaCentro ? (
                                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-purple-400 font-semibold">📅 Paket ini memiliki 3 tanggal: Prewed + Akad + Resepsi</p>
                                        <div>
                                            <label className="text-[11px] text-gray-400 block mb-1">Tanggal Prewed (Opsional)</label>
                                            <input type="date" value={formData.prewedDate} onChange={e => setFormData({ ...formData, prewedDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Tanggal Akad *</label>
                                                <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Tanggal Resepsi *</label>
                                                <input type="date" required value={formData.resepsiDate} onChange={e => setFormData({ ...formData, resepsiDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                        </div>
                                    </div>
                                ) : isMultiDate ? (
                                    /* Platinum, Gold Combo, Gold, Silver: Akad + Resepsi */
                                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <p className="text-[10px] text-blue-400 font-semibold">📅 Paket ini memiliki 2 tanggal: Akad & Resepsi</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Tanggal Akad *</label>
                                                <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-400 block mb-1">Tanggal Resepsi *</label>
                                                <input type="date" required value={formData.resepsiDate} onChange={e => setFormData({ ...formData, resepsiDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Paket lainnya: 1 tanggal */
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                        <label className="text-[11px] text-gray-400 block mb-1">Tanggal Acara *</label>
                                        <input type="date" required value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 [color-scheme:dark]" />
                                    </div>
                                ))}

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Gunakan Voucher</label>
                                    <select value={selectedVoucherCode} onChange={e => setSelectedVoucherCode(e.target.value)} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                        <option value="">-- Tanpa Voucher --</option>
                                        {vouchers.filter(v => v.is_active).map(v => (
                                            <option key={v.code} value={v.code}>{v.code} (Potongan: {formatRupiah(v.discount_amount)})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Total Harga (Rp) *</label>
                                        <input type="number" required value={formData.total} onChange={e => setFormData({ ...formData, total: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">DP Dibayar (Rp)</label>
                                        <input type="number" required value={formData.dp} onChange={e => setFormData({ ...formData, dp: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Sisa Pelunasan</label>
                                        <input type="text" value={formatRupiah(formData.total - formData.dp)} readOnly className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500 outline-none font-medium" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Status Pembayaran</label>
                                    <select required value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                        <option value="Lunas">Lunas</option>
                                        <option value="Sudah DP">Sudah DP</option>
                                        <option value="Menunggu DP">Menunggu DP</option>
                                    </select>
                                </div>
                            </div>

                            {/* Seksi: Layanan Tambahan (Add-on) Berkategori */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">🎁 Layanan Tambahan (Add-on)</p>
                                    <span className="text-[10px] text-teal-400 font-medium">Dikelompokkan per Kategori</span>
                                </div>

                                {/* Filter Tabs Add-on */}
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {[
                                        { id: 'all', label: '✨ Semua' },
                                        { id: 'makeup', label: '💄 Makeup & Busana' },
                                        { id: 'foto', label: '📸 Foto & Cetak' },
                                        { id: 'video', label: '🎬 Video & Drone' },
                                        { id: 'dekor', label: '🎪 Dekorasi' },
                                    ].map(tab => {
                                        const count = addonsList.filter(a => {
                                            if (selectedAddonIds.includes(a.id.toString())) return false;
                                            if (tab.id === 'all') return true;
                                            return getAddonCategory(a.label || a.name) === tab.id;
                                        }).length;
                                        const isActive = addonCategoryTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setAddonCategoryTab(tab.id)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-1.5 ${
                                                    isActive 
                                                        ? 'bg-teal-600 text-white shadow-sm' 
                                                        : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-400'}`}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Pilih Add-on ({addonCategoryTab === 'all' ? 'Semua Divisi' : addonCategoryTab.toUpperCase()})</label>
                                    <select
                                        value=""
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val && !selectedAddonIds.includes(val)) {
                                                setSelectedAddonIds([...selectedAddonIds, val]);
                                            }
                                        }}
                                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none"
                                    >
                                        <option value="">-- Pilih & Tambahkan Add-on --</option>
                                        {addonsList.length === 0 && <option value="" disabled>Loading/Tidak ada Add-on...</option>}
                                        {addonsList
                                            .filter(a => {
                                                if (selectedAddonIds.includes(a.id.toString())) return false;
                                                if (addonCategoryTab === 'all') return true;
                                                return getAddonCategory(a.label || a.name) === addonCategoryTab;
                                            })
                                            .map(a => {
                                                const cat = getAddonCategory(a.label || a.name);
                                                const icon = cat === 'makeup' ? '💄' : cat === 'video' ? '🎬' : cat === 'dekor' ? '🎪' : '📸';
                                                return (
                                                    <option key={a.id} value={a.id.toString()}>
                                                        {icon} {a.label || a.name || 'Unnamed Addon'} ({formatRupiah(a.price)})
                                                    </option>
                                                );
                                            })}
                                    </select>
                                </div>

                                {selectedAddonIds.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        <p className="text-[10px] text-gray-400 font-medium">Layanan Tambahan Terpilih ({selectedAddonIds.length}):</p>
                                        {selectedAddonIds.map(id => {
                                            const a = addonsList.find(item => item.id.toString() === id.toString());
                                            if (!a) return null;
                                            const cat = getAddonCategory(a.label || a.name);
                                            const badgeColor = cat === 'makeup' ? 'text-pink-400 border-pink-400/30 bg-pink-500/10' : cat === 'video' ? 'text-cyan-400 border-cyan-400/30 bg-cyan-500/10' : cat === 'dekor' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' : 'text-blue-400 border-blue-400/30 bg-blue-500/10';
                                            return (
                                                <div key={id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs text-white">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold">{a.label || a.name || 'Unnamed Addon'}</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badgeColor}`}>
                                                                {cat.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">{formatRupiah(a.price)}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedAddonIds(selectedAddonIds.filter(item => item !== id))}
                                                        className="text-red-400 hover:text-red-300 p-1.5 hover:bg-white/5 rounded transition flex items-center justify-center"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Seksi: Multi-Paket Lintas Divisi */}
                            <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-500/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">✨</span>
                                        <p className="text-[11px] text-teal-300 font-bold uppercase tracking-wider">Kombinasi Multi-Paket (Lintas Divisi)</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCrossPkg(!showAddCrossPkg)}
                                        className="text-[10px] bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1 rounded-lg transition font-semibold"
                                    >
                                        {showAddCrossPkg ? '✕ Tutup' : '➕ Tambah Paket Divisi Lain'}
                                    </button>
                                </div>

                                {showAddCrossPkg && (
                                    <div className="bg-black/50 border border-teal-500/30 p-3 rounded-xl space-y-3 animate-in fade-in">
                                        <p className="text-[11px] text-slate-300 leading-relaxed">
                                            Klien memesan lebih dari 1 paket? Gabungkan di sini (misal: <em>Platinum Foto + Crown Makeup</em>). Rincian fasilitas pricelist & Syarat Ketentuan (T&C) kedua divisi akan otomatis terbit lengkap di 1 invoice.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Divisi Layanan</label>
                                                <select
                                                    value={crossPkgDiv}
                                                    onChange={e => {
                                                        setCrossPkgDiv(e.target.value);
                                                        setSelectedCrossPkgTitle('');
                                                    }}
                                                    className="w-full bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-500"
                                                >
                                                    <option value="Lady Makeup">💄 Lady Makeup</option>
                                                    <option value="Studio Lapanbelas">📸 Studio Lapanbelas</option>
                                                    <option value="lapanbelas.id">💍 Wedding / Lapanbelas</option>
                                                    <option value="Lapanbelas Dekorasi">🎪 Lapanbelas Dekorasi</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Pilih Paket</label>
                                                <select
                                                    value={selectedCrossPkgTitle}
                                                    onChange={e => setSelectedCrossPkgTitle(e.target.value)}
                                                    className="w-full bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-500"
                                                >
                                                    <option value="">-- Pilih Paket Tambahan --</option>
                                                    {packages.filter(p => {
                                                        const cat = (p.category || '').toLowerCase();
                                                        if (crossPkgDiv === 'Lady Makeup') return cat.includes('makeup');
                                                        if (crossPkgDiv === 'Studio Lapanbelas') return cat.includes('studio') || ['wisuda', 'family', 'couple', 'photo self', 'group studio'].some(k => cat.includes(k));
                                                        if (crossPkgDiv === 'Lapanbelas Dekorasi') return cat.includes('dekor');
                                                        return cat.includes('wedding') || ['gold', 'silver', 'bronze', 'platinum', 'centro', 'delta', 'bravo', 'royal'].some(k => p.title.toLowerCase().includes(k));
                                                    }).map(p => (
                                                        <option key={p.id} value={p.title}>{p.title} ({formatRupiah(p.price)})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!selectedCrossPkgTitle}
                                            onClick={() => {
                                                const found = packages.find(p => p.title === selectedCrossPkgTitle);
                                                if (found) {
                                                    const newFee = { description: found.title, amount: found.price };
                                                    setCustomFees(prev => [...prev, newFee]);
                                                    setFormData(prev => ({ ...prev, total: Number(prev.total || 0) + Number(found.price || 0) }));
                                                    onShowToast(`Paket ${found.title} (${formatRupiah(found.price)}) berhasil ditambahkan ke tagihan! 📦`, 'success');
                                                    setSelectedCrossPkgTitle('');
                                                    setShowAddCrossPkg(false);
                                                }
                                            }}
                                            className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shadow"
                                        >
                                            ✓ Masukkan Paket Ini ke Tagihan
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Seksi: Biaya Tambahan Lainnya (Manual) */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">💸 Biaya Tambahan Lainnya (Manual)</p>
                                    <button
                                        type="button"
                                        onClick={() => setCustomFees([...customFees, { description: '', amount: 0 }])}
                                        className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition flex items-center gap-1 font-semibold"
                                    >
                                        ➕ Tambah Biaya
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {customFees.map((fee, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-white/3 p-2.5 rounded-lg border border-white/5">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Deskripsi Biaya (misal: Ongkir Album)"
                                                value={fee.description}
                                                onChange={e => {
                                                    const newFees = [...customFees];
                                                    newFees[idx].description = e.target.value;
                                                    setCustomFees(newFees);
                                                }}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-white"
                                            />
                                            <input
                                                type="number"
                                                required
                                                placeholder="Harga (Rp)"
                                                value={fee.amount || ''}
                                                onChange={e => {
                                                    const newFees = [...customFees];
                                                    newFees[idx].amount = Number(e.target.value);
                                                    setCustomFees(newFees);
                                                }}
                                                className="w-28 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setCustomFees(customFees.filter((_, i) => i !== idx))}
                                                className="text-red-400 hover:text-red-300 p-1.5 hover:bg-white/5 rounded transition flex items-center justify-center"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {customFees.length === 0 && (
                                        <span className="text-xs text-gray-500 block">Belum ada biaya tambahan manual.</span>
                                    )}
                                </div>
                            </div>

                            {/* Seksi: Catatan / Keterangan Klien */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
                                <label className="text-xs text-gray-400 block mb-1">Catatan / Keterangan Klien</label>
                                <textarea
                                    value={notesText}
                                    rows={3}
                                    placeholder="Catatan tambahan, detail request kostum, lokasi spesifik acara, dll..."
                                    onChange={e => setNotesText(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white resize-none"
                                />
                            </div>

                            {/* Opsi Notifikasi Update ke Klien */}
                            <div 
                                onClick={() => setSendNotification(prev => !prev)}
                                className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                                    sendNotification 
                                        ? 'bg-blue-950/40 border-blue-500/50 shadow-sm shadow-blue-500/10' 
                                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    id="sendNotificationCheckbox"
                                    checked={sendNotification}
                                    onChange={e => setSendNotification(e.target.checked)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20 focus:ring-blue-500 cursor-pointer mt-0.5 accent-blue-500"
                                />
                                <div className="flex-1 select-none">
                                    <label htmlFor="sendNotificationCheckbox" className="font-semibold text-sm text-white cursor-pointer block">
                                        Kirim notifikasi update ke Klien (Email & WA)
                                    </label>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Notifikasi akan dikirimkan ke: <span className="text-gray-300 font-mono">{formData.client_email || formData.phone || 'Email / WA belum diisi'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">{editId ? 'Simpan & Terapkan' : 'Simpan Data'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* Custom Confirm Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-sm text-center animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <SvgIcon name="alert-triangle" className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Hapus Appointment?</h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">Data ini akan dihapus secara permanen dari database Supabase.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition">Batal</button>
                            <button onClick={confirmDelete} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition">Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Studio Collision Warning Modal */}
            {showCollisionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="glass-panel border border-orange-500/30 p-6 rounded-2xl w-full max-w-md text-center animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                            <SvgIcon name="alert-triangle" className="w-7 h-7 text-orange-400 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold mb-1 text-white">Collision Terdeteksi!</h3>
                        <p className="text-xs text-gray-400 mb-4">Terdapat jadwal yang bertabrakan pada waktu yang sama.</p>

                        <div className="space-y-2 mb-5 text-left max-h-[200px] overflow-y-auto custom-scrollbar">
                            {collisionWarnings.map((w, i) => (
                                <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-[11px] leading-relaxed border ${w.type === 'room'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-300'
                                    }`}>
                                    <SvgIcon
                                        name={w.type === 'room' ? 'layout-grid' : 'camera'}
                                        className={`w-4 h-4 mt-0.5 shrink-0 ${w.type === 'room' ? 'text-red-400' : 'text-orange-400'}`}
                                    />
                                    <span>{w.message}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCollisionModal(false);
                                    setCollisionWarnings([]);
                                    setPendingSubmitData(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition text-gray-300"
                            >
                                Batal, Ubah Jadwal
                            </button>
                            <button
                                onClick={executeSubmit}
                                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                                <SvgIcon name="alert-triangle" className="w-3.5 h-3.5" />
                                Tetap Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Album Selesai Cetak */}
            {albumReadyModal.open && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-cyan-500/30 p-6 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <button
                            onClick={() => setAlbumReadyModal({ open: false, apt: null, photoBase64: '', photoPreview: '', pickupLocation: 'Studio Lapanbelas', operationalHours: '09.00 - 21.00 WIB', notes: '', loading: false })}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                                <SvgIcon name="package-check" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Konfirmasi Album Selesai Cetak</h3>
                                <p className="text-xs text-gray-400">Order #{albumReadyModal.apt?.id} &bull; {albumReadyModal.apt?.name}</p>
                            </div>
                        </div>

                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-200 mb-4 flex items-start gap-2">
                            <span className="text-cyan-400 text-sm">💡</span>
                            <span>Foto fisik album yang diunggah akan <strong>otomatis dikirim ke WhatsApp klien</strong> beserta kabar gembira bahwa pesanan sudah siap diambil di studio.</span>
                        </div>

                        <form onSubmit={handleSubmitAlbumReady} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                            {/* Upload Area */}
                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-2">Foto Fisik Album (Wajib) *</label>
                                {!albumReadyModal.photoPreview ? (
                                    <label className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                                        <SvgIcon name="camera" className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition duration-200 mb-2" />
                                        <span className="text-xs font-medium text-cyan-200">Klik untuk Ambil Foto / Pilih File</span>
                                        <span className="text-[10px] text-gray-500 mt-1">Format: JPG, PNG, WEBP (Maks 15MB)</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleFileToBase64(file, (base64) => {
                                                        setAlbumReadyModal(prev => ({
                                                            ...prev,
                                                            photoBase64: base64,
                                                            photoPreview: base64
                                                        }));
                                                    });
                                                }
                                            }}
                                        />
                                    </label>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                                        <img src={albumReadyModal.photoPreview} alt="Preview Album" className="w-full h-48 object-cover rounded-xl" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition duration-200">
                                            <label className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs cursor-pointer">
                                                Ganti Foto
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleFileToBase64(file, (base64) => {
                                                                setAlbumReadyModal(prev => ({
                                                                    ...prev,
                                                                    photoBase64: base64,
                                                                    photoPreview: base64
                                                                }));
                                                            });
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setAlbumReadyModal(prev => ({ ...prev, photoBase64: '', photoPreview: '' }))}
                                                className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Lokasi & Sharelock Pengambilan (Dapat disesuaikan per pengiriman) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-300 font-medium block mb-1">🏠 Lokasi Pengambilan</label>
                                    <input
                                        type="text"
                                        value={albumReadyModal.pickupLocation || ''}
                                        onChange={(e) => setAlbumReadyModal(prev => ({ ...prev, pickupLocation: e.target.value }))}
                                        placeholder="Studio Lapanbelas"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 font-medium block mb-1">📍 Link Sharelock / Google Maps</label>
                                    <input
                                        type="url"
                                        value={albumReadyModal.mapsUrl || ''}
                                        onChange={(e) => setAlbumReadyModal(prev => ({ ...prev, mapsUrl: e.target.value }))}
                                        placeholder="https://maps.app.goo.gl/..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            {/* Hari Buka, Hari Libur & Jam Operasional */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-gray-300 font-medium block mb-1">📅 Hari Buka</label>
                                    <input
                                        type="text"
                                        value={albumReadyModal.daysOpen || ''}
                                        onChange={(e) => setAlbumReadyModal(prev => ({ ...prev, daysOpen: e.target.value }))}
                                        placeholder="Senin - Sabtu"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 font-medium block mb-1">⛔ Hari Libur / Tutup</label>
                                    <input
                                        type="text"
                                        value={albumReadyModal.daysClosed || ''}
                                        onChange={(e) => setAlbumReadyModal(prev => ({ ...prev, daysClosed: e.target.value }))}
                                        placeholder="Minggu"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 font-medium block mb-1">⏰ Jam Operasional</label>
                                    <input
                                        type="text"
                                        value={albumReadyModal.operationalHours || ''}
                                        onChange={(e) => setAlbumReadyModal(prev => ({ ...prev, operationalHours: e.target.value }))}
                                        placeholder="09.00 - 17.30 WIB"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            {/* Catatan Fisik Album */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Catatan Tambahan (Opsional)</label>
                                <textarea
                                    value={albumReadyModal.notes}
                                    onChange={(e) => setAlbumReadyModal(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Contoh: Album 20x30 Box Kayu + Cetak Pembesar 16R sudah dicek QC"
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500 resize-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAlbumReadyModal({ open: false, apt: null, photoBase64: '', photoPreview: '', pickupLocation: 'Studio Lapanbelas', mapsUrl: '', daysOpen: 'Senin - Sabtu', daysClosed: 'Minggu', operationalHours: '09.00 - 17.30 WIB', notes: '', loading: false })}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!albumReadyModal.photoBase64 || albumReadyModal.loading}
                                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/30"
                                >
                                    {albumReadyModal.loading ? 'Mengunggah & Mengirim WA...' : '📦 Kirim Foto & Notif WA Klien'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Serah Terima Album (HARD GATE: Wajib Foto & Auto Feedback) */}
            {handoverModal.open && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-emerald-500/40 p-6 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col shadow-2xl shadow-emerald-950/30">
                        <button
                            onClick={() => setHandoverModal({ open: false, apt: null, photoBase64: '', photoPreview: '', recipientName: '', method: 'Ambil di Studio', isPortfolio: true, notes: '', loading: false })}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                                <SvgIcon name="handshake" className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-white">Form Serah Terima Album</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">HARD GATE</span>
                                </div>
                                <p className="text-xs text-gray-400">Order #{handoverModal.apt?.id} &bull; {handoverModal.apt?.name}</p>
                            </div>
                        </div>

                        {/* Owner Control Warning Box */}
                        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-200 mb-4 flex items-start gap-2">
                            <span className="text-red-400 text-sm shrink-0">⚠️</span>
                            <span><strong>PENGATURAN OWNER:</strong> Admin <strong>WAJIB</strong> mengambil/mengunggah foto klien saat menerima album fisik. Pesanan tidak dapat diselesaikan tanpa foto bukti!</span>
                        </div>

                        <form onSubmit={handleSubmitHandover} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                            {/* Wajib Foto Serah Terima */}
                            <div>
                                <label className="text-xs font-semibold text-white block mb-1">
                                    Foto Klien Memegang Album (Wajib) <span className="text-red-400">*</span>
                                </label>
                                {!handoverModal.photoPreview ? (
                                    <label className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/70 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition mb-2">
                                            <SvgIcon name="camera" className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-300">Ambil Foto Klien / Upload Foto Bukti</span>
                                        <span className="text-[10px] text-gray-400 mt-1">Buka kamera HP atau pilih file dari galeri</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleFileToBase64(file, (base64) => {
                                                        setHandoverModal(prev => ({
                                                            ...prev,
                                                            photoBase64: base64,
                                                            photoPreview: base64
                                                        }));
                                                    });
                                                }
                                            }}
                                        />
                                    </label>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 group">
                                        <img src={handoverModal.photoPreview} alt="Bukti Serah Terima" className="w-full h-52 object-cover rounded-xl" />
                                        <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                            ✓ Foto Bukti Terpasang
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition duration-200">
                                            <label className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs cursor-pointer">
                                                Ambil Ulang
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleFileToBase64(file, (base64) => {
                                                                setHandoverModal(prev => ({
                                                                    ...prev,
                                                                    photoBase64: base64,
                                                                    photoPreview: base64
                                                                }));
                                                            });
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setHandoverModal(prev => ({ ...prev, photoBase64: '', photoPreview: '' }))}
                                                className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Nama Penerima & Metode */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">Nama Penerima / Pengambil <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={handoverModal.recipientName}
                                        onChange={(e) => setHandoverModal(prev => ({ ...prev, recipientName: e.target.value }))}
                                        placeholder="Nama klien atau perwakilan..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">Metode Pengambilan</label>
                                    <select
                                        value={handoverModal.method}
                                        onChange={(e) => setHandoverModal(prev => ({ ...prev, method: e.target.value }))}
                                        className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 appearance-none"
                                    >
                                        <option value="Ambil di Studio">Ambil di Studio (Langsung)</option>
                                        <option value="Diambil Keluarga / Perwakilan">Diambil Keluarga / Perwakilan</option>
                                        <option value="Kurir Instan (Gojek/Grab)">Kurir Instan (Gojek/Grab)</option>
                                        <option value="Diantar Tim Studio">Diantar Tim Studio</option>
                                    </select>
                                </div>
                            </div>

                            {/* Checkbox Portofolio */}
                            <label className="flex items-center gap-2 p-3 bg-white/3 border border-white/8 rounded-xl cursor-pointer hover:bg-white/5 transition">
                                <input
                                    type="checkbox"
                                    checked={handoverModal.isPortfolio}
                                    onChange={(e) => setHandoverModal(prev => ({ ...prev, isPortfolio: e.target.checked }))}
                                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-transparent border-gray-600"
                                />
                                <div className="text-xs">
                                    <span className="font-semibold text-white">Izinkan sebagai Portofolio Media Sosial</span>
                                    <p className="text-[10px] text-gray-400">Klien berkenan fotonya diarsipkan dan diunggah ke Instagram / Story Studio.</p>
                                </div>
                            </label>

                            {/* Catatan Tambahan */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Catatan Tambahan (Opsional)</label>
                                <textarea
                                    value={handoverModal.notes}
                                    onChange={(e) => setHandoverModal(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Contoh: Klien sangat senang dengan cetakan foto dan bonus frame"
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500 resize-none"
                                />
                            </div>

                            {/* Auto Trigger Feedback Link Highlight */}
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                                <span className="text-sm">⭐</span>
                                <div>
                                    <strong className="block text-white">Otomatisasi Sistem:</strong>
                                    Status order akan diubah menjadi <strong className="text-emerald-400">Selesai</strong> dan link survei kepuasan/feedback akan <strong className="text-emerald-400">langsung terkirim otomatis ke WhatsApp klien</strong>.
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setHandoverModal({ open: false, apt: null, photoBase64: '', photoPreview: '', recipientName: '', method: 'Ambil di Studio', isPortfolio: true, notes: '', loading: false })}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!handoverModal.photoBase64 || !handoverModal.recipientName.trim() || handoverModal.loading}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                                >
                                    {handoverModal.loading ? 'Menyimpan & Mengirim Feedback...' : '🤝 Simpan & Selesaikan Pesanan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Verifikasi Serah Terima File Mentah Fotografer (FG Handover Gate) */}
            {rawHandoverModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg rounded-2xl border border-amber-500/30 overflow-hidden shadow-2xl bg-[#0f1117] flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <SvgIcon name="folder-down" className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                        Verifikasi Serah Terima File Mentah FG
                                    </h3>
                                    <p className="text-[11px] text-amber-300">
                                        {rawHandoverModal.apt?.id} • {rawHandoverModal.apt?.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRawHandoverModal({ open: false, apt: null, photographerName: '', videographerName: '', fileCount: '', storageSize: '', sdCardReturned: true, backupCompleted: true, allFormatsComplete: true, notes: '', loading: false })}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
                            >
                                <SvgIcon name="x" className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRawHandover} className="p-5 overflow-y-auto space-y-4 text-left custom-scrollbar">
                            {/* Ringkasan Acara */}
                            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs flex justify-between items-center">
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Paket & Tanggal Acara:</span>
                                    <span className="text-white font-medium">{rawHandoverModal.apt?.pkg}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-400 block text-[10px]">Tgl Acara:</span>
                                    <span className="text-amber-400 font-semibold">{formatDateUI(rawHandoverModal.apt?.eventDate)}</span>
                                </div>
                            </div>

                            {/* Kru Penyetor */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-gray-300 block mb-1">
                                        Nama Fotografer (FG) <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={rawHandoverModal.photographerName}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, photographerName: e.target.value }))}
                                        placeholder="Nama fotografer..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-300 block mb-1">
                                        Nama Videografer (VG)
                                    </label>
                                    <input
                                        type="text"
                                        value={rawHandoverModal.videographerName}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, videographerName: e.target.value }))}
                                        placeholder="Nama videografer (opsional)..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            {/* Total File & Kapasitas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-gray-300 block mb-1">
                                        Total File Mentah <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={rawHandoverModal.fileCount}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, fileCount: e.target.value }))}
                                        placeholder="Contoh: 1.250 Foto"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-300 block mb-1">
                                        Kapasitas / Ukuran Folder
                                    </label>
                                    <input
                                        type="text"
                                        value={rawHandoverModal.storageSize}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, storageSize: e.target.value }))}
                                        placeholder="Contoh: 45 GB"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Checklist Kontrol Kualitas & Keamanan Data */}
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2.5">
                                <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                                    🛡️ Checklist Kontrol & Keamanan File Studio
                                </p>
                                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={rawHandoverModal.sdCardReturned}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, sdCardReturned: e.target.checked }))}
                                        className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-0 bg-transparent border-gray-600"
                                    />
                                    <span className="text-gray-300 leading-tight">
                                        <strong className="text-white block">Kartu Memori (SD Card)</strong> Seluruh memory card sudah disalin ke storage lokal studio dan dikembalikan/dikosongkan dengan aman.
                                    </span>
                                </label>
                                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={rawHandoverModal.backupCompleted}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, backupCompleted: e.target.checked }))}
                                        className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-0 bg-transparent border-gray-600"
                                    />
                                    <span className="text-gray-300 leading-tight">
                                        <strong className="text-white block">Backup Data Terverifikasi</strong> Folder file mentah sudah terduplikasi di Harddisk Backup / Server Studio.
                                    </span>
                                </label>
                                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={rawHandoverModal.allFormatsComplete}
                                        onChange={(e) => setRawHandoverModal(prev => ({ ...prev, allFormatsComplete: e.target.checked }))}
                                        className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-0 bg-transparent border-gray-600"
                                    />
                                    <span className="text-gray-300 leading-tight">
                                        <strong className="text-white block">Integritas Format</strong> Format RAW (.CR3 / .ARW / .NEF) dan Video (.MP4 / .MOV) lengkap dan tidak korup.
                                    </span>
                                </label>
                            </div>

                            {/* Catatan Serah Terima */}
                            <div>
                                <label className="text-[11px] text-gray-400 block mb-1">Catatan Serah Terima (Opsional)</label>
                                <textarea
                                    value={rawHandoverModal.notes}
                                    onChange={(e) => setRawHandoverModal(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Contoh: Sesi akad lancar, ada tambahan 1 card cadangan untuk momen resepsi..."
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500 resize-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRawHandoverModal({ open: false, apt: null, photographerName: '', videographerName: '', fileCount: '', storageSize: '', sdCardReturned: true, backupCompleted: true, allFormatsComplete: true, notes: '', loading: false })}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!rawHandoverModal.photographerName.trim() || !rawHandoverModal.fileCount.trim() || rawHandoverModal.loading}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40"
                                >
                                    {rawHandoverModal.loading ? 'Menyimpan & Memverifikasi...' : '📁 Konfirmasi Terima File Mentah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppointmentComponent;
export { AppointmentComponent };
