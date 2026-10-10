/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#6366f1",
          secondary: "#a855f7",
          accent: "#06b6d4",
          neutral: "#1e1e2f",
          "base-100": "#0b0f19",
          "base-200": "#111827",
          "base-300": "#1f2937",
        },
      },
    ],
  },
};
