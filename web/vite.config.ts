import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4001"
    }
  },
  optimizeDeps: {
    include: [
      "chart.js",
      "react-chartjs-2",
      "jspdf",
      "html2canvas"
    ]
  }
});
