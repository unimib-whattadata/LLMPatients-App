import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f5f2',
          100: '#e8ebdf',
          200: '#d6dcc4',
          300: '#c0c9a5',
          400: '#a9b583',
          500: '#8B9769',
          600: '#7a8559',
          700: '#6a7349',
          800: '#5a6139',
          900: '#4a4f29',
        },
        secondary: {
          50: '#faf8f3',
          100: '#f2ede0',
          200: '#e5d9c0',
          300: '#d4c29a',
          400: '#c3ab74',
          500: '#C69A39',
          600: '#b08832',
          700: '#9a762b',
          800: '#846424',
          900: '#6e521d',
        },
        accent: {
          50: '#f5f4f7',
          100: '#e8e5ed',
          200: '#d4cedb',
          300: '#bdb3c6',
          400: '#a698b1',
          500: '#A7A0CA',
          600: '#968fb6',
          700: '#857ea2',
          800: '#746d8e',
          900: '#635c7a',
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
          hover: '#737373',
        },
      },
      // New Tailwind 4.1 features
      textShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.5)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.5)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.5)',
        'xl': '0 12px 24px rgba(0, 0, 0, 0.5)',
        '2xl': '0 16px 32px rgba(0, 0, 0, 0.5)',
        'none': 'none',
      },
      // Enhanced drop shadow support for colored shadows
      dropShadow: {
        'primary': '0 4px 8px rgba(139, 151, 105, 0.3)',
        'secondary': '0 4px 8px rgba(198, 154, 57, 0.3)',
        'accent': '0 4px 8px rgba(167, 160, 202, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;