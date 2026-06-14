import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './index.css';

const MAX_SLOTS_PER_DAY = 3;

// Inisialisasi Supabase Client menggunakan API Keys kamu
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);

const menus = [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
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
    { id: 'users', label: 'Manajemen Akses', icon: 'users' }
];

const makeupSubmenus = [
    { id: 'overview-makeup', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'appointment-makeup', label: 'Appointment', icon: 'calendar-days' },
    { id: 'jadwal-rias', label: 'Jadwal Rias', icon: 'wand-sparkles' },
    { id: 'date-available-makeup', label: 'Date Available', icon: 'calendar-check' },
    { id: 'pricelist-makeup', label: 'Pricelist', icon: 'tags' },
    { id: 'addons-makeup', label: 'Add-on Layanan', icon: 'package' }
];

const dekorSubmenus = [
    { id: 'overview-dekor', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'appointment-dekor', label: 'Appointment', icon: 'calendar-days' },
    { id: 'logistik-dekor', label: 'Logistik Dekor', icon: 'folder-pen' },
    { id: 'date-available-dekor', label: 'Date Available', icon: 'calendar-check' },
    { id: 'pricelist-dekor', label: 'Pricelist', icon: 'tags' },
    { id: 'addons-dekor', label: 'Add-on Layanan', icon: 'package' }
];

const studioSubmenus = [
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

// Komponen SvgIcon Kustom (100% Aman & Bebas Konflik DOM React)
const SvgIcon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        "camera": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></svg>,
        "wand-sparkles": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 4-2 2L5 14l-2 5 5-2 8-8 2-2z" /><path d="M19 2v2M21 4h-2M15 1v1.5M16.5 2.5H15M21 7v1.5M22.5 8H21" /></svg>,
        "layout-dashboard": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
        "layout-grid": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
        "calendar-days": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
        "folder-pen": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" /><path d="M12 10l3.5 3.5L8 21H4.5v-3.5L12 10z" /></svg>,
        "tags": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
        "package": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
        "calendar-check": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>,
        "ticket": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>,
        "monitor-play": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><polygon points="10 8 16 11 10 14 10 8" /></svg>,
        "settings": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
        "users": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
        "file-text": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
        "chevron-left": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>,
        "chevron-right": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>,
        "mouse-pointer-click": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m9 9 5 12 1.8-5.2L21 14z" /><path d="M7.2 2.2 8 5.1" /><path d="M5.1 8 2.2 7.2" /><path d="m13.2 4.1 2.9-.8" /><path d="m11.2 1.2-1.2 3" /><path d="m4.1 13.2-.8 2.9" /><path d="m1.2 11.2 3-1.2" /></svg>,
        "clock": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
        "lock": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
        "unlock": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>,
        "plus": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
        "minus": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
        "edit-2": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>,
        "trash-2": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
        "mail": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
        "edit": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
        "bell": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
        "log-out": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
        "alert-triangle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
        "check-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
        "alert-circle": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
        "user-plus": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
        "chevron-down": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>,
        "download": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
        "package-open": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
        "trending-up": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
        "youtube": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25a29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>,
        "image": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
        "x": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
        "menu": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
        "flower": <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4zm0 20a4 4 0 0 0 4-4v-1a4 4 0 0 0-8 0v1a4 4 0 0 0 4 4zm10-10a4 4 0 0 0-4-4h-1a4 4 0 0 0 0 8h1a4 4 0 0 0 4-4zM2 12a4 4 0 0 0 4 4h1a4 4 0 0 0 0-8H6a4 4 0 0 0-4 4z" /></svg>
    };
    return icons[name] || null;
};

// Format Rupiah Helper
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

// Helper Format Tanggal bebas crash
const formatDateUI = (dateStr) => {
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
const formatSelectedDateUI = (dateStr) => {
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

const getPackageDivision = (pkg) => {
    if (!pkg) return 'lapanbelas.id';
    const cat = pkg.category || '';
    if (cat === 'Studio Lapanbelas' || ['Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'].includes(cat)) return 'Studio Lapanbelas';
    if (cat === 'Lady Makeup' || cat.startsWith('Lady Makeup:')) return 'Lady Makeup';
    if (cat === 'Lapanbelas Dekorasi' || cat.startsWith('Lapanbelas Dekorasi:')) return 'Lapanbelas Dekorasi';
    if (cat === 'Wedding' || cat === 'lapanbelas.id' || cat === 'lapanelas.id') return 'lapanbelas.id';
    return 'lapanbelas.id';
};

// Helper: cek apakah roleString mengandung targetRole (support multi-role comma-separated)
const checkRole = (roleString, targetRole) => {
    if (!roleString) return false;
    const roles = roleString.split(',').map(r => r.trim());
    return roles.includes(targetRole);
};


function OverviewComponent({ onShowToast, onNavigate, mode, session }) {

    const isPink = mode === 'makeup' || (!mode && checkRole(session?.role, 'makeup'));
    const isGreen = mode === 'dekor' || (!mode && checkRole(session?.role, 'dekor'));
    const isBlue = mode === 'studio' || (!mode && checkRole(session?.role, 'studio'));

    const borderCol = isPink ? 'border-pink-500' : isGreen ? 'border-emerald-500' : 'border-blue-500';
    const textCol = isPink ? 'text-pink-400' : isGreen ? 'text-emerald-400' : 'text-blue-400';
    const bgCol = isPink ? 'bg-pink-500' : isGreen ? 'bg-emerald-500' : 'bg-blue-500';
    const bgLightCol = isPink ? 'bg-pink-500/20' : isGreen ? 'bg-emerald-500/20' : 'bg-blue-500/20';
    const targetMenu = mode ? `appointment-${mode}` : 'appointment';

    const [stats, setStats] = React.useState({ totalDP: 0, totalPelunasan: 0, waitingDp: 0, activeBookings: 0, clients: 0, activities: [], reminders: [], pelunasanReminders: [], uniqueClientsList: [], monthOptions: [] });
    const [showClientsModal, setShowClientsModal] = React.useState(false);
    const [selectedMonth, setSelectedMonth] = React.useState('all');
    const allApptsRef = React.useRef([]);

    const computeStats = (appts, month) => {
        let totalDP = 0;
        let totalPelunasan = 0;
        let waitingDp = 0;
        let activeBookings = 0;
        const clientMap = new Map();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        const reminders = [];
        const pelunasanReminders = [];

        appts.forEach(appt => {
            // Monthly income filter uses created_at
            const createdMonth = appt.created_at ? appt.created_at.substring(0, 7) : null;
            const inSelectedMonth = (month === 'all') || (createdMonth === month);

            if (appt.status === 'Lunas' || appt.status === 'Sudah DP') {
                activeBookings++;
                if (inSelectedMonth) {
                    totalDP += Number(appt.dp_amount || 0);
                }
            } else {
                waitingDp++;
            }
            if (appt.status === 'Lunas' && inSelectedMonth) {
                totalPelunasan += Math.max(0, Number(appt.total_amount || 0) - Number(appt.dp_amount || 0));
            }

            if (appt.client_email && !clientMap.has(appt.client_email)) {
                clientMap.set(appt.client_email, appt.client_name);
            }

            if (appt.event_date) {
                const eventDate = new Date(appt.event_date);
                if (eventDate >= today && eventDate <= next7Days) {
                    reminders.push(appt);
                }
                const evDateClear = new Date(appt.event_date);
                evDateClear.setHours(0, 0, 0, 0);
                if (appt.status === 'Sudah DP' && evDateClear < today) {
                    pelunasanReminders.push(appt);
                }
            }
        });

        const uniqueClientsList = Array.from(clientMap).map(([email, name]) => ({ email, name }));
        reminders.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        pelunasanReminders.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
        return { totalDP, totalPelunasan, waitingDp, activeBookings, clients: uniqueClientsList.length, reminders, pelunasanReminders, uniqueClientsList };
    };

    React.useEffect(() => {
        async function fetchOverview() {
            const { data: appts, error } = await supabase.from('appointments').select('*');
            const { data: pkgs } = await supabase.from('packages').select('*');
            if (error) { console.error("Gagal memuat overview:", error.message); return; }
            if (appts) {
                const pkgMap = {};
                if (pkgs) pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mappedAppts = appts.map(appt => {
                    const pkg = pkgMap[appt.package_name];
                    const division = getPackageDivision(pkg);
                    return { ...appt, division };
                });

                // Filter by mode — admin pusat hanya tampilkan lapanbelas.id
                const filteredAppts = mode === 'makeup'
                    ? mappedAppts.filter(a => a.division === 'Lady Makeup')
                    : mode === 'studio'
                        ? mappedAppts.filter(a => a.division === 'Studio Lapanbelas')
                        : mode === 'dekor'
                            ? mappedAppts.filter(a => a.division === 'Lapanbelas Dekorasi')
                            : mappedAppts.filter(a => a.division === 'lapanbelas.id');

                allApptsRef.current = filteredAppts;

                // Build month options from created_at
                const months = [...new Set(filteredAppts.map(a => a.created_at ? a.created_at.substring(0, 7) : null).filter(Boolean))].sort().reverse();
                const computed = computeStats(filteredAppts, 'all');

                // Sort and slice recent activities
                const sortedRecent = [...filteredAppts]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 3);

                setStats(prev => ({ ...prev, ...computed, activities: sortedRecent, monthOptions: months }));
            }
        }
        fetchOverview();

        // Listen for real-time updates
        const channel = supabase
            .channel('overview-appointments-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchOverview();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    React.useEffect(() => {
        if (allApptsRef.current.length > 0) {
            const computed = computeStats(allApptsRef.current, selectedMonth);
            setStats(prev => ({ ...prev, ...computed }));
        }
    }, [selectedMonth]);

    const handleSendReminderEmail = async (apt) => {
        const toastId = onShowToast("Mengirim email reminder pelunasan...", "success");
        try {
            const response = await fetch('/api/send-invoice-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'reminder_pelunasan',
                    order: {
                        id: apt.id,
                        client_name: apt.client_name,
                        client_email: apt.client_email,
                        package_name: apt.package_name,
                        total_amount: apt.total_amount,
                        dp_amount: apt.dp_amount
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast("Email reminder pelunasan berhasil dikirim!", "success");
            } else {
                onShowToast("Gagal mengirim email: " + (resData.error || "Unknown error"), "error");
            }
        } catch (error) {
            onShowToast("Error server: " + error.message, "error");
        }
    };

    const getWaLink = (rem) => {
        let phone = rem.client_phone || '';
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '62' + phone.slice(1);
        }
        const sisa = Number(rem.total_amount || 0) - Number(rem.dp_amount || 0);
        const formattedSisa = 'Rp' + sisa.toLocaleString('en-US');
        const boldName = rem.client_name ? rem.client_name.toUpperCase() : '';

        const text = `Halo Kak *${boldName}*,

mengingatkan pada hari ini sudah bisa melakukan pembayaran sisa tagihanya 

*${formattedSisa}*

Kamu dapat mengirimkan ke Rekening berikut :
—————————————————
*BANK MANDIRI*
1060019115370
*MUHAMMAD ANDREANSYAH*
—————————————————

_Sertakan bukti transfer_

Abaikan pesan ini apabila telah melakukan pembayaran.

Terima kasih, selamat beraktifitas dan selalu jaga kesehatan.

_Pesan ini adalah pesan otomatis dan hanya dikirimkan melalui Whatsapp resmi LAPANBELAS ID._`;

        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    };

    return (
        <div className="animate-in fade-in flex flex-col gap-6">

            {/* Month Filter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">Overview Keuangan</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Ringkasan pendapatan & aktivitas booking</p>
                </div>
                <div className="flex items-center gap-2">
                    <SvgIcon name="calendar-days" className="w-4 h-4 text-gray-400" />
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none cursor-pointer"
                    >
                        <option value="all">Semua Waktu</option>
                        {stats.monthOptions.map(m => {
                            const [yr, mo] = m.split('-');
                            const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                            return <option key={m} value={m}>{label}</option>;
                        })}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`glass-panel p-5 rounded-2xl border-l-4 ${borderCol}`}>
                    <p className="text-gray-400 text-sm mb-1">Total Pendapatan DP</p>
                    <h3 className="text-2xl font-bold">{formatRupiah(stats.totalDP)}</h3>
                    <p className={`text-xs ${textCol} mt-2 flex items-center gap-1`}><SvgIcon name="trending-up" className={`w-3 h-3 ${textCol}`} /> {selectedMonth === 'all' ? 'Semua waktu' : 'Bulan terpilih'}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-l-4 border-emerald-500">
                    <p className="text-gray-400 text-sm mb-1">Total Pelunasan Diterima</p>
                    <h3 className="text-2xl font-bold text-emerald-400">{formatRupiah(stats.totalPelunasan)}</h3>
                    <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><SvgIcon name="check-circle" className="w-3 h-3 text-emerald-400" /> Dari status Lunas</p>
                </div>
                <div onClick={() => onNavigate && onNavigate(targetMenu, { status: 'Menunggu DP' })} className="glass-panel p-5 rounded-2xl border-l-4 border-yellow-500 cursor-pointer hover:bg-white/5 transition">
                    <p className="text-gray-400 text-sm mb-1">Menunggu DP</p>
                    <h3 className="text-2xl font-bold">{stats.waitingDp} Booking</h3>
                    <p className="text-xs text-gray-500 mt-2">Klik untuk melihat detail</p>
                </div>
                <div onClick={() => setShowClientsModal(true)} className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 cursor-pointer hover:bg-white/5 transition">
                    <p className="text-gray-400 text-sm mb-1">Total Klien Unik</p>
                    <h3 className="text-2xl font-bold">{stats.clients} Klien</h3>
                    <p className="text-xs text-gray-500 mt-2">Klik untuk melihat daftar klien</p>
                </div>
            </div>

            {/* Total Income Summary Bar */}
            <div className="glass-panel rounded-2xl p-5 border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Keseluruhan Pendapatan {selectedMonth !== 'all' && '(Bulan Terpilih)'}</p>
                        <p className="text-3xl font-bold">{formatRupiah(stats.totalDP + stats.totalPelunasan)}</p>
                    </div>
                    <div className="flex gap-6 text-sm">
                        <div className="text-center">
                            <p className={`${textCol} font-bold`}>{formatRupiah(stats.totalDP)}</p>
                            <p className="text-gray-500 text-xs mt-0.5">DP Masuk</p>
                        </div>
                        <div className="text-gray-600 text-xl font-light self-center">+</div>
                        <div className="text-center">
                            <p className="text-emerald-400 font-bold">{formatRupiah(stats.totalPelunasan)}</p>
                            <p className="text-gray-500 text-xs mt-0.5">Pelunasan</p>
                        </div>
                    </div>
                </div>
                {(stats.totalDP + stats.totalPelunasan) > 0 && (
                    <div className="mt-4">
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                            <div style={{ width: `${Math.round(stats.totalDP / (stats.totalDP + stats.totalPelunasan) * 100)}%` }} className={`h-full ${bgCol} rounded-l-full transition-all duration-700`}></div>
                            <div style={{ width: `${Math.round(stats.totalPelunasan / (stats.totalDP + stats.totalPelunasan) * 100)}%` }} className="h-full bg-emerald-500 rounded-r-full transition-all duration-700"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
                            <span className={textCol}>DP {Math.round(stats.totalDP / (stats.totalDP + stats.totalPelunasan) * 100)}%</span>
                            <span className="text-emerald-400">Pelunasan {Math.round(stats.totalPelunasan / (stats.totalDP + stats.totalPelunasan) * 100)}%</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-3">Aktivitas Terbaru</h3>
                    <div className="space-y-4">
                        {stats.activities.map((act, i) => (
                            <div key={i} onClick={() => onNavigate && onNavigate(targetMenu, { order_id: act.id })} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition">
                                <div className={`w-10 h-10 rounded-full ${bgLightCol} flex items-center justify-center shrink-0 ${textCol}`}>
                                    <SvgIcon name="check-circle" className={`w-5 h-5 ${textCol}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">Booking - {act.client_name}</p>
                                    <p className="text-xs text-gray-400 truncate">Paket: {act.package_name}</p>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${act.status === 'Lunas' ? 'bg-green-500/10 text-green-400' :
                                    act.status === 'Sudah DP' ? `${bgLightCol} ${textCol}` : 'bg-yellow-500/10 text-yellow-400'
                                    }`}>{act.status}</span>
                            </div>
                        ))}
                        {stats.activities.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">Belum ada aktivitas baru.</p>
                        )}
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-3 flex items-center gap-2">
                        <SvgIcon name="bell" className="w-5 h-5 text-yellow-400" /> Reminder Acara (H-7)
                    </h3>
                    <div className="space-y-4">
                        {stats.reminders.map((rem, i) => {
                            const diffDays = Math.ceil((new Date(rem.event_date) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={i} onClick={() => onNavigate && onNavigate(targetMenu, { order_id: rem.id })} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border-l-2 border-yellow-400 cursor-pointer hover:bg-white/10 transition">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{rem.client_name} - {rem.package_name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{formatSelectedDateUI(rem.event_date)}</p>
                                    </div>
                                    <span className="text-xs font-bold bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full whitespace-nowrap">
                                        {diffDays === 0 ? 'Hari Ini' : `H-${diffDays}`}
                                    </span>
                                </div>
                            );
                        })}
                        {stats.reminders.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">Tidak ada acara dalam 7 hari ke depan.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* H+1 Pelunasan Reminder Panel */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-3 flex items-center gap-2 text-red-400">
                    <SvgIcon name="bell" className="w-5 h-5 text-red-400" /> Reminder Pelunasan Pasca-Acara (H+1 Selesai Acara)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                <th className="pb-3 pr-4">Nama Client</th>
                                <th className="pb-3 px-4">Tanggal Acara</th>
                                <th className="pb-3 px-4">Paket</th>
                                <th className="pb-3 px-4">Sisa Tagihan</th>
                                <th className="pb-3 pl-4 text-right">Aksi Follow-Up</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.pelunasanReminders.map((rem, idx) => {
                                const sisa = Number(rem.total_amount || 0) - Number(rem.dp_amount || 0);
                                return (
                                    <tr key={idx} className="hover:bg-white/5 transition text-sm">
                                        <td className="py-4 pr-4 font-semibold">{rem.client_name}</td>
                                        <td className="py-4 px-4 text-gray-400 font-mono">{formatSelectedDateUI(rem.event_date)}</td>
                                        <td className="py-4 px-4 text-gray-400">{rem.package_name}</td>
                                        <td className="py-4 px-4 text-red-400 font-bold font-mono">{formatRupiah(sisa)}</td>
                                        <td className="py-4 pl-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleSendReminderEmail(rem)}
                                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                ✉ Kirim Email
                                            </button>
                                            <a
                                                href={getWaLink(rem)}
                                                target="_blank"
                                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                💬 Kirim WA
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {stats.pelunasanReminders.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">Tidak ada tagihan pelunasan tertunda untuk acara yang sudah selesai.</p>
                    )}
                </div>
            </div>

            {/* Modal Unique Clients */}
            {showClientsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setShowClientsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><SvgIcon name="user-plus" className="w-5 h-5 text-purple-400" /> Daftar Klien Unik</h3>
                        <div className="max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {stats.uniqueClientsList.map((c, i) => (
                                <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{c.name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{c.email}</p>
                                    </div>
                                </div>
                            ))}
                            {stats.uniqueClientsList.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">Belum ada klien terdaftar.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AppointmentComponent({ onShowToast, initialFilter, session, mode }) {
    const isMakeup = mode === 'makeup' || checkRole(session?.role, 'makeup');
    const isStudio = mode === 'studio' || checkRole(session?.role, 'studio');
    const isDecor = mode === 'dekor' || checkRole(session?.role, 'dekor');
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [vouchers, setVouchers] = React.useState([]);
    const [addonsList, setAddonsList] = React.useState([]);
    const [staffList, setStaffList] = React.useState([]);
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

    // Form dynamic sub-states
    const [selectedVoucherCode, setSelectedVoucherCode] = React.useState('');
    const [selectedAddonIds, setSelectedAddonIds] = React.useState([]);
    const [customFees, setCustomFees] = React.useState([]);
    const [notesText, setNotesText] = React.useState('');
    const [addonPeople, setAddonPeople] = React.useState('Tanpa Tambahan Orang');
    const [addonTime, setAddonTime] = React.useState('Tanpa Tambahan Waktu');
    const [addonPrint, setAddonPrint] = React.useState('Tanpa Cetak Foto');
    const [addonFrame, setAddonFrame] = React.useState('Tanpa Bingkai Foto');

    // Studio collision check states
    const [collisionWarnings, setCollisionWarnings] = React.useState([]);
    const [showCollisionModal, setShowCollisionModal] = React.useState(false);
    const [pendingSubmitData, setPendingSubmitData] = React.useState(null);

    React.useEffect(() => {
        if (initialFilter?.status) setFilterStatus(initialFilter.status);
        else setFilterStatus('All');

        if (initialFilter?.order_id) setSearchQuery(initialFilter.order_id);
        else setSearchQuery('');
    }, [initialFilter]);

    const [divisi, setDivisi] = React.useState(isMakeup ? 'Lady Makeup' : isStudio ? 'Studio Lapanbelas' : isDecor ? 'Lapanbelas Dekorasi' : 'lapanbelas.id');
    const defaultForm = {
        name: '', client_email: '', phone: '', address: '', password: '',
        pkg: '', eventDate: '', resepsiDate: '', prewedDate: '',
        jamAkad: '', jamResepsi: '', status: 'Menunggu DP', dp: 1000000, total: 1700000, notes: '',
        namaPria: '', namaWanita: '', jamSesi: '', roomStudio: '', photographer: '', durasiSesi: '',
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

    const fetchAppointments = async () => {
        try {
            const [resAppts, resPkgs, resV, resA] = await Promise.all([
                supabase.from('appointments').select('*').order('created_at', { ascending: false }),
                supabase.from('packages').select('*'),
                supabase.from('vouchers').select('*'),
                supabase.from('addons').select('*')
            ]);

            if (resPkgs.error) {
                console.error("Gagal fetch packages:", resPkgs.error.message);
            } else if (resPkgs.data) {
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
                        division: division
                    };
                });

                const filtered = isMakeup
                    ? mapped.filter(a => a.division === 'Lady Makeup' || (a.notes && a.notes.toLowerCase().includes('makeup')))
                    : isStudio
                        ? mapped.filter(a => a.division === 'Studio Lapanbelas')
                        : isDecor
                            ? mapped.filter(a => a.division === 'Lapanbelas Dekorasi')
                            : mapped; // admin pusat: load semua, filter via dropdown
                setAppointments(filtered);
            }

            setVouchers(resV.data || []);
            setAddonsList(resA.data || []);
        } catch (e) {
            console.error("Parallel fetch appointments crashed:", e);
        }
    };

    const fetchStaffList = async () => {
        const { data } = await supabase.from('admin_users').select('display_name, role');
        if (data) setStaffList(data);
    };

    React.useEffect(() => {
        fetchAppointments();
        fetchStaffList();

        // Listen for real-time updates
        const channel = supabase
            .channel('appointment-menu-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Parser for structured notes
    const parseNotesField = (notesStr) => {
        let prewedDate = '';
        let selectedAddonNames = [];
        let voucherCode = '';
        let customFees = [];
        let keterangan = '';

        let div = 'lapanbelas.id';
        let namaPria = ''; let namaWanita = ''; let jamSesi = ''; let roomStudio = '';
        let photographer = ''; let durasiSesi = ''; let jadwalFitting = '';
        let jadwalSurvei = ''; let jadwalPemasangan = '';
        let addonPeople = 'Tanpa Tambahan Orang';
        let addonTime = 'Tanpa Tambahan Waktu';
        let addonPrint = 'Tanpa Cetak Foto';
        let addonFrame = 'Tanpa Bingkai Foto';

        if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, addonPeople, addonTime, addonPrint, addonFrame };

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

        return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, addonPeople, addonTime, addonPrint, addonFrame };
    };

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
        const { error } = await supabase.from('appointments').delete().eq('id', confirmDeleteId);
        if (error) {
            onShowToast("Gagal menghapus: " + error.message, "error");
        } else {
            onShowToast("Appointment berhasil dihapus!", "success");
            setConfirmDeleteId(null);
            fetchAppointments();
        }
    };

    // === STUDIO COLLISION CHECK HELPERS ===
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
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
            onShowToast("Data berhasil disimpan!", "success");

            if (submitData.formData.status === 'Menunggu DP' || submitData.formData.status === 'Sudah DP' || submitData.formData.status === 'Lunas') {
                let type = 'menunggu_dp';
                if (submitData.formData.status === 'Sudah DP') type = 'sudah_dp';
                if (submitData.formData.status === 'Lunas') type = 'lunas';
                fetch('/api/send-invoice-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        order: {
                            id: finalId,
                            client_name: submitData.formData.name,
                            client_email: submitData.formData.client_email,
                            client_password: submitData.formData.password,
                            package_name: submitData.formData.pkg,
                            total_amount: submitData.formData.total,
                            dp_amount: submitData.formData.dp,
                            notes: submitData.dbPayload.additional_notes
                        }
                    })
                }).catch(e => console.error('Auto-email send failed:', e));
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
            if (formData.durasiSesi) formattedNotes += `[DURASI SESI]: ${formData.durasiSesi} Menit\n`;
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

        if (selectedAddonIds.length > 0) {
            const selectedAddonsObjs = selectedAddonIds.map(id => addonsList.find(a => a.id.toString() === id.toString())).filter(Boolean);
            formattedNotes += `[LAYANAN TAMBAHAN \/ ADD-ON]:\n` + selectedAddonsObjs.map(a => `- ${a.label || a.name || ''} (${formatRupiah(a.price)})`).join('\n') + `\n\n`;
        }

        if (selectedVoucherCode) {
            const voucherObj = vouchers.find(v => v.code === selectedVoucherCode);
            const disc = voucherObj ? voucherObj.discount_amount : 0;
            formattedNotes += `[VOUCHER]: ${selectedVoucherCode} (-${formatRupiah(disc)})\n\n`;
        }

        if (customFees.length > 0) {
            formattedNotes += `[BIAYA LAINNYA]:\n` + customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
        }

        if (notesText && notesText.trim() !== "") {
            formattedNotes += `[KETERANGAN TAMBAHAN]:\n${notesText.trim()}`;
        }

        if (isRoyalBronze) {
            formData.resepsiDate = '';
        }

        const dbPayload = {
            client_name: formData.name,
            client_email: formData.client_email,
            client_phone: formData.phone || null,
            client_address: formData.address || null,
            client_password: formData.password || null,
            package_name: formData.pkg,
            event_date: formData.eventDate,
            resepsi_date: formData.resepsiDate || null,
            additional_notes: formattedNotes.trim(),
            jam_akad: divisi === 'Studio Lapanbelas' ? (formData.jamSesi || null) : (formData.jamAkad || null),
            jam_resepsi: formData.jamResepsi || null,
            status: formData.status,
            dp_amount: formData.dp,
            total_amount: formData.total
        };

        // Prepare submit data package
        const submitDataPackage = {
            dbPayload,
            formData: { ...formData },
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
                onShowToast("Data berhasil disimpan!", "success");

                if (formData.status === 'Menunggu DP' || formData.status === 'Sudah DP' || formData.status === 'Lunas') {
                    let type = 'menunggu_dp';
                    if (formData.status === 'Sudah DP') type = 'sudah_dp';
                    if (formData.status === 'Lunas') type = 'lunas';
                    fetch('/api/send-invoice-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type,
                            order: {
                                id: finalId,
                                client_name: formData.name,
                                client_email: formData.client_email,
                                client_phone: formData.phone,
                                client_address: formData.address,
                                client_password: formData.password,
                                package_name: formData.pkg,
                                total_amount: formData.total,
                                dp_amount: formData.dp,
                                notes: formattedNotes.trim()
                            }
                        })
                    }).catch(e => console.error('Auto-email send failed:', e));
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
        if (filterDivision !== 'All' && apt.division !== filterDivision) return false;

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

    const handleSendEmail = async (apt) => {
        let type = 'menunggu_dp';
        if (apt.status === 'Sudah DP') type = 'sudah_dp';
        if (apt.status === 'Lunas') type = 'lunas';
        const toastId = onShowToast("Mengirim Invoice ke email klien...", "success");
        try {
            const response = await fetch('/api/send-invoice-email', {
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
        window.open('/invoice.html?preview=true', '_blank');
    };

    const monthOptions = Array.from(new Set(appointments.filter(a => a.eventDate).map(a => a.eventDate.substring(0, 7)))).sort().reverse();

    // --- Drive Link Modal State ---
    const [driveModal, setDriveModal] = React.useState({ open: false, apt: null, link: '', sending: false });

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

            const response = await fetch('/api/send-drive-link-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: {
                        id: apt.id,
                        client_name: apt.name,
                        client_email: apt.email,
                        package_name: apt.pkg,
                        drive_link: driveModal.link.trim(),
                        estimasi_hari: estimasiHari
                    }
                })
            });
            const resData = await response.json();
            if (resData.success) {
                onShowToast('Link Drive berhasil dikirim ke email klien! 📁', 'success');
                setDriveModal({ open: false, apt: null, link: '', sending: false });
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
        <div className="animate-in fade-in flex flex-col h-full relative text-left">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold">Daftar Appointment</h2>

                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Cari nama, ID, paket..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white min-w-[200px]"
                    />
                    <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none"
                    >
                        <option value="All">Semua Bulan</option>
                        {monthOptions.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={filterDivision}
                        onChange={e => setFilterDivision(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none"
                    >
                        <option value="All">Semua Divisi</option>
                        <option value="lapanbelas.id">lapanbelas.id (Wedding)</option>
                        <option value="Studio Lapanbelas">Studio Lapanbelas</option>
                        <option value="Lady Makeup">Lady Makeup</option>
                        <option value="Lapanbelas Dekorasi">Lapanbelas Dekorasi</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none"
                    >
                        <option value="All">Semua Status</option>
                        <option value="Menunggu DP">Menunggu DP</option>
                        <option value="Sudah DP">Sudah DP</option>
                        <option value="Lunas">Lunas</option>
                    </select>
                    <button onClick={handleAddClick} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                        <SvgIcon name="plus" className="w-4 h-4 text-black" /> Tambah
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden flex-1">
                <div className="overflow-x-auto h-full custom-scrollbar pb-10">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white/5 text-gray-300 sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Order ID</th>
                                <th className="px-6 py-4 font-medium">Klien</th>
                                <th className="px-6 py-4 font-medium">Paket</th>
                                <th className="px-6 py-4 font-medium">Divisi</th>
                                <th className="px-6 py-4 font-medium">Tgl Acara</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Keuangan</th>
                                <th className="px-6 py-4 font-medium text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAppointments.map((apt, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition">
                                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{apt.id}</td>
                                    <td className="px-6 py-4 font-medium">{apt.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="truncate max-w-[200px]" title={apt.pkg}>{apt.pkg}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${apt.division === 'lapanbelas.id' ? 'bg-purple-500/20 text-purple-400' :
                                            apt.division === 'Studio Lapanbelas' ? 'bg-blue-500/20 text-blue-400' :
                                                apt.division === 'Lady Makeup' ? 'bg-pink-500/20 text-pink-400' :
                                                    apt.division === 'Lapanbelas Dekorasi' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {apt.division || 'Umum'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                            {apt.resepsiDate ? (
                                                <>
                                                    <span className="text-gray-300">Akad: {formatDateUI(apt.eventDate)}</span>
                                                    <span className="text-gray-300">Rsp: {formatDateUI(apt.resepsiDate)}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-300">{formatDateUI(apt.eventDate)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${apt.status === 'Lunas' ? 'bg-green-500/20 text-green-400' :
                                            apt.status === 'Sudah DP' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>{apt.status}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <span className="text-gray-300">Total: {formatRupiah(apt.total)}</span>
                                            <span className="text-green-400">DP: {formatRupiah(apt.dp)}</span>
                                            <span className={apt.status === 'Lunas' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                                Sisa: {apt.status === 'Lunas' ? formatRupiah(0) : formatRupiah(apt.total - apt.dp)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <button onClick={() => handlePreviewInvoice(apt)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition text-blue-400" title="Pratinjau Invoice (Preview)"><SvgIcon name="file-text" className="w-4 h-4 text-blue-400" /></button>
                                        <button onClick={() => handleSendEmail(apt)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition text-green-400" title="Kirim Invoice (Email)"><SvgIcon name="mail" className="w-4 h-4 text-green-400" /></button>
                                        {apt.status === 'Lunas' && (
                                            <button
                                                onClick={() => setDriveModal({ open: true, apt, link: '', sending: false })}
                                                className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition text-purple-400"
                                                title="Kirim Link Google Drive ke Klien"
                                            >
                                                <SvgIcon name="folder-pen" className="w-4 h-4 text-purple-400" />
                                            </button>
                                        )}
                                        <button onClick={() => handleEditClick(apt)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition text-yellow-400" title="Edit Data"><SvgIcon name="edit" className="w-4 h-4 text-yellow-400" /></button>
                                        <button onClick={() => setConfirmDeleteId(apt.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-md transition text-red-400" title="Hapus"><SvgIcon name="trash-2" className="w-4 h-4 text-red-400" /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredAppointments.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Belum ada appointment terdaftar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drive Link Modal */}
            {driveModal.open && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setDriveModal({ open: false, apt: null, link: '', sending: false })} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>

                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <SvgIcon name="folder-pen" className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Kirim Link Google Drive</h3>
                                <p className="text-xs text-gray-400">ke {driveModal.apt?.name} &bull; {driveModal.apt?.pkg}</p>
                            </div>
                        </div>

                        <div className="mt-5 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-xs text-gray-300 space-y-1.5 mb-5">
                            <p className="font-semibold text-purple-300 mb-2">📋 Panduan yang akan disertakan dalam email:</p>
                            <p>• Klien akan menerima link Google Drive untuk seleksi foto mentah</p>
                            <p>• Instruksi cara memilih foto dikirim otomatis beserta email</p>
                            <p>• Estimasi pengerjaan: <span className="font-bold text-white">{(() => { if (driveModal.apt?.division === 'Studio Lapanbelas') return '3-7 hari'; const p = (driveModal.apt?.pkg || '').toLowerCase(); return ['delta', 'centro', 'bravo', 'platinum', 'gold combo', 'royal'].some(k => p.includes(k)) ? '60 hari' : '30 hari'; })()}</span> terhitung dari tanggal klien selesai pilih foto</p>
                        </div>

                        <div className="mb-5">
                            <label className="text-xs text-gray-400 block mb-1.5">Link Google Drive (Folder Foto Mentah / Seleksi) *</label>
                            <input
                                type="url"
                                placeholder="https://drive.google.com/drive/folders/..."
                                value={driveModal.link}
                                onChange={e => setDriveModal(prev => ({ ...prev, link: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-500 text-white"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDriveModal({ open: false, apt: null, link: '', sending: false })}
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition"
                            >Batal</button>
                            <button
                                onClick={handleSendDriveLink}
                                disabled={driveModal.sending}
                                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                            >
                                {driveModal.sending ? (
                                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Mengirim...</>
                                ) : (
                                    <>📨 Kirim ke Email Klien</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
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
                                    <option value="lapanbelas.id">lapanbelas.id (Wedding Documentation)</option>
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
                                        <input type="email" required value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
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
                                    }} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white appearance-none">
                                        <option value="">-- Pilih Paket --</option>
                                        {packages.filter(p => {
                                            const cat = p.category || '';
                                            if (divisi === 'lapanbelas.id') {
                                                return cat === 'lapanbelas.id' || cat === 'Wedding' || cat === 'Pre-Wedding' || cat === 'Engagement' || cat === 'Tasyakuran' || !p.category;
                                            }
                                            if (divisi === 'Studio Lapanbelas') {
                                                return cat === 'Studio Lapanbelas' || ['Wisuda', 'Prewed/Couple', 'Group Studio', 'Family', 'Pas Photo Studio'].includes(cat);
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
                                                    <option value="">-- Pilih --</option>
                                                    <option value="Fotografer 1 (permanent)">Fotografer 1 (permanent)</option>
                                                    <option value="Fotografer 2 (permanent)">Fotografer 2 (permanent)</option>
                                                    <option value="Fotografer 3 (freelance)">Fotografer 3 (freelance)</option>
                                                    <option value="Fotografer 4 (freelance)">Fotografer 4 (freelance)</option>
                                                    <option value="Fotografer 5 (freelance)">Fotografer 5 (freelance)</option>
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
                                                    <option value="+10 Menit (+Rp 50.000)">+10 Menit (+Rp 50.000)</option>
                                                    <option value="+20 Menit (+Rp 100.000)">+20 Menit (+Rp 100.000)</option>
                                                    <option value="+30 Menit (+Rp 150.000)">+30 Menit (+Rp 150.000)</option>
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

                            {/* Seksi: Layanan Tambahan (Add-on) */}
                            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">🎁 Layanan Tambahan (Add-on)</p>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Pilih Add-on Layanan</label>
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
                                        {addonsList.filter(a => !selectedAddonIds.includes(a.id.toString())).map(a => (
                                            <option key={a.id} value={a.id.toString()}>{a.label || a.name || 'Unnamed Addon'} ({formatRupiah(a.price)})</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedAddonIds.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        <p className="text-[10px] text-gray-400 font-medium">Layanan Tambahan Terpilih:</p>
                                        {selectedAddonIds.map(id => {
                                            const a = addonsList.find(item => item.id.toString() === id.toString());
                                            if (!a) return null;
                                            return (
                                                <div key={id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs text-white">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{a.label || a.name || 'Unnamed Addon'}</span>
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

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan Data</button>
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
        </div>
    );
}

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
        const { data: appts, error: err1 } = await supabase.from('appointments').select('*');
        const { data: assigns, error: err2 } = await supabase.from('editor_assignments').select('*');
        const { data: pkgs, error: err3 } = await supabase.from('packages').select('*');

        if (err1) console.error("Gagal load appointments untuk assign:", err1.message);
        if (err2) console.error("Gagal load assignments:", err2.message);
        if (err3) console.error("Gagal load packages untuk division matching:", err3.message);

        if (appts) {
            const mappedTasks = appts.map(appt => {
                const ass = assigns?.find(a => a.appointment_id === appt.id);
                const pkgObj = pkgs?.find(p => p.title === appt.package_name);
                const division = pkgObj ? getPackageDivision(pkgObj) : 'lapanbelas.id';
                let rawFileCode = ass ? ass.file_code : '';
                let parsedFileCode = rawFileCode;
                let parsedDriveLink = '';
                let parsedDriveLinkSeleksi = '';
                let parsedTanggalPilihFoto = '';
                if (rawFileCode && rawFileCode.includes(' || ')) {
                    const parts = rawFileCode.split(' || ');
                    parsedFileCode = parts[0] || '';
                    parsedDriveLink = parts[1] || '';
                    parsedDriveLinkSeleksi = parts[2] || '';
                    parsedTanggalPilihFoto = parts[3] || '';
                } else {
                    // If not in combined format, treat raw as file_code
                    parsedFileCode = rawFileCode;
                }

                return {
                    id: appt.id,
                    name: appt.client_name,
                    email: appt.client_email || '',
                    phone: appt.client_phone || '',
                    pkg: appt.package_name,
                    date: appt.event_date,
                    editor: ass ? ass.editor_name : null,
                    editorFoto: (ass && ass.editor_name && ass.editor_name.includes(' || ')) ? ass.editor_name.split(' || ')[0] : (ass ? ass.editor_name : ''),
                    editorVideo: (ass && ass.editor_name && ass.editor_name.includes(' || ')) ? ass.editor_name.split(' || ')[1] : '',
                    fileCode: parsedFileCode,
                    driveLink: parsedDriveLink,
                    driveLinkSeleksi: parsedDriveLinkSeleksi,
                    tanggalPilihFoto: parsedTanggalPilihFoto,
                    qty: ass ? ass.qty : '',
                    deadline: ass ? ass.deadline : '',
                    deadlineVideo: ass ? ass.deadline_video : '',
                    statusFoto: ass ? ass.status_foto : 'Belum Diproses',
                    statusVideo: ass ? ass.status_video : 'Belum Diproses',
                    linkHasilFoto: ass ? ass.link_hasil_foto : '',
                    linkHasilVideo: ass ? ass.link_hasil_video : '',
                    division: division
                };
            });
            setTasks(mappedTasks);
        }
    };

    const [availableEditors, setAvailableEditors] = React.useState([]);

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
        setFormData({
            editor: task.editorFoto || '',
            editorVideo: task.editorVideo || '',
            fileCode: task.fileCode || '',
            driveLink: task.driveLink || '',
            driveLinkSeleksi: task.driveLinkSeleksi || '',
            tanggalPilihFoto: task.tanggalPilihFoto || '',
            qty: task.qty || '',
            deadline: task.deadline || '',
            deadlineVideo: task.deadlineVideo || '',
            statusFoto: task.statusFoto || 'Belum Diproses',
            statusVideo: task.statusVideo || 'Belum Diproses',
            linkHasilFoto: task.linkHasilFoto || '',
            linkHasilVideo: task.linkHasilVideo || ''
        });
        setIsModalOpen(true);
    };

    const handleFileCodeChange = (e) => {
        const val = e.target.value;
        let newQty = formData.qty;

        if (val.includes(',')) {
            const count = val.split(',').filter(item => item.trim() !== '').length;
            newQty = count > 0 ? count : '';
        } else if (val.trim() === '') {
            newQty = '';
        } else if (val.trim() !== '' && (!formData.qty || formData.qty === '')) {
            newQty = 1;
        }

        setFormData({ ...formData, fileCode: val, qty: newQty });
    };

    const sendProgressEmail = async (task, status) => {
        if (!task.email) return;
        try {
            const response = await fetch('/api/send-progress-email', {
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
            }
        } catch (err) {
            console.error("[Email] Error request progress email:", err);
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
            const response = await fetch('/api/send-editor-notification', {
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

        // Validations based on mode
        const processingStatuses = ['Antrian Pengerjaan', 'Proses Edit', 'Selesai untuk Preview', 'Done'];

        if (isFoto) {
            if (formData.statusFoto === 'Selesai untuk Preview' && (!formData.linkHasilFoto || !formData.linkHasilFoto.trim())) {
                onShowToast("Gagal: Link Google Drive Foto harus diisi untuk status 'Selesai untuk Preview'!", "error");
                return;
            }
            if (processingStatuses.includes(formData.statusFoto)) {
                if (!formData.editor || !formData.editor.trim()) {
                    onShowToast("Gagal: Nama Editor Foto wajib diisi jika progres berjalan!", "error");
                    return;
                }
                if (!formData.deadline || !formData.deadline.trim()) {
                    onShowToast("Gagal: Tanggal Deadline Foto wajib diisi untuk progres Foto!", "error");
                    return;
                }
                if (!formData.fileCode || !formData.fileCode.trim()) {
                    onShowToast("Gagal: Kode File Edit wajib diisi untuk progres Foto!", "error");
                    return;
                }
            }
        } else if (mode === 'video') {
            if (formData.statusVideo === 'Selesai untuk Preview' && (!formData.linkHasilVideo || !formData.linkHasilVideo.trim())) {
                onShowToast("Gagal: Link Google Drive Video harus diisi untuk status 'Selesai untuk Preview'!", "error");
                return;
            }
            if (processingStatuses.includes(formData.statusVideo)) {
                if (!formData.editorVideo || !formData.editorVideo.trim()) {
                    onShowToast("Gagal: Nama Editor Video wajib diisi jika progres berjalan!", "error");
                    return;
                }
                if (!formData.deadlineVideo || !formData.deadlineVideo.trim()) {
                    onShowToast("Gagal: Tanggal Deadline Video wajib diisi untuk progres Video!", "error");
                    return;
                }
            }
        }

        const fileCodeStr = formData.fileCode ? formData.fileCode.trim() : '';
        const driveLinkSeleksiStr = formData.driveLinkSeleksi ? formData.driveLinkSeleksi.trim() : '';
        const tanggalPilihFotoStr = formData.tanggalPilihFoto ? formData.tanggalPilihFoto.trim() : '';

        // Build exactly 4 parts separated by ' || ' to maintain legacy structure
        const combinedFileCode = [
            fileCodeStr,
            '', // legacy driveLink empty
            driveLinkSeleksiStr,
            tanggalPilihFotoStr
        ].join(' || ');

        // Get current values to preserve the other mode's data
        const currentVideoEditor = selectedTask.editorVideo || '';
        const currentFotoEditor = selectedTask.editorFoto || '';

        const newFotoEditor = isFoto ? (formData.editor ? formData.editor.trim() : '') : currentFotoEditor;
        const newVideoEditor = mode === 'video' ? (formData.editorVideo ? formData.editorVideo.trim() : '') : currentVideoEditor;

        const combinedEditor = `${newFotoEditor} || ${newVideoEditor}`;

        const dbPayload = {
            appointment_id: selectedTask.id,
            editor_name: combinedEditor,
            file_code: isFoto ? combinedFileCode : ((selectedTask.fileCode || '') + ' ||  || ' + (selectedTask.driveLinkSeleksi || '') + ' || ' + (selectedTask.tanggalPilihFoto || '')),
            qty: isFoto ? (Number(formData.qty) || 1) : (Number(selectedTask.qty) || 1),
            deadline: isFoto ? (formData.deadline || null) : (selectedTask.deadline || null),
            deadline_video: mode === 'video' ? (formData.deadlineVideo || null) : (selectedTask.deadlineVideo || null),
            status_foto: isFoto ? formData.statusFoto : selectedTask.statusFoto,
            status_video: mode === 'video' ? formData.statusVideo : selectedTask.statusVideo,
            link_hasil_foto: isFoto ? (formData.linkHasilFoto || null) : (selectedTask.linkHasilFoto || null),
            link_hasil_video: mode === 'video' ? (formData.linkHasilVideo || null) : (selectedTask.linkHasilVideo || null)
        };

        const { error } = await supabase.from('editor_assignments').upsert([dbPayload]);
        if (error) {
            onShowToast("Gagal menyimpan assign: " + error.message, "error");
        } else {
            onShowToast("Penugasan editor berhasil disimpan!", "success");

            // Kirim notifikasi email progres
            if (selectedTask && selectedTask.email) {
                const emailPayload = {
                    id: selectedTask.id,
                    name: selectedTask.name,
                    email: selectedTask.email,
                    pkg: selectedTask.pkg,
                    editor: combinedEditor,
                    fileCode: isFoto ? combinedFileCode : (selectedTask.fileCode + ' ||  || ' + selectedTask.driveLinkSeleksi + ' || ' + selectedTask.tanggalPilihFoto),
                    linkHasilFoto: isFoto ? (formData.linkHasilFoto || '') : (selectedTask.linkHasilFoto || ''),
                    linkHasilVideo: mode === 'video' ? (formData.linkHasilVideo || '') : (selectedTask.linkHasilVideo || ''),
                    qty: isFoto ? formData.qty : selectedTask.qty,
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

    const handleStatusChange = async (id, type, newStatus) => {
        const task = tasks.find(t => t.id === id);

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

        const updatePayload = {};
        if (type === 'foto') updatePayload.status_foto = newStatus;
        if (type === 'video') updatePayload.status_video = newStatus;

        const { error } = await supabase.from('editor_assignments').update(updatePayload).eq('appointment_id', id);
        if (error) {
            onShowToast("Gagal merubah status progres: " + error.message, "error");
        } else {
            onShowToast("Progres pengerjaan berhasil diperbarui!", "success");

            if (task && task.email) {
                sendProgressEmail({
                    ...task,
                    editor: task.editor,
                }, `${type === 'foto' ? 'Foto' : 'Video'}: ${newStatus}`);
            }

            fetchAssignmentsAndAppts();
        }
    };

    const filteredTasks = tasks.filter(task => {
        // Filter by division depending on mode
        if (mode === 'foto' || mode === 'video') {
            if (task.division !== 'lapanbelas.id') return false;
        } else if (mode === 'foto-studio') {
            if (task.division !== 'Studio Lapanbelas') return false;
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

    const unassigned = filteredTasks.filter(t => isFoto ? !t.editorFoto : !t.editorVideo);
    const inProgress = filteredTasks.filter(t => isFoto ? (t.editorFoto && t.statusFoto !== 'Done') : (t.editorVideo && t.statusVideo !== 'Done'));
    const done = filteredTasks.filter(t => isFoto ? (t.editorFoto && t.statusFoto === 'Done') : (t.editorVideo && t.statusVideo === 'Done'));

    return (
        <div className="animate-in fade-in flex flex-col h-full relative text-left">
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
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-4 border-b border-white/10 mb-6">
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

            <div className="flex-1 overflow-y-auto space-y-4 pb-10 custom-scrollbar">
                {activeTab === 'belum-dipilih' && unassigned.map(task => (
                    <div key={task.id} className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-gray-500">
                        <div>
                            <h3 className="font-semibold">{task.name}</h3>
                            <p className="text-sm text-gray-400 mb-1.5">Paket: {task.pkg} • Tanggal: {formatDateUI(task.date)}</p>
                            {task.driveLinkSeleksi && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">Link Seleksi Terkirim</span>
                            )}
                        </div>
                        <button onClick={() => handleAssignClick(task)} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <SvgIcon name="user-plus" className="w-4 h-4 text-black" /> Assign Editor
                        </button>
                    </div>
                ))}

                {activeTab === 'sudah-dipilih' && inProgress.map(task => (
                    <div key={task.id} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between border-l-4 border-blue-500 gap-4">
                        <div className="flex-1">
                            <h3 className="font-semibold mb-2">{task.name} ({task.pkg})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-gray-500 mb-0.5">Editor {isFoto ? 'Foto' : 'Video'}</p>
                                    <p className="font-medium">{isFoto ? task.editorFoto : task.editorVideo}</p>
                                </div>
                                {isFoto && (
                                    <div>
                                        <p className="text-gray-500 mb-0.5">Kode / Qty</p>
                                        <p className="font-medium font-mono text-gray-300">{task.fileCode} ({task.qty} file)</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-gray-500 mb-0.5">Deadline</p>
                                    <p className="font-medium text-red-400 text-[11px] leading-tight">
                                        {isFoto ? (task.deadline ? formatDateUI(task.deadline) : '-') : (task.deadlineVideo ? formatDateUI(task.deadlineVideo) : '-')}
                                    </p>
                                </div>
                                <div className={!isFoto ? 'col-span-2' : ''}>
                                    <p className="text-gray-500 mb-1">Status {isFoto ? 'Foto' : 'Video'}</p>
                                    {isFoto ? (
                                        <select
                                            value={task.statusFoto}
                                            onChange={(e) => handleStatusChange(task.id, 'foto', e.target.value)}
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
                                            onChange={(e) => handleStatusChange(task.id, 'video', e.target.value)}
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
                        </div>
                        <button onClick={() => handleAssignClick(task)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition text-gray-300">
                            <SvgIcon name="edit" className="w-4 h-4 text-gray-300" />
                        </button>
                    </div>
                ))}

                {activeTab === 'done' && done.map(task => (
                    <div key={task.id} className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-green-500 opacity-70">
                        <div>
                            <h3 className="font-semibold text-gray-300 line-through">{task.name} ({task.pkg})</h3>
                            <p className="text-xs text-gray-500">Selesai dikerjakan oleh {task.editor}</p>
                        </div>
                        <button onClick={() => { handleStatusChange(task.id, 'foto', 'Selesai untuk Preview'); handleStatusChange(task.id, 'video', 'Selesai untuk Preview'); }} className="text-xs text-gray-400 hover:text-white underline">
                            Undo
                        </button>
                    </div>
                ))}

                {((activeTab === 'belum-dipilih' && unassigned.length === 0) ||
                    (activeTab === 'sudah-dipilih' && inProgress.length === 0) ||
                    (activeTab === 'done' && done.length === 0)) && (
                        <div className="text-center py-8 text-gray-500">Tidak ada data untuk ditampilkan.</div>
                    )}
            </div>

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
                                        <input type="date" value={formData.tanggalPilihFoto || ''} onChange={e => setFormData({ ...formData, tanggalPilihFoto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white [color-scheme:dark]" />
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
                                                <input type="text" placeholder="Cth: LID_002, LID_003" value={formData.fileCode} onChange={handleFileCodeChange} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono" />
                                            </div>
                                            <div className="w-1/3">
                                                <label className="text-xs text-gray-400 block mb-1">Jml File</label>
                                                <input type="number" value={formData.qty} onChange={e => setFormData({ ...formData, qty: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Tanggal Deadline {isFoto ? 'Foto' : 'Video'}</label>
                                        {isFoto ? (
                                            <input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white [color-scheme:dark]" />
                                        ) : (
                                            <input type="date" value={formData.deadlineVideo} onChange={e => setFormData({ ...formData, deadlineVideo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white [color-scheme:dark]" />
                                        )}
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

function PricelistComponent({ onShowToast, session, mode }) {
    const isMakeupMode = mode === 'makeup' || checkRole(session?.role, 'makeup');
    const isStudioMode = mode === 'studio' || checkRole(session?.role, 'studio');
    const isDecorMode = mode === 'dekor' || checkRole(session?.role, 'dekor');
    const [packages, setPackages] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState(isMakeupMode ? 'Lady Makeup' : isStudioMode ? 'Studio Lapanbelas' : isDecorMode ? 'Lapanbelas Dekorasi' : 'lapanbelas.id');

    const defaultForm = { title: '', category: 'Wedding', price: '', is_active: true, description: '', image_url: '', duration: '' };
    const [formData, setFormData] = React.useState(defaultForm);

    const fetchPackages = async () => {
        const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error("Gagal load packages:", error.message);
        } else if (data) {
            setPackages(data);
        }
    };

    React.useEffect(() => {
        fetchPackages();
    }, []);

    const handleAddClick = () => {
        setEditId(null);
        let defaultCategory = 'Wedding';
        if (activeTab === 'Studio Lapanbelas') defaultCategory = 'Wisuda';
        else if (activeTab === 'Lady Makeup') defaultCategory = 'Lady Makeup: Akad';
        else if (activeTab === 'Lapanbelas Dekorasi') defaultCategory = 'Lapanbelas Dekorasi: Pelaminan Only';

        setFormData({
            ...defaultForm,
            category: defaultCategory,
            duration: ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (pkg) => {
        setEditId(pkg.id);
        const desc = pkg.description || '';
        const durationMatch = desc.match(/\[DURATION\]:\s*(\d+)/);
        const dur = durationMatch ? durationMatch[1] : '';
        const cleanDesc = desc.replace(/\[DURATION\]:\s*\d+\s*[\r\n]*/g, '').trim();

        setFormData({
            title: pkg.title,
            category: pkg.category,
            price: pkg.price,
            is_active: pkg.is_active,
            description: cleanDesc,
            image_url: pkg.image_url || '',
            duration: dur
        });
        setActiveTab(getPackageDivision(pkg));
        setIsModalOpen(true);
    };

    const confirmDeletePkg = async () => {
        const { error } = await supabase.from('packages').delete().eq('id', confirmDeleteId);
        if (error) {
            onShowToast("Gagal menghapus paket: " + error.message, "error");
        } else {
            onShowToast("Paket berhasil dihapus!", "success");
            setConfirmDeleteId(null);
            fetchPackages();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let desc = formData.description || '';
        if (activeTab === 'Studio Lapanbelas' && formData.duration) {
            desc = `${desc}\n\n[DURATION]: ${formData.duration}`;
        }
        const dbPayload = {
            title: formData.title,
            category: formData.category,
            price: Number(formData.price),
            is_active: formData.is_active,
            description: desc,
            image_url: formData.image_url || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop'
        };

        let responseError = null;
        if (editId) {
            const { error } = await supabase.from('packages').update(dbPayload).eq('id', editId);
            responseError = error;
        } else {
            const { error } = await supabase.from('packages').insert([dbPayload]);
            responseError = error;
        }

        if (responseError) {
            onShowToast("Gagal menyimpan paket ke Supabase: " + responseError.message, "error");
        } else {
            onShowToast("Paket berhasil disimpan!", "success");
            setIsModalOpen(false);
            fetchPackages();
        }
    };

    const filteredPackages = packages.filter(pkg => getPackageDivision(pkg) === activeTab);

    return (
        <div className="animate-in fade-in flex flex-col text-left">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-xl font-bold">Manajemen Harga & Paket</h2>
                <button onClick={handleAddClick} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4 text-black" /> Tambah Paket
                </button>
            </div>

            {/* Tab Divisi */}
            {!isMakeupMode && !isStudioMode && !isDecorMode && (
                <div className="flex gap-4 border-b border-white/10 mb-6 overflow-x-auto pb-1 shrink-0">
                    <button onClick={() => setActiveTab('lapanbelas.id')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'lapanbelas.id' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}>
                        lapanbelas.id (Wedding) <span className="ml-1 bg-white/10 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'lapanbelas.id').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('Studio Lapanbelas')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'Studio Lapanbelas' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}>
                        Studio Lapanbelas <span className="ml-1 bg-white/10 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'Studio Lapanbelas').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('Lady Makeup')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'Lady Makeup' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}>
                        Lady Makeup <span className="ml-1 bg-white/10 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'Lady Makeup').length}</span>
                    </button>
                    <button onClick={() => setActiveTab('Lapanbelas Dekorasi')} className={`pb-3 text-sm font-medium transition-all shrink-0 ${activeTab === 'Lapanbelas Dekorasi' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'}`}>
                        Lapanbelas Dekorasi <span className="ml-1 bg-white/10 text-xs px-2 py-0.5 rounded-full">{packages.filter(p => getPackageDivision(p) === 'Lapanbelas Dekorasi').length}</span>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPackages.map((pkg, i) => (
                    <div key={i} className="glass-panel p-5 rounded-2xl flex flex-col relative group">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-gray-300">
                                {pkg.category && pkg.category.startsWith('Lady Makeup:') ? pkg.category.replace('Lady Makeup: ', '') :
                                    pkg.category && pkg.category.startsWith('Lapanbelas Dekorasi:') ? pkg.category.replace('Lapanbelas Dekorasi: ', '') : pkg.category}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${pkg.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="text-[10px] text-gray-400">{pkg.is_active ? 'Aktif' : 'Nonaktif'}</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1">{pkg.title}</h3>
                        {(() => {
                            const match = pkg.description?.match(/\[DURATION\]:\s*(\d+)/);
                            if (match) {
                                return <p className="text-xs text-gray-400 mb-2">Durasi: {match[1]} Menit</p>;
                            }
                            return null;
                        })()}
                        <p className="text-2xl font-light text-blue-400 mb-4">{formatRupiah(pkg.price)}</p>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                            <button onClick={() => handleEditClick(pkg)} className="bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                <SvgIcon name="edit-2" className="w-3 h-3 text-white" /> Edit
                            </button>
                            <button onClick={() => setConfirmDeleteId(pkg.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                <SvgIcon name="trash-2" className="w-3 h-3 text-red-400" /> Hapus
                            </button>
                        </div>
                    </div>
                ))}
                {filteredPackages.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        <SvgIcon name="package-open" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Belum ada paket untuk divisi ini. Silakan buat paket baru di atas!</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Paket *</label>
                                <input type="text" required placeholder="Cth: Silver Package" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 block mb-1">Kategori *</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-white appearance-none">
                                        {activeTab === 'Studio Lapanbelas' && (
                                            <>
                                                <option value="Wisuda">Wisuda</option>
                                                <option value="Prewed/Couple">Prewed/Couple</option>
                                                <option value="Group Studio">Group Studio</option>
                                                <option value="Family">Family</option>
                                                <option value="Pas Photo Studio">Pas Photo Studio</option>
                                            </>
                                        )}
                                        {activeTab === 'Lady Makeup' && (
                                            <>
                                                <option value="Lady Makeup: Akad">Akad</option>
                                                <option value="Lady Makeup: Resepsi">Resepsi</option>
                                                <option value="Lady Makeup: Akad + Resepsi">Akad + Resepsi</option>
                                                <option value="Lady Makeup: Lamaran">Lamaran</option>
                                                <option value="Lady Makeup: Tasyakuran">Tasyakuran</option>
                                                <option value="Lady Makeup: Photoshoot">Photoshoot</option>
                                            </>
                                        )}
                                        {activeTab === 'Lapanbelas Dekorasi' && (
                                            <>
                                                <option value="Lapanbelas Dekorasi: Pelaminan Only">Pelaminan Only</option>
                                                <option value="Lapanbelas Dekorasi: Bundling Resepsi">Bundling Resepsi</option>
                                                <option value="Lapanbelas Dekorasi: Bundling Akad Resepsi">Bundling Akad Resepsi</option>
                                            </>
                                        )}
                                        {activeTab === 'lapanbelas.id' && (
                                            <>
                                                <option value="Wedding">Wedding</option>
                                                <option value="Pre-Wedding">Pre-Wedding</option>
                                                <option value="Engagement">Engagement</option>
                                                <option value="Tasyakuran">Tasyakuran</option>
                                                <option value="lapanbelas.id">lapanbelas.id</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 block mb-1">Harga (Rp) *</label>
                                    <input type="number" required placeholder="Cth: 4000000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                </div>
                            </div>
                            {activeTab === 'Studio Lapanbelas' && (
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Durasi Sesi (Menit) *</label>
                                    <input type="number" required placeholder="Cth: 10" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                                    <p className="text-[10px] text-gray-500 mt-1">Tentukan berapa menit sesi foto berlangsung untuk pemblokiran slot waktu booking klien.</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Deskripsi Paket</label>
                                <textarea placeholder="Penjelasan detail mengenai paket ini..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white min-h-[80px]"></textarea>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">URL Gambar Paket</label>
                                <input type="text" placeholder="https://images.unsplash.com/..." value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Status Ketersediaan</label>
                                <select value={formData.is_active ? 'aktif' : 'nonaktif'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'aktif' })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-white appearance-none">
                                    <option value="aktif">Aktif (Ditampilkan Klien)</option>
                                    <option value="nonaktif">Nonaktif (Disembunyikan)</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
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
                        <h3 className="text-lg font-bold mb-2">Hapus Paket?</h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">Paket ini tidak akan muncul lagi di formulir booking klien.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition">Batal</button>
                            <button onClick={confirmDeletePkg} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition">Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// BARU: Komponen Manajemen Add-ons Layanan
function AddonsComponent({ onShowToast, session, mode }) {
    const isMakeupMode = mode === 'makeup' || checkRole(session?.role, 'makeup');
    const isStudioMode = mode === 'studio' || checkRole(session?.role, 'studio');
    const isDecorMode = mode === 'dekor' || checkRole(session?.role, 'dekor');
    const [addons, setAddons] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);

    const parseAddon = (addon) => {
        if (!addon) return { category: 'Lainnya', labelOnly: '' };
        const rawLabel = addon.label || '';
        const match = rawLabel.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            let category = match[1].trim();
            if (category.toLowerCase() === 'makeup artist' || category.toLowerCase() === 'makeup artis' || category.toLowerCase() === 'mua') {
                category = 'Makeup Artis';
            } else if (category.toLowerCase() === 'video') {
                category = 'Video';
            } else if (category.toLowerCase() === 'studio' || category.toLowerCase() === 'foto studio') {
                category = 'Studio';
            } else if (category.toLowerCase() === 'dekorasi' || category.toLowerCase() === 'dekor') {
                category = 'Dekorasi';
            } else if (category.toLowerCase() === 'add-on best seller' || category.toLowerCase() === 'best seller') {
                category = 'Add-on Best Seller';
            }
            return {
                ...addon,
                category,
                labelOnly: match[2].trim()
            };
        }
        return {
            ...addon,
            category: 'Lainnya',
            labelOnly: rawLabel.trim()
        };
    };

    const filteredAddons = isMakeupMode
        ? addons.filter(a => parseAddon(a).category === 'Makeup Artis')
        : isStudioMode
            ? addons.filter(a => parseAddon(a).category === 'Studio')
            : isDecorMode
                ? addons.filter(a => parseAddon(a).category === 'Dekorasi')
                : addons;

    const defaultForm = { label: '', price: '', category: 'Lainnya' };
    const [formData, setFormData] = React.useState(defaultForm);

    const fetchAddons = async () => {
        const { data, error } = await supabase.from('addons').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error("Gagal load addons:", error.message);
        } else if (data) {
            setAddons(data);
        }
    };

    React.useEffect(() => {
        fetchAddons();
    }, []);

    const handleAddClick = () => {
        setEditId(null);
        setFormData({ label: '', price: '', category: isMakeupMode ? 'Makeup Artis' : isStudioMode ? 'Studio' : isDecorMode ? 'Dekorasi' : 'Lainnya' });
        setIsModalOpen(true);
    };

    const handleEditClick = (addon) => {
        const parsed = parseAddon(addon);
        setEditId(addon.id);
        setFormData({
            label: parsed.labelOnly,
            price: addon.price,
            category: parsed.category
        });
        setIsModalOpen(true);
    };

    const confirmDeleteAddon = async () => {
        const { error } = await supabase.from('addons').delete().eq('id', confirmDeleteId);
        if (error) {
            onShowToast("Gagal menghapus add-on: " + error.message, "error");
        } else {
            onShowToast("Add-on berhasil dihapus!", "success");
            setConfirmDeleteId(null);
            fetchAddons();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let finalLabel = formData.label.trim();
        if (formData.category && formData.category !== 'Lainnya') {
            finalLabel = `[${formData.category}] ${finalLabel}`;
        }
        const dbPayload = {
            label: finalLabel,
            price: Number(formData.price)
        };

        let responseError = null;
        if (editId) {
            const { error } = await supabase.from('addons').update(dbPayload).eq('id', editId);
            responseError = error;
        } else {
            const { error } = await supabase.from('addons').insert([dbPayload]);
            responseError = error;
        }

        if (responseError) {
            onShowToast("Gagal menyimpan ke Supabase: " + responseError.message, "error");
        } else {
            onShowToast("Add-on berhasil disimpan!", "success");
            setIsModalOpen(false);
            fetchAddons();
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Manajemen Layanan Tambahan (Add-on)</h2>
                <button onClick={handleAddClick} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4 text-black" /> Tambah Add-on
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAddons.map((addon) => {
                    const parsed = parseAddon(addon);
                    let badgeStyle = "text-gray-400 bg-white/5 border border-white/10";
                    if (parsed.category === 'Makeup Artis') {
                        badgeStyle = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
                    } else if (parsed.category === 'Video') {
                        badgeStyle = "text-sky-400 bg-sky-500/10 border border-sky-500/20";
                    } else if (parsed.category === 'Dekorasi') {
                        badgeStyle = "text-green-400 bg-green-500/10 border border-green-500/20";
                    } else if (parsed.category === 'Add-on Best Seller') {
                        badgeStyle = "text-amber-400 bg-amber-500/10 border border-amber-500/20";
                    }

                    return (
                        <div key={addon.id} className="glass-panel p-5 rounded-2xl flex flex-col relative group">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full w-max mb-3 font-semibold ${badgeStyle}`}>{parsed.category}</span>
                            <h3 className="text-sm font-semibold mb-1 leading-snug min-h-[40px]">{parsed.labelOnly}</h3>
                            <p className="text-xl font-light text-blue-400 mb-4">{formatRupiah(addon.price)}</p>
                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <button onClick={() => handleEditClick(addon)} className="bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                    <SvgIcon name="edit-2" className="w-3 h-3 text-white" /> Edit
                                </button>
                                <button onClick={() => setConfirmDeleteId(addon.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium transition flex justify-center items-center gap-1">
                                    <SvgIcon name="trash-2" className="w-3 h-3 text-red-400" /> Hapus
                                </button>
                            </div>
                        </div>
                    );
                })}
                {addons.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        <SvgIcon name="package-open" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Belum ada add-on layanan. Silakan buat di atas!</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Layanan Tambahan' : 'Tambah Layanan Tambahan'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Layanan Tambahan *</label>
                                <input type="text" required placeholder="Cth: Aerial Drone + Operator" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            {!isMakeupMode && !isStudioMode && !isDecorMode && (
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Kategori Add-on *</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white"
                                    >
                                        <option value="Makeup Artis" className="bg-[#121212] text-white">Makeup Artis</option>
                                        <option value="Video" className="bg-[#121212] text-white">Video</option>
                                        <option value="Studio" className="bg-[#121212] text-white">Studio</option>
                                        <option value="Dekorasi" className="bg-[#121212] text-white">Dekorasi</option>
                                        <option value="Add-on Best Seller" className="bg-[#121212] text-white">Add-on Best Seller</option>
                                        <option value="Lainnya" className="bg-[#121212] text-white">Lainnya (Uncategorized)</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Harga Layanan (Rp) *</label>
                                <input type="number" required placeholder="Cth: 1500000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-sm text-center animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <SvgIcon name="alert-triangle" className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Hapus Layanan Tambahan?</h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">Add-on ini tidak akan muncul lagi di halaman depan klien.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition">Batal</button>
                            <button onClick={confirmDeleteAddon} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition">Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DateAvailableComponent({ onShowToast, mode }) {
    const isMakeupMode = mode === 'makeup';
    const [currentDate, setCurrentDate] = React.useState(new Date(2026, 4, 18));
    const [selectedDate, setSelectedDate] = React.useState(null);
    const [availabilities, setAvailabilities] = React.useState([]);
    const [appointments, setAppointments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const formatDateString = (y, m, d) => {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    };

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const { data: avails, error: errAvail } = await supabase.from('date_availability').select('*');
            const { data: appts, error: errAppts } = await supabase.from('appointments').select('*');

            if (errAvail) console.error("Error date_availability:", errAvail);
            if (errAppts) console.error("Error appointments:", errAppts);

            if (avails) setAvailabilities(avails);
            if (appts) {
                const { data: pkgs } = await supabase.from('packages').select('*');
                const pkgMap = {};
                if (pkgs) pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mapped = appts.map(a => {
                    const pkg = pkgMap[a.package_name];
                    const division = getPackageDivision(pkg);
                    return { ...a, division, packages: pkg };
                });

                if (isMakeupMode) {
                    const filtered = mapped.filter(a => {
                        const div = a.division;
                        if (div === 'Lady Makeup') return true;
                        const pkgTitle = (a.package_name || '').toLowerCase();
                        const pkgCat = (a.packages?.category || '').toLowerCase();
                        const hasMakeupNotes = a.additional_notes && a.additional_notes.toLowerCase().includes('makeup');
                        return pkgTitle.includes('bundling') || pkgCat.includes('bundling') || hasMakeupNotes;
                    });
                    setAppointments(filtered);
                } else if (mode === 'studio') {
                    const filtered = mapped.filter(a => a.division === 'Studio Lapanbelas');
                    setAppointments(filtered);
                } else if (mode === 'dekor') {
                    const filtered = mapped.filter(a => a.division === 'Lapanbelas Dekorasi');
                    setAppointments(filtered);
                } else {
                    const filtered = mapped.filter(a => a.division !== 'Studio Lapanbelas');
                    setAppointments(filtered);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchCalendarData();
    }, []);

    // Dapatkan list appointment yang terjadwal di tanggal tersebut
    const getAppointmentsForDate = (dateStr) => {
        return appointments.filter(appt => appt.event_date === dateStr || appt.resepsi_date === dateStr);
    };

    const getShiftedDate = (dateStr) => {
        if (mode === 'makeup') {
            const d = new Date(dateStr);
            d.setFullYear(d.getFullYear() + 10);
            return d.toISOString().split('T')[0];
        }
        if (mode === 'dekor') {
            const d = new Date(dateStr);
            d.setFullYear(d.getFullYear() + 20);
            return d.toISOString().split('T')[0];
        }
        return dateStr;
    };

    // Dapatkan status ketersediaan di database (termasuk nilai max_slots dinamis)
    const getAvailabilityForDate = (dateStr) => {
        const targetDate = getShiftedDate(dateStr);
        const found = availabilities.find(a => a.date === targetDate);
        return found ? found : { slots_booked: 0, is_manually_closed: false, max_slots: 3 };
    };

    // Merubah slot maksimal secara real-time
    const handleUpdateMaxSlots = async (dateStr, newMax) => {
        const targetDate = getShiftedDate(dateStr);
        const currentAvail = getAvailabilityForDate(dateStr);

        const payload = {
            date: targetDate,
            slots_booked: getAppointmentsForDate(dateStr).length,
            is_manually_closed: currentAvail.is_manually_closed || false,
            max_slots: newMax
        };

        const { error } = await supabase.from('date_availability').upsert([payload]);
        if (error) {
            onShowToast("Gagal mengubah limit slot: " + error.message, "error");
        } else {
            onShowToast(`Kapasitas slot berhasil diatur menjadi ${newMax}!`, "success");
            fetchCalendarData();
        }
    };

    const handleToggleClose = async (dateStr) => {
        const targetDate = getShiftedDate(dateStr);
        const currentAvail = getAvailabilityForDate(dateStr);
        const nextClosed = !currentAvail.is_manually_closed;

        const payload = {
            date: targetDate,
            slots_booked: getAppointmentsForDate(dateStr).length,
            is_manually_closed: nextClosed,
            max_slots: currentAvail.max_slots || 3
        };

        const { error } = await supabase.from('date_availability').upsert([payload]);
        if (error) {
            onShowToast("Gagal mengubah ketersediaan: " + error.message, "error");
        } else {
            onShowToast(nextClosed ? "Tanggal berhasil ditutup!" : "Tanggal dibuka kembali!", "success");
            fetchCalendarData();
        }
    };

    const renderCalendar = () => {
        if (loading) {
            return (
                <div className="flex-1 flex items-center justify-center py-20 text-gray-400">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3"></div>
                    Sedang memuat kalender...
                </div>
            );
        }

        const days = [];
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

        const headers = dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">{day}</div>
        ));

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty-day"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = formatDateString(year, month, i);
            const apptsOnDate = getAppointmentsForDate(dateStr);
            const avail = getAvailabilityForDate(dateStr);

            const bookedCount = apptsOnDate.length;
            const maxSlots = avail.max_slots || 3;
            const manuallyClosed = avail.is_manually_closed;
            const isSelected = selectedDate === dateStr;

            let statusClass = "status-available";
            let statusText = mode === 'studio' ? "Tersedia" : `${maxSlots - bookedCount} Tersisa`;

            if (manuallyClosed) {
                statusClass = "status-closed";
                statusText = "Ditutup Admin";
            } else if (mode === 'studio') {
                if (bookedCount > 0) {
                    statusClass = "status-filling";
                    statusText = `${bookedCount} Sesi`;
                }
            } else {
                if (bookedCount >= maxSlots) {
                    statusClass = "status-full";
                    statusText = "Penuh";
                } else if (bookedCount > 0) {
                    statusClass = "status-filling";
                }
            }

            days.push(
                <div key={i} onClick={() => setSelectedDate(dateStr)} className={`calendar-day ${isSelected ? 'selected' : ''}`}>
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-200">{i}</span>
                        {bookedCount > 0 && !manuallyClosed && mode !== 'studio' && (
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{bookedCount}/{maxSlots}</span>
                        )}
                    </div>
                    <div className="mt-2">
                        <div className={`slot-indicator ${statusClass} mb-1`}></div>
                        <p className="text-[9px] text-gray-400 truncate text-center">{statusText}</p>
                    </div>
                </div>
            );
        }

        const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];
        const selectedDateAvailability = selectedDate ? getAvailabilityForDate(selectedDate) : null;
        const selectedMaxSlots = selectedDateAvailability?.max_slots || 3;

        return (
            <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in">
                <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-white">{monthNames[month]} {year}</h3>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white"><SvgIcon name="chevron-left" className="w-5 h-5" /></button>
                            <button onClick={nextMonth} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white"><SvgIcon name="chevron-right" className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                        <div className="min-w-[420px]">
                            <div className="calendar-grid mb-2">{headers}</div>
                            <div className="calendar-grid flex-1 content-start">{days}</div>
                        </div>
                    </div>
                </div>

                {/* PANEL DETAILS KANAN */}
                <div className="w-full lg:w-96 glass-panel rounded-2xl p-6 flex flex-col shrink-0 text-left">
                    <h3 className="text-lg font-semibold border-b border-white/10 pb-4 mb-4 text-white">Manajemen Slot</h3>

                    {!selectedDate ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center">
                            <SvgIcon name="mouse-pointer-click" className="w-12 h-12 mb-3 opacity-50 text-gray-400" />
                            <p className="text-sm px-4">Pilih tanggal pada kalender untuk mengatur ketersediaan slot & melihat riwayat klien.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 max-h-[60vh] custom-scrollbar">
                            <div className="bg-white/5 p-4 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Tanggal Terpilih</p>
                                <p className="font-bold text-base text-blue-400 text-left">
                                    {formatSelectedDateUI(selectedDate)}
                                </p>
                            </div>

                            {/* ATUR SLOT MANUAL (Only for non-studio) */}
                            {mode !== 'studio' && (
                                <>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300 font-medium">Batas Maksimal Slot</span>
                                            <div className="flex items-center gap-3 bg-black/40 px-2 py-1.5 rounded-lg border border-white/10">
                                                <button
                                                    onClick={() => handleUpdateMaxSlots(selectedDate, Math.max(1, selectedMaxSlots - 1))}
                                                    className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 transition flex items-center justify-center text-white font-bold"
                                                    title="Kurangi Slot"
                                                >
                                                    -
                                                </button>
                                                <span className="font-bold text-white w-6 text-center text-sm">{selectedMaxSlots}</span>
                                                <button
                                                    onClick={() => handleUpdateMaxSlots(selectedDate, selectedMaxSlots + 1)}
                                                    className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 transition flex items-center justify-center text-white font-bold"
                                                    title="Tambah Slot"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-left leading-relaxed">
                                            Atur kapasitas booking harian secara fleksibel sesuai kesiapan tim di lapangan.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Status Tanggal</span>
                                            {selectedDateAvailability?.is_manually_closed ? (
                                                <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded font-semibold">Ditutup Manual</span>
                                            ) : selectedDateAppointments.length >= selectedMaxSlots ? (
                                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold">Penuh</span>
                                            ) : (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">Tersedia</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Slot Terisi (Klien)</span>
                                            <span className="font-bold text-white">{selectedDateAppointments.length} / {selectedMaxSlots}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {mode === 'studio' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-300">Status Tanggal</span>
                                        {selectedDateAvailability?.is_manually_closed ? (
                                            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded font-semibold">Ditutup Manual</span>
                                        ) : (
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">Tersedia</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-300">Total Sesi Terisi</span>
                                        <span className="font-bold text-white">{selectedDateAppointments.length}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => handleToggleClose(selectedDate)}
                                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${selectedDateAvailability?.is_manually_closed ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'}`}
                            >
                                <SvgIcon name={selectedDateAvailability?.is_manually_closed ? "unlock" : "lock"} className="w-3.5 h-3.5" />
                                {selectedDateAvailability?.is_manually_closed ? 'Buka Kembali Tanggal Ini' : 'Tutup Tanggal Ini'}
                            </button>

                            <div className="w-full h-px bg-white/10 my-1"></div>

                            {/* DAFTAR APPOINTMENT PADA TANGGAL TERPILIH */}
                            <div className="space-y-3 text-left">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Klien Terjadwal ({selectedDateAppointments.length})</h4>

                                {selectedDateAppointments.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-3 text-center bg-white/5 rounded-xl">Belum ada klien di tanggal ini.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedDateAppointments.map((appt) => (
                                            <div key={appt.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-1 text-left">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-xs text-gray-200">{appt.client_name}</span>
                                                    <span className="font-mono text-[9px] text-gray-400">{appt.id}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-blue-300">{appt.package_name}</span>
                                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${appt.status === 'Lunas' ? 'bg-green-500/10 text-green-400' :
                                                        appt.status === 'Sudah DP' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'
                                                        }`}>{appt.status}</span>
                                                </div>
                                                {(appt.jam_akad || appt.jam_resepsi) && (
                                                    <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-1">
                                                        <SvgIcon name="clock" className="w-3 h-3 text-gray-400" />
                                                        {appt.jam_akad && `Akad: ${appt.jam_akad.slice(0, 5)}`}
                                                        {appt.jam_resepsi && ` | Resepsi: ${appt.jam_resepsi.slice(0, 5)}`}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return renderCalendar();
}

function VoucherComponent() {
    const [vouchers, setVouchers] = React.useState([]);

    const fetchVouchers = async () => {
        const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Gagal load vouchers:", error.message);
        } else if (data) {
            setVouchers(data);
        }
    };

    React.useEffect(() => {
        fetchVouchers();
    }, []);

    const handleCreateVoucher = async (e) => {
        e.preventDefault();
        const code = e.target.code.value.trim().toUpperCase();
        const discount = Number(e.target.discount.value);
        const quota = Number(e.target.quota.value);

        if (code && discount > 0) {
            const { error } = await supabase.from('vouchers').insert([{ code, discount_amount: discount, quota, used_count: 0, is_active: true }]);
            if (error) {
                alert("Gagal membuat voucher: " + error.message);
            } else {
                e.target.reset();
                fetchVouchers();
            }
        }
    };

    const handleToggleVoucher = async (code, currentActive) => {
        const { error } = await supabase.from('vouchers').update({ is_active: !currentActive }).eq('code', code);
        if (error) {
            alert("Gagal merubah status voucher: " + error.message);
        } else {
            fetchVouchers();
        }
    };

    const handleDeleteVoucher = async (code) => {
        if (confirm("Hapus kode voucher ini?")) {
            const { error } = await supabase.from('vouchers').delete().eq('code', code);
            if (error) {
                alert("Gagal menghapus voucher: " + error.message);
            } else {
                fetchVouchers();
            }
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <form onSubmit={handleCreateVoucher} className="glass-panel rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Buat Voucher Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Kode Voucher</label>
                        <input type="text" name="code" required placeholder="Cth: 18STUDIO" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 uppercase text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Potongan Harga (Rp)</label>
                        <input type="number" name="discount" required placeholder="200000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Batas Kuota</label>
                        <input type="number" name="quota" required placeholder="50" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="w-full bg-white text-black hover:bg-gray-200 py-2 rounded-lg text-sm font-medium transition">Simpan Voucher</button>
                    </div>
                </div>
            </form>

            <div className="glass-panel rounded-2xl p-6 flex-1">
                <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-3">Daftar Voucher</h3>
                <div className="space-y-3">
                    {vouchers.map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-dashed border-white/20">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono text-lg font-bold text-yellow-400 tracking-wider">{v.code}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{v.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                </div>
                                <p className="text-sm text-gray-300">Potongan: {formatRupiah(v.discount_amount)}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <p className="text-xs text-gray-400">Terpakai: <span className="text-white font-medium">{v.used_count} / {v.quota}</span> kali</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleToggleVoucher(v.code, v.is_active)} className={`text-[10px] px-3 py-1.5 rounded transition ${v.is_active ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                                        {v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button onClick={() => handleDeleteVoucher(v.code)} className="text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded">Hapus</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {vouchers.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">Belum ada voucher yang aktif.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function SampleEmbedComponent() {
    const [portfolio, setPortfolio] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);

    const defaultForm = { title: '', type: 'video', url: '' };
    const [formData, setFormData] = React.useState(defaultForm);

    const parseUrls = (urlStr) => {
        if (!urlStr) return [];
        if (urlStr.trim().startsWith('[') && urlStr.trim().endsWith(']')) {
            try {
                return JSON.parse(urlStr);
            } catch (e) { }
        }
        return urlStr.split(/[\n,]+/).map(u => u.trim()).filter(u => u !== '');
    };

    const fetchPortfolio = async () => {
        const { data, error } = await supabase.from('portfolio').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Gagal load portfolio:", error.message);
        } else if (data) {
            setPortfolio(data);
        }
    };

    React.useEffect(() => {
        fetchPortfolio();
    }, []);

    const handleAddClick = () => {
        setEditId(null);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEditClick = (item) => {
        setEditId(item.id);
        let urlValue = item.url;
        if (item.type === 'photo') {
            const urls = parseUrls(item.url);
            urlValue = urls.join('\n');
        }
        setFormData({ title: item.title, type: item.type, url: urlValue });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus portfolio ini?")) {
            const { error } = await supabase.from('portfolio').delete().eq('id', id);
            if (error) {
                alert("Gagal menghapus portfolio: " + error.message);
            } else {
                fetchPortfolio();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let responseError = null;

        let cleanedUrl = formData.url;
        if (formData.type === 'photo') {
            const urls = formData.url.split(/[\n,]+/).map(u => u.trim()).filter(u => u !== '');
            cleanedUrl = urls.join(',');
        }

        const dbPayload = {
            title: formData.title,
            type: formData.type,
            url: cleanedUrl
        };

        if (editId) {
            const { error } = await supabase.from('portfolio').update(dbPayload).eq('id', editId);
            responseError = error;
        } else {
            const { error } = await supabase.from('portfolio').insert([dbPayload]);
            responseError = error;
        }

        if (responseError) {
            alert("Gagal menyimpan ke database: " + responseError.message);
        } else {
            setIsModalOpen(false);
            fetchPortfolio();
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Pengaturan Sample / Portofolio</h2>
                <button onClick={handleAddClick} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4 text-black" /> Tambah Media
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 flex items-center gap-2 text-white border-b border-white/10 pb-2"><SvgIcon name="youtube" className="w-5 h-5 text-red-500" /> Video Embeds</h3>
                    <div className="space-y-4">
                        {portfolio.filter(p => p.type === 'video').map((item, i) => (
                            <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-4 items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium mb-1 truncate">{item.title}</h4>
                                    <p className="text-[10px] text-gray-400 truncate">{item.url}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClick(item)} className="p-1 bg-white/10 hover:bg-white/20 rounded text-blue-400"><SvgIcon name="edit-2" className="w-3.5 h-3.5 text-blue-400" /></button>
                                    <button onClick={() => handleDeleteClick(item.id)} className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400"><SvgIcon name="trash-2" className="w-3.5 h-3.5 text-red-400" /></button>
                                </div>
                            </div>
                        ))}
                        {portfolio.filter(p => p.type === 'video').length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-4">Belum ada media video.</p>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 flex items-center gap-2 text-white border-b border-white/10 pb-2"><SvgIcon name="image" className="w-5 h-5 text-blue-400" /> Foto / Album</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {portfolio.filter(p => p.type === 'photo').map((item, i) => {
                            const urls = parseUrls(item.url);
                            const coverUrl = urls[0] || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=1000&auto=format&fit=crop';
                            return (
                                <div key={i} className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/20">
                                    <img src={coverUrl} className="w-full h-full object-cover" />
                                    {urls.length > 1 && (
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5 z-10 font-semibold shadow-lg">
                                            <SvgIcon name="image" className="w-3 h-3 text-white" />
                                            {urls.length}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center">
                                        <span className="text-white text-xs font-semibold mb-2.5 truncate max-w-full drop-shadow">{item.title}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditClick(item)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-blue-400"><SvgIcon name="edit-2" className="w-4 h-4 text-blue-400" /></button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400"><SvgIcon name="trash-2" className="w-4 h-4 text-red-400" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {portfolio.filter(p => p.type === 'photo').length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-4 col-span-2">Belum ada portofolio foto.</p>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Portofolio' : 'Tambah Portofolio Baru'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Judul Media *</label>
                                <input type="text" required placeholder="Cth: Cinematic Wedding Amanda" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Tipe Media *</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none text-white appearance-none">
                                    <option value="video">Video (YouTube URL / VIMEO)</option>
                                    <option value="photo">Foto (Unsplash / JPG URL)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                    URL Media * {formData.type === 'photo' && <span className="text-[10px] text-blue-400 ml-1">(Bisa lebih dari 1, pisahkan dengan koma/enter)</span>}
                                </label>
                                {formData.type === 'photo' ? (
                                    <textarea required placeholder="https://image1.jpg&#10;https://image2.jpg" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono min-h-[100px]"></textarea>
                                ) : (
                                    <input type="text" required placeholder="https://..." value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono" />
                                )}
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

function SettingComponent() {
    const [settings, setSettings] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchSettings = async () => {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) {
            console.error("Gagal load settings:", error.message);
        } else if (data) {
            const sMap = {};
            data.forEach(item => sMap[item.key] = item.value);
            setSettings(sMap);
        }
        setIsLoading(false);
    };

    React.useEffect(() => {
        fetchSettings();
    }, []);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        const studioName = e.target.studioName.value;
        const studioDescription = e.target.studioDescription.value;
        const adminWhatsapp = e.target.adminWhatsapp.value;
        const promoBannerActive = e.target.promoBannerActive.value;
        const promoBannerText = e.target.promoBannerText.value;
        const promoBannerTheme = e.target.promoBannerTheme.value;

        const { error } = await supabase.from('settings').upsert([
            { key: 'studio_name', value: studioName },
            { key: 'studio_description', value: studioDescription },
            { key: 'admin_whatsapp', value: adminWhatsapp },
            { key: 'promo_banner_active', value: promoBannerActive },
            { key: 'promo_banner_text', value: promoBannerText },
            { key: 'promo_banner_theme', value: promoBannerTheme }
        ]);

        if (error) {
            alert("Gagal menyimpan konfigurasi: " + error.message);
        } else {
            alert("Pengaturan Berhasil Disimpan ke Supabase!");
            fetchSettings();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-left w-full h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-400 ml-3">Memuat pengaturan...</span>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in max-w-3xl text-left">
            <h2 className="text-xl font-bold mb-6">Pengaturan Sistem</h2>

            <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 border-b border-white/10 pb-2">Informasi Studio</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Nama Aplikasi / Studio</label>
                            <input type="text" name="studioName" defaultValue={settings['studio_name'] || "18Studio"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Deskripsi Singkat (Tampil di layar login)</label>
                            <textarea name="studioDescription" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 min-h-[80px] text-white" defaultValue={settings['studio_description'] || "Capture your beautiful moments."}></textarea>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Nomor WhatsApp Admin</label>
                            <input type="text" name="adminWhatsapp" defaultValue={settings['admin_whatsapp'] || "6281234567890"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-white" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-md font-semibold mb-4 border-b border-white/10 pb-2 text-yellow-400 flex items-center gap-2">
                        <SvgIcon name="alert-circle" className="w-5 h-5 text-yellow-400" />
                        Pengaturan Banner Promo Berjalan (Homepage)
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Status Banner Promo</label>
                            <select name="promoBannerActive" defaultValue={settings['promo_banner_active'] || "false"} key={settings['promo_banner_active']} className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 text-white">
                                <option value="false">Tidak Aktif (Sembunyikan)</option>
                                <option value="true">Aktif (Tampilkan)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Teks Pengumuman Promo (Teks Berjalan)</label>
                            <textarea name="promoBannerText" defaultValue={settings['promo_banner_text'] || "🔥 Spesial Bulan Ini: Dapatkan potongan langsung dengan kode voucher 'LAPANBELAS18' saat checkout!"} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 min-h-[60px] text-white"></textarea>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Tema Desain Banner</label>
                            <select name="promoBannerTheme" defaultValue={settings['promo_banner_theme'] || "emerald_gold"} key={settings['promo_banner_theme']} className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 text-white">
                                <option value="emerald_gold">💚 Emerald Gold (Zamrud Emas)</option>
                                <option value="midnight_gold">🖤 Midnight Gold (Hitam Emas)</option>
                                <option value="crimson_passion">❤️ Crimson Passion (Merah Beludru)</option>
                                <option value="royal_violet">💜 Royal Violet (Ungu Kerajaan)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2 pb-10">
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium transition shadow-lg">
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </div>
    );
}


function UserManagementComponent({ onShowToast }) {
    const [users, setUsers] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);

    const [formData, setFormData] = React.useState({
        username: '',
        password: '',
        role: 'karyawan',
        display_name: ''
    });

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
        if (error) {
            onShowToast("Gagal memuat pengguna: " + error.message, "error");
        } else {
            setUsers(data || []);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editId) {
            const { error } = await supabase.from('admin_users').update({
                username: formData.username,
                password: formData.password,
                role: formData.role,
                display_name: formData.display_name
            }).eq('id', editId);

            if (error) {
                onShowToast("Gagal mengubah pengguna: " + error.message, "error");
            } else {
                onShowToast("Pengguna berhasil diubah!", "success");
                setIsModalOpen(false);
                fetchUsers();
            }
        } else {
            const { error } = await supabase.from('admin_users').insert([{
                username: formData.username,
                password: formData.password,
                role: formData.role,
                display_name: formData.display_name
            }]);

            if (error) {
                onShowToast("Gagal menambah pengguna: " + (error.message.includes('unique constraint') ? 'Username sudah digunakan' : error.message), "error");
            } else {
                onShowToast("Pengguna berhasil ditambahkan!", "success");
                setIsModalOpen(false);
                fetchUsers();
            }
        }
    };

    const handleDeleteClick = async (id, username) => {
        if (username === 'owner') {
            onShowToast("Akun owner utama tidak dapat dihapus!", "error");
            return;
        }
        if (confirm(`Yakin ingin menghapus akses untuk "${username}"?`)) {
            const { error } = await supabase.from('admin_users').delete().eq('id', id);
            if (error) {
                onShowToast("Gagal menghapus pengguna: " + error.message, "error");
            } else {
                onShowToast("Pengguna berhasil dihapus!", "success");
                fetchUsers();
            }
        }
    };

    const openAddModal = () => {
        setEditId(null);
        setFormData({ username: '', password: '', role: 'karyawan', display_name: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditId(user.id);
        setFormData({
            username: user.username,
            password: user.password,
            role: user.role,
            display_name: user.display_name
        });
        setIsModalOpen(true);
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full relative text-left">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Manajemen Akses</h2>
                    <p className="text-xs text-gray-400 mt-1">Kelola akun admin dan editor untuk login ke dashboard.</p>
                </div>
                <button onClick={openAddModal} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-lg flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4" /> Tambah Akun
                </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 bg-black/40 uppercase border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Display Name</th>
                                <th className="px-6 py-4 font-semibold">Username</th>
                                <th className="px-6 py-4 font-semibold">Role / Hak Akses</th>
                                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                    <td className="px-6 py-4 text-white font-medium">{user.display_name}</td>
                                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                            user.role === 'editor_foto' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                user.role === 'editor_video' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                                    user.role === 'makeup' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                        user.role === 'studio' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                            user.role === 'dekor' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openEditModal(user)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition" title="Edit">
                                            <SvgIcon name="edit-2" className="w-4 h-4" />
                                        </button>
                                        {user.username !== 'owner' && (
                                            <button onClick={() => handleDeleteClick(user.id, user.username)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Hapus">
                                                <SvgIcon name="trash-2" className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-sm">Belum ada data pengguna.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200 mb-4 leading-relaxed">
                            <strong className="text-blue-400 block mb-1">Penting:</strong>
                            Anda <b>wajib</b> mendaftarkan email dan password ini di menu <i>Authentication</i> pada Dashboard Supabase Anda agar user ini bisa login.
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Tampilan (Display Name) *</label>
                                <input type="text" required placeholder="Cth: Bagas (Editor)" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Email Login (Harus sama dengan di Supabase) *</label>
                                <input type="email" required placeholder="Cth: editor@lapanbelas.id" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Password *</label>
                                <input type="text" required placeholder="Masukkan password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Peran (Role) *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {[
                                        { value: 'owner', label: 'Owner (Full Akses)' },
                                        { value: 'admin', label: 'Admin Pusat' },
                                        { value: 'karyawan', label: 'Karyawan (Semua)' },
                                        { value: 'editor_foto', label: 'Editor Foto Khusus' },
                                        { value: 'editor_foto_studio', label: 'Editor Foto Studio' },
                                        { value: 'editor_video', label: 'Editor Video Khusus' },
                                        { value: 'makeup', label: 'Lady Makeup (Rias)' },
                                        { value: 'studio', label: 'Studio Lapanbelas' },
                                        { value: 'dekor', label: 'Lapanbelas Dekorasi' }
                                    ].map(r => (
                                        <label key={r.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 bg-gray-900 border-white/10 rounded text-blue-500 focus:ring-blue-500 focus:ring-2"
                                                checked={formData.role ? formData.role.split(',').map(x => x.trim()).includes(r.value) : false}
                                                onChange={(e) => {
                                                    let roles = formData.role ? formData.role.split(',').map(x => x.trim()).filter(x => x) : [];
                                                    if (e.target.checked) roles.push(r.value);
                                                    else roles = roles.filter(x => x !== r.value);
                                                    setFormData({ ...formData, role: roles.join(',') });
                                                }}
                                            />
                                            {r.label}
                                        </label>
                                    ))}
                                </div>
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

function JadwalRiasComponent({ onShowToast, session }) {
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [filterEvent, setFilterEvent] = React.useState('Semua');
    const [loading, setLoading] = React.useState(true);
    const [isChecklistModalOpen, setIsChecklistModalOpen] = React.useState(false);
    const [selectedAppt, setSelectedAppt] = React.useState(null);

    // Modal checklist states
    const [busana, setBusana] = React.useState('');
    const [aksesoris, setAksesoris] = React.useState('');
    const [catatanRias, setCatatanRias] = React.useState('');
    const [statusFitting, setStatusFitting] = React.useState('Menunggu Fitting');
    const [ukuranBajuPria, setUkuranBajuPria] = React.useState('');
    const [ukuranBajuWanita, setUkuranBajuWanita] = React.useState('');
    const [ukuranCelanaPria, setUkuranCelanaPria] = React.useState('');
    const [keteranganUkuran, setKeteranganUkuran] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    // Inline edit date state
    const [editingDateId, setEditingDateId] = React.useState(null);
    const [tempFittingDate, setTempFittingDate] = React.useState('');

    const parseNotesField = (notesStr) => {
        let prewedDate = '';
        let selectedAddonNames = [];
        let voucherCode = '';
        let customFees = [];
        let keterangan = '';
        let div = 'lapanbelas.id';
        let namaPria = ''; let namaWanita = ''; let jamSesi = ''; let roomStudio = '';
        let photographer = ''; let durasiSesi = ''; let jadwalFitting = '';
        let jadwalSurvei = ''; let jadwalPemasangan = '';
        let hasilFitting = '';
        let statusFitting = 'Menunggu Fitting';
        let fittingChecklist = '{}';

        if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist };

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
        const durasiSesiMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/);
        if (durasiSesiMatch) durasiSesi = durasiSesiMatch[1].trim();
        const jadwalFittingMatch = notesStr.match(/\[JADWAL FITTING\]:\s*([^\n]+)/);
        if (jadwalFittingMatch) jadwalFitting = jadwalFittingMatch[1].trim();
        const jadwalSurveiMatch = notesStr.match(/\[JADWAL SURVEI\]:\s*([^\n]+)/);
        if (jadwalSurveiMatch) jadwalSurvei = jadwalSurveiMatch[1].trim();
        const jadwalPemasanganMatch = notesStr.match(/\[JADWAL PEMASANGAN\]:\s*([^\n]+)/);
        if (jadwalPemasanganMatch) jadwalPemasangan = jadwalPemasanganMatch[1].trim();

        const hasilFittingMatch = notesStr.match(/\[HASIL FITTING\]:\s*([^\n]+)/);
        if (hasilFittingMatch) hasilFitting = hasilFittingMatch[1].trim();
        const statusFittingMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
        if (statusFittingMatch) statusFitting = statusFittingMatch[1].trim();
        const fittingChecklistMatch = notesStr.match(/\[FITTING CHECKLIST\]:\s*([^\n]+)/);
        if (fittingChecklistMatch) fittingChecklist = fittingChecklistMatch[1].trim();

        const prewedDateMatch = notesStr.match(/\[TANGGAL PREWED\]:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (prewedDateMatch) prewedDate = prewedDateMatch[1];
        const voucherMatch = notesStr.match(/\[VOUCHER\]:\s*([A-Za-z0-9_-]+)/);
        if (voucherMatch) voucherCode = voucherMatch[1];

        const addonMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/);
        if (addonMatch) {
            addonMatch[1].split('\n').forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                if (cleanLine) {
                    const detailMatch = cleanLine.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (detailMatch) {
                        selectedAddonNames.push(detailMatch[1].trim());
                    } else {
                        selectedAddonNames.push(cleanLine);
                    }
                }
            });
        }

        const feesMatch = notesStr.match(/\[BIAYA LAINNYA\]:\s*\n?((?:- .*\n?)*)/);
        if (feesMatch) {
            feesMatch[1].split('\n').forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                if (cleanLine) {
                    const detailMatch = cleanLine.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (detailMatch) {
                        customFees.push({ description: detailMatch[1].trim(), amount: Number(detailMatch[2].replace(/\./g, '')) });
                    }
                }
            });
        }

        const ketMatch = notesStr.match(/\[KETERANGAN TAMBAHAN\]:\s*\n?([\s\S]*)$/);
        keterangan = ketMatch ? ketMatch[1].trim() : notesStr
            .replace(/\[DIVISI\]:.*?\n*/g, '')
            .replace(/\[NAMA PRIA\]:.*?\n*/g, '')
            .replace(/\[NAMA WANITA\]:.*?\n*/g, '')
            .replace(/\[JAM (?:SESI|PHOTOSHOOT)\]:.*?\n*/g, '')
            .replace(/\[ROOM STUDIO\]:.*?\n*/g, '')
            .replace(/\[PHOTOGRAPHER\]:.*?\n*/g, '')
            .replace(/\[DURASI SESI\]:.*?\n*/g, '')
            .replace(/\[JADWAL FITTING\]:.*?\n*/g, '')
            .replace(/\[JADWAL SURVEI\]:.*?\n*/g, '')
            .replace(/\[JADWAL PEMASANGAN\]:.*?\n*/g, '')
            .replace(/\[HASIL FITTING\]:.*?\n*/g, '')
            .replace(/\[STATUS FITTING\]:.*?\n*/g, '')
            .replace(/\[FITTING CHECKLIST\]:.*?\n*/g, '')
            .replace(/\[TANGGAL PREWED\]:.*?\n*/g, '')
            .replace(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[VOUCHER\]:.*?\n*/g, '')
            .replace(/\[BIAYA LAINNYA\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[KETERANGAN TAMBAHAN\]:\s*\n?/g, '')
            .trim();

        return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist };
    };

    const fetchLadyMakeupData = async () => {
        setLoading(true);
        try {
            const { data: appts, error: err1 } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
            const { data: pkgs, error: err2 } = await supabase.from('packages').select('*');
            if (err1) console.error(err1);
            if (err2) console.error(err2);

            if (appts && pkgs) {
                setPackages(pkgs);
                const pkgMap = {};
                pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mapped = appts.map(a => {
                    const pkg = pkgMap[a.package_name];
                    const division = getPackageDivision(pkg);
                    return { ...a, division, packages: pkg };
                });

                // Filter only appointments relevant to Lady Makeup
                const filtered = mapped.filter(a => {
                    const div = a.division;
                    if (div === 'Lady Makeup') return true;
                    // Check if package or category includes bundling
                    const pkgTitle = (a.package_name || '').toLowerCase();
                    const pkgCat = (a.packages?.category || '').toLowerCase();
                    const hasMakeupNotes = a.additional_notes && a.additional_notes.toLowerCase().includes('makeup');
                    return pkgTitle.includes('bundling') || pkgCat.includes('bundling') || hasMakeupNotes;
                });
                setAppointments(filtered);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchLadyMakeupData();

        const channel = supabase
            .channel('lady-makeup-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchLadyMakeupData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleOpenChecklistModal = (appt) => {
        setSelectedAppt(appt);
        const parsed = parseNotesField(appt.additional_notes);
        let checklist = {};
        try {
            checklist = JSON.parse(parsed.fittingChecklist || '{}');
        } catch (e) { }

        setBusana(checklist.busana || '');
        setAksesoris(checklist.aksesoris || '');
        setCatatanRias(checklist.catatanRias || '');
        setUkuranBajuPria(checklist.ukuranBajuPria || '');
        setUkuranBajuWanita(checklist.ukuranBajuWanita || '');
        setUkuranCelanaPria(checklist.ukuranCelanaPria || '');
        setKeteranganUkuran(checklist.keteranganUkuran || '');

        // Set fitting status: use saved one, or derive based on whether hasilFitting is filled
        setStatusFitting(parsed.statusFitting || (parsed.hasilFitting ? 'Selesai Fitting' : 'Menunggu Fitting'));
        setIsChecklistModalOpen(true);
    };

    const handleSaveChecklist = async (e) => {
        e.preventDefault();
        if (!selectedAppt) return;
        setSaving(true);

        try {
            const parsed = parseNotesField(selectedAppt.additional_notes);
            parsed.hasilFitting = (busana || aksesoris) ? `${busana}${aksesoris ? ', ' + aksesoris : ''}` : '';
            parsed.statusFitting = statusFitting;

            const checklistObj = { busana, aksesoris, catatanRias, ukuranBajuPria, ukuranBajuWanita, ukuranCelanaPria, keteranganUkuran };
            parsed.fittingChecklist = JSON.stringify(checklistObj);

            let newNotes = `[DIVISI]: ${parsed.div || 'Lady Makeup'}\n\n`;
            if (parsed.jadwalFitting) newNotes += `[JADWAL FITTING]: ${parsed.jadwalFitting}\n\n`;
            if (parsed.hasilFitting) newNotes += `[HASIL FITTING]: ${parsed.hasilFitting}\n\n`;
            if (parsed.statusFitting) newNotes += `[STATUS FITTING]: ${parsed.statusFitting}\n\n`;
            newNotes += `[FITTING CHECKLIST]: ${parsed.fittingChecklist}\n\n`;

            if (parsed.namaPria) newNotes += `[NAMA PRIA]: ${parsed.namaPria}\n`;
            if (parsed.namaWanita) newNotes += `[NAMA WANITA]: ${parsed.namaWanita}\n`;
            if (parsed.namaPria || parsed.namaWanita) newNotes += `\n`;

            if (parsed.selectedAddonNames && parsed.selectedAddonNames.length > 0) {
                newNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + parsed.selectedAddonNames.map(name => `- ${name}`).join('\n') + `\n\n`;
            }
            if (parsed.voucherCode) newNotes += `[VOUCHER]: ${parsed.voucherCode}\n\n`;
            if (parsed.customFees && parsed.customFees.length > 0) {
                newNotes += `[BIAYA LAINNYA]:\n` + parsed.customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
            }
            if (parsed.keterangan) newNotes += `[KETERANGAN TAMBAHAN]:\n${parsed.keterangan}`;

            const { error } = await supabase
                .from('appointments')
                .update({ additional_notes: newNotes.trim() })
                .eq('id', selectedAppt.id);

            if (error) {
                onShowToast("Gagal menyimpan checklist: " + error.message, "error");
            } else {
                onShowToast("Checklist fitting berhasil disimpan!", "success");
                setIsChecklistModalOpen(false);
                fetchLadyMakeupData();
            }
        } catch (err) {
            onShowToast("Terjadi kesalahan: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFittingDateInline = async (apptId, currentNotes, newDate) => {
        try {
            const parsed = parseNotesField(currentNotes);
            parsed.jadwalFitting = newDate;

            if (parsed.statusFitting === 'Menunggu Fitting' || !parsed.statusFitting) {
                parsed.statusFitting = 'Jadwal Fitting Dikirim';
            }

            let newNotes = `[DIVISI]: ${parsed.div || 'Lady Makeup'}\n\n`;
            if (parsed.jadwalFitting) newNotes += `[JADWAL FITTING]: ${parsed.jadwalFitting}\n\n`;
            if (parsed.hasilFitting) newNotes += `[HASIL FITTING]: ${parsed.hasilFitting}\n\n`;
            if (parsed.statusFitting) newNotes += `[STATUS FITTING]: ${parsed.statusFitting}\n\n`;
            if (parsed.fittingChecklist && parsed.fittingChecklist !== '{}') newNotes += `[FITTING CHECKLIST]: ${parsed.fittingChecklist}\n\n`;

            if (parsed.namaPria) newNotes += `[NAMA PRIA]: ${parsed.namaPria}\n`;
            if (parsed.namaWanita) newNotes += `[NAMA WANITA]: ${parsed.namaWanita}\n`;
            if (parsed.namaPria || parsed.namaWanita) newNotes += `\n`;

            if (parsed.selectedAddonNames && parsed.selectedAddonNames.length > 0) {
                newNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + parsed.selectedAddonNames.map(name => `- ${name}`).join('\n') + `\n\n`;
            }
            if (parsed.voucherCode) newNotes += `[VOUCHER]: ${parsed.voucherCode}\n\n`;
            if (parsed.customFees && parsed.customFees.length > 0) {
                newNotes += `[BIAYA LAINNYA]:\n` + parsed.customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
            }
            if (parsed.keterangan) newNotes += `[KETERANGAN TAMBAHAN]:\n${parsed.keterangan}`;

            const { error } = await supabase
                .from('appointments')
                .update({ additional_notes: newNotes.trim() })
                .eq('id', apptId);

            if (error) {
                onShowToast("Gagal menyimpan tanggal fitting: " + error.message, "error");
            } else {
                onShowToast("Tanggal fitting berhasil diupdate!", "success");
                setEditingDateId(null);
                fetchLadyMakeupData();
            }
        } catch (err) {
            onShowToast("Error: " + err.message, "error");
        }
    };

    const startEditingDate = (apptId, currentDate) => {
        setEditingDateId(apptId);
        setTempFittingDate(currentDate || '');
    };

    const getEventCategory = (appt) => {
        const pkgCat = appt.packages?.category || '';
        if (pkgCat.startsWith('Lady Makeup:')) {
            return pkgCat.replace('Lady Makeup: ', '');
        }
        return 'Wedding';
    };

    // Filter appointments based on filterEvent dropdown
    const filteredAppts = appointments.filter(appt => {
        if (filterEvent === 'Semua') return true;
        const cat = getEventCategory(appt);
        return cat.toLowerCase() === filterEvent.toLowerCase();
    });

    return (
        <div className="animate-in fade-in flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                        <SvgIcon name="wand-sparkles" className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">SOP Divisi Makeup</h2>
                        <p className="text-xs text-gray-400">Manajemen jadwal fitting, checklist busana & kelengkapan rias</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Filter Acara:</span>
                        <select
                            value={filterEvent}
                            onChange={e => setFilterEvent(e.target.value)}
                            className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white appearance-none cursor-pointer"
                        >
                            <option value="Semua">Semua</option>
                            <option value="Akad">Akad</option>
                            <option value="Resepsi">Resepsi</option>
                            <option value="Akad + Resepsi">Akad + Resepsi</option>
                            <option value="Lamaran">Lamaran</option>
                            <option value="Tasyakuran">Tasyakuran</option>
                            <option value="Photoshoot">Photoshoot</option>
                        </select>
                    </div>
                    <button
                        onClick={() => navigateTo('appointment', { openAdd: true })}
                        className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition duration-200 flex items-center gap-2 shadow-lg shadow-pink-600/10"
                    >
                        <span className="text-lg font-light leading-none">+</span> Appointment Mandiri
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin inline-block w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full"></span>
                </div>
            ) : filteredAppts.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border border-white/5">
                    <SvgIcon name="clipboard-x" className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm font-medium">Belum ada jadwal rias / fitting untuk kategori terpilih.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredAppts.map(appt => {
                        const parsed = parseNotesField(appt.additional_notes);
                        const isStandalone = appt.division === 'Lady Makeup';
                        const currentStatus = parsed.statusFitting || (parsed.hasilFitting ? 'Selesai Fitting' : 'Menunggu Fitting');

                        return (
                            <div key={appt.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 hover:border-pink-500/20 transition-all duration-300 relative group overflow-hidden">
                                {/* Accent side border */}
                                <div className={`absolute left-0 inset-y-0 w-1 ${currentStatus === 'Selesai Fitting' ? 'bg-emerald-500' : 'bg-pink-500'}`}></div>

                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            {appt.client_name}
                                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${isStandalone ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                                {isStandalone ? 'MANDIRI' : 'BUNDLING PUSAT'}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{appt.id} | Paket: {appt.package_name}</p>
                                    </div>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${currentStatus === 'Selesai Fitting'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                        }`}>
                                        {currentStatus}
                                    </span>
                                </div>

                                <div className="bg-white/2 p-4 rounded-xl space-y-3 text-xs pl-4 border border-white/5">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Hari H:</span>
                                        <span className="font-semibold text-white">
                                            {(() => {
                                                if (!appt.event_date) return '-';
                                                try {
                                                    const d = new Date(appt.event_date);
                                                    return isNaN(d.getTime()) ? appt.event_date : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                } catch (e) {
                                                    return appt.event_date;
                                                }
                                            })()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>1. Jadwal Fitting:</span>
                                        {editingDateId === appt.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={tempFittingDate}
                                                    onChange={e => setTempFittingDate(e.target.value)}
                                                    className="bg-gray-900 border border-white/20 rounded-md px-2 py-1 text-xs outline-none focus:border-pink-500 text-white [color-scheme:dark]"
                                                />
                                                <button
                                                    onClick={() => handleSaveFittingDateInline(appt.id, appt.additional_notes, tempFittingDate)}
                                                    className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 border border-emerald-500/30"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => setEditingDateId(null)}
                                                    className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 border border-red-500/30"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-white flex items-center gap-2">
                                                {(() => {
                                                    if (!parsed.jadwalFitting) return '-';
                                                    try {
                                                        const d = new Date(parsed.jadwalFitting);
                                                        return isNaN(d.getTime()) ? parsed.jadwalFitting : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                    } catch (e) {
                                                        return parsed.jadwalFitting;
                                                    }
                                                })()}
                                                <button
                                                    onClick={() => startEditingDate(appt.id, parsed.jadwalFitting)}
                                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition border border-white/5"
                                                    title="Edit Tanggal"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" /></svg>
                                                </button>
                                                {parsed.jadwalFitting && (
                                                    <button
                                                        onClick={async () => {
                                                            let formattedDate = parsed.jadwalFitting;
                                                            try {
                                                                const dateObj = new Date(parsed.jadwalFitting);
                                                                if (!isNaN(dateObj.getTime())) {
                                                                    formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                                }
                                                            } catch (e) { }
                                                            const waText = `Halo Kak ${appt.client_name}\nmimin dari Lady Makeup.\n\nBerikut adalah jadwal fitting Kakak:\nTanggal: ${formattedDate}\nLokasi: Galery Lady makeup ( Aceh Tamiang )\n\nMohon konfirmasi kehadirannya ya Kak. Terima kasih!`;
                                                            let phone = appt.client_phone || '';
                                                            if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                                                            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;

                                                            // Change status to Jadwal Fitting Dikirim if it's currently Menunggu Fitting
                                                            if (parsed.statusFitting === 'Menunggu Fitting' || !parsed.statusFitting) {
                                                                try {
                                                                    const updatedParsed = { ...parsed, statusFitting: 'Jadwal Fitting Dikirim' };
                                                                    let newNotes = `[DIVISI]: ${updatedParsed.div || 'Lady Makeup'}\n\n`;
                                                                    if (updatedParsed.jadwalFitting) newNotes += `[JADWAL FITTING]: ${updatedParsed.jadwalFitting}\n\n`;
                                                                    if (updatedParsed.hasilFitting) newNotes += `[HASIL FITTING]: ${updatedParsed.hasilFitting}\n\n`;
                                                                    if (updatedParsed.statusFitting) newNotes += `[STATUS FITTING]: ${updatedParsed.statusFitting}\n\n`;
                                                                    if (updatedParsed.fittingChecklist && updatedParsed.fittingChecklist !== '{}') newNotes += `[FITTING CHECKLIST]: ${updatedParsed.fittingChecklist}\n\n`;
                                                                    if (updatedParsed.namaPria) newNotes += `[NAMA PRIA]: ${updatedParsed.namaPria}\n`;
                                                                    if (updatedParsed.namaWanita) newNotes += `[NAMA WANITA]: ${updatedParsed.namaWanita}\n`;
                                                                    if (updatedParsed.namaPria || updatedParsed.namaWanita) newNotes += `\n`;
                                                                    if (updatedParsed.selectedAddonNames && updatedParsed.selectedAddonNames.length > 0) {
                                                                        newNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + updatedParsed.selectedAddonNames.map(name => `- ${name}`).join('\n') + `\n\n`;
                                                                    }
                                                                    if (updatedParsed.voucherCode) newNotes += `[VOUCHER]: ${updatedParsed.voucherCode}\n\n`;
                                                                    if (updatedParsed.customFees && updatedParsed.customFees.length > 0) {
                                                                        newNotes += `[BIAYA LAINNYA]:\n` + updatedParsed.customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
                                                                    }
                                                                    if (updatedParsed.keterangan) newNotes += `[KETERANGAN TAMBAHAN]:\n${updatedParsed.keterangan}`;

                                                                    await supabase
                                                                        .from('appointments')
                                                                        .update({ additional_notes: newNotes.trim() })
                                                                        .eq('id', appt.id);
                                                                    fetchLadyMakeupData();
                                                                } catch (e) { console.error('Status update error', e); }
                                                            }
                                                            window.open(waUrl, '_blank');
                                                        }}
                                                        className="p-1 bg-green-500/20 hover:bg-green-500/30 rounded text-green-400 transition border border-green-500/30 flex items-center gap-1.5 px-2.5"
                                                        title="Kirim Jadwal via WhatsApp"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                                        <span className="text-[10px] font-bold">Kirim WA</span>
                                                    </button>
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                                        <span className="text-gray-400 block">2. Hasil Fitting & Properti:</span>
                                        <p className="text-white font-medium italic pl-1 leading-relaxed">
                                            {parsed.hasilFitting || 'Belum ada data / Belum fitting'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pl-2">
                                    <button
                                        onClick={() => handleOpenChecklistModal(appt)}
                                        className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/5 border border-pink-500/20"
                                    >
                                        ✓ Isi Checklist Fitting
                                    </button>
                                    {parsed.hasilFitting && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    onShowToast("Menyiapkan PDF...", "info");
                                                    const res = await fetch('/api/fitting-pdf-generate', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(appt)
                                                    });
                                                    if (!res.ok) throw new Error('Gagal memuat PDF');
                                                    const blob = await res.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    window.open(url, '_blank');
                                                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                                                } catch (e) {
                                                    onShowToast(e.message, "error");
                                                }
                                            }}
                                            className="flex-1 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 border border-blue-500/20"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                            Lihat PDF Hasil Fitting
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isChecklistModalOpen && selectedAppt && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 overflow-y-auto max-h-[90vh] custom-scrollbar text-left">
                        <button onClick={() => setIsChecklistModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-1">Checklist Fitting Busana</h3>
                        <p className="text-xs text-gray-400 mb-6">Client: {selectedAppt.client_name} ({selectedAppt.id})</p>

                        <form onSubmit={handleSaveChecklist} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-400 block mb-1">Pilihan Busana / Kebaya *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Cth: Kebaya Putih Modern, Gaun Satin"
                                        value={busana}
                                        onChange={e => setBusana(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-400 block mb-1">Aksesoris / Kelengkapan (Opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="Cth: Siger Sunda, Melati, Veils, Mahkota"
                                        value={aksesoris}
                                        onChange={e => setAksesoris(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-400 block mb-1">Catatan Rias / Request MUA</label>
                                    <textarea
                                        placeholder="Cth: Request makeup soft glam, no cukur alis"
                                        value={catatanRias}
                                        onChange={e => setCatatanRias(e.target.value)}
                                        rows="2"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white resize-none"
                                    ></textarea>
                                </div>

                                <div className="col-span-2 border-t border-white/5 pt-3">
                                    <p className="text-xs font-semibold text-pink-400 mb-2 uppercase tracking-wider">📏 Ukuran & Keterangan</p>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Ukuran Baju Pria</label>
                                    <select value={ukuranBajuPria} onChange={e => setUkuranBajuPria(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-pink-500 text-white appearance-none cursor-pointer">
                                        <option value="" className="bg-gray-900">- Pilih -</option>
                                        <option value="S" className="bg-gray-900">S</option>
                                        <option value="M" className="bg-gray-900">M</option>
                                        <option value="L" className="bg-gray-900">L</option>
                                        <option value="XL" className="bg-gray-900">XL</option>
                                        <option value="XXL" className="bg-gray-900">XXL</option>
                                        <option value="XXXL" className="bg-gray-900">XXXL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Ukuran Baju Wanita</label>
                                    <select value={ukuranBajuWanita} onChange={e => setUkuranBajuWanita(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-pink-500 text-white appearance-none cursor-pointer">
                                        <option value="" className="bg-gray-900">- Pilih -</option>
                                        <option value="S" className="bg-gray-900">S</option>
                                        <option value="M" className="bg-gray-900">M</option>
                                        <option value="L" className="bg-gray-900">L</option>
                                        <option value="XL" className="bg-gray-900">XL</option>
                                        <option value="XXL" className="bg-gray-900">XXL</option>
                                        <option value="XXXL" className="bg-gray-900">XXXL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 block mb-1">Ukuran Celana Pria</label>
                                    <select value={ukuranCelanaPria} onChange={e => setUkuranCelanaPria(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-pink-500 text-white appearance-none cursor-pointer">
                                        <option value="" className="bg-gray-900">- Pilih -</option>
                                        <option value="S" className="bg-gray-900">S</option>
                                        <option value="M" className="bg-gray-900">M</option>
                                        <option value="L" className="bg-gray-900">L</option>
                                        <option value="XL" className="bg-gray-900">XL</option>
                                        <option value="XXL" className="bg-gray-900">XXL</option>
                                        <option value="XXXL" className="bg-gray-900">XXXL</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[11px] text-gray-400 block mb-1">Keterangan Tambahan / Custom Ukuran</label>
                                    <textarea
                                        placeholder="Cth: Celana pria di potong sedikit, ukuran pria: M tapi dada L..."
                                        value={keteranganUkuran}
                                        onChange={e => setKeteranganUkuran(e.target.value)}
                                        rows="2"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 text-white resize-none"
                                    ></textarea>
                                </div>

                                <div className="col-span-2 border-t border-white/5 pt-3">
                                    <label className="text-xs text-gray-400 block mb-1.5">Status Fitting *</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-xs cursor-pointer text-white">
                                            <input
                                                type="radio"
                                                name="statusFitting"
                                                value="Menunggu Fitting"
                                                checked={statusFitting === 'Menunggu Fitting'}
                                                onChange={() => setStatusFitting('Menunggu Fitting')}
                                                className="accent-pink-500 w-4 h-4 cursor-pointer"
                                            />
                                            Menunggu Fitting
                                        </label>
                                        <label className="flex items-center gap-2 text-xs cursor-pointer text-white">
                                            <input
                                                type="radio"
                                                name="statusFitting"
                                                value="Selesai Fitting"
                                                checked={statusFitting === 'Selesai Fitting'}
                                                onChange={() => setStatusFitting('Selesai Fitting')}
                                                className="accent-pink-500 w-4 h-4 cursor-pointer"
                                            />
                                            Selesai Fitting
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsChecklistModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition text-gray-400"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-pink-500/20"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Checklist'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function LoginComponent({ onLogin }) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const [isLoading, setIsLoading] = React.useState(false);
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password
            });

            if (error || !data.session) {
                setError('Email atau password salah.');
            } else {
                // Ambil role dari tabel admin_users berdasarkan email
                const { data: dbUser } = await supabase
                    .from('admin_users')
                    .select('*')
                    .eq('username', data.user.email)
                    .single();

                let role = 'karyawan';
                let displayName = data.user.email;

                if (dbUser) {
                    role = dbUser.role;
                    displayName = dbUser.display_name;
                } else if (data.user.email === 'admin@lapanbelas.id' || data.user.email === 'owner@lapanbelas.id' || data.user.email === 'andresindo6@gmail.com') {
                    role = 'owner';
                    displayName = 'Owner';
                }

                onLogin({ role: role, username: displayName });
            }
        } catch (err) {
            setError('Gagal menghubungi server. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-[#0a0a0c] relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="glass-panel p-8 rounded-3xl w-full max-w-sm z-10 border border-white/10 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-wider uppercase mb-2">18Studio</h1>
                    <p className="text-sm text-gray-400">Admin Dashboard Login</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1.5 ml-1">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                                <SvgIcon name="user" className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 text-white transition-colors placeholder:text-gray-600"
                                placeholder="Email Admin"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1.5 ml-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                                <SvgIcon name="lock" className="w-4 h-4" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 text-white transition-colors placeholder:text-gray-600"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-medium transition shadow-lg mt-4">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}

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
                    const division = getPackageDivision(pkg);

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
                    if (jamMatch) jamSesi = jamMatch[1].trim();

                    const durasiMatch = notesStr.match(/\[DURASI SESI\]:\s*([^\n]+)/);
                    if (durasiMatch) durasiSesi = parseInt(durasiMatch[1].trim(), 10) || 45;

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
        } catch (err) {
            onShowToast("Gagal mengassign fotografer", "error");
        }
    };

    const handleOpenPindahModal = (appt) => {
        setPindahRoomAppt(appt);
        setTargetRoomName(appt.roomStudio || '');
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
                                <div className="flex-1 space-y-3 p-4 overflow-y-auto max-h-[500px] custom-scrollbar flex flex-col">
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
                                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[40vh] custom-scrollbar">
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
                const parsed = data.map(appt => {
                    const notesStr = appt.additional_notes || '';
                    const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/i);
                    const divisi = divisiMatch ? divisiMatch[1].trim().toLowerCase() : '';

                    const roomMatch = notesStr.match(/\[ROOM STUDIO\]:\s*([^\n]+)/);
                    const roomStudio = roomMatch ? roomMatch[1].trim() : '';

                    // Hanya masukkan jika divisi adalah studio atau jika ada spesifikasi Room Studio
                    if (!divisi.includes('studio') && !roomStudio) {
                        return null;
                    }

                    let jamSesi = '';
                    let durasiSesi = 45; // default
                    const jamMatch = notesStr.match(/\[JAM (?:SESI|PHOTOSHOOT)\]:\s*([^\n]+)/);
                    if (jamMatch) jamSesi = jamMatch[1].trim();
                    const durasiMatch = notesStr.match(/\[DURASI SESI\]:\s*([0-9]+)\s*Menit/i);
                    if (durasiMatch) durasiSesi = parseInt(durasiMatch[1].trim(), 10);

                    return {
                        id: appt.id,
                        name: appt.client_name,
                        pkg: appt.package_name,
                        eventDate: appt.event_date,
                        jam: jamSesi,
                        room: roomStudio,
                        durasi: durasiSesi
                    };
                }).filter(Boolean);

                // Sort by time
                parsed.sort((a, b) => a.jam.localeCompare(b.jam));

                setAppointments(parsed);

                // Sync with local storage
                const stored = localStorage.getItem('studio_queue');
                let parsedStored = [];
                if (stored) {
                    try { parsedStored = JSON.parse(stored); } catch (e) { }
                }

                const newQueueState = {};
                parsed.forEach(p => {
                    const existing = parsedStored.find(s => s.id === p.id);
                    if (existing && existing.statusObj) {
                        newQueueState[p.id] = existing.statusObj;
                    } else if (existing) {
                        newQueueState[p.id] = { status: existing.status || 'Menunggu', activeSince: existing.activeSince || null };
                    } else {
                        newQueueState[p.id] = { status: 'Menunggu', activeSince: null };
                    }
                });
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
    }, [currentDate]);

    // Save to localStorage whenever queueState changes
    React.useEffect(() => {
        if (loading) return; // Mencegah reset state saat initial load
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

    const setStatus = (id, status) => {
        setQueueState(prev => {
            const current = prev[id] || {};
            let activeSince = current.activeSince;
            if (status === 'Aktif' && current.status !== 'Aktif') {
                activeSince = Date.now();
            }
            return { ...prev, [id]: { status, activeSince } };
        });
    };

    const copyLink = () => {
        const url = `http://localhost:5173/queue.html?date=${currentDate}`;
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
                        <p className="text-sm font-mono text-gray-300">https://studio.lapanbelas.id/queue.html?date={currentDate}</p>
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

function LogistikDekorComponent({ onShowToast, session }) {
    const [appointments, setAppointments] = React.useState([]);
    const [packages, setPackages] = React.useState([]);
    const [filterEvent, setFilterEvent] = React.useState('Semua');
    const [loading, setLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedAppt, setSelectedAppt] = React.useState(null);

    // Modal states
    const [statusSurvei, setStatusSurvei] = React.useState('Belum di survei');
    const [tanggalSurvei, setTanggalSurvei] = React.useState('');
    const [mulaiPemasangan, setMulaiPemasangan] = React.useState('');
    const [catatanSurvei, setCatatanSurvei] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const parseNotesField = (notesStr) => {
        let prewedDate = '';
        let selectedAddonNames = [];
        let voucherCode = '';
        let customFees = [];
        let keterangan = '';
        let div = 'lapanbelas.id';
        let namaPria = ''; let namaWanita = ''; let jamSesi = ''; let roomStudio = '';
        let photographer = ''; let durasiSesi = ''; let jadwalFitting = '';
        let jadwalSurvei = ''; let jadwalPemasangan = '';
        let hasilFitting = '';
        let statusFitting = 'Belum di survei';
        let fittingChecklist = '{}';

        if (!notesStr) return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist };

        const divisiMatch = notesStr.match(/\[DIVISI\]:\s*([^\n]+)/);
        if (divisiMatch) div = divisiMatch[1].trim();
        const jadwalSurveiMatch = notesStr.match(/\[JADWAL SURVEI\]:\s*([^\n]+)/);
        if (jadwalSurveiMatch) jadwalSurvei = jadwalSurveiMatch[1].trim();
        const jadwalPemasanganMatch = notesStr.match(/\[JADWAL PEMASANGAN\]:\s*([^\n]+)/);
        if (jadwalPemasanganMatch) jadwalPemasangan = jadwalPemasanganMatch[1].trim();

        const hasilFittingMatch = notesStr.match(/\[HASIL FITTING\]:\s*([^\n]+)/);
        if (hasilFittingMatch) hasilFitting = hasilFittingMatch[1].trim();
        const statusFittingMatch = notesStr.match(/\[STATUS FITTING\]:\s*([^\n]+)/);
        if (statusFittingMatch) statusFitting = statusFittingMatch[1].trim();

        const addonMatch = notesStr.match(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:\s*\n?((?:- .*\n?)*)/);
        if (addonMatch) {
            addonMatch[1].split('\n').forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                if (cleanLine) {
                    const detailMatch = cleanLine.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (detailMatch) {
                        selectedAddonNames.push(detailMatch[1].trim());
                    } else {
                        selectedAddonNames.push(cleanLine);
                    }
                }
            });
        }

        const feesMatch = notesStr.match(/\[BIAYA LAINNYA\]:\s*\n?((?:- .*\n?)*)/);
        if (feesMatch) {
            feesMatch[1].split('\n').forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                if (cleanLine) {
                    const detailMatch = cleanLine.match(/^(.*?)\s*\(Rp\s*([0-9.]+)\)/);
                    if (detailMatch) {
                        customFees.push({ description: detailMatch[1].trim(), amount: Number(detailMatch[2].replace(/\./g, '')) });
                    }
                }
            });
        }

        const ketMatch = notesStr.match(/\[KETERANGAN TAMBAHAN\]:\s*\n?([\s\S]*)$/);
        keterangan = ketMatch ? ketMatch[1].trim() : notesStr
            .replace(/\[DIVISI\]:.*?\n*/g, '')
            .replace(/\[JADWAL SURVEI\]:.*?\n*/g, '')
            .replace(/\[JADWAL PEMASANGAN\]:.*?\n*/g, '')
            .replace(/\[HASIL FITTING\]:.*?\n*/g, '')
            .replace(/\[STATUS FITTING\]:.*?\n*/g, '')
            .replace(/\[LAYANAN TAMBAHAN \/ ADD-ON\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[VOUCHER\]:.*?\n*/g, '')
            .replace(/\[BIAYA LAINNYA\]:[\s\S]*?(?=\n\n\[|\n$|$)/g, '')
            .replace(/\[KETERANGAN TAMBAHAN\]:\s*\n?/g, '')
            .trim();

        return { prewedDate, selectedAddonNames, voucherCode, customFees, keterangan, div, namaPria, namaWanita, jamSesi, roomStudio, photographer, durasiSesi, jadwalFitting, jadwalSurvei, jadwalPemasangan, hasilFitting, statusFitting, fittingChecklist, surveiDate: jadwalSurvei, pemasanganDate: jadwalPemasangan };
    };

    const fetchDecorData = async () => {
        setLoading(true);
        try {
            const { data: appts, error: err1 } = await supabase.from('appointments').select('*').order('event_date', { ascending: true });
            const { data: pkgs, error: err2 } = await supabase.from('packages').select('*');
            if (err1) console.error(err1);
            if (err2) console.error(err2);

            if (appts && pkgs) {
                setPackages(pkgs);
                const pkgMap = {};
                pkgs.forEach(p => { pkgMap[p.title] = p; });

                const mapped = appts.map(a => {
                    const pkg = pkgMap[a.package_name];
                    const division = getPackageDivision(pkg);
                    return { ...a, division, packages: pkg };
                });

                const filtered = mapped.filter(a => a.division === 'Lapanbelas Dekorasi' && a.status !== 'Menunggu DP');
                setAppointments(filtered);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchDecorData();
        const channel = supabase.channel('dekor-changes')
            .on('postgres', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchDecorData();
            }).subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleOpenModal = (appt) => {
        setSelectedAppt(appt);
        const parsed = parseNotesField(appt.additional_notes);
        setStatusSurvei(parsed.statusFitting || 'Belum di survei');
        setTanggalSurvei(parsed.jadwalSurvei || '');

        let startPasang = '';
        if (parsed.jadwalPemasangan) {
            const parts = parsed.jadwalPemasangan.split(' s/d ');
            startPasang = parts[0] || '';
        }
        setMulaiPemasangan(startPasang);
        setCatatanSurvei(parsed.hasilFitting || '');
        setIsModalOpen(true);
    };

    const handleSaveData = async (e) => {
        e.preventDefault();
        if (!selectedAppt) return;
        setSaving(true);

        try {
            const parsed = parseNotesField(selectedAppt.additional_notes);
            parsed.statusFitting = statusSurvei;
            parsed.jadwalSurvei = tanggalSurvei;
            parsed.hasilFitting = catatanSurvei;

            let rangeStr = '';
            if (mulaiPemasangan) {
                const d1 = new Date(mulaiPemasangan);
                const d2 = new Date(mulaiPemasangan);
                d2.setDate(d1.getDate() + 1);

                const yyyy1 = d1.getFullYear();
                const mm1 = String(d1.getMonth() + 1).padStart(2, '0');
                const dd1 = String(d1.getDate()).padStart(2, '0');

                const yyyy2 = d2.getFullYear();
                const mm2 = String(d2.getMonth() + 1).padStart(2, '0');
                const dd2 = String(d2.getDate()).padStart(2, '0');

                rangeStr = `${yyyy1}-${mm1}-${dd1} s/d ${yyyy2}-${mm2}-${dd2}`;
            }
            parsed.jadwalPemasangan = rangeStr;

            let newNotes = `[DIVISI]: Lapanbelas Dekorasi\n\n`;
            if (parsed.jadwalSurvei) newNotes += `[JADWAL SURVEI]: ${parsed.jadwalSurvei}\n`;
            if (parsed.jadwalPemasangan) newNotes += `[JADWAL PEMASANGAN]: ${parsed.jadwalPemasangan}\n`;
            if (parsed.hasilFitting) newNotes += `[HASIL FITTING]: ${parsed.hasilFitting}\n`;
            if (parsed.statusFitting) newNotes += `[STATUS FITTING]: ${parsed.statusFitting}\n\n`;

            if (parsed.selectedAddonNames && parsed.selectedAddonNames.length > 0) {
                newNotes += `[LAYANAN TAMBAHAN / ADD-ON]:\n` + parsed.selectedAddonNames.map(name => `- ${name}`).join('\n') + `\n\n`;
            }
            if (parsed.voucherCode) newNotes += `[VOUCHER]: ${parsed.voucherCode}\n\n`;
            if (parsed.customFees && parsed.customFees.length > 0) {
                newNotes += `[BIAYA LAINNYA]:\n` + parsed.customFees.map(f => `- ${f.description} (Rp ${f.amount})`).join('\n') + `\n\n`;
            }
            if (parsed.keterangan) newNotes += `[KETERANGAN TAMBAHAN]:\n${parsed.keterangan}`;

            const { error } = await supabase
                .from('appointments')
                .update({ additional_notes: newNotes.trim() })
                .eq('id', selectedAppt.id);

            if (error) {
                onShowToast("Gagal menyimpan data: " + error.message, "error");
            } else {
                onShowToast("Jadwal & survei berhasil disimpan!", "success");
                setIsModalOpen(false);
                fetchDecorData();
            }
        } catch (err) {
            onShowToast("Terjadi kesalahan: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const formatEventDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const formatRangePemasangan = (rangeStr) => {
        if (!rangeStr) return '-';
        try {
            const parts = rangeStr.split(' s/d ');
            if (parts.length < 2) return rangeStr;

            const d1 = new Date(parts[0]);
            const d2 = new Date(parts[1]);
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return rangeStr;

            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            const str1 = d1.toLocaleDateString('id-ID', { day: 'numeric' });
            const str2 = d2.toLocaleDateString('id-ID', options);
            return `${str1} - ${str2}`;
        } catch (e) {
            return rangeStr;
        }
    };

    const getEventCategory = (appt) => {
        const cat = appt.packages?.category || '';
        if (cat.startsWith('Lapanbelas Dekorasi:')) {
            return cat.replace('Lapanbelas Dekorasi: ', '');
        }
        return 'Dekorasi';
    };

    const filteredList = appointments.filter(appt => {
        const eventCat = getEventCategory(appt).toLowerCase();
        const pkgTitle = appt.package_name.toLowerCase();

        if (filterEvent === 'Semua') return true;

        const isAkad = eventCat.includes('akad') || pkgTitle.includes('akad');
        const isResepsi = eventCat.includes('resepsi') || pkgTitle.includes('resepsi');
        const isLamaran = eventCat.includes('lamaran') || pkgTitle.includes('lamaran');
        const isTasyakuran = eventCat.includes('tasyakuran') || pkgTitle.includes('tasyakuran');
        const isPhotoshoot = eventCat.includes('photoshoot') || pkgTitle.includes('photoshoot');

        if (filterEvent === 'Akad') return isAkad && !isResepsi;
        if (filterEvent === 'Resepsi') return isResepsi && !isAkad;
        if (filterEvent === 'Akad + Resepsi') return isAkad && isResepsi;
        if (filterEvent === 'Lamaran') return isLamaran;
        if (filterEvent === 'Tasyakuran') return isTasyakuran;
        if (filterEvent === 'Photoshoot') return isPhotoshoot;
        return true;
    });

    const getPreviewRange = () => {
        if (!mulaiPemasangan) return 'Pilih Tanggal Mulai Pemasangan';
        const d1 = new Date(mulaiPemasangan);
        const d2 = new Date(mulaiPemasangan);
        d2.setDate(d1.getDate() + 1);

        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        const str1 = d1.toLocaleDateString('id-ID', { day: 'numeric' });
        const str2 = d2.toLocaleDateString('id-ID', options);
        return `${str1} - ${str2}`;
    };

    return (
        <div className="animate-in fade-in flex flex-col gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <SvgIcon name="flower" className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">SOP Divisi Dekorasi</h2>
                        <p className="text-xs text-gray-400">Manajemen jadwal survei lapangan & logistik pemasangan pelaminan</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Filter Acara:</span>
                    <select
                        value={filterEvent}
                        onChange={e => setFilterEvent(e.target.value)}
                        className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white cursor-pointer"
                    >
                        <option value="Semua">Semua</option>
                        <option value="Akad">Akad</option>
                        <option value="Resepsi">Resepsi</option>
                        <option value="Akad + Resepsi">Akad + Resepsi</option>
                        <option value="Lamaran">Lamaran</option>
                        <option value="Tasyakuran">Tasyakuran</option>
                        <option value="Photoshoot">Photoshoot</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" />
                </div>
            ) : filteredList.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border border-white/5">
                    <SvgIcon name="file-text" className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm font-medium">Belum ada pesanan dekorasi untuk kategori terpilih.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredList.map(appt => {
                        const parsed = parseNotesField(appt.additional_notes);
                        const isDone = parsed.statusFitting === 'Selesai di survei';
                        return (
                            <div key={appt.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 hover:border-emerald-500/20 transition-all duration-300 relative group overflow-hidden">
                                <div className={`absolute left-0 inset-y-0 w-1 ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                                <div className="flex justify-between items-start pl-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                {appt.client_name}
                                            </h3>
                                            {appt.client_phone && (
                                                <a
                                                    href={`https://wa.me/${appt.client_phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-emerald-400 hover:text-emerald-300 transition"
                                                    title="Chat WhatsApp"
                                                >
                                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.49-4.832c1.649.979 3.264 1.489 4.904 1.49 5.376.002 9.75-4.368 9.754-9.743.003-2.604-.998-5.053-2.822-6.879C16.562 2.21 14.114.99 11.507.99c-5.378 0-9.754 4.374-9.759 9.748-.002 1.83.49 3.616 1.425 5.197L2.153 21.84l6.096-1.597.298.175z" />
                                                    </svg>
                                                </a>
                                            )}
                                            <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                                                {getEventCategory(appt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{appt.id} | Paket: {appt.package_name}</p>
                                    </div>

                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${isDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                        {parsed.statusFitting || 'Belum di survei'}
                                    </span>
                                </div>

                                <div className="bg-white/2 p-4 rounded-xl space-y-3 text-xs pl-4 border border-white/5">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Hari H (Acara):</span>
                                        <span className="font-semibold text-white">{formatEventDate(appt.event_date)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>📍 Tgl Survei:</span>
                                        <span className={`font-semibold ${parsed.surveiDate ? 'text-white' : 'text-gray-600'}`}>
                                            {formatEventDate(parsed.surveiDate)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>🔨 Tgl Pemasangan (2 Hari):</span>
                                        <span className={`font-semibold ${parsed.pemasanganDate ? 'text-white' : 'text-gray-600'}`}>
                                            {formatRangePemasangan(parsed.pemasanganDate)}
                                        </span>
                                    </div>

                                    {parsed.hasilFitting && (
                                        <div className="space-y-1 pt-2 border-t border-white/5">
                                            <span className="text-gray-400 block">📝 Catatan Hasil Survei / Akses Lokasi:</span>
                                            <p className="text-white font-medium italic pl-1 leading-relaxed">{parsed.hasilFitting}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pl-2">
                                    <button
                                        onClick={() => handleOpenModal(appt)}
                                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-emerald-500/20"
                                    >
                                        {parsed.surveiDate ? 'Edit Jadwal & Survei' : 'Atur Jadwal & Survei'}
                                    </button>

                                    {parsed.hasilFitting && (
                                        <a
                                            href={`/api/decor-pdf/${appt.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition border border-emerald-500/20 flex items-center justify-center"
                                            title="Lihat PDF Logistik"
                                        >
                                            <SvgIcon name="file-text" className="w-4.5 h-4.5 text-emerald-400" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && selectedAppt && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95 overflow-y-auto max-h-[90vh] custom-scrollbar text-left">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <SvgIcon name="x" className="w-5 h-5 text-gray-400" />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-1">Jadwal & Survei Dekorasi - {selectedAppt.client_name}</h3>
                        <p className="text-xs text-gray-400 mb-6">Kelola tanggal survei lokasi dan pemasangan.</p>

                        <form onSubmit={handleSaveData} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Status Saat Ini</label>
                                <select
                                    value={statusSurvei}
                                    onChange={e => setStatusSurvei(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white cursor-pointer"
                                >
                                    <option value="Belum di survei">Belum di survei</option>
                                    <option value="Selesai di survei">Selesai di survei</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Tanggal Survei Lokasi</label>
                                    <input
                                        type="date"
                                        value={tanggalSurvei}
                                        onChange={e => setTanggalSurvei(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Mulai Pemasangan</label>
                                    <input
                                        type="date"
                                        value={mulaiPemasangan}
                                        onChange={e => setMulaiPemasangan(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Rentang Jadwal Pemasangan (Otomatis 2 Hari)</label>
                                <div className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-3 text-xs text-emerald-400 font-semibold text-center bg-emerald-500/5">
                                    {getPreviewRange()}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Catatan Hasil Survei / Akses Lokasi</label>
                                <textarea
                                    value={catatanSurvei}
                                    onChange={e => setCatatanSurvei(e.target.value)}
                                    rows="4"
                                    placeholder="Contoh: Akses jalan sempit, butuh mobil kecil untuk angkut barang..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-white resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition text-gray-400"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center border border-emerald-500/20"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminDashboard() {
    const [session, setSession] = React.useState(null);
    const [isChecking, setIsChecking] = React.useState(true);

    React.useEffect(() => {
        async function restoreSession() {
            const saved = localStorage.getItem('adminSession');
            if (saved) {
                try {
                    const parsedSession = JSON.parse(saved);

                    // Restore Supabase Auth session to make sure the client is authenticated
                    const { data: { session: sbSession } } = await supabase.auth.getSession();
                    if (sbSession) {
                        setSession(parsedSession);
                        // Defer defaultMenu resolution so getDefaultMenuForRole is defined
                        const roles = (parsedSession?.role || '').split(',').map(r => r.trim());
                        let defaultMenu = 'overview';
                        if (roles.includes('owner') || roles.includes('admin')) defaultMenu = 'overview';
                        else if (roles.includes('makeup')) defaultMenu = 'overview-makeup';
                        else if (roles.includes('studio')) defaultMenu = 'overview-studio';
                        else if (roles.includes('dekor')) defaultMenu = 'overview-dekor';
                        else if (roles.includes('karyawan') || roles.includes('editor_foto')) defaultMenu = 'assign-foto';
                        else if (roles.includes('editor_foto_studio')) defaultMenu = 'assign-foto-studio';
                        else if (roles.includes('editor_video')) defaultMenu = 'assign-video';
                        setActiveMenu(defaultMenu);
                    } else {
                        // If Supabase auth session is expired/not found, force re-login
                        localStorage.removeItem('adminSession');
                        setSession(null);
                    }
                } catch (e) {
                    localStorage.removeItem('adminSession');
                    setSession(null);
                }
            }
            setIsChecking(false);
        }
        restoreSession();
    }, []);

    const getDefaultMenuForRole = (roleStr) => {
        if (!roleStr) return 'overview';
        const roles = roleStr.split(',').map(r => r.trim());
        if (roles.includes('owner') || roles.includes('admin')) return 'overview';
        if (roles.includes('makeup')) return 'overview-makeup';
        if (roles.includes('studio')) return 'overview-studio';
        if (roles.includes('dekor')) return 'overview-dekor';
        if (roles.includes('karyawan') || roles.includes('editor_foto')) return 'assign-foto';
        if (roles.includes('editor_foto_studio')) return 'assign-foto-studio';
        if (roles.includes('editor_video')) return 'assign-video';
        return 'overview';
    };

    const handleLogin = (sessData) => {
        localStorage.setItem('adminSession', JSON.stringify(sessData));
        setSession(sessData);
        setActiveMenu(getDefaultMenuForRole(sessData?.role));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('adminSession');
        setSession(null);
        setActiveMenu('overview');
    };
    const [activeMenu, setActiveMenu] = React.useState('overview');
    const [isMakeupMenuOpen, setIsMakeupMenuOpen] = React.useState(false);
    const [isStudioMenuOpen, setIsStudioMenuOpen] = React.useState(false);
    const [isDecorMenuOpen, setIsDecorMenuOpen] = React.useState(false);
    const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [menuParams, setMenuParams] = React.useState({});

    React.useEffect(() => {
        if (['overview-makeup', 'appointment-makeup', 'jadwal-rias', 'date-available-makeup', 'pricelist-makeup', 'addons-makeup'].includes(activeMenu)) {
            setIsMakeupMenuOpen(true);
        }
        if (['overview-studio', 'appointment-studio', 'queue-studio', 'photographer-studio', 'room-studio', 'assign-studio', 'pricelist-studio', 'addons-studio', 'date-available-studio', 'voucher-studio'].includes(activeMenu)) {
            setIsStudioMenuOpen(true);
        }
        if (['overview-dekor', 'appointment-dekor', 'logistik-dekor', 'date-available-dekor', 'pricelist-dekor', 'addons-dekor'].includes(activeMenu)) {
            setIsDecorMenuOpen(true);
        }
    }, [activeMenu]);

    // getVisibleMenus must be defined before any conditional returns (Rules of Hooks)
    const getVisibleMenus = (sessRole) => {
        if (!sessRole) return [];
        const roles = sessRole.split(',').map(r => r.trim());
        if (roles.includes('owner')) return menus;
        if (roles.includes('admin')) return menus.filter(m => m.id !== 'users');

        const allowedMenus = [];
        const addMenu = (m) => { if (!allowedMenus.find(x => x.id === m.id)) allowedMenus.push(m); };

        roles.forEach(role => {
            if (role === 'makeup') {
                [
                    { id: 'overview-makeup', label: 'Overview', icon: 'layout-dashboard' },
                    { id: 'appointment-makeup', label: 'Appointment', icon: 'calendar-days' },
                    { id: 'jadwal-rias', label: 'Jadwal Rias', icon: 'wand-sparkles' },
                    { id: 'date-available-makeup', label: 'Date Available', icon: 'calendar-check' },
                    { id: 'pricelist-makeup', label: 'Pricelist', icon: 'tags' },
                    { id: 'addons-makeup', label: 'Add-on Layanan', icon: 'package' },
                    { id: 'voucher', label: 'Voucher', icon: 'ticket' }
                ].forEach(addMenu);
            }
            if (role === 'studio') studioSubmenus.forEach(addMenu);
            if (role === 'dekor') dekorSubmenus.forEach(addMenu);
            if (role === 'karyawan') menus.filter(m => m.id === 'assign-foto' || m.id === 'assign-video' || m.id === 'assign-foto-studio').forEach(addMenu);
            if (role === 'editor_foto') menus.filter(m => m.id === 'assign-foto').forEach(addMenu);
            if (role === 'editor_foto_studio') menus.filter(m => m.id === 'assign-foto-studio').forEach(addMenu);
            if (role === 'editor_video') menus.filter(m => m.id === 'assign-video').forEach(addMenu);
        });
        return allowedMenus.length > 0 ? allowedMenus : menus.filter(m => m.id !== 'users');
    };

    // Validate activeMenu against visibleMenus - must be before conditional returns
    React.useEffect(() => {
        if (!session) return;
        const computed = getVisibleMenus(session?.role);
        if (computed.length > 0) {
            const hasDirectAccess = computed.find(m => m.id === activeMenu);
            const isSubmenuAccess =
                (computed.find(m => m.id === 'divisi-makeup-group') && makeupSubmenus.find(s => s.id === activeMenu)) ||
                (computed.find(m => m.id === 'divisi-studio-group') && studioSubmenus.find(s => s.id === activeMenu)) ||
                (computed.find(m => m.id === 'divisi-dekorasi-group') && dekorSubmenus.find(s => s.id === activeMenu));

            if (!hasDirectAccess && !isSubmenuAccess) {
                setActiveMenu(computed[0].id);
            }
        }
    }, [session, activeMenu]);

    if (isChecking) return null;
    if (!session) return <LoginComponent onLogin={handleLogin} />;

    const visibleMenus = getVisibleMenus(session?.role);


    const navigateTo = (menuId, params = {}) => {
        setActiveMenu(menuId);
        setMenuParams(params);
        setIsSidebarOpen(false);
    };


    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    return (
        <div className="flex h-screen overflow-hidden relative">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl w-72 animate-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                    <SvgIcon name={toast.type === 'success' ? "check-circle" : "alert-circle"} className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold text-left">{toast.message}</span>
                </div>
            )}

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <aside className={`w-64 bg-[#0f1115] border-r border-white/10 flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-bold tracking-wider uppercase">
                        {checkRole(session?.role, 'studio') ? 'Studio Lapanbelas' : checkRole(session?.role, 'dekor') ? 'Lapanbelas Dekorasi' : checkRole(session?.role, 'makeup') ? 'Lady Makeup' : '18Studio Admin'}
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Management Dashboard</p>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    <ul className="space-y-1">
                        {visibleMenus.map(menu => {
                            if (menu.isGroupHeader) {
                                if (menu.id === 'divisi-makeup-group') {
                                    const isAnySubActive = ['overview-makeup', 'appointment-makeup', 'jadwal-rias', 'date-available-makeup', 'pricelist-makeup', 'addons-makeup'].includes(activeMenu);
                                    return (
                                        <li key={menu.id} className="flex flex-col">
                                            <button
                                                onClick={() => setIsMakeupMenuOpen(!isMakeupMenuOpen)}
                                                className={`w-full flex items-center justify-between px-6 py-3 text-sm text-left transition-all ${isAnySubActive
                                                    ? 'font-medium bg-pink-500/5 text-pink-400 border-l-2 border-pink-500'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <SvgIcon name={menu.icon} className={`w-4 h-4 ${isAnySubActive ? 'text-pink-400' : 'text-gray-400'}`} />
                                                    {menu.label}
                                                </div>
                                                <svg className={`w-4 h-4 transition-transform duration-200 ${isMakeupMenuOpen ? 'transform rotate-90 text-pink-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
                                            {isMakeupMenuOpen && (
                                                <ul className="mt-1 space-y-1 bg-black/20 py-1.5 border-l border-white/5 ml-6">
                                                    {makeupSubmenus.map(sub => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigateTo(sub.id)}
                                                                className={`w-full flex items-center gap-3 pl-6 pr-4 py-2 text-xs text-left transition-all ${activeMenu === sub.id
                                                                    ? 'font-bold text-pink-400 bg-pink-500/5'
                                                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <SvgIcon name={sub.icon} className={`w-3.5 h-3.5 ${activeMenu === sub.id ? 'text-pink-400' : 'text-gray-500'}`} />
                                                                {sub.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                } else if (menu.id === 'divisi-studio-group') {
                                    const isAnySubActive = ['overview-studio', 'appointment-studio', 'queue-studio', 'photographer-studio', 'room-studio', 'assign-studio', 'pricelist-studio', 'addons-studio', 'date-available-studio', 'voucher-studio'].includes(activeMenu);
                                    return (
                                        <li key={menu.id} className="flex flex-col">
                                            <button
                                                onClick={() => setIsStudioMenuOpen(!isStudioMenuOpen)}
                                                className={`w-full flex items-center justify-between px-6 py-3 text-sm text-left transition-all ${isAnySubActive
                                                    ? 'font-medium bg-blue-500/5 text-blue-400 border-l-2 border-blue-500'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <SvgIcon name={menu.icon} className={`w-4 h-4 ${isAnySubActive ? 'text-blue-400' : 'text-gray-400'}`} />
                                                    {menu.label}
                                                </div>
                                                <svg className={`w-4 h-4 transition-transform duration-200 ${isStudioMenuOpen ? 'transform rotate-90 text-blue-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
                                            {isStudioMenuOpen && (
                                                <ul className="mt-1 space-y-1 bg-black/20 py-1.5 border-l border-white/5 ml-6">
                                                    {studioSubmenus.map(sub => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigateTo(sub.id)}
                                                                className={`w-full flex items-center gap-3 pl-6 pr-4 py-2 text-xs text-left transition-all ${activeMenu === sub.id
                                                                    ? 'font-bold text-blue-400 bg-blue-500/5'
                                                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <SvgIcon name={sub.icon} className={`w-3.5 h-3.5 ${activeMenu === sub.id ? 'text-blue-400' : 'text-gray-500'}`} />
                                                                {sub.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                } else if (menu.id === 'divisi-dekorasi-group') {
                                    const isAnySubActive = ['overview-dekor', 'appointment-dekor', 'logistik-dekor', 'date-available-dekor', 'pricelist-dekor', 'addons-dekor'].includes(activeMenu);
                                    return (
                                        <li key={menu.id} className="flex flex-col">
                                            <button
                                                onClick={() => setIsDecorMenuOpen(!isDecorMenuOpen)}
                                                className={`w-full flex items-center justify-between px-6 py-3 text-sm text-left transition-all ${isAnySubActive
                                                    ? 'font-medium bg-emerald-500/5 text-emerald-400 border-l-2 border-emerald-500'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <SvgIcon name={menu.icon} className={`w-4 h-4 ${isAnySubActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                                                    {menu.label}
                                                </div>
                                                <svg className={`w-4 h-4 transition-transform duration-200 ${isDecorMenuOpen ? 'transform rotate-90 text-emerald-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
                                            {isDecorMenuOpen && (
                                                <ul className="mt-1 space-y-1 bg-black/20 py-1.5 border-l border-white/5 ml-6">
                                                    {dekorSubmenus.map(sub => (
                                                        <li key={sub.id}>
                                                            <button
                                                                onClick={() => navigateTo(sub.id)}
                                                                className={`w-full flex items-center gap-3 pl-6 pr-4 py-2 text-xs text-left transition-all ${activeMenu === sub.id
                                                                    ? 'font-bold text-emerald-400 bg-emerald-500/5'
                                                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <SvgIcon name={sub.icon} className={`w-3.5 h-3.5 ${activeMenu === sub.id ? 'text-emerald-400' : 'text-gray-500'}`} />
                                                                {sub.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                }
                                return null;
                            }

                            const isMakeupActive = ['overview-makeup', 'appointment-makeup', 'jadwal-rias', 'date-available-makeup', 'pricelist-makeup', 'addons-makeup'].includes(activeMenu);
                            const isThemePink = checkRole(session?.role, 'makeup') || isMakeupActive;

                            const isStudioActive = ['overview-studio', 'appointment-studio', 'queue-studio', 'photographer-studio', 'room-studio', 'assign-studio', 'pricelist-studio', 'addons-studio', 'date-available-studio', 'voucher-studio'].includes(activeMenu);
                            const isThemeBlue = checkRole(session?.role, 'studio') || isStudioActive;

                            const isDecorActive = ['overview-dekor', 'appointment-dekor', 'logistik-dekor', 'date-available-dekor', 'pricelist-dekor', 'addons-dekor'].includes(activeMenu);
                            const isThemeGreen = checkRole(session?.role, 'dekor') || isDecorActive;

                            return (
                                <li key={menu.id}>
                                    <button
                                        onClick={() => navigateTo(menu.id)}
                                        className={`w-full flex items-center gap-3 px-6 py-3 text-sm text-left transition-all ${activeMenu === menu.id
                                            ? `active font-medium bg-white/10 border-l-2 text-white ${isThemePink ? 'border-pink-500 text-pink-400' : isThemeBlue ? 'border-blue-500 text-blue-400' : isThemeGreen ? 'border-emerald-500 text-emerald-400' : 'border-white'}`
                                            : `${isThemePink ? 'text-pink-400/70 hover:text-pink-300 hover:bg-pink-500/5' : isThemeBlue ? 'text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/5' : isThemeGreen ? 'text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/5' : 'text-gray-400 hover:text-white hover:bg-white/5'} border-l-2 border-transparent`
                                            }`}
                                    >
                                        <SvgIcon name={menu.icon} className={`w-4 h-4 ${activeMenu === menu.id ? (isThemePink ? 'text-pink-400' : isThemeBlue ? 'text-blue-400' : isThemeGreen ? 'text-emerald-400' : 'text-white') : (isThemePink ? 'text-pink-400/70' : isThemeBlue ? 'text-blue-400/70' : isThemeGreen ? 'text-emerald-400/70' : 'text-gray-400')}`} />
                                        {menu.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="p-4 border-t border-white/10">
                    <button onClick={handleLogout} className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 px-4 py-2 w-full transition rounded-lg hover:bg-red-500/10">
                        <SvgIcon name="log-out" className="w-4 h-4 text-red-400" /> Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 bg-[#0a0a0c] flex flex-col overflow-hidden relative">
                <header className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-10 relative">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition">
                            <SvgIcon name="menu" className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-semibold capitalize flex items-center gap-2 text-white">
                            {(() => {
                                const currentMenuObj = menus.find(m => m.id === activeMenu) || makeupSubmenus.find(m => m.id === activeMenu) || studioSubmenus.find(m => m.id === activeMenu) || dekorSubmenus.find(m => m.id === activeMenu);
                                const isMakeupActive = ['overview-makeup', 'appointment-makeup', 'jadwal-rias', 'date-available-makeup', 'pricelist-makeup', 'addons-makeup'].includes(activeMenu);
                                const isThemePink = checkRole(session?.role, 'makeup') || isMakeupActive;

                                const isStudioActive = ['overview-studio', 'appointment-studio', 'queue-studio', 'photographer-studio', 'room-studio', 'assign-studio', 'pricelist-studio', 'addons-studio', 'date-available-studio', 'voucher-studio'].includes(activeMenu);
                                const isThemeBlue = checkRole(session?.role, 'studio') || isStudioActive;

                                const isDecorActive = ['overview-dekor', 'appointment-dekor', 'logistik-dekor', 'date-available-dekor', 'pricelist-dekor', 'addons-dekor'].includes(activeMenu);
                                const isThemeGreen = checkRole(session?.role, 'dekor') || isDecorActive;

                                return (
                                    <>
                                        {currentMenuObj && <SvgIcon name={currentMenuObj.icon} className={`w-5 h-5 ${isThemePink ? 'text-pink-400' : isThemeBlue ? 'text-blue-400' : isThemeGreen ? 'text-emerald-400' : 'text-gray-400'}`} />}
                                        {currentMenuObj?.label || activeMenu.replace('-', ' ')}
                                    </>
                                );
                            })()}
                        </h2>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 z-10">
                    {(() => {
                        switch (activeMenu) {
                            case 'overview': return <OverviewComponent key="overview" onShowToast={showToast} onNavigate={navigateTo} session={session} />;
                            case 'overview-makeup': return <OverviewComponent key="overview-makeup" onShowToast={showToast} onNavigate={navigateTo} mode="makeup" session={session} />;
                            case 'overview-studio': return <OverviewComponent key="overview-studio" onShowToast={showToast} onNavigate={navigateTo} mode="studio" session={session} />;
                            case 'overview-dekor': return <OverviewComponent key="overview-dekor" onShowToast={showToast} onNavigate={navigateTo} mode="dekor" session={session} />;
                            case 'appointment': return <AppointmentComponent onShowToast={showToast} initialFilter={menuParams} session={session} />;
                            case 'appointment-makeup': return <AppointmentComponent key="appointment-makeup" onShowToast={showToast} initialFilter={menuParams} session={session} mode="makeup" />;
                            case 'appointment-studio': return <AppointmentComponent key="appointment-studio" onShowToast={showToast} initialFilter={menuParams} session={session} mode="studio" />;
                            case 'appointment-dekor': return <AppointmentComponent key="appointment-dekor" onShowToast={showToast} initialFilter={menuParams} session={session} mode="dekor" />;
                            case 'queue-studio': return <QueueAntrianComponent onShowToast={showToast} session={session} />;
                            case 'photographer-studio': return <FotograferComponent onShowToast={showToast} session={session} />;
                            case 'room-studio': return <JadwalRoomComponent onShowToast={showToast} session={session} />;
                            case 'assign-foto': return <AssignComponent onShowToast={showToast} session={session} mode="foto" />;
                            case 'assign-video': return <AssignComponent onShowToast={showToast} session={session} mode="video" />;
                            case 'assign-foto-studio': return <AssignComponent onShowToast={showToast} session={session} mode="foto-studio" />;
                            case 'assign-studio': return <AssignComponent key="assign-studio" onShowToast={showToast} session={session} mode="foto-studio" />;
                            case 'pricelist': return <PricelistComponent key="pricelist-gen" onShowToast={showToast} session={session} />;
                            case 'pricelist-makeup': return <PricelistComponent key="pricelist-makeup" onShowToast={showToast} session={session} mode="makeup" />;
                            case 'pricelist-studio': return <PricelistComponent key="pricelist-studio" onShowToast={showToast} session={session} mode="studio" />;
                            case 'pricelist-dekor': return <PricelistComponent key="pricelist-dekor" onShowToast={showToast} session={session} mode="dekor" />;
                            case 'addons': return <AddonsComponent key="addons-gen" onShowToast={showToast} session={session} />;
                            case 'addons-makeup': return <AddonsComponent key="addons-makeup" onShowToast={showToast} session={session} mode="makeup" />;
                            case 'addons-studio': return <AddonsComponent key="addons-studio" onShowToast={showToast} session={session} mode="studio" />;
                            case 'addons-dekor': return <AddonsComponent key="addons-dekor" onShowToast={showToast} session={session} mode="dekor" />;
                            case 'date-available': return <DateAvailableComponent key="date-available-gen" onShowToast={showToast} />;
                            case 'date-available-makeup': return <DateAvailableComponent key="date-available-makeup" onShowToast={showToast} mode="makeup" />;
                            case 'date-available-studio': return <DateAvailableComponent key="date-available-studio" onShowToast={showToast} mode="studio" />;
                            case 'date-available-dekor': return <DateAvailableComponent key="date-available-dekor" onShowToast={showToast} mode="dekor" />;
                            case 'logistik-dekor': return <LogistikDekorComponent onShowToast={showToast} session={session} />;
                            case 'voucher': return <VoucherComponent onShowToast={showToast} />;
                            case 'voucher-studio': return <VoucherComponent onShowToast={showToast} />;
                            case 'sample-embed': return <SampleEmbedComponent onShowToast={showToast} />;
                            case 'setting': return <SettingComponent onShowToast={showToast} />;
                            case 'users': return <UserManagementComponent onShowToast={showToast} />;
                            case 'jadwal-rias': return <JadwalRiasComponent onShowToast={showToast} session={session} />;
                            default: {
                                const firstMenu = visibleMenus[0];
                                return firstMenu ? null : <OverviewComponent onShowToast={showToast} session={session} />;
                            }
                        }
                    })()}
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminDashboard />);