import { useEffect, useRef } from "react";

const API_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, "") ?? "";

const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;
/** If `onopen` never fires (stuck CONNECTING / failed handshake), tear down and retry with backoff. */
const OPEN_TIMEOUT_MS = 20_000;

/**
 * Shared EventSource lifecycle: open, reconnect on hard close with backoff, cleanup.
 * Callers supply `reconnectKey` so changing class/session opens a new connection.
 */
export function useEventSourceConnection(options: {
  enabled: boolean;
  reconnectKey: string;
  getUrl: () => string | null;
  onMessage: (data: string) => void;
}): void {
  const { enabled, reconnectKey, getUrl, onMessage } = options;
  const getUrlRef = useRef(getUrl);
  const onMessageRef = useRef(onMessage);
  getUrlRef.current = getUrl;
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !API_URL) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let openTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let connectGeneration = 0;

    function clearReconnectTimer() {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function clearOpenTimer() {
      if (openTimer !== null) {
        clearTimeout(openTimer);
        openTimer = null;
      }
    }

    function scheduleReconnect() {
      clearReconnectTimer();
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt = Math.min(reconnectAttempt + 1, 12);
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      const url = getUrlRef.current();
      if (!url) return;

      const gen = ++connectGeneration;
      clearOpenTimer();
      const local = new EventSource(url);
      es = local;

      openTimer = setTimeout(() => {
        openTimer = null;
        if (gen !== connectGeneration) return;
        if (es !== local) return;
        if (local.readyState === EventSource.OPEN) return;
        // Invalidate this connection's onerror so close() does not schedule a second reconnect.
        connectGeneration += 1;
        local.close();
        if (es === local) es = null;
        scheduleReconnect();
      }, OPEN_TIMEOUT_MS);

      local.onopen = () => {
        if (gen !== connectGeneration) return;
        if (es !== local) return;
        reconnectAttempt = 0;
        clearOpenTimer();
      };

      local.onmessage = (e: MessageEvent<string>) => {
        onMessageRef.current(e.data);
      };

      local.onerror = () => {
        if (gen !== connectGeneration) return;
        clearOpenTimer();
        if (es !== local) return;
        if (local.readyState === EventSource.CLOSED) {
          es = null;
          scheduleReconnect();
        }
      };
    }

    connect();

    return () => {
      connectGeneration += 1;
      clearReconnectTimer();
      clearOpenTimer();
      es?.close();
      es = null;
    };
  }, [enabled, reconnectKey]);
}
