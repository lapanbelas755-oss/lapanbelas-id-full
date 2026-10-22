import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { shareContent } from './utils/webShare';
import './index.css';

// Inisialisasi Supabase Client untuk Realtime WebSocket Updates
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// SVG Icon Helper Component
function Icon({ name, className = "w-5 h-5" }) {
  switch (name) {
    case 'camera':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'map-pin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'wallet':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'x-circle':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case 'upload-cloud':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          <polyline points="16 16 12 12 8 16" />
        </svg>
      );
    case 'log-out':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case 'refresh':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );
    case 'fingerprint':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
          <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
          <path d="M2 12a10 10 0 0 1 18-6" />
          <path d="M2 16h.01" />
          <path d="M21.8 16c.2-2 .131-5.354 0-6" />
          <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
          <path d="M8.65 22c.21-.66.45-1.32.57-2" />
          <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
        </svg>
      );
    case 'share':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    default:
      return null;
  }
}

// Base64Url <-> ArrayBuffer Helpers for WebAuthn Biometrics
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return buffer;
}

// Format date helper
function formatDateID(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatCurrency(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

// Helper to detect mobile smartphone (Android / iPhone) and filter out Laptop/Desktop/Mac/PC
function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window.opera || '');
  const isMobileUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isMobileUA || !hasTouch) return false;
  if (typeof window.innerWidth === 'number' && window.innerWidth >= 1024) return false;
  return true;
}

export default function CrewPortal() {
  // Session State
  const [crew, setCrew] = useState(() => {
    try {
      const saved = localStorage.getItem('18studio_crew_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Login Form State
  const [phoneInput, setPhoneInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Biometric (WebAuthn / Passkeys / Face ID / Touch ID) State - Handphone only
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [savedBio, setSavedBio] = useState(() => {
    if (!isMobileDevice()) return null;
    try {
      const b = localStorage.getItem('18studio_crew_biometric');
      return b ? JSON.parse(b) : null;
    } catch (e) {
      return null;
    }
  });
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    if (
      isMobileDevice() &&
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(avail => setIsBiometricAvailable(Boolean(avail)))
        .catch(() => setIsBiometricAvailable(false));
    } else {
      setIsBiometricAvailable(false);
    }
  }, []);

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    setLoginError('');
    try {
      const chRes = await fetch('/api/crew/biometric/challenge').then(r => r.json());
      if (!chRes.success || !chRes.challenge) {
        throw new Error('Gagal mendapatkan challenge keamanan dari server.');
      }

      const challengeBuffer = base64UrlToBuffer(chRes.challenge);
      const allowCreds = [];
      if (savedBio && savedBio.credentialId) {
        allowCreds.push({
          id: base64UrlToBuffer(savedBio.credentialId),
          type: 'public-key'
        });
      }

      // Prompt Face ID / Touch ID hardware
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          allowCredentials: allowCreds.length ? allowCreds : undefined,
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (!assertion) throw new Error('Biometrik dibatalkan.');
      const credId = bufferToBase64Url(assertion.rawId);

      const res = await axios.post('/api/crew/biometric/login', {
        credentialId: credId,
        phone: savedBio?.phone || null
      });

      if (res.data.success && res.data.crew) {
        setCrew(res.data.crew);
        localStorage.setItem('18studio_crew_session', JSON.stringify(res.data.crew));
        showToast(`Selamat datang kembali, ${res.data.crew.name}! 👋 (Login Face ID/Sidik Jari Sukses)`, 'success');
      } else {
        throw new Error(res.data.error || 'Login biometrik gagal.');
      }
    } catch (err) {
      console.warn('[Crew Bio Login]', err);
      if (err.name === 'NotAllowedError') {
        setLoginError('Pemindaian Face ID / Sidik Jari dibatalkan.');
      } else {
        setLoginError(err.response?.data?.error || err.message || 'Login biometrik gagal.');
      }
    } finally {
      setBioLoading(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!crew?.phone) return;
    setBioLoading(true);
    try {
      const chRes = await fetch('/api/crew/biometric/challenge').then(r => r.json());
      if (!chRes.success || !chRes.challenge) {
        throw new Error('Gagal mendapatkan challenge keamanan dari server.');
      }

      const challengeBuffer = base64UrlToBuffer(chRes.challenge);
      const userIdBuffer = new TextEncoder().encode(crew.phone);
      const deviceName = navigator.userAgent.includes('iPhone') ? 'iPhone'
        : navigator.userAgent.includes('iPad') ? 'iPad'
        : navigator.userAgent.includes('Macintosh') ? 'MacBook'
        : navigator.userAgent.includes('Android') ? 'Ponsel Android'
        : 'Perangkat Ini';

      // Prompt creation on Face ID / Touch ID / Fingerprint
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeBuffer,
          rp: { name: '18Studio Portal Kru' },
          user: {
            id: userIdBuffer,
            name: crew.phone,
            displayName: crew.name
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      });

      if (!credential) throw new Error('Pendaftaran biometrik dibatalkan.');
      const credId = bufferToBase64Url(credential.rawId);

      const res = await axios.post('/api/crew/biometric/register', {
        phone: crew.phone,
        credentialId: credId,
        rawId: credId,
        deviceName
      });

      if (res.data.success) {
        const bioRecord = { credentialId: credId, phone: crew.phone, crewName: crew.name, deviceName };
        localStorage.setItem('18studio_crew_biometric', JSON.stringify(bioRecord));
        setSavedBio(bioRecord);
        showToast('🔐 Sidik Jari / Face ID berhasil didaftarkan untuk perangkat ini! ✨', 'success');
      } else {
        throw new Error(res.data.error || 'Gagal mendaftarkan biometrik');
      }
    } catch (err) {
      console.warn('[Crew Bio Register]', err);
      if (err.name === 'NotAllowedError') {
        showToast('Pendaftaran Face ID / Sidik Jari dibatalkan.', 'info');
      } else {
        showToast(err.response?.data?.error || err.message || 'Pendaftaran biometrik gagal.', 'error');
      }
    } finally {
      setBioLoading(false);
    }
  };

  // Main Portal State
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'schedule' | 'payroll'
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobFilter, setJobFilter] = useState('all'); // 'all' | 'pending' | 'today' | 'upcoming' | 'unpaid'
  const [selectedJob, setSelectedJob] = useState(null);

  // Modals
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [checkinPhoto, setCheckinPhoto] = useState(null);
  const [checkinGps, setCheckinGps] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [submitFileModalOpen, setSubmitFileModalOpen] = useState(false);
  const [submissionType, setSubmissionType] = useState('drive'); // 'drive' | 'kantor'
  const [driveUrl, setDriveUrl] = useState('');
  const [fileNotes, setFileNotes] = useState('');
  const [submitFileLoading, setSubmitFileLoading] = useState(false);

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [bankName, setBankName] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auto-detect URL query phone: ?phone=08123...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qPhone = params.get('phone');
    if (qPhone && !crew) {
      setPhoneInput(qPhone);
      handleDirectLogin(qPhone);
    }
  }, []);

  const handleDirectLogin = async (phoneNum) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await axios.post('/api/crew/login', { phone: phoneNum });
      if (res.data.success && res.data.crew) {
        setCrew(res.data.crew);
        localStorage.setItem('18studio_crew_session', JSON.stringify(res.data.crew));
        showToast(`Selamat datang, ${res.data.crew.name}! 👋`, 'success');
      } else {
        setLoginError(res.data.error || 'Gagal login.');
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Nomor WhatsApp belum terdaftar sebagai kru aktif.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      setLoginError('Masukkan nomor WhatsApp Anda');
      return;
    }
    handleDirectLogin(phoneInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('18studio_crew_session');
    setCrew(null);
    setJobs([]);
    showToast('Berhasil keluar dari portal.', 'info');
  };

  // Default VAPID Public Key Fallback (Anti-Gagal)
  const DEFAULT_VAPID_PUBLIC_KEY = 'BJ23gfn6K6UYnoipIw4bHKTCwcXuQDkSEfmgF3R6JMuYnGRGmLGToSAcTIkKInS22Z4D0O7unjvjXCkJRMM6wv8';

  // Push Notification (VAPID) State & Handler
  const [pushSubscribed, setPushSubscribed] = useState(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });

  const handleTogglePushNotification = async () => {
    try {
      if (typeof window === 'undefined') return;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

      // Pada iPhone di browser Safari standar, beri petunjuk instalasi PWA
      if (isIOS && !isStandalone && !('Notification' in window)) {
        showToast('Di iPhone: Buka menu Bagikan (Share ⬆️) ➔ "Tambahkan ke Layar Utama" dulu untuk mengaktifkan notifikasi banner HP.', 'info');
        return;
      }

      if (!('serviceWorker' in navigator)) {
        showToast('Browser ini tidak mendukung Service Worker.', 'error');
        return;
      }

      // Cek permission jika diblokir
      if ('Notification' in window && Notification.permission === 'denied') {
        showToast('Izin notifikasi diblokir di HP Anda. Di iPhone: Buka Pengaturan HP ➔ Kru 18Studio ➔ Notifikasi ➔ Izinkan.', 'error');
        return;
      }

      showToast('Meminta izin notifikasi HP...', 'info');

      // Request notification permission if supported
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showToast('Izin notifikasi belum diberikan atau diblokir di pengaturan HP.', 'error');
          return;
        }
      }

      // Pastikan Service Worker terdaftar dan siap
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await navigator.serviceWorker.ready;

      // Ambil VAPID public key dari server dengan fallback
      let publicKey = null;
      try {
        const keyRes = await fetch('/api/notifications/vapid-public-key');
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          publicKey = keyData.publicKey;
        }
      } catch (keyErr) {
        console.warn('[VAPID] Menggunakan kunci fallback:', keyErr);
      }

      if (!publicKey) {
        publicKey = DEFAULT_VAPID_PUBLIC_KEY;
      }

      // Konversi kunci VAPID ke Uint8Array
      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const appServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        appServerKey[i] = rawData.charCodeAt(i);
      }

      // Daftarkan subscription ke PushManager
      if (registration.pushManager) {
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey
          });
        }

        // Kirim data langganan ke server
        const saveRes = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            userType: 'crew',
            userId: crew?.phone,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform
            }
          })
        });

        if (!saveRes.ok) {
          const errData = await saveRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Gagal mendaftarkan notifikasi ke server.');
        }
      }

      setPushSubscribed(true);
      showToast('🔔 Notifikasi HP Kru Aktif! Mengirim uji coba notifikasi banner...', 'success');

      // Kirim tes notifikasi ke HP
      setTimeout(() => {
        fetch('/api/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userType: 'crew',
            userId: crew?.phone,
            title: '18Studio Portal Kru ✨',
            body: `Halo ${crew?.name || 'Kru'}! Notifikasi banner HP Anda sudah aktif dan terhubung.`,
            url: '/crew'
          })
        }).catch(() => {});
      }, 700);

    } catch (err) {
      console.error('[Push Notification Error]', err);
      showToast(err.message || 'Gagal mengaktifkan notifikasi.', 'error');
    }
  };

  // Auto-sync Push Subscription secara otomatis jika izin sudah diberikan
  useEffect(() => {
    if (!crew?.phone || typeof window === 'undefined') return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const syncPush = async () => {
        try {
          if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
          let registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          }
          await navigator.serviceWorker.ready;

          let publicKey = null;
          try {
            const keyRes = await fetch('/api/notifications/vapid-public-key');
            if (keyRes.ok) {
              const data = await keyRes.json();
              publicKey = data.publicKey;
            }
          } catch (e) {}
          if (!publicKey) publicKey = DEFAULT_VAPID_PUBLIC_KEY;

          const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
          const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const appServerKey = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            appServerKey[i] = rawData.charCodeAt(i);
          }

          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: appServerKey
            });
          }

          if (subscription) {
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription,
                userType: 'crew',
                userId: crew.phone,
                deviceInfo: {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform
                }
              })
            }).catch(() => {});
            setPushSubscribed(true);
          }
        } catch (err) {
          console.warn('[Auto Sync Push]', err);
        }
      };
      syncPush();
    }
  }, [crew?.phone]);

  // Fetch Jobs
  const fetchMyJobs = async (silent = false) => {
    if (!crew?.phone) return;
    if (!silent) setLoadingJobs(true);
    try {
      const res = await axios.get(`/api/crew/my-jobs?phone=${encodeURIComponent(crew.phone)}`);
      if (res.data.success) {
        setJobs(res.data.jobs || []);
      }
    } catch (err) {
      if (!silent) console.error('Fetch Jobs Error:', err);
    } finally {
      if (!silent) setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (!crew?.phone) return;

    // 1. Initial fetch langsung saat kru login/terdeteksi
    fetchMyJobs();

    // 2. Realtime WebSocket Supabase: Tabel appointments (INSTAN 0-DETIK saat admin simpan penugasan kru)
    const channelAppt = supabase
      .channel(`crew-realtime-appointments-${crew.phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        console.log('[Realtime Supabase] Tabel appointments berubah, memuat ulang tugas...');
        fetchMyJobs(true);
      })
      .subscribe();

    // 3. Realtime WebSocket Supabase: Tabel crew_assignments
    const channelAsg = supabase
      .channel(`crew-realtime-assignments-${crew.phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_assignments' }, () => {
        console.log('[Realtime Supabase] Tabel crew_assignments berubah, memuat ulang tugas...');
        fetchMyJobs(true);
      })
      .subscribe();

    // 4. Deteksi App Aktif / Foreground: saat buka dari home screen atau setelah klik notifikasi banner
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App Foreground] Aplikasi aktif kembali, merefresh data tugas...');
        fetchMyJobs(true);
      }
    };
    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    // 5. Listener Sinyal dari Service Worker (saat push diterima di HP atau banner notifikasi diklik)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'CREW_PUSH_RECEIVED' || event.data?.type === 'CREW_NOTIFICATION_CLICKED') {
        console.log('[SW Event] Sinyal notifikasi masuk/diklik, langsung refresh tugas...');
        fetchMyJobs(true);
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // 6. Polling berkala per 5 detik sebagai fail-safe cadangan
    const pollTimer = setInterval(() => {
      fetchMyJobs(true);
    }, 5000);

    return () => {
      supabase.removeChannel(channelAppt);
      supabase.removeChannel(channelAsg);
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      clearInterval(pollTimer);
    };
  }, [crew?.phone]);

  // Filter Jobs
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const eventDate = (job.event_date || '').split('T')[0];
      const isToday = eventDate === todayStr;
      const isPast = eventDate < todayStr;
      const isUpcoming = eventDate > todayStr;

      if (jobFilter === 'pending') return job.status === 'PENDING_APPROVAL';
      if (jobFilter === 'today') return isToday;
      if (jobFilter === 'upcoming') return isUpcoming && job.status !== 'REJECTED';
      if (jobFilter === 'unpaid') return ['FILES_VERIFIED', 'PAYOUT_REQUESTED'].includes(job.status);
      return true;
    });
  }, [jobs, jobFilter, todayStr]);

  // Statistics Summary
  const stats = useMemo(() => {
    const todayCount = jobs.filter(j => (j.event_date || '').split('T')[0] === todayStr).length;
    const pendingCount = jobs.filter(j => j.status === 'PENDING_APPROVAL').length;
    const claimableCount = jobs.filter(j => j.status === 'FILES_VERIFIED').length;
    const totalEarned = jobs
      .filter(j => j.status === 'PAID')
      .reduce((sum, j) => sum + Number(j.fee_amount || 0), 0);
    const pendingPayout = jobs
      .filter(j => ['FILES_VERIFIED', 'PAYOUT_REQUESTED'].includes(j.status))
      .reduce((sum, j) => sum + Number(j.fee_amount || 0), 0);

    return { todayCount, pendingCount, claimableCount, totalEarned, pendingPayout };
  }, [jobs, todayStr]);

  // Sync App Badge on app icon based on pending tasks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (stats.pendingCount > 0) {
        window.setAppBadge?.(stats.pendingCount);
      } else {
        window.clearAppBadge?.();
      }
    }
  }, [stats.pendingCount]);

  // Accept / Reject Job
  const handleRespondJob = async (job, action) => {
    if (action === 'reject') {
      setSelectedJob(job);
      setRejectModalOpen(true);
      return;
    }

    try {
      const res = await axios.post('/api/crew/respond-job', {
        appointmentId: job.appointment_id,
        phone: crew.phone,
        session: job.session,
        sessionKey: job.session_key,
        action: 'accept'
      });
      if (res.data.success) {
        showToast('Tugas berhasil diterima! Selamat bertugas 🙏✨', 'success');
        fetchMyJobs();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal merespon tugas', 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedJob) return;
    setRejectLoading(true);
    try {
      const res = await axios.post('/api/crew/respond-job', {
        appointmentId: selectedJob.appointment_id,
        phone: crew.phone,
        session: selectedJob.session,
        sessionKey: selectedJob.session_key,
        action: 'reject',
        rejectionReason: rejectReason.trim()
      });
      if (res.data.success) {
        showToast('Penolakan tugas telah dikonfirmasi.', 'info');
        setRejectModalOpen(false);
        setRejectReason('');
        setSelectedJob(null);
        fetchMyJobs();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal memproses penolakan', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  // Check-in & GPS Handling
  const handleOpenCheckin = (job) => {
    setSelectedJob(job);
    setCheckinPhoto(null);
    setCheckinGps(null);
    setCheckinModalOpen(true);
    // Request GPS immediately
    handleGetGps();
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      showToast('Perangkat tidak mendukung geolokasi GPS.', 'error');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckinGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCheckinPhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCheckin = async () => {
    if (!checkinPhoto) {
      showToast('Wajib mengambil foto bukti kehadiran (PAP)!', 'error');
      return;
    }
    setCheckinLoading(true);
    try {
      const res = await axios.post('/api/crew/checkin', {
        appointmentId: selectedJob.appointment_id,
        phone: crew.phone,
        session: selectedJob.session,
        sessionKey: selectedJob.session_key,
        imageBase64: checkinPhoto,
        lat: checkinGps?.lat,
        lng: checkinGps?.lng,
        address: selectedJob.client_address
      });
      if (res.data.success) {
        showToast('Presensi Berhasil! WA otomatis terkirim ke klien 🎉', 'success');
        setCheckinModalOpen(false);
        fetchMyJobs();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal mengirim presensi', 'error');
    } finally {
      setCheckinLoading(false);
    }
  };

  // Submit Files
  const handleOpenSubmitFile = (job) => {
    setSelectedJob(job);
    setSubmissionType('drive');
    setDriveUrl(job.submission_link || '');
    setFileNotes(job.submission_notes || '');
    setSubmitFileModalOpen(true);
  };

  const handleSubmitFiles = async (e) => {
    e.preventDefault();
    if (submissionType === 'drive' && !driveUrl.trim()) {
      showToast('Link Google Drive wajib diisi!', 'error');
      return;
    }
    setSubmitFileLoading(true);
    try {
      const res = await axios.post('/api/crew/submit-files', {
        appointmentId: selectedJob.appointment_id,
        phone: crew.phone,
        session: selectedJob.session,
        sessionKey: selectedJob.session_key,
        submissionType,
        driveLink: driveUrl.trim(),
        notes: fileNotes.trim()
      });
      if (res.data.success) {
        showToast('File diserahkan! Menunggu verifikasi tim studio.', 'success');
        setSubmitFileModalOpen(false);
        fetchMyJobs();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal menyimpan serah terima', 'error');
    } finally {
      setSubmitFileLoading(false);
    }
  };

  // Payout Claim
  const handleOpenPayout = (job) => {
    setSelectedJob(job);
    setBankName(job.payout_bank || 'BCA');
    setAccountNumber(job.payout_account_number || '');
    setAccountName(job.payout_account_name || crew.name || '');
    setPayoutModalOpen(true);
  };

  const handleSubmitPayout = async (e) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountName.trim()) {
      showToast('Nomor rekening dan nama pemilik wajib diisi!', 'error');
      return;
    }
    setPayoutLoading(true);
    try {
      const res = await axios.post('/api/crew/request-payout', {
        appointmentId: selectedJob.appointment_id,
        phone: crew.phone,
        session: selectedJob.session,
        sessionKey: selectedJob.session_key,
        bankName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      });
      if (res.data.success) {
        showToast('Pengajuan gaji berhasil dikirim ke Owner! 💰', 'success');
        setPayoutModalOpen(false);
        fetchMyJobs();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal mengajukan gaji', 'error');
    } finally {
      setPayoutLoading(false);
    }
  };

  // Web Share Native Handler for Job Briefing
  const handleShareJob = async (job) => {
    if (!job) return;
    const timeStr = job.jam_akad || job.jam_resepsi || 'Sesuai Jadwal';
    const mapsUrl = job.client_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}` : '';
    const shareText = `📸 TUGAS DOKUMENTASI 18STUDIO
━━━━━━━━━━━━━━━━━━━━
👤 Klien: ${job.client_name || '-'}
📦 Paket: ${job.package_name || '-'} (${job.category || 'Fotografi'})
📅 Tanggal: ${formatDateID(job.event_date)}
⏰ Standby: ${timeStr} WIB
📍 Lokasi: ${job.client_address || 'Studio 18'}
${mapsUrl ? `🗺️ Maps: ${mapsUrl}\n` : ''}💰 Tarif Fee: ${formatCurrency(job.fee_amount)}
━━━━━━━━━━━━━━━━━━━━
Akses Portal: ${window.location.origin}/crew`;

    await shareContent({
      title: `Tugas Dokumentasi 18Studio - ${job.client_name}`,
      text: shareText,
      url: mapsUrl || `${window.location.origin}/crew`,
      onToast: showToast
    });
  };

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayStr);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Blank fillers for day offset
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null });
    }
    // Days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayJobs = jobs.filter(j => (j.event_date || '').split('T')[0] === dateStr);
      days.push({
        day: d,
        dateStr,
        jobs: dayJobs,
        hasJobs: dayJobs.length > 0,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [currentMonth, jobs, todayStr]);

  // Render Login View if not logged in
  if (!crew) {
    return (
      <div 
        className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)'
        }}
      >
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mb-4 border border-amber-500/30 shadow-lg shadow-amber-500/20">
              <Icon name="camera" className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Portal Kru Lapanbelas</h1>
            <p className="text-xs text-gray-400 mt-2">
              Masuk untuk melihat agenda pemotretan, check-in kehadiran di lokasi, serta pencairan gaji.
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <Icon name="x-circle" className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Nomor WhatsApp Terdaftar
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="Contoh: 08123456789 atau 62812..."
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  autoFocus
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-1.5 block">
                Gunakan nomor WhatsApp yang didaftarkan oleh admin studio.
              </span>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Nomor...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Portal Kru</span>
                  <Icon name="arrow-right" className="w-4 h-4" />
                </>
              )}
            </button>

            {isBiometricAvailable && (
              <div className="pt-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-gray-500 font-medium">atau masuk instan</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={bioLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/40 hover:border-amber-500/60 disabled:opacity-50"
                >
                  {bioLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Memindai Sidik Jari / Face ID...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="fingerprint" className="w-4 h-4 text-amber-400" />
                      <span>{savedBio ? `Masuk sebagai ${savedBio.crewName || 'Kru'} (Face ID)` : 'Masuk dengan Sidik Jari / Face ID'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[11px] text-gray-500">
              Belum terdaftar sebagai kru? Hubungi Admin Studio di WhatsApp: <span className="text-gray-300 font-medium">0823-6325-2291</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Portal Main Interface
  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)'
      }}
    >
      {/* Toast Alert with Dynamic Island / Notch Protection */}
      {toast && (
        <div 
          className="fixed left-4 right-4 sm:left-auto sm:right-6 z-[9999] pointer-events-none flex justify-center sm:justify-end animate-in slide-in-from-top-4 duration-300"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)'
          }}
        >
          <div className={`pointer-events-auto max-w-md w-full sm:w-auto px-4 py-3 rounded-2xl shadow-2xl border text-sm flex items-center gap-2.5 backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50' :
            toast.type === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-200 shadow-red-950/50' :
            'bg-slate-900/95 border-white/20 text-white shadow-black/80'
          }`}>
            <Icon name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'x-circle' : 'bell'} className="w-4 h-4 shrink-0" />
            <span className="font-medium text-xs sm:text-sm leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navbar with iPhone Pro Max Dynamic Island Padding */}
      <header
        className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 px-4 pb-3.5 sm:px-6 shadow-md shadow-black/30"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)'
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shadow-md shrink-0">
              <Icon name="camera" className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-white truncate max-w-[120px] sm:max-w-none">{crew.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 capitalize shrink-0">
                  {crew.role}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-gray-300 border border-white/10 capitalize shrink-0">
                  {crew.type}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 block truncate">{crew.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isBiometricAvailable && (
              <button
                onClick={handleRegisterBiometric}
                disabled={bioLoading}
                className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border ${
                  savedBio
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
                title={savedBio ? 'Kredensial Biometrik Aktif di HP Ini' : 'Daftarkan Sidik Jari / Face ID'}
              >
                <Icon name="fingerprint" className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">{savedBio ? 'Face ID Aktif' : 'Kunci Biometrik'}</span>
              </button>
            )}

            <button
              onClick={handleTogglePushNotification}
              className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border ${
                pushSubscribed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
              }`}
              title="Aktifkan Notifikasi Masuk ke Layar Kunci HP"
            >
              <Icon name="bell" className="w-4 h-4" />
              <span className="hidden sm:inline">{pushSubscribed ? 'Notif Aktif' : 'Notif HP'}</span>
            </button>

            <button
              onClick={fetchMyJobs}
              disabled={loadingJobs}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all text-xs flex items-center gap-1.5"
              title="Refresh Data"
            >
              <Icon name="refresh" className={`w-4 h-4 ${loadingJobs ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-xs flex items-center gap-1.5"
              title="Keluar"
            >
              <Icon name="log-out" className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)'
        }}
      >
        {/* Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <span className="text-gray-400 text-xs block mb-1">Tugas Hari Ini</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-400">{stats.todayCount}</span>
              <span className="text-[10px] text-gray-500">Acara</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <span className="text-gray-400 text-xs block mb-1">Perlu Respon</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-cyan-400">{stats.pendingCount}</span>
              <span className="text-[10px] text-gray-500">Tugas Baru</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <span className="text-gray-400 text-xs block mb-1">Fee Siap Klaim</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-400">{stats.claimableCount}</span>
              <span className="text-[10px] text-gray-500">Job Verif</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <span className="text-gray-400 text-xs block mb-1">Total Fee Cair</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg sm:text-xl font-black text-white">{formatCurrency(stats.totalEarned)}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-white/10 rounded-2xl mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'jobs'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon name="camera" className="w-4 h-4" />
            <span>Tugas & Presensi</span>
            {stats.pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon name="calendar" className="w-4 h-4" />
            <span>Kalender Project</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon name="wallet" className="w-4 h-4" />
            <span>Dompet & Fee Gaji</span>
            {stats.claimableCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TUGAS & PRESENSI */}
        {/* ========================================================================= */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: 'Semua Tugas' },
                { id: 'today', label: `Hari Ini (${stats.todayCount})` },
                { id: 'pending', label: `Perlu Respon (${stats.pendingCount})` },
                { id: 'upcoming', label: 'Mendatang' },
                { id: 'unpaid', label: `Klaim Fee (${stats.claimableCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setJobFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    jobFilter === f.id
                      ? 'bg-white/15 text-white border-amber-500/50'
                      : 'bg-slate-900 text-gray-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Job List */}
            {loadingJobs ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-white/5">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-xs text-gray-400">Memuat daftar tugas dokumentasi...</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-white/5">
                <Icon name="calendar" className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-300">Tidak ada jadwal pada kategori ini</p>
                <p className="text-xs text-gray-500 mt-1">Tugas baru yang di-tag oleh admin studio akan otomatis muncul di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map(job => {
                  const eventDateOnly = (job.event_date || '').split('T')[0];
                  const isToday = eventDateOnly === todayStr;

                  return (
                    <div
                      key={job.id}
                      className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                        isToday
                          ? 'bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5'
                          : 'bg-slate-900/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        {/* Status Badge & Category Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                              {job.category} • {job.role}
                            </span>
                            {job.session && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                job.session.toLowerCase().includes('akad') && !job.session.toLowerCase().includes('resepsi')
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : job.session.toLowerCase().includes('resepsi') && !job.session.toLowerCase().includes('akad')
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                                {job.session.toLowerCase().includes('akad') && !job.session.toLowerCase().includes('resepsi') ? '🌅 ' :
                                 job.session.toLowerCase().includes('resepsi') && !job.session.toLowerCase().includes('akad') ? '🌇 ' : '🌟 '}
                                {job.session}
                              </span>
                            )}
                          </div>

                          <div>
                            {job.status === 'PENDING_APPROVAL' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                                ⏳ Menunggu Respon
                              </span>
                            )}
                            {job.status === 'ACCEPTED' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✓ Diterima
                              </span>
                            )}
                            {job.status === 'READY_ON_SITE' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                📍 Ready di Lokasi
                              </span>
                            )}
                            {job.status === 'FILES_SUBMITTED' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                📁 File Disetor
                              </span>
                            )}
                            {job.status === 'FILES_VERIFIED' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                💰 Siap Klaim Gaji
                              </span>
                            )}
                            {job.status === 'PAYOUT_REQUESTED' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                ⏳ Menunggu Transfer
                              </span>
                            )}
                            {job.status === 'PAID' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✅ Fee Lunas
                              </span>
                            )}
                            {job.status === 'REJECTED' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                ✕ Ditolak
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Client & Package Title + Share Button */}
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-white leading-snug truncate">{job.client_name}</h3>
                            <p className="text-xs text-amber-400 font-medium truncate">{job.package_name || 'Paket Dokumentasi'}</p>
                            <span className="text-[10px] text-gray-500">ID Pesanan: #{job.appointment_id}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleShareJob(job)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-300 border border-white/5 transition flex items-center gap-1.5 text-xs shrink-0 active:scale-95"
                            title="Bagikan Ringkasan Tugas (Web Share Native / WhatsApp)"
                          >
                            <Icon name="share" className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-[11px] font-medium hidden sm:inline">Bagikan</span>
                          </button>
                        </div>

                        {/* Key Info Details */}
                        <div className="space-y-2 py-3 border-y border-white/5 text-xs text-gray-300">
                          <div className="flex items-center gap-2.5">
                            <Icon name="calendar" className="w-4 h-4 text-gray-500 shrink-0" />
                            <span>
                              <strong className="text-white">{formatDateID(job.event_date)}</strong>
                              {isToday && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">HARI H</span>}
                            </span>
                          </div>

                          {(job.jam_akad || job.jam_resepsi) && (
                            <div className="flex items-center gap-2.5">
                              <Icon name="clock" className="w-4 h-4 text-gray-500 shrink-0" />
                              <span>
                                Standby: <strong className="text-white">{job.jam_akad || job.jam_resepsi} WIB</strong>
                              </span>
                            </div>
                          )}

                          {job.client_address && (
                            <div className="flex items-start gap-2.5">
                              <Icon name="map-pin" className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{job.client_address}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-gray-400">Tarif Fee Tugas:</span>
                            <span className="font-bold text-emerald-400 text-sm">{formatCurrency(job.fee_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons based on Status */}
                      <div className="pt-4 space-y-2">
                        {/* 1. If Pending Approval */}
                        {job.status === 'PENDING_APPROVAL' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleRespondJob(job, 'accept')}
                              className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                            >
                              <Icon name="check-circle" className="w-4 h-4" />
                              <span>Terima Tugas</span>
                            </button>
                            <button
                              onClick={() => handleRespondJob(job, 'reject')}
                              className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <Icon name="x-circle" className="w-4 h-4" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        )}

                        {/* 2. If Accepted and Event Date is Today -> Check-in Button */}
                        {job.status === 'ACCEPTED' && isToday && (
                          <button
                            onClick={() => handleOpenCheckin(job)}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 animate-pulse"
                          >
                            <Icon name="map-pin" className="w-4 h-4" />
                            <span>CHECK-IN HADIR DI LOKASI (PAP)</span>
                          </button>
                        )}

                        {/* 3. If Accepted but Not Today -> Navigation / Briefing Info */}
                        {job.status === 'ACCEPTED' && !isToday && (
                          <div className="flex items-center gap-2">
                            {job.client_address && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Icon name="map-pin" className="w-3.5 h-3.5 text-amber-400" />
                                <span>Buka Maps</span>
                              </a>
                            )}
                            {job.client_phone && (
                              <a
                                href={`https://wa.me/${job.client_phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <span>WA Klien</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* 4. If Ready on Site / Finished -> Submit Files */}
                        {job.status === 'READY_ON_SITE' && (
                          <button
                            onClick={() => handleOpenSubmitFile(job)}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                          >
                            <Icon name="upload-cloud" className="w-4 h-4" />
                            <span>Setor File Hasil Dokumentasi</span>
                          </button>
                        )}

                        {/* 5. If Files Submitted -> Waiting admin verification */}
                        {job.status === 'FILES_SUBMITTED' && (
                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs text-center">
                            ⏳ File berhasil diserahkan. Menunggu verifikasi tim studio.
                          </div>
                        )}

                        {/* 6. If Files Verified -> Claim Salary Button */}
                        {job.status === 'FILES_VERIFIED' && (
                          <button
                            onClick={() => handleOpenPayout(job)}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                          >
                            <Icon name="wallet" className="w-4 h-4" />
                            <span>KLAIM PENCAIRAN GAJI ({formatCurrency(job.fee_amount)})</span>
                          </button>
                        )}

                        {/* 7. If Payout Requested */}
                        {job.status === 'PAYOUT_REQUESTED' && (
                          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs text-center flex items-center justify-center gap-2">
                            <span>⏳ Pengajuan Fee Masuk ke Owner ({job.payout_bank} - {job.payout_account_number})</span>
                          </div>
                        )}

                        {/* 8. If Paid */}
                        {job.status === 'PAID' && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center font-bold">
                            ✅ Gaji Telah Ditransfer ke Rekening Anda
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KALENDER PROJECT */}
        {/* ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Calendar Card */}
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </h2>
                  <span className="text-xs text-gray-400">Pilih tanggal untuk melihat jadwal bertugas</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs"
                  >
                    ← Bln Lalu
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold"
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs"
                  >
                    Bln Depan →
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
                <span className="text-red-400">Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, idx) => {
                  if (!item.day) {
                    return <div key={`blank-${idx}`} className="h-14 sm:h-20 rounded-xl bg-transparent" />;
                  }

                  const isSelected = selectedCalendarDate === item.dateStr;

                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedCalendarDate(item.dateStr)}
                      className={`h-14 sm:h-20 p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : item.hasJobs
                          ? 'bg-slate-800/80 border-amber-500/40 text-gray-200'
                          : 'bg-slate-950/60 border-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${item.isToday ? 'px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950' : ''}`}>
                          {item.day}
                        </span>
                        {item.hasJobs && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>

                      {item.hasJobs && (
                        <div className="hidden sm:block truncate text-[10px] text-amber-300 font-medium">
                          {item.jobs.length} Job
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agenda on Selected Date */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="calendar" className="w-4 h-4 text-amber-400" />
                <span>Jadwal Tanggal: {formatDateID(selectedCalendarDate)}</span>
              </h3>

              {(() => {
                const dayJobs = jobs.filter(j => (j.event_date || '').split('T')[0] === selectedCalendarDate);
                if (dayJobs.length === 0) {
                  return (
                    <p className="text-xs text-gray-500 py-6 text-center">
                      Tidak ada penugasan dokumentasi pada tanggal ini.
                    </p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {dayJobs.map(job => (
                      <div key={job.id} className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{job.client_name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {job.package_name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Standby: {job.jam_akad || job.jam_resepsi || 'Sesuai Jadwal'} WIB • Lokasi: {job.client_address || 'Studio / Lokasi Klien'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 mr-2">{formatCurrency(job.fee_amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleShareJob(job)}
                            className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white border border-white/10 flex items-center gap-1 active:scale-95 transition"
                            title="Bagikan Info Tugas (Web Share Native)"
                          >
                            <Icon name="share" className="w-3 h-3 text-cyan-400" />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                          {job.client_address && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 border border-white/10"
                            >
                              Maps
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DOMPET & FEE GAJI */}
        {/* ========================================================================= */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            {/* Wallet Balance Hero */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                  Total Penghasilan Fee Selesai
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  {formatCurrency(stats.totalEarned)}
                </h2>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Siap Dicairkan: <strong className="text-white">{formatCurrency(stats.pendingPayout)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Total Job Selesai: <strong className="text-white">{jobs.filter(j => j.status === 'PAID').length}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout History List */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white mb-4">Riwayat Rekap Fee & Status Pencairan</h3>

              <div className="space-y-3">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{job.client_name}</span>
                        <span className="text-xs text-gray-500">#{job.appointment_id}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {job.package_name} • {formatDateID(job.event_date)}
                      </p>
                      {job.payout_account_number && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Rekening: {job.payout_bank} - {job.payout_account_number} ({job.payout_account_name})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-sm font-bold text-white">{formatCurrency(job.fee_amount)}</span>

                      {job.status === 'PAID' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Lunas
                        </span>
                      )}
                      {job.status === 'PAYOUT_REQUESTED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Diproses Owner
                        </span>
                      )}
                      {job.status === 'FILES_VERIFIED' && (
                        <button
                          onClick={() => handleOpenPayout(job)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
                        >
                          Klaim Fee
                        </button>
                      )}
                      {!['PAID', 'PAYOUT_REQUESTED', 'FILES_VERIFIED'].includes(job.status) && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-400 border border-white/5">
                          Tugas Berjalan
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CHECK-IN PRESENSI LOKASI & PAP (HARI H) */}
      {/* ========================================================================= */}
      {checkinModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Presensi Kehadiran Lapangan (PAP)</h3>
                <p className="text-xs text-amber-400 font-medium">{selectedJob.client_name} - #{selectedJob.appointment_id}</p>
              </div>
              <button
                onClick={() => setCheckinModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Notice */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                💡 <strong>Otomatisasi:</strong> Begitu presensi dikirim, sistem WhatsApp kami akan otomatis mengirim pesan konfirmasi ke Klien bahwa Anda sudah tiba di lokasi dan siap bertugas.
              </div>

              {/* Camera PAP Capture */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Ambil Foto Bukti Kehadiran (Live PAP) <span className="text-red-400">*</span>
                </label>

                {checkinPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/20 aspect-video bg-black flex items-center justify-center">
                    <img src={checkinPhoto} alt="PAP Kehadiran" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCheckinPhoto(null)}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-semibold backdrop-blur-md border border-white/20"
                    >
                      Ulangi Foto 📸
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/20 hover:border-amber-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 transition-all hover:bg-slate-950">
                    <Icon name="camera" className="w-10 h-10 text-amber-400 mb-2" />
                    <span className="text-xs font-bold text-white">Buka Kamera & Foto Lokasi</span>
                    <span className="text-[11px] text-gray-500 mt-1">Gunakan kamera ponsel Anda</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* GPS Geolocation Tagging */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                    <Icon name="map-pin" className="w-4 h-4 text-amber-400" />
                    <span>Koordinat GPS Lapangan</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGetGps}
                    disabled={gpsLoading}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    {gpsLoading ? 'Mendeteksi...' : 'Deteksi Ulang'}
                  </button>
                </div>

                {checkinGps ? (
                  <p className="text-gray-400 text-[11px]">
                    Lat: <strong className="text-white">{checkinGps.lat.toFixed(5)}</strong>, Lng: <strong className="text-white">{checkinGps.lng.toFixed(5)}</strong> (Akurasi: ±{checkinGps.accuracy}m)
                  </p>
                ) : (
                  <p className="text-gray-500 text-[11px]">
                    Izin lokasi GPS diperlukan untuk memverifikasi Anda memang berada di lokasi acara.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={checkinLoading || !checkinPhoto}
                  onClick={handleSubmitCheckin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkinLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Mengirim Presensi & Notifikasi WA...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" className="w-4 h-4" />
                      <span>KIRIM PRESENSI & NOTIFIKASI KLIEN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SETOR FILE (GOOGLE DRIVE / KANTOR) */}
      {/* ========================================================================= */}
      {submitFileModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Setor Hasil Dokumentasi</h3>
                <p className="text-xs text-gray-400">Job #{selectedJob.appointment_id} - {selectedJob.client_name}</p>
              </div>
              <button onClick={() => setSubmitFileModalOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSubmitFiles} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Pilih Cara Penyerahan File</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('drive')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                      submissionType === 'drive'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-white/10 text-gray-400'
                    }`}
                  >
                    ☁️ Upload Google Drive
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionType('kantor')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                      submissionType === 'kantor'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-white/10 text-gray-400'
                    }`}
                  >
                    🏢 Setor Fisik ke Kantor
                  </button>
                </div>
              </div>

              {submissionType === 'drive' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Link Folder Google Drive (Akses: Siapa saja dengan link) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Pastikan link Drive sudah di-share (Viewer/Editor).</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  📦 Silakan serahkan Memory Card / Flashdisk ke PIC Studio di kantor. Admin akan melakukan verifikasi fisik sebelum fee dapat dicairkan.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows="2"
                  placeholder="Contoh: Total 650 foto, file raw + jpeg..."
                  value={fileNotes}
                  onChange={(e) => setFileNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitFileLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitFileLoading ? 'Menyimpan...' : 'Konfirmasi Penyerahan File'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KLAIM GAJI / PENCAIRAN FEE */}
      {/* ========================================================================= */}
      {payoutModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Ajukan Pencairan Fee Tugas</h3>
                <p className="text-xs text-emerald-400 font-bold">{formatCurrency(selectedJob.fee_amount)}</p>
              </div>
              <button onClick={() => setPayoutModalOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Pilih Bank / E-Wallet</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                >
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                  <option value="BNI">BNI (Bank Negara Indonesia)</option>
                  <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                  <option value="Bank Jago">Bank Jago</option>
                  <option value="SeaBank">SeaBank</option>
                  <option value="Dana">DANA</option>
                  <option value="GoPay">GoPay</option>
                  <option value="OVO">OVO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nomor Rekening / No. HP E-Wallet <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: 1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Atas Nama Rekening <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                Notifikasi pengajuan akan langsung terkirim ke WhatsApp Owner & Keuangan Studio untuk diproses transfer.
              </div>

              <button
                type="submit"
                disabled={payoutLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {payoutLoading ? 'Mengirim Pengajuan...' : 'KIRIM PENGAJUAN GAJI KE OWNER'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TOLAK TUGAS */}
      {/* ========================================================================= */}
      {rejectModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-2">Konfirmasi Tolak Tugas</h3>
            <p className="text-xs text-gray-400 mb-4">
              Apakah Anda yakin tidak dapat mengambil tugas acara <strong>{selectedJob.client_name}</strong> ({formatDateID(selectedJob.event_date)})?
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-300 mb-1">Alasan Penolakan</label>
              <textarea
                rows="3"
                placeholder="Contoh: Sudah ada jadwal bentrok di luar kota..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={rejectLoading}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20"
              >
                {rejectLoading ? 'Memproses...' : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bootstrap React 19 root
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<CrewPortal />);
}
