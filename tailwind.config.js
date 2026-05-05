/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'Inter Tight', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#11CAE6',
          600: '#0A8FA6',
          700: '#087d91',
        },
        secondary: '#011C26',
        background: {
          DEFAULT: '#FFFFFF',
          soft: '#F2FAFD',
          light: '#E2F2F8',
        },
        accent: '#11CAE6',
        success: '#22C55E',
      },
    },
  },
  plugins: [],
};
