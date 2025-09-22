import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Tailwind v4 configuration - most styling is now handled in CSS with @theme
  theme: {
    extend: {
      // Keep only essential theme extensions that can't be handled in CSS
      fontFamily: {
        sans: [
          "Merriweather",
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
