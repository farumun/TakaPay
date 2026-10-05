import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#0d6efd",
          600: "#0066ff",
          700: "#0754cf",
          950: "#071a37",
        },
      },
      boxShadow: {
        soft: "0 16px 48px rgba(14, 38, 79, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
