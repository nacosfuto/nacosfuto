/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', '"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        minecraft: ['"Minecraft"', '"Minecraft Bold"', '"Minecraft Regular"', 'monospace'],
      },
      colors: {
        nacos: {
          green: '#138601',
          dark: '#083002',
          black: '#041801',
          light: '#f2fbf1',
          white: '#ffffff',
          accent: '#4bd043',
        },
        primary: {
          50: '#f2fbf1',
          100: '#dcf6da',
          200: '#bbf0b7',
          300: '#88e482',
          400: '#4bd043',
          500: '#1fb416',
          DEFAULT: '#138601',
          600: '#138601',
          700: '#0f6c01',
          800: '#0d5602',
          dark: '#083002',
          900: '#083002',
          950: '#041801',
        },
        surface: {
          dark: '#083002',
          darker: '#041801',
          card: '#083002',
          border: 'rgba(19, 134, 1, 0.2)',
        }
      }
    },
  },
  plugins: [],
}
