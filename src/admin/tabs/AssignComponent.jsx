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

function AssignComponent({ onShowToast, session, mode = 'foto' }) {
    const isFoto = mode === 'foto' || mode === 'foto-studio';
    const [activeTab, setActiveTab] = React.useState('belum-dipilih');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [tasks, setTasks] = React.useState([]);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterMonth, setFilterMonth] = React.useState('');
    const [filterYear, setFilterYear] = React.useState('');

    const [formData, setFormData] = React.useState({
        editor: '', editorVideo: '', fileCode: '', driveLinkSeleksi: '', tanggalPilihFoto: '', qty: '', deadline: '', deadlineVideo: '', statusFoto: 'Belum Diproses', statusVideo: 'Belum Diproses', linkHasilFoto: '', linkHasilVideo: ''
    });

    const fetchAssignmentsAndAppts = async () => {
        const { data: appts, error: err1 } = await supabase
            .from('appointments')
            .select('id, package_name, additional_notes, client_name, event_date, status, client_email, client_phone, invoice_addons, photo_selections');
        const { data: assigns, error: err2 } = await supabase.from('editor_assignments').select('*');
        
        let pkgs = adminCache.packages;
        let err3 = null;
        if (!pkgs) {
            const { data, error } = await supabase.from('packages').select('*');
            if (error) err3 = error;
            else {
                adminCache.packages = data;
                pkgs = data;
            }
        }

        if (err1) console.error("Gagal load appointments untuk assign:", err1.message);
        if (err2) console.error("Gagal load assignments:", err2.message);
        if (err3) console.error("Gagal load packages untuk division matching:", err3.message);

        if (appts) {
            const mappedTasks = appts.map(appt => {
                const ass = assigns?.find(a => a.appointment_id === appt.id);
                const pkgObj = pkgs?.find(p => p.title === appt.package_name);
                const divisions = getOrderDivisions(appt, pkgObj);
                const isStudio = divisions.includes('Studio Lapanbelas');
                const isLapanbelasId = divisions.includes('lapanbelas.id');

                // Deteksi add-on foto dan video jika ada
                const { hasPhotoAddon, hasVideoAddon } = checkOrderPhotoVideoAddons(appt);

                // Deteksi apakah paket/appointment memiliki item foto atau video
                const pkgNameLower = (appt.package_name || '').toLowerCase();
                const pkgCategoryLower = (pkgObj?.category || '').toLowerCase();
                const pkgDescLower = (pkgObj?.description || '').toLowerCase();
                const notesLower = (appt.additional_notes || '').toLowerCase();

                const isBundling = pkgNameLower.includes('bundling') || pkgCategoryLower.includes('bundling') || pkgDescLower.includes('bundling') || notesLower.includes('bundling');
                const isMakeupOrDecor = divisions.includes('Lady Makeup') || divisions.includes('Lapanbelas Dekorasi');

                let hasPhotoItem = false;
                let hasVideoItem = false;

                // Deteksi jika sudah ada penugasan video sebelumnya di DB / editor_assignments
                const hasExistingVideoAssignment = Boolean(
                    (ass?.editor_name && (ass.editor_name.includes(' || ') ? ass.editor_name.split(' || ')[1]?.trim() : ass.editor_name.toLowerCase().includes('video'))) ||
                    ass?.deadline_video ||
                    ass?.link_hasil_video ||
                    (ass?.status_video && ass.status_video !== 'Belum Diproses')
                );

                if (isStudio) {
                    hasPhotoItem = true;
                    hasVideoItem = false;
                } else if (isBundling) {
                    hasPhotoItem = true;
                    hasVideoItem = true;
                } else if (isMakeupOrDecor) {
                    // Paket Lady Makeup atau Dekorasi HANYA punya item foto/video jika memesan add-on foto/video atau ada penugasan video
                    hasPhotoItem = hasPhotoAddon;
                    hasVideoItem = hasVideoAddon || hasExistingVideoAssignment;
                } else {
                    // Paket reguler Wedding / Divisi lapanbelas.id
                    const cleanDesc = pkgDescLower.replace(/\[photo_limit\]:[^\n]*/gi, '');
                    const titleAndCat = `${pkgNameLower} ${pkgCategoryLower}`;

                    hasPhotoItem = isLapanbelasId ||
                        titleAndCat.includes('foto') || titleAndCat.includes('photo') ||
                        cleanDesc.includes('foto') || cleanDesc.includes('photo') || cleanDesc.includes('album') || cleanDesc.includes('cetak') ||
                        notesLower.includes('foto') || notesLower.includes('photo') ||
                        hasPhotoAddon;

                    hasVideoItem = titleAndCat.includes('video') || titleAndCat.includes('cinematic') || titleAndCat.includes('cinema') || titleAndCat.includes('teaser') || titleAndCat.includes('dokumentasi') ||
                        cleanDesc.includes('video') || cleanDesc.includes('cinema') || cleanDesc.includes('cinematic') || cleanDesc.includes('teaser') || cleanDesc.includes('liputan video') || cleanDesc.includes('dokumentasi') ||
                        notesLower.includes('video') || notesLower.includes('cinematic') || notesLower.includes('cinema') ||
                        hasVideoAddon ||
                        hasExistingVideoAssignment;
                }

                let rawFileCode = ass ? ass.file_code : '';
                let parsedFileCode = '';
                let parsedDriveLink = '';
                let parsedDriveLinkSeleksi = '';
                let parsedTanggalPilihFoto = '';
                let parsedStatusFoto = ass ? ass.status_foto : 'Belum Diproses';

                if (rawFileCode && rawFileCode.includes(' || ')) {
                    const parts = rawFileCode.split(' || ');
                    parsedFileCode = parts[0] || '';
                    parsedDriveLink = parts[1] || '';
                    parsedDriveLinkSeleksi = parts[2] || '';
                    parsedTanggalPilihFoto = parts[3] || '';
                } else {
                    parsedFileCode = rawFileCode || '';
                }

                // If no assignment exists yet, check if client has selected photos in additional_notes
                if (!ass) {
                    const notes = appt.additional_notes || '';
                    if (notes.includes('[FOTO TERPILIH]:')) {
                        const match = notes.match(/\[FOTO TERPILIH\]:\r?\n([\s\S]*)/i);
                        if (match && match[1]) {
                            let cleanText = match[1];
                            if (cleanText.includes('[INFO TAMBAHAN]:')) {
                                cleanText = cleanText.split('[INFO TAMBAHAN]:')[0];
                            }
                            const photoLines = cleanText
                                .split('\n')
                                .map(line => line.replace(/^\d+\.\s*/, '').trim())
                                .filter(line => line !== '');
                            parsedFileCode = photoLines.join(', ');
                            parsedStatusFoto = 'Antrian Pengerjaan';
                        }
                    }
                    parsedDriveLinkSeleksi = appt.drive_link || '';
                }

                // Determine photo limit of the package
                let pkgLimit = null;
                if (pkgObj) {
                    const desc = pkgObj.description || '';
                    const plMatch = desc.match(/\[PHOTO_LIMIT\]:\s*(\d+)/i);
                    if (plMatch) {
                        pkgLimit = parseInt(plMatch[1], 10);
                    } else {
                        const name = appt.package_name.toLowerCase();
                        if (name.includes('80')) pkgLimit = 80;
                        else if (name.includes('100')) pkgLimit = 100;
                        else if (name.includes('50')) pkgLimit = 50;
                        else if (name.includes('150')) pkgLimit = 150;
                    }
                }
                let deadlineClient = null;
                const baseDateStr = isFoto ? (parsedTanggalPilihFoto || null) : (appt.event_date || null);
                if (baseDateStr) {
                    const desc = pkgObj ? (pkgObj.description || '') : '';
                    const matchTotal = desc.match(/\[DEADLINE\]:\s*(\d+)/i);
                    const totalDays = matchTotal ? parseInt(matchTotal[1], 10) : (isStudio ? 7 : 30);
                    try {
                        const d = new Date(baseDateStr);
                        d.setDate(d.getDate() + totalDays);
                        deadlineClient = d.toISOString().split('T')[0];
                    } catch (e) {}
                }

                // Ekstrak catatan khusus per foto dari klien
                const clientNotesList = [];
                const ps = appt.photo_selections;
                if (ps && ps.sessions && typeof ps.sessions === 'object') {
                    Object.values(ps.sessions).forEach(sess => {
                        const sTitle = sess.sessionTitle || 'Foto';
                        const notesMap = sess.photoNotes || {};
                        (sess.photos || []).forEach(p => {
                            const noteText = (p.note || notesMap[p.id] || '').trim();
                            if (noteText) {
                                clientNotesList.push({
                                    id: p.id,
                                    file: p.name,
                                    note: noteText,
                                    session: sTitle
                                });
                            }
                        });
                    });
                } else if (ps && Array.isArray(ps.photos)) {
                    const notesMap = ps.photoNotes || {};
                    ps.photos.forEach(p => {
                        const noteText = (p.note || notesMap[p.id] || '').trim();
                        if (noteText) {
                            clientNotesList.push({
                                id: p.id,
                                file: p.name,
                                note: noteText,
                                session: 'Foto'
                            });
                        }
                    });
                }
                const rawNotesStr = appt.additional_notes || '';
                if (clientNotesList.length === 0 && rawNotesStr.includes('[CATATAN EDIT FOTO KLIEN')) {
                    const match = rawNotesStr.match(/\[CATATAN EDIT FOTO KLIEN[^\]]*\]:\r?\n([\s\S]*?)(?=\n\[|$)/i);
                    if (match && match[1]) {
                        match[1].split('\n').forEach(line => {
                            const trimmed = line.replace(/^[•\-*]\s*/, '').trim();
                            if (trimmed && trimmed.includes(':')) {
                                const colonIdx = trimmed.indexOf(':');
                                const file = trimmed.slice(0, colonIdx).trim();
                                const note = trimmed.slice(colonIdx + 1).trim();
                                if (file && note) {
                                    clientNotesList.push({ file, note, session: 'Catatan' });
                                }
                            }
                        });
                    }
                }

                return {
                    id: appt.id,
                    name: appt.client_name,
                    email: appt.client_email || '',
                    phone: appt.client_phone || '',
                    pkg: appt.package_name,
                    pkgDesc: pkgObj ? pkgObj.description : '',
                    pkgCategory: pkgObj ? pkgObj.category : '',
                    date: appt.event_date,
                    editor: ass ? (ass.editor_name || (parsedFileCode ? (isStudio ? 'EDITOR PHOTO STUDIO' : 'EDITOR PHOTO 18') : null)) : (parsedFileCode ? (isStudio ? 'EDITOR PHOTO STUDIO' : 'EDITOR PHOTO 18') : null),
                    editorFoto: (() => {
                        const raw = ass ? (ass.editor_name || '') : '';
                        let part = raw;
                        if (part.includes(' || ')) part = part.split(' || ')[0]?.trim() || '';
                        else if (part.includes(' | ')) part = part.split(' | ')[0]?.trim() || '';
                        let clean = part.replace(/\s*\(Studio\)/gi, '').trim();
                        // Jika klien sudah memilih foto, otomatis default ke tim editor jika belum ditunjuk spesifik
                        if (!clean && parsedFileCode) {
                            clean = isStudio ? 'EDITOR PHOTO STUDIO' : 'EDITOR PHOTO 18';
                        }
                        return clean;
                    })(),
                    editorVideo: (() => {
                        const raw = ass ? (ass.editor_name || '') : '';
                        if (raw.includes(' || ')) return raw.split(' || ')[1]?.trim() || '';
                        if (raw.includes(' | ')) return raw.split(' | ')[1]?.trim() || '';
                        return '';
                    })(),
                    fileCode: parsedFileCode,
                    driveLink: parsedDriveLink,
                    driveLinkSeleksi: parsedDriveLinkSeleksi,
                    tanggalPilihFoto: parsedTanggalPilihFoto,
                    qty: ass ? ass.qty : '',
                    deadline: ass ? ass.deadline : '',
                    deadlineVideo: ass ? ass.deadline_video : '',
                    deadlineClient: deadlineClient,
                    statusFoto: (appt.status === 'Selesai' || (appt.additional_notes || '').includes('[HANDOVER_RECORD]')) ? 'Done' : parsedStatusFoto,
                    statusVideo: (appt.status === 'Selesai' || (appt.additional_notes || '').includes('[HANDOVER_RECORD]')) ? 'Done' : (ass ? ass.status_video : 'Belum Diproses'),
                    isApptSelesai: appt.status === 'Selesai' || (appt.additional_notes || '').includes('[HANDOVER_RECORD]'),
                    linkHasilFoto: ass ? ass.link_hasil_foto : '',
                    linkHasilVideo: ass ? ass.link_hasil_video : '',
                    divisions: divisions,
                    isStudio: isStudio,
                    isLapanbelasId: isLapanbelasId,
                    hasPhotoItem: hasPhotoItem,
                    hasVideoItem: hasVideoItem,
                    pkgLimit: pkgLimit,
                    clientPhotoNotes: clientNotesList,
                    photoSelections: appt.photo_selections || null
                };
            });
            setTasks(mappedTasks);
        }
    };

    const [availableEditors, setAvailableEditors] = React.useState([]);
    const [confirmStatusModal, setConfirmStatusModal] = React.useState(null);
    const [isSubmittingStatus, setIsSubmittingStatus] = React.useState(false);
    const [isSendingReminder, setIsSendingReminder] = React.useState(false);
    const [loadingReminderId, setLoadingReminderId] = React.useState(null);

    const handleTriggerAllReminders = async () => {
        setIsSendingReminder(true);
        onShowToast("Memeriksa & mengirim pengingat deadline ke WhatsApp Editor dan Admin...", "info");
        try {
            const res = await adminFetch('/api/trigger-editor-reminders', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                if (data.remindersSent > 0) {
                    onShowToast(`Sukses! ${data.remindersSent} pesan WhatsApp reminder terkirim (${data.taskCount} tugas).`, "success");
                } else {
                    onShowToast("Semua tugas editor masih aman dalam batas deadline atau sudah selesai.", "info");
                }
            } else {
                onShowToast("Gagal mengirim reminder: " + (data.error || 'Terjadi kesalahan'), "error");
            }
        } catch (err) {
            onShowToast("Error server: " + err.message, "error");
        } finally {
            setIsSendingReminder(false);
        }
    };

    const handleSendSingleReminder = async (task, targetType) => {
        setLoadingReminderId(task.id);
        onShowToast(`Mengirim reminder WhatsApp ke Editor ${targetType === 'foto' ? 'Foto' : 'Video'}...`, "info");
        try {
            const res = await adminFetch('/api/send-editor-wa-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: task.id, targetType })
            });
            const data = await res.json();
            if (data.success) {
                onShowToast(`Reminder WhatsApp berhasil dikirim ke Editor & Admin! 🚀`, "success");
            } else {
                onShowToast("Gagal mengirim reminder: " + (data.error || 'Terjadi kesalahan'), "error");
            }
        } catch (err) {
            onShowToast("Error server: " + err.message, "error");
        } finally {
            setLoadingReminderId(null);
        }
    };

    const fetchAvailableEditors = async () => {
        const { data } = await supabase.from('admin_users').select('display_name, role, username');
        if (data) {
            setAvailableEditors(data);
        }
    };

    React.useEffect(() => {
        fetchAssignmentsAndAppts();
        fetchAvailableEditors();

        // Listen for real-time updates on both appointments and editor_assignments
        const appointmentsChannel = supabase
            .channel('assign-appointments-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchAssignmentsAndAppts();
            })
            .subscribe();

        const assignmentsChannel = supabase
            .channel('assign-editor-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'editor_assignments' }, () => {
                fetchAssignmentsAndAppts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(appointmentsChannel);
            supabase.removeChannel(assignmentsChannel);
        };
    }, []);

    const handleAssignClick = (task) => {
        setSelectedTask(task);

        let defaultDeadline = task.deadline || '';
        let defaultDeadlineVideo = task.deadlineVideo || '';

        const dateToUse = task.tanggalPilihFoto || new Date().toISOString().split('T')[0];

        if (!defaultDeadline && isFoto) {
            let deadlineEditorDays = 15; // default fallback
            const desc = task.pkgDesc || '';
            const matchEditor = desc.match(/\[DEADLINE_EDITOR\]:\s*(\d+)/i);
            const match = desc.match(/\[DEADLINE\]:\s*(\d+)/i);
            if (matchEditor) {
                deadlineEditorDays = parseInt(matchEditor[1], 10);
            } else if (match) {
                const totalDays = parseInt(match[1], 10);
                deadlineEditorDays = totalDays > 15 ? totalDays - 15 : Math.max(1, Math.round(totalDays / 2));
            } else {
                if (task.isStudio) {
                    deadlineEditorDays = 7;
                } else if (task.isLapanbelasId || (task.divisions && task.divisions.includes('lapanbelas.id'))) {
                    deadlineEditorDays = 30;
                }
            }

            const baseDate = new Date(dateToUse);
            baseDate.setDate(baseDate.getDate() + deadlineEditorDays);
            defaultDeadline = baseDate.toISOString().split('T')[0];
        }

        if (!defaultDeadlineVideo && !isFoto) {
            let deadlineEditorDays = 15;
            const desc = task.pkgDesc || '';
            const matchEditor = desc.match(/\[DEADLINE_EDITOR\]:\s*(\d+)/i);
            if (matchEditor) {
                deadlineEditorDays = parseInt(matchEditor[1], 10);
            }
            const baseDate = new Date(dateToUse);
            baseDate.setDate(baseDate.getDate() + deadlineEditorDays);
            defaultDeadlineVideo = baseDate.toISOString().split('T')[0];
        }

        let initialQty = task.qty || '';
        if (!initialQty && task.fileCode) {
            const count = task.fileCode.split(',').filter(item => item.trim() !== '').length;
            if (count > 0) initialQty = count;
        }

        setFormData({
            editor: task.editorFoto || '',
            editorVideo: task.editorVideo || '',
            fileCode: task.fileCode || '',
            driveLink: task.driveLink || '',
            driveLinkSeleksi: task.driveLinkSeleksi || '',
            tanggalPilihFoto: task.tanggalPilihFoto || new Date().toISOString().split('T')[0],
            qty: initialQty,
            deadline: defaultDeadline,
            deadlineVideo: defaultDeadlineVideo,
            statusFoto: task.statusFoto || 'Belum Diproses',
            statusVideo: task.statusVideo || 'Belum Diproses',
            linkHasilFoto: task.linkHasilFoto || '',
            linkHasilVideo: task.linkHasilVideo || '',
            sendClientNotif: true
        });
        setIsModalOpen(true);
    };

    const handleFileCodeChange = (e) => {
        const val = e.target.value;
        let newQty = formData.qty;

        const cleanVal = val.replace(/\[[^\]]+\]:\s*/g, '').trim();
        if (cleanVal.includes(',')) {
            const count = cleanVal.split(',').filter(item => item.trim() !== '').length;
            newQty = count > 0 ? count : '';
        } else if (cleanVal === '') {
            newQty = '';
        } else if (cleanVal !== '' && (!formData.qty || formData.qty === '')) {
            newQty = 1;
        }

        setFormData({ ...formData, fileCode: val, qty: newQty });
    };

    const sendProgressEmail = async (task, status) => {
        if (!task.email) return;
        try {
            const response = await adminFetch('/api/send-progress-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: status,
                    order: {
                        id: task.id,
                        client_name: task.name,
                        client_email: task.email,
                        package_name: task.pkg,
                        editor_name: task.editor,
                        file_code: task.fileCode,
                        link_hasil_foto: task.linkHasilFoto || '',
                        link_hasil_video: task.linkHasilVideo || '',
                        qty: task.qty,
                        deadline: task.deadline,
                        deadline_video: task.deadlineVideo
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                console.log(`[Email] Sukses mengirim notifikasi progres (${status}) ke ${task.email}`);
            } else {
                console.error("[Email] Gagal mengirim notifikasi progres:", resData.error);
                onShowToast(`⚠️ Notifikasi email (${status}) gagal terkirim ke "${task.email}": ${resData.error}`, "error");
            }
        } catch (err) {
            console.error("[Email] Error request progress email:", err);
            onShowToast(`⚠️ Gagal koneksi email untuk "${task.email}": ${err.message}`, "error");
        }
    };

    const handleSendFeedbackRequest = async (task) => {
        onShowToast("Mengirim Permintaan Ulasan via WhatsApp...", "info");
        try {
            const response = await adminFetch('/api/send-feedback-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: task.id,
                    order: {
                        id: task.id,
                        client_name: task.name,
                        client_phone: task.phone,
                        package_name: task.pkg
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast(resData.message || "Permintaan ulasan berhasil dikirim via WhatsApp! ⭐", "success");
            } else {
                onShowToast("Gagal: " + (resData.error || "Gagal mengirim WhatsApp"), "error");
            }
        } catch (error) {
            onShowToast("Error server: " + error.message, "error");
        }
    };

    const sendEditorNotification = async (editorName, taskType, order) => {
        if (!editorName) return;

        // Find email from availableEditors
        const editorObj = availableEditors.find(u => u.display_name === editorName);
        if (!editorObj || !editorObj.username) {
            console.warn(`[Editor Notification] Could not find email for editor: ${editorName}`);
            return;
        }

        const editorEmail = editorObj.username;

        try {
            const response = await adminFetch('/api/send-editor-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    editorEmail,
                    editorName,
                    clientName: order.name || '',
                    packageName: order.pkg || '',
                    deadline: taskType === 'Foto' ? order.deadline : order.deadlineVideo,
                    taskType,
                    orderId: order.id
                })
            });
            const resData = await response.json();
            if (resData.success) {
                console.log(`[Editor Notification] Sukses mengirim notifikasi ke ${editorEmail} (${editorName}) untuk tugas ${taskType}`);
            } else {
                console.error("[Editor Notification] Gagal mengirim notifikasi ke editor:", resData.error);
            }
        } catch (err) {
            console.error("[Editor Notification] Error request editor notification email:", err);
        }
    };

    const handleSaveAssign = async (e) => {
        e.preventDefault();

        // Validasi jika status dipilih "Selesai untuk Preview", link hasil Google Drive WAJIB diisi
        if (isFoto && formData.statusFoto === 'Selesai untuk Preview' && (!formData.linkHasilFoto || !formData.linkHasilFoto.trim())) {
            onShowToast("Gagal: Link Google Drive Hasil Foto wajib diisi saat status 'Selesai untuk Preview'!", "error");
            return;
        }
        if (!isFoto && formData.statusVideo === 'Selesai untuk Preview' && (!formData.linkHasilVideo || !formData.linkHasilVideo.trim())) {
            onShowToast("Gagal: Link Google Drive / YouTube Hasil Video wajib diisi saat status 'Selesai untuk Preview'!", "error");
            return;
        }

        let combinedEditor = '';
        if (mode === 'foto-studio') {
            const cleanEditor = (formData.editor || '').replace(/\s*\(Studio\)/gi, '').trim();
            combinedEditor = cleanEditor ? `${cleanEditor} (Studio)` : '';
        } else {
            combinedEditor = `${(formData.editor || '').trim()} || ${(formData.editorVideo || '').trim()}`;
        }

        // Cek editor lama vs baru untuk kirim notifikasi
        const currentFotoEditor = selectedTask ? selectedTask.editorFoto : '';
        const currentVideoEditor = selectedTask ? selectedTask.editorVideo : '';
        const newFotoEditor = formData.editor || '';
        const newVideoEditor = formData.editorVideo || '';

        let combinedFileCode = formData.fileCode;
        if (isFoto) {
            combinedFileCode = `${formData.fileCode} || ${formData.driveLink || ''} || ${formData.driveLinkSeleksi || ''} || ${formData.tanggalPilihFoto || ''}`;
        }

        const taskFileCode = selectedTask?.fileCode || '';
        const taskDriveLink = selectedTask?.driveLink || '';
        const taskDriveLinkSeleksi = selectedTask?.driveLinkSeleksi || '';
        const taskTanggalPilihFoto = selectedTask?.tanggalPilihFoto || '';
        const preservedFileCode = `${taskFileCode} || ${taskDriveLink} || ${taskDriveLinkSeleksi} || ${taskTanggalPilihFoto}`;

        const cleanDate = (d) => (d && typeof d === 'string' && d.trim() !== '' && d.trim() !== '-') ? d.trim() : null;
        const cleanQty = (q) => {
            if (q === null || q === undefined || q === '' || isNaN(Number(q))) return 0;
            return Math.max(0, Math.round(Number(q)));
        };

        const rawQty = isFoto 
            ? (formData.qty !== '' && formData.qty !== null && formData.qty !== undefined ? formData.qty : selectedTask?.qty)
            : selectedTask?.qty;
        const finalQty = cleanQty(rawQty);

        const dbPayload = {
            appointment_id: selectedTask.id,
            editor_name: combinedEditor,
            file_code: isFoto ? combinedFileCode : preservedFileCode,
            qty: finalQty,
            deadline: cleanDate(isFoto ? formData.deadline : selectedTask?.deadline),
            deadline_video: cleanDate(mode === 'video' ? formData.deadlineVideo : selectedTask?.deadlineVideo),
            status_foto: isFoto ? formData.statusFoto : (selectedTask?.statusFoto || 'Belum Diproses'),
            status_video: mode === 'video' ? formData.statusVideo : (selectedTask?.statusVideo || 'Belum Diproses'),
            link_hasil_foto: isFoto ? (formData.linkHasilFoto || null) : (selectedTask?.linkHasilFoto || null),
            link_hasil_video: mode === 'video' ? (formData.linkHasilVideo || null) : (selectedTask?.linkHasilVideo || null)
        };

        const { error } = await supabase.from('editor_assignments').upsert([dbPayload]);
        if (error) {
            onShowToast("Gagal menyimpan assign: " + error.message, "error");
        } else {
            onShowToast("Penugasan editor berhasil disimpan!", "success");

            // Kirim notifikasi email progres jika dicentang
            if (formData.sendClientNotif && selectedTask && selectedTask.email) {
                const emailPayload = {
                    id: selectedTask.id,
                    name: selectedTask.name,
                    email: selectedTask.email,
                    pkg: selectedTask.pkg,
                    editor: combinedEditor,
                    fileCode: isFoto ? combinedFileCode : preservedFileCode,
                    linkHasilFoto: isFoto ? (formData.linkHasilFoto || '') : (selectedTask.linkHasilFoto || ''),
                    linkHasilVideo: mode === 'video' ? (formData.linkHasilVideo || '') : (selectedTask.linkHasilVideo || ''),
                    qty: finalQty,
                    deadline: isFoto ? formData.deadline : selectedTask.deadline,
                    deadlineVideo: mode === 'video' ? (formData.deadlineVideo || '') : (selectedTask.deadlineVideo || '')
                };
                const statusMessage = isFoto ? `Foto: ${formData.statusFoto}` : `Video: ${formData.statusVideo}`;
                sendProgressEmail(emailPayload, statusMessage);
            }

            // Kirim notifikasi email ke Editor jika ada penugasan baru / perubahan editor
            if (newFotoEditor && newFotoEditor !== currentFotoEditor) {
                sendEditorNotification(newFotoEditor, 'Foto', {
                    id: selectedTask.id,
                    name: selectedTask.name,
                    pkg: selectedTask.pkg,
                    deadline: isFoto ? formData.deadline : selectedTask.deadline
                });
            }
            if (newVideoEditor && newVideoEditor !== currentVideoEditor) {
                sendEditorNotification(newVideoEditor, 'Video', {
                    id: selectedTask.id,
                    name: selectedTask.name,
                    pkg: selectedTask.pkg,
                    deadlineVideo: mode === 'video' ? formData.deadlineVideo : selectedTask.deadlineVideo
                });
            }

            setIsModalOpen(false);
            fetchAssignmentsAndAppts();
        }
    };

    const openStatusConfirm = (task, type, newStatus) => {
        const currStatus = type === 'foto' ? task.statusFoto : task.statusVideo;
        if (currStatus === newStatus) return;

        if (newStatus === 'Selesai untuk Preview') {
            if (type === 'foto' && (!task || !task.linkHasilFoto || !task.linkHasilFoto.trim())) {
                onShowToast("Gagal: Link Google Drive Foto belum diisi. Edit penugasan terlebih dahulu!", "error");
                fetchAssignmentsAndAppts();
                return;
            }
            if (type === 'video' && (!task || !task.linkHasilVideo || !task.linkHasilVideo.trim())) {
                onShowToast("Gagal: Link Google Drive Video belum diisi. Edit penugasan terlebih dahulu!", "error");
                fetchAssignmentsAndAppts();
                return;
            }
        }

        setConfirmStatusModal({
            task,
            type,
            newStatus,
            currStatus,
            sendNotification: true
        });
    };

    const applyStatusChange = async () => {
        if (!confirmStatusModal) return;
        const { task, type, newStatus, sendNotification } = confirmStatusModal;
        setIsSubmittingStatus(true);

        const updatePayload = {};
        if (type === 'foto') updatePayload.status_foto = newStatus;
        if (type === 'video') updatePayload.status_video = newStatus;

        // Check if editor_assignments exists, then update or insert
        const { data: existingAss } = await supabase
            .from('editor_assignments')
            .select('appointment_id')
            .eq('appointment_id', task.id)
            .maybeSingle();

        let error = null;
        if (existingAss) {
            const res = await supabase.from('editor_assignments').update(updatePayload).eq('appointment_id', task.id);
            error = res.error;
        } else {
            const taskFileCode = task?.fileCode || '';
            const taskDriveLink = task?.driveLink || '';
            const taskDriveLinkSeleksi = task?.driveLinkSeleksi || '';
            const taskTanggalPilihFoto = task?.tanggalPilihFoto || '';
            const preservedFileCode = `${taskFileCode} || ${taskDriveLink} || ${taskDriveLinkSeleksi} || ${taskTanggalPilihFoto}`;
            const finalFileCode = preservedFileCode.replace(/ \|\| /g, '').trim() ? preservedFileCode : '-';

            const res = await supabase.from('editor_assignments').insert([{
                appointment_id: task.id,
                editor_name: task.editor || '-',
                file_code: finalFileCode,
                qty: (task.qty !== null && task.qty !== undefined && task.qty !== '' && !isNaN(Number(task.qty))) ? Math.round(Number(task.qty)) : 0,
                deadline: task.deadline || null,
                deadline_video: task.deadlineVideo || null,
                status_foto: type === 'foto' ? newStatus : (task.statusFoto || 'Belum Diproses'),
                status_video: type === 'video' ? newStatus : (task.statusVideo || 'Belum Diproses'),
                ...updatePayload
            }]);
            error = res.error;
        }

        setIsSubmittingStatus(false);
        setConfirmStatusModal(null);

        if (error) {
            onShowToast("Gagal merubah status progres: " + error.message, "error");
        } else {
            if (sendNotification) {
                if (newStatus === 'Done') {
                    onShowToast("Pengerjaan selesai & notifikasi otomatis terkirim ke WhatsApp Admin! 🚀", "success");
                } else if (task && (task.email || task.phone)) {
                    onShowToast("Progres pengerjaan diperbarui & notifikasi terkirim ke klien!", "success");
                } else {
                    onShowToast("Progres pengerjaan berhasil diperbarui!", "success");
                }
                sendProgressEmail({
                    ...task,
                    editor: task.editor,
                }, `${type === 'foto' ? 'Foto' : 'Video'}: ${newStatus}`);
            } else {
                onShowToast("Progres pengerjaan berhasil diperbarui (tanpa notifikasi)!", "success");
            }

            fetchAssignmentsAndAppts();
        }
    };

    const handleStatusChange = async (id, type, newStatus) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            openStatusConfirm(task, type, newStatus);
        }
    };

    const filteredTasks = tasks.filter(task => {
        // Filter by division & item type depending on mode
        if (mode === 'foto-studio') {
            // Khusus Foto Studio: Hanya Studio Lapanbelas
            const matchDiv = task.isStudio || (task.divisions && task.divisions.includes('Studio Lapanbelas'));
            if (!matchDiv) return false;
        } else if (mode === 'foto') {
            // Khusus Foto Wedding/Divisi Lapanbelas ID: Jangan masukkan paket yang merupakan Studio Lapanbelas
            if (task.isStudio || (task.divisions && task.divisions.includes('Studio Lapanbelas'))) return false;
            const matchDiv = task.isLapanbelasId || (task.divisions && task.divisions.includes('lapanbelas.id')) || task.hasPhotoItem;
            if (!matchDiv) return false;
            if (!task.hasPhotoItem) return false;
        } else if (mode === 'video') {
            // Khusus Video Wedding/Divisi Lapanbelas ID: Jangan masukkan Studio Lapanbelas
            if (task.isStudio || (task.divisions && task.divisions.includes('Studio Lapanbelas'))) return false;
            const matchDiv = (task.isLapanbelasId || (task.divisions && task.divisions.includes('lapanbelas.id')) || task.hasVideoItem) && task.hasVideoItem;
            if (!matchDiv) return false;
            if (!task.hasVideoItem) return false;
        }

        const relevantEditor = isFoto ? task.editorFoto : task.editorVideo;
        const roles = (session?.role || '').split(',').map(r => r.trim());
        const hasRestrictedRole = roles.includes('karyawan') || roles.includes('editor_foto') || roles.includes('editor_foto_studio') || roles.includes('editor_video');
        const hasAdminRole = roles.includes('owner') || roles.includes('admin') || roles.includes('studio');

        if (session && hasRestrictedRole && !hasAdminRole) {
            const loggedInUser = session.username.toLowerCase();
            if (loggedInUser !== 'karyawan') {
                const editorNameLower = relevantEditor ? relevantEditor.toLowerCase() : '';
                if (!editorNameLower.includes(loggedInUser)) {
                    return false;
                }
            }
        }

        const searchLower = searchQuery.toLowerCase();
        const matchSearch = (task.name && task.name.toLowerCase().includes(searchLower)) ||
            (task.pkg && task.pkg.toLowerCase().includes(searchLower)) ||
            (relevantEditor && relevantEditor.toLowerCase().includes(searchLower));

        let matchMonth = true;
        let matchYear = true;

        if (task.date) {
            const dateObj = new Date(task.date);
            if (filterMonth !== '') {
                matchMonth = (dateObj.getMonth() + 1).toString() === filterMonth;
            }
            if (filterYear !== '') {
                matchYear = dateObj.getFullYear().toString() === filterYear;
            }
        } else {
            if (filterMonth !== '' || filterYear !== '') {
                matchMonth = false;
                matchYear = false;
            }
        }

        return matchSearch && matchMonth && matchYear;
    });

    const unassigned = filteredTasks.filter(t => {
        if (t.isApptSelesai || (isFoto ? t.statusFoto === 'Done' : t.statusVideo === 'Done')) return false;
        return isFoto ? !t.editorFoto : !t.editorVideo;
    });
    const inProgress = filteredTasks.filter(t => {
        if (t.isApptSelesai) return false;
        return isFoto ? (t.editorFoto && t.statusFoto !== 'Done') : (t.editorVideo && t.statusVideo !== 'Done');
    });
    const done = filteredTasks.filter(t => {
        if (t.isApptSelesai) return true;
        return isFoto ? (t.editorFoto && t.statusFoto === 'Done') : (t.editorVideo && t.statusVideo === 'Done');
    });

    return (
        <div className="animate-in fade-in flex flex-col h-full relative text-left min-w-0">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                    {mode === 'foto-studio' ? 'Penugasan Editor Foto Studio' : mode === 'foto' ? 'Penugasan Editor Foto' : 'Penugasan Editor Video'}
                </h2>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <SvgIcon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Cari nama client, paket, atau editor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 text-white"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none"
                    >
                        <option value="">Bulan (Semua)</option>
                        <option value="1">Januari</option>
                        <option value="2">Februari</option>
                        <option value="3">Maret</option>
                        <option value="4">April</option>
                        <option value="5">Mei</option>
                        <option value="6">Juni</option>
                        <option value="7">Juli</option>
                        <option value="8">Agustus</option>
                        <option value="9">September</option>
                        <option value="10">Oktober</option>
                        <option value="11">November</option>
                        <option value="12">Desember</option>
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none"
                    >
                        <option value="">Tahun (Semua)</option>
                        {Array.from(
                            { length: Math.max(new Date().getFullYear() + 4, 2032) - 2024 },
                            (_, i) => 2024 + i
                        ).map((yr) => (
                            <option key={yr} value={String(yr)}>{yr}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 mb-6 pb-2">
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('belum-dipilih')} className={`pb-3 text-sm font-medium transition-all ${activeTab === 'belum-dipilih' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}>
                        Belum Dipilih <span className="ml-1 bg-white/10 text-xs px-2 py-0.5 rounded-full">{unassigned.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('sudah-dipilih')} className={`pb-3 text-sm font-medium transition-all ${activeTab === 'sudah-dipilih' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>
                        Sudah Dipilih <span className="ml-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">{inProgress.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('done')} className={`pb-3 text-sm font-medium transition-all ${activeTab === 'done' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}>
                        Done <span className="ml-1 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">{done.length}</span>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTriggerAllReminders}
                        disabled={isSendingReminder}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                        title="Kirim pengingat WhatsApp ke semua editor yang mendekati deadline / overdue dan rekap ke admin"
                    >
                        <SvgIcon name="bell" className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isSendingReminder ? 'Mengirim...' : 'Kirim Reminder WA Hari Ini'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-10 custom-scrollbar">
                {activeTab === 'belum-dipilih' && unassigned.map(task => (
                    <div key={task.id} className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-gray-500">
                        <div>
                            <h3 className="font-semibold">{task.name}</h3>
                            <p className="text-sm text-gray-400 mb-1.5">Paket: {task.pkg} • Tanggal: {formatDateUI(task.date)}</p>
                            <div className="flex gap-2">
                                {task.driveLinkSeleksi && (
                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">Link Seleksi Terkirim</span>
                                )}
                                {task.fileCode && (
                                    <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-medium">Klien Sudah Memilih ({task.qty || task.fileCode.split(',').length} Foto)</span>
                                )}
                                {task.clientPhotoNotes && task.clientPhotoNotes.length > 0 && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        <span>📝</span> {task.clientPhotoNotes.length} Catatan Khusus
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => handleAssignClick(task)} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <SvgIcon name="user-plus" className="w-4 h-4 text-black" /> Assign Editor
                        </button>
                    </div>
                ))}

                {activeTab === 'sudah-dipilih' && inProgress.map(task => {
                    const targetDeadline = isFoto ? task.deadline : task.deadlineVideo;
                    let urgencyBadge = null;
                    if (targetDeadline) {
                        try {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dDate = new Date(targetDeadline);
                            dDate.setHours(0, 0, 0, 0);
                            const diff = Math.ceil((dDate - today) / (1000 * 60 * 60 * 24));
                            if (diff < 0) {
                                urgencyBadge = (
                                    <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                        🚨 Overdue {Math.abs(diff)} Hari
                                    </span>
                                );
                            } else if (diff === 0) {
                                urgencyBadge = (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                                        🔥 Hari Ini Terakhir!
                                    </span>
                                );
                            } else if (diff <= 3) {
                                urgencyBadge = (
                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2 py-0.5 rounded-full font-semibold">
                                        ⏰ H-{diff} Deadline
                                    </span>
                                );
                            }
                        } catch (e) {}
                    }

                    return (
                        <div key={task.id} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between border-l-4 border-blue-500 gap-4">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="font-semibold">{task.name} ({task.pkg})</h3>
                                    {urgencyBadge}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <p className="text-gray-500 mb-0.5">Editor {isFoto ? 'Foto' : 'Video'}</p>
                                        <p className="font-medium">{isFoto ? (mode === 'foto-studio' && task.editorFoto ? `${task.editorFoto} (Studio)` : (task.editorFoto || '-')) : (task.editorVideo || '-')}</p>
                                    </div>
                                    {isFoto && (
                                        <div>
                                            <p className="text-gray-500 mb-0.5">Kode / Qty</p>
                                            <div className="font-medium font-mono text-gray-300">
                                                {(() => {
                                                    const photosArr = task.fileCode ? task.fileCode.split(',').map(p => p.trim()).filter(Boolean) : [];
                                                    if (task.pkgLimit && photosArr.length > task.pkgLimit) {
                                                        const pkgPhotos = photosArr.slice(0, task.pkgLimit).join(', ');
                                                        const extraPhotos = photosArr.slice(task.pkgLimit).join(', ');
                                                        return (
                                                            <div className="space-y-1">
                                                                <div className="text-gray-300">{pkgPhotos}</div>
                                                                <div className="text-violet-400 font-semibold text-[11px] bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded mt-1">
                                                                    [+ Tambahan]: {extraPhotos}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                                                                    ({task.pkgLimit} Paket + {photosArr.length - task.pkgLimit} Tambahan)
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return `${task.fileCode || '-'} (${task.qty || photosArr.length} file)`;
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-gray-500 mb-0.5">Deadline Editor</p>
                                        <p className="font-semibold text-rose-400 text-xs font-mono leading-tight">
                                            {isFoto ? (task.deadline ? formatDateUI(task.deadline) : '-') : (task.deadlineVideo ? formatDateUI(task.deadlineVideo) : '-')}
                                        </p>
                                        {task.deadlineClient && (
                                            <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                                                Target Klien: <span className="text-gray-300 font-medium">{formatDateUI(task.deadlineClient)}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className={!isFoto ? 'col-span-2' : ''}>
                                        <p className="text-gray-500 mb-1">Status {isFoto ? 'Foto' : 'Video'}</p>
                                        {isFoto ? (
                                            <select
                                                value={task.statusFoto}
                                                onChange={(e) => openStatusConfirm(task, 'foto', e.target.value)}
                                                className="text-[9px] font-semibold bg-gray-950 p-1 border border-white/15 rounded text-white font-mono cursor-pointer mb-1.5 w-full"
                                            >
                                                <option value="Belum Diproses">F: Belum Diproses</option>
                                                <option value="Menunggu Seleksi Foto">F: Menunggu Seleksi</option>
                                                <option value="Antrian Pengerjaan">F: Antri Edit</option>
                                                <option value="Proses Edit">F: Proses Edit</option>
                                                <option value="Selesai untuk Preview">F: Selesai Preview</option>
                                                <option value="Done">F: Done</option>
                                            </select>
                                        ) : (
                                            <select
                                                value={task.statusVideo}
                                                onChange={(e) => openStatusConfirm(task, 'video', e.target.value)}
                                                className="text-[9px] font-semibold bg-gray-950 p-1 border border-white/15 rounded text-white font-mono cursor-pointer w-full"
                                            >
                                                <option value="Belum Diproses">V: Belum Diproses</option>
                                                <option value="Antrian Pengerjaan">V: Antri Edit</option>
                                                <option value="Proses Edit">V: Proses Edit</option>
                                                <option value="Selesai untuk Preview">V: Selesai Preview</option>
                                                <option value="Done">V: Done</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {isFoto && task.clientPhotoNotes && task.clientPhotoNotes.length > 0 && (
                                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                                <span>📝</span> Catatan Khusus Klien ({task.clientPhotoNotes.length} foto):
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const text = task.clientPhotoNotes.map(n => `• ${n.file}: ${n.note}`).join('\n');
                                                    navigator.clipboard.writeText(text);
                                                    onShowToast("Catatan klien berhasil disalin! 📋", "success");
                                                }}
                                                className="text-[10px] font-semibold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-0.5 rounded transition"
                                                title="Salin semua catatan khusus klien"
                                            >
                                                Salin Catatan
                                            </button>
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar font-mono text-[11px] pr-1">
                                            {task.clientPhotoNotes.map((item, nIdx) => (
                                                <div key={nIdx} className="bg-black/40 px-2 py-1 rounded border border-white/5 flex flex-col sm:flex-row sm:items-baseline gap-1">
                                                    <span className="font-bold text-amber-300 shrink-0">{item.file}:</span>
                                                    <span className="text-gray-200 font-sans">{item.note}</span>
                                                    {item.session && <span className="text-[9px] text-gray-500 ml-auto shrink-0">[{item.session}]</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleSendSingleReminder(task, isFoto ? 'foto' : 'video')}
                                    disabled={loadingReminderId === task.id}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                                    title={`Kirim Pengingat WA Deadline ke Editor ${isFoto ? 'Foto' : 'Video'} & Admin`}
                                >
                                    <SvgIcon name="message-circle" className="w-4 h-4 text-emerald-400" />
                                    <span className="hidden sm:inline">{loadingReminderId === task.id ? 'Mengirim...' : 'WA Reminder'}</span>
                                </button>
                                <button onClick={() => handleAssignClick(task)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition text-gray-300" title="Edit Penugasan">
                                    <SvgIcon name="edit" className="w-4 h-4 text-gray-300" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'done' && done.map(task => (
                    <div key={task.id} className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-green-500 opacity-90">
                        <div>
                            <h3 className="font-semibold text-gray-300">{task.name} ({task.pkg})</h3>
                            <p className="text-xs text-gray-500">
                                {task.editor ? `Selesai dikerjakan oleh ${task.editor}` : 'Pengerjaan selesai'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full font-semibold">
                                ✓ Selesai (Done)
                            </span>
                            {task.isApptSelesai && (
                                <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-medium">
                                    📦 Sudah Serah Terima
                                </span>
                            )}
                            <button onClick={() => { openStatusConfirm(task, isFoto ? 'foto' : 'video', 'Selesai untuk Preview'); }} className="text-xs text-gray-400 hover:text-white underline ml-2">
                                Undo
                            </button>
                        </div>
                    </div>
                ))}

                {((activeTab === 'belum-dipilih' && unassigned.length === 0) ||
                    (activeTab === 'sudah-dipilih' && inProgress.length === 0) ||
                    (activeTab === 'done' && done.length === 0)) && (
                        <div className="text-center py-8 text-gray-500">Tidak ada data untuk ditampilkan.</div>
                    )}
            </div>

            {/* Modal Konfirmasi Perubahan Status Cepat */}
            {confirmStatusModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/15 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95 shadow-2xl bg-gray-900/95 text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg font-bold">
                                🔄
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-base">Konfirmasi Perubahan Status</h3>
                                <p className="text-xs text-gray-400">Pastikan pembaruan status pengerjaan sudah sesuai</p>
                            </div>
                        </div>

                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Klien & Paket:</span>
                                <span className="font-semibold text-white truncate max-w-[200px]">{confirmStatusModal.task.name} ({confirmStatusModal.task.pkg})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Tipe Pengerjaan:</span>
                                <span className="font-semibold text-blue-300">{confirmStatusModal.type === 'foto' ? 'Editor Foto' : 'Editor Video'}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                <span className="text-gray-400">Perubahan:</span>
                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">{confirmStatusModal.currStatus}</span>
                                    <span className="text-gray-500">➔</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30">{confirmStatusModal.newStatus}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 mb-5">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={confirmStatusModal.sendNotification}
                                    onChange={(e) => setConfirmStatusModal({ ...confirmStatusModal, sendNotification: e.target.checked })}
                                    className="mt-0.5 w-4 h-4 rounded bg-gray-950 border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                <div className="text-xs">
                                    <span className="font-medium text-white block">
                                        {confirmStatusModal.newStatus === 'Done' ? 'Kirim notifikasi pengerjaan selesai ke WhatsApp Admin' : 'Kirim notifikasi update ke Klien (Email & WA)'}
                                    </span>
                                    <span className="text-gray-400 text-[11px] block mt-0.5">
                                        {confirmStatusModal.sendNotification 
                                            ? (confirmStatusModal.newStatus === 'Done' 
                                                ? 'Notifikasi otomatis akan dikirim ke WhatsApp Admin bahwa pengerjaan editor telah rampung.'
                                                : `Notifikasi akan dikirimkan ke: ${confirmStatusModal.task.email || '-'}`)
                                            : 'Update hanya disimpan internal, tidak mengirim pesan.'}
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setConfirmStatusModal(null)}
                                disabled={isSubmittingStatus}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={applyStatusChange}
                                disabled={isSubmittingStatus}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
                            >
                                {isSubmittingStatus ? 'Menyimpan...' : 'Simpan & Terapkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">Assign Editor {isFoto ? 'Foto' : 'Video'}: {selectedTask?.name}</h3>

                        <form onSubmit={handleSaveAssign} className="space-y-4">
                            <div className="flex gap-3">
                                {isFoto && (
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-400 block mb-1">Status Foto *</label>
                                        <select required value={formData.statusFoto} onChange={e => setFormData({ ...formData, statusFoto: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-2 py-2 text-[11px] outline-none focus:border-blue-500 text-white appearance-none">
                                            <option value="Belum Diproses">Belum Diproses</option>
                                            <option value="Menunggu Seleksi Foto">Menunggu Seleksi Foto</option>
                                            <option value="Antrian Pengerjaan">Antrian Pengerjaan</option>
                                            <option value="Proses Edit">Proses Edit</option>
                                            <option value="Selesai untuk Preview">Selesai untuk Preview</option>
                                            <option value="Done">Done</option>
                                        </select>
                                    </div>
                                )}
                                {!isFoto && (
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-400 block mb-1">Status Video *</label>
                                        <select required value={formData.statusVideo} onChange={e => setFormData({ ...formData, statusVideo: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-2 py-2 text-[11px] outline-none focus:border-blue-500 text-white appearance-none">
                                            <option value="Belum Diproses">Belum Diproses</option>
                                            <option value="Antrian Pengerjaan">Antrian Pengerjaan</option>
                                            <option value="Proses Edit">Proses Edit</option>
                                            <option value="Selesai untuk Preview">Selesai untuk Preview</option>
                                            <option value="Done">Done</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {isFoto && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Link Google Drive (Seleksi Foto - Raw)</label>
                                        <input type="url" placeholder="Cth: https://drive.google.com/drive/folders/seleksi" value={formData.driveLinkSeleksi || ''} onChange={e => setFormData({ ...formData, driveLinkSeleksi: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Tanggal Client Selesai Pilih Foto</label>
                                        <input
                                            type="date"
                                            value={formData.tanggalPilihFoto || ''}
                                            onChange={e => {
                                                const newDate = e.target.value;
                                                let newDeadline = formData.deadline;
                                                if (newDate && isFoto) {
                                                    let deadlineDays = 30; // fallback
                                                    const desc = selectedTask?.pkgDesc || '';
                                                    const match = desc.match(/\[DEADLINE\]:\s*(\d+)/i);
                                                    if (match) {
                                                        deadlineDays = parseInt(match[1], 10);
                                                    } else {
                                                        const division = selectedTask?.division || '';
                                                        if (division === 'Studio Lapanbelas') {
                                                            deadlineDays = 7;
                                                        } else if (division === 'lapanbelas.id') {
                                                            deadlineDays = 60;
                                                        }
                                                    }
                                                    const baseDate = new Date(newDate);
                                                    baseDate.setDate(baseDate.getDate() + deadlineDays);
                                                    newDeadline = baseDate.toISOString().split('T')[0];
                                                }
                                                setFormData({
                                                    ...formData,
                                                    tanggalPilihFoto: newDate,
                                                    deadline: newDeadline
                                                });
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white [color-scheme:dark]"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="border-t border-white/10 my-4 pt-4">
                                <p className="text-xs font-semibold text-gray-300 mb-3">Informasi Editor {isFoto ? 'Foto' : 'Video'}</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Nama Editor {isFoto ? 'Foto' : 'Video'}</label>
                                        {isFoto ? (
                                            <select value={formData.editor} onChange={e => setFormData({ ...formData, editor: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                                <option value="">Pilih Editor Foto...</option>
                                                {availableEditors.filter(u => checkRole(u.role, mode === 'foto-studio' ? 'editor_foto_studio' : 'editor_foto')).map((u, i) => (
                                                    <option key={i} value={u.display_name}>{u.display_name}</option>
                                                ))}
                                                {formData.editor && !availableEditors.find(u => u.display_name === formData.editor) && (
                                                    <option value={formData.editor}>{formData.editor} (Lama)</option>
                                                )}
                                            </select>
                                        ) : (
                                            <select value={formData.editorVideo} onChange={e => setFormData({ ...formData, editorVideo: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                                <option value="">Pilih Editor Video...</option>
                                                {availableEditors.filter(u => checkRole(u.role, 'editor_video')).map((u, i) => (
                                                    <option key={i} value={u.display_name}>{u.display_name}</option>
                                                ))}
                                                {formData.editorVideo && !availableEditors.find(u => u.display_name === formData.editorVideo) && (
                                                    <option value={formData.editorVideo}>{formData.editorVideo} (Lama)</option>
                                                )}
                                            </select>
                                        )}
                                    </div>

                                    {isFoto && (
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-400 block mb-1">Kode File Edit</label>
                                                <textarea rows={2} placeholder="Cth: LID_002, LID_003" value={formData.fileCode} onChange={handleFileCodeChange} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-white font-mono resize-y" />
                                            </div>
                                            <div className="w-1/3">
                                                <label className="text-xs text-gray-400 block mb-1">Jml File</label>
                                                <input type="number" value={formData.qty} onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    {isFoto && selectedTask?.clientPhotoNotes && selectedTask.clientPhotoNotes.length > 0 && (
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                                    <span>📝</span> Catatan Khusus Klien per Foto ({selectedTask.clientPhotoNotes.length} file)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const text = selectedTask.clientPhotoNotes.map(n => `• ${n.file}: ${n.note}`).join('\n');
                                                        navigator.clipboard.writeText(text);
                                                        onShowToast("Semua catatan khusus klien berhasil disalin! 📋", "success");
                                                    }}
                                                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded font-semibold transition"
                                                >
                                                    Salin Catatan
                                                </button>
                                            </div>
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar font-mono text-[11px] pr-1">
                                                {selectedTask.clientPhotoNotes.map((item, idx) => (
                                                    <div key={idx} className="bg-black/40 p-2 rounded border border-white/5">
                                                        <div className="flex items-center justify-between text-amber-300 font-bold mb-0.5">
                                                            <span>{item.file}</span>
                                                            {item.session && <span className="text-[9px] text-gray-400 font-normal">[{item.session}]</span>}
                                                        </div>
                                                        <p className="text-gray-200 font-sans">{item.note}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs text-gray-400">Tanggal Deadline Editor {isFoto ? 'Foto' : 'Video'} *</label>
                                            {selectedTask?.deadlineClient && (
                                                <span className="text-[10px] text-gray-400">
                                                    Target Klien: <strong className="text-gray-200">{formatDateUI(selectedTask.deadlineClient)}</strong>
                                                </span>
                                            )}
                                        </div>
                                        {isFoto ? (
                                            <input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white [color-scheme:dark]" />
                                        ) : (
                                            <input type="date" value={formData.deadlineVideo} onChange={e => setFormData({ ...formData, deadlineVideo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white [color-scheme:dark]" />
                                        )}
                                        <p className="text-[10px] text-gray-500 mt-1">Batas maksimal bagi editor menyelesaikan file editing agar ada sisa waktu untuk revisi & percetakan.</p>
                                    </div>

                                    {isFoto ? (
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Link GDrive (Hasil Foto)</label>
                                            <input type="url" placeholder="Cth: https://drive.google.com/drive/folders/foto" value={formData.linkHasilFoto || ''} onChange={e => setFormData({ ...formData, linkHasilFoto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Link GDrive / YouTube (Hasil Video)</label>
                                            <input type="url" placeholder="Cth: https://drive.google.com/drive/folders/video" value={formData.linkHasilVideo || ''} onChange={e => setFormData({ ...formData, linkHasilVideo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Checkbox Kirim Notifikasi Klien */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.sendClientNotif}
                                        onChange={(e) => setFormData({ ...formData, sendClientNotif: e.target.checked })}
                                        className="w-4 h-4 rounded bg-gray-950 border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-300 select-none">
                                        {(isFoto ? formData.statusFoto : formData.statusVideo) === 'Done'
                                            ? 'Kirim notifikasi pengerjaan selesai ke WhatsApp Admin'
                                            : 'Kirim notifikasi email & WhatsApp ke Klien'}
                                    </span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AssignComponent;
export { AssignComponent };
