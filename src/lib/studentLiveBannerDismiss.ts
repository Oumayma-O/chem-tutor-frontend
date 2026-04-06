/** After a successful exit-ticket submit, hide the unit-page banner until the teacher starts a new session (anchor changes). */
export const LIVE_BANNER_DISMISS_STORAGE_KEY = "chemtutor_live_banner_dismissed_anchor";

export function getDismissedLiveBannerAnchor(): string | null {
  try {
    return localStorage.getItem(LIVE_BANNER_DISMISS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDismissedLiveBannerAnchor(anchor: string): void {
  try {
    localStorage.setItem(LIVE_BANNER_DISMISS_STORAGE_KEY, anchor);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("chemtutor-live-banner-dismiss"));
}

export function clearDismissedLiveBannerAnchor(): void {
  try {
    localStorage.removeItem(LIVE_BANNER_DISMISS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
