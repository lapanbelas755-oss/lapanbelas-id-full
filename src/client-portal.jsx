import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';

function ClientPortal() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [photoLimit, setPhotoLimit] = useState(null);
  const [originalDriveLink, setOriginalDriveLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [folderHistory, setFolderHistory] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Reset image loading state when lightbox index changes
  useEffect(() => {
    if (lightboxIndex !== null) {
      setImageLoading(true);
    }
  }, [lightboxIndex]);

  // Preload neighboring images in lightbox for instant transitions
  useEffect(() => {
    if (lightboxIndex === null || imagesOnly.length === 0) return;

    // Preload next 2 images and previous 1 image
    const indicesToPreload = [
      (lightboxIndex + 1) % imagesOnly.length,
      (lightboxIndex + 2) % imagesOnly.length,
      (lightboxIndex - 1 + imagesOnly.length) % imagesOnly.length
    ];

    indicesToPreload.forEach(idx => {
      const p = imagesOnly[idx];
      if (p) {
        const url = p.largeThumbnailLink || `https://drive.google.com/thumbnail?id=${p.id}&sz=w1200`;
        const img = new Image();
        img.src = url;
      }
    });
  }, [lightboxIndex, photos]);

  // Extract orderId from URL: /pilih-foto/:orderId
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

  // Determine max photos based on package name, default to a high number if not found
  const getMaxPhotos = () => {
    if (photoLimit !== null && photoLimit !== undefined) {
      return photoLimit;
    }
    const pkg = packageName.toLowerCase();
    if (pkg.includes('80')) return 80;
    if (pkg.includes('100')) return 100;
    if (pkg.includes('50')) return 50;
    if (pkg.includes('150')) return 150;
    return 80; // Default fallback
  };

  const maxPhotos = getMaxPhotos();

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

  const imagesOnly = photos.filter(p => p.mimeType !== 'application/vnd.google-apps.folder');

  const openLightbox = (photo) => {
    const idx = imagesOnly.findIndex(p => p.id === photo.id);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = () => {
    if (lightboxIndex !== null && imagesOnly.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % imagesOnly.length);
    }
  };

  const prevPhoto = () => {
    if (lightboxIndex !== null && imagesOnly.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + imagesOnly.length) % imagesOnly.length);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowRight') {
        setLightboxIndex(prevIdx => (prevIdx + 1) % imagesOnly.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex(prevIdx => (prevIdx - 1 + imagesOnly.length) % imagesOnly.length);
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos]);

  const togglePhotoSelection = (photo) => {
    const isSelected = selectedPhotos.some((p) => p.id === photo.id);
    
    if (isSelected) {
      setSelectedPhotos(selectedPhotos.filter((p) => p.id !== photo.id));
    } else {
      if (selectedPhotos.length >= maxPhotos) {
        alert(`Batas maksimal foto untuk ${packageName} adalah ${maxPhotos} foto.`);
        return;
      }
      setSelectedPhotos([...selectedPhotos, photo]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPhotos.length === 0) {
      alert('Pilih setidaknya 1 foto sebelum klik Selesai.');
      return;
    }
    
    const confirmSubmit = window.confirm(`Anda telah memilih ${selectedPhotos.length} foto. Yakin ingin mengirim pilihan ini? Anda tidak bisa mengubahnya setelah dikirim.`);
    if (!confirmSubmit) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/submit-photo-selection', {
        orderId,
        selectedPhotos: selectedPhotos.map(p => ({ id: p.id, name: p.name }))
      });
      if (response.data.success) {
        setIsSuccess(true);
      } else {
        alert('Gagal mengirim data. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengirim data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">Memuat foto dari Google Drive...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">Oops! Ada Masalah</h2>
          <p className="text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-2xl p-8 max-w-md">
          <svg className="w-20 h-20 text-emerald-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Pilihan Berhasil Dikirim!</h2>
          <p className="text-slate-300 mb-6">Terima kasih. Tim editor kami telah diberi tahu dan akan segera memproses foto-foto pilihan Anda.</p>
          <button onClick={() => window.close()} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition">
            Tutup Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-widest">LAPANBELAS.ID</h1>
            <p className="text-xs text-violet-400 font-semibold tracking-wider">CLIENT PORTAL</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm text-slate-400">Order ID: <span className="text-white font-mono">{orderId}</span></p>
            <p className="text-sm text-slate-400">{packageName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Note / Info Box */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5 mb-8 flex gap-4 items-start">
          <div className="mt-1 text-blue-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-200 mb-1">Informasi Pemilihan Foto</h3>
            <p className="text-sm text-blue-100/70 leading-relaxed">
              Portal ini khusus dirancang untuk mempermudah Anda dalam memilih foto yang akan diedit oleh tim kami. Klik pada foto yang ingin Anda pilih. 
              <br className="mb-2" />
              Jika Anda ingin melihat atau mendownload file mentahan (kualitas asli) dalam resolusi penuh, silakan klik <a href={originalDriveLink} target="_blank" rel="noreferrer" className="text-violet-400 font-semibold underline hover:text-violet-300">Tautan Google Drive Asli ini</a>.
            </p>
          </div>
        </div>

        {/* Progress Bar & Sticky Selection Counter */}
        <div className="sticky top-24 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl mb-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-1/2">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-slate-300">Foto Terpilih</span>
              <span className={`${selectedPhotos.length === maxPhotos ? 'text-emerald-400' : 'text-violet-400'}`}>
                {selectedPhotos.length} / {maxPhotos}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ${selectedPhotos.length === maxPhotos ? 'bg-emerald-500' : 'bg-violet-600'}`}
                style={{ width: `${Math.min((selectedPhotos.length / maxPhotos) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPhotos.length === 0}
            className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all shadow-lg ${
              selectedPhotos.length > 0 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'MENGIRIM...' : 'SELESAI MEMILIH'}
          </button>
        </div>

        {/* Back Button */}
        {folderHistory.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <button 
              onClick={handleBackFolder}
              className="flex items-center px-4 py-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
            <span className="text-slate-500 text-sm">
              / {folderHistory.map(f => f.name).join(' / ')}
            </span>
          </div>
        )}

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">Tidak ada isi ditemukan di folder ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {photos.map((photo) => {
              if (photo.mimeType === 'application/vnd.google-apps.folder') {
                return (
                  <div 
                    key={photo.id}
                    onClick={() => handleFolderClick(photo)}
                    className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-slate-500 bg-slate-800 flex flex-col items-center justify-center p-4 border border-slate-700 hover:bg-slate-750"
                  >
                    <svg className="w-16 h-16 text-yellow-500 mb-3 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-300 text-center line-clamp-2 px-2">{photo.name}</span>
                  </div>
                );
              }

              const isSelected = selectedPhotos.some((p) => p.id === photo.id);
              
              return (
                <div 
                  key={photo.id}
                  onClick={() => openLightbox(photo)}
                  className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    isSelected ? 'ring-4 ring-violet-500 scale-95 shadow-xl shadow-violet-500/20' : 'hover:ring-2 hover:ring-slate-500'
                  }`}
                >
                  {/* Thumbnail Image */}
                  {photo.thumbnailLink ? (
                    <img 
                      src={photo.thumbnailLink}
                      alt={photo.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Overlay Gradient & Hover Indicator */}
                  <div className={`absolute inset-0 transition-all duration-300 ${
                    isSelected 
                      ? 'bg-violet-900/20' 
                      : 'bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center'
                  }`}>
                    {!isSelected && (
                      <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white shadow-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Selection Checkbox/Indicator */}
                  <div 
                    className="absolute top-3 right-3 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
                      isSelected 
                        ? 'bg-violet-500 border-violet-500 text-white shadow-lg' 
                        : 'border-white/50 bg-black/40 text-transparent opacity-0 group-hover:opacity-100'
                    }`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  {/* File Name */}
                  <div className={`absolute bottom-0 left-0 right-0 p-3 transform transition-transform duration-200 ${
                    isSelected ? 'translate-y-0 opacity-100 bg-gradient-to-t from-slate-900/90 to-transparent' : 'translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                  }`}>
                    <p className="text-xs font-medium text-white truncate drop-shadow-md">
                      {photo.name}
                    </p>
                  </div>

                  {/* Selected Overlay number */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 bg-violet-600/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl shadow-2xl">
                        {selectedPhotos.findIndex(p => p.id === photo.id) + 1}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxIndex !== null && imagesOnly[lightboxIndex] && (() => {
          const photo = imagesOnly[lightboxIndex];
          const isSelected = selectedPhotos.some((p) => p.id === photo.id);
          const largeImageUrl = photo.largeThumbnailLink || `https://drive.google.com/thumbnail?id=${photo.id}&sz=w1200`;

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between select-none">
              {/* Top Bar */}
              <div className="h-16 px-6 flex items-center justify-between bg-slate-900/60 border-b border-slate-800/50">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">{photo.name}</span>
                  <span className="text-xs text-slate-400">Foto {lightboxIndex + 1} dari {imagesOnly.length}</span>
                </div>
                <button 
                  onClick={closeLightbox}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Central Area: Image and Navigation */}
              <div className="relative flex-1 flex items-center justify-center px-4 py-2">
                {/* Left Arrow */}
                <button 
                  onClick={prevPhoto}
                  className="absolute left-4 z-10 p-3 rounded-full bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* High-res Image preview */}
                <div className="max-w-full max-h-[70vh] flex items-center justify-center p-2 relative min-w-[250px] min-h-[250px]">
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img 
                    src={largeImageUrl} 
                    alt={photo.name} 
                    className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border border-slate-800 transition-opacity duration-300 ${
                      imageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    onLoad={() => setImageLoading(false)}
                  />
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-violet-600/90 text-white font-bold px-3 py-1.5 rounded-full text-xs shadow-lg backdrop-blur-sm">
                      Terpilih #{selectedPhotos.findIndex(p => p.id === photo.id) + 1}
                    </div>
                  )}
                </div>

                {/* Right Arrow */}
                <button 
                  onClick={nextPhoto}
                  className="absolute right-4 z-10 p-3 rounded-full bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Bottom Bar: Action buttons */}
              <div className="p-6 bg-slate-900/60 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-300">
                  Kuota Terpilih: <span className="text-violet-400">{selectedPhotos.length}</span> / {maxPhotos}
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => togglePhotoSelection(photo)}
                    className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all shadow-lg flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        BATALKAN PILIHAN
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        PILIH FOTO INI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ClientPortal />);
