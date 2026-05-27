import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f1f8ed",
          100: "#dcefd2",
          600: "#4d8b35",
          700: "#3e712d",
          900: "#253d20"
        },
        tomato: {
          500: "#d7472f",
          600: "#bd3824"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(31, 54, 38, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
