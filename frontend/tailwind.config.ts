import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        sidebar: "#FFFFFF",
        primary: "#40916C",
        secondary: "#2D6A4F",
        text: "#212529",
        "status-activa-bg": "#D1FAE5",
        "status-activa-text": "#065F46",
        "status-invalida-bg": "#FEF3C7",
        "status-invalida-text": "#92400E",
        "status-eliminada-bg": "#FEE2E2",
        "status-eliminada-text": "#991B1B",
        "status-baja-bg": "#F3F4F6",
        "status-baja-text": "#374151"
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.08)",
      }
    },
  },
  plugins: [],
};
export default config;
