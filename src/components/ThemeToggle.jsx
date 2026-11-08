import React, { useState, useEffect } from 'react';
import { getActiveTheme, toggleTheme, THEMES } from '../utils/theme';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getActiveTheme);

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.theme) {
        setTheme(e.detail.theme);
      }
    };
    window.addEventListener('18studio-theme-change', handleThemeChange);
    return () => window.removeEventListener('18studio-theme-change', handleThemeChange);
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    // Berikan feedback getar halus di perangkat mobile jika didukung
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(12); } catch (_) {}
    }
    const nextTheme = toggleTheme();
    setTheme(nextTheme);
  };

  const isLight = theme === THEMES.LIGHT;

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isLight ? 'Beralih ke Mode Gelap (Dark Mode)' : 'Beralih ke Mode Terang (Light Mode)'}
      aria-label={isLight ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
      className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all duration-300 active:scale-90 hover:scale-105 shrink-0 select-none cursor-pointer border shadow-sm ${
        isLight
          ? 'bg-white/90 border-teal-600/25 text-teal-700 hover:bg-white hover:border-teal-600/40 hover:shadow-[0_0_12px_rgba(13,148,136,0.25)]'
          : 'bg-[#181c24]/90 border-white/10 text-amber-300 hover:text-amber-200 hover:border-white/20 hover:bg-[#202530] hover:shadow-[0_0_12px_rgba(251,191,36,0.2)]'
      } ${className}`}
    >
      {isLight ? (
        // Ikon Bulan (Moon) saat mode Terang -> klik untuk beralih ke Mode Gelap
        <svg
          className="w-4 h-4 transition-transform duration-300 transform -rotate-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      ) : (
        // Ikon Matahari (Sun) saat mode Gelap -> klik untuk beralih ke Mode Terang
        <svg
          className="w-4 h-4 transition-transform duration-300 transform rotate-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.25" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}

