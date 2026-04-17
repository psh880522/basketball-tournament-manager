import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF6B00",
          container: "#FF8C33",
          on: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1A237E",
          container: "#3949AB",
          on: "#FFFFFF",
        },
        surface: {
          DEFAULT: "#ffffff",
          low: "#f0f0f0",
          mid: "#e0e0e0",
          high: "#d0d0d0",
          highest: "#b8b8b8",
          bright: "#c0c0c0",
        },
      },
      borderRadius: {
        sharp: "4px",
      },
      fontFamily: {
        "space-grotesk": ["var(--font-space-grotesk)"],
        inter: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};

export default config;
