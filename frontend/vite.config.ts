import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The Express backend runs on http://localhost:3000, the Python analytics API on
// http://localhost:5000. In development we proxy these paths to them so the React
// app can use plain relative URLs (e.g. "/api/news/posts") with no CORS headaches,
// and so that UPLOADED images (e.g. "/uploads/...") load from the backend.
//
// Proxying both backends through Vite also means the whole app is reachable from
// ONE origin — so a single tunnel (e.g. `ngrok http 5173`) exposes everything to
// other devices, with no per-service tunnels or CORS to manage.
//
// Note: the site's design images live in "frontend/public/assets/..." and are
// served by Vite itself (referenced as "/assets/..."), so they do NOT need the
// backend running. Only dynamic data and user uploads go through the proxy.
const BACKEND = "http://localhost:3000";
const PYTHON_API = "http://localhost:5000";

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
    // Allow the dev server to be reached via any host header (e.g. an ngrok
    // domain). Without this, Vite rejects requests from unknown hosts.
    allowedHosts: true,
    proxy: {
      "/api": BACKEND,
      "/uploads": BACKEND,
      // Python analytics API. The frontend calls "/pyapi/api/..."; we strip the
      // "/pyapi" prefix and forward to the Python server (which serves "/api/...").
      // A separate prefix is needed because "/api" already goes to the Node backend.
      "/pyapi": {
        target: PYTHON_API,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pyapi/, ""),
      },
    },
  },
});
