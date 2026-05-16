import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0f17",
          soft: "#111827",
          card: "#151b27",
          border: "#1f2937",
        },
        accent: {
          DEFAULT: "#6366f1",
          soft: "#4f46e5",
        },
        good: "#10b981",
        warn: "#f59e0b",
        bad: "#ef4444",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
