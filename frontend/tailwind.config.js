/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F5F6F8",
        primary: { DEFAULT: "#2F6FED", dark: "#1D56C7" },
        navy: "#123047",
        ink: "#1F2430",
      },
    },
  },
  plugins: [],
}