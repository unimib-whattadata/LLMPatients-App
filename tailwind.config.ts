import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#8B9769',
          600: '#7a8559',
          700: '#6a7349',
        },
        secondary: {
          500: '#C69A39',
          600: '#b08832',
        },
        accent: {
          500: '#A7A0CA',
          600: '#968fb6',
        },
        success: {
          500: '#22C55E',
          600: '#16A34A',
        },
        warning: {
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          500: '#EF4444',
          600: '#DC2626',
        },
        background: {
          primary: '#1E1E1E',
          secondary: '#131313',
          tertiary: '#2a2a2a',
        },
        text: {
          primary: '#ECECEC',
          secondary: '#d4d4d4',
          tertiary: '#b8b8b8',
          muted: '#9c9c9c',
        },
        border: {
          primary: '#404040',
          secondary: '#525252',
        },
        // Add missing color variants
        admin: {
          500: '#EF4444',
          600: '#DC2626',
        },
        user: {
          500: '#3B82F6',
          600: '#2563EB',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
