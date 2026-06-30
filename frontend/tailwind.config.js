import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        glass: 'rgb(var(--glass) / <alpha-value>)',
        'glass-elevated': 'rgb(var(--glass-elevated) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'glass-border': 'rgb(var(--glass-border) / <alpha-value>)',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          500: '#13c296',
          600: '#0fa87f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(74, 118, 168, 0.22)',
        glass: '0 8px 32px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-light': '0 8px 32px -12px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.75' },
        },
        'scroll-hint': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.55' },
          '50%': { transform: 'translateY(6px)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.28s ease-out',
        'accordion-up': 'accordion-up 0.22s ease-out',
        'fade-in': 'fade-in 0.45s ease-out forwards',
        'slide-down': 'slide-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'scroll-hint': 'scroll-hint 2s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
