import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './index.css';

// Initialize Supabase Client
const supabaseUrl = 'https://ooxjjhzojligmlyuegat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGpqaHpvamxpZ21seXVlZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODQwNDAsImV4cCI6MjA5NDY2MDA0MH0.XG9gL9qJ6fzdRjiZC8W52ezPf074kdZSWs91Z5116pY';
const supabase = createClient(supabaseUrl, supabaseKey);

function StarRating({ label, rating, onChange, disabled }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`text-3xl focus:outline-none transition-all duration-150 ${
              star <= rating
                ? 'text-amber-400 scale-110 hover:scale-125'
                : 'text-slate-600 hover:text-slate-400 scale-100'
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-semibold text-amber-400">
            {rating} / 5
          </span>
        )}
      </div>
    </div>
  );
}

function FeedbackPortal() {
  const [orderId, setOrderId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [packageName, setPackageName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Rating states
  const [ratingAdmin, setRatingAdmin] = useState(0);
  const [ratingPhotographer, setRatingPhotographer] = useState(0);
  const [ratingEditor, setRatingEditor] = useState(0);
  const [ratingOverall, setRatingOverall] = useState(0);
  const [comments, setComments] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract orderId from URL: /feedback/:orderId
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id && id !== 'feedback') {
      setOrderId(id);
      fetchOrderDetails(id);
    } else {
      setError('ID Pesanan tidak valid. Silakan gunakan link dari email Anda.');
      setLoading(false);
    }
  }, []);

  const fetchOrderDetails = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/feedback-appointment/${id}`);
      const resData = await response.json();
      
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal memuat pesanan');
      }
      
      const data = resData.data;
      if (data) {
        setClientName(data.client_name || '');
        setClientEmail(data.client_email || '');
        setPackageName(data.package_name || 'Paket Foto/Video');
      } else {
        setError('Pesanan tidak ditemukan.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat detail pesanan. Silakan periksa kembali link Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ratingAdmin || !ratingPhotographer || !ratingEditor || !ratingOverall) {
      alert('Mohon berikan rating untuk semua kategori.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: orderId,
          client_name: clientName,
          client_email: clientEmail,
          rating_admin: ratingAdmin,
          rating_photographer: ratingPhotographer,
          rating_editor: ratingEditor,
          rating_overall: ratingOverall,
          comments: comments
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal menyimpan ulasan');
      }

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim ulasan Anda: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mb-4"></div>
        <p className="text-slate-400">Memuat data pesanan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <span className="text-5xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-bold text-red-400 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <a href="/" className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-6 rounded-xl transition-all">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-emerald-400">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-3">Terima Kasih!</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ulasan dan saran Anda telah tersimpan dengan aman. Kontribusi Anda sangat berarti bagi kami untuk terus meningkatkan kualitas layanan di <strong>LAPANBELAS.ID</strong>.
          </p>
          <div className="bg-slate-800/40 rounded-xl p-4 text-left border border-slate-700/30 mb-6">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pesanan</div>
            <div className="font-semibold text-slate-300">#{orderId}</div>
            <div className="text-sm text-slate-400 mt-1">{packageName}</div>
          </div>
          <button 
            onClick={() => window.close()} 
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-violet-600/25"
          >
            Tutup Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 flex flex-col justify-center min-h-screen">
      <div className="text-center mb-8">
        <div className="inline-block bg-violet-600/10 text-violet-400 text-xs font-semibold px-4 py-1.5 rounded-full border border-violet-500/20 mb-3">
          CLIENT FEEDBACK
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Evaluasi & Ulasan Layanan</h1>
        <p className="text-slate-400 mt-2">Bantu kami meningkatkan kualitas layanan LAPANBELAS.ID</p>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        {/* Info card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block">Klien</span>
            <span className="font-semibold text-slate-200">{clientName}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block">ID Pesanan & Paket</span>
            <span className="font-semibold text-slate-200">#{orderId} - <span className="text-violet-400 font-medium">{packageName}</span></span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <StarRating 
            label="1. Pelayanan Admin" 
            rating={ratingAdmin} 
            onChange={setRatingAdmin} 
            disabled={isSubmitting}
          />
          <StarRating 
            label="2. Kinerja Fotografer (FG)" 
            rating={ratingPhotographer} 
            onChange={setRatingPhotographer} 
            disabled={isSubmitting}
          />
          <StarRating 
            label="3. Kualitas Hasil Edit (Editor)" 
            rating={ratingEditor} 
            onChange={setRatingEditor} 
            disabled={isSubmitting}
          />
          <StarRating 
            label="4. Pengalaman Keseluruhan" 
            rating={ratingOverall} 
            onChange={setRatingOverall} 
            disabled={isSubmitting}
          />

          <div className="mb-8">
            <label htmlFor="comments" className="block text-sm font-medium text-slate-300 mb-2">
              Saran & Masukan Tambahan
            </label>
            <textarea
              id="comments"
              rows="4"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitting}
              placeholder="Berikan kritik, saran, atau masukan untuk perbaikan kami..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 px-4 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Mengirimkan Ulasan...
              </>
            ) : (
              'Kirim Ulasan Saya'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<FeedbackPortal />);
