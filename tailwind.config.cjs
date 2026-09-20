/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        pixel: ['Pixelify Sans', 'monospace'],
        terminal: ['VT323', 'monospace'],
      },
    },
  },
  plugins: [],
};
