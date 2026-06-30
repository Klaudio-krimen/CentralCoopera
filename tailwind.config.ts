import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
        breathe: 'breathe 2.4s ease-in-out infinite',
      },
      boxShadow: {
        // Tinted, diffuse shadows — depth without clutter (zinc-950 tint)
        card: '0 1px 2px -1px rgba(24,24,27,0.05), 0 0 0 1px rgba(24,24,27,0.05)',
        'card-hover': '0 16px 40px -16px rgba(24,24,27,0.16), 0 0 0 1px rgba(24,24,27,0.06)',
        'emerald-glow': '0 0 0 3px rgba(34,197,94,0.14)',
      },
    },
  },
  plugins: [],
}

export default config
