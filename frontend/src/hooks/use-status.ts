import { useCallback, useEffect, useRef, useState } from "react";

import { fetchStatus } from "@/lib/api";
import { POLL_STATUS_MS, POLL_STATUS_OFFLINE_MS } from "@/lib/constants";
import type { SystemStatus } from "@/types/api";

const INITIAL_STATUS: SystemStatus = {
  server_online: false,
  esp_online: false,
  esp_status: {
    state: "offline",
    glass_present: false,
    uptime: 0,
    last_pour_ml: 0,
  },
  timestamp: 0,
};

/**
 * Polls GET /api/status with adaptive intervals:
 * - POLL_STATUS_MS when ESP32 is online
 * - POLL_STATUS_OFFLINE_MS when ESP32 is offline
 * Polling pauses while the tab is hidden, and refreshes immediately on
 * becoming visible again.
 */
export function useStatus() {
  const [status, setStatus] = useState<SystemStatus>(INITIAL_STATUS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const onlineRef = useRef(false);
  const hasFetched = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStatus();
      onlineRef.current = data.esp_online;
      setStatus(data);
    } catch {
      onlineRef.current = false;
      setStatus((prev) => ({
        ...prev,
        esp_online: false,
        esp_status: { ...prev.esp_status, state: "offline" },
      }));
    } finally {
      setLastUpdated(new Date());
    }
  }, []);

  if (!hasFetched.current) {
    hasFetched.current = true;
    refresh();
  }

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (document.visibilityState === "hidden") {
        timeoutId = setTimeout(poll, POLL_STATUS_OFFLINE_MS);
        return;
      }
      await refresh();
      const interval = onlineRef.current ? POLL_STATUS_MS : POLL_STATUS_OFFLINE_MS;
      timeoutId = setTimeout(poll, interval);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    timeoutId = setTimeout(poll, onlineRef.current ? POLL_STATUS_MS : POLL_STATUS_OFFLINE_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  return { status, lastUpdated, refresh } as const;
}
