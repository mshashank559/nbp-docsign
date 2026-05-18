/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Brand greens */
        brand: {
          950: '#050e08',
          900: '#0D1F14',
          800: '#1A3C28',
          700: '#2D5A3D',
          600: '#3B7A52',
          200: '#A8D5B8',
          100: '#D4EFE0',
          50:  '#F0FAF4',
        },
        /* Semantic design tokens */
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card:       'var(--card)',
        surface:    'var(--surface)',
        border:     'var(--border)',
        secondary:  'var(--secondary)',
        muted:      'var(--muted)',
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
