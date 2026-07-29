// Tailwind v4 uses CSS-first configuration via @theme in globals.css.
// This file is kept intentionally minimal for tooling that expects it.
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
