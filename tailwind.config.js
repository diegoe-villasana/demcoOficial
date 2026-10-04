/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        demco: {
          green: '#008751',
          dark: '#1f2421',
          blue: '#3a7ca5',
        },
      },
    },
  },
  plugins: [],
};
