/**
 * 18Studio Theme Controller (Dark / Light Mode)
 * Mengelola preferensi tema dengan penyimpanan di localStorage ('18studio_theme')
 * Default: 'dark' (sesuai identitas asli aplikasi 18Studio)
 */

export const THEME_STORAGE_KEY = '18studio_theme';

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

/**
 * Mendapatkan tema saat ini dari localStorage atau default ke 'dark'
 */
export const getActiveTheme = () => {
  if (typeof window === 'undefined') return THEMES.DARK;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === THEMES.LIGHT || saved === THEMES.DARK) {
      return saved;
    }
  } catch (err) {
    console.warn('[Theme] Gagal membaca localStorage:', err);
  }
  return THEMES.DARK;
};

/**
 * Menerapkan class tema ke elemen root <html> dan menyimpannya di localStorage
 * @param {'dark'|'light'} theme
 */
export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const targetTheme = theme === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
  const isLight = targetTheme === THEMES.LIGHT;

  if (isLight) {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
  } catch (err) {
    console.warn('[Theme] Gagal menyimpan ke localStorage:', err);
  }

  // Notifikasi event ke seluruh komponen di aplikasi
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('18studio-theme-change', {
        detail: { theme: targetTheme, isLight }
      })
    );
  }
};

/**
 * Berganti secara instan antara mode Dark dan Light
 * @returns {'dark'|'light'} tema baru yang aktif
 */
export const toggleTheme = () => {
  const current = getActiveTheme();
  const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  applyTheme(next);
  return next;
};

// Inisialisasi awal segera saat script dimuat (mencegah FOUC / kedip layar)
if (typeof window !== 'undefined') {
  applyTheme(getActiveTheme());
}

