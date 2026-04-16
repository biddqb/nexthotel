/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Be Vietnam Pro",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        bg: "#fafaf9",
        surface: "#ffffff",
        border: "#e7e5e4",
        text: "#1c1917",
        muted: "#57534e",
        accent: {
          DEFAULT: "#0d9488",
          hover: "#0f766e",
          50: "#f0fdfa",
          100: "#ccfbf1",
          600: "#0d9488",
          700: "#0f766e",
        },
        status: {
          confirmed: "#475569",
          checkedIn: "#059669",
          checkedOut: "#78716c",
          cancelled: "#dc2626",
          noShow: "#d97706",
        },
      },
      borderRadius: {
        DEFAULT: "4px",
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["14px", "20px"],
        md: ["16px", "24px"],
        lg: ["20px", "28px"],
        xl: ["24px", "32px"],
        "2xl": ["32px", "40px"],
      },
      boxShadow: {
        drawer: "-8px 0 24px -8px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
