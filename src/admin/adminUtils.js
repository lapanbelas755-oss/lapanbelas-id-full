import { createClient } from '@supabase/supabase-js';

export const MAX_SLOTS_PER_DAY = 2;

// Inisialisasi Supabase Client menggunakan API Keys dengan konfigurasi Auto-Refresh & Persistensi Session
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

export const adminCache = {
    packages: null,
    addons: null,
    vouchers: null,
    staff: null
};

// Client-side image compression helper sebelum upload ke Supabase Storage (agar hemat kuota & super cepat)
export const compressImageIfNeeded = async (file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.size < 300 * 1024) {
        return file;
    }
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob && blob.size < file.size) {
                        const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                        resolve(newFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

export const adminFetch = async (url, options = {}) => {
    let token = null;
    try {
        let { data } = await supabase.auth.getSession();
        let session = data?.session;
        const nowSec = Math.floor(Date.now() / 1000);
        
        // Refresh token otomatis jika session belum ada atau akan expired dalam 120 detik
        if (!session || !session.access_token || (session.expires_at && session.expires_at - nowSec < 120)) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
                session = refreshData.session;
            }
        }
        token = session?.access_token;
    } catch (e) {
        console.warn('[adminFetch] Error checking/refreshing session:', e);
    }

    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Jika server merespon 401 Unauthorized (misal saat idle lama), paksa refresh token dan ulangi request 1 kali
    if (response.status === 401) {
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session?.access_token) {
                headers['Authorization'] = `Bearer ${refreshData.session.access_token}`;
                response = await fetch(url, { ...options, headers });
            }
        } catch (e) {
            console.warn('[adminFetch] Retry on 401 failed:', e);
        }
    }

    return response;
};

// Helper sinkronisasi ketersediaan tanggal ke tabel date_availability
export const syncDateAvailabilityForDates = async (supabaseClient, dateList = []) => {
    const validDates = [...new Set(dateList.filter(Boolean))];
    for (const dStr of validDates) {
        try {
            const { data: activeAppts, error: countErr } = await supabaseClient
                .from('appointments')
                .select('id, status')
                .or(`event_date.eq.${dStr},resepsi_date.eq.${dStr}`)
                .not('status', 'in', '("Dibatalkan","Batal")');

            if (countErr) {
                console.error('[syncDateAvailability] Count error for date:', dStr, countErr);
                continue;
            }

            const count = activeAppts ? activeAppts.length : 0;

            const { data: curAvail, error: fetchErr } = await supabaseClient
                .from('date_availability')
                .select('*')
                .eq('date', dStr)
                .maybeSingle();

            if (fetchErr) {
                console.error('[syncDateAvailability] Fetch error for date:', dStr, fetchErr);
                continue;
            }

            if (curAvail) {
                await supabaseClient
                    .from('date_availability')
                    .update({ slots_booked: count })
                    .eq('date', dStr);
            } else if (count > 0) {
                await supabaseClient
                    .from('date_availability')
                    .insert([{
                        date: dStr,
                        slots_booked: count,
                        max_slots: 2,
                        is_manually_closed: false
                    }]);
            }
        } catch (err) {
            console.warn('[syncDateAvailability] Error processing date:', dStr, err);
        }
    }
};

export const menus = [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'smart-client', label: 'Smart Client Tracker', icon: 'zap' },
    { id: 'appointment', label: 'Appointment', icon: 'calendar-days' },
    { id: 'assign-foto', label: 'Penugasan Editor Foto', icon: 'image' },
    { id: 'assign-video', label: 'Penugasan Editor Video', icon: 'monitor-play' },
    { id: 'assign-foto-studio', label: 'Penugasan Editor Foto Studio', icon: 'camera' },

    // collapsible group header
    { id: 'divisi-makeup-group', label: 'Divisi Lady Makeup', icon: 'wand-sparkles', isGroupHeader: true },
    { id: 'divisi-studio-group', label: 'Div Studio Lapanbelas', icon: 'camera', isGroupHeader: true },
    { id: 'divisi-dekorasi-group', label: 'Divisi Dekorasi', icon: 'flower', isGroupHeader: true },

    { id: 'pricelist', label: 'Pricelist', icon: 'tags' },
    { id: 'addons', label: 'Add-on Layanan', icon: 'package' },
    { id: 'date-available', label: 'Date Available', icon: 'calendar-check' },
    { id: 'voucher', label: 'Voucher', icon: 'ticket' },
    { id: 'sample-embed', label: 'Sample Embed', icon: 'monitor-play' },
    { id: 'setting', label: 'Setting', icon: 'settings' },
    { id: 'users', label: 'Manajemen Akses', icon: 'users' },
    { id: 'manajemen-kru', label: 'Manajemen Kru', icon: 'users' },
    { id: 'serah-terima-feedback', label: 'Serah Terima & Feedback', icon: 'camera' }
];

export const makeupSubmenus = [
    { id: 'overview-makeup', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'appointment-makeup', label: 'Appointment', icon: 'calendar-days' },
    { id: 'jadwal-rias', label: 'Jadwal Rias', icon: 'wand-sparkles' },
    { id: 'date-available-makeup', label: 'Date Available', icon: 'calendar-check' },
    { id: 'pricelist-makeup', label: 'Pricelist', icon: 'tags' },
    { id: 'addons-makeup', label: 'Add-on Layanan', icon: 'package' }
];

export const dekorSubmenus = [
    { id: 'overview-dekor', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'appointment-dekor', label: 'Appointment', icon: 'calendar-days' },
    { id: 'logistik-dekor', label: 'Logistik Dekor', icon: 'folder-pen' },
    { id: 'date-available-dekor', label: 'Date Available', icon: 'calendar-check' },
    { id: 'pricelist-dekor', label: 'Pricelist', icon: 'tags' },
    { id: 'addons-dekor', label: 'Add-on Layanan', icon: 'package' }
];

export const studioSubmenus = [
    { id: 'overview-studio', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'appointment-studio', label: 'Appointment', icon: 'calendar-days' },
    { id: 'queue-studio', label: 'Queue Antrian', icon: 'clock' },
    { id: 'photographer-studio', label: 'Fotografer', icon: 'camera' },
    { id: 'room-studio', label: 'Jadwal Room', icon: 'layout-grid' },
    { id: 'assign-studio', label: 'Penugasan Editor', icon: 'image' },
    { id: 'pricelist-studio', label: 'Pricelist', icon: 'tags' },
    { id: 'addons-studio', label: 'Add-on Layanan', icon: 'package' },
    { id: 'date-available-studio', label: 'Date Available', icon: 'calendar-check' },
    { id: 'voucher-studio', label: 'Voucher', icon: 'ticket' }
];

// Format Rupiah Helper
export const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

// Helper Format Tanggal bebas crash
export const formatDateUI = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const dd = parts[2].padStart(2, '0');
        const mmIdx = parseInt(parts[1], 10) - 1;
        const mm = monthNames[mmIdx] || parts[1];
        const yyyy = parts[0];
        return `${dd}-${mm}-${yyyy}`;
    }
    return dateStr;
};

// Helper Format Hari Lengkap
export const formatSelectedDateUI = (dateStr) => {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const monthIdx = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const dateObj = new Date(year, monthIdx, day);
            const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const weekday = dayNames[dateObj.getDay()] || '';
            const monthName = monthNames[monthIdx] || '';
            return `${weekday}, ${day} ${monthName} ${year}`;
        }
    } catch (e) {
        console.error("Format date error:", e);
    }
    return dateStr;
};

export const getPackageDivision = (pkg) => {
    if (!pkg) return 'lapanbelas.id';
    const cat = pkg.category || '';
    if (cat === 'Studio Lapanbelas' || ['Photo Self', 'Self Photo', 'Photobox', 'Photo Box', 'Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'].includes(cat)) return 'Studio Lapanbelas';
    if (cat === 'Lady Makeup' || cat.startsWith('Lady Makeup:')) return 'Lady Makeup';
    if (cat === 'Lapanbelas Dekorasi' || cat.startsWith('Lapanbelas Dekorasi:')) return 'Lapanbelas Dekorasi';
    if (cat === 'Wedding' || cat === 'lapanbelas.id' || cat === 'lapanelas.id') return 'lapanbelas.id';
    return 'lapanbelas.id';
};

// Global Helper: Parser structured notes fields
export const parseNotesField = (notesStr) => {
    let prewedDate = '';
    let selectedAddonNames = [];
    let voucherCode = '';
    let customFees = [];
    let keterangan = '';

    let div = 'lapanbelas.id';
    let namaPria = ''; let namaWanita = ''; let jamSesi = ''; let roomStudio = '';
    let photographer = ''; let photographer2 = ''; let videographer = ''; let videographer2 = ''; let durasiSesi = ''; let jadwalFitting = '';
    let photographerSession = ''; let videographerSession = '';
    let photographerFee = ''; let photographer2Fee = '';
    let photographerAkad = ''; let photographerAkad2 = ''; let photographerAkadSession = 'Akad Saja';
    let photographerAkadFee = ''; let photographerAkad2Fee = '';
    let photographerResepsi = ''; let photographerResepsi2 = ''; let photographerResepsiSession = 'Resepsi Saja';
    let photographerResepsiFee = ''; let photographerResepsi2Fee = '';
    let videographerAkad = ''; let videographerAkadSession = 'Akad Saja';
    let videographerAkadFee = '';
    let videographerResepsi = ''; let videographerResepsiSession = 'Resepsi Saja';
    let videographerResepsiFee = '';
    let videographerFee = ''; let videographer2Fee = '';
    let jadwalSurvei = ''; let jadwalPemasangan = '';
    let addonPeople = 'Tanpa Tambahan Orang';
    let addonTime = 'Tanpa Tambahan Waktu';
    let addonPrint = 'Tanpa Cetak Foto';
    let addonFrame = 'Tanpa Bingkai Foto';
    let rawHandover = null;

    if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, photographer2, videographer, videographer2, photographerSession, videographerSession, photographerFee, photographer2Fee, photographerAkad, photographerAkad2, photographerAkadSession, photographerAkadFee, photographerAkad2Fee, photographerResepsi, photographerResepsi2, photographerResepsiSession, photographerResepsiFee, photographerResepsi2Fee, videographerAkad, videographerAkadSession, videographerAkadFee, videographerResepsi, videographerResepsiSession, videographerResepsiFee, videographerFee, videographer2Fee, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, addonPeople, addonTime, addonPrint, addonFrame, rawHandover };

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
    const fgFeeMatch = notesStr.match(/\[PHOTOGRAPHER_FEE\]:\s*([^\n]+)/);
    if (fgFeeMatch) photographerFee = fgFeeMatch[1].trim();
    const fg2Match = notesStr.match(/\[PHOTOGRAPHER_2\]:\s*([^\n]+)/);
    if (fg2Match) photographer2 = fg2Match[1].trim();
    const fg2FeeMatch = notesStr.match(/\[PHOTOGRAPHER_2_FEE\]:\s*([^\n]+)/);
    if (fg2FeeMatch) photographer2Fee = fg2FeeMatch[1].trim();
    const photographerSessionMatch = notesStr.match(/\[PHOTOGRAPHER_SESSION\]:\s*([^\n]+)/);
    if (photographerSessionMatch) photographerSession = photographerSessionMatch[1].trim();

    const fgAkadMatch = notesStr.match(/\[PHOTOGRAPHER_AKAD\]:\s*([^\n]+)/);
    if (fgAkadMatch) photographerAkad = fgAkadMatch[1].trim();
    const fgAkadFeeMatch = notesStr.match(/\[PHOTOGRAPHER_AKAD_FEE\]:\s*([^\n]+)/);
    if (fgAkadFeeMatch) photographerAkadFee = fgAkadFeeMatch[1].trim();
    const fgAkad2Match = notesStr.match(/\[PHOTOGRAPHER_AKAD_2\]:\s*([^\n]+)/);
    if (fgAkad2Match) photographerAkad2 = fgAkad2Match[1].trim();
    const fgAkad2FeeMatch = notesStr.match(/\[PHOTOGRAPHER_AKAD_2_FEE\]:\s*([^\n]+)/);
    if (fgAkad2FeeMatch) photographerAkad2Fee = fgAkad2FeeMatch[1].trim();
    const fgAkadSessMatch = notesStr.match(/\[PHOTOGRAPHER_AKAD_SESSION\]:\s*([^\n]+)/);
    if (fgAkadSessMatch) photographerAkadSession = fgAkadSessMatch[1].trim();

    const fgResepsiMatch = notesStr.match(/\[PHOTOGRAPHER_RESEPSI\]:\s*([^\n]+)/);
    if (fgResepsiMatch) photographerResepsi = fgResepsiMatch[1].trim();
    const fgResepsiFeeMatch = notesStr.match(/\[PHOTOGRAPHER_RESEPSI_FEE\]:\s*([^\n]+)/);
    if (fgResepsiFeeMatch) photographerResepsiFee = fgResepsiFeeMatch[1].trim();
    const fgResepsi2Match = notesStr.match(/\[PHOTOGRAPHER_RESEPSI_2\]:\s*([^\n]+)/);
    if (fgResepsi2Match) photographerResepsi2 = fgResepsi2Match[1].trim();
    const fgResepsi2FeeMatch = notesStr.match(/\[PHOTOGRAPHER_RESEPSI_2_FEE\]:\s*([^\n]+)/);
    if (fgResepsi2FeeMatch) photographerResepsi2Fee = fgResepsi2FeeMatch[1].trim();
    const fgResepsiSessMatch = notesStr.match(/\[PHOTOGRAPHER_RESEPSI_SESSION\]:\s*([^\n]+)/);
    if (fgResepsiSessMatch) photographerResepsiSession = fgResepsiSessMatch[1].trim();

    const videographerMatch = notesStr.match(/\[VIDEOGRAPHER\]:\s*([^\n]+)/);
    if (videographerMatch) videographer = videographerMatch[1].trim();
    const vgFeeMatch = notesStr.match(/\[VIDEOGRAPHER_FEE\]:\s*([^\n]+)/);
    if (vgFeeMatch) videographerFee = vgFeeMatch[1].trim();
    const vg2Match = notesStr.match(/\[VIDEOGRAPHER_2\]:\s*([^\n]+)/);
    if (vg2Match) videographer2 = vg2Match[1].trim();
    const vg2FeeMatch = notesStr.match(/\[VIDEOGRAPHER_2_FEE\]:\s*([^\n]+)/);
    if (vg2FeeMatch) videographer2Fee = vg2FeeMatch[1].trim();
    const videographerSessionMatch = notesStr.match(/\[VIDEOGRAPHER_SESSION\]:\s*([^\n]+)/);
    if (videographerSessionMatch) videographerSession = videographerSessionMatch[1].trim();

    const vgAkadMatch = notesStr.match(/\[VIDEOGRAPHER_AKAD\]:\s*([^\n]+)/);
    if (vgAkadMatch) videographerAkad = vgAkadMatch[1].trim();
    const vgAkadFeeMatch = notesStr.match(/\[VIDEOGRAPHER_AKAD_FEE\]:\s*([^\n]+)/);
    if (vgAkadFeeMatch) videographerAkadFee = vgAkadFeeMatch[1].trim();
    const vgAkadSessMatch = notesStr.match(/\[VIDEOGRAPHER_AKAD_SESSION\]:\s*([^\n]+)/);
    if (vgAkadSessMatch) videographerAkadSession = vgAkadSessMatch[1].trim();

    const vgResepsiMatch = notesStr.match(/\[VIDEOGRAPHER_RESEPSI\]:\s*([^\n]+)/);
    if (vgResepsiMatch) videographerResepsi = vgResepsiMatch[1].trim();
    const vgResepsiFeeMatch = notesStr.match(/\[VIDEOGRAPHER_RESEPSI_FEE\]:\s*([^\n]+)/);
    if (vgResepsiFeeMatch) videographerResepsiFee = vgResepsiFeeMatch[1].trim();
    const vgResepsiSessMatch = notesStr.match(/\[VIDEOGRAPHER_RESEPSI_SESSION\]:\s*([^\n]+)/);
    if (vgResepsiSessMatch) videographerResepsiSession = vgResepsiSessMatch[1].trim();

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
            .replace(/\[PHOTOGRAPHER_SESSION\]:.*?\n*/g, '')
            .replace(/\[VIDEOGRAPHER\]:.*?\n*/g, '')
            .replace(/\[VIDEOGRAPHER_SESSION\]:.*?\n*/g, '')
            .replace(/\[PHOTOGRAPHER_AKAD\]:.*?\n*/g, '')
            .replace(/\[PHOTOGRAPHER_AKAD_SESSION\]:.*?\n*/g, '')
            .replace(/\[PHOTOGRAPHER_RESEPSI\]:.*?\n*/g, '')
            .replace(/\[PHOTOGRAPHER_RESEPSI_SESSION\]:.*?\n*/g, '')
            .replace(/\[VIDEOGRAPHER_AKAD\]:.*?\n*/g, '')
            .replace(/\[VIDEOGRAPHER_AKAD_SESSION\]:.*?\n*/g, '')
            .replace(/\[VIDEOGRAPHER_RESEPSI\]:.*?\n*/g, '')
            .replace(/\[VIDEOGRAPHER_RESEPSI_SESSION\]:.*?\n*/g, '')
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

    return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, videographer, photographerSession, videographerSession, photographerAkad, photographerAkadSession, photographerResepsi, photographerResepsiSession, videographerAkad, videographerAkadSession, videographerResepsi, videographerResepsiSession, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, addonPeople, addonTime, addonPrint, addonFrame, rawHandover };
};

export const checkOrderPhotoVideoAddons = (order) => {
    let hasPhotoAddon = false;
    let hasVideoAddon = false;

    const photoKeywords = ['foto', 'photo', 'album', 'cetak', 'bingkai', 'frame', 'canvas', 'flashdisk', 'softfile'];
    const videoKeywords = ['video', 'cinematic', 'cinema', 'teaser', 'dokumentasi', 'liputan video', 'videografer', 'reels', 'tiktok'];

    const testText = (text) => {
        if (!text) return;
        const lower = String(text).toLowerCase();
        if (photoKeywords.some(k => lower.includes(k))) hasPhotoAddon = true;
        if (videoKeywords.some(k => lower.includes(k))) hasVideoAddon = true;
    };

    // 1. Cek invoice_addons (array of JSON objects)
    if (order?.invoice_addons) {
        let addons = order.invoice_addons;
        if (typeof addons === 'string') {
            try { addons = JSON.parse(addons); } catch (e) { }
        }
        if (Array.isArray(addons)) {
            addons.forEach(a => {
                testText(a?.name || a?.label || '');
            });
        }
    }

    // 2. Cek seksi [LAYANAN TAMBAHAN / ADD-ON] di additional_notes
    const notesStr = order?.additional_notes || '';
    const addonSectionMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/i);
    if (addonSectionMatch && addonSectionMatch[1]) {
        testText(addonSectionMatch[1]);
    }

    return { hasPhotoAddon, hasVideoAddon };
};

export const getOrderDivisions = (order, pkg) => {
    const divisions = [];
    const pkgNameLower = (pkg?.title || order?.package_name || '').toLowerCase();
    const pkgCategoryLower = (pkg?.category || '').toLowerCase();
    const pkgDescLower = (pkg?.description || '').toLowerCase();
    const notesLower = (order?.additional_notes || '').toLowerCase();

    // Deteksi add-on foto atau video jika ada
    const { hasPhotoAddon, hasVideoAddon } = checkOrderPhotoVideoAddons(order);

    // Deteksi paket bundling (mengandung foto/video, makeup, dan dekorasi)
    const isBundling = pkgNameLower.includes('bundling') || pkgCategoryLower.includes('bundling') || pkgDescLower.includes('bundling') || notesLower.includes('bundling');

    // Deteksi Studio Lapanbelas
    const isStudio = pkgCategoryLower.includes('studio') || pkgNameLower.includes('studio') ||
        ['wisuda', 'couple', 'group', 'family', 'pas photo'].some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k)) ||
        notesLower.includes('[room studio]') || notesLower.includes('[divisi]: studio lapanbelas');

    if (isStudio) {
        divisions.push('Studio Lapanbelas');
    }

    // Deteksi Lady Makeup
    const makeupKeywords = ['makeup', 'rias', 'mua'];
    const isMakeup = notesLower.includes('[divisi]: lady makeup') ||
        pkgCategoryLower.includes('lady makeup') ||
        pkgCategoryLower.startsWith('lady makeup:') ||
        makeupKeywords.some(k => pkgNameLower.includes(k) || pkgCategoryLower.includes(k));

    if (isMakeup) {
        divisions.push('Lady Makeup');
    }

    // Deteksi Lapanbelas Dekorasi
    const decorKeywords = ['dekor', 'pelaminan', 'tenda'];
    const isDecor = notesLower.includes('[divisi]: lapanbelas dekorasi') ||
        pkgCategoryLower.includes('lapanbelas dekorasi') ||
        pkgCategoryLower.startsWith('lapanbelas dekorasi:') ||
        decorKeywords.some(k => pkgNameLower.includes(k) || pkgCategoryLower.includes(k));

    if (isDecor) {
        divisions.push('Lapanbelas Dekorasi');
    }

    // Paket Bundling otomatis masuk ke semua 3 divisi utama
    if (isBundling) {
        if (!divisions.includes('lapanbelas.id')) divisions.push('lapanbelas.id');
        if (!divisions.includes('Lady Makeup')) divisions.push('Lady Makeup');
        if (!divisions.includes('Lapanbelas Dekorasi')) divisions.push('Lapanbelas Dekorasi');
    } else {
        // Jika paket Murni Lady Makeup atau Lapanbelas Dekorasi:
        // HANYA masukkan divisi lapanbelas.id jika client memesan Add-on Foto atau Video!
        const isPureMakeupOrDecor = (isMakeup || isDecor) && !isStudio;

        if (isPureMakeupOrDecor) {
            if (hasPhotoAddon || hasVideoAddon) {
                if (!divisions.includes('lapanbelas.id')) {
                    divisions.push('lapanbelas.id');
                }
            }
        } else if (!isStudio) {
            // Paket Wedding / Foto / Video reguler (Divisi lapanbelas.id)
            const weddingKeywords = ['wedding', 'prewedding', 'engagement', 'photo', 'foto', 'video', 'dokumentasi', 'cinematic'];
            const isWedding = weddingKeywords.some(k => pkgCategoryLower.includes(k) || pkgNameLower.includes(k)) ||
                notesLower.includes('[divisi]: lapanbelas.id') ||
                pkgCategoryLower === 'wedding' ||
                pkgCategoryLower === 'lapanbelas.id';

            if (isWedding) {
                if (!divisions.includes('lapanbelas.id')) divisions.push('lapanbelas.id');
            }
        }
    }

    if (divisions.length === 0) {
        divisions.push(getPackageDivision(pkg));
    }

    return divisions;
};

// Helper: cek apakah roleString mengandung targetRole (support multi-role comma-separated)
export const checkRole = (roleString, targetRole) => {
    if (!roleString) return false;
    const roles = roleString.split(',').map(r => r.trim());
    return roles.includes(targetRole);
};

// Helper: normalisasi nomor HP format Indonesia (08... -> 628...)
export const normalizePhoneID = (phone) => {
    if (!phone) return '';
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
};

// Default Slideshow Banners jika belum diset di Pengaturan
export const DEFAULT_SLIDESHOW = [
    {
        id: 1,
        title: "Premium Wedding Capture",
        subtitle: "Dapatkan diskon Rp 1.000.000 untuk booking bulan ini!",
        image: "/logo.png",
        badge: "PROMO"
    },
    {
        id: 2,
        title: "New Modern Photo Studio",
        subtitle: "Wisuda, Group, dan Couple Studio dengan Background Premium",
        image: "/logo.png",
        badge: "STUDIO"
    },
    {
        id: 3,
        title: "Elegant Wedding Decoration",
        subtitle: "Wujudkan pelaminan impian dengan sentuhan dekorasi berkelas",
        image: "/logo.png",
        badge: "DEKORASI"
    }
];

export const ADMIN_MAIN_CATEGORIES = {
    WEDDING: "lapanbelas.id",
    PHOTO_STUDIO: "Photo Studio",
    MAKEUP: "Makeup",
    DEKORASI: "Dekorasi"
};

export const getAdminMainCategory = (cat) => {
    if (!cat) return ADMIN_MAIN_CATEGORIES.PHOTO_STUDIO;
    const lower = cat.trim().toLowerCase();
    if (lower.includes("dekorasi") || lower.includes("dekor")) return ADMIN_MAIN_CATEGORIES.DEKORASI;
    if (lower.includes("makeup") || lower.includes("mua") || lower.includes("makeup artist")) return ADMIN_MAIN_CATEGORIES.MAKEUP;
    if (["wedding", "pre-wedding", "engagement", "tasyakuran"].some(k => lower.includes(k))) return ADMIN_MAIN_CATEGORIES.WEDDING;
    return ADMIN_MAIN_CATEGORIES.PHOTO_STUDIO;
};

// ==========================================
// CREW RATES PER PERSON HELPER (FULL CRUD)
// ==========================================
export const DEFAULT_CREW_RATE_ITEMS = [
    { id: 'full_day', key: 'full_day', label: 'Full Day (Akad + Resepsi 1 Hari)', val: 1500000, icon: '⚡' },
    { id: 'akad_solo', key: 'akad_solo', label: 'Akad Saja (Lead / Solo)', val: 750000, icon: '💍' },
    { id: 'akad_backup', key: 'akad_backup', label: 'Akad Saja (Backup / Second)', val: 450000, icon: '💍' },
    { id: 'resepsi_solo', key: 'resepsi_solo', label: 'Resepsi Saja (Lead / Solo)', val: 750000, icon: '🎉' },
    { id: 'resepsi_backup', key: 'resepsi_backup', label: 'Resepsi Saja (Backup / Second)', val: 450000, icon: '🎉' },
    { id: 'engagement', key: 'engagement', label: 'Engagement / Lamaran', val: 350000, icon: '💐' },
    { id: 'prewedding', key: 'prewedding', label: 'Sesi Prewedding (Lead)', val: 500000, icon: '👗' },
    { id: 'prewedding_backup', key: 'prewedding_backup', label: 'Sesi Prewedding (Backup / Second)', val: 300000, icon: '👗' },
    { id: 'wisuda', key: 'wisuda', label: 'Wisuda / Event Corporate', val: 350000, icon: '🎓' },
    { id: 'studio', key: 'studio', label: 'Studio Photoshoot', val: 250000, icon: '🏢' }
];

export const parseCrewRates = (notesStr) => {
    if (!notesStr) return { items: [...DEFAULT_CREW_RATE_ITEMS] };
    const match = notesStr.match(/\[RATES_JSON\]:\s*([^\n]+)/);
    if (match) {
        try {
            const parsed = JSON.parse(match[1]);
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                return parsed;
            }
            // Older format compatibility
            const items = DEFAULT_CREW_RATE_ITEMS.map(def => ({
                ...def,
                val: (parsed[def.key] !== undefined && parsed[def.key] !== null) ? Number(parsed[def.key]) : def.val
            }));
            if (Array.isArray(parsed.customRates)) {
                parsed.customRates.forEach(cr => {
                    if (cr && cr.label) {
                        items.push({
                            id: cr.id || String(Date.now() + Math.random()),
                            key: 'custom',
                            label: cr.label,
                            val: Number(cr.val) || 0,
                            icon: '✨'
                        });
                    }
                });
            }
            return { ...parsed, items };
        } catch (e) {}
    }
    return { items: [...DEFAULT_CREW_RATE_ITEMS] };
};

export const serializeCrewRates = (rawNotes, ratesObj) => {
    const stripped = (rawNotes || '').replace(/\[RATES_JSON\]:[^\n]*/gi, '').trim();
    const items = Array.isArray(ratesObj?.items) ? ratesObj.items : DEFAULT_CREW_RATE_ITEMS;
    
    const payload = { items };
    items.forEach(it => {
        if (it.key && it.key !== 'custom') {
            payload[it.key] = it.val;
        }
    });

    const jsonStr = JSON.stringify(payload);
    return `${stripped}\n[RATES_JSON]: ${jsonStr}`.trim();
};

export const getRateForSession = (ratesObj, session, isSecondShooter = false) => {
    if (!ratesObj) return 0;
    const s = (session || '').toLowerCase().trim();
    const items = Array.isArray(ratesObj.items) ? ratesObj.items : [];

    // 1. Label match
    if (items.length > 0) {
        const found = items.find(it => it.label && (s.includes(it.label.toLowerCase()) || it.label.toLowerCase().includes(s)));
        if (found && found.val) return found.val;
    }

    // 2. Keyword fallback
    if (isSecondShooter) {
        if (s.includes('prewed')) {
            const pb = items.find(it => it.key === 'prewedding_backup' || (it.label.toLowerCase().includes('prewed') && it.label.toLowerCase().includes('backup')));
            if (pb) return pb.val;
            return 300000;
        }
        if (s.includes('resepsi')) {
            const rb = items.find(it => it.key === 'resepsi_backup' || (it.label.toLowerCase().includes('resepsi') && it.label.toLowerCase().includes('backup')));
            if (rb) return rb.val;
            return 450000;
        }
        const ab = items.find(it => it.key === 'akad_backup' || it.label.toLowerCase().includes('backup'));
        if (ab) return ab.val;
        return 450000;
    }

    if (s.includes('engagement') || s.includes('lamaran') || s.includes('tunangan')) {
        const eng = items.find(it => it.key === 'engagement' || it.label.toLowerCase().includes('engagement') || it.label.toLowerCase().includes('lamaran'));
        if (eng) return eng.val;
        return 350000;
    }
    if (s.includes('prewed')) {
        const pw = items.find(it => (it.key === 'prewedding' || it.label.toLowerCase().includes('prewed')) && !it.label.toLowerCase().includes('backup'));
        if (pw) return pw.val;
        return 500000;
    }
    if (s.includes('wisuda')) {
        const ws = items.find(it => it.key === 'wisuda' || it.label.toLowerCase().includes('wisuda'));
        if (ws) return ws.val;
        return 350000;
    }
    if (s.includes('studio')) {
        const st = items.find(it => it.key === 'studio' || it.label.toLowerCase().includes('studio'));
        if (st) return st.val;
        return 250000;
    }
    if (s.includes('akad')) {
        const ak = items.find(it => (it.key === 'akad_solo' || it.label.toLowerCase().includes('akad')) && !it.label.toLowerCase().includes('backup'));
        if (ak) return ak.val;
        return 750000;
    }
    if (s.includes('resepsi')) {
        const rs = items.find(it => (it.key === 'resepsi_solo' || it.label.toLowerCase().includes('resepsi')) && !it.label.toLowerCase().includes('backup'));
        if (rs) return rs.val;
        return 750000;
    }
    const fd = items.find(it => it.key === 'full_day' || it.label.toLowerCase().includes('full day'));
    if (fd) return fd.val;
    return 1500000;
};

// ============================================================
// STANDAR MOMEN & CHECKLIST SOP KRU
// ============================================================
export const SOP_MOMENTS = [
    { id: 'all', label: 'Umum (Semua Acara)', icon: '🌐' },
    { id: 'akad', label: 'Akad Nikah', icon: '💍' },
    { id: 'resepsi', label: 'Resepsi', icon: '🎉' },
    { id: 'tasyakuran', label: 'Tasyakuran / Aqiqah', icon: '🤲' },
    { id: 'engagement', label: 'Lamaran / Engagement', icon: '💐' },
    { id: 'prewedding', label: 'Prewedding', icon: '📸' },
    { id: 'wisuda', label: 'Wisuda', icon: '🎓' },
    { id: 'studio', label: 'Studio Photoshoot', icon: '🏢' }
];

export const detectJobMoments = (job = {}) => {
    const session = (job.session || '').toLowerCase().trim();
    const sessionKey = (job.session_key || job.sessionKey || '').toLowerCase().trim();
    const pkg = (job.package_name || '').toLowerCase().trim();
    const category = `${job.category || ''} ${job.job_category || ''} ${job.notes || ''}`.toLowerCase();
    const moments = new Set();

    // 1. PRIORITAS UTAMA: OVERRIDE SESI PENUGASAN KRU SECARA SPESIFIK
    // Jika kru hanya bertugas di Resepsi Saja (bukan Full Day / Akad)
    const isResepsiOnly = (sessionKey === 'resepsi' || session.includes('resepsi')) && !session.includes('akad') && !session.includes('full');
    if (isResepsiOnly) {
        moments.add('resepsi');
        return Array.from(moments);
    }

    // Jika kru hanya bertugas di Akad Saja (bukan Full Day / Resepsi)
    const isAkadOnly = (sessionKey === 'akad' || session.includes('akad')) && !session.includes('resepsi') && !session.includes('full');
    if (isAkadOnly) {
        moments.add('akad');
        return Array.from(moments);
    }

    // 2. SESI FULL DAY EKSPLISIT (Akad + Resepsi)
    if (
        sessionKey === 'full' || 
        session.includes('full') || 
        session.includes('akad + resepsi') || 
        session.includes('akad & resepsi') || 
        session.includes('akad dan resepsi')
    ) {
        moments.add('akad');
        moments.add('resepsi');
        return Array.from(moments);
    }

    // 3. TIPE ACARA KHUSUS / NON-WEDDING
    if (session.includes('prewed') || pkg.includes('prewed') || category.includes('prewed')) moments.add('prewedding');
    if (session.includes('engagement') || session.includes('lamaran') || session.includes('tunangan') || pkg.includes('engagement') || pkg.includes('lamaran') || pkg.includes('tunangan') || category.includes('lamaran') || category.includes('engagement')) moments.add('engagement');
    if (session.includes('tasyakuran') || session.includes('aqiqah') || pkg.includes('tasyakuran') || pkg.includes('aqiqah') || category.includes('tasyakuran') || category.includes('aqiqah')) moments.add('tasyakuran');
    if (session.includes('wisuda') || session.includes('graduation') || pkg.includes('wisuda') || category.includes('wisuda')) moments.add('wisuda');
    if (session.includes('studio') || pkg.includes('studio') || category.includes('studio')) moments.add('studio');

    if (moments.size > 0) return Array.from(moments);

    // 4. FALLBACK BERDASARKAN PAKET & KATEGORI (Default Wedding = Akad + Resepsi)
    if (
        pkg.includes('silver') || 
        pkg.includes('gold') || 
        pkg.includes('platinum') || 
        pkg.includes('royal') || 
        pkg.includes('bravo') || 
        pkg.includes('centro') || 
        pkg.includes('delta') || 
        pkg.includes('wedding') || 
        category.includes('wedding')
    ) {
        moments.add('akad');
        moments.add('resepsi');
    } else {
        moments.add('akad');
    }

    return Array.from(moments);
};

export const filterSopTemplatesForJob = (templates = [], job = {}) => {
    const jobMoments = detectJobMoments(job);
    const jobRole = (job.role || '').toLowerCase();
    
    // 1. Filter master templates matching moment and role
    const filteredMaster = (templates || []).filter(t => {
        const itemMoment = t.moment || 'all';
        const momentMatch = itemMoment === 'all' || jobMoments.includes(itemMoment);
        if (!momentMatch) return false;

        const itemRole = (t.role || 'all').toLowerCase();
        if (itemRole === 'all') return true;
        if (itemRole === 'fotografer' || itemRole === 'fg') return jobRole.includes('foto') || jobRole.includes('fg');
        if (itemRole === 'videografer' || itemRole === 'vg') return jobRole.includes('video') || jobRole.includes('vg');
        return true;
    });

    // 2. Append custom job-specific SOP items / client footage requests
    const customItems = Array.isArray(job.custom_sop_items) ? job.custom_sop_items : [];
    
    return [...filteredMaster, ...customItems];
};

/**
 * Mengambil daftar SOP efektif yang sudah direkonsiliasi dengan checklist tersimpan
 * Menjamin hanya item yang relevan untuk sesi penugasan kru yang dikembalikan,
 * dengan status checked dan checked_at yang presisi.
 */
export const getEffectiveJobSopItems = (templates = [], job = {}) => {
    const relevant = filterSopTemplatesForJob(templates, job);
    const saved = job?.sop_checklist;
    return relevant.map(m => {
        let isChecked = false;
        let checkedAt = null;
        if (Array.isArray(saved)) {
            const found = saved.find(it => it && it.id === m.id);
            if (found) {
                isChecked = !!found.checked;
                checkedAt = found.checked_at || null;
            }
        } else if (saved && typeof saved === 'object') {
            isChecked = !!saved[m.id];
        }
        return {
            ...m,
            checked: isChecked,
            checked_at: checkedAt
        };
    });
};

export const PKWT_ARTICLES = [
    {
        number: 'PASAL 1',
        title: 'JABATAN, PENEMPATAN & RUANG LINGKUP PENUGASAN',
        content: 'Pihak Pertama mempekerjakan Pihak Kedua dengan jabatan Photographer / Videografer pada PT STUDIO LAPAN BELAS. Pihak Kedua dapat ditugaskan pada studio foto, lokasi wedding, akad nikah, resepsi, post wedding, outdoor, corporate event, serta project resmi perusahaan lainnya baik sebagai Lead/Solo (utama) maupun Backup (pendamping) sesuai arahan operasional perusahaan.'
    },
    {
        number: 'PASAL 2',
        title: 'JANGKA WAKTU PERJANJIAN & MASA ORIENTASI',
        content: 'Perjanjian Kerja Waktu Tertentu (PKWT) ini berlaku selama 2 (dua) tahun (atau 1 tahun khusus divisi Studio) terhitung sejak ditandatangani. Bagi personil baru, berlaku masa orientasi dan training selama 1 (satu) bulan untuk penyesuaian SOP, kualitas, dan workflow, dengan kompensasi sebesar 1/4 (seperempat) dari tarif project berlaku.'
    },
    {
        number: 'PASAL 3',
        title: 'KEDISIPLINAN CALL TIME & KEHADIRAN (STANDBY)',
        content: 'Pihak Kedua wajib hadir standby di lokasi acara minimal 45–60 menit sebelum call time / acara dimulai, mengikuti briefing teknis, dan dilarang meninggalkan lokasi penugasan sebelum seluruh prosesi selesai serta mendapatkan izin dari Lead Photographer / Manajemen.'
    },
    {
        number: 'PASAL 4',
        title: 'STANDAR MUTU TEKNIS & PERALATAN (EQUIPMENT)',
        content: 'Pihak Kedua wajib mematuhi standar teknis SOP Lapanbelas (wajib dual-slot memory card recording, baterai cadangan penuh, mic audio wireless, dan menyelesaikan seluruh daftar ambilan wajib/Shot List). Seluruh aset peralatan kantor wajib dirawat dengan penuh tanggung jawab dan dilarang dipinjamkan, disewakan, atau digunakan untuk kepentingan pribadi tanpa izin tertulis perusahaan.'
    },
    {
        number: 'PASAL 5',
        title: 'HAK CIPTA & KERAHASIAAN FILE MENTAH (RAW)',
        content: 'Seluruh file foto RAW, rekaman footage video, dan data identitas klien adalah aset eksklusif milik PT STUDIO LAPAN BELAS dan Klien. Pihak Kedua dilarang menghapus file tanpa izin, mempublikasikan file ke media sosial pribadi tanpa persetujuan tertulis perusahaan, memperjualbelikan file, maupun membocorkan data pribadi klien kepada pihak manapun.'
    },
    {
        number: 'PASAL 6',
        title: 'INTEGRITAS BISNIS & ANTI-BAJAK KLIEN (NON-COMPETE)',
        content: 'Pihak Kedua dilarang keras menawarkan jasa fotografi/videografi mandiri di luar perusahaan kepada klien yang didapat melalui PT STUDIO LAPAN BELAS, membagikan nomor pribadi untuk transaksi terselubung, mengalihkan klien ke pihak luar, maupun meminta/menerima komisi/tips tambahan langsung dari klien tanpa izin tertulis perusahaan.'
    },
    {
        number: 'PASAL 7',
        title: 'PENYETORAN FILE & SYARAT PENCAIRAN HONOR',
        content: 'Pencairan fee/honorarium project diproses setelah Pihak Kedua menuntaskan 100% checklist SOP dokumentasi dan menyetorkan seluruh file mentah utuh (backup ke PC Kantor / link Google Drive) dalam tenggat waktu maksimal 1x24 jam pasca acara selesai.'
    },
    {
        number: 'PASAL 8',
        title: 'SANKSI KHUSUS & GANTI RUGI OPERASIONAL',
        content: 'Pelanggaran terhadap perjanjian kerja ini dikenakan tindakan disiplin dan ganti rugi operasional tegas:',
        subpoints: [
            {
                label: 'a. Mangkir / No-Show Hari-H:',
                text: 'Kru yang tidak hadir atau membatalkan penugasan sepihak tanpa alasan force majeure terverifikasi wajib menanggung 100% biaya sewa fotografer pengganti darurat (emergency replacement fee) serta dikenakan pemutusan hubungan kerja seketika.'
            },
            {
                label: 'b. Kehilangan / Kerusakan File Dokumentasi:',
                text: 'Kelalaian yang menyebabkan file momen klien hilang, terformat, atau rusak berakibat penahanan 100% honor project, kewajiban menanggung biaya recovery data lab penyelamatan, serta kewajiban menanggung beban ganti rugi / refund klien secara proporsional.'
            },
            {
                label: 'c. Pembajakan Klien / Transaksi Gelap:',
                text: 'Kru yang terbukti bertransaksi pribadi di belakang manajemen dengan klien kantor dikenakan denda penalti komersial sebesar 1x hingga 2x dari total nilai paket klien, serta Pemecatan Tidak Dengan Hormat (PHK).'
            },
            {
                label: 'd. Keterlambatan Hadir (Late Standby):',
                text: 'Keterlambatan tanpa konfirmasi resmi minimal H-2 jam dikenakan pemotongan fee penugasan sebesar 25%–50%. Apabila keterlambatan menyebabkan prosesi sakral terlewat tanpa foto, dikenakan Surat Peringatan Keras (SP-3 Langsung).'
            },
            {
                label: 'e. Keterlambatan Setor File:',
                text: 'Penyetoran file melebihi batas waktu 1x24 jam tanpa izin tertulis dikenakan denda pemotongan fee sebesar Rp 50.000 per hari keterlambatan hingga file diterima utuh.'
            },
            {
                label: 'f. Kerusakan / Kehilangan Aset Alat Kantor:',
                text: 'Kerusakan atau hilangnya equipment milik perusahaan akibat kelalaian penggunaan wajib diganti penuh sesuai biaya perbaikan resmi service center atau penggantian unit senilai aset tersebut.'
            }
        ]
    },
    {
        number: 'PASAL 9',
        title: 'PENGUNDURAN DIRI & PENGAKHIRAN KERJA',
        content: 'Pihak Kedua yang hendak mengakhiri hubungan kerja sebelum masa kontrak berakhir wajib menyampaikan surat pemberitahuan tertulis minimal 30 (tiga puluh) hari sebelumnya, menuntaskan seluruh penugasan project yang sudah terjadwal, dan melakukan serah terima seluruh aset alat, data, serta file perusahaan.'
    },
    {
        number: 'PASAL 10',
        title: 'KEKUATAN HUKUM & TANDA TANGAN ELEKTRONIK',
        content: 'Perjanjian ini dibuat dalam keadaan sadar dan sehat tanpa paksaan. Penandatanganan secara digital/elektronik melalui sistem Portal Kru memiliki kekuatan pembuktian hukum yang sah dan mengikat Para Pihak sesuai ketentuan Undang-Undang Informasi dan Transaksi Elektronik (UU ITE) Republik Indonesia.'
    }
];

export const FREELANCE_PARTNERSHIP_ARTICLES = [
    {
        number: 'PASAL 1',
        title: 'STATUS KEMITRAAN & SISTEM PENUGASAN LEPAS',
        content: 'Pihak Pertama menunjuk Pihak Kedua sebagai Mitra Dokumentasi Lepas (Freelance Partner) atas dasar penugasan mandiri (On-Call / On-Job Basis). Hubungan hukum antara Para Pihak adalah murni kemitraan penyedia jasa independen dan bukan merupakan hubungan ketenagakerjaan atau karyawan tetap PT STUDIO LAPAN BELAS.'
    },
    {
        number: 'PASAL 2',
        title: 'KOMITMEN PENUGASAN & FLEKSIBILITAS PEKERJAAN',
        content: 'Pihak Kedua berhak menerima atau menolak penugasan yang ditawarkan. Namun demikian, apabila Pihak Kedua telah menekan tombol konfirmasi ("Terima Tugas") pada sistem atau menyepakati jadwal penugasan acara tertentu, maka Pihak Kedua terikat komitmen penuh untuk melaksanakan tugas tersebut hingga tuntas dan dilarang membatalkan sepihak tanpa alasan force majeure terverifikasi.'
    },
    {
        number: 'PASAL 3',
        title: 'PEKERJAAN DI LUAR & BENTROK JADWAL',
        content: 'Sebagai mitra lepas, Pihak Kedua berhak menerima pekerjaan dari pihak ketiga di luar PT STUDIO LAPAN BELAS, dengan syarat jadwal pekerjaan luar tersebut TIDAK bentrok dengan penugasan acara Lapanbelas ID yang telah disepakati sebelumnya, serta tidak menggunakan aset/seragam/atribut resmi studio untuk pekerjaan non-resmi.'
    },
    {
        number: 'PASAL 4',
        title: 'KEDISIPLINAN CALL TIME & STANDBY DI LOKASI',
        content: 'Pihak Kedua wajib hadir di lokasi acara minimal 45–60 menit sebelum call time atau acara dimulai untuk briefing dan koordinasi teknis. Pihak Kedua dilarang meninggalkan lokasi acara sebelum rangkaian tugas selesai dan diizinkan oleh Lead Photographer / Tim Manajemen Lapangan.'
    },
    {
        number: 'PASAL 5',
        title: 'STANDAR MUTU TEKNIS & PERALATAN MANDIRI',
        content: 'Pihak Kedua wajib membawa perlengkapan dokumentasi standar profesional (wajib kamera berkemampuan Dual-Slot SD Card recording secara simultan, baterai cadangan terisi penuh, memory card berkapasitas cukup, dan audio/lighting yang memadai). Pihak Kedua wajib mematuhi seluruh daftar ambilan wajib (Shot List) sesuai SOP Lapanbelas ID.'
    },
    {
        number: 'PASAL 6',
        title: 'HAK CIPTA & KERAHASIAAN FILE MENTAH (RAW)',
        content: 'Seluruh hasil karya dokumentasi foto dan rekaman video yang dihasilkan dalam penugasan resmi adalah hak milik eksklusif PT STUDIO LAPAN BELAS dan Klien. Pihak Kedua dilarang menghapus file tanpa izin, mengunggah materi mentah ke media sosial pribadi tanpa persetujuan kantor, menjual, maupun membocorkan identitas/kontak klien kepada pihak ketiga.'
    },
    {
        number: 'PASAL 7',
        title: 'INTEGRITAS BISNIS & ANTI-BAJAK KLIEN (NON-COMPETE)',
        content: 'Pihak Kedua dilarang keras membagikan kontak/nomor pribadi kepada klien, menawarkan jasa foto/video pribadi di luar manajemen kepada klien studio, mengalihkan klien ke pihak luar, atau meminta/menerima pembayaran langsung dari klien tanpa persetujuan tertulis manajemen studio.'
    },
    {
        number: 'PASAL 8',
        title: 'PENYETORAN FILE & SYARAT PENCAIRAN HONOR',
        content: 'Honorarium/fee freelance dibayarkan penuh sesuai tarif penugasan yang disepakati, dan baru dapat dicairkan setelah Pihak Kedua menuntaskan 100% checklist SOP serta menyetorkan file mentah utuh (backup ke PC Kantor / link Google Drive) maksimal 1x24 jam pasca acara selesai.'
    },
    {
        number: 'PASAL 9',
        title: 'SANKSI TEGAS & GANTI RUGI OPERASIONAL MITRA',
        content: 'Pelanggaran terhadap komitmen kemitraan ini berakibat sanksi tegas sebagai berikut:',
        subpoints: [
            {
                label: 'a. Mangkir / No-Show Hari-H:',
                text: 'Mangkir atau batal mendadak pada penugasan yang telah diterima mewajibkan Pihak Kedua menanggung 100% biaya sewa kru pengganti darurat (emergency replacement fee) serta pemutusan status kemitraan seketika.'
            },
            {
                label: 'b. Hilang / Rusak File Dokumentasi:',
                text: 'Kelalaian yang menyebabkan file hilang atau memori rusak berakibat penahanan 100% honor, kewajiban menanggung biaya recovery data lab penyelamatan, serta kewajiban menanggung kompensasi refund klien secara proporsional.'
            },
            {
                label: 'c. Pembajakan Klien / Transaksi Gelap:',
                text: 'Transaksi pribadi terselubung dengan klien kantor dikenakan denda ganti rugi komersial sebesar 1x hingga 2x total nilai paket klien dan pemutusan kemitraan (Blacklist permanen).'
            },
            {
                label: 'd. Keterlambatan Hadir (Late Standby):',
                text: 'Terlambat tanpa info resmi H-2 jam dikenakan pemotongan fee penugasan 25%–50%. Jika momen sakral terlewat, status mitra langsung dibekukan.'
            },
            {
                label: 'e. Keterlambatan Setor File:',
                text: 'Setor file melebihi batas waktu 1x24 jam tanpa izin tertulis dikenakan potongan denda sebesar Rp 50.000 per hari keterlambatan.'
            },
            {
                label: 'f. Penggunaan Aset Kantor (Jika Ada):',
                text: 'Apabila menggunakan peralatan milik kantor, kerusakan/kehilangan karena kelalaian wajib diganti sesuai biaya servis resmi atau penggantian unit.'
            }
        ]
    },
    {
        number: 'PASAL 10',
        title: 'PENGAKHIRAN KEMITRAAN & LEGALITAS DIGITAL',
        content: 'Para Pihak dapat mengakhiri kemitraan sewaktu-waktu dengan pemberitahuan tertulis tanpa denda selama tidak ada jadwal penugasan aktif yang tertinggal. Perjanjian kemitraan ini disepakati dan ditandatangani secara digital melalui sistem Portal Kru dengan kekuatan hukum sah dan mengikat Para Pihak sesuai UU ITE Republik Indonesia.'
    }
];

export const getContractArticlesForCrew = (crewType) => {
    return crewType === 'staff' ? PKWT_ARTICLES : FREELANCE_PARTNERSHIP_ARTICLES;
};

export const getContractDetailsForCrew = (crewType, contractType, durationYears = 2) => {
    const isStaff = crewType === 'staff';
    return {
        isStaff,
        docTitle: isStaff 
            ? 'SURAT PERJANJIAN KERJA WAKTU TERTENTU (PKWT)' 
            : 'SURAT PERJANJIAN KEMITRAAN JASA DOKUMENTASI (FREELANCE)',
        subTitle: isStaff 
            ? 'PT STUDIO LAPAN BELAS — KONTRAK KERJA KARYAWAN' 
            : 'PT STUDIO LAPAN BELAS & LAPANBELAS ID — KEMITRAAN DOKUMENTASI LEPAS',
        typeLabel: isStaff 
            ? (contractType === 'studio' ? 'Staff Tetap Studio (1 Tahun)' : `Staff Tetap PKWT (${durationYears || 2} Tahun)`)
            : 'Mitra Dokumentasi Lepas (Freelance Partner)',
        validityLabel: isStaff
            ? (contractType === 'studio' ? '1 Tahun (Studio Photo)' : `${durationYears || 2} Tahun (Staff PKWT)`)
            : 'Kemitraan Aktif Per Penugasan Resmi (On-Call Basis)',
        articles: isStaff ? PKWT_ARTICLES : FREELANCE_PARTNERSHIP_ARTICLES
    };
};


