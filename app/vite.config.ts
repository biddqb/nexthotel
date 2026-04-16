import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api to the Axum backend at :8080.
// In production, the Axum server serves the built SPA directly.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    host: true, // accept LAN connections in dev
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
