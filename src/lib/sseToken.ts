import { apiIssueSseToken } from "@/lib/api/auth";

type CachedToken = { token: string; expiresAtMs: number };

let cached: CachedToken | null = null;
let inFlight: Promise<string | null> | null = null;

/** Request a short-lived token for SSE query params (never use the main JWT directly). */
export async function getSseToken(): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.expiresAtMs - 10_000 > now) {
    return cached.token;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const out = await apiIssueSseToken();
      cached = {
        token: out.sse_token,
        expiresAtMs: now + Math.max(15, out.expires_in_seconds) * 1000,
      };
      return out.sse_token;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function clearSseTokenCache(): void {
  cached = null;
  inFlight = null;
}
