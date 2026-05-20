/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* NetBounce brand blues / navy */
        brand: {
          950: '#02030f',
          900: '#080e2e',
          800: '#0f1850',
          700: '#1a2a78',
          600: '#1E3AFA',
          200: '#a5b4fc',
          100: '#dde2ff',
          50:  '#eef2ff',
        },
        /* Semantic design tokens */
        background: 'var(--page-bg)',
        foreground: 'var(--text-1)',
        card:       'var(--surface)',
        surface:    'var(--surface)',
        border:     'var(--border)',
        secondary:  'var(--text-2)',
        muted:      'var(--text-3)',
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'Helvetica', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
    },
  },
  plugins: [],
}
