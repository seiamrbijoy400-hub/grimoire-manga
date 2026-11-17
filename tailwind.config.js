/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#060608',
          900: '#09090d',
          850: '#0f0f15',
          800: '#14141d',
          700: '#1e1e2c',
        },
        victorian: {
          gold: '#d4af37',
          'gold-light': '#f3e5ab',
          'gold-dark': '#997d23',
          crimson: '#8b1e1e',
          'crimson-bright': '#c52828',
          parchment: '#f7f1e5',
          'parchment-dark': '#241f17',
          'parchment-border': '#3d3425',
        },
        genz: {
          amethyst: '#8b5cf6',
          violet: '#a855f7',
          cyan: '#06b6d4',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
