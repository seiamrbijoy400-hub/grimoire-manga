/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Ink & Stamp — the 2026 Kurso Scroll system */
        ink: {
          950: '#0A0A0B',
          900: '#101012',
          850: '#141416',
          800: '#17171A',
          750: '#1E1E22',
          700: '#26262A',
          600: '#3A3A40',
        },
        paper: {
          DEFAULT: '#F4EFE4',
          dim: '#ABA599',
        },
        stamp: {
          DEFAULT: '#E8472F',
          deep: '#C2361F',
          light: '#F3694F',
        },
        gold: '#C9A45C',

        /* Legacy aliases kept so older components keep compiling */
        editorial: {
          bg: '#0A0A0B',
          surface: '#101012',
          elevated: '#17171A',
          gold: '#C9A45C',
          'gold-light': '#E8C68A',
          'gold-dark': '#A9843F',
          ivory: '#F4EFE4',
          subtext: '#ABA599',
          border: '#26262A',
          teal: '#4FB3A2',
        },
        void: {
          950: '#0A0A0B',
          900: '#101012',
          850: '#141416',
          800: '#17171A',
          750: '#1E1E22',
          700: '#26262A',
          600: '#3A3A40',
        },
        solar: {
          400: '#F3694F',
          500: '#E8472F',
          600: '#D23A24',
          700: '#A92C19',
        },
        telemetry: {
          cyan: '#4FB3A2',
          emerald: '#4ADE80',
          crimson: '#E8472F',
          violet: '#9D7FE6',
        },
        victorian: {
          gold: '#C9A45C',
          'gold-light': '#E8C68A',
          'gold-dark': '#A9843F',
          crimson: '#E8472F',
          'crimson-bright': '#F3694F',
          parchment: '#F4EFE4',
          'parchment-dark': '#141416',
          'parchment-border': '#26262A',
        },
        genz: {
          amethyst: '#9D7FE6',
          violet: '#B490F5',
          cyan: '#4FB3A2',
          rose: '#E8472F',
        },
      },
      fontFamily: {
        /* Display + existing serif slot share one grotesk family so headings
           modernise without touching every component. */
        serif: ['Space Grotesk', 'Plus Jakarta Sans', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      animation: {
        'fade-in': 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.5s linear infinite',
        'float': 'floatY 7s ease-in-out infinite',
        'float-slow': 'floatY 11s ease-in-out infinite',
        'rise': 'rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow': 'spin 18s linear infinite',
        'pop': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 3.4s ease-in-out infinite',
        'wipe': 'wipe 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.7' },
        },
        wipe: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
