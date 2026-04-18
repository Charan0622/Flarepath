/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        severity: {
          critical: "#ff2d2d",
          high: "#ff7b1c",
          medium: "#ffc93c",
          low: "#3ddc84",
        },
        surface: {
          base: "#0a0a0b",
          raised: "#121214",
          overlay: "#1a1a1e",
          muted: "#2a2a2e",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
      },
      transitionDuration: {
        fast: "120ms",
        normal: "220ms",
        slow: "400ms",
      },
    },
  },
};
