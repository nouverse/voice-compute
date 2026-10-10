/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#6366f1",
          "secondary": "#a855f7",
          "accent": "#06b6d4",
          "neutral": "#1e293b",
          "base-100": "#0b0f19",
          "base-200": "#111827",
          "base-300": "#1f2937",
          "info": "#38bdf8",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
        light: {
          "primary": "#4f46e5",
          "secondary": "#9333ea",
          "accent": "#0891b2",
          "neutral": "#334155",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e2e8f0",
          "info": "#0284c7",
          "success": "#059669",
          "warning": "#d97706",
          "error": "#dc2626",
        },
      },
    ],
  },
};
