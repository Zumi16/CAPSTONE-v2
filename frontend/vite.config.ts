import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The Express backend runs on http://localhost:3000.
// In development we proxy these paths to it so the React app can use plain
// relative URLs (e.g. "/api/news/posts") with no CORS headaches, and so that
// UPLOADED images (e.g. "/uploads/...") load from the backend.
//
// Note: the site's design images live in "frontend/public/assets/..." and are
// served by Vite itself (referenced as "/assets/..."), so they do NOT need the
// backend running. Only dynamic data and user uploads go through the proxy.
const BACKEND = "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: false,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": BACKEND,
      "/uploads": BACKEND,
    },
  },
});
