/** Core HTTP client — token storage and low-level request helpers. */

const API_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, "") || "";

const TOKEN_KEY = "chemtutor_token";

// ── Token storage ──────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const STORAGE_PREFIX_COMPLETION = "chemtutor_completion_";
const STORAGE_KEY_SIM_GUIDE = "chemtutor_sim_guide_seen";

/** Clear auth token, topic completion state, and any other Chem Tutor localStorage. */
export function clearAllUserAndCache(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORAGE_KEY_SIM_GUIDE);
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX_COMPLETION)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  if (!API_URL) throw new Error("VITE_API_URL is not set");
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err));
  }
  return res.json() as Promise<T>;
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function get<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function useBackendApi(): boolean {
  return Boolean(API_URL);
}
