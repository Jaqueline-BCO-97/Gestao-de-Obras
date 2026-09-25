/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F3EC",
        terracotta: {
          DEFAULT: "#C1694A",
          dark: "#A8563A",
        },
        navy: "#16233F",
        ink: "#2B2620",
      },
    },
  },
  plugins: [],
}