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
          950: '#050608', // OLED Abyss
          900: '#0a0c10', // Dark canvas
          850: '#11141c', // Card & elevated panel
          800: '#181c26', // Hover / elevated border
          750: '#1e2330', // Active state
          700: '#262d3e', // Divider hair lines
          600: '#39435b', // Subdued borders
        },
        solar: {
          400: '#fbbf24', // Radiant flare
          500: '#f59e0b', // Primary signature core
          600: '#d97706', // Burnished gold
          700: '#b45309', // Deep amber
        },
        telemetry: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          crimson: '#e11d48',
          violet: '#8b5cf6',
        },
        // Backward compatibility mappings
        victorian: {
          gold: '#f59e0b',
          'gold-light': '#fbbf24',
          'gold-dark': '#d97706',
          crimson: '#e11d48',
          'crimson-bright': '#f43f5e',
          parchment: '#f7f1e5',
          'parchment-dark': '#1e1a14',
          'parchment-border': '#3d3425',
        },
        genz: {
          amethyst: '#8b5cf6',
          violet: '#a855f7',
          cyan: '#06b6d4',
          rose: '#e11d48',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
