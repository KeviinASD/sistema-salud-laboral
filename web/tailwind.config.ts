import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {}
  },
  plugins: [require("@tailwindcss/forms")]
} satisfies Config;
