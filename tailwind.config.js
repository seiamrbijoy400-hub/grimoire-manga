/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // KuroScroll 2026 Neo-Editorial Palette
        editorial: {
          bg: '#090A0C',          // Main background
          surface: '#111318',     // Secondary surface
          elevated: '#191A1F',    // Elevated surface / drawers / modals
          gold: '#C69A45',        // Muted antique gold (Primary accent)
          'gold-light': '#D8AA55',
          'gold-dark': '#A77F32',
          ivory: '#F0E9DC',       // Primary text
          subtext: '#AAA69D',     // Secondary text
          border: '#292A2D',      // Subtle hairline borders
          teal: '#42B8A8',        // Restrained status teal
        },
        void: {
          950: '#090A0C', // Main background
          900: '#111318', // Secondary surface
          850: '#15171D', // Slightly elevated
          800: '#191A1F', // Elevated surface / card
          750: '#21232A', // Interactive hover
          700: '#292A2D', // Subtle hairline border
          600: '#383A42', // Slightly emphasized border
        },
        solar: {
          400: '#D8AA55', // Light antique gold
          500: '#C69A45', // Signature antique gold
          600: '#B58938', // Burnished gold
          700: '#96702A', // Deep antique gold
        },
        telemetry: {
          cyan: '#42B8A8', // Restrained status teal
          emerald: '#34D399',
          crimson: '#E05D5D',
          violet: '#9D7FE6',
        },
        // Backward compatibility mappings
        victorian: {
          gold: '#C69A45',
          'gold-light': '#D8AA55',
          'gold-dark': '#A77F32',
          crimson: '#E05D5D',
          'crimson-bright': '#F87171',
          parchment: '#F0E9DC',
          'parchment-dark': '#15171D',
          'parchment-border': '#292A2D',
        },
        genz: {
          amethyst: '#9D7FE6',
          violet: '#B490F5',
          cyan: '#42B8A8',
          rose: '#E05D5D',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'floatY 7s ease-in-out infinite',
        'float-slow': 'floatY 11s ease-in-out infinite',
        'rise': 'rise 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'aurora': 'auroraDrift 22s ease-in-out infinite alternate',
        'spin-slow': 'spin 14s linear infinite',
        'pop': 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 3.2s ease-in-out infinite',
        'wipe': 'wipe 0.6s cubic-bezier(0.76, 0, 0.24, 1) forwards',
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
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(26px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        auroraDrift: {
          '0%': { transform: 'translate3d(-4%, -2%, 0) scale(1)' },
          '50%': { transform: 'translate3d(6%, 4%, 0) scale(1.15)' },
          '100%': { transform: 'translate3d(-2%, 6%, 0) scale(0.95)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
        },
        wipe: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      }
    },
  },
  plugins: [],
}
