import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0faf4",
          100: "#dcf5e6",
          200: "#bbebce",
          300: "#8adaac",
          400: "#52c082",
          500: "#2ea35e",
          600: "#2C6E49",
          700: "#245a3c",
          800: "#1e4830",
          900: "#193c28",
        },
      },
    },
  },
  plugins: [],
};

export default config;
