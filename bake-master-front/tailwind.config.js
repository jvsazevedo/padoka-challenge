/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wheat: {
          50: '#fefdf9',
          100: '#fdf9f0',
          200: '#faf2de',
          300: '#f5e6c3',
          400: '#edd49f',
          500: '#e3bf7a',
          600: '#d4a959',
          700: '#b88d47',
          800: '#93703c',
          900: '#765a33',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdfbf7',
          200: '#fbf6ed',
          300: '#f8f0e0',
          400: '#f3e7cc',
          500: '#ecdbb3',
          600: '#ddc692',
          700: '#c8ab75',
          800: '#a08960',
          900: '#81704f',
        },
        bakery: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
};
