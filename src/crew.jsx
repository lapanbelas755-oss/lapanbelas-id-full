import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { shareContent } from './utils/webShare';
import { SOP_MOMENTS, detectJobMoments, filterSopTemplatesForJob, getEffectiveJobSopItems, getContractDetailsForCrew } from './admin/adminUtils';
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
    case 'clipboard-check':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      );
    case 'file-text':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'shield-check':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    case 'printer':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );
    case 'trash-2':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    case 'credit-card':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'key':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
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

  // Login Form State & 4-Digit Security PIN
  const [loginStep, setLoginStep] = useState('phone'); // 'phone' | 'pin' | 'setup_pin'
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirmPin, setSetupConfirmPin] = useState('');
  const [targetCrewInfo, setTargetCrewInfo] = useState(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Modal Ganti PIN Mandiri di Dalam Portal
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinLoading, setChangePinLoading] = useState(false);

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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'schedule' || p === 'payroll' || p === 'jobs') return p;
    }
    return 'jobs';
  });
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobFilter, setJobFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const f = new URLSearchParams(window.location.search).get('filter');
      if (['all', 'pending', 'today', 'upcoming', 'unpaid'].includes(f)) return f;
    }
    return 'all';
  });
  const [selectedJob, setSelectedJob] = useState(null);

  // Native Haptic Vibration Feedback Helper (Tactile App Experience)
  const triggerHaptic = (ms = 15) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  };

  // Offline Sync Queue State
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const q = JSON.parse(localStorage.getItem('18studio_offline_queue') || '[]');
      return Array.isArray(q) ? q.length : 0;
    } catch (e) {
      return 0;
    }
  });
  const [syncingQueue, setSyncingQueue] = useState(false);

  // Helper simpan tindakan ke antrean offline jika jaringan venue blank spot
  const enqueueOfflineAction = (type, payload, optimisticJobUpdate = null) => {
    try {
      const queue = JSON.parse(localStorage.getItem('18studio_offline_queue') || '[]');
      queue.push({
        id: 'off-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        type,
        payload,
        queuedAt: new Date().toISOString()
      });
      localStorage.setItem('18studio_offline_queue', JSON.stringify(queue));
      setOfflineQueueCount(queue.length);

      // Optimistic update pada tampilan lokal
      if (optimisticJobUpdate && optimisticJobUpdate.appointmentId) {
        setJobs((prevJobs) =>
          prevJobs.map((j) => {
            if (j.appointment_id === optimisticJobUpdate.appointmentId) {
              return { ...j, ...optimisticJobUpdate.changes };
            }
            return j;
          })
        );
      }
    } catch (e) {
      console.warn('[Offline Queue Error]', e);
    }
  };

  // Flusher: Kirim semua antrean offline ke server saat internet kembali aktif
  const flushOfflineQueue = async () => {
    if (typeof window === 'undefined' || !navigator.onLine || syncingQueue) return;
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem('18studio_offline_queue') || '[]');
    } catch (e) {
      queue = [];
    }
    if (!Array.isArray(queue) || queue.length === 0) {
      setOfflineQueueCount(0);
      return;
    }

    setSyncingQueue(true);
    let successCount = 0;
    const remainingQueue = [];

    for (const item of queue) {
      try {
        if (item.type === 'checkin') {
          await axios.post('/api/crew/checkin', item.payload);
          successCount++;
        } else if (item.type === 'respond-job') {
          await axios.post('/api/crew/respond-job', item.payload);
          successCount++;
        }
      } catch (err) {
        if (!err.response) {
          remainingQueue.push(item);
        } else {
          console.warn('[Offline Sync Rejected by Server]', err.response.data);
          successCount++;
        }
      }
    }

    try {
      localStorage.setItem('18studio_offline_queue', JSON.stringify(remainingQueue));
    } catch (e) {}
    setOfflineQueueCount(remainingQueue.length);
    setSyncingQueue(false);

    if (successCount > 0) {
      showToast(`✅ ${successCount} tindakan presensi offline berhasil disinkronkan ke studio!`, 'success');
      fetchMyJobs(true);
    }
  };

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
  const [profileBank, setProfileBank] = useState(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  // OWNER MODE STATE (Dual-Mode Toggle)
  const [ownerMode, setOwnerMode] = useState(false);
  const [ownerPendingPayouts, setOwnerPendingPayouts] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerPayModalItem, setOwnerPayModalItem] = useState(null);
  const [transferProofBase64, setTransferProofBase64] = useState(null);
  const [submittingOwnerPay, setSubmittingOwnerPay] = useState(false);

  const fetchOwnerPendingPayouts = async () => {
    if (!crew?.phone) return;
    setOwnerLoading(true);
    try {
      const res = await axios.get(`/api/crew/owner/pending-payouts?phone=${crew.phone}`);
      if (res.data?.success) {
        setOwnerPendingPayouts(res.data.pending || []);
      }
    } catch (e) {
      console.warn('[Fetch owner payouts error]', e);
    } finally {
      setOwnerLoading(false);
    }
  };

  const handleCopyText = (txt, label = 'Teks') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      showToast(`${label} disalin ke clipboard! 📋`, 'info');
    }
  };

  const handleOwnerApprovePayout = async (e) => {
    e.preventDefault();
    if (!ownerPayModalItem) return;
    setSubmittingOwnerPay(true);
    try {
      const res = await axios.post('/api/crew/owner/approve-payout', {
        appointmentId: ownerPayModalItem.appointment_id,
        crewPhone: ownerPayModalItem.crew_phone,
        sessionKey: ownerPayModalItem.session_key,
        session: ownerPayModalItem.session,
        imageBase64: transferProofBase64,
        senderPhone: crew.phone
      });
      if (res.data?.success) {
        showToast(res.data.message || 'Gaji berhasil dicairkan! 💸', 'success');
        setOwnerPayModalItem(null);
        setTransferProofBase64(null);
        fetchOwnerPendingPayouts();
        fetchMyJobs(true);
      } else {
        throw new Error(res.data?.error || 'Gagal memproses pembayaran');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmittingOwnerPay(false);
    }
  };

  // SOP Checklist State & Modal
  const [sopModalOpen, setSopModalOpen] = useState(false);
  const [sopJob, setSopJob] = useState(null);
  const [sopChecklist, setSopChecklist] = useState([]);
  const [sopPhaseFilter, setSopPhaseFilter] = useState('all');
  const [savingSop, setSavingSop] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // Lightbox preview { url, title, phase }

  const defaultSopTemplates = [
    // --- UMUM (SEMUA ACARA) ---
    { id: 'pre_battery', phase: 'pre', moment: 'all', text: 'Baterai kamera, flash & lighting terisi 100% (bawa cadangan min 2-3 unit)', checked: false, role: 'all', image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80' },
    { id: 'pre_sdcard', phase: 'pre', moment: 'all', text: 'Memory card sudah diformat & speed class terverifikasi (bebas file lama)', checked: false, role: 'all' },
    { id: 'pre_clean', phase: 'pre', moment: 'all', text: 'Sensor kamera & optik lensa sudah dibersihkan (bebas debu/jamur)', checked: false, role: 'all' },
    { id: 'pre_rundown', phase: 'pre', moment: 'all', text: 'Pahami jam acara, lokasi venue, serta kontak pengantin/PIC', checked: false, role: 'all' },
    { id: 'pre_dresscode', phase: 'pre', moment: 'all', text: 'Dresscode seragam rapi hitam & bersepatu sesuai standar Lapanbelas ID', checked: false, role: 'all', image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80' },
    { id: 'on_standby', phase: 'on', moment: 'all', text: 'Tiba di lokasi standby minimal 45-60 menit sebelum acara dimulai', checked: false, role: 'all' },
    { id: 'on_checkin', phase: 'on', moment: 'all', text: 'Presensi kehadiran (PAP & GPS) di lokasi via tombol portal kru', checked: false, role: 'all' },
    { id: 'post_count', phase: 'post', moment: 'all', text: 'Verifikasi jumlah file RAW / durasi klip video lengkap tidak ada yang hilang', checked: false, role: 'all' },
    { id: 'post_backup', phase: 'post', moment: 'all', text: 'Backup file RAW ke Google Drive / storage Lapanbelas ID', checked: false, role: 'all' },
    { id: 'post_verify', phase: 'post', moment: 'all', text: 'Verifikasi file dapat dibuka sempurna & tidak corrupt sebelum format kartu', checked: false, role: 'all' },
    { id: 'post_submit', phase: 'post', moment: 'all', text: 'Setor link drive hasil dokumentasi di portal kru untuk klaim honor', checked: false, role: 'all' },

    // --- MOMEN AKAD NIKAH ---
    { id: 'akad_detail', phase: 'on', moment: 'akad', text: 'Detail shot: Cincin nikah, kotak mahar, buku nikah, seserahan & dekorasi akad', checked: false, role: 'all', image_url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&auto=format&fit=crop&q=80' },
    { id: 'akad_prep', phase: 'on', moment: 'akad', text: 'Preparation: Makeup touch-up pengantin, pasang ronce melati/veil & doa bersama', checked: false, role: 'all' },
    { id: 'akad_ijab', phase: 'on', moment: 'akad', text: 'Momen sakral: Ijab kabul penghulu, jabat tangan wali, pembacaan ta\'lik & ketukan sah', checked: false, role: 'all', image_url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=80' },
    { id: 'akad_cincin', phase: 'on', moment: 'akad', text: 'Pemasangan cincin di jari manis pengantin & pose pamer buku nikah/mahar', checked: false, role: 'all' },
    { id: 'akad_sungkem', phase: 'on', moment: 'akad', text: 'Sungkeman haru kedua pengantin ke orang tua inti (tangis, pelukan, restu)', checked: false, role: 'all' },
    { id: 'akad_family', phase: 'on', moment: 'akad', text: 'Foto bersama formasi keluarga inti kedua belah pihak & saksi di area akad', checked: false, role: 'all', image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80' },

    // --- MOMEN RESEPSI ---
    { id: 'resepsi_kirab', phase: 'on', moment: 'resepsi', text: 'Kirab pengantin / grand entrance masuk ballroom/pelaminan dengan langkah teratur', checked: false, role: 'all' },
    { id: 'resepsi_stage', phase: 'on', moment: 'resepsi', text: 'Foto panggung pelaminan: Pengantin berdua aesthetic & formasi keluarga besar bergantian', checked: false, role: 'all', image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80' },
    { id: 'resepsi_toss', phase: 'on', moment: 'resepsi', text: 'Momen lempar hand bouquet / wedding toss / games bersama sahabat & tamu', checked: false, role: 'all' },
    { id: 'resepsi_vip', phase: 'on', moment: 'resepsi', text: 'Candid interaksi ucapan selamat dari tamu VIP, relasi, dan kerabat di pelaminan', checked: false, role: 'all' },

    // --- MOMEN TASYAKURAN / AQIQAH ---
    { id: 'tasya_doa', phase: 'on', moment: 'tasyakuran', text: 'Pembacaan doa bersama, lantunan shalawat/marhaban, dan tausiyah berkah', checked: false, role: 'all' },
    { id: 'tasya_prosesi', phase: 'on', moment: 'tasyakuran', text: 'Prosesi potong tumpeng berkah atau simbolis pencukuran rambut aqiqah', checked: false, role: 'all' },
    { id: 'tasya_family', phase: 'on', moment: 'tasyakuran', text: 'Foto keluarga inti bersama anak/bayi & ramah tamah bersama tamu undangan', checked: false, role: 'all' },

    // --- MOMEN ENGAGEMENT / LAMARAN ---
    { id: 'eng_detail', phase: 'on', moment: 'engagement', text: 'Detail seserahan, kotak cincin lamaran, dekorasi backdrop & busana senada', checked: false, role: 'all' },
    { id: 'eng_prosesi', phase: 'on', moment: 'engagement', text: 'Prosesi perkenalan keluarga, penyampaian maksud lamaran & penyematan cincin tunangan', checked: false, role: 'all' },
    { id: 'eng_couple', phase: 'on', moment: 'engagement', text: 'Foto berdua pasangan calon pengantin (romantis & elegan) serta foto keluarga besar', checked: false, role: 'all' },

    // --- MOMEN PREWEDDING ---
    { id: 'prewed_wardrobe', phase: 'on', moment: 'prewedding', text: 'Detail wardrobe outfit, aksesoris, sepatu, dan properti pendukung prewedding', checked: false, role: 'all' },
    { id: 'prewed_concept', phase: 'on', moment: 'prewedding', text: 'Pengambilan shot intim, romantic couple poses, dan cinematic movement sesuai konsep', checked: false, role: 'all' },
    { id: 'prewed_golden', phase: 'on', moment: 'prewedding', text: 'Pemanfaatan golden hour matahari / lighting ambience dramatis sesuai moodboard', checked: false, role: 'all' },

    // --- MOMEN WISUDA ---
    { id: 'wisuda_detail', phase: 'on', moment: 'wisuda', text: 'Detail toga, kalung medali kelulusan, selempang gelar, & map ijazah', checked: false, role: 'all' },
    { id: 'wisuda_lempar', phase: 'on', moment: 'wisuda', text: 'Momen lempar topi toga ke udara ceria bersama rekan-rekan wisudawan', checked: false, role: 'all' },
    { id: 'wisuda_family', phase: 'on', moment: 'wisuda', text: 'Foto formal & candid haru wisudawan bersama kedua orang tua tercinta', checked: false, role: 'all' },

    // --- MOMEN STUDIO PHOTOSHOOT ---
    { id: 'studio_lighting', phase: 'on', moment: 'studio', text: 'Setting lighting key/fill/rim & background backdrop studio sesuai tema pilihan klien', checked: false, role: 'all' },
    { id: 'studio_pose', phase: 'on', moment: 'studio', text: 'Arahkan pose ekspresi variatif (formal tegap, semi-formal ceria, dan candid santai)', checked: false, role: 'all' },
    { id: 'studio_review', phase: 'on', moment: 'studio', text: 'Review kilat hasil jepretan di layar preview bersama klien sebelum sesi diakhiri', checked: false, role: 'all' }
  ];

  // ============================================================================
  // CONTRACT & E-SIGNATURE (STUDIO 1 TAHUN, LAPANBELAS.ID 2-3 TAHUN)
  // ============================================================================
  const [contractInfo, setContractInfo] = useState(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractNik, setContractNik] = useState('');
  const [contractAgreed, setContractAgreed] = useState(false);
  const [showContractClauses, setShowContractClauses] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureHasStroke, setSignatureHasStroke] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const fetchContract = useCallback(async (phone) => {
    if (!phone) return;
    try {
      setContractLoading(true);
      const res = await axios.get(`/api/crew/contract?phone=${encodeURIComponent(phone)}`);
      if (res.data?.success && res.data.contract) {
        setContractInfo(res.data.contract);
        if (res.data.contract.nik) {
          setContractNik(res.data.contract.nik);
        }
        // Auto prompt signing if not yet signed
        if (!res.data.contract.signed) {
          setContractModalOpen(true);
        }
      }
    } catch (err) {
      console.warn('[Fetch Contract Error]', err);
    } finally {
      setContractLoading(false);
    }
  }, []);

  const fetchProfileBank = useCallback(async (phone) => {
    if (!phone) return;
    try {
      const res = await axios.get(`/api/crew/bank?phone=${encodeURIComponent(phone)}`);
      if (res.data?.success && res.data.bank) {
        setProfileBank(res.data.bank);
        setBankName(res.data.bank.bank || 'BCA');
        setAccountNumber(res.data.bank.account_number || '');
        setAccountName(res.data.bank.account_name || '');
      }
    } catch (err) {
      console.warn('[Fetch Profile Bank Error]', err);
    }
  }, []);

  const handleSaveProfileBank = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      showToast('Lengkapi nama Bank, No. Rekening, dan Nama Pemilik!', 'warning');
      return;
    }
    setSavingBank(true);
    try {
      const res = await axios.post('/api/crew/bank', {
        phone: crew.phone,
        bank: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      });
      if (res.data?.success) {
        setProfileBank(res.data.bank);
        showToast('Rekening berhasil disimpan di profil kru! ✅', 'success');
        setBankModalOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal menyimpan rekening', 'error');
    } finally {
      setSavingBank(false);
    }
  };

  const handleToggleCarryItem = async (job, itemId, checked) => {
    const nextItems = (job.carry_items || []).map(i => i.id === itemId ? { ...i, checked } : i);
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, carry_items: nextItems } : j));
    try {
      await axios.post('/api/crew/update-carry-items', {
        appointmentId: job.appointment_id,
        phone: crew.phone,
        sessionKey: job.session_key,
        itemId,
        checked
      });
    } catch (e) {
      console.warn('[Toggle carry item error]', e);
    }
  };

  useEffect(() => {
    if (crew?.phone) {
      fetchContract(crew.phone);
      fetchProfileBank(crew.phone);
    }
  }, [crew?.phone, fetchContract, fetchProfileBank]);

  // Touch & Pointer Drawing Event Listeners for Responsive Canvas
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#38bdf8'; // Sky blue ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setSignatureHasStroke(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureHasStroke(false);
  };

  const handleSignContract = async (e) => {
    e.preventDefault();
    if (!contractNik.trim() || contractNik.trim().length < 8) {
      showToast('Harap masukkan NIK KTP yang valid!', 'error');
      return;
    }
    if (!signatureHasStroke) {
      showToast('Goreskan tanda tangan digital Anda pada kotak tanda tangan!', 'error');
      return;
    }
    if (!contractAgreed) {
      showToast('Anda wajib menyetujui seluruh klausul Surat Perjanjian Kerja Sama!', 'warning');
      return;
    }

    const canvas = canvasRef.current;
    const sigUrl = canvas.toDataURL('image/png');

    setIsSigning(true);
    try {
      const res = await axios.post('/api/crew/contract/sign', {
        phone: crew.phone,
        nik: contractNik.trim(),
        name: crew.name,
        signature_url: sigUrl
      });

      if (res.data?.success) {
        showToast(res.data.message || 'Kontrak kerja sama resmi ditandatangani! 🎉', 'success');
        setContractInfo(res.data.contract);
        setContractModalOpen(false);
      } else {
        showToast(res.data?.error || 'Gagal menandatangani kontrak', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Gagal menyimpan tanda tangan digital', 'error');
    } finally {
      setIsSigning(false);
    }
  };

  const handleOpenSopModal = async (job) => {
    setSopJob(job);
    let master = defaultSopTemplates;
    try {
      const res = await axios.get('/api/crew/sop-templates');
      if (res.data?.success && Array.isArray(res.data.templates) && res.data.templates.length > 0) {
        master = res.data.templates;
      }
    } catch (e) {}

    // Filter master templates according to job's moments & role + append custom_sop_items
    const items = getEffectiveJobSopItems(master, job);

    setSopChecklist(items);
    setSopPhaseFilter('all');
    setSopModalOpen(true);
  };

  const handleToggleSopItem = async (itemId) => {
    if (!sopJob) return;
    const updated = sopChecklist.map(it => {
      if (it.id === itemId) {
        return { ...it, checked: !it.checked, checked_at: !it.checked ? new Date().toISOString() : null };
      }
      return it;
    });
    setSopChecklist(updated);

    // Update locally in jobs state
    setJobs(prevJobs => prevJobs.map(j => j.id === sopJob.id ? { ...j, sop_checklist: updated } : j));

    // Save to server
    try {
      setSavingSop(true);
      await axios.post('/api/crew/update-sop', {
        appointmentId: sopJob.appointment_id,
        phone: crew?.phone,
        sessionKey: sopJob.session_key,
        session: sopJob.session,
        role: sopJob.role,
        sopChecklist: updated
      });
    } catch (e) {
      console.warn('[Auto save SOP warn]', e);
    } finally {
      setSavingSop(false);
    }
  };

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cooldown timer untuk tombol Lupa PIN (Anti-Spam)
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  // Auto-detect URL query phone or path: ?phone=08123... or /crew/08123...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qPhone = params.get('phone');
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const pathPhone = (pathParts.length > 1 && pathParts[0] === 'crew' && pathParts[1] !== 'crew.html') ? pathParts[1] : null;
    const targetPhone = qPhone || pathPhone;

    if (targetPhone && !crew) {
      setPhoneInput(targetPhone);
      handleCheckPhone(targetPhone);
    }
  }, []);

  // Step 1: Periksa nomor WhatsApp kru & status PIN
  const handleCheckPhone = async (phoneNum) => {
    setLoginLoading(true);
    setLoginError('');
    let clean = String(phoneNum || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (!clean.startsWith('62') && clean.length >= 8) clean = '62' + clean;

    try {
      const res = await axios.post('/api/crew/check-phone', { phone: clean });
      if (res.data?.success) {
        setTargetCrewInfo(res.data);
        if (res.data.has_pin) {
          setLoginStep('pin');
          setPinInput('');
        } else {
          setLoginStep('setup_pin');
          setSetupPin('');
          setSetupConfirmPin('');
        }
        return;
      }
    } catch (apiErr) {
      const errMsg = apiErr.response?.data?.error || 'Nomor WhatsApp tidak terdaftar sebagai kru aktif. Hubungi Admin studio.';
      setLoginError(errMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Step 2: Login menggunakan PIN 4-Digit
  const handleLoginWithPin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pinInput || pinInput.length !== 4) {
      setLoginError('Harap masukkan 4 digit PIN Anda.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await axios.post('/api/crew/login', {
        phone: targetCrewInfo?.phone || phoneInput,
        pin: pinInput
      });

      if (res.data?.success && res.data.crew) {
        setCrew(res.data.crew);
        localStorage.setItem('18studio_crew_session', JSON.stringify(res.data.crew));
        showToast(`Selamat datang, ${res.data.crew.name}! 👋`, 'success');
        setLoginStep('phone');
        setPinInput('');
        return;
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'PIN yang Anda masukkan salah. Coba lagi atau gunakan Lupa PIN.';
      setLoginError(errMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Step 3: Buat PIN Baru 4-Digit (Pertama Kali)
  const handleSetupNewPin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!setupPin || !/^\d{4}$/.test(setupPin)) {
      setLoginError('PIN wajib terdiri dari 4 angka numerik (contoh: 1234).');
      return;
    }
    if (setupPin !== setupConfirmPin) {
      setLoginError('Konfirmasi PIN tidak cocok dengan PIN baru.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      // 1. Simpan PIN Baru
      const saveRes = await axios.post('/api/crew/set-pin', {
        phone: targetCrewInfo?.phone || phoneInput,
        pin: setupPin
      });

      if (!saveRes.data?.success) {
        throw new Error(saveRes.data?.error || 'Gagal menyimpan PIN');
      }

      // 2. Langsung login otomatis
      const loginRes = await axios.post('/api/crew/login', {
        phone: targetCrewInfo?.phone || phoneInput,
        pin: setupPin
      });

      if (loginRes.data?.success && loginRes.data.crew) {
        setCrew(loginRes.data.crew);
        localStorage.setItem('18studio_crew_session', JSON.stringify(loginRes.data.crew));
        showToast(`🎉 PIN keamanan berhasil dibuat! Selamat bertugas, ${loginRes.data.crew.name}.`, 'success');
        setLoginStep('phone');
        setSetupPin('');
        setSetupConfirmPin('');
        return;
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Gagal membuat PIN. Silakan coba lagi.';
      setLoginError(errMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Lupa PIN: Reset otomatis & kirim 4-digit baru via WA Admin
  const handleForgotPin = async () => {
    if (forgotCooldown > 0) return;
    const targetPhone = targetCrewInfo?.phone || phoneInput;
    if (!targetPhone) return;

    const confirmReset = window.confirm(`Kirim PIN baru 4-digit ke WhatsApp Anda (${targetPhone})?\nPIN lama Anda akan otomatis digantikan.`);
    if (!confirmReset) return;

    setForgotLoading(true);
    setLoginError('');
    try {
      const res = await axios.post('/api/crew/forgot-pin', { phone: targetPhone });
      if (res.data?.success) {
        showToast(res.data.message || 'PIN baru telah dikirim ke WhatsApp Anda! 📲', 'success');
        setForgotCooldown(120); // 2 menit cooldown
        setPinInput('');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal mereset PIN via WhatsApp. Hubungi admin studio.';
      showToast(errMsg, 'error');
      setLoginError(errMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Ganti PIN Mandiri di dalam Portal Kru
  const handleChangePinInsidePortal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!oldPinInput || oldPinInput.length !== 4) {
      showToast('PIN lama harus 4 angka!', 'error');
      return;
    }
    if (!newPinInput || !/^\d{4}$/.test(newPinInput)) {
      showToast('PIN baru harus 4 angka numerik!', 'error');
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      showToast('Konfirmasi PIN baru tidak cocok!', 'error');
      return;
    }

    setChangePinLoading(true);
    try {
      const res = await axios.post('/api/crew/set-pin', {
        phone: crew?.phone,
        currentPin: oldPinInput,
        pin: newPinInput
      });

      if (res.data?.success) {
        showToast('PIN keamanan Anda berhasil diperbarui! 🔒', 'success');
        setChangePinModalOpen(false);
        setOldPinInput('');
        setNewPinInput('');
        setConfirmNewPinInput('');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal mengubah PIN. Pastikan PIN lama benar.';
      showToast(errMsg, 'error');
    } finally {
      setChangePinLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      setLoginError('Masukkan nomor WhatsApp Anda');
      return;
    }
    handleCheckPhone(phoneInput.trim());
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
  const [realtimeStatus, setRealtimeStatus] = useState(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connecting';
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
    {
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

          // Kunci VAPID server berubah -> subscription lama tidak akan pernah menerima notif. Daftarkan ulang.
          if (subscription && subscription.options && subscription.options.applicationServerKey) {
            const existingKey = new Uint8Array(subscription.options.applicationServerKey);
            const sameKey = existingKey.length === appServerKey.length && existingKey.every((v, i) => v === appServerKey[i]);
            if (!sameKey) {
              await subscription.unsubscribe().catch(() => {});
              subscription = null;
            }
          }

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

    // Sinkron saat login + setiap kali aplikasi dibuka lagi dari layar utama (tanpa perlu tekan tombol)
    let lastSyncAt = 0;
    const syncIfAllowed = () => {
      if (document.visibilityState !== 'visible') return;
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if (Date.now() - lastSyncAt < 60000) return;
      lastSyncAt = Date.now();
      syncPush();
    };
    syncIfAllowed();
    document.addEventListener('visibilitychange', syncIfAllowed);
    return () => document.removeEventListener('visibilitychange', syncIfAllowed);
    }
  }, [crew?.phone]);

  // Fetch Jobs (0-Detik Cache-Busting Network Fetch) dengan pengaman request ganda
  const jobsFetchInFlightRef = useRef(false);
  const jobsFetchQueuedRef = useRef(false);
  const fetchMyJobs = async (silent = false) => {
    if (!crew?.phone) return;
    if (jobsFetchInFlightRef.current) {
      jobsFetchQueuedRef.current = true;
      return;
    }
    jobsFetchInFlightRef.current = true;
    if (!silent) setLoadingJobs(true);
    try {
      const res = await axios.get(`/api/crew/my-jobs?phone=${encodeURIComponent(crew.phone)}&_t=${Date.now()}`);
      if (res.data.success) {
        const freshJobs = res.data.jobs || [];
        setJobs(freshJobs);
        try {
          localStorage.setItem(`18studio_cached_jobs_${crew.phone}`, JSON.stringify(freshJobs));
        } catch (e) {}

        // Langsung perbarui badge angka merah di ikon HP
        const pendingCount = freshJobs.filter(j => j.status === 'PENDING_APPROVAL').length;
        syncNativeAppBadge(pendingCount);
      }
    } catch (err) {
      if (!silent) console.error('Fetch Jobs Error:', err);
      // Auto-fallback ke cache offline
      try {
        const cached = localStorage.getItem(`18studio_cached_jobs_${crew.phone}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setJobs(parsed);
          }
        }
      } catch (e) {}
      if (!navigator.onLine && !silent) {
        showToast('📡 Sedang offline: Menampilkan jadwal yang tersimpan di HP.', 'info');
      }
    } finally {
      jobsFetchInFlightRef.current = false;
      if (!silent) setLoadingJobs(false);
      if (jobsFetchQueuedRef.current) {
        jobsFetchQueuedRef.current = false;
        fetchMyJobs(true);
      }
    }
  };

  useEffect(() => {
    if (!crew?.phone) return;

    // Load data dari cache lokal terlebih dahulu agar 0-detik terbuka
    try {
      const cached = localStorage.getItem(`18studio_cached_jobs_${crew.phone}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setJobs(parsed);
        }
      }
    } catch (e) {}

    // 1. Initial fetch langsung saat kru login/terdeteksi & flush antrean offline
    fetchMyJobs();
    flushOfflineQueue();

    // Debounce: banyak event realtime beruntun cukup 1x fetch
    let realtimeDebounce = null;
    const scheduleRefresh = () => {
      clearTimeout(realtimeDebounce);
      realtimeDebounce = setTimeout(() => fetchMyJobs(true), 400);
    };

    // 2. Realtime WebSocket Supabase: Tabel appointments & assignments
    const updateChannelStatus = (status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setRealtimeStatus(navigator.onLine ? 'connecting' : 'offline');
      }
    };

    const channelAppt = supabase
      .channel(`crew-realtime-appointments-${crew.phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        console.log('[Realtime Supabase] Tabel appointments berubah, memuat ulang tugas...');
        scheduleRefresh();
      })
      .subscribe(updateChannelStatus);

    const channelAsg = supabase
      .channel(`crew-realtime-assignments-${crew.phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_assignments' }, () => {
        console.log('[Realtime Supabase] Tabel crew_assignments berubah, memuat ulang tugas...');
        scheduleRefresh();
      })
      .subscribe(updateChannelStatus);

    // 4. Deteksi Jaringan & App Aktif / Foreground: saat buka dari home screen atau setelah klik notifikasi banner
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App Foreground] Aplikasi aktif kembali, merefresh data tugas...');
        fetchMyJobs(true);
        flushOfflineQueue();
      }
    };
    const handleOnline = () => {
      setRealtimeStatus('connecting');
      fetchMyJobs(true);
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setRealtimeStatus('offline');
    };

    window.addEventListener('focus', handleActive);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pageshow', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    // 5. Listener Sinyal dari Service Worker (saat push diterima di HP atau banner notifikasi diklik)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'CREW_PUSH_RECEIVED' || event.data?.type === 'CREW_NOTIFICATION_CLICKED') {
        const payload = event.data?.payload;
        const msgTitle = payload?.title || '📸 Penugasan Baru Masuk!';
        const msgBody = payload?.body || 'Anda baru saja ditugaskan pada project baru. Buka aplikasi untuk konfirmasi.';
        
        // Tampilkan in-app banner toast secara instan di layar
        showToast(`${msgTitle} ${msgBody}`, 'info');

        // Getar HP
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([200, 100, 200]); } catch (e) {}
        }

        // Langsung refresh data
        fetchMyJobs(true);
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // 6. Polling cadangan hemat baterai: 20 detik, hanya saat aplikasi terlihat di layar
    //    (update instan sudah ditangani Realtime WebSocket + Push Notification)
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) {
        fetchMyJobs(true);
      }
    }, 20000);

    return () => {
      clearTimeout(realtimeDebounce);
      supabase.removeChannel(channelAppt);
      supabase.removeChannel(channelAsg);
      window.removeEventListener('focus', handleActive);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pageshow', handleActive);
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

  const currentMonthStart = useMemo(() => {
    return `${new Date().toISOString().slice(0, 7)}-01`;
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const eventDate = (job.event_date || '').split('T')[0];
      // Hanya tampilkan acara bulan ini dan seterusnya
      if (eventDate && eventDate < currentMonthStart) return false;

      const isToday = eventDate === todayStr;
      const isPast = eventDate < todayStr;
      const isUpcoming = eventDate > todayStr;

      if (jobFilter === 'pending') return job.status === 'PENDING_APPROVAL';
      if (jobFilter === 'today') return isToday;
      if (jobFilter === 'upcoming') return isUpcoming && job.status !== 'REJECTED';
      if (jobFilter === 'unpaid') return ['FILES_VERIFIED', 'PAYOUT_REQUESTED'].includes(job.status);
      return true;
    });
  }, [jobs, jobFilter, todayStr, currentMonthStart]);

  // Statistics Summary (Hanya bulan ini dan seterusnya)
  const stats = useMemo(() => {
    const activeJobs = jobs.filter(j => {
      const d = (j.event_date || '').split('T')[0];
      return !d || d >= currentMonthStart;
    });
    const todayCount = activeJobs.filter(j => (j.event_date || '').split('T')[0] === todayStr).length;
    const pendingCount = activeJobs.filter(j => j.status === 'PENDING_APPROVAL').length;
    const claimableCount = activeJobs.filter(j => j.status === 'FILES_VERIFIED').length;
    const totalEarned = activeJobs
      .filter(j => j.status === 'PAID')
      .reduce((sum, j) => sum + Number(j.fee_amount || 0), 0);
    const pendingPayout = activeJobs
      .filter(j => ['FILES_VERIFIED', 'PAYOUT_REQUESTED'].includes(j.status))
      .reduce((sum, j) => sum + Number(j.fee_amount || 0), 0);

    return { todayCount, pendingCount, claimableCount, totalEarned, pendingPayout };
  }, [jobs, todayStr, currentMonthStart]);

  // Sync App Badge on iPhone/Android app icon based on pending tasks (Direct Dual-Channel Sync)
  const syncNativeAppBadge = useCallback((count) => {
    const num = parseInt(count, 10);
    if (typeof window === 'undefined') return;

    if (!isNaN(num) && num > 0) {
      // 1. Direct window navigator API
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(num).catch((e) => console.warn('[Crew setAppBadge]', e));
      }
      // 2. Global helper if available
      window.setAppBadge?.(num);
      // 3. PostMessage direct to Service Worker controller
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({ type: 'SYNC_BADGE', badgeCount: num });
        } catch (e) {}
      }
    } else {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch((e) => console.warn('[Crew clearAppBadge]', e));
      }
      window.clearAppBadge?.();
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' });
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    syncNativeAppBadge(stats.pendingCount);
  }, [stats.pendingCount, syncNativeAppBadge]);

  // Accept / Reject Job (dengan dukungan antrean offline saat sinyal blank spot)
  const handleRespondJob = async (job, action) => {
    if (action === 'reject') {
      setSelectedJob(job);
      setRejectModalOpen(true);
      return;
    }

    const payload = {
      appointmentId: job.appointment_id,
      phone: crew.phone,
      session: job.session,
      sessionKey: job.session_key,
      action: 'accept'
    };

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE_NETWORK');
      }

      // Optimistic update agar UI langsung berubah seketika (0 ms)
      setJobs(prev => prev.map(j => {
        const isMatch = j.appointment_id === job.appointment_id && (!job.session_key || j.session_key === job.session_key);
        return isMatch ? { ...j, status: 'ACCEPTED' } : j;
      }));

      const res = await axios.post('/api/crew/respond-job', payload);
      if (res.data.success) {
        showToast('Tugas berhasil diterima! Selamat bertugas 🙏✨', 'success');
        fetchMyJobs(true);
      }
    } catch (err) {
      if (!navigator.onLine || !err.response || err.message === 'OFFLINE_NETWORK') {
        enqueueOfflineAction('respond-job', payload, {
          appointmentId: job.appointment_id,
          changes: { status: 'ACCEPTED' }
        });
        showToast('📶 Sinyal offline: Konfirmasi tugas tersimpan di HP! Akan disinkronkan otomatis saat ada internet.', 'info');
      } else {
        // Rollback jika server error
        fetchMyJobs(true);
        showToast(err.response?.data?.error || 'Gagal merespon tugas', 'error');
      }
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedJob) return;
    setRejectLoading(true);
    try {
      // Optimistic update
      setJobs(prev => prev.map(j => {
        const isMatch = j.appointment_id === selectedJob.appointment_id && (!selectedJob.session_key || j.session_key === selectedJob.session_key);
        return isMatch ? { ...j, status: 'REJECTED', rejection_reason: rejectReason.trim() } : j;
      }));

      const res = await axios.post('/api/crew/respond-job', {
        appointmentId: selectedJob.appointment_id,
        phone: crew.phone,
        session: selectedJob.session,
        sessionKey: selectedJob.session_key,
        action: 'reject',
        rejectionReason: rejectReason.trim()
      });
      if (res.data.success) {
        showToast('Penolakan tugas telah dikonfirmasi dan dilaporkan ke admin.', 'info');
        setRejectModalOpen(false);
        setRejectReason('');
        setSelectedJob(null);
        fetchMyJobs(true);
      }
    } catch (err) {
      fetchMyJobs(true);
      showToast(err.response?.data?.error || 'Gagal memproses penolakan', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  // Presensi Kehadiran PAP (Cukup Foto PAP, tanpa GPS)
  const handleOpenCheckin = (job) => {
    setSelectedJob(job);
    setCheckinPhoto(null);
    setCheckinModalOpen(true);
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
    const checkinPayload = {
      appointmentId: selectedJob.appointment_id,
      phone: crew.phone,
      session: selectedJob.session,
      sessionKey: selectedJob.session_key,
      imageBase64: checkinPhoto,
      lat: null,
      lng: null,
      address: selectedJob.client_address
    };

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE_NETWORK');
      }
      const res = await axios.post('/api/crew/checkin', checkinPayload);
      if (res.data.success) {
        showToast('Presensi Berhasil! WA otomatis terkirim ke klien 🎉', 'success');
        setCheckinModalOpen(false);
        fetchMyJobs();
      }
    } catch (err) {
      if (!navigator.onLine || !err.response || err.message === 'OFFLINE_NETWORK') {
        enqueueOfflineAction('checkin', checkinPayload, {
          appointmentId: selectedJob.appointment_id,
          changes: {
            is_checked_in: true,
            checked_in_at: new Date().toISOString()
          }
        });
        showToast('📶 Sinyal blank spot: Presensi tersimpan di HP! Akan dikirim otomatis begitu sinyal kembali.', 'info');
        setCheckinModalOpen(false);
      } else {
        showToast(err.response?.data?.error || 'Gagal mengirim presensi', 'error');
      }
    } finally {
      setCheckinLoading(false);
    }
  };

  // Submit Files with Quality Gating Checklist Check
  const handleOpenSubmitFile = (job) => {
    // Quality Gating Check: Ensure SOP items are completed before submitting drive link
    const sopItems = getEffectiveJobSopItems(defaultSopTemplates, job);
    const uncompleted = sopItems.filter(it => !it.checked);
    if (uncompleted.length > 0) {
      showToast(`⚠️ Harap lengkapi checklist SOP & Shot List (${uncompleted.length} item tersisa) sebelum setor link file!`, 'warning');
      handleOpenSopModal(job);
      return;
    }

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

    // Quality gate safety verify
    const sopItems = getEffectiveJobSopItems(defaultSopTemplates, selectedJob);
    const uncompleted = sopItems.filter(it => !it.checked);
    if (uncompleted.length > 0) {
      showToast(`⚠️ Wajib menyelesaikan checklist SOP & Shot List (${uncompleted.length} item tersisa) sebelum setor file demi konsistensi mutu!`, 'error');
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
    setBankName(job.payout_bank || profileBank?.bank || 'BCA');
    setAccountNumber(job.payout_account_number || profileBank?.account_number || '');
    setAccountName(job.payout_account_name || profileBank?.account_name || crew.name || '');
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
        // Also persist to profile bank
        axios.post('/api/crew/bank', {
          phone: crew.phone,
          bank: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim()
        }).then(r => { if (r.data?.bank) setProfileBank(r.data.bank); }).catch(() => {});

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
        className="min-h-screen bg-[#020c0e] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)'
        }}
      >
        {/* RevenuePulse AI Ambient Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[110px] pointer-events-none" />

        <div className="w-full max-w-md rp-card rounded-3xl p-6 sm:p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400/20 to-emerald-500/20 text-teal-300 mb-4 border border-teal-400/35 shadow-[0_0_25px_rgba(45,212,191,0.25)]">
              <Icon name="camera" className="w-8 h-8" />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Lapanbelas</h1>
              <span className="text-2xl font-extrabold text-teal-400">AI</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 uppercase tracking-wider">Crew</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Masuk untuk melihat jadwal penugasan, presensi PAP lokasi, SOP lapangan, dan pencairan honor.
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <Icon name="x-circle" className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* STEP 1: INPUT NOMOR WHATSAPP */}
          {loginStep === 'phone' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor WhatsApp Terdaftar
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789 atau 62812..."
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-[#041517]/90 border border-teal-400/20 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-mono"
                    autoFocus
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  Gunakan nomor WhatsApp yang didaftarkan oleh admin studio.
                </span>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#020c0e] font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_6px_22px_rgba(45,212,191,0.28)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#020c0e] border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Nomor...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan</span>
                    <Icon name="arrow-right" className="w-4 h-4" />
                  </>
                )}
              </button>

              {isBiometricAvailable && (
                <div className="pt-2">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-teal-400/15"></div>
                    <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-medium">atau masuk instan</span>
                    <div className="flex-grow border-t border-teal-400/15"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={bioLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#051a1d] hover:bg-[#08262a] border border-teal-400/30 text-teal-300 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/40 hover:border-teal-400/60 disabled:opacity-50"
                  >
                    {bioLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        <span>Memindai Sidik Jari / Face ID...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="fingerprint" className="w-4 h-4 text-teal-400" />
                        <span>{savedBio ? `Masuk sebagai ${savedBio.crewName || 'Kru'} (Face ID)` : 'Masuk dengan Sidik Jari / Face ID'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* STEP 2: MASUKKAN PIN 4-DIGIT */}
          {loginStep === 'pin' && (
            <form onSubmit={handleLoginWithPin} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#041517]/90 border border-teal-400/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Login sebagai:</p>
                  <p className="text-sm font-bold text-teal-300">{targetCrewInfo?.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{targetCrewInfo?.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('phone');
                    setLoginError('');
                    setPinInput('');
                  }}
                  className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/20 transition"
                >
                  Ganti
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    PIN Keamanan (4 Angka)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] text-teal-400 hover:text-teal-300 transition"
                  >
                    {showPin ? 'Sembunyikan' : 'Lihat Angka'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setPinInput(val);
                    }}
                    className="w-full bg-[#041517]/90 border border-teal-400/20 rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-slate-600 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-bold"
                    autoFocus
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1.5 block text-center">
                  Masukkan 4 digit PIN yang telah Anda buat.
                </span>
              </div>

              <button
                type="submit"
                disabled={loginLoading || pinInput.length !== 4}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#020c0e] font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_6px_22px_rgba(45,212,191,0.28)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#020c0e] border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi PIN...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Portal</span>
                    <Icon name="arrow-right" className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleForgotPin}
                  disabled={forgotLoading || forgotCooldown > 0}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                      <span>Mengirim PIN baru ke WhatsApp...</span>
                    </>
                  ) : forgotCooldown > 0 ? (
                    <span>⏳ Tunggu {forgotCooldown} detik untuk minta PIN lagi</span>
                  ) : (
                    <span>🔑 Lupa PIN? Kirim PIN baru via WhatsApp</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: BUAT PIN BARU (PERTAMA KALI) */}
          {loginStep === 'setup_pin' && (
            <form onSubmit={handleSetupNewPin} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-400/25">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-xs mb-1">
                  <span>🎉</span>
                  <span>Selamat datang, {targetCrewInfo?.name}!</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ini adalah pertama kali Anda login. Silakan buat <strong>PIN 4-digit numerik</strong> untuk melindungi data jadwal dan pencairan honor Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Buat PIN Baru (4 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Contoh: 1234"
                  value={setupPin}
                  onChange={(e) => setSetupPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  className="w-full bg-[#041517]/90 border border-teal-400/20 rounded-xl px-4 py-3.5 text-center text-xl font-mono tracking-[0.4em] text-white placeholder-slate-600 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Konfirmasi PIN Baru (Ketik Ulang 4 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Ketik ulang 4 angka"
                  value={setupConfirmPin}
                  onChange={(e) => setSetupConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  className="w-full bg-[#041517]/90 border border-teal-400/20 rounded-xl px-4 py-3.5 text-center text-xl font-mono tracking-[0.4em] text-white placeholder-slate-600 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading || setupPin.length !== 4 || setupConfirmPin.length !== 4}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#020c0e] font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-[0_6px_22px_rgba(45,212,191,0.28)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#020c0e] border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan PIN Keamanan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan PIN & Masuk Portal</span>
                    <Icon name="check-circle" className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('phone');
                    setLoginError('');
                  }}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  ← Kembali / Ganti Nomor WhatsApp
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-teal-400/10 text-center">
            <p className="text-[11px] text-slate-500">
              Belum terdaftar sebagai kru? Hubungi Admin Studio di WhatsApp: <span className="text-teal-300 font-semibold">0823-6325-2291</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Portal Main Interface (RevenuePulse AI Workspace)
  const crewInitials = (crew.name || 'KR')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isOwnerCapable = crew.is_owner || (crew.notes || '').toLowerCase().includes('owner') || crew.phone === '628113178579';

  return (
    <div 
      className="min-h-screen bg-[#020c0e] text-slate-100 flex flex-col md:flex-row relative overflow-x-hidden selection:bg-teal-500 selection:text-black"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)'
      }}
    >
      {/* RevenuePulse AI Ambient Background Glows */}
      <div className="pointer-events-none fixed -top-32 left-1/4 w-[520px] h-[520px] rounded-full bg-teal-500/10 blur-[130px] z-0" />
      <div className="pointer-events-none fixed bottom-0 right-10 w-[440px] h-[440px] rounded-full bg-emerald-500/10 blur-[130px] z-0" />

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
            'bg-[#061e21]/95 border-teal-400/30 text-white shadow-black/80'
          }`}>
            <Icon name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'x-circle' : 'bell'} className="w-4 h-4 shrink-0" />
            <span className="font-medium text-xs sm:text-sm leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP FLOATING GLASS SIDEBAR (REVENUEPULSE AI STYLE)                     */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 m-3.5 mr-0 rounded-3xl bg-gradient-to-b from-[#061e21]/95 via-[#041517]/95 to-[#031012]/95 border border-teal-400/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl sticky top-3.5 h-[calc(100vh-28px)] z-20 overflow-hidden">
        {/* Brand Header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-600 p-[1px] shadow-[0_0_20px_rgba(45,212,191,0.35)] shrink-0">
            <div className="w-full h-full bg-[#04181a] rounded-[11px] flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-[15px] tracking-tight text-white">Lapanbelas</span>
              <span className="font-extrabold text-[15px] text-teal-400">AI</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300/70 block">Crew Workspace</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {/* Group 1: Workspace */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400/60">
              WORKSPACE
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setOwnerMode(false);
                  setActiveTab('jobs');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  !ownerMode && activeTab === 'jobs'
                    ? 'bg-gradient-to-r from-teal-500/25 via-emerald-500/15 to-transparent text-white font-semibold border border-teal-400/35 shadow-[0_4px_20px_-2px_rgba(20,184,166,0.28)]'
                    : 'text-slate-300/75 hover:text-white hover:bg-teal-500/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="camera" className={`w-4 h-4 ${!ownerMode && activeTab === 'jobs' ? 'text-teal-300' : 'text-slate-400'}`} />
                  <span>Tugas & Presensi</span>
                </div>
                {stats.pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30">
                    {stats.pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setOwnerMode(false);
                  setActiveTab('schedule');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  !ownerMode && activeTab === 'schedule'
                    ? 'bg-gradient-to-r from-teal-500/25 via-emerald-500/15 to-transparent text-white font-semibold border border-teal-400/35 shadow-[0_4px_20px_-2px_rgba(20,184,166,0.28)]'
                    : 'text-slate-300/75 hover:text-white hover:bg-teal-500/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="calendar" className={`w-4 h-4 ${!ownerMode && activeTab === 'schedule' ? 'text-teal-300' : 'text-slate-400'}`} />
                  <span>Kalender Project</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setOwnerMode(false);
                  setActiveTab('payroll');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  !ownerMode && activeTab === 'payroll'
                    ? 'bg-gradient-to-r from-teal-500/25 via-emerald-500/15 to-transparent text-white font-semibold border border-teal-400/35 shadow-[0_4px_20px_-2px_rgba(20,184,166,0.28)]'
                    : 'text-slate-300/75 hover:text-white hover:bg-teal-500/10 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="wallet" className={`w-4 h-4 ${!ownerMode && activeTab === 'payroll' ? 'text-teal-300' : 'text-slate-400'}`} />
                  <span>Dompet & Fee</span>
                </div>
                {stats.claimableCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    {stats.claimableCount}
                  </span>
                )}
              </button>

              {isOwnerCapable && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    const next = !ownerMode;
                    setOwnerMode(next);
                    if (next) fetchOwnerPendingPayouts();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    ownerMode
                      ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-transparent text-amber-300 font-semibold border border-amber-400/40 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.25)]'
                      : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>👑</span>
                    <span>Approval Owner</span>
                  </div>
                  {ownerPendingPayouts.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {ownerPendingPayouts.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Group 2: Akun & Keamanan */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400/60">
              SETTINGS & LEGAL
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setBankName(profileBank?.bank || 'BCA');
                  setAccountNumber(profileBank?.account_number || '');
                  setAccountName(profileBank?.account_name || crew?.name || '');
                  setBankModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[12px] font-medium text-slate-300/75 hover:text-white hover:bg-teal-500/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Icon name="credit-card" className="w-4 h-4 text-emerald-400" />
                  <span>Rekening Gaji</span>
                </div>
                {profileBank && <span className="text-[10px] font-mono text-teal-300">{profileBank.bank}</span>}
              </button>

              <button
                type="button"
                onClick={() => setContractModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[12px] font-medium text-slate-300/75 hover:text-white hover:bg-teal-500/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Icon name="file-text" className="w-4 h-4 text-teal-400" />
                  <span>Kontrak Digital</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${contractInfo?.signed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setOldPinInput('');
                  setNewPinInput('');
                  setConfirmNewPinInput('');
                  setChangePinModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[12px] font-medium text-slate-300/75 hover:text-white hover:bg-teal-500/10 transition-all"
              >
                <span className="text-xs">🔑</span>
                <span>Ganti PIN 4-Digit</span>
              </button>

              {isBiometricAvailable && (
                <button
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={bioLoading}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[12px] font-medium text-slate-300/75 hover:text-white hover:bg-teal-500/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="fingerprint" className="w-4 h-4 text-teal-400" />
                    <span>Biometrik Face ID</span>
                  </div>
                  {savedBio && <span className="text-[10px] text-emerald-400 font-bold">Aktif</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Crew Card */}
        <div className="p-3 border-t border-teal-400/10 bg-[#020d0f]/60">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-300 via-emerald-400 to-teal-600 text-[#021012] font-extrabold text-xs flex items-center justify-center shrink-0">
                {crewInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{crew.name}</p>
                <p className="text-[10px] text-teal-400/80 capitalize truncate">{crew.role} • {crew.type}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
              title="Keluar"
            >
              <Icon name="log-out" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE COLUMN (TOP HEADER + CONTENT)                              */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Navbar (RevenuePulse AI Pill Bar) */}
        <header
          className="sticky top-0 z-30 bg-[#020c0e]/85 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-teal-400/15 md:border-b-0 px-4 pb-3 md:pb-0 sm:px-6"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)'
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Mobile Brand / Desktop Filter Search Pill */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400/25 to-emerald-500/20 border border-teal-400/35 flex items-center justify-center text-teal-300 font-bold shadow-[0_0_15px_rgba(45,212,191,0.25)] shrink-0">
                <Icon name="camera" className="w-4 h-4" />
              </div>

              {/* Desktop Search / Quick Filter Pill */}
              <div className="hidden md:flex items-center justify-between w-full max-w-md px-4 py-2.5 rounded-2xl bg-[#051a1d]/90 border border-teal-400/20 text-slate-400 shadow-inner">
                <div className="flex items-center gap-2.5 text-xs">
                  <Icon name="camera" className="w-4 h-4 text-teal-400" />
                  <span className="text-slate-300 font-medium">Portal Kru: <strong className="text-white">{crew.name}</strong></span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-400/25 capitalize">
                    {crew.role}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-teal-950/90 border border-teal-400/20 text-[10px] font-mono text-teal-300">
                  {jobs.length} Job
                </span>
              </div>

              {/* Mobile Crew Info */}
              <div className="md:hidden min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-extrabold text-sm text-white truncate max-w-[110px] sm:max-w-[160px] capitalize">{crew.name}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 capitalize shrink-0 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : realtimeStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{crew.role}</span>
                  </span>
                </div>
                <span className="text-[10.5px] text-slate-400 block truncate font-mono mt-0.5">{crew.phone}</span>
              </div>
            </div>

            {/* Right Actions Bar (Rapi & Tidak Menumpuk: Notifikasi, Refresh, dan 1 Tombol Pengaturan) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Live Realtime Pill (Desktop Only - di HP sudah menyatu di dot role) */}
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 whitespace-nowrap transition-all ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : realtimeStatus === 'connecting'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 animate-pulse'
                    : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    realtimeStatus === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                      : realtimeStatus === 'connecting'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
                <span>
                  {realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'connecting' ? 'Sync...' : 'Offline'}
                </span>
              </div>

              {isOwnerCapable && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    const next = !ownerMode;
                    setOwnerMode(next);
                    if (next) fetchOwnerPendingPayouts();
                  }}
                  className={`px-2.5 py-2 rounded-xl text-[10px] font-extrabold border transition-all flex items-center gap-1 active:scale-95 shrink-0 whitespace-nowrap ${
                    ownerMode
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-amber-500/30'
                      : 'bg-[#051a1d] text-amber-300 border-amber-400/30 hover:bg-amber-500/15'
                  }`}
                  title="Ganti Mode: Tugas Kru ⇄ Dashboard Owner"
                >
                  <span>👑</span>
                  <span className="hidden sm:inline">{ownerMode ? 'Owner Aktif' : 'Mode Owner'}</span>
                  {ownerPendingPayouts.length > 0 && !ownerMode && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleTogglePushNotification}
                className={`relative w-9 h-9 rounded-xl transition-all text-xs flex items-center justify-center border shrink-0 cursor-pointer ${
                  pushSubscribed
                    ? 'bg-[#051a1d] text-teal-300 border-teal-400/25 hover:bg-teal-500/15'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-400/30'
                }`}
                title="Aktifkan Notifikasi Masuk ke Layar Kunci HP"
              >
                <Icon name="bell" className="w-4 h-4" />
                {!pushSubscribed && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#020c0e]" />
                )}
              </button>

              <button
                type="button"
                onClick={fetchMyJobs}
                disabled={loadingJobs}
                className="w-9 h-9 rounded-xl bg-[#051a1d] hover:bg-teal-500/15 text-slate-300 hover:text-white border border-teal-400/20 transition-all text-xs flex items-center justify-center shrink-0 cursor-pointer"
                title="Refresh Data"
              >
                <Icon name="refresh" className={`w-4 h-4 ${loadingJobs ? 'animate-spin text-teal-400' : ''}`} />
              </button>

              {/* 1 Tombol Pengaturan Terpadu (Rekening, Ganti PIN, Lupa PIN via WA, Kontrak, Keluar) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsMenuOpen(prev => !prev)}
                  className={`h-9 px-2.5 sm:px-3 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    settingsMenuOpen
                      ? 'bg-teal-500/25 text-teal-200 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.25)]'
                      : 'bg-[#051a1d] hover:bg-teal-500/15 text-teal-300 border-teal-400/25'
                  }`}
                  title="Pengaturan Akun, Rekening & PIN"
                >
                  <Icon name="settings" className="w-4 h-4 text-teal-300" />
                  <span className="hidden sm:inline">Pengaturan</span>
                </button>

                {settingsMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setSettingsMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#04181b]/95 backdrop-blur-2xl border border-teal-400/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(45,212,191,0.18)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-teal-400/15 mb-1">
                        <p className="text-xs font-extrabold text-white truncate">{crew.name}</p>
                        <p className="text-[10px] font-mono text-teal-300/80 truncate">{crew.phone} • {crew.role}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsMenuOpen(false);
                          setBankName(profileBank?.bank || 'BCA');
                          setAccountNumber(profileBank?.account_number || '');
                          setAccountName(profileBank?.account_name || crew?.name || '');
                          setBankModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-teal-500/15 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="credit-card" className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Rekening Pencairan</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-400/25">
                          {profileBank ? profileBank.bank : 'Atur'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsMenuOpen(false);
                          setOldPinInput('');
                          setNewPinInput('');
                          setConfirmNewPinInput('');
                          setChangePinModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-teal-500/15 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="key" className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Ganti PIN 4-Digit</span>
                        </div>
                        <span className="text-[10px] text-slate-400">🔑</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsMenuOpen(false);
                          handleForgotPin();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-teal-500/15 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="message-circle" className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Lupa / Reset PIN via WA</span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-bold">WA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsMenuOpen(false);
                          setContractModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-teal-500/15 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="file-text" className="w-4 h-4 text-teal-400 shrink-0" />
                          <span>Kontrak Kerja Digital</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${contractInfo?.signed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      </button>

                      {isBiometricAvailable && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsMenuOpen(false);
                            handleRegisterBiometric();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-teal-500/15 transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon name="fingerprint" className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>Biometrik Face ID</span>
                          </div>
                          {savedBio && <span className="text-[10px] text-emerald-400 font-bold">Aktif</span>}
                        </button>
                      )}

                      <div className="my-1 border-t border-teal-400/15" />

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/15 transition text-left cursor-pointer"
                      >
                        <Icon name="log-out" className="w-4 h-4 shrink-0" />
                        <span>Keluar dari Portal</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main
          className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:px-6"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)'
          }}
        >
        {/* ========================================================================= */}
        {/* VIEW KHUSUS: DASHBOARD KEUANGAN & PEMBAYARAN GAJI (MODE OWNER AKTIF)      */}
        {/* ========================================================================= */}
        {ownerMode ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Banner Mode Owner */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                  👑
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-amber-300">Dashboard Keuangan Owner</h2>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Verifikasi transfer gaji kru dari HP. Bukti transfer otomatis diarsip ke email studio (0 MB Supabase storage).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={fetchOwnerPendingPayouts}
                  disabled={ownerLoading}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Icon name="refresh" className={`w-3.5 h-3.5 ${ownerLoading ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerMode(false)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition"
                >
                  Kembali ke Tugas Foto 📸
                </button>
              </div>
            </div>

            {/* Antrean Kru Siap Bayar */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>💸 Antrean Gaji Siap Ditransfer</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {ownerPendingPayouts.length} Kru
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Hanya menampilkan kru yang SOP-nya sudah 100% dan file dokumentasinya telah diverifikasi admin.
                  </p>
                </div>
              </div>

              {ownerLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Memuat antrean pembayaran gaji...</div>
              ) : ownerPendingPayouts.length === 0 ? (
                <div className="py-12 text-center bg-white/2 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-3xl">☕</p>
                  <p className="text-white font-bold text-sm">Tidak ada antrean pencairan gaji saat ini</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Semua penugasan kru yang selesai sudah berstatus LUNAS atau belum diverifikasi admin.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ownerPendingPayouts.map(item => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-white/10 hover:border-amber-500/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-white">{item.crew_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {item.session}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-gray-300 border border-white/10">
                            {item.role}
                          </span>
                        </div>

                        <div className="text-xs text-gray-400 space-y-0.5">
                          <p>
                            <span className="text-gray-300 font-medium">Acara: #{item.appointment_id} - {item.client_name}</span> ({item.package_name})
                          </p>
                          <p className="text-gray-500 text-[11px]">Tanggal Acara: {formatDateID(item.event_date)}</p>
                        </div>

                        {/* Rekening Tujuan Kru + Tombol Salin */}
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 max-w-md">
                          <div className="min-w-0">
                            <span className="text-[10px] text-gray-400 block">Rekening Tujuan:</span>
                            <span className="font-mono text-xs font-bold text-white truncate block">
                              {item.bank_name} • {item.account_number || '(Belum isi no rek)'}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate block">a.n {item.account_name}</span>
                          </div>
                          {item.account_number && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(item.account_number, 'Nomor rekening')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition shrink-0"
                            >
                              📋 Salin Rekening
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-gray-400 block">Total Ditransfer:</span>
                          <span className="text-lg sm:text-xl font-mono font-black text-emerald-400">
                            {formatCurrency(item.total_paid)}
                          </span>
                          {item.deduction > 0 && (
                            <span className="text-[10px] text-rose-400 block">
                              Potongan: -{formatCurrency(item.deduction)} ({item.deduction_reason || 'Pinalti'})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOwnerPayModalItem(item);
                            setTransferProofBase64(null);
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <span>📸 Upload Bukti & Cairkan</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
        {/* ========================================================================= */}
        {/* LEGAL CONTRACT BANNER (STAFF TETAP PKWT VS MITRA FREELANCE) */}
        {/* ========================================================================= */}
        {contractInfo && !contractInfo.signed && (() => {
          const cDetails = getContractDetailsForCrew(contractInfo.crew_type || crew?.type || 'freelance', contractInfo.contract_type, contractInfo.duration_years);
          return (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-red-500/20 via-amber-500/15 to-red-500/10 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl shadow-red-950/40 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                  <Icon name="file-text" className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-200">
                    {cDetails.isStaff ? 'Perjanjian Kerja PKWT Belum Ditandatangani' : 'Perjanjian Kemitraan Freelance Belum Ditandatangani'}
                  </p>
                  <p className="text-xs text-gray-300">
                    {cDetails.isStaff 
                      ? `Dokumen PKWT (${cDetails.validityLabel}) wajib ditandatangani digital sebelum menerima penugasan.` 
                      : 'Pakta komitmen kemitraan freelance & perlindungan file wajib disepakati untuk keamanan penugasan.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setContractModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Icon name="shield-check" className="w-4 h-4" />
                <span>Tanda Tangani {cDetails.isStaff ? 'PKWT' : 'Kemitraan'}</span>
              </button>
            </div>
          );
        })()}

        {contractInfo && contractInfo.signed && (() => {
          const cDetails = getContractDetailsForCrew(contractInfo.crew_type || crew?.type || 'freelance', contractInfo.contract_type, contractInfo.duration_years);
          return (
            <div className="mb-5 px-4 py-2.5 rounded-2xl bg-teal-500/10 border border-teal-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Icon name="shield-check" className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">
                  Status Legalitas: <strong>{cDetails.isStaff ? `Kontrak PKWT Aktif (${cDetails.validityLabel})` : 'Mitra Freelance Resmi Aktif'}</strong>
                </span>
              </div>
              <button
                onClick={() => setContractModalOpen(true)}
                className="text-teal-300 hover:text-teal-200 font-semibold flex items-center gap-1 text-left sm:text-right"
              >
                <span>📄 Lihat Dokumen & TTD</span>
                <Icon name="arrow-right" className="w-3 h-3" />
              </button>
            </div>
          );
        })()}
        {/* Prominent Push Notification Banner if not yet subscribed */}
        {!pushSubscribed && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/5 border border-teal-400/30 flex items-center justify-between gap-3 shadow-lg shadow-teal-500/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0 border border-teal-400/30">
                <Icon name="bell" className="w-5 h-5 text-teal-300 animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-teal-200">Aktifkan Notifikasi Banner HP</p>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Terima panggilan tugas foto & event baru langsung di layar HP</p>
              </div>
            </div>
            <button
              onClick={handleTogglePushNotification}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-[#020c0e] font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Aktifkan</span>
              <Icon name="arrow-right" className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Offline Action Queue Banner */}
        {offlineQueueCount > 0 && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg shadow-cyan-950/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/30">
                <Icon name="upload-cloud" className={`w-5 h-5 text-cyan-400 ${syncingQueue ? 'animate-bounce' : ''}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-cyan-200">
                  {offlineQueueCount} Tindakan Presensi Tersimpan Offline
                </p>
                <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                  Akan otomatis dikirim ke studio begitu HP tersambung internet
                </p>
              </div>
            </div>
            <button
              onClick={flushOfflineQueue}
              disabled={syncingQueue}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Icon name="refresh" className={`w-3.5 h-3.5 ${syncingQueue ? 'animate-spin' : ''}`} />
              <span>{syncingQueue ? 'Mengirim...' : 'Sinkronkan'}</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 1: 4 REVENUEPULSE AI KPI CARDS (WAVE, MATRIX, CURVE, NODE LINE)       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">
          {/* KPI 1: Total Fee Cair (Wave Sparkline + Live Pill) */}
          <div
            onClick={() => setActiveTab('payroll')}
            className="rp-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-teal-400/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center text-teal-300">
                    <Icon name="wallet" className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Total Fee Cair</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                {formatCurrency(stats.totalEarned)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  ↑ {jobs.filter(j => j.status === 'PAID').length} Job
                </span>
                <span className="text-slate-400">Telah Ditransfer</span>
              </div>
            </div>
            {/* Wave Sparkline SVG */}
            <div className="mt-3 pt-1">
              <svg viewBox="0 0 220 48" className="w-full h-11 overflow-visible">
                <defs>
                  <linearGradient id="crewWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,38 C25,22 45,35 70,18 C95,4 120,32 148,14 C175,2 195,24 220,8 L220,48 L0,48 Z"
                  fill="url(#crewWaveGrad)"
                />
                <path
                  d="M0,38 C25,22 45,35 70,18 C95,4 120,32 148,14 C175,2 195,24 220,8"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* KPI 2: Tugas & Jadwal Aktif (4x12 Dot-Matrix Grid) */}
          <div
            onClick={() => {
              setActiveTab('jobs');
              setJobFilter('all');
            }}
            className="rp-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-teal-400/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center text-teal-300">
                    <Icon name="camera" className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Tugas Hari Ini</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-400/25">
                  {jobs.length} Total
                </span>
              </div>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {stats.todayCount} <span className="text-xs font-semibold text-slate-400">Acara Hari H</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                <span className="text-emerald-400 font-bold">↑ Standby</span>
                <span className="text-slate-400">Jadwal Dokumentasi</span>
              </div>
            </div>
            {/* 4x12 Dot Matrix */}
            <div className="mt-3 pt-1.5 grid grid-cols-12 gap-1.5">
              {Array.from({ length: 36 }).map((_, idx) => {
                const isTeal = idx % 3 === 0 || idx % 7 === 0;
                const isBlue = idx % 5 === 0;
                return (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full ${
                      isTeal
                        ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]'
                        : isBlue
                        ? 'bg-cyan-400/80'
                        : 'bg-teal-950/90 border border-teal-500/20'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* KPI 3: Fee Siap Klaim (Smooth Rising Area Curve) */}
          <div
            onClick={() => {
              setActiveTab('jobs');
              setJobFilter('unpaid');
            }}
            className="rp-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-teal-400/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center text-teal-300">
                    <Icon name="credit-card" className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Fee Siap Klaim</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                  {stats.claimableCount} Job
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                {formatCurrency(stats.pendingPayout)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                <span className="text-emerald-400 font-bold">↑ Verified</span>
                <span className="text-slate-400">Siap Pencairan</span>
              </div>
            </div>
            {/* Rising Smooth Area Curve */}
            <div className="mt-3 pt-1">
              <svg viewBox="0 0 220 48" className="w-full h-11 overflow-visible">
                <defs>
                  <linearGradient id="crewMrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,42 C45,38 75,16 115,24 C155,30 180,6 220,4 L220,48 L0,48 Z"
                  fill="url(#crewMrrGrad)"
                />
                <path
                  d="M0,42 C45,38 75,16 115,24 C155,30 180,6 220,4"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* KPI 4: Perlu Respon (Point-to-Point Node Line Chart) */}
          <div
            onClick={() => {
              setActiveTab('jobs');
              setJobFilter('pending');
            }}
            className="rp-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-teal-400/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center text-teal-300">
                    <Icon name="clipboard-check" className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Perlu Respon</span>
                </div>
                {stats.pendingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {stats.pendingCount} <span className="text-xs font-semibold text-slate-400">Tugas Baru</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                <span className="text-teal-300 font-bold">↑ Konfirmasi</span>
                <span className="text-slate-400">Terima / Tolak Job</span>
              </div>
            </div>
            {/* Node Line Chart */}
            <div className="mt-3 pt-1">
              <svg viewBox="0 0 220 48" className="w-full h-11 overflow-visible">
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  points="8,14 48,26 88,36 128,34 168,30 212,20"
                />
                {[
                  [8, 14],
                  [48, 26],
                  [88, 36],
                  [128, 34],
                  [168, 30],
                  [212, 20]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Tab Navigation with RevenuePulse AI Glowing Teal Pills */}
        <div 
          className="flex items-center gap-2 p-1.5 bg-[#051a1d]/90 border border-teal-400/20 rounded-2xl mb-6 overflow-x-auto touch-pan-x overscroll-x-contain select-none scrollbar-none shadow-lg"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none'
          }}
        >
          <button
            onClick={() => {
              triggerHaptic(15);
              setActiveTab('jobs');
            }}
            className={`flex-1 min-w-[125px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${
              activeTab === 'jobs'
                ? 'bg-gradient-to-r from-teal-500/30 via-emerald-500/20 to-teal-500/10 text-white border border-teal-400/40 shadow-[0_4px_20px_-2px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-teal-500/10 border border-transparent'
            }`}
          >
            <Icon name="camera" className={`w-4 h-4 ${activeTab === 'jobs' ? 'text-teal-300' : ''}`} />
            <span>Tugas & Presensi</span>
            {stats.pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              setActiveTab('schedule');
            }}
            className={`flex-1 min-w-[125px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-teal-500/30 via-emerald-500/20 to-teal-500/10 text-white border border-teal-400/40 shadow-[0_4px_20px_-2px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-teal-500/10 border border-transparent'
            }`}
          >
            <Icon name="calendar" className={`w-4 h-4 ${activeTab === 'schedule' ? 'text-teal-300' : ''}`} />
            <span>Kalender Project</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              setActiveTab('payroll');
            }}
            className={`flex-1 min-w-[125px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${
              activeTab === 'payroll'
                ? 'bg-gradient-to-r from-teal-500/30 via-emerald-500/20 to-teal-500/10 text-white border border-teal-400/40 shadow-[0_4px_20px_-2px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-teal-500/10 border border-transparent'
            }`}
          >
            <Icon name="wallet" className={`w-4 h-4 ${activeTab === 'payroll' ? 'text-teal-300' : ''}`} />
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
            {/* Filter Pills with Silky Smooth Native Touch Scrolling */}
            <div 
              className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none overscroll-x-contain touch-pan-x select-none"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
              }}
            >
              {[
                { id: 'all', label: 'Semua Tugas' },
                { id: 'today', label: `Hari Ini (${stats.todayCount})` },
                { id: 'pending', label: `Perlu Respon (${stats.pendingCount})` },
                { id: 'upcoming', label: 'Mendatang' },
                { id: 'unpaid', label: `Klaim Fee (${stats.claimableCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    triggerHaptic(12);
                    setJobFilter(f.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border active:scale-95 ${
                    jobFilter === f.id
                      ? 'bg-teal-500/25 text-teal-200 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                      : 'bg-[#051a1d]/80 text-slate-400 border-teal-400/15 hover:border-teal-400/35 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Native Skeleton Loading vs Empty State vs Job Cards */}
            {loadingJobs && jobs.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="rp-card rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-28 bg-teal-400/10 rounded-full" />
                      <div className="h-5 w-16 bg-teal-400/10 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-6 w-3/4 bg-teal-400/10 rounded-lg" />
                      <div className="h-4 w-1/2 bg-teal-400/5 rounded" />
                    </div>
                    <div className="pt-3 border-t border-teal-400/10 flex gap-2">
                      <div className="h-9 flex-1 bg-teal-400/5 rounded-xl" />
                      <div className="h-9 w-24 bg-teal-400/10 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-16 rp-card rounded-3xl">
                <Icon name="calendar" className="w-12 h-12 text-teal-500/40 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-200">Tidak ada jadwal pada kategori ini</p>
                <p className="text-xs text-slate-400 mt-1">Tugas baru yang di-tag oleh admin studio akan otomatis muncul di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map(job => {
                  const eventDateOnly = (job.event_date || '').split('T')[0];
                  const isToday = eventDateOnly === todayStr;

                  return (
                    <div
                      key={job.id}
                      className={`rp-card rounded-3xl p-5 transition-all flex flex-col justify-between ${
                        isToday
                          ? 'ring-1 ring-teal-400/50 shadow-[0_12px_35px_rgba(20,184,166,0.18)]'
                          : 'hover:border-teal-400/35'
                      }`}
                    >
                      <div>
                        {/* Status Badge & Category Header (Responsive No-Wrap Pills) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-200 border border-teal-400/20 whitespace-nowrap">
                              {job.category} • {job.role}
                            </span>
                            {job.session && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                job.session.toLowerCase().includes('akad') && !job.session.toLowerCase().includes('resepsi')
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : job.session.toLowerCase().includes('resepsi') && !job.session.toLowerCase().includes('akad')
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              }`}>
                                {job.session.toLowerCase().includes('akad') && !job.session.toLowerCase().includes('resepsi') ? '🌅 ' :
                                 job.session.toLowerCase().includes('resepsi') && !job.session.toLowerCase().includes('akad') ? '🌇 ' : '🌟 '}
                                {job.session}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0">
                            {job.status === 'PENDING_APPROVAL' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse whitespace-nowrap">
                                <span>⏳</span>
                                <span>Menunggu Respon</span>
                              </span>
                            )}
                            {job.status === 'ACCEPTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                <span>✓</span>
                                <span>Diterima</span>
                              </span>
                            )}
                            {job.status === 'READY_ON_SITE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 whitespace-nowrap">
                                <span>📍</span>
                                <span>Ready di Lokasi</span>
                              </span>
                            )}
                            {job.status === 'FILES_SUBMITTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                                <span>📁</span>
                                <span>File Disetor</span>
                              </span>
                            )}
                            {job.status === 'FILES_VERIFIED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                <span>💰</span>
                                <span>Siap Klaim Gaji</span>
                              </span>
                            )}
                            {job.status === 'PAYOUT_REQUESTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                <span>⏳</span>
                                <span>Menunggu Transfer</span>
                              </span>
                            )}
                            {job.status === 'PAID' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                <span>✅</span>
                                <span>Fee Lunas</span>
                              </span>
                            )}
                            {job.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 whitespace-nowrap">
                                <span>✕</span>
                                <span>Ditolak</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Client & Package Title + Share Button */}
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-white leading-snug truncate">{job.client_name}</h3>
                            <p className="text-xs text-teal-300 font-semibold truncate">{job.package_name || 'Paket Dokumentasi'}</p>
                            <span className="text-[10px] text-slate-400 font-mono">ID Pesanan: #{job.appointment_id}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleShareJob(job)}
                            className="p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-400/20 transition flex items-center gap-1.5 text-xs shrink-0 active:scale-95"
                            title="Bagikan Ringkasan Tugas (Web Share Native / WhatsApp)"
                          >
                            <Icon name="share" className="w-3.5 h-3.5 text-teal-300" />
                            <span className="text-[11px] font-medium hidden sm:inline">Bagikan</span>
                          </button>
                        </div>

                        {/* Key Info Details */}
                        <div className="space-y-2 py-3 border-y border-teal-400/15 text-xs text-slate-300">
                          <div className="flex items-center gap-2.5">
                            <Icon name="calendar" className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>
                              <strong className="text-white">{formatDateID(job.event_date)}</strong>
                              {isToday && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-teal-500/25 text-teal-200 border border-teal-400/30 font-bold text-[10px]">HARI H</span>}
                            </span>
                          </div>

                          {(job.jam_akad || job.jam_resepsi) && (
                            <div className="flex items-center gap-2.5">
                              <Icon name="clock" className="w-4 h-4 text-teal-400 shrink-0" />
                              <span className="flex items-center gap-2 flex-wrap">
                                {job.jam_akad && <span>Akad: <strong className="text-amber-300">{job.jam_akad} WIB</strong></span>}
                                {job.jam_akad && job.jam_resepsi && <span className="text-slate-600">•</span>}
                                {job.jam_resepsi && <span>Resepsi: <strong className="text-cyan-300">{job.jam_resepsi} WIB</strong></span>}
                              </span>
                            </div>
                          )}

                          {job.client_address && (
                            <div className="flex items-start gap-2.5">
                              <Icon name="map-pin" className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{job.client_address}</span>
                            </div>
                          )}

                          {/* Partner Tim / Duet Acara */}
                          {job.partners && job.partners.length > 0 && (
                            <div className="pt-2 border-t border-teal-400/10 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Partner:</span>
                              {job.partners.map((ptn, pIdx) => (
                                <div key={pIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-400/20 text-teal-200 text-[11px]">
                                  <span className="font-semibold">{ptn.name}</span>
                                  <span className="text-[10px] text-teal-400/80 font-mono">({ptn.role || 'Crew'})</span>
                                  {ptn.phone && (
                                    <a
                                      href={`https://wa.me/${ptn.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${ptn.name}, koordinasi acara ${job.client_name} ya`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-1 text-emerald-400 hover:text-emerald-300 font-bold"
                                      title="Chat WhatsApp Partner"
                                    >
                                      [WA]
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Request Khusus Klien / Catatan Lapangan dari Admin */}
                          {job.custom_sop_items && job.custom_sop_items.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 mt-1">
                              <span className="font-bold text-amber-300 flex items-center gap-1 mb-1">
                                <span>⭐</span> Request Khusus Klien / Catatan Lapangan:
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 pl-1">
                                {job.custom_sop_items.map(req => (
                                  <li key={req.id} className="font-medium text-white">{req.text}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Checklist Barang Bawaan */}
                          {job.carry_items && job.carry_items.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-[#041517]/80 border border-teal-400/25 text-[11px] text-teal-200 mt-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-teal-300 flex items-center gap-1">
                                  <span>🎒</span> Checklist Barang Bawaan:
                                </span>
                                <span className="font-mono text-[10px] text-teal-400 font-bold">
                                  {job.carry_items.filter(i => i.checked).length}/{job.carry_items.length} Siap
                                </span>
                              </div>
                              <div className="space-y-1">
                                {job.carry_items.map(item => (
                                  <label key={item.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-teal-500/10 transition select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!item.checked}
                                      onChange={() => handleToggleCarryItem(job, item.id, !item.checked)}
                                      className="w-3.5 h-3.5 rounded text-teal-500 bg-black/40 border-teal-400/30 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={item.checked ? 'text-slate-500 line-through' : 'text-slate-200 font-medium'}>
                                      {item.text}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rincian Fee Gaji */}
                          <div className="pt-2 border-t border-teal-400/10 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Gaji Pokok:</span>
                              <span className="font-bold text-emerald-400 font-mono text-xs">{formatCurrency(job.fee_amount)}</span>
                            </div>
                            {!!job.accommodation && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span>+ Akomodasi:</span>
                                <span className="font-mono text-emerald-400">+{formatCurrency(job.accommodation)}</span>
                              </div>
                            )}
                            {!!job.bonus && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span>+ Bonus:</span>
                                <span className="font-mono text-emerald-400">+{formatCurrency(job.bonus)}</span>
                              </div>
                            )}
                            {!!job.deduction && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span>- Potongan ({job.deduction_reason || 'Pinalti'}):</span>
                                <span className="font-mono text-red-400">-{formatCurrency(job.deduction)}</span>
                              </div>
                            )}
                            {(job.status === 'PAID' || job.accommodation > 0 || job.bonus > 0 || job.deduction > 0) && (
                              <div className="flex items-center justify-between font-bold pt-1 border-t border-teal-400/10">
                                <span className="text-white">Total Diterima:</span>
                                <span className="font-bold text-emerald-300 font-mono text-sm">{formatCurrency(job.total_paid ?? job.fee_amount)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Field Action Buttons Bar: Maps, WA Klien, SOP Checklist */}
                        {(() => {
                          const sopItems = getEffectiveJobSopItems(defaultSopTemplates, job);
                          const sopDone = sopItems.filter(it => it.checked).length;
                          const sopTotal = sopItems.length;
                          const isAllDone = sopDone === sopTotal && sopTotal > 0;

                          return (
                            <div className="grid grid-cols-3 gap-2 pt-3">
                              {(job.sharelock_url || job.google_maps_url || job.client_address) ? (
                                <a
                                  href={job.sharelock_url || job.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="py-2 px-1.5 rounded-xl bg-[#041517]/90 hover:bg-teal-500/15 text-slate-200 border border-teal-400/20 text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                >
                                  <Icon name="map-pin" className="w-3.5 h-3.5 text-teal-400" />
                                  <span>Maps</span>
                                </a>
                              ) : (
                                <div className="py-2 px-1.5 rounded-xl bg-white/5 text-slate-600 border border-white/5 text-center text-xs font-semibold flex items-center justify-center">
                                  <span>Maps -</span>
                                </div>
                              )}

                              {job.client_phone ? (
                                <a
                                  href={`https://wa.me/${job.client_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak ${job.client_name}, saya ${crew?.name || 'Kru'} dari Lapanbelas ID yang bertugas di acara Anda.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="py-2 px-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/25 text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                >
                                  <Icon name="message-circle" className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>WA Klien</span>
                                </a>
                              ) : (
                                <div className="py-2 px-1.5 rounded-xl bg-white/5 text-slate-600 border border-white/5 text-center text-xs font-semibold flex items-center justify-center">
                                  <span>WA -</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenSopModal(job)}
                                className={`py-2 px-1.5 rounded-xl border text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                  isAllDone
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                                    : sopDone > 0
                                      ? 'bg-teal-500/20 text-teal-200 border-teal-400/35'
                                      : 'bg-[#041517]/90 text-slate-300 hover:text-white border-teal-400/20'
                                }`}
                              >
                                <Icon name="clipboard-check" className="w-3.5 h-3.5 text-teal-300" />
                                <span>SOP ({sopDone}/{sopTotal})</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Action Buttons based on Status */}
                      <div className="pt-3 space-y-2">
                        {/* 1. If Pending Approval */}
                        {job.status === 'PENDING_APPROVAL' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleRespondJob(job, 'accept')}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#020c0e] font-extrabold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-1.5"
                            >
                              <Icon name="check-circle" className="w-4 h-4" />
                              <span>Terima Tugas</span>
                            </button>
                            <button
                              onClick={() => handleRespondJob(job, 'reject')}
                              className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <Icon name="x-circle" className="w-4 h-4" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        )}

                        {/* 2. If Accepted -> Tombol Check-in Hadir di Lokasi (PAP) */}
                        {job.status === 'ACCEPTED' && (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleOpenCheckin(job)}
                              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-[#020c0e] font-black text-xs transition-all shadow-[0_6px_20px_rgba(45,212,191,0.3)] flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                              <Icon name="camera" className="w-4 h-4" />
                              <span>CHECK-IN HADIR DI LOKASI (FOTO PAP)</span>
                              {isToday ? (
                                <span className="ml-1 px-1.5 py-0.5 rounded bg-black/40 text-teal-200 font-mono text-[9px] uppercase font-bold">HARI H</span>
                              ) : (
                                <span className="ml-1 px-1.5 py-0.5 rounded bg-black/30 text-white font-mono text-[9px]">Standby</span>
                              )}
                            </button>
                          </div>
                        )}

                        {/* 4. If Ready on Site / Finished -> Submit Files */}
                        {job.status === 'READY_ON_SITE' && (
                          <button
                            onClick={() => handleOpenSubmitFile(job)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-[#020c0e] font-extrabold text-xs transition-all shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2"
                          >
                            <Icon name="upload-cloud" className="w-4 h-4" />
                            <span>Setor File Hasil Dokumentasi</span>
                          </button>
                        )}

                        {/* 5. If Files Submitted -> Waiting admin verification */}
                        {job.status === 'FILES_SUBMITTED' && (
                          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/25 text-cyan-200 text-xs text-center">
                            ⏳ File berhasil diserahkan. Menunggu verifikasi tim studio.
                          </div>
                        )}

                        {/* 6. If Files Verified -> Claim Salary Button */}
                        {job.status === 'FILES_VERIFIED' && (
                          <button
                            onClick={() => handleOpenPayout(job)}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-[#020c0e] font-black text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
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
                          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs text-center font-bold">
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
            <div className="rp-card rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </h2>
                  <span className="text-xs text-slate-400">Pilih tanggal untuk melihat jadwal bertugas</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-2 rounded-xl bg-[#041517] hover:bg-teal-500/15 text-slate-300 border border-teal-400/20 text-xs"
                  >
                    ← Bln Lalu
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="py-2 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-400/35 text-xs font-bold"
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-2 rounded-xl bg-[#041517] hover:bg-teal-500/15 text-slate-300 border border-teal-400/20 text-xs"
                  >
                    Bln Depan →
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
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
                      className={`min-h-[58px] sm:min-h-[76px] h-auto p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                        isSelected
                          ? 'bg-teal-500/25 border-teal-400 text-white shadow-[0_0_20px_rgba(45,212,191,0.25)]'
                          : item.hasJobs
                          ? 'bg-[#07262a]/90 border-teal-400/40 text-slate-100'
                          : 'bg-[#041517]/70 border-teal-400/10 text-slate-400 hover:border-teal-400/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${item.isToday ? 'px-1.5 py-0.5 rounded-full bg-teal-400 text-[#020c0e]' : ''}`}>
                          {item.day}
                        </span>
                        {item.hasJobs && (
                          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                        )}
                      </div>

                      {item.hasJobs && (
                        <div className="w-full space-y-0.5 mt-1 overflow-hidden">
                          {item.jobs.slice(0, 1).map((j, jIdx) => (
                            <div key={j.id || jIdx} className="truncate text-[9px] sm:text-[10px] font-semibold text-teal-200 bg-teal-500/20 border border-teal-400/30 px-1 py-0.5 rounded">
                              {j.client_name}
                            </div>
                          ))}
                          {item.jobs.length > 1 && (
                            <div className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate">
                              +{item.jobs.length - 1} job lagi
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agenda on Selected Date */}
            <div className="rp-card rounded-3xl p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Icon name="calendar" className="w-4 h-4 text-teal-400" />
                <span>Jadwal Tanggal: {formatDateID(selectedCalendarDate)}</span>
              </h3>

              {(() => {
                const dayJobs = jobs.filter(j => (j.event_date || '').split('T')[0] === selectedCalendarDate);
                if (dayJobs.length === 0) {
                  return (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      Tidak ada penugasan dokumentasi pada tanggal ini.
                    </p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {dayJobs.map(job => (
                      <div key={job.id} className="p-4 rounded-2xl bg-[#041517]/90 border border-teal-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{job.client_name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 border border-teal-400/30 font-semibold">
                              {job.package_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Standby: {job.jam_akad || job.jam_resepsi || 'Sesuai Jadwal'} WIB • Lokasi: {job.client_address || 'Studio / Lokasi Klien'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 mr-2">{formatCurrency(job.fee_amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleShareJob(job)}
                            className="py-1.5 px-2.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-xs text-teal-200 border border-teal-400/20 flex items-center gap-1 active:scale-95 transition"
                            title="Bagikan Info Tugas (Web Share Native)"
                          >
                            <Icon name="share" className="w-3 h-3 text-teal-300" />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                          {(job.sharelock_url || job.google_maps_url || job.client_address) && (
                            <a
                              href={job.sharelock_url || job.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client_address)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="py-1.5 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-xs text-teal-200 border border-teal-400/20"
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
            <div className="p-6 rounded-3xl rp-card relative overflow-hidden">
              <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-teal-400/15 blur-3xl" />
              <div className="relative z-10">
                <span className="text-xs font-bold text-teal-300 uppercase tracking-wider block mb-1">
                  Total Penghasilan Fee Selesai
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {formatCurrency(stats.totalEarned)}
                </h2>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Siap Dicairkan: <strong className="text-white">{formatCurrency(stats.pendingPayout)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span>Total Job Selesai: <strong className="text-white">{jobs.filter(j => j.status === 'PAID').length}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rekening Bank Kru (Tersimpan 1x di Profil) */}
            <div className="rp-card rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0">
                  <Icon name="credit-card" className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-400">Rekening Pencairan Gaji Kru</h4>
                  {profileBank ? (
                    <p className="text-sm font-bold text-white font-mono mt-0.5 truncate">
                      {profileBank.bank} • {profileBank.account_number} <span className="font-sans font-normal text-xs text-slate-300">(a.n {profileBank.account_name})</span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-300 font-medium mt-0.5">Belum diatur. Harap masukkan rekening untuk terima transfer gaji.</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBankName(profileBank?.bank || 'BCA');
                  setAccountNumber(profileBank?.account_number || '');
                  setAccountName(profileBank?.account_name || crew?.name || '');
                  setBankModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 text-xs font-bold border border-teal-400/30 transition shrink-0"
              >
                {profileBank ? '✏️ Ubah Rekening' : '➕ Atur Rekening'}
              </button>
            </div>

            {/* Payout History List */}
            <div className="rp-card rounded-3xl p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white mb-4">Riwayat Rekap Fee & Status Pencairan</h3>

              <div className="space-y-3">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-[#041517]/90 border border-teal-400/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{job.client_name}</span>
                        <span className="text-xs text-slate-500 font-mono">#{job.appointment_id}</span>
                        {job.session && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            job.session.toLowerCase().includes('akad') && !job.session.toLowerCase().includes('resepsi')
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : job.session.toLowerCase().includes('resepsi') && !job.session.toLowerCase().includes('akad')
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {job.session.toLowerCase().includes('akad') && !job.session.toLowerCase().includes('resepsi') ? '🌅 ' :
                             job.session.toLowerCase().includes('resepsi') && !job.session.toLowerCase().includes('akad') ? '🌇 ' : '🌟 '}
                            {job.session}
                          </span>
                        )}
                        {job.role && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 text-teal-300 border border-teal-400/20">
                            {job.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="text-slate-200 font-medium">{job.package_name}</span> • {formatDateID(job.event_date)}
                      </p>
                      {job.payout_account_number && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">
                          Rekening: {job.payout_bank} - {job.payout_account_number} ({job.payout_account_name})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-sm font-bold text-white font-mono whitespace-nowrap">{formatCurrency(job.fee_amount)}</span>

                      {job.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap">
                          ✓ Lunas
                        </span>
                      )}
                      {job.status === 'PAYOUT_REQUESTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                          Diproses Owner
                        </span>
                      )}
                      {job.status === 'FILES_VERIFIED' && (
                        <button
                          onClick={() => handleOpenPayout(job)}
                          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-[#020c0e] font-bold text-xs shadow-md shadow-teal-500/20 whitespace-nowrap"
                        >
                          Klaim Fee
                        </button>
                      )}
                      {!['PAID', 'PAYOUT_REQUESTED', 'FILES_VERIFIED'].includes(job.status) && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-500/10 text-slate-300 border border-teal-400/15 whitespace-nowrap">
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
        </>
        )}
      </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL OWNER: UPLOAD BUKTI TRANSFER M-BANKING & CAIRKAN GAJI KRU           */}
      {/* ========================================================================= */}
      {ownerPayModalItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="rp-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PEMBAYARAN OLEH OWNER
                </span>
                <h3 className="text-base font-bold text-white mt-1">Cairkan Gaji: {ownerPayModalItem.crew_name}</h3>
                <p className="text-xs text-gray-400">#{ownerPayModalItem.appointment_id} • {ownerPayModalItem.session}</p>
              </div>
              <button
                type="button"
                onClick={() => setOwnerPayModalItem(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2 mb-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Rekening Tujuan:</span>
                <span className="font-mono font-bold text-white">{ownerPayModalItem.bank_name} - {ownerPayModalItem.account_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Atas Nama:</span>
                <span className="font-medium text-gray-300">{ownerPayModalItem.account_name}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="font-bold text-white">Total Ditransfer:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">{formatCurrency(ownerPayModalItem.total_paid)}</span>
              </div>
            </div>

            <form onSubmit={handleOwnerApprovePayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Upload Screenshot Bukti Transfer (m-Banking)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Foto langsung dilampirkan via email arsip & WA kru (tidak disimpan di database studio).
                </p>

                {transferProofBase64 ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-black/50 aspect-video flex items-center justify-center">
                    <img src={transferProofBase64} alt="Bukti Transfer" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setTransferProofBase64(null)}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-rose-300 border border-rose-500/40 text-[10px] font-bold"
                    >
                      Ganti Foto
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/2 hover:bg-white/5 cursor-pointer transition">
                    <span className="text-2xl">📸</span>
                    <span className="text-xs font-semibold text-gray-300">Pilih Foto Struk Transfer</span>
                    <span className="text-[10px] text-gray-500">Bisa dari Galeri HP atau Kamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setTransferProofBase64(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOwnerPayModalItem(null)}
                  disabled={submittingOwnerPay}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingOwnerPay}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {submittingOwnerPay ? 'Mengirim & Arsip...' : 'Konfirmasi Lunas 💸'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CHECK-IN PRESENSI LOKASI & PAP (HARI H) */}
      {/* ========================================================================= */}
      {checkinModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rp-card rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-400/15">
              <div>
                <h3 className="text-base font-bold text-white">Presensi Kehadiran Lapangan (PAP)</h3>
                <p className="text-xs text-teal-300 font-medium">{selectedJob.client_name} - #{selectedJob.appointment_id}</p>
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
              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-400/30 text-teal-200 text-xs">
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
                  <label className="border-2 border-dashed border-teal-400/25 hover:border-teal-400/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#041517]/70 transition-all hover:bg-[#041517]">
                    <Icon name="camera" className="w-10 h-10 text-teal-400 mb-2" />
                    <span className="text-xs font-bold text-white">Buka Kamera & Foto Lokasi</span>
                    <span className="text-[11px] text-slate-400 mt-1">Gunakan kamera ponsel Anda</span>
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

              {/* Info PAP Simple */}
              <div className="p-3.5 rounded-2xl bg-[#041517] border border-teal-400/15 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <Icon name="camera" className="w-4 h-4 text-emerald-400" />
                  <span>Presensi PAP Hari-H</span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Cukup ambil foto selfie Anda atau suasana panggung/venue acara. Tidak perlu menyalakan sensor GPS.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={checkinLoading || !checkinPhoto}
                  onClick={handleSubmitCheckin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-[#020c0e] font-black text-sm transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="rp-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-400/15">
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
                        ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                        : 'bg-[#041517] border-teal-400/15 text-slate-400'
                    }`}
                  >
                    ☁️ Upload Google Drive
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionType('kantor')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                      submissionType === 'kantor'
                        ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                        : 'bg-[#041517] border-teal-400/15 text-slate-400'
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
                    className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-400"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Pastikan link Drive sudah di-share (Viewer/Editor).</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-400/30 text-teal-200 text-xs">
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
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitFileLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-[#020c0e] font-extrabold text-xs transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="rp-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-400/15">
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
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
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
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
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
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
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
      {/* MODAL PENGATURAN REKENING KRU */}
      {/* ========================================================================= */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rp-card rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-400/15">
              <div>
                <h3 className="text-base font-bold text-white">Atur Rekening Bank Kru</h3>
                <p className="text-xs text-gray-400">Disimpan sekali di profil Anda untuk semua transfer honor.</p>
              </div>
              <button onClick={() => setBankModalOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveProfileBank} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nama Bank / E-Wallet</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
                >
                  {['BCA', 'Mandiri', 'BRI', 'BNI', 'BSI (Bank Syariah)', 'Bank Aceh', 'CIMB Niaga', 'Permata', 'SeaBank', 'Bank Jago', 'DANA', 'GoPay', 'OVO'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nomor Rekening / HP E-Wallet <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Atas Nama Rekening <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Nama Anda Sesuai Buku Tabungan"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>

              <button
                type="submit"
                disabled={savingBank}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingBank ? 'Menyimpan...' : 'SIMPAN REKENING DI PROFIL'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL GANTI PIN MANDIRI KRU */}
      {/* ========================================================================= */}
      {changePinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rp-card rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-400/15">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <h3 className="text-base font-bold text-white">Ganti PIN Keamanan</h3>
              </div>
              <button onClick={() => setChangePinModalOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleChangePinInsidePortal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  PIN Lama (4 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  required
                  autoFocus
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-white outline-none focus:border-teal-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  PIN Baru (4 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  required
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-white outline-none focus:border-teal-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Konfirmasi PIN Baru (4 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmNewPinInput}
                  onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  required
                  className="w-full bg-[#041517] border border-teal-400/20 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-white outline-none focus:border-teal-400 font-bold"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setChangePinModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changePinLoading || oldPinInput.length !== 4 || newPinInput.length !== 4 || confirmNewPinInput.length !== 4}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-[#020c0e] font-bold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {changePinLoading ? 'Menyimpan...' : 'Perbarui PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TOLAK TUGAS */}
      {/* ========================================================================= */}
      {rejectModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rp-card rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
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
                className="w-full bg-[#041517] border border-teal-400/20 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500"
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

      {/* ========================================================================= */}
      {/* MODAL 5: SOP & CHECKLIST TUGAS KRU */}
      {/* ========================================================================= */}
      {sopModalOpen && sopJob && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="rp-card rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-teal-400/15 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <h3 className="text-base font-bold text-white">SOP & Shot List Lapangan</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="text-xs text-teal-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                    {sopJob.client_name}
                  </span>
                  <span className="text-[10px] text-gray-400">• {sopJob.role} ({sopJob.session})</span>
                  {detectJobMoments(sopJob).map(mId => {
                    const mObj = SOP_MOMENTS.find(m => m.id === mId);
                    return (
                      <span key={mId} className="text-[10px] px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                        <span>{mObj?.icon || '💍'}</span>
                        <span>{mObj?.label || mId}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSopModalOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>

            {/* Progress Summary */}
            {(() => {
              const doneCount = sopChecklist.filter(it => it.checked).length;
              const totalCount = sopChecklist.length;
              const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
              const is100 = doneCount === totalCount && totalCount > 0;

              return (
                <div className="my-3 p-3.5 rounded-2xl bg-[#041517]/90 border border-teal-400/20 shrink-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-medium">Progress SOP Lapangan:</span>
                    <span className={`font-bold font-mono ${is100 ? 'text-emerald-400' : 'text-teal-300'}`}>
                      {doneCount} dari {totalCount} Selesai ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full transition-all duration-500 rounded-full ${is100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-400 to-emerald-400'}`}
                    />
                  </div>
                  {is100 && (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-2 text-center flex items-center justify-center gap-1">
                      <span>🎉</span> Keren! Seluruh SOP tugas telah terpenuhi secara sempurna!
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Phase Filters */}
            <div className="flex gap-1.5 pb-2.5 overflow-x-auto shrink-0 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'Semua', count: sopChecklist.length },
                { id: 'pre', label: '🔋 Pre-Event', count: sopChecklist.filter(i => i.phase === 'pre').length },
                { id: 'on', label: '📸 Hari-H', count: sopChecklist.filter(i => i.phase === 'on').length },
                { id: 'post', label: '💾 Pasca Acara', count: sopChecklist.filter(i => i.phase === 'post').length }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSopPhaseFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                    sopPhaseFilter === f.id
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-[#020c0e] font-bold shadow-md shadow-teal-500/20'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Checklist Items Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {sopChecklist
                .filter(it => sopPhaseFilter === 'all' || it.phase === sopPhaseFilter)
                .map((item) => {
                  const phaseBadge = item.phase === 'pre'
                    ? { label: 'Pre-Event', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' }
                    : item.phase === 'on'
                      ? { label: 'Hari-H', color: 'bg-teal-500/15 text-teal-300 border-teal-500/20' }
                      : { label: 'Pasca Acara', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' };

                  const mObj = SOP_MOMENTS.find(m => m.id === item.moment);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSopItem(item.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none active:scale-[0.99] ${
                        item.is_custom
                          ? (item.checked ? 'bg-amber-500/15 border-amber-500/40' : 'bg-amber-500/5 border-amber-500/30 hover:border-amber-400/50')
                          : item.checked
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-[#041517]/80 border-teal-400/10 hover:border-teal-400/25'
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        item.checked
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                          : 'border-white/20 bg-white/5'
                      }`}>
                        {item.checked && (
                          <svg className="w-3.5 h-3.5 stroke-slate-950 stroke-[3]" fill="none" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {item.is_custom ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400/25 text-amber-300 border border-amber-400/40 animate-pulse">
                              🎯 REQUEST KHUSUS KLIEN
                            </span>
                          ) : (
                            item.moment && item.moment !== 'all' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-white/10 text-gray-300">
                                {mObj?.icon || '📌'} {mObj?.label || item.moment}
                              </span>
                            )
                          )}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${phaseBadge.color}`}>
                            {phaseBadge.label}
                          </span>
                          {item.checked && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              ✓ Selesai
                            </span>
                          )}
                          {item.image_url && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage({ url: item.image_url, title: item.text, phase: phaseBadge.label });
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <span>🔍</span> Lihat Contoh
                            </span>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed ${item.is_custom ? 'font-semibold text-amber-100' : (item.checked ? 'text-gray-300 line-through opacity-80' : 'text-white')}`}>
                          {item.text}
                        </p>
                      </div>

                      {/* Preview Thumbnail Button (Fast, Lazy-loaded & Lightweight) */}
                      {item.image_url && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({ url: item.image_url, title: item.text, phase: phaseBadge.label });
                          }}
                          className="relative group shrink-0 ml-1 cursor-pointer"
                          title="Klik untuk perbesar contoh"
                        >
                          <img
                            src={item.image_url}
                            alt="Contoh SOP"
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/15 shadow-md group-hover:scale-105 group-hover:border-teal-400/60 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs">🔍</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-teal-400/15 shrink-0 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                {savingSop ? '⏳ Menyimpan...' : '⚡ Tersimpan otomatis'}
              </span>
              <button
                type="button"
                onClick={() => setSopModalOpen(false)}
                className="py-2 px-5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-200 font-semibold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: LEGAL CONTRACT & DIGITAL SIGNATURE (E-CONTRACT) */}
      {/* ========================================================================= */}
      {contractModalOpen && (() => {
        const cDetails = getContractDetailsForCrew(
          contractInfo?.crew_type || crew?.type || 'freelance',
          contractInfo?.contract_type,
          contractInfo?.duration_years
        );
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="rp-card rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-teal-400/15 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30 shrink-0">
                    <Icon name="file-text" className="w-5 h-5 text-teal-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {cDetails.isStaff ? 'Perjanjian Kerja (PKWT)' : 'Perjanjian Kemitraan (Freelance)'}
                    </h3>
                    <p className="text-xs text-teal-300 font-medium mt-0.5">
                      {cDetails.typeLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContractModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>
              </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 text-xs text-gray-300">
              {contractInfo?.signed ? (
                /* VIEW SIGNED CONTRACT */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider inline-block mb-1">
                        ✓ {cDetails.isStaff ? 'Kontrak PKWT Aktif' : 'Kemitraan Mitra Aktif'}
                      </span>
                      <p className="text-sm font-bold text-white">Status Legal Terverifikasi Digital</p>
                    </div>
                    <Icon name="shield-check" className="w-8 h-8 text-emerald-400" />
                  </div>

                  {/* Letterhead Preview */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="text-center pb-3 border-b border-white/10">
                      <p className="font-bold text-white text-xs tracking-wider">{cDetails.isStaff ? 'PT STUDIO LAPAN BELAS' : 'PT STUDIO LAPAN BELAS & LAPANBELAS ID'}</p>
                      <p className="text-[10px] text-gray-400">{cDetails.docTitle}</p>
                    </div>

                    <div className="space-y-1.5 text-gray-400">
                      <p><span className="text-gray-500">Pihak Pertama :</span> Manajemen PT Studio Lapan Belas</p>
                      <p><span className="text-gray-500">Pihak Kedua   :</span> <strong className="text-white">{contractInfo.name || crew?.name}</strong></p>
                      <p><span className="text-gray-500">No. WhatsApp  :</span> {contractInfo.phone || crew?.phone}</p>
                      <p><span className="text-gray-500">NIK KTP       :</span> <strong className="text-white">{contractInfo.nik || '-'}</strong></p>
                      <p><span className="text-gray-500">Jenis Dokumen :</span> <span className="text-amber-300 font-bold">{cDetails.typeLabel}</span></p>
                      <p><span className="text-gray-500">Masa Berlaku  :</span> {cDetails.isStaff ? `${contractInfo.start_date || '-'} s/d ${contractInfo.end_date || '-'}` : 'Kemitraan Aktif Per Penugasan Resmi'}</p>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <p className="text-gray-500 text-[10px] mb-1.5">Tanda Tangan Digital Pihak Kedua:</p>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                        {contractInfo.signature_url ? (
                          <img
                            src={contractInfo.signature_url}
                            alt="Tanda Tangan Digital"
                            className="max-h-24 w-auto object-contain filter invert"
                          />
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Tanda tangan tersimpan di sistem</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2">
                        <span>Ditandatangani: {formatDateID(contractInfo.signed_at || new Date().toISOString())}</span>
                        <span>IP: {contractInfo.ip_address || 'Terekam'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Button View Clauses */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowContractClauses(!showContractClauses)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 font-semibold text-xs border border-white/10 flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon name="file-text" className="w-3.5 h-3.5 text-amber-400" />
                        <span>{showContractClauses ? `Sembunyikan Klausul & Sanksi ${cDetails.isStaff ? 'PKWT' : 'Kemitraan'}` : `Lihat 10 Klausul & Sanksi Resmi ${cDetails.isStaff ? 'PKWT' : 'Kemitraan'}`}</span>
                      </span>
                      <span>{showContractClauses ? '▲' : '▼'}</span>
                    </button>
                    {showContractClauses && (
                      <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-3 max-h-72 overflow-y-auto text-[11px] text-gray-300 leading-relaxed scrollbar-thin">
                        {cDetails.articles.map((art, idx) => (
                          <div key={idx} className="pb-2.5 border-b border-white/5 last:border-0 last:pb-0">
                            <p className="font-bold text-amber-300 mb-0.5">{art.number}: {art.title}</p>
                            <p className="text-gray-300">{art.content}</p>
                            {Array.isArray(art.subpoints) && art.subpoints.length > 0 && (
                              <div className="mt-1.5 space-y-1.5 pl-2.5 border-l-2 border-amber-500/40 text-gray-300">
                                {art.subpoints.map((sub, sIdx) => (
                                  <p key={sIdx}><strong className="text-white">{sub.label}</strong> {sub.text}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition flex items-center gap-1.5"
                    >
                      <Icon name="printer" className="w-3.5 h-3.5 text-gray-400" />
                      <span>Cetak / Simpan PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                /* SIGNING FLOW */
                <form onSubmit={handleSignContract} className="space-y-4">
                  {/* Notice Box */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <p className="font-bold text-xs flex items-center gap-1.5 mb-1">
                      <span>⚖️</span> {cDetails.isStaff ? 'Pakta Integritas & Legalitas PKWT Staff' : 'Pakta Integritas & Kemitraan Mitra Freelance'}
                    </p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {cDetails.isStaff 
                        ? `Sesuai kebijakan resmi manajemen PT Studio Lapan Belas, setiap personil Staff Tetap wajib memiliki ikatan kontrak kerja resmi (${cDetails.validityLabel}) sebelum menerima penugasan.` 
                        : 'Sebagai Mitra Freelance Lapanbelas ID, penandatanganan kemitraan digital ini menjamin komitmen penugasan resmi, perlindungan aset/file momen klien, dan pencairan fee.'}
                    </p>
                  </div>

                  {/* Input NIK */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Nomor Induk Kependudukan (NIK KTP) *
                    </label>
                    <input
                      type="text"
                      required
                      value={contractNik}
                      onChange={(e) => setContractNik(e.target.value.replace(/\D/g, ''))}
                      placeholder="16 digit NIK sesuai KTP asli"
                      maxLength={16}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-mono outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  {/* Legal Clauses Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-300">
                        {cDetails.docTitle}
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono">10 Pasal Lengkap</span>
                    </div>
                    <div className="h-56 overflow-y-auto p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-3 text-[11px] text-gray-300 leading-relaxed scrollbar-thin">
                      {cDetails.articles.map((art, idx) => (
                        <div key={idx} className="pb-2.5 border-b border-white/5 last:border-0 last:pb-0">
                          <p className="font-bold text-amber-300 mb-0.5">
                            {art.number}: {art.title}
                          </p>
                          <p className="text-gray-300 leading-relaxed">{art.content}</p>
                          {Array.isArray(art.subpoints) && art.subpoints.length > 0 && (
                            <div className="mt-1.5 space-y-1.5 pl-2.5 border-l-2 border-amber-500/40 text-gray-300">
                              {art.subpoints.map((sub, sIdx) => (
                                <p key={sIdx}>
                                  <strong className="text-white">{sub.label}</strong> {sub.text}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signature Canvas Pad */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <span>Tanda Tangan Digital Anda *</span>
                        <span className="text-[10px] text-gray-500 font-normal">(Goreskan jari/mouse di bawah)</span>
                      </label>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                      >
                        <Icon name="trash-2" className="w-3 h-3" />
                        <span>Bersihkan</span>
                      </button>
                    </div>

                    <div className="relative border border-white/20 rounded-2xl overflow-hidden bg-slate-950 touch-none shadow-inner">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={160}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-36 cursor-crosshair block"
                      />
                      {!signatureHasStroke && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-gray-600 italic">
                          ✍️ Goreskan tanda tangan Anda di sini
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agree Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={contractAgreed}
                      onChange={(e) => setContractAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-amber-500 shrink-0"
                    />
                    <span className="text-[11px] text-gray-300 leading-snug">
                      Saya menyatakan bahwa data yang saya masukkan adalah benar dan saya menyetujui seluruh klausul perjanjian di atas secara sadar, sah, dan mengikat.
                    </span>
                  </label>

                  {/* Action Button */}
                  <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setContractModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium text-xs transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSigning || !contractAgreed || !signatureHasStroke}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Icon name="shield-check" className="w-4 h-4" />
                      <span>{isSigning ? 'Menyimpan Tanda Tangan...' : (cDetails.isStaff ? 'Tanda Tangani PKWT' : 'Tanda Tangani Kemitraan')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      );
    })()}

      {/* ========================================================================= */}
      {/* LIGHTBOX PREVIEW CONTOH GAMBAR SOP (SUPER RINGAN & CEPAT) */}
      {/* ========================================================================= */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
          >
            {/* Header */}
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

            {/* Image Container with Native Lazy/Optimized View */}
            <div className="relative bg-black flex items-center justify-center min-h-[220px] max-h-[65vh] overflow-hidden p-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                loading="eager"
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain mx-auto shadow-lg"
              />
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950/90 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
              <span className="text-[11px] flex items-center gap-1">
                <span>💡</span> Referensi standar visual Lapanbelas ID
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition"
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

// Bootstrap React 19 root
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<CrewPortal />);
}
