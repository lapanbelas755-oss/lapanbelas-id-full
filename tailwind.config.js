/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg-base': 'var(--theme-bg-base)',
        'theme-bg-canvas': 'var(--theme-bg-canvas)',
        'theme-bg-surface': 'var(--theme-bg-surface)',
        'theme-bg-card': 'var(--theme-bg-card)',
        'theme-bg-card-hover': 'var(--theme-bg-card-hover)',
        'theme-bg-pill': 'var(--theme-bg-pill)',
        'theme-bg-input': 'var(--theme-bg-input)',
        'theme-bg-header': 'var(--theme-bg-header)',
        'theme-border-base': 'var(--theme-border-base)',
        'theme-border-card': 'var(--theme-border-card)',
        'theme-border-card-hover': 'var(--theme-border-card-hover)',
        'theme-text-primary': 'var(--theme-text-primary)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-text-muted': 'var(--theme-text-muted)',
        'theme-text-teal': 'var(--theme-text-teal)',
        'theme-text-mint': 'var(--theme-text-mint)',
        'theme-accent-primary': 'var(--theme-accent-primary)',
        'theme-accent-vibrant': 'var(--theme-accent-vibrant)',
        'theme-accent-glow': 'var(--theme-accent-glow)',
      },
    },
  },
  plugins: [],
}
