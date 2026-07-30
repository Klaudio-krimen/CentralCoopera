import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          900: "#14532d",
        },
        // Paleta scoped al módulo CRM — replica los tokens exactos de auto-crm
        // (la app de referencia). Solo se usa dentro de app/(admin)/admin/crm/*
        // y sus componentes; el resto de la app sigue con la paleta emerald/zinc.
        crm: {
          bg: "#fafafa",
          card: "#ffffff",
          border: "#e2e8f0",
          foreground: "#0f172a",
          muted: "#64748b",
          "muted-foreground": "#64748b",
          primary: "#2563eb",
          "primary-foreground": "#ffffff",
          secondary: "#f1f5f9",
          "secondary-foreground": "#1e293b",
          accent: "#f1f5f9",
          "accent-foreground": "#1e293b",
          popover: "#ffffff",
          "popover-foreground": "#0f172a",
          destructive: "#dc2626",
          "destructive-foreground": "#ffffff",
          ring: "#2563eb",
          success: "#16a34a",
          warning: "#ea580c",
          chart: {
            1: "#2563eb",
            2: "#16a34a",
            3: "#ea580c",
            4: "#8b5cf6",
            5: "#64748b",
          },
          temp: {
            frio: "#64748b",
            "frio-bg": "#f1f5f9",
            tibio: "#ea580c",
            "tibio-bg": "#fff7ed",
            caliente: "#dc2626",
            "caliente-bg": "#fef2f2",
          },
        },
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "fade-up": "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both",
        breathe: "breathe 2.4s ease-in-out infinite",
      },
      boxShadow: {
        // Tinted, diffuse shadows — depth without clutter (zinc-950 tint)
        card: "0 1px 2px -1px rgba(24,24,27,0.05), 0 0 0 1px rgba(24,24,27,0.05)",
        "card-hover":
          "0 16px 40px -16px rgba(24,24,27,0.16), 0 0 0 1px rgba(24,24,27,0.06)",
        "emerald-glow": "0 0 0 3px rgba(34,197,94,0.14)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
