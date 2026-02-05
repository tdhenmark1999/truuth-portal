/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        truuth: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e5fe',
          300: '#7cd1fd',
          400: '#36bbfa',
          500: '#0ca2eb',
          600: '#0082c9',
          700: '#0168a3',
          800: '#065886',
          900: '#0b496f',
          950: '#072f4a',
        },
      },
    },
  },
  plugins: [],
}
