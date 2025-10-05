import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  
  theme: {
    extend: {
      
      fontFamily: {
        sans: [
          "Inter",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "Inter",
          "var(--font-inter)",
          "ui-monospace",
          "monospace",
        ],
        serif: [
          "Inter",
          "var(--font-inter)",
          "ui-serif",
          "serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
