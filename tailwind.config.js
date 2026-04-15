/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fire: { DEFAULT: "#C0272D", dark: "#8B1A1A", light: "#FEF2F2" },
      },
      fontFamily: {
        heebo: ["Heebo", "sans-serif"],
      },
    },
  },
  plugins: [],
};
