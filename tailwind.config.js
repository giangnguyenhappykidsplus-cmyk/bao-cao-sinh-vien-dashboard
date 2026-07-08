/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14', 900: '#0b1120', 850: '#0f1626', 800: '#131c30',
          750: '#1a2440', 700: '#223054', 600: '#2c3c66',
        },
        accent: { DEFAULT: '#3b82f6', soft: '#60a5fa' },
        good: '#10b981', warn: '#f59e0b', danger: '#ef4444', risk: '#f97316',
        ai: {
          900: '#0c1a3a', 800: '#132452', 700: '#1b3169',
          600: '#2a4a8c', 400: '#5b86d6',
        },
      },
      fontFamily: { sans: ['Inter', 'Be Vietnam Pro', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.45), 0 8px 24px -12px rgba(0,0,0,.6)',
        glow: '0 0 0 1px rgba(59,130,246,.25), 0 12px 40px -12px rgba(59,130,246,.45)',
        ai: '0 0 0 1px rgba(91,134,214,.3), 0 16px 50px -16px rgba(91,134,214,.5)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        fadeIn: 'fadeIn .2s ease-out', slideUp: 'slideUp .25s ease-out',
        scaleIn: 'scaleIn .18s ease-out', pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite', blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
