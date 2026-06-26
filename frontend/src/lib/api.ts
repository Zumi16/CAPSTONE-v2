/**
 * A small, friendly wrapper around `fetch`.
 *
 * Every page in the old site wrote `fetch("http://localhost:3000/api/...")`
 * by hand and parsed JSON manually. Here we do it once, in one place, so the
 * pages stay short and readable:
 *
 *   const data = await api.get<NewsResponse>("/api/news/posts");
 *   await api.post("/api/feedback", { rating, comment });
 *
 * It also throws a clear error when the server responds with a non-2xx status,
 * so pages can use try/catch instead of checking `res.ok` every time.
 */
import { apiUrl } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type JsonBody = Record<string, unknown> | unknown[] | undefined;

async function request<T>(
  method: string,
  path: string,
  body?: JsonBody | FormData,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const isFormData = body instanceof FormData;

  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      // Only set JSON content-type when we're actually sending JSON.
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...extraHeaders,
    },
    body: isFormData
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  // Try to read JSON; fall back to text so errors are still useful.
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>("GET", path, undefined, headers),

  post: <T>(path: string, body?: JsonBody | FormData, headers?: Record<string, string>) =>
    request<T>("POST", path, body, headers),

  put: <T>(path: string, body?: JsonBody | FormData, headers?: Record<string, string>) =>
    request<T>("PUT", path, body, headers),

  patch: <T>(path: string, body?: JsonBody | FormData, headers?: Record<string, string>) =>
    request<T>("PATCH", path, body, headers),

  delete: <T>(path: string, body?: JsonBody, headers?: Record<string, string>) =>
    request<T>("DELETE", path, body, headers),
};
