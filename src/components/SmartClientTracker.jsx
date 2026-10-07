import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PhotoLightboxModal from './PhotoLightboxModal';

/**
 * Komponen SvgIcon internal yang mandiri & aman dari dependensi eksternal
 */
const SmartIcon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        "zap": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
        "users": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
        "clock": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
        "alert-triangle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
        "alert-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
        "check-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
        "calendar-days": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
        "search": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
        "refresh-cw": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>,
        "copy": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
        "external-link": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
        "send": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
        "message-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
        "folder": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
        "bell": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
        "check": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
        "package": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
        "calendar": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
        "sparkles": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" /></svg>,
        "chevron-left": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>,
        "chevron-right": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>,
        "x": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
        "eye": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
        "camera": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
        "image": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
    };
    return icons[name] || null;
};

const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62') && p.length > 5) p = '62' + p;
    return p;
};

const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

/**
 * Helper untuk mendeteksi paket dekorasi yang sudah include foto (paket komplit / bundling / full package)
 */
export const isDekorKomplitPackage = (pkgName = '') => {
    if (!pkgName) return false;
    const p = pkgName.toLowerCase();
    const isDecorOrWedding = p.includes('dekor') || p.includes('pelaminan') || p.includes('meter') || p.includes('akad') || p.includes('engagement');
    const isKomplit = p.includes('komplit') || p.includes('full package') || p.includes('bundling');
    return isDecorOrWedding && isKomplit;
};

/**
 * Helper untuk mengambil kuota foto paket dari database packages
 */
export const getPackagePhotoLimit = (pkgName, packagesList = []) => {
    if (!pkgName) return null;
    const pkg = packagesList.find(p => (p.title || '').trim().toLowerCase() === (pkgName || '').trim().toLowerCase());
    if (pkg && pkg.description) {
        const m = pkg.description.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
        if (m) return parseInt(m[1], 10);
    }
    return null;
};

/**
 * Helper untuk membaca detail foto yang sudah dipilih oleh klien (draft / submitted)
 */
export const getClientSelectionInfo = (appt, packagesList = []) => {
    let count = 0;
    let photosList = [];
    let isSubmitted = false;
    let isDraft = false;
    let lastUpdated = null;
    const photoLimit = getPackagePhotoLimit(appt.package_name, packagesList);

    const ps = appt.photo_selections;
    if (ps) {
        if (ps.sessions && typeof ps.sessions === 'object') {
            Object.values(ps.sessions).forEach(sess => {
                if (sess.photos && Array.isArray(sess.photos)) {
                    sess.photos.forEach(p => {
                        const name = typeof p === 'string' ? p : (p.name || p.id || 'Foto');
                        const id = typeof p === 'object' ? p.id : null;
                        const thumbnailLink = typeof p === 'object' ? (p.thumbnailLink || p.thumbnail) : null;
                        const largeThumbnailLink = typeof p === 'object' ? (p.largeThumbnailLink || p.largeThumbnail) : null;
                        photosList.push({ id, name, thumbnailLink, largeThumbnailLink, note: p.note || '', sessionId: sess.sessionId || 'session-1' });
                    });
                }
                if (sess.status === 'Terkirim') isSubmitted = true;
                if (sess.submittedAt) lastUpdated = sess.submittedAt;
            });
        } else if (ps.photos && Array.isArray(ps.photos)) {
            ps.photos.forEach(p => {
                const name = typeof p === 'string' ? p : (p.name || p.id || 'Foto');
                const id = typeof p === 'object' ? p.id : null;
                const thumbnailLink = typeof p === 'object' ? (p.thumbnailLink || p.thumbnail) : null;
                const largeThumbnailLink = typeof p === 'object' ? (p.largeThumbnailLink || p.largeThumbnail) : null;
                photosList.push({ id, name, thumbnailLink, largeThumbnailLink, note: p.note || '' });
            });
            isSubmitted = true;
        }

        // Cek cloud drafts jika sesi belum ada foto submit
        if (photosList.length === 0 && ps.drafts && typeof ps.drafts === 'object') {
            Object.values(ps.drafts).forEach(d => {
                if (d && Array.isArray(d.selectedPhotos)) {
                    d.selectedPhotos.forEach(p => {
                        const name = typeof p === 'string' ? p : (p.name || p.id || 'Foto');
                        const id = typeof p === 'object' ? p.id : null;
                        const thumbnailLink = typeof p === 'object' ? (p.thumbnailLink || p.thumbnail) : null;
                        const largeThumbnailLink = typeof p === 'object' ? (p.largeThumbnailLink || p.largeThumbnail) : null;
                        photosList.push({ id, name, thumbnailLink, largeThumbnailLink, note: p.note || '', isDraft: true });
                    });
                    isDraft = true;
                }
                if (d && d.updatedAt) lastUpdated = d.updatedAt;
            });
        }
    }

    if (photosList.length === 0 && appt.additional_notes && appt.additional_notes.includes('[FOTO TERPILIH]:')) {
        const m = appt.additional_notes.match(/\[FOTO TERPILIH\]:\s*([^\n]+)/);
        if (m && m[1]) {
            m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(name => {
                photosList.push({ name, note: '', source: 'notes' });
            });
            isSubmitted = true;
        }
    }

    count = photosList.length;
    return {
        count,
        photosList,
        isSubmitted,
        isDraft,
        lastUpdated,
        photoLimit
    };
};

export default function SmartClientTracker({
    supabase,
    adminFetch,
    onShowToast,
    onNavigate,
    mode = null,
    isEmbedded = false
}) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // 4 Tab Navigasi: 'unselected' | 'ongoing' | 'deadline' | 'upcoming'
    const [activeTab, setActiveTab] = useState('unselected');
    const [searchQuery, setSearchQuery] = useState('');
    const [agingFilter, setAgingFilter] = useState('all'); // 'all' | '1m' | '2m' | '3m'
    const [ongoingFilter, setOngoingFilter] = useState('all'); // 'all' | 'waiting' | 'queue' | 'editing' | 'preview'
    const [urgencyFilter, setUrgencyFilter] = useState('all'); // 'all' | 'overdue' | 'today' | 'h1-3' | 'h4-10'
    const [upcomingFilter, setUpcomingFilter] = useState('all'); // 'all' | 'month' | '1-3m' | 'far'
    const [copiedId, setCopiedId] = useState(null);
    const [sendingReminderId, setSendingReminderId] = useState(null);
    const [sendingClientWaId, setSendingClientWaId] = useState(null);
    const [isTriggeringAll, setIsTriggeringAll] = useState(false);
    const [isBlastingAllClients, setIsBlastingAllClients] = useState(false);

    // Modal Pemantau Portal Seleksi Klien
    const [selectedClientForPortal, setSelectedClientForPortal] = useState(null);
    const [livePortalLoading, setLivePortalLoading] = useState(false);
    const [livePortalDetails, setLivePortalDetails] = useState(null);
    const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(null);

    // Pagination States (Default 10 per page for smooth scrolling)
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // 10 | 25 | 50 | 'all'

    // Raw datasets
    const [appointments, setAppointments] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [packages, setPackages] = useState([]);
    const [settingsMap, setSettingsMap] = useState({});
    const [adminUsers, setAdminUsers] = useState([]);
    const [crewMembers, setCrewMembers] = useState([]);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const [apptRes, assignRes, pkgRes, settingsRes, usersRes, crewRes] = await Promise.all([
                supabase
                    .from('appointments')
                    .select('id, client_name, client_email, client_phone, client_address, additional_notes, package_name, event_date, resepsi_date, status, dp_amount, total_amount, created_at, drive_link, photo_selections'),
                supabase.from('editor_assignments').select('*'),
                supabase.from('packages').select('*'),
                supabase.from('settings').select('*'),
                supabase.from('admin_users').select('username, display_name, role'),
                supabase.from('crew_members').select('name, phone, role, is_active')
            ]);

            if (apptRes.error) throw apptRes.error;
            if (assignRes.error) throw assignRes.error;

            setAppointments(apptRes.data || []);
            setAssignments(assignRes.data || []);
            setPackages(pkgRes.data || []);

            const sMap = {};
            if (settingsRes && settingsRes.data) {
                settingsRes.data.forEach(s => { sMap[s.key] = s.value; });
            }
            setSettingsMap(sMap);
            setAdminUsers(usersRes.data || []);
            setCrewMembers(crewRes.data || []);
        } catch (err) {
            console.error('[SmartClientTracker] Error fetching data:', err);
            if (onShowToast) onShowToast('Gagal memuat data Smart Client: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase, onShowToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset pagination to page 1 whenever activeTab or any sub-filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, agingFilter, ongoingFilter, urgencyFilter, upcomingFilter, pageSize]);

    // Reference today date in WIB
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // 1. DATA PROCESSOR: Klien Belum Pilih Foto (Aging) - Hanya yang ACARANYA SUDAH LEWAT
    const unselectedClients = useMemo(() => {
        if (!appointments.length) return [];

        const list = [];
        appointments.forEach(appt => {
            if (appt.status === 'Batal' || appt.status === 'Cancel') return;

            // Matching mode/divisi jika mode disediakan
            if (mode === 'studio' && !((appt.package_name || '').toLowerCase().includes('studio') || (appt.package_name || '').toLowerCase().includes('self photo'))) {
                return;
            }

            const ass = assignments.find(a => a.appointment_id === appt.id);
            const hasPhotoSelections = appt.photo_selections && (
                (appt.photo_selections.photos && appt.photo_selections.photos.length > 0) ||
                (appt.photo_selections.sessions && Object.keys(appt.photo_selections.sessions).length > 0)
            );
            const hasNotesSelection = (appt.additional_notes || '').includes('[FOTO TERPILIH]:');

            let hasDateInAssignment = false;
            let parsedDriveLink = appt.drive_link || '';
            if (ass && ass.file_code && ass.file_code.includes(' || ')) {
                const parts = ass.file_code.split(' || ');
                parsedDriveLink = parts[2] || parts[1] || parsedDriveLink;
                if (parts[3] && parts[3].trim()) hasDateInAssignment = true;
            }

            const isFotoDone = ass && (ass.status_foto === 'Done' || ass.status_foto === 'Selesai');
            const hasSelected = hasPhotoSelections || hasNotesSelection || hasDateInAssignment || isFotoDone;

            // Kriteria: Belum pilih foto DAN tanggal acara sudah terlaksana (sudah lewat)
            if (!hasSelected && appt.event_date) {
                const evDate = new Date(appt.event_date);
                evDate.setHours(0, 0, 0, 0);

                if (evDate <= today) {
                    const diffTime = today - evDate;
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const months = Math.floor(diffDays / 30);
                    const selectionInfo = getClientSelectionInfo(appt, packages);

                    list.push({
                        id: appt.id,
                        name: appt.client_name || 'Tanpa Nama',
                        phone: appt.client_phone || '',
                        email: appt.client_email || '',
                        package: appt.package_name || 'Paket Foto',
                        eventDate: appt.event_date,
                        eventDateFormatted: formatDateIndo(appt.event_date),
                        status: appt.status,
                        driveLink: parsedDriveLink,
                        diffDays,
                        months,
                        selectionInfo
                    });
                }
            }
        });

        // Urutkan dari yang paling lama belum pilih (aging terbesar)
        return list.sort((a, b) => b.diffDays - a.diffDays);
    }, [appointments, assignments, packages, mode, today]);

    // 2. DATA PROCESSOR: Project Belum Selesai (Pasca-Acara Aktif)
    // HANYA project yang acaranya SUDAH LEWAT (evDate <= today) dan belum serah terima / belum selesai!
    const ongoingProjects = useMemo(() => {
        if (!appointments.length) return [];

        const list = [];
        appointments.forEach(appt => {
            if (appt.status === 'Batal' || appt.status === 'Cancel' || appt.status === 'Selesai' || appt.status === 'Menunggu DP') return;
            const hasHandover = (appt.additional_notes || '').includes('[HANDOVER_RECORD]');
            if (hasHandover) return;

            if (!appt.event_date) return;
            const evDate = new Date(appt.event_date);
            evDate.setHours(0, 0, 0, 0);

            // Jika acara BELUM TERJADI, maka masuk tab Acara Mendatang (Upcoming), BUKAN project aktif pasca-acara!
            if (evDate > today) return;

            const ass = assignments.find(a => a.appointment_id === appt.id);
            const isFotoDone = ass ? (ass.status_foto === 'Done' || ass.status_foto === 'Selesai') : false;
            const isVideoDone = ass ? (ass.status_video === 'Done' || ass.status_video === 'Selesai' || ass.status_video === 'Belum Diproses') : true;

            // Jika foto belum selesai ATAU video belum selesai
            if (!isFotoDone || !isVideoDone) {
                const hasPhotoSelections = appt.photo_selections && (
                    (appt.photo_selections.photos && appt.photo_selections.photos.length > 0) ||
                    (appt.photo_selections.sessions && Object.keys(appt.photo_selections.sessions).length > 0)
                );
                const hasNotesSelection = (appt.additional_notes || '').includes('[FOTO TERPILIH]:');
                let hasDateInAssignment = false;
                if (ass && ass.file_code && ass.file_code.includes(' || ')) {
                    const parts = ass.file_code.split(' || ');
                    if (parts[3] && parts[3].trim()) hasDateInAssignment = true;
                }
                const hasSelected = hasPhotoSelections || hasNotesSelection || hasDateInAssignment || isFotoDone;

                // Tentukan stage pasca-acara yang sebenarnya
                let stageKey = 'waiting';
                let stageLabel = 'Menunggu Seleksi Klien';
                let stageBadgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';

                if (!hasSelected) {
                    stageKey = 'waiting';
                    stageLabel = 'Menunggu Seleksi Klien';
                    stageBadgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                } else if (ass && (ass.status_foto === 'Selesai untuk Preview' || ass.status_video === 'Selesai untuk Preview')) {
                    stageKey = 'preview';
                    stageLabel = 'Preview Hasil ke Klien';
                    stageBadgeClass = 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
                } else if (ass && (ass.status_foto === 'Proses Editing' || ass.status_video === 'Proses Editing')) {
                    stageKey = 'editing';
                    stageLabel = 'Sedang Diedit';
                    stageBadgeClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                } else if (ass && (ass.status_foto === 'Antrian Pengerjaan' || ass.status_video === 'Antrian Pengerjaan')) {
                    stageKey = 'queue';
                    stageLabel = 'Antrian Pengerjaan Editor';
                    stageBadgeClass = 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
                } else {
                    stageKey = 'editing';
                    stageLabel = ass ? (ass.status_foto || 'Belum Diproses') : 'Belum Ditugaskan';
                    stageBadgeClass = 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
                }

                // Parse editors
                let editorFoto = '-';
                let editorVideo = '-';
                if (ass && ass.editor_name) {
                    if (ass.editor_name.includes(' || ')) {
                        const edParts = ass.editor_name.split(' || ');
                        editorFoto = edParts[0]?.trim() || '-';
                        editorVideo = edParts[1]?.trim() || '-';
                    } else {
                        editorFoto = ass.editor_name;
                    }
                }

                list.push({
                    id: appt.id,
                    name: appt.client_name || 'Tanpa Nama',
                    phone: appt.client_phone || '',
                    email: appt.client_email || '',
                    package: appt.package_name || 'Paket Foto',
                    eventDate: appt.event_date,
                    eventDateFormatted: formatDateIndo(appt.event_date),
                    status: appt.status,
                    stageKey,
                    stageLabel,
                    stageBadgeClass,
                    editorFoto,
                    editorVideo,
                    deadlineFoto: ass?.deadline || '',
                    deadlineVideo: ass?.deadline_video || '',
                    deadlineFormatted: ass?.deadline ? formatDateIndo(ass.deadline) : (ass?.deadline_video ? formatDateIndo(ass.deadline_video) : '-')
                });
            }
        });

        // Urutkan dari acara pasca-event yang paling baru terlaksana (paling butuh tindakan produksi)
        return list.sort((a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0));
    }, [appointments, assignments, today]);

    // 3. DATA PROCESSOR: Mendekati Deadline (H-10 & Overdue)
    const deadlineAlerts = useMemo(() => {
        if (!assignments.length) return [];

        const list = [];
        assignments.forEach(ass => {
            const appt = appointments.find(a => a.id === ass.appointment_id);
            if (!appt) return;
            if (appt.status === 'Batal' || appt.status === 'Cancel' || appt.status === 'Selesai') return;
            const hasHandover = (appt.additional_notes || '').includes('[HANDOVER_RECORD]');
            if (hasHandover) return;

            // Parse editors (support || or |)
            let editorFoto = '';
            let editorVideo = '';
            if (ass.editor_name) {
                const edParts = ass.editor_name.split(/\s*\|\|\s*|\s*\|\s*/);
                editorFoto = edParts[0]?.trim() || '';
                editorVideo = edParts[1]?.trim() || '';
            }

            const notesStr = (appt.additional_notes || appt.notes || '');
            const pkgLower = (appt.package_name || '').toLowerCase();
            const isStudioNotes = notesStr.includes('[ROOM STUDIO]') || notesStr.includes('[DIVISI]: Studio Lapanbelas');
            const isStudioPkg = ['studio', 'wisuda', 'self photo', 'photo self', 'photobox', 'pas foto', 'pas photo', 'keluargaku', 'keluarga', 'family', 'group', 'kawan kita', 'together', 'corporate', 'personal', 'maternity', 'baby', 'karnaval', 'sweet', 'romance', 'eternity', 'harmony'].some(k => pkgLower.includes(k));
            const isExplicitWedding = ['wedding', 'akad intimate', 'akad postwed', 'resepsi', 'prewed package', 'postwed', 'engagement', 'lamaran', 'syukuran', 'unduh mantu', 'centro', 'royal', 'gold combo', 'silver package', 'gold package', 'platinum package', 'bravo package', 'bronze package', 'delta package'].some(k => pkgLower.includes(k));
            const isStudio = isStudioNotes || (!isExplicitWedding && isStudioPkg) || (editorFoto && editorFoto.toLowerCase().includes('studio'));

            const resolvePhone = (edName, taskType) => {
                const raw = String(edName || '').trim();
                const clean = raw.replace(/\s*\(Studio\)/gi, '').trim().toLowerCase();
                const nameLower = raw.toLowerCase();

                if (clean) {
                    // 1. Crew members match (nomor HP terdaftar)
                    const crew = crewMembers.find(c => c.name && c.name.trim().toLowerCase() === clean && c.is_active);
                    if (crew && crew.phone) {
                        const digits = String(crew.phone).replace(/[^0-9]/g, '');
                        if (digits.length >= 9) return digits;
                    }
                    // 2. Admin users match (nomor HP atau role)
                    const u = adminUsers.find(x => x.display_name && x.display_name.trim().toLowerCase() === clean);
                    if (u) {
                        if (u.username) {
                            const digits = u.username.replace(/[^0-9]/g, '');
                            if (digits.length >= 9 && digits.length <= 15) return digits;
                        }
                        if (u.role === 'editor_foto_studio') return settingsMap['team_wa_editor_studio'] || '62895630508478';
                        if (u.role === 'editor_video') return settingsMap['team_wa_vg_editor'] || '6281362132800';
                        if (u.role === 'editor_foto') return settingsMap['team_wa_editor_wedding'] || '6285262227876';
                    }
                }

                // 3. Deteksi eksplisit berdasarkan nama editor atau tipe tugas
                if (taskType.toLowerCase() === 'video' || nameLower.includes('video') || nameLower.includes('vg')) {
                    return settingsMap['team_wa_vg_editor'] || '6281362132800';
                }
                if (nameLower.includes('studio')) {
                    return settingsMap['team_wa_editor_studio'] || '62895630508478';
                }
                if (nameLower.includes('wedding') || nameLower.includes('photo 18') || nameLower.includes('outdoor')) {
                    return settingsMap['team_wa_editor_wedding'] || '6285262227876';
                }

                // 4. Fallback ke divisi order (Studio vs Wedding)
                if (isStudio) {
                    return settingsMap['team_wa_editor_studio'] || '62895630508478';
                } else {
                    return settingsMap['team_wa_editor_wedding'] || '6285262227876';
                }
            };

            const checkTaskDeadline = (deadlineDateStr, taskType, currentStatus, editorName) => {
                if (!deadlineDateStr) return;
                if (currentStatus === 'Done' || currentStatus === 'Selesai') return;

                const targetDate = new Date(deadlineDateStr);
                targetDate.setHours(0, 0, 0, 0);

                const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

                // Masuk kriteria H-10 ke bawah (diffDays <= 10) atau Overdue (diffDays < 0)
                if (diffDays <= 10) {
                    let urgencyKey = 'h4-10';
                    let urgencyBadge = '';
                    let urgencyLabel = '';

                    if (diffDays < 0) {
                        urgencyKey = 'overdue';
                        urgencyBadge = 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse';
                        urgencyLabel = `⚠️ Lewat Deadline (${Math.abs(diffDays)} Hari)`;
                    } else if (diffDays === 0) {
                        urgencyKey = 'today';
                        urgencyBadge = 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold animate-pulse';
                        urgencyLabel = `🔥 Batas Terakhir Hari Ini!`;
                    } else if (diffDays <= 3) {
                        urgencyKey = 'h1-3';
                        urgencyBadge = 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
                        urgencyLabel = `⏳ Kritis: H-${diffDays} (${diffDays} Hari Lagi)`;
                    } else {
                        urgencyKey = 'h4-10';
                        urgencyBadge = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                        urgencyLabel = `⚠️ Waspada: H-${diffDays} (${diffDays} Hari Lagi)`;
                    }

                    const editorPhone = resolvePhone(editorName, taskType);

                    list.push({
                        appointmentId: appt.id,
                        clientName: appt.client_name || 'Tanpa Nama',
                        clientPhone: appt.client_phone || '',
                        editorPhone,
                        package: appt.package_name || 'Paket Foto',
                        type: taskType,
                        deadline: deadlineDateStr,
                        deadlineFormatted: formatDateIndo(deadlineDateStr),
                        diffDays,
                        urgencyKey,
                        urgencyBadge,
                        urgencyLabel,
                        editorName: editorName || 'Belum Ditugaskan',
                        status: currentStatus || 'Belum Diproses',
                        isStudio,
                        additionalNotes: notesStr
                    });
                }
            };

            checkTaskDeadline(ass.deadline, 'Foto', ass.status_foto, editorFoto);
            checkTaskDeadline(ass.deadline_video, 'Video', ass.status_video, editorVideo);
        });

        // Urutkan dari yang paling terlambat / mendesak (diffDays terkecil ke terbesar)
        return list.sort((a, b) => a.diffDays - b.diffDays);
    }, [assignments, appointments, today, settingsMap, adminUsers, crewMembers]);

    // 4. DATA PROCESSOR: Acara Mendatang (Upcoming Bookings)
    // Booking sah (Sudah DP / Lunas) yang tanggal acaranya BELUM TERJADI (evDate > today)
    const upcomingEvents = useMemo(() => {
        if (!appointments.length) return [];

        const list = [];
        appointments.forEach(appt => {
            if (appt.status === 'Batal' || appt.status === 'Cancel' || appt.status === 'Menunggu DP') return;
            if (!appt.event_date) return;

            const evDate = new Date(appt.event_date);
            evDate.setHours(0, 0, 0, 0);

            // Hanya acara di masa depan
            if (evDate > today) {
                const diffTime = evDate - today;
                const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const monthsUntil = Math.floor(daysUntil / 30);

                let badgeClass = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                if (daysUntil <= 7) {
                    badgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-bold';
                } else if (daysUntil <= 30) {
                    badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold';
                } else if (daysUntil <= 90) {
                    badgeClass = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium';
                } else {
                    badgeClass = 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
                }

                list.push({
                    id: appt.id,
                    name: appt.client_name || 'Tanpa Nama',
                    phone: appt.client_phone || '',
                    email: appt.client_email || '',
                    package: appt.package_name || 'Paket Layanan',
                    eventDate: appt.event_date,
                    eventDateFormatted: formatDateIndo(appt.event_date),
                    status: appt.status,
                    daysUntil,
                    monthsUntil,
                    badgeClass
                });
            }
        });

        // Urutkan dari acara yang PALING DEKAT HARI H-NYA (misal Oktober 2026 -> 2027)
        return list.sort((a, b) => a.daysUntil - b.daysUntil);
    }, [appointments, today]);

    // FILTERED LISTS BASED ON SEARCH & SUBFILTERS
    const filteredUnselected = useMemo(() => {
        return unselectedClients.filter(item => {
            const matchesSearch = !searchQuery ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (agingFilter === '1m') return item.diffDays >= 30 && item.diffDays < 60;
            if (agingFilter === '2m') return item.diffDays >= 60 && item.diffDays < 90;
            if (agingFilter === '3m') return item.diffDays >= 90;
            if (agingFilter === 'dekor') return isDekorKomplitPackage(item.package);
            return true;
        });
    }, [unselectedClients, searchQuery, agingFilter]);

    const filteredOngoing = useMemo(() => {
        return ongoingProjects.filter(item => {
            const matchesSearch = !searchQuery ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.editorFoto.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.editorVideo.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (ongoingFilter === 'dekor') return isDekorKomplitPackage(item.package);
            if (ongoingFilter !== 'all' && item.stageKey !== ongoingFilter) return false;
            return true;
        });
    }, [ongoingProjects, searchQuery, ongoingFilter]);

    const filteredDeadlines = useMemo(() => {
        return deadlineAlerts.filter(item => {
            const matchesSearch = !searchQuery ||
                item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.clientPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.appointmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.editorName.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (urgencyFilter !== 'all' && item.urgencyKey !== urgencyFilter) return false;
            return true;
        });
    }, [deadlineAlerts, searchQuery, urgencyFilter]);

    const filteredUpcoming = useMemo(() => {
        return upcomingEvents.filter(item => {
            const matchesSearch = !searchQuery ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (upcomingFilter === 'month') return item.daysUntil <= 30;
            if (upcomingFilter === '1-3m') return item.daysUntil > 30 && item.daysUntil <= 90;
            if (upcomingFilter === 'far') return item.daysUntil > 90;
            if (upcomingFilter === 'dekor') return isDekorKomplitPackage(item.package);
            return true;
        });
    }, [upcomingEvents, searchQuery, upcomingFilter]);

    // Active full list for current tab
    const currentFullList = useMemo(() => {
        if (activeTab === 'unselected') return filteredUnselected;
        if (activeTab === 'ongoing') return filteredOngoing;
        if (activeTab === 'deadline') return filteredDeadlines;
        return filteredUpcoming;
    }, [activeTab, filteredUnselected, filteredOngoing, filteredDeadlines, filteredUpcoming]);

    // Paginated list for current page
    const paginatedItems = useMemo(() => {
        if (pageSize === 'all') return currentFullList;
        const startIndex = (currentPage - 1) * pageSize;
        return currentFullList.slice(startIndex, startIndex + pageSize);
    }, [currentFullList, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        if (pageSize === 'all') return 1;
        return Math.max(1, Math.ceil(currentFullList.length / pageSize));
    }, [currentFullList.length, pageSize]);

    const startItemIndex = useMemo(() => {
        if (currentFullList.length === 0) return 0;
        return (currentPage - 1) * (pageSize === 'all' ? currentFullList.length : pageSize) + 1;
    }, [currentFullList.length, currentPage, pageSize]);

    const endItemIndex = useMemo(() => {
        if (pageSize === 'all') return currentFullList.length;
        return Math.min(currentPage * pageSize, currentFullList.length);
    }, [currentFullList.length, currentPage, pageSize]);

    // Counters for badges
    const unselected1MCount = useMemo(() => unselectedClients.filter(c => c.diffDays >= 30 && c.diffDays < 60).length, [unselectedClients]);
    const unselected2MCount = useMemo(() => unselectedClients.filter(c => c.diffDays >= 60 && c.diffDays < 90).length, [unselectedClients]);
    const unselected3MCount = useMemo(() => unselectedClients.filter(c => c.diffDays >= 90).length, [unselectedClients]);
    const unselectedDekorKomplitCount = useMemo(() => unselectedClients.filter(c => isDekorKomplitPackage(c.package)).length, [unselectedClients]);

    const ongoingDekorKomplitCount = useMemo(() => ongoingProjects.filter(p => isDekorKomplitPackage(p.package)).length, [ongoingProjects]);

    const overdueCount = useMemo(() => deadlineAlerts.filter(d => d.diffDays < 0).length, [deadlineAlerts]);
    const todayDeadlineCount = useMemo(() => deadlineAlerts.filter(d => d.diffDays === 0).length, [deadlineAlerts]);
    const upcomingDeadlineCount = useMemo(() => deadlineAlerts.filter(d => d.diffDays > 0).length, [deadlineAlerts]);

    const upcomingMonthCount = useMemo(() => upcomingEvents.filter(e => e.daysUntil <= 30).length, [upcomingEvents]);
    const upcoming1to3MCount = useMemo(() => upcomingEvents.filter(e => e.daysUntil > 30 && e.daysUntil <= 90).length, [upcomingEvents]);
    const upcomingFarCount = useMemo(() => upcomingEvents.filter(e => e.daysUntil > 90).length, [upcomingEvents]);
    const upcomingDekorKomplitCount = useMemo(() => upcomingEvents.filter(e => isDekorKomplitPackage(e.package)).length, [upcomingEvents]);

    // ACTION: Copy Portal Link
    const handleCopyPortalLink = (id, e) => {
        if (e) e.stopPropagation();
        const url = `${window.location.origin}/pilih-foto/${id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedId(id);
            if (onShowToast) onShowToast('Link Portal Seleksi berhasil disalin ke clipboard! 📋', 'success');
            setTimeout(() => setCopiedId(null), 2500);
        }).catch(() => {
            if (onShowToast) onShowToast('Gagal menyalin link: ' + url, 'error');
        });
    };

    // ACTION: WA Pengingat Klien Belum Pilih Foto
    const getWaClientSelectionLink = (item) => {
        const phone = cleanPhoneNumber(item.phone);
        const portalUrl = `${window.location.origin}/pilih-foto/${item.id}`;
        const msg = `Halo Kak *${item.name.toUpperCase()}*! ✨\n\nKami dari tim *18Studio* ingin menyapa dan menginformasikan perihal foto sesi:\n📌 Paket: *${item.package}*\n📅 Tanggal Acara: *${item.eventDateFormatted}*\n\nSaat ini seluruh foto mentah Anda sudah siap untuk dipilih. Mohon kesediaannya meluangkan waktu untuk memilih foto favorit agar tim editor kami dapat segera menjadwalkan proses editing hasil foto terbaik Kakak ya. 😊\n\n🔗 *Link Portal Seleksi Foto Langsung:* \n${portalUrl}\n${item.driveLink ? `\n📁 *Folder Google Drive:* \n${item.driveLink}\n` : ''}\nApabila ada kendala dalam mengakses portal atau memilih foto, silakan kabari kami ya Kak. Terima kasih banyak! 🙏✨`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    // ACTION: WA Konfirmasi Acara Mendatang
    const getWaUpcomingConfirmationLink = (item) => {
        const phone = cleanPhoneNumber(item.phone);
        const isKomplit = isDekorKomplitPackage(item.package);
        const pkgText = isKomplit ? `*${item.package}* (Termasuk Dokumentasi Foto & Video)` : `*${item.package}*`;
        const msg = `Halo Kak *${item.name.toUpperCase()}*! ✨\n\nKami dari tim *18Studio* ingin menyapa dan mengonfirmasi kembali jadwal sesi acara Anda:\n📌 Paket: ${pkgText}\n📅 Tanggal Acara: *${item.eventDateFormatted}* (H-${item.daysUntil})\n\nTim kami saat ini sedang mempersiapkan seluruh kebutuhan jadwal dan kru untuk memastikan momen terbaik Kakak terabadikan dengan sempurna. Jika ada arahan khusus atau update jadwal, silakan kabari kami ya Kak. Terima kasih banyak! 🙏✨`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    // ACTION: WA Pengingat Editor Deadline
    const getWaEditorDeadlineLink = (item) => {
        const isVideo = item.type === 'Video' || item.editorName?.toLowerCase().includes('video');
        const pkgLower = (item.package || '').toLowerCase();
        const notesStr = (item.additionalNotes || '').toLowerCase();
        const isStudioItem = item.isStudio || 
            item.editorName?.toLowerCase().includes('studio') || 
            notesStr.includes('[room studio]') || 
            notesStr.includes('[divisi]: studio lapanbelas') || 
            ['studio', 'wisuda', 'self photo', 'photo self', 'photobox', 'pas foto', 'pas photo', 'keluargaku', 'keluarga', 'family', 'group', 'kawan kita', 'together', 'corporate', 'personal', 'maternity', 'baby', 'karnaval', 'sweet', 'romance', 'eternity', 'harmony'].some(k => pkgLower.includes(k));

        const fallbackPhone = isVideo
            ? (settingsMap['team_wa_vg_editor'] || '6281362132800')
            : (isStudioItem
                ? (settingsMap['team_wa_editor_studio'] || '62895630508478')
                : (settingsMap['team_wa_editor_wedding'] || '6285262227876'));

        const phone = cleanPhoneNumber(item.editorPhone || fallbackPhone);
        const isOverdue = item.diffDays < 0;
        const alertPrefix = isOverdue
            ? `⚠️ *PERINGATAN LEWAT DEADLINE (${Math.abs(item.diffDays)} HARI TERLAMBAT)*`
            : item.diffDays === 0
                ? `🔥 *DEADLINE HARI INI!*`
                : `⏳ *PENGINGAT DEADLINE: H-${item.diffDays} (${item.diffDays} HARI LAGI)*`;

        const msg = `Halo Editor *${item.editorName}*,\n\n${alertPrefix}\n\n📋 *Detail Tugas:* \n- Project: *${item.clientName}* (${item.appointmentId})\n- Paket: *${item.package}*\n- Tugas: *Editor ${item.type}*\n- Tanggal Deadline: *${item.deadlineFormatted}*\n- Status Pengerjaan: *${item.status}*\n\nMohon pastikan proses editing berjalan lancar dan segera unggah tautan hasil ke sistem ya. Terima kasih! 🙏`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    // ACTION: Buka Modal Pemantau Portal Seleksi Klien
    const handleOpenClientPortalModal = async (item) => {
        setSelectedClientForPortal(item);
        setLivePortalLoading(true);
        setLivePortalDetails(null);

        try {
            const res = await adminFetch(`/api/drive-folder-photos/${item.id}`);
            const data = await res.json();
            if (data && data.success) {
                setLivePortalDetails(data);
            }
        } catch (err) {
            console.warn('[SmartClientTracker] Gagal load detail live portal:', err.message);
        } finally {
            setLivePortalLoading(false);
        }
    };

    // ACTION: Blast WhatsApp Tunggal Otomatis ke Klien (Tanpa Manual)
    const handleBlastSingleClientWA = async (item) => {
        setSendingClientWaId(item.id);
        if (onShowToast) onShowToast(`Mengirim blast WhatsApp ke Kak ${item.name} (${item.phone})...`, 'info');

        try {
            const res = await adminFetch('/api/send-photo-selection-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: item.id,
                    driveLink: item.driveLink
                })
            });
            const data = await res.json();
            if (data.success && data.waSent) {
                if (onShowToast) onShowToast(`Sukses! Pesan WhatsApp seleksi foto terblast otomatis ke ${item.name}! 🚀`, 'success');
            } else if (data.success) {
                if (onShowToast) onShowToast(`Pengingat terkirim (Email: ${data.emailSent ? 'Ya' : 'Tidak'}, WA: ${data.waSent ? 'Ya' : 'Cek nomor'}), silakan gunakan WA Web sebagai cadangan.`, 'info');
            } else {
                if (onShowToast) onShowToast('Gagal mengirim blast: ' + (data.error || 'Terjadi kesalahan gateway WA'), 'error');
            }
        } catch (err) {
            if (onShowToast) onShowToast('Error server: ' + err.message, 'error');
        } finally {
            setSendingClientWaId(null);
        }
    };

    // ACTION: Blast WhatsApp Massal ke Seluruh Klien Belum Pilih Foto
    const handleBlastAllSelectionClients = async () => {
        if (unselectedClients.length === 0) return;
        const confirmBlast = window.confirm(`Kirim blast WhatsApp pengingat seleksi foto otomatis ke ${unselectedClients.length} klien sekarang?`);
        if (!confirmBlast) return;

        setIsBlastingAllClients(true);
        if (onShowToast) onShowToast(`Memulai proses blast WhatsApp ke ${unselectedClients.length} klien...`, 'info');

        try {
            const orderIds = unselectedClients.map(c => c.id);
            const res = await adminFetch('/api/blast-selection-reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds })
            });
            const data = await res.json();
            if (data.success) {
                if (onShowToast) onShowToast(`Selesai! ${data.sentCount} dari ${data.totalTargets} pesan WhatsApp pengingat berhasil terblast otomatis! 🚀`, 'success');
            } else {
                if (onShowToast) onShowToast('Gagal blast massal: ' + (data.error || 'Terjadi kesalahan'), 'error');
            }
        } catch (err) {
            if (onShowToast) onShowToast('Error server: ' + err.message, 'error');
        } finally {
            setIsBlastingAllClients(false);
        }
    };

    // Data komputasi untuk modal portal seleksi
    const modalSelectionData = useMemo(() => {
        if (!selectedClientForPortal) return null;
        let count = selectedClientForPortal.selectionInfo?.count || 0;
        let rawPhotos = selectedClientForPortal.selectionInfo?.photosList || [];
        let isSubmitted = selectedClientForPortal.selectionInfo?.isSubmitted || false;
        let isDraft = selectedClientForPortal.selectionInfo?.isDraft || false;
        let photoLimit = selectedClientForPortal.selectionInfo?.photoLimit || null;
        let totalDriveFiles = null;

        if (livePortalDetails) {
            if (livePortalDetails.photo_limit) photoLimit = livePortalDetails.photo_limit;
            if (Array.isArray(livePortalDetails.files)) totalDriveFiles = livePortalDetails.files.length;
            
            if (Array.isArray(livePortalDetails.packages_sessions) && livePortalDetails.packages_sessions.length > 0) {
                let livePhotos = [];
                livePortalDetails.packages_sessions.forEach(s => {
                    if (s.submittedPhotos && Array.isArray(s.submittedPhotos) && s.submittedPhotos.length > 0) {
                        s.submittedPhotos.forEach(p => {
                            livePhotos.push({
                                id: p.id || null,
                                name: p.name || p.id || 'Foto',
                                thumbnailLink: p.thumbnailLink || null,
                                largeThumbnailLink: p.largeThumbnailLink || null,
                                note: p.note || ''
                            });
                        });
                        isSubmitted = true;
                    } else if (s.draft && Array.isArray(s.draft.selectedPhotos) && s.draft.selectedPhotos.length > 0) {
                        s.draft.selectedPhotos.forEach(p => {
                            livePhotos.push({
                                id: p.id || null,
                                name: p.name || p.id || 'Foto',
                                thumbnailLink: p.thumbnailLink || null,
                                largeThumbnailLink: p.largeThumbnailLink || null,
                                note: p.note || '',
                                isDraft: true
                            });
                        });
                        isDraft = true;
                    }
                });
                if (livePhotos.length > 0) {
                    rawPhotos = livePhotos;
                    count = livePhotos.length;
                }
            } else if (livePortalDetails.drafts && typeof livePortalDetails.drafts === 'object') {
                let livePhotos = [];
                Object.values(livePortalDetails.drafts).forEach(d => {
                    if (d && Array.isArray(d.selectedPhotos)) {
                        d.selectedPhotos.forEach(p => {
                            livePhotos.push({
                                id: p.id || null,
                                name: p.name || p.id || 'Foto',
                                thumbnailLink: p.thumbnailLink || null,
                                largeThumbnailLink: p.largeThumbnailLink || null,
                                note: p.note || '',
                                isDraft: true
                            });
                        });
                        isDraft = true;
                    }
                });
                if (livePhotos.length > 0) {
                    rawPhotos = livePhotos;
                    count = livePhotos.length;
                }
            }
        }

        // Build mapping index dari seluruh file Google Drive agar thumbnail selalu akurat
        const filesByName = new Map();
        const filesById = new Map();
        if (livePortalDetails && Array.isArray(livePortalDetails.files)) {
            livePortalDetails.files.forEach(f => {
                if (f.name) filesByName.set(f.name.toLowerCase().trim(), f);
                if (f.id) filesById.set(f.id, f);
            });
        }

        const photos = rawPhotos.map((photo, index) => {
            const matched = (photo.id && filesById.get(photo.id)) ||
                            (photo.name && filesByName.get(photo.name.toLowerCase().trim()));
            const id = matched?.id || photo.id || null;
            const name = photo.name || matched?.name || `Foto #${index + 1}`;
            
            let thumbnailLink = matched?.thumbnailLink || photo.thumbnailLink;
            if (!thumbnailLink && id) {
                thumbnailLink = `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
            }

            let largeThumbnailLink = matched?.largeThumbnailLink || photo.largeThumbnailLink;
            if (!largeThumbnailLink && id) {
                largeThumbnailLink = `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
            } else if (!largeThumbnailLink && thumbnailLink) {
                largeThumbnailLink = thumbnailLink;
            }

            return {
                ...photo,
                id,
                name,
                thumbnailLink,
                largeThumbnailLink: largeThumbnailLink || thumbnailLink
            };
        });

        return {
            count,
            photos,
            isSubmitted,
            isDraft,
            photoLimit,
            totalDriveFiles
        };
    }, [selectedClientForPortal, livePortalDetails]);

    // ACTION: Kirim Reminder Deadline Editor Tunggal
    const handleSendSingleEditorReminder = async (item) => {
        setSendingReminderId(`${item.appointmentId}-${item.type}`);
        if (onShowToast) onShowToast(`Mengirim reminder WhatsApp deadline Editor ${item.type}...`, 'info');

        try {
            const res = await adminFetch('/api/send-editor-wa-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: item.appointmentId,
                    targetType: item.type.toLowerCase()
                })
            });
            const data = await res.json();
            if (data.success) {
                if (onShowToast) onShowToast(`Reminder WhatsApp deadline berhasil dikirim ke Editor & Admin! 🚀`, 'success');
            } else {
                if (onShowToast) onShowToast('Gagal mengirim: ' + (data.error || 'Terjadi kesalahan'), 'error');
            }
        } catch (err) {
            if (onShowToast) onShowToast('Error server: ' + err.message, 'error');
        } finally {
            setSendingReminderId(null);
        }
    };

    // ACTION: Blast Semua Reminder Deadline Editor
    const handleTriggerAllReminders = async () => {
        setIsTriggeringAll(true);
        if (onShowToast) onShowToast("Memeriksa & mengirim pengingat deadline ke WhatsApp Editor dan Admin...", "info");
        try {
            const res = await adminFetch('/api/trigger-editor-reminders', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                if (data.remindersSent > 0) {
                    if (onShowToast) onShowToast(`Sukses! ${data.remindersSent} pesan WhatsApp reminder deadline terkirim (${data.taskCount} tugas).`, "success");
                } else {
                    if (onShowToast) onShowToast("Semua tugas editor masih aman dalam batas deadline atau sudah selesai.", "info");
                }
            } else {
                if (onShowToast) onShowToast("Gagal mengirim reminder: " + (data.error || 'Terjadi kesalahan'), "error");
            }
        } catch (err) {
            if (onShowToast) onShowToast("Error server: " + err.message, "error");
        } finally {
            setIsTriggeringAll(false);
        }
    };

    // Shared Pagination Bar Component
    const renderPaginationBar = () => {
        if (currentFullList.length === 0) return null;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-white/10 text-xs text-gray-400">
                <div className="flex items-center gap-3">
                    <span>
                        Menampilkan <strong className="text-white">{startItemIndex} - {endItemIndex}</strong> dari <strong className="text-white">{currentFullList.length}</strong> data
                    </span>
                    <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[11px] text-gray-500">Baris:</span>
                        {[10, 25, 50].map((num) => (
                            <button
                                key={num}
                                onClick={() => setPageSize(num)}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                    pageSize === num ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={() => setPageSize('all')}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                pageSize === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                            }`}
                        >
                            Semua
                        </button>
                    </div>
                </div>

                {pageSize !== 'all' && totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Halaman Sebelumnya"
                        >
                            <SmartIcon name="chevron-left" className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                if (totalPages > 7) {
                                    if (p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                                        if (p === 2 && currentPage > 3) return <span key={p} className="px-1 text-gray-600">...</span>;
                                        if (p === totalPages - 1 && currentPage < totalPages - 2) return <span key={p} className="px-1 text-gray-600">...</span>;
                                        return null;
                                    }
                                }

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                            currentPage === p
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Halaman Selanjutnya"
                        >
                            <SmartIcon name="chevron-right" className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`space-y-6 pb-20 ${isEmbedded ? 'mt-8' : ''}`} style={{ overscrollBehaviorY: 'auto' }}>
            {/* Header & Controls Panel */}
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                            <SmartIcon name="zap" className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Smart Client & Project Tracker</h2>
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Cerdas & Terpadu
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Monitoring terpadu: Klien belum pilih foto, proyek aktif pasca-acara, alert deadline H-10, dan jadwal acara mendatang
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50"
                            title="Segarkan data terbaru"
                        >
                            <SmartIcon name="refresh-cw" className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
                            <span>{refreshing ? 'Memperbarui...' : 'Refresh Data'}</span>
                        </button>

                        <button
                            onClick={handleTriggerAllReminders}
                            disabled={isTriggeringAll}
                            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-500/20 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                            title="Kirim pengingat WhatsApp ke semua editor yang mendekati deadline / overdue"
                        >
                            <SmartIcon name="bell" className={`w-3.5 h-3.5 ${isTriggeringAll ? 'animate-bounce' : ''}`} />
                            <span>{isTriggeringAll ? 'Mengirim...' : 'Blast WA Deadline'}</span>
                        </button>
                    </div>
                </div>

                {/* 4 Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
                    {/* Card 1: Belum Pilih Foto */}
                    <div
                        onClick={() => setActiveTab('unselected')}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                            activeTab === 'unselected'
                                ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.01]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-500/30'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <SmartIcon name="clock" className="w-3.5 h-3.5" /> Belum Pilih Foto
                            </span>
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                                Pasca-Acara
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                            {unselectedClients.length} <span className="text-xs font-normal text-gray-400">Klien</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {unselected1MCount} &gt;1 bln • {unselected2MCount} &gt;2 bln • <span className="text-red-400 font-bold">{unselected3MCount} &gt;3 bln</span>
                        </p>
                    </div>

                    {/* Card 2: Project Aktif Pasca-Acara */}
                    <div
                        onClick={() => setActiveTab('ongoing')}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                            activeTab === 'ongoing'
                                ? 'bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.01]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                <SmartIcon name="package" className="w-3.5 h-3.5" /> Project Aktif
                            </span>
                            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                Pasca-Acara
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                            {ongoingProjects.length} <span className="text-xs font-normal text-gray-400">Project</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {ongoingProjects.filter(p => p.stageKey === 'waiting').length} Tunggu Seleksi • {ongoingProjects.filter(p => p.stageKey === 'editing' || p.stageKey === 'queue').length} Editing
                        </p>
                    </div>

                    {/* Card 3: Mendekati Deadline H-10 */}
                    <div
                        onClick={() => setActiveTab('deadline')}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                            activeTab === 'deadline'
                                ? 'bg-red-500/15 border-red-500/50 shadow-lg shadow-red-500/10 scale-[1.01]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/30'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                                <SmartIcon name="alert-triangle" className="w-3.5 h-3.5" /> Deadline H-10
                            </span>
                            <span className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                                Urgensi
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                            {deadlineAlerts.length} <span className="text-xs font-normal text-gray-400">Tugas</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                            <span className="text-red-400 font-bold">{overdueCount} Overdue</span> • {todayDeadlineCount} Hari H • {upcomingDeadlineCount} H-1..10
                        </p>
                    </div>

                    {/* Card 4: Acara Mendatang (Upcoming) */}
                    <div
                        onClick={() => setActiveTab('upcoming')}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                            activeTab === 'upcoming'
                                ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.01]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/30'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <SmartIcon name="calendar-days" className="w-3.5 h-3.5" /> Acara Mendatang
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                Upcoming
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                            {upcomingEvents.length} <span className="text-xs font-normal text-gray-400">Jadwal</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {upcomingMonthCount} Bln Ini • {upcoming1to3MCount} 1-3 Bln • {upcomingFarCount} &gt;3 Bln
                        </p>
                    </div>
                </div>

                {/* Search Bar & Tab Selectors */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-white/10">
                    {/* Primary Tab Switcher: 4 Tabs sejajar */}
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto custom-scrollbar">
                        <button
                            onClick={() => setActiveTab('unselected')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'unselected'
                                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <SmartIcon name="clock" className="w-3.5 h-3.5" />
                            <span>Belum Pilih ({unselectedClients.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('ongoing')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'ongoing'
                                    ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <SmartIcon name="package" className="w-3.5 h-3.5" />
                            <span>Project Aktif ({ongoingProjects.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('deadline')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'deadline'
                                    ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <SmartIcon name="alert-triangle" className="w-3.5 h-3.5" />
                            <span>Deadline H-10 ({deadlineAlerts.length})</span>
                        </button>

                        {/* TAB BARU: ACARA MENDATANG (UPCOMING) DI SEBELAH DEADLINE */}
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'upcoming'
                                    ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <SmartIcon name="calendar-days" className="w-3.5 h-3.5" />
                            <span>Acara Mendatang ({upcomingEvents.length})</span>
                        </button>
                    </div>

                    {/* Instant Search Box */}
                    <div className="relative flex-1 sm:max-w-xs min-w-0">
                        <SmartIcon name="search" className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari nama, no HP, paket, ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500 transition"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Subfilter Chips for Active Tab */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 overflow-x-auto custom-scrollbar pb-1">
                    <span className="text-[11px] text-gray-500 font-medium shrink-0">Filter Khusus:</span>

                    {activeTab === 'unselected' && (
                        <>
                            <button
                                onClick={() => setAgingFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    agingFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Semua ({unselectedClients.length})
                            </button>
                            <button
                                onClick={() => setAgingFilter('1m')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    agingFilter === '1m' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                &gt; 1 Bulan ({unselected1MCount})
                            </button>
                            <button
                                onClick={() => setAgingFilter('2m')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    agingFilter === '2m' ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                &gt; 2 Bulan ({unselected2MCount})
                            </button>
                            <button
                                onClick={() => setAgingFilter('3m')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    agingFilter === '3m' ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                &gt; 3 Bulan Kritis ({unselected3MCount})
                            </button>
                            <button
                                onClick={() => setAgingFilter('dekor')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap flex items-center gap-1 ${
                                    agingFilter === 'dekor' ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                                title="Dekorasi Paket Komplit (Include Foto)"
                            >
                                <SmartIcon name="sparkles" className="w-2.5 h-2.5" />
                                <span>Dekor Komplit ({unselectedDekorKomplitCount})</span>
                            </button>
                        </>
                    )}

                    {activeTab === 'ongoing' && (
                        <>
                            <button
                                onClick={() => setOngoingFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    ongoingFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Semua ({ongoingProjects.length})
                            </button>
                            <button
                                onClick={() => setOngoingFilter('waiting')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    ongoingFilter === 'waiting' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Menunggu Seleksi ({ongoingProjects.filter(p => p.stageKey === 'waiting').length})
                            </button>
                            <button
                                onClick={() => setOngoingFilter('queue')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    ongoingFilter === 'queue' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Antrian Editor ({ongoingProjects.filter(p => p.stageKey === 'queue').length})
                            </button>
                            <button
                                onClick={() => setOngoingFilter('editing')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    ongoingFilter === 'editing' ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Sedang Diedit ({ongoingProjects.filter(p => p.stageKey === 'editing').length})
                            </button>
                            <button
                                onClick={() => setOngoingFilter('preview')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    ongoingFilter === 'preview' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Siap Preview ({ongoingProjects.filter(p => p.stageKey === 'preview').length})
                            </button>
                            <button
                                onClick={() => setOngoingFilter('dekor')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap flex items-center gap-1 ${
                                    ongoingFilter === 'dekor' ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                                title="Dekorasi Paket Komplit (Include Foto)"
                            >
                                <SmartIcon name="sparkles" className="w-2.5 h-2.5" />
                                <span>Dekor Komplit ({ongoingDekorKomplitCount})</span>
                            </button>
                        </>
                    )}

                    {activeTab === 'deadline' && (
                        <>
                            <button
                                onClick={() => setUrgencyFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    urgencyFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Semua ({deadlineAlerts.length})
                            </button>
                            <button
                                onClick={() => setUrgencyFilter('overdue')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    urgencyFilter === 'overdue' ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                🔴 Overdue ({overdueCount})
                            </button>
                            <button
                                onClick={() => setUrgencyFilter('today')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    urgencyFilter === 'today' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                🔥 Hari H ({todayDeadlineCount})
                            </button>
                            <button
                                onClick={() => setUrgencyFilter('h1-3')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    urgencyFilter === 'h1-3' ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                ⏳ Kritis H-1 s/d H-3 ({deadlineAlerts.filter(d => d.urgencyKey === 'h1-3').length})
                            </button>
                            <button
                                onClick={() => setUrgencyFilter('h4-10')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    urgencyFilter === 'h4-10' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                ⚠️ Waspada H-4 s/d H-10 ({deadlineAlerts.filter(d => d.urgencyKey === 'h4-10').length})
                            </button>
                        </>
                    )}

                    {activeTab === 'upcoming' && (
                        <>
                            <button
                                onClick={() => setUpcomingFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    upcomingFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Semua ({upcomingEvents.length})
                            </button>
                            <button
                                onClick={() => setUpcomingFilter('month')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    upcomingFilter === 'month' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                🎯 Bulan Ini / &lt;30 Hari ({upcomingMonthCount})
                            </button>
                            <button
                                onClick={() => setUpcomingFilter('1-3m')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    upcomingFilter === '1-3m' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                🗓️ 1 - 3 Bulan ({upcoming1to3MCount})
                            </button>
                            <button
                                onClick={() => setUpcomingFilter('far')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                                    upcomingFilter === 'far' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                🔮 &gt; 3 Bulan Ke Depan ({upcomingFarCount})
                            </button>
                            <button
                                onClick={() => setUpcomingFilter('dekor')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap flex items-center gap-1 ${
                                    upcomingFilter === 'dekor' ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                                title="Dekorasi Paket Komplit (Include Foto)"
                            >
                                <SmartIcon name="sparkles" className="w-2.5 h-2.5" />
                                <span>Dekor Komplit ({upcomingDekorKomplitCount})</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* TAB CONTENT 1: KLIEN BELUM PILIH FOTO */}
            {activeTab === 'unselected' && (
                <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 flex-wrap gap-3">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <SmartIcon name="clock" className="w-5 h-5 text-amber-400" />
                                Daftar Klien Belum Memilih Foto (Pasca-Acara)
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Klien yang sesi acaranya sudah terlaksana tapi belum submit foto pilihan di portal seleksi
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-bold">
                                {filteredUnselected.length} Data
                            </span>

                            <button
                                onClick={handleBlastAllSelectionClients}
                                disabled={isBlastingAllClients || unselectedClients.length === 0}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                title="Kirim blast WhatsApp pengingat otomatis ke semua klien belum pilih foto"
                            >
                                <SmartIcon name="send" className={`w-3.5 h-3.5 ${isBlastingAllClients ? 'animate-spin' : ''}`} />
                                <span>{isBlastingAllClients ? 'Mem-blast Semua...' : `Blast WA Semua Klien (${unselectedClients.length})`}</span>
                            </button>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto custom-scrollbar" style={{ overscrollBehaviorY: 'auto' }}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-3">Klien & Kontak</th>
                                    <th className="py-3 px-3">Paket Layanan</th>
                                    <th className="py-3 px-3">Tanggal Acara</th>
                                    <th className="py-3 px-3">Usia Tunggu (Aging)</th>
                                    <th className="py-3 px-3">Folder Drive</th>
                                    <th className="py-3 px-3 text-right">Aksi Follow-Up</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {paginatedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition">
                                        <td className="py-3.5 px-3">
                                            <div className="font-bold text-white text-sm">{item.name}</div>
                                            <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                                                <span>{item.phone || '-'}</span>
                                                <span className="font-mono text-[10px] text-gray-500">({item.id})</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-white/5 px-2.5 py-1 rounded-md text-gray-300 font-medium">
                                                    {item.package}
                                                </span>
                                                {isDekorKomplitPackage(item.package) && (
                                                    <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0" title="Dekorasi Paket Komplit (Include Foto)">
                                                        <SmartIcon name="sparkles" className="w-2.5 h-2.5" /> Dekor Komplit (+Foto)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono text-gray-300">
                                            {item.eventDateFormatted}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            {item.diffDays >= 90 ? (
                                                <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-1 rounded-full font-bold text-[11px]">
                                                    🔴 {item.diffDays} Hari ({item.months} Bulan+)
                                                </span>
                                            ) : item.diffDays >= 60 ? (
                                                <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2.5 py-1 rounded-full font-bold text-[11px]">
                                                    🟠 {item.diffDays} Hari ({item.months} Bulan)
                                                </span>
                                            ) : item.diffDays >= 30 ? (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-semibold text-[11px]">
                                                    🟡 {item.diffDays} Hari (1 Bulan+)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-gray-500/20 text-gray-300 border border-gray-500/30 px-2.5 py-1 rounded-full font-medium text-[11px]">
                                                    ⚪ {item.diffDays} Hari
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            {item.driveLink ? (
                                                <a
                                                    href={item.driveLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-lg text-[11px] font-medium transition"
                                                >
                                                    <SmartIcon name="folder" className="w-3 h-3" /> Drive Raw
                                                </a>
                                            ) : (
                                                <span className="text-[11px] text-gray-500 italic">Belum disematkan</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                {/* Tombol Baru: Cek Portal Pemilihan Klien (Membuka Modal) */}
                                                <button
                                                    onClick={() => handleOpenClientPortalModal(item)}
                                                    className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5"
                                                    title="Klik untuk melihat jumlah dan daftar foto yang sudah dipilih klien"
                                                >
                                                    <SmartIcon name="eye" className="w-3.5 h-3.5 text-indigo-400" />
                                                    <span>Portal ({item.selectionInfo?.count > 0 ? `${item.selectionInfo.count} Foto` : '0 Foto'})</span>
                                                </button>

                                                {/* Tombol Salin Link */}
                                                <button
                                                    onClick={(e) => handleCopyPortalLink(item.id, e)}
                                                    className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1"
                                                    title="Salin Link Portal Seleksi Klien"
                                                >
                                                    <SmartIcon name={copiedId === item.id ? "check" : "copy"} className={`w-3.5 h-3.5 ${copiedId === item.id ? 'text-emerald-400' : ''}`} />
                                                    <span>{copiedId === item.id ? 'Tersalin' : 'Salin'}</span>
                                                </button>

                                                {/* Tombol Blast WA Otomatis */}
                                                <button
                                                    onClick={() => handleBlastSingleClientWA(item)}
                                                    disabled={sendingClientWaId === item.id}
                                                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                                                    title="Blast pesan WhatsApp pengingat seleksi foto langsung ke nomor klien otomatis"
                                                >
                                                    <SmartIcon name="send" className={`w-3.5 h-3.5 ${sendingClientWaId === item.id ? 'animate-spin' : ''}`} />
                                                    <span>{sendingClientWaId === item.id ? 'Mem-blast...' : 'Blast WA'}</span>
                                                </button>

                                                {/* Opsional: Tombol WA Web Manual */}
                                                <a
                                                    href={getWaClientSelectionLink(item)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 p-1.5 rounded-lg transition"
                                                    title="Buka Chat WhatsApp Web Manual"
                                                >
                                                    <SmartIcon name="message-circle" className="w-3.5 h-3.5 text-emerald-400" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="lg:hidden flex flex-col gap-3">
                        {paginatedItems.map((item) => (
                            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{item.phone || '-'} • {item.id}</p>
                                    </div>
                                    {item.diffDays >= 90 ? (
                                        <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                            🔴 {item.diffDays} Hari
                                        </span>
                                    ) : item.diffDays >= 60 ? (
                                        <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                            🟠 {item.diffDays} Hari
                                        </span>
                                    ) : item.diffDays >= 30 ? (
                                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                            🟡 {item.diffDays} Hari
                                        </span>
                                    ) : (
                                        <span className="bg-gray-500/20 text-gray-300 border border-gray-500/30 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0">
                                            ⚪ {item.diffDays} Hari
                                        </span>
                                    )}
                                </div>

                                <div className="text-xs text-gray-300 space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Paket:</span>
                                        <div className="text-right flex items-center gap-1.5 flex-wrap justify-end">
                                            <span className="font-medium text-white">{item.package}</span>
                                            {isDekorKomplitPackage(item.package) && (
                                                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                    ✨ Dekor Komplit (+Foto)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Tgl Acara:</span>
                                        <span className="font-mono">{item.eventDateFormatted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Usia Tunggu:</span>
                                        <span className="font-bold text-amber-400">{item.diffDays} hari ({item.months} bulan)</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-1">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenClientPortalModal(item)}
                                            className="flex-1 min-h-[38px] bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                                        >
                                            <SmartIcon name="eye" className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>Portal ({item.selectionInfo?.count > 0 ? `${item.selectionInfo.count} Foto` : '0 Foto'})</span>
                                        </button>

                                        <button
                                            onClick={(e) => handleCopyPortalLink(item.id, e)}
                                            className="min-h-[38px] px-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
                                        >
                                            <SmartIcon name={copiedId === item.id ? "check" : "copy"} className="w-3.5 h-3.5" />
                                            <span>{copiedId === item.id ? 'Tersalin' : 'Salin'}</span>
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleBlastSingleClientWA(item)}
                                            disabled={sendingClientWaId === item.id}
                                            className="flex-1 min-h-[40px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                                        >
                                            <SmartIcon name="send" className={`w-3.5 h-3.5 ${sendingClientWaId === item.id ? 'animate-spin' : ''}`} />
                                            <span>{sendingClientWaId === item.id ? 'Mem-blast...' : 'Blast WA Otomatis'}</span>
                                        </button>

                                        <a
                                            href={getWaClientSelectionLink(item)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-h-[40px] px-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg flex items-center justify-center transition"
                                            title="Chat Manual"
                                        >
                                            <SmartIcon name="message-circle" className="w-4 h-4 text-emerald-400" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredUnselected.length === 0 && (
                        <div className="text-center py-10">
                            <SmartIcon name="check-circle" className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-60" />
                            <p className="text-sm font-semibold text-gray-300">Semua Klien Sudah Memilih Foto</p>
                            <p className="text-xs text-gray-500 mt-0.5">Tidak ada klien yang belum memilih foto pada kriteria filter saat ini.</p>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {renderPaginationBar()}
                </div>
            )}

            {/* TAB CONTENT 2: PROJECT AKTIF PASCA-ACARA (ONGOING PRODUKSI) */}
            {activeTab === 'ongoing' && (
                <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <SmartIcon name="package" className="w-5 h-5 text-blue-400" />
                                Monitoring Project Aktif Pasca-Acara (Sedang Diproduksi)
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Proyek yang acaranya sudah selesai dan sedang aktif dalam tahap seleksi foto, antrian, editing, hingga preview
                            </p>
                        </div>
                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-bold">
                            {filteredOngoing.length} Project Aktif
                        </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto custom-scrollbar" style={{ overscrollBehaviorY: 'auto' }}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-3">ID & Klien</th>
                                    <th className="py-3 px-3">Paket Layanan</th>
                                    <th className="py-3 px-3">Tgl Acara</th>
                                    <th className="py-3 px-3">Tahap Pengerjaan</th>
                                    <th className="py-3 px-3">Editor Bertugas</th>
                                    <th className="py-3 px-3">Deadline</th>
                                    <th className="py-3 px-3 text-right">Navigasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {paginatedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition">
                                        <td className="py-3.5 px-3">
                                            <div className="font-bold text-white text-sm">{item.name}</div>
                                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">{item.id}</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="font-medium text-gray-300 flex items-center gap-1.5 flex-wrap">
                                                <span>{item.package}</span>
                                                {isDekorKomplitPackage(item.package) && (
                                                    <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0" title="Dekorasi Paket Komplit (Include Foto)">
                                                        <SmartIcon name="sparkles" className="w-2.5 h-2.5" /> Dekor Komplit (+Foto)
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                                                item.status === 'Lunas' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono text-gray-300">
                                            {item.eventDateFormatted}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] inline-block ${item.stageBadgeClass}`}>
                                                {item.stageLabel}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="text-gray-300 text-[11px]">
                                                <span className="text-gray-500">Foto:</span> {item.editorFoto}
                                            </div>
                                            {item.editorVideo !== '-' && (
                                                <div className="text-gray-300 text-[11px] mt-0.5">
                                                    <span className="text-gray-500">Video:</span> {item.editorVideo}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 font-mono text-gray-300">
                                            {item.deadlineFormatted}
                                        </td>
                                        <td className="py-3.5 px-3 text-right">
                                            <button
                                                onClick={() => onNavigate && onNavigate('appointment', { order_id: item.id })}
                                                className="bg-white/5 hover:bg-white/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1"
                                                title="Lihat detail di menu Appointment"
                                            >
                                                <span>Detail</span>
                                                <SmartIcon name="chevron-right" className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="lg:hidden flex flex-col gap-3">
                        {paginatedItems.map((item) => (
                            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            <span className="text-[11px] text-gray-400 font-mono">{item.id} • {item.package}</span>
                                            {isDekorKomplitPackage(item.package) && (
                                                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                    ✨ Dekor Komplit (+Foto)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                        item.status === 'Lunas' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>

                                <div className="text-xs space-y-1.5 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Tahap:</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.stageBadgeClass}`}>
                                            {item.stageLabel}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Editor:</span>
                                        <span className="text-gray-200 truncate max-w-[180px]">{item.editorFoto}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Deadline:</span>
                                        <span className="font-mono text-gray-200">{item.deadlineFormatted}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => onNavigate && onNavigate('appointment', { order_id: item.id })}
                                        className="w-full min-h-[40px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                    >
                                        <span>Buka di Appointment</span>
                                        <SmartIcon name="chevron-right" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredOngoing.length === 0 && (
                        <div className="text-center py-10">
                            <SmartIcon name="check-circle" className="w-10 h-10 text-blue-400 mx-auto mb-2 opacity-60" />
                            <p className="text-sm font-semibold text-gray-300">Semua Proyek Pasca-Acara Telah Tuntas</p>
                            <p className="text-xs text-gray-500 mt-0.5">Tidak ada proyek pasca-acara aktif pada filter ini.</p>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {renderPaginationBar()}
                </div>
            )}

            {/* TAB CONTENT 3: MENDEKATI DEADLINE (H-10 & OVERDUE) */}
            {activeTab === 'deadline' && (
                <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <SmartIcon name="alert-triangle" className="w-5 h-5 text-red-400" />
                                Alert Deadline Editor (H-10 s/d Lewat Deadline)
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Pantau tugas foto & video editor yang mendekati batas waktu pengerjaan atau telah melewati deadline
                            </p>
                        </div>
                        <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-bold">
                            {filteredDeadlines.length} Tugas
                        </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto custom-scrollbar" style={{ overscrollBehaviorY: 'auto' }}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-3">Urgensi & Sisa Waktu</th>
                                    <th className="py-3 px-3">Tugas</th>
                                    <th className="py-3 px-3">Klien & ID Booking</th>
                                    <th className="py-3 px-3">Batas Deadline</th>
                                    <th className="py-3 px-3">Editor Bertanggung Jawab</th>
                                    <th className="py-3 px-3 text-right">Aksi Follow-Up</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {paginatedItems.map((item, idx) => (
                                    <tr key={`${item.appointmentId}-${item.type}-${idx}`} className="hover:bg-white/5 transition">
                                        <td className="py-3.5 px-3">
                                            <span className={`px-3 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1.5 ${item.urgencyBadge}`}>
                                                {item.urgencyLabel}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                                item.type === 'Foto' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                                            }`}>
                                                Editor {item.type}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="font-bold text-white text-sm">{item.clientName}</div>
                                            <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                <span>{item.appointmentId} • {item.package}</span>
                                                {isDekorKomplitPackage(item.package) && (
                                                    <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                        ✨ Dekor Komplit (+Foto)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono font-bold text-red-400">
                                            {item.deadlineFormatted}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="font-medium text-white">{item.editorName}</div>
                                            <div className="text-[10px] text-gray-400">{item.status}</div>
                                        </td>
                                        <td className="py-3.5 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleSendSingleEditorReminder(item)}
                                                    disabled={sendingReminderId === `${item.appointmentId}-${item.type}`}
                                                    className="bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                                                    title="Kirim pengingat WhatsApp deadline ke Editor & Admin"
                                                >
                                                    <SmartIcon name="bell" className="w-3.5 h-3.5" />
                                                    <span>{sendingReminderId === `${item.appointmentId}-${item.type}` ? 'Mengirim...' : 'Blast WA'}</span>
                                                </button>

                                                <a
                                                    href={getWaEditorDeadlineLink(item)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                                    title={`Buka chat WhatsApp ke Editor (${item.editorName})`}
                                                >
                                                    <SmartIcon name="message-circle" className="w-3.5 h-3.5" />
                                                    <span>Chat Editor</span>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="lg:hidden flex flex-col gap-3">
                        {paginatedItems.map((item, idx) => (
                            <div key={`${item.appointmentId}-${item.type}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${item.urgencyBadge}`}>
                                        {item.urgencyLabel}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                        item.type === 'Foto' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                                    }`}>
                                        {item.type}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="font-bold text-white text-sm">{item.clientName}</h4>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className="text-[11px] text-gray-400 font-mono">{item.appointmentId} • {item.package}</span>
                                        {isDekorKomplitPackage(item.package) && (
                                            <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                ✨ Dekor Komplit (+Foto)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-xs space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Deadline:</span>
                                        <span className="font-mono font-bold text-red-400">{item.deadlineFormatted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Editor:</span>
                                        <span className="text-white font-medium">{item.editorName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Status:</span>
                                        <span className="text-gray-300">{item.status}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => handleSendSingleEditorReminder(item)}
                                        disabled={sendingReminderId === `${item.appointmentId}-${item.type}`}
                                        className="flex-1 min-h-[40px] bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                                    >
                                        <SmartIcon name="bell" className="w-3.5 h-3.5" />
                                        <span>{sendingReminderId === `${item.appointmentId}-${item.type}` ? 'Kirim...' : 'Blast WA'}</span>
                                    </button>

                                    <a
                                        href={getWaEditorDeadlineLink(item)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 min-h-[40px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                        title={`Buka chat WhatsApp ke Editor (${item.editorName})`}
                                    >
                                        <SmartIcon name="message-circle" className="w-3.5 h-3.5" />
                                        <span>Chat Editor</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredDeadlines.length === 0 && (
                        <div className="text-center py-10">
                            <SmartIcon name="check-circle" className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-60" />
                            <p className="text-sm font-semibold text-gray-300">Semua Deadline Aman</p>
                            <p className="text-xs text-gray-500 mt-0.5">Tidak ada tugas editor yang mendekati batas H-10 atau melewati deadline.</p>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {renderPaginationBar()}
                </div>
            )}

            {/* TAB CONTENT 4: ACARA MENDATANG (UPCOMING BOOKINGS) */}
            {activeTab === 'upcoming' && (
                <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <SmartIcon name="calendar-days" className="w-5 h-5 text-emerald-400" />
                                Jadwal Acara Mendatang (Upcoming Bookings)
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Seluruh booking terkonfirmasi (Sudah DP / Lunas) yang tanggal acaranya belum terlaksana, diurutkan dari yang paling dekat
                            </p>
                        </div>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
                            {filteredUpcoming.length} Jadwal
                        </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto custom-scrollbar" style={{ overscrollBehaviorY: 'auto' }}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                                    <th className="py-3 px-3">Hitung Mundur</th>
                                    <th className="py-3 px-3">Klien & ID Booking</th>
                                    <th className="py-3 px-3">Paket Layanan</th>
                                    <th className="py-3 px-3">Tanggal Acara</th>
                                    <th className="py-3 px-3">Status Booking</th>
                                    <th className="py-3 px-3 text-right">Aksi Follow-Up</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {paginatedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition">
                                        <td className="py-3.5 px-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1.5 ${item.badgeClass}`}>
                                                <SmartIcon name="calendar" className="w-3 h-3" />
                                                <span>H-{item.daysUntil} ({item.daysUntil} Hari Lagi)</span>
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="font-bold text-white text-sm">{item.name}</div>
                                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">{item.phone || '-'} • ({item.id})</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-white/5 px-2.5 py-1 rounded-md text-gray-300 font-medium">
                                                    {item.package}
                                                </span>
                                                {isDekorKomplitPackage(item.package) && (
                                                    <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0" title="Dekorasi Paket Komplit (Include Foto)">
                                                        <SmartIcon name="sparkles" className="w-2.5 h-2.5" /> Dekor Komplit (+Foto)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono font-bold text-white">
                                            {item.eventDateFormatted}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                                item.status === 'Lunas' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                            }`}>
                                                {item.status}
                                            </span>
                                            <span className="block text-[10px] text-gray-400 mt-1">
                                                Persiapan Pra-Acara
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => onNavigate && onNavigate('appointment', { order_id: item.id })}
                                                    className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1"
                                                    title="Lihat detail di Appointment"
                                                >
                                                    <span>Detail</span>
                                                    <SmartIcon name="chevron-right" className="w-3 h-3" />
                                                </button>

                                                <a
                                                    href={getWaUpcomingConfirmationLink(item)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                                    title="Kirim pesan WhatsApp persiapan/konfirmasi acara"
                                                >
                                                    <SmartIcon name="message-circle" className="w-3.5 h-3.5" />
                                                    <span>Chat Klien</span>
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="lg:hidden flex flex-col gap-3">
                        {paginatedItems.map((item) => (
                            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            <span className="text-[11px] text-gray-400 font-mono">{item.id} • {item.package}</span>
                                            {isDekorKomplitPackage(item.package) && (
                                                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                    ✨ Dekor Komplit (+Foto)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] shrink-0 ${item.badgeClass}`}>
                                        H-{item.daysUntil}
                                    </span>
                                </div>

                                <div className="text-xs space-y-1.5 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Tgl Acara:</span>
                                        <span className="font-mono font-bold text-white">{item.eventDateFormatted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Status Pembayaran:</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            item.status === 'Lunas' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => onNavigate && onNavigate('appointment', { order_id: item.id })}
                                        className="flex-1 min-h-[40px] bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                                    >
                                        <span>Buka Detail</span>
                                        <SmartIcon name="chevron-right" className="w-3.5 h-3.5" />
                                    </button>

                                    <a
                                        href={getWaUpcomingConfirmationLink(item)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 min-h-[40px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                    >
                                        <SmartIcon name="message-circle" className="w-3.5 h-3.5" />
                                        <span>Chat Klien</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredUpcoming.length === 0 && (
                        <div className="text-center py-10">
                            <SmartIcon name="check-circle" className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-60" />
                            <p className="text-sm font-semibold text-gray-300">Tidak Ada Jadwal Acara Mendatang</p>
                            <p className="text-xs text-gray-500 mt-0.5">Tidak ada jadwal booking masa depan pada filter ini.</p>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {renderPaginationBar()}
                </div>
            )}

            {/* Modal Detail Portal Seleksi Foto Klien */}
            {selectedClientForPortal && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
                    onClick={() => setSelectedClientForPortal(null)}
                >
                    <div 
                        className="relative w-full max-w-3xl bg-[#141417] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Modal */}
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-purple-900/30 via-transparent to-pink-900/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                    <SmartIcon name="camera" className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                                            {selectedClientForPortal.name}
                                        </h3>
                                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                            {selectedClientForPortal.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {selectedClientForPortal.package} • {selectedClientForPortal.phone || 'Tanpa Kontak'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedClientForPortal(null)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition border border-white/5"
                                title="Tutup Modal"
                            >
                                <SmartIcon name="x" className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
                            {/* Live Sync Indicator */}
                            {livePortalLoading && (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                                    <SmartIcon name="refresh-cw" className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                                    <span>Menyinkronkan thumbnail live langsung dari cloud Google Drive & portal klien...</span>
                                </div>
                            )}

                            {/* 3 Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Status Seleksi */}
                                <div className="bg-[#1a1a20] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[11px] font-medium text-gray-400">Status Seleksi</span>
                                    <div className="mt-2">
                                        {modalSelectionData?.isSubmitted ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                Sudah Submit
                                            </span>
                                        ) : (modalSelectionData?.isDraft || (modalSelectionData?.count || 0) > 0) ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                                Draft ({modalSelectionData.count} Foto)
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                Belum Memilih
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        {modalSelectionData?.isSubmitted ? 'Klien sudah mengunci pilihan' : 'Klien belum menyelesaikan seleksi'}
                                    </p>
                                </div>

                                {/* Kuota Foto Terpilih */}
                                <div className="bg-[#1a1a20] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[11px] font-medium text-gray-400">Foto Dipilih</span>
                                    <div className="mt-2 flex items-baseline gap-1.5">
                                        <span className="text-2xl font-black text-white">
                                            {modalSelectionData?.count || 0}
                                        </span>
                                        <span className="text-xs text-gray-400 font-semibold">
                                            / {modalSelectionData?.photoLimit ? `${modalSelectionData.photoLimit} Foto` : '∞'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {modalSelectionData?.photoLimit ? `Batas kuota ${modalSelectionData.photoLimit} foto` : 'Tidak ada batas maksimal kuota'}
                                    </p>
                                </div>

                                {/* Total File Drive */}
                                <div className="bg-[#1a1a20] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[11px] font-medium text-gray-400">File di Folder RAW</span>
                                    <div className="mt-2 flex items-baseline gap-1.5">
                                        <span className="text-2xl font-black text-purple-400">
                                            {modalSelectionData?.totalDriveFiles !== null ? modalSelectionData.totalDriveFiles : '-'}
                                        </span>
                                        <span className="text-xs text-gray-400 font-semibold">Foto Tersedia</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 truncate" title={selectedClientForPortal.driveLink || 'Belum ada drive link'}>
                                        {selectedClientForPortal.driveLink ? 'Google Drive tersambung' : 'Drive belum disematkan'}
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar Kuota jika ada batas kuota */}
                            {modalSelectionData?.photoLimit && (
                                <div className="bg-[#1a1a20] border border-white/5 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-300 font-medium">Progres Pemilihan Foto</span>
                                        <span className="font-mono font-bold text-white">
                                            {Math.min(100, Math.round(((modalSelectionData?.count || 0) / modalSelectionData.photoLimit) * 100))}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ${
                                                (modalSelectionData?.count || 0) >= modalSelectionData.photoLimit
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                    : (modalSelectionData?.count || 0) > 0
                                                        ? 'bg-gradient-to-r from-amber-500 to-purple-500'
                                                        : 'bg-transparent'
                                            }`}
                                            style={{ width: `${Math.min(100, ((modalSelectionData?.count || 0) / modalSelectionData.photoLimit) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Galeri Thumbnail Foto yang Dipilih */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                                        <SmartIcon name="image" className="w-4 h-4 text-purple-400" />
                                        <span>Galeri Foto yang Dipilih ({modalSelectionData?.count || 0})</span>
                                    </h4>
                                    {modalSelectionData?.count > 0 && (
                                        <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                                            <SmartIcon name="eye" className="w-3.5 h-3.5" />
                                            <span>Klik foto untuk buka pratinjau resolusi tinggi</span>
                                        </span>
                                    )}
                                </div>

                                {modalSelectionData?.photos && modalSelectionData.photos.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                                        {modalSelectionData.photos.map((photo, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setLightboxPhotoIndex(idx)}
                                                className="group relative rounded-xl overflow-hidden bg-slate-900/90 border border-white/10 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-950/40 transition-all duration-200 cursor-pointer flex flex-col"
                                                title={`Klik untuk buka pratinjau ${photo.name}`}
                                            >
                                                {/* Container Thumbnail Gambar */}
                                                <div className="relative aspect-[4/3] bg-black/50 overflow-hidden flex items-center justify-center">
                                                    {photo.thumbnailLink ? (
                                                        <img 
                                                            src={photo.thumbnailLink}
                                                            alt={photo.name}
                                                            referrerPolicy="no-referrer"
                                                            crossOrigin="anonymous"
                                                            onError={(e) => {
                                                                const step = e.target.dataset.fallbackStep || '0';
                                                                if (step === '0' && photo.id) {
                                                                    e.target.dataset.fallbackStep = '1';
                                                                    e.target.src = `/api/drive-image-proxy/${photo.id}?sz=400`;
                                                                } else if (step === '1' && photo.id) {
                                                                    e.target.dataset.fallbackStep = '2';
                                                                    e.target.src = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
                                                                } else {
                                                                    e.target.style.display = 'none';
                                                                    if (e.target.nextElementSibling) {
                                                                        e.target.nextElementSibling.style.display = 'flex';
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                            loading="lazy"
                                                        />
                                                    ) : null}

                                                    {/* Fallback Placeholder jika thumbnail belum sinkron */}
                                                    <div 
                                                        className="w-full h-full bg-slate-900/90 flex flex-col items-center justify-center text-gray-500 p-2 text-center"
                                                        style={{ display: photo.thumbnailLink ? 'none' : 'flex' }}
                                                    >
                                                        <SmartIcon name="image" className="w-6 h-6 text-gray-600 mb-1" />
                                                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-full px-1">{photo.name}</span>
                                                    </div>

                                                    {/* Badges di Pojok Atas */}
                                                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10 pointer-events-none">
                                                        <span className="w-5 h-5 rounded-full bg-black/75 backdrop-blur-md text-white font-mono font-bold text-[10px] flex items-center justify-center shadow">
                                                            #{idx + 1}
                                                        </span>
                                                        {photo.isDraft ? (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/90 text-black shadow">
                                                                Draft
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/90 text-white shadow">
                                                                ✓ Pilihan
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Hover Overlay Buka Foto */}
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 text-white font-semibold text-xs shadow-inner">
                                                        <SmartIcon name="eye" className="w-4 h-4 text-purple-300" />
                                                        <span>Buka Foto</span>
                                                    </div>
                                                </div>

                                                {/* Detail Nama File & Catatan */}
                                                <div className="p-2 bg-[#18181e] flex flex-col justify-between flex-1 gap-1 border-t border-white/5">
                                                    <span className="text-[11px] font-mono font-medium text-white truncate" title={photo.name}>
                                                        {photo.name}
                                                    </span>
                                                    {photo.note && (
                                                        <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 truncate" title={photo.note}>
                                                            📝 "{photo.note}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                                        <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-gray-500 mb-2.5">
                                            <SmartIcon name="image" className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-300">
                                            Klien Belum Memilih Foto Apapun di Portal
                                        </p>
                                        <p className="text-[11px] text-gray-500 max-w-md mx-auto mt-1">
                                            Klien belum membuka atau menandai foto favoritnya. Anda dapat menekan tombol <strong className="text-emerald-400">Blast WA Pengingat</strong> di bawah untuk mengirim pesan otomatis langsung ke nomor WhatsApp klien.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Direct Link Box */}
                            <div className="p-3 rounded-xl bg-[#18181d] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                                <div className="text-xs text-gray-400 truncate w-full sm:w-auto">
                                    <span className="text-gray-500 mr-1.5 font-medium">Link Portal:</span>
                                    <span className="font-mono text-gray-300">{`${window.location.origin}/pilih-foto/${selectedClientForPortal.id}`}</span>
                                </div>
                                <button
                                    onClick={(e) => handleCopyPortalLink(selectedClientForPortal.id, e)}
                                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
                                >
                                    <SmartIcon name={copiedId === selectedClientForPortal.id ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                                    <span>{copiedId === selectedClientForPortal.id ? 'Tersalin!' : 'Salin Link'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#17171c] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <a
                                    href={`${window.location.origin}/pilih-foto/${selectedClientForPortal.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                >
                                    <SmartIcon name="external-link" className="w-3.5 h-3.5" />
                                    <span>Buka Portal Klien ↗</span>
                                </a>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    onClick={() => handleBlastSingleClientWA(selectedClientForPortal)}
                                    disabled={sendingClientWaId === selectedClientForPortal.id}
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                                >
                                    <SmartIcon name="send" className="w-3.5 h-3.5" />
                                    <span>{sendingClientWaId === selectedClientForPortal.id ? 'Mengirim Blast WA...' : 'Blast WA Pengingat'}</span>
                                </button>

                                <button
                                    onClick={() => setSelectedClientForPortal(null)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Modal Pratinjau Foto Resolusi Penuh */}
            <PhotoLightboxModal
                isOpen={lightboxPhotoIndex !== null && !!modalSelectionData?.photos?.[lightboxPhotoIndex]}
                photoData={lightboxPhotoIndex !== null && modalSelectionData?.photos?.length > 0 ? {
                    url: modalSelectionData.photos[lightboxPhotoIndex]?.largeThumbnailLink || modalSelectionData.photos[lightboxPhotoIndex]?.thumbnailLink || (modalSelectionData.photos[lightboxPhotoIndex]?.id ? `/api/drive-image-proxy/${modalSelectionData.photos[lightboxPhotoIndex].id}?sz=1200` : ''),
                    index: lightboxPhotoIndex,
                    total: modalSelectionData.photos.length,
                    urls: modalSelectionData.photos.map(p => p.largeThumbnailLink || p.thumbnailLink || (p.id ? `/api/drive-image-proxy/${p.id}?sz=1200` : '')),
                    title: modalSelectionData.photos[lightboxPhotoIndex]?.name || 'Preview Foto'
                } : null}
                onClose={() => setLightboxPhotoIndex(null)}
                onIndexChange={(newIdx) => setLightboxPhotoIndex(newIdx)}
                renderOverlay={(currIdx) => {
                    const p = modalSelectionData?.photos?.[currIdx];
                    if (!p) return null;
                    return (
                        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600/90 text-white shadow-lg backdrop-blur-md">
                                Foto #{currIdx + 1} dari {modalSelectionData.photos.length}
                            </span>
                            {p.isDraft && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-black shadow-lg">
                                    Draft Klien
                                </span>
                            )}
                        </div>
                    );
                }}
                renderFooter={(currIdx) => {
                    const p = modalSelectionData?.photos?.[currIdx];
                    if (!p) return null;
                    return (
                        <div className="p-3 sm:p-4 bg-slate-900/95 backdrop-blur-md border-t border-white/10 z-30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                            <div className="text-center sm:text-left min-w-0">
                                <p className="text-sm font-bold text-white font-mono truncate">{p.name}</p>
                                {p.note && (
                                    <p className="text-xs text-amber-300 mt-0.5 truncate">📝 Catatan Klien: "{p.note}"</p>
                                )}
                            </div>
                            {p.id && (
                                <a
                                    href={`/api/drive-download/${p.id}?name=${encodeURIComponent(p.name || 'foto.jpg')}`}
                                    download={p.name || 'foto.jpg'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                                >
                                    <SmartIcon name="folder" className="w-3.5 h-3.5" />
                                    <span>Unduh File Asli</span>
                                </a>
                            )}
                        </div>
                    );
                }}
                SvgIcon={SmartIcon}
            />
        </div>
    );
}
