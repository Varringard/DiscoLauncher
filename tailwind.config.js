/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        exodus: {
          dark: '#0d1117',
          panel: '#161b22',
          border: '#30363d',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          gold: '#eab308',
          cyan: '#06b6d4',
          neon: '#10b981'
        }
      },
      fontFamily: {
        minecraft: ['Minecraft', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
