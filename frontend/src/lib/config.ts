/**
 * App-wide configuration read from environment variables.
 *
 * `VITE_API_BASE` lets you point the app at a backend.
 *  - Leave it EMPTY during local development. The app then calls "/api/..."
 *    and Vite's dev proxy (see vite.config.ts) forwards the request to the
 *    Express server on http://localhost:3000.
 *  - In production, set it to the full backend URL, e.g. https://api.example.com
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? "").replace(
  /\/$/,
  "",
);

/**
 * Base URL for the Python analytics API.
 *
 * Defaults to "/pyapi/api" — a same-origin path that Vite's dev proxy forwards
 * to the Python server on :5000 (see vite.config.ts). Using a same-origin path
 * (instead of a hardcoded http://localhost:5000) means the analytics features
 * work both locally AND when the whole app is exposed through a single tunnel
 * (e.g. `ngrok http 5173`), with no CORS. In production, point this at the
 * deployed Python URL via VITE_PY_API_BASE.
 */
export const PY_API_BASE: string = (
  import.meta.env.VITE_PY_API_BASE ?? "/pyapi/api"
).replace(/\/$/, "");
// LOCAL-ONLY alternative (direct to the Python server, no Vite proxy / no ngrok):
// export const PY_API_BASE = "http://localhost:5000/api";

/**
 * Build a full API URL from a path.
 *   apiUrl("/api/news/posts") -> "/api/news/posts"            (dev, via proxy)
 *   apiUrl("/api/news/posts") -> "https://api.example.com/api/news/posts"
 */
export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean}`;
}

/**
 * Build a URL for a file the backend serves (uploaded images, etc.).
 * The backend stores paths like "/uploads/news/123.jpg"; this prefixes them
 * with the API base so they load no matter where the frontend is hosted.
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path; // already a full URL
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean}`;
}
