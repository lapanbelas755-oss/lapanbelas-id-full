import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import PhotoLightboxModal from './components/PhotoLightboxModal';
import './index.css';

function ClientPortal() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [photoLimit, setPhotoLimit] = useState(null);
  const [originalDriveLink, setOriginalDriveLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSubmittedSession, setLastSubmittedSession] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Multi-Package / Multi-Session States
  const [packagesSessions, setPackagesSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('session-1');
  const [sessionStore, setSessionStore] = useState({});

  // Filter & Layout States
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'selected' | 'unselected' | 'shortlist'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name-asc' | 'name-desc' | 'selected-first'
  const [gridSize, setGridSize] = useState('normal'); // 'compact' | 'normal' | 'large'
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingNotePhoto, setEditingNotePhoto] = useState(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);

  const imagesOnly = useMemo(() => {
    return photos.filter(p => p.mimeType !== 'application/vnd.google-apps.folder');
  }, [photos]);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Extract orderId from URL: /pilih-foto/:orderId
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id && id !== 'pilih-foto') {
      setOrderId(id);
      fetchPhotos(id);
    } else {
      setError('ID Pesanan tidak valid. Pastikan Anda membuka link dari email.');
      setLoading(false);
    }
  }, []);

  // 2. Fetch Photos and Sessions from Drive API
  const fetchPhotos = async (id, targetFolderId = null) => {
    setLoading(true);
    try {
      const url = targetFolderId ? `/api/drive-folder-photos/${id}?subfolderId=${targetFolderId}` : `/api/drive-folder-photos/${id}`;
      const response = await axios.get(url);
      if (response.data.success) {
        setPhotos(response.data.files || []);
        setPackageName(response.data.package_name || 'Paket');
        setOriginalDriveLink(response.data.original_drive_link || '');
        setPhotoLimit(response.data.photo_limit || null);

        const fetchedSessions = response.data.packages_sessions || [];
        setPackagesSessions(fetchedSessions);

        const firstSessionId = fetchedSessions[0]?.id || 'session-1';
        setActiveSessionId(firstSessionId);

        // Build Initial Session Store & Restore Drafts from LocalStorage
        const newStore = {};
        let anyDraftRestored = false;

        fetchedSessions.forEach(s => {
          let sSelected = [];
          let sShortlist = [];
          let sNotes = {};
          let sExtra = 0;
          let sIsSubmitted = Boolean(s.status === 'Terkirim');

          // Check LocalStorage draft for this session
          try {
            const draftKey = `18studio_client_draft_${id}_${s.id}`;
            const legacyDraftKey = `18studio_client_draft_${id}`;
            const savedDraftStr = localStorage.getItem(draftKey) || (s.id === 'session-1' ? localStorage.getItem(legacyDraftKey) : null);
            
            if (savedDraftStr) {
              const savedDraft = JSON.parse(savedDraftStr);
              if (savedDraft && Array.isArray(savedDraft.selectedPhotos)) {
                sSelected = savedDraft.selectedPhotos;
                if (Array.isArray(savedDraft.shortlistedIds)) sShortlist = savedDraft.shortlistedIds;
                if (savedDraft.photoNotes && typeof savedDraft.photoNotes === 'object') sNotes = savedDraft.photoNotes;
                if (typeof savedDraft.extraPhotosCount === 'number') sExtra = savedDraft.extraPhotosCount;
                anyDraftRestored = true;
              }
            } else if (s.submittedPhotos && s.submittedPhotos.length > 0) {
              sSelected = s.submittedPhotos;
              sNotes = s.submittedNotes || {};
              sExtra = s.extraCount || 0;
            }
          } catch (e) {
            console.warn('Gagal membaca draft local storage:', e);
          }

          newStore[s.id] = {
            selectedPhotos: sSelected,
            shortlistedIds: sShortlist,
            photoNotes: sNotes,
            extraPhotosCount: sExtra,
            isSubmitted: sIsSubmitted
          };
        });

        setSessionStore(newStore);
        if (anyDraftRestored) setHasDraftRestored(true);
      } else {
        setError('Gagal mengambil data foto.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Terjadi kesalahan saat mengambil foto dari Google Drive. Pastikan folder Drive disetting "Anyone with the link".');
    } finally {
      setLoading(false);
    }
  };

  // Active Session Object
  const activeSession = useMemo(() => {
    return packagesSessions.find(s => s.id === activeSessionId) || packagesSessions[0] || {
      id: 'session-1',
      title: packageName || 'Paket Utama',
      subtitle: 'Sesi Pemilihan',
      limit: photoLimit || 80,
      status: 'Belum Dipilih'
    };
  }, [packagesSessions, activeSessionId, packageName, photoLimit]);

  const currentSessionData = sessionStore[activeSessionId] || {
    selectedPhotos: [],
    shortlistedIds: [],
    photoNotes: {},
    extraPhotosCount: 0,
    isSubmitted: false
  };

  const selectedPhotos = currentSessionData.selectedPhotos || [];
  const shortlistedIds = currentSessionData.shortlistedIds || [];
  const photoNotes = currentSessionData.photoNotes || {};
  const extraPhotosCount = currentSessionData.extraPhotosCount || 0;

  // 3. Auto-save Active Session Draft to LocalStorage
  useEffect(() => {
    if (!orderId || loading || !activeSessionId) return;
    try {
      const draftKey = `18studio_client_draft_${orderId}_${activeSessionId}`;
      const draftData = {
        selectedPhotos,
        shortlistedIds,
        photoNotes,
        extraPhotosCount,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      if (activeSessionId === 'session-1') {
        localStorage.setItem(`18studio_client_draft_${orderId}`, JSON.stringify(draftData));
      }
    } catch (e) {
      console.warn('Gagal menyimpan draft session:', e);
    }
  }, [orderId, activeSessionId, selectedPhotos, shortlistedIds, photoNotes, extraPhotosCount, loading]);

  // State Updater Helpers scoped to activeSessionId
  const setSelectedPhotos = (updater) => {
    setSessionStore(prev => {
      const cur = prev[activeSessionId] || { selectedPhotos: [], shortlistedIds: [], photoNotes: {}, extraPhotosCount: 0, isSubmitted: false };
      const nextPhotos = typeof updater === 'function' ? updater(cur.selectedPhotos || []) : updater;
      return {
        ...prev,
        [activeSessionId]: {
          ...cur,
          selectedPhotos: nextPhotos
        }
      };
    });
  };

  const setShortlistedIds = (updater) => {
    setSessionStore(prev => {
      const cur = prev[activeSessionId] || { selectedPhotos: [], shortlistedIds: [], photoNotes: {}, extraPhotosCount: 0, isSubmitted: false };
      const nextIds = typeof updater === 'function' ? updater(cur.shortlistedIds || []) : updater;
      return {
        ...prev,
        [activeSessionId]: {
          ...cur,
          shortlistedIds: nextIds
        }
      };
    });
  };

  const setPhotoNotes = (updater) => {
    setSessionStore(prev => {
      const cur = prev[activeSessionId] || { selectedPhotos: [], shortlistedIds: [], photoNotes: {}, extraPhotosCount: 0, isSubmitted: false };
      const nextNotes = typeof updater === 'function' ? updater(cur.photoNotes || {}) : updater;
      return {
        ...prev,
        [activeSessionId]: {
          ...cur,
          photoNotes: nextNotes
        }
      };
    });
  };

  const setExtraPhotosCount = (updater) => {
    setSessionStore(prev => {
      const cur = prev[activeSessionId] || { selectedPhotos: [], shortlistedIds: [], photoNotes: {}, extraPhotosCount: 0, isSubmitted: false };
      const nextCount = typeof updater === 'function' ? updater(cur.extraPhotosCount || 0) : updater;
      return {
        ...prev,
        [activeSessionId]: {
          ...cur,
          extraPhotosCount: nextCount
        }
      };
    });
  };

  // Determine max photos based on active session limit
  const getMaxPhotos = () => {
    if (activeSession && activeSession.limit) {
      return activeSession.limit;
    }
    if (photoLimit !== null && photoLimit !== undefined) {
      return photoLimit;
    }
    const pkg = (activeSession?.title || packageName || '').toLowerCase();
    if (pkg.includes('80')) return 80;
    if (pkg.includes('100')) return 100;
    if (pkg.includes('50')) return 50;
    if (pkg.includes('150')) return 150;
    return 80; // Default fallback
  };

  const maxPhotos = getMaxPhotos() + extraPhotosCount;

  const handleFolderClick = (folder) => {
    const newHistory = [...folderHistory, folder];
    setFolderHistory(newHistory);
    fetchPhotos(orderId, folder.id);
  };

  const handleBackFolder = () => {
    const newHistory = [...folderHistory];
    newHistory.pop(); // remove current
    setFolderHistory(newHistory);
    const targetFolderId = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : null;
    fetchPhotos(orderId, targetFolderId);
  };

  // Filter & Search & Sort Pipeline
  const displayedPhotos = useMemo(() => {
    let list = [...photos];

    // Filter folders vs images based on activeTab
    if (activeTab === 'selected') {
      const selectedIds = new Set(selectedPhotos.map(p => p.id));
      list = list.filter(p => selectedIds.has(p.id));
    } else if (activeTab === 'unselected') {
      const selectedIds = new Set(selectedPhotos.map(p => p.id));
      list = list.filter(p => p.mimeType !== 'application/vnd.google-apps.folder' && !selectedIds.has(p.id));
    } else if (activeTab === 'shortlist') {
      const shortSet = new Set(shortlistedIds);
      list = list.filter(p => shortSet.has(p.id));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.name && p.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortBy === 'selected-first') {
      const selectedIds = new Set(selectedPhotos.map(p => p.id));
      list.sort((a, b) => {
        const aSel = selectedIds.has(a.id) ? 1 : 0;
        const bSel = selectedIds.has(b.id) ? 1 : 0;
        return bSel - aSel;
      });
    }

    return list;
  }, [photos, activeTab, searchQuery, sortBy, selectedPhotos, shortlistedIds]);

  const displayedImagesOnly = useMemo(() => {
    return displayedPhotos.filter(p => p.mimeType !== 'application/vnd.google-apps.folder');
  }, [displayedPhotos]);

  const openLightbox = (photo) => {
    const idx = displayedImagesOnly.findIndex(p => p.id === photo.id);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  // Toggle Photo Selection
  const togglePhotoSelection = (photo) => {
    if (!photo) return;
    const isSelected = selectedPhotos.some((p) => p.id === photo.id);
    
    if (isSelected) {
      setSelectedPhotos(prev => prev.filter((p) => p.id !== photo.id));
      showToast(`Foto ${photo.name} dilepas dari pilihan ${activeSession.title}.`, 'info');
    } else {
      if (selectedPhotos.length >= maxPhotos) {
        showToast(`Batas maksimal foto untuk ${activeSession.title} adalah ${maxPhotos} foto. Klik "+ TAMBAH KUOTA" jika ingin menambah kuota berbayar.`, 'error');
        return;
      }
      setSelectedPhotos(prev => [...prev, photo]);
      showToast(`Foto ${photo.name} terpilih (${selectedPhotos.length + 1}/${maxPhotos})`, 'success');
    }
  };

  // Toggle Shortlist / Love
  const toggleShortlist = (photoId) => {
    setShortlistedIds(prev => {
      const exists = prev.includes(photoId);
      if (exists) {
        showToast('Dihapus dari Favorit / Shortlist', 'info');
        return prev.filter(id => id !== photoId);
      } else {
        showToast('Ditambahkan ke Favorit / Shortlist ❤️', 'success');
        return [...prev, photoId];
      }
    });
  };

  // Edit & Save Note per Photo
  const handleOpenNoteModal = (photo, e) => {
    if (e) e.stopPropagation();
    setEditingNotePhoto(photo);
    setTempNoteText(photoNotes[photo.id] || '');
  };

  const handleSaveNote = () => {
    if (!editingNotePhoto) return;
    setPhotoNotes(prev => ({
      ...prev,
      [editingNotePhoto.id]: tempNoteText.trim()
    }));
    setEditingNotePhoto(null);
    showToast('Catatan khusus untuk editor berhasil disimpan!', 'success');
  };

  // Copy List of Selected Codes to Clipboard
  const handleCopyFileCodes = () => {
    if (selectedPhotos.length === 0) {
      showToast('Belum ada foto yang dipilih untuk disalin.', 'error');
      return;
    }
    const codeList = selectedPhotos.map(p => p.name).join(', ');
    navigator.clipboard.writeText(codeList).then(() => {
      showToast(`✓ ${selectedPhotos.length} kode file [${activeSession.title}] berhasil disalin!`, 'success');
    }).catch(() => {
      showToast('Gagal menyalin. Silakan salin manual.', 'error');
    });
  };

  // Final Submit to Backend for Active Session
  const handleFinalSubmit = async () => {
    if (selectedPhotos.length === 0) {
      showToast('Pilih setidaknya 1 foto sebelum mengirim.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedPhotos = selectedPhotos.map(p => ({
        id: p.id,
        name: p.name,
        note: photoNotes[p.id] || ''
      }));

      const sessionTitle = `${activeSession.title}${activeSession.subtitle ? ` (${activeSession.subtitle})` : ''}`;

      const response = await axios.post('/api/submit-photo-selection', {
        orderId,
        sessionId: activeSession.id,
        sessionTitle: sessionTitle,
        selectedPhotos: formattedPhotos,
        extraPhotosCount,
        photoNotes
      });

      if (response.data.success) {
        // Clear local storage draft for this session
        try {
          localStorage.removeItem(`18studio_client_draft_${orderId}_${activeSession.id}`);
          if (activeSession.id === 'session-1') {
            localStorage.removeItem(`18studio_client_draft_${orderId}`);
          }
        } catch (e) {}

        // Update local session state
        setPackagesSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              status: 'Terkirim',
              submittedPhotos: formattedPhotos,
              submittedNotes: photoNotes,
              extraCount: extraPhotosCount,
              submittedAt: new Date().toISOString()
            };
          }
          return s;
        }));

        setSessionStore(prev => ({
          ...prev,
          [activeSession.id]: {
            ...prev[activeSession.id],
            isSubmitted: true
          }
        }));

        setLastSubmittedSession({
          id: activeSession.id,
          title: activeSession.title,
          subtitle: activeSession.subtitle,
          count: selectedPhotos.length
        });

        setIsReviewModalOpen(false);
        setIsSuccess(true);
      } else {
        showToast(response.data.error || 'Gagal mengirim data. Silakan coba lagi.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat mengirim data ke server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Menghubungkan ke Google Drive & Memuat Foto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 max-w-md shadow-2xl">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">Oops! Terjadi Masalah</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (isSuccess && lastSubmittedSession) {
    const unsubmittedSession = packagesSessions.find(s => s.id !== lastSubmittedSession.id && s.status !== 'Terkirim' && !sessionStore[s.id]?.isSubmitted);

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-8 max-w-lg shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Pilihan Sesi Berhasil Dikirim!</h2>
          <p className="text-emerald-400 font-semibold text-sm mb-3">{lastSubmittedSession.title} ({lastSubmittedSession.subtitle})</p>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Terima kasih! Sebanyak <strong>{lastSubmittedSession.count} foto</strong> untuk sesi ini telah kami terima. Tim editor 18Studio akan segera memproses foto-foto terbaik Anda.
          </p>

          {/* If there's an unsubmitted second package session, prompt user to continue */}
          {unsubmittedSession ? (
            <div className="bg-violet-950/40 border border-violet-500/40 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 text-violet-300 font-bold text-xs uppercase tracking-wider mb-1">
                <span>⚡</span>
                <span>Masih Ada Sesi Lain yang Belum Dipilih:</span>
              </div>
              <h4 className="text-sm font-bold text-white">{unsubmittedSession.title} ({unsubmittedSession.subtitle})</h4>
              <p className="text-xs text-slate-400 mt-0.5">Kuota Foto: <strong>{unsubmittedSession.limit} Foto</strong></p>
              
              <button
                onClick={() => {
                  setActiveSessionId(unsubmittedSession.id);
                  setIsSuccess(false);
                }}
                className="mt-3.5 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>👉 Lanjut Pilih Foto Sesi: {unsubmittedSession.title}</span>
              </button>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 mb-6 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
              <span>🎉 Seluruh sesi paket pada pesanan ini telah selesai dipilih!</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleCopyFileCodes}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2"
            >
              📋 Salin Kode File Sesi Ini
            </button>
            <button 
              onClick={() => setIsSuccess(false)} 
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition text-sm"
            >
              Kembali ke Galeri Foto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 backdrop-blur-md ${
          toastMessage.type === 'error' ? 'bg-rose-900/90 text-rose-200 border border-rose-500/50' :
          toastMessage.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500/50' :
          'bg-slate-900/90 text-slate-200 border border-slate-700/80'
        }`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 font-bold text-lg">
              18
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-widest leading-none">18STUDIO</h1>
              <p className="text-[11px] text-violet-400 font-semibold tracking-wider mt-1">PORTAL SELEKSI FOTO KLIEN</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Auto-Save Aktif
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Order ID: <span className="text-white font-mono font-bold">{orderId}</span></p>
              <p className="text-xs text-violet-300 font-medium truncate max-w-[160px] sm:max-w-xs">{activeSession.title || packageName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Multi-Package / Multi-Session Switcher Bar */}
        {packagesSessions.length > 1 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xl animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">📦 Daftar Sesi Paket:</span>
                <span className="text-[11px] text-slate-400 font-medium">({packagesSessions.length} Paket pada Pesanan Ini)</span>
              </div>
              <span className="text-[11px] text-slate-400">Pilih tab di bawah untuk memilih foto masing-masing paket</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {packagesSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const sData = sessionStore[s.id] || {};
                const count = (sData.selectedPhotos || []).length;
                const sLimit = s.limit + (sData.extraPhotosCount || 0);
                const isSent = s.status === 'Terkirim' || sData.isSubmitted;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-900/90 to-indigo-900/90 border-violet-400 shadow-lg shadow-violet-900/40 ring-2 ring-violet-500/40'
                        : 'bg-slate-950/70 hover:bg-slate-800/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{s.title}</span>
                      </div>
                      <p className="text-[11px] text-violet-300/80 font-medium truncate mt-0.5">{s.subtitle}</p>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className={`text-xs font-bold ${isSent ? 'text-emerald-400' : (count === sLimit ? 'text-emerald-400' : 'text-slate-300')}`}>
                        {count} / {sLimit} Foto
                      </span>
                      {isSent ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          ✓ TERKIRIM
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          count > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {count > 0 ? 'Sedang Dipilih' : 'Belum Dipilih'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Draft Restored Banner */}
        {hasDraftRestored && (
          <div className="bg-violet-950/40 border border-violet-500/40 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 text-violet-200">
              <span className="text-base">💾</span>
              <span><strong>Draft pilihan foto Anda</strong> berhasil dimuat kembali otomatis. Anda dapat melanjutkan pemilihan foto.</span>
            </div>
            <button 
              onClick={() => setHasDraftRestored(false)}
              className="text-violet-400 hover:text-white px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sticky Control & Progress Bar */}
        <div className="sticky top-20 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-4 sm:p-5 rounded-2xl mb-6 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="w-full lg:w-1/2">
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium">Foto Terpilih ({activeSession.title}):</span>
                <span className={`text-base font-bold ${selectedPhotos.length === maxPhotos ? 'text-emerald-400' : 'text-violet-400'}`}>
                  {selectedPhotos.length} / {maxPhotos}
                </span>
                {selectedPhotos.length === maxPhotos && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    KUOTA PAS ✓
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Sisa: <strong className="text-white">{Math.max(0, maxPhotos - selectedPhotos.length)}</strong> foto
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ${selectedPhotos.length === maxPhotos ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-indigo-500'}`}
                style={{ width: `${Math.min((selectedPhotos.length / maxPhotos) * 100, 100)}%` }}
              ></div>
            </div>

            {extraPhotosCount > 0 && (
              <p className="text-[11px] text-violet-400 mt-1.5 font-medium">
                * Kuota Paket: {getMaxPhotos()} + Kuota Tambahan Berbayar: {extraPhotosCount} Foto.
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <button
              onClick={handleCopyFileCodes}
              disabled={selectedPhotos.length === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl font-semibold transition text-xs flex items-center gap-1.5"
              title="Salin daftar nama file foto yang dipilih untuk sesi ini"
            >
              📋 Salin Kode
            </button>

            <button
              onClick={() => setExtraPhotosCount(prev => prev + 1)}
              className="px-3.5 py-2.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl font-bold transition text-xs whitespace-nowrap"
            >
              + Tambah Kuota (+1)
            </button>

            <button 
              onClick={() => setIsReviewModalOpen(true)}
              disabled={selectedPhotos.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold tracking-wide transition shadow-lg text-xs sm:text-sm flex items-center gap-2 ${
                selectedPhotos.length > 0 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>SELESAI & REVIEW</span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-xs">{selectedPhotos.length}</span>
            </button>
          </div>
        </div>

        {/* Search, Filter Tabs & Grid View Switcher */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl mb-6 space-y-4">
          {/* Smart Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'all' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span>🖼️ Semua Foto</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-white/20' : 'bg-black/40 text-slate-400'}`}>
                {imagesOnly.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('selected')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'selected' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span>⭐ Foto Terpilih ({activeSession.title})</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'selected' ? 'bg-white/20' : 'bg-black/40 text-emerald-400'}`}>
                {selectedPhotos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unselected')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'unselected' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span>⬜ Belum Dipilih</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'unselected' ? 'bg-white/20' : 'bg-black/40 text-slate-400'}`}>
                {Math.max(0, imagesOnly.length - selectedPhotos.length)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shortlist')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'shortlist' 
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span>❤️ Favorit / Shortlist</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'shortlist' ? 'bg-white/20' : 'bg-black/40 text-rose-400'}`}>
                {shortlistedIds.length}
              </span>
            </button>
          </div>

          {/* Search, Sort, and Grid Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Cari kode/nama file foto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs p-0.5"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort & Grid Size */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-violet-500"
              >
                <option value="default">Urutan Asli</option>
                <option value="name-asc">Nama File (A-Z)</option>
                <option value="name-desc">Nama File (Z-A)</option>
                <option value="selected-first">Terpilih Duluan</option>
              </select>

              {/* Grid Density Switcher */}
              <div className="flex bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5">
                <button
                  onClick={() => setGridSize('compact')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${gridSize === 'compact' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Grid Rapat (Compact)"
                >
                  ▦
                </button>
                <button
                  onClick={() => setGridSize('normal')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${gridSize === 'normal' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Grid Standar"
                >
                  ▤
                </button>
                <button
                  onClick={() => setGridSize('large')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${gridSize === 'large' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Grid Besar (Detail)"
                >
                  ▥
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Folder Back Button */}
        {folderHistory.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <button 
              onClick={handleBackFolder}
              className="flex items-center px-4 py-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition font-medium text-xs"
            >
              ← Kembali ke Folder Sebelumnya
            </button>
            <span className="text-slate-500 text-xs">
              / {folderHistory.map(f => f.name).join(' / ')}
            </span>
          </div>
        )}

        {/* Photo Gallery Grid */}
        {displayedPhotos.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
            <p className="text-slate-400 text-base mb-2">Tidak ada foto yang sesuai dengan filter ini.</p>
            {activeTab !== 'all' && (
              <button
                onClick={() => setActiveTab('all')}
                className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold"
              >
                Tampilkan Semua Foto ({imagesOnly.length})
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-3 sm:gap-4 ${
            gridSize === 'compact' 
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7' 
              : gridSize === 'large'
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }`}>
            {displayedPhotos.map((photo) => {
              if (photo.mimeType === 'application/vnd.google-apps.folder') {
                return (
                  <div 
                    key={photo.id}
                    onClick={() => handleFolderClick(photo)}
                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition duration-200 hover:ring-2 hover:ring-slate-500 bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 hover:bg-slate-850 shadow-lg"
                  >
                    <svg className="w-14 h-14 text-amber-400 mb-2 transition duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-200 text-center line-clamp-2">{photo.name}</span>
                    <span className="text-[10px] text-amber-400/80 mt-1 font-medium">Buka Sub-Folder</span>
                  </div>
                );
              }

              const isSelected = selectedPhotos.some((p) => p.id === photo.id);
              const selectedOrder = selectedPhotos.findIndex((p) => p.id === photo.id) + 1;
              const isShortlisted = shortlistedIds.includes(photo.id);
              const hasNote = Boolean(photoNotes[photo.id]);

              return (
                <div 
                  key={photo.id}
                  onClick={() => openLightbox(photo)}
                  className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 bg-slate-900 border ${
                    isSelected 
                      ? 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-2xl shadow-emerald-950 scale-[0.98]' 
                      : 'border-slate-800 hover:border-slate-600 hover:shadow-xl'
                  }`}
                >
                  {/* Thumbnail Image with No-Referrer and Backend Proxy Fallback */}
                  {photo.thumbnailLink ? (
                    <img 
                      src={photo.thumbnailLink}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const step = e.target.dataset.fallbackStep || '0';
                        if (step === '0') {
                          e.target.dataset.fallbackStep = '1';
                          e.target.src = `/api/drive-image-proxy/${photo.id}?sz=400`;
                        } else if (step === '1') {
                          e.target.dataset.fallbackStep = '2';
                          e.target.src = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <span className="text-slate-600 text-xs">No Preview</span>
                    </div>
                  )}

                  {/* Top Action Overlay (Shortlist & Checkbox) */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
                    {/* Shortlist Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShortlist(photo.id);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-md ${
                        isShortlisted 
                          ? 'bg-rose-600 text-white scale-105' 
                          : 'bg-black/50 text-slate-300 hover:text-rose-400 hover:bg-black/70 opacity-80 group-hover:opacity-100'
                      }`}
                      title={isShortlisted ? 'Hapus dari Shortlist' : 'Tambah ke Shortlist / Favorit'}
                    >
                      <span className="text-xs">{isShortlisted ? '❤️' : '🤍'}</span>
                    </button>

                    {/* Selection Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhotoSelection(photo);
                      }}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40 scale-105' 
                          : 'border-white/40 bg-black/50 text-transparent opacity-80 group-hover:opacity-100 hover:border-emerald-400'
                      }`}
                      title={isSelected ? 'Batalkan pilihan' : 'Pilih foto ini'}
                    >
                      <span className="text-xs font-bold leading-none">{isSelected ? '✓' : ''}</span>
                    </button>
                  </div>

                  {/* Selected Badge & Order Number */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none flex items-center justify-center">
                      <div className="w-11 h-11 rounded-full bg-emerald-600/90 text-white font-bold text-base flex items-center justify-center shadow-xl border border-emerald-400/40 backdrop-blur-sm animate-in zoom-in-75 duration-150">
                        #{selectedOrder}
                      </div>
                    </div>
                  )}

                  {/* Bottom Bar: File Name & Note Trigger */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 flex items-center justify-between gap-1">
                    <p className="text-[11px] font-medium text-white truncate drop-shadow-md">
                      {photo.name}
                    </p>

                    {/* Note Icon for Editor */}
                    <button
                      onClick={(e) => handleOpenNoteModal(photo, e)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition shrink-0 flex items-center gap-1 ${
                        hasNote 
                          ? 'bg-amber-500/90 text-slate-950 shadow-md font-bold' 
                          : 'bg-black/60 text-slate-300 hover:bg-black/90 hover:text-white border border-white/20 opacity-0 group-hover:opacity-100'
                      }`}
                      title={hasNote ? `Catatan Editor: "${photoNotes[photo.id]}"` : 'Tambah catatan perbaikan untuk editor'}
                    >
                      <span>📝</span>
                      {hasNote && <span>Catatan</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Catatan Khusus untuk Editor */}
        {editingNotePhoto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel border border-white/15 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95 shadow-2xl bg-gray-900/95 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📝</span>
                  <div>
                    <h3 className="font-bold text-sm text-white">Catatan Khusus untuk Editor</h3>
                    <p className="text-xs text-gray-400 truncate max-w-[220px]">{editingNotePhoto.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingNotePhoto(null)}
                  className="text-gray-400 hover:text-white text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Tulis instruksi atau request khusus untuk foto ini (misal: retouch wajah, perbaiki background, atau tone warna):
              </p>

              <textarea
                rows={3}
                placeholder="Cth: Tolong hilangkan bayangan di sebelah kanan dan haluskan wajah..."
                value={tempNoteText}
                onChange={(e) => setTempNoteText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500 mb-4"
              />

              <div className="flex gap-2.5 justify-end">
                {photoNotes[editingNotePhoto.id] && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...photoNotes };
                      delete updated[editingNotePhoto.id];
                      setPhotoNotes(updated);
                      setEditingNotePhoto(null);
                      showToast('Catatan dihapus.', 'info');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition"
                  >
                    Hapus Catatan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingNotePhoto(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Review Final & Ringkasan */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="glass-panel border border-white/15 p-6 rounded-2xl w-full max-w-3xl my-8 relative animate-in zoom-in-95 shadow-2xl bg-gray-900 text-white max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>📋</span> Review Pilihan: <span className="text-violet-400">{activeSession.title}</span> ({selectedPhotos.length} / {maxPhotos})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Periksa kembali daftar foto dan catatan sesi ini sebelum dikirimkan ke tim editor 18Studio.</p>
                </div>
                <button 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="text-gray-400 hover:text-white p-2 text-base rounded-full hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content: Selected Photos List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPhotos.map((photo, idx) => {
                    const note = photoNotes[photo.id];
                    return (
                      <div key={photo.id} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {photo.thumbnailLink && (
                          <img 
                            src={photo.thumbnailLink} 
                            alt={photo.name} 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const step = e.target.dataset.fallbackStep || '0';
                              if (step === '0') {
                                e.target.dataset.fallbackStep = '1';
                                e.target.src = `/api/drive-image-proxy/${photo.id}?sz=400`;
                              } else if (step === '1') {
                                e.target.dataset.fallbackStep = '2';
                                e.target.src = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
                              }
                            }}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0" 
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{photo.name}</p>
                          {note ? (
                            <p className="text-[11px] text-amber-300 truncate mt-0.5">📝 {note}</p>
                          ) : (
                            <button 
                              onClick={() => handleOpenNoteModal(photo)}
                              className="text-[10px] text-slate-500 hover:text-violet-300 underline mt-0.5"
                            >
                              + Catatan editor
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => togglePhotoSelection(photo)}
                          className="text-rose-400 hover:text-rose-300 p-1.5 text-xs rounded-lg hover:bg-rose-500/10 shrink-0"
                          title="Hapus / Tukar foto ini"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Total Terpilih ({activeSession.title}): <strong className="text-emerald-400 text-sm">{selectedPhotos.length}</strong> dari {maxPhotos} kuota foto.
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition"
                  >
                    Kembali Memilih / Tukar
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || selectedPhotos.length === 0}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isSubmitting ? 'Mengirim Pilihan...' : `Kirim Pilihan Sesi ${activeSession.title} ✓`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox / Fullscreen Image View with Fluid Touch & Drag Swipe */}
        <PhotoLightboxModal
          isOpen={lightboxIndex !== null && displayedImagesOnly.length > 0}
          photoData={{
            url: displayedImagesOnly[lightboxIndex]?.largeThumbnailLink || (displayedImagesOnly[lightboxIndex] ? `/api/drive-image-proxy/${displayedImagesOnly[lightboxIndex].id}?sz=1200` : ''),
            index: lightboxIndex || 0,
            total: displayedImagesOnly.length,
            urls: displayedImagesOnly.map(p => p.largeThumbnailLink || `/api/drive-image-proxy/${p.id}?sz=1200`),
            title: displayedImagesOnly[lightboxIndex]?.name || 'Preview Foto'
          }}
          onClose={closeLightbox}
          onIndexChange={(newIdx) => setLightboxIndex(newIdx)}
          renderOverlay={(currIdx) => {
            const photo = displayedImagesOnly[currIdx];
            if (!photo) return null;
            const isSelected = selectedPhotos.some((p) => p.id === photo.id);
            const selectedOrder = selectedPhotos.findIndex((p) => p.id === photo.id) + 1;
            const isShortlisted = shortlistedIds.includes(photo.id);
            const hasNote = Boolean(photoNotes[photo.id]);

            return (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-30">
                {/* Shortlist Heart inside modal */}
                <button
                  onClick={() => toggleShortlist(photo.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border flex items-center gap-1.5 transition ${
                    isShortlisted 
                      ? 'bg-rose-600/90 text-white border-rose-400/40' 
                      : 'bg-black/60 text-slate-300 border-white/20 hover:text-white'
                  }`}
                >
                  <span>{isShortlisted ? '❤️ Favorit' : '🤍 Shortlist'}</span>
                </button>

                {/* Selected Badge */}
                {isSelected && (
                  <div className="bg-emerald-600/95 text-white font-bold px-3.5 py-1.5 rounded-full text-xs shadow-xl backdrop-blur-sm border border-emerald-400/40 flex items-center gap-1.5">
                    <span>✓ Terpilih #{selectedOrder}</span>
                  </div>
                )}
              </div>
            );
          }}
          renderFooter={(currIdx) => {
            const photo = displayedImagesOnly[currIdx];
            if (!photo) return null;
            const isSelected = selectedPhotos.some((p) => p.id === photo.id);
            const hasNote = Boolean(photoNotes[photo.id]);

            return (
              <div className="p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 z-30">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                  <div>
                    <span>Kuota ({activeSession.title}):</span>{' '}
                    <span className={`font-bold ${selectedPhotos.length === maxPhotos ? 'text-emerald-400' : 'text-violet-400'}`}>
                      {selectedPhotos.length} / {maxPhotos}
                    </span>
                  </div>
                  {hasNote && (
                    <span className="text-amber-300 text-[11px] truncate max-w-[200px]">
                      📝 "{photoNotes[photo.id]}"
                    </span>
                  )}
                </div>

                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenNoteModal(photo)}
                    className="px-4 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition"
                  >
                    {hasNote ? '✏️ Edit Catatan' : '📝 Tambah Catatan'}
                  </button>

                  <button
                    onClick={() => togglePhotoSelection(photo)}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold tracking-wide transition shadow-lg flex items-center justify-center gap-2 active:scale-95 text-xs sm:text-sm ${
                      isSelected 
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                    }`}
                  >
                    {isSelected ? '✕ BATALKAN PILIHAN' : '✓ PILIH FOTO INI'}
                  </button>
                </div>
              </div>
            );
          }}
        />
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ClientPortal />);
