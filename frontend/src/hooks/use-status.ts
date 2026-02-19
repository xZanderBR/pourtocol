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
  is_pouring: false,
};

/**
 * Polls GET /api/status with adaptive intervals:
 * - 2s when ESP32 is online
 * - 10s when ESP32 is offline
 * Uses setInterval for consistent wall-clock timing regardless of fetch duration.
 */
export function useStatus() {
  const [status, setStatus] = useState<SystemStatus>(INITIAL_STATUS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
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

  // Fire the very first fetch eagerly (survives strict mode double-mount)
  if (!hasFetched.current) {
    hasFetched.current = true;
    refresh();
  }

  useEffect(() => {
    function scheduleInterval() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = onlineRef.current ? POLL_STATUS_MS : POLL_STATUS_OFFLINE_MS;
      intervalRef.current = setInterval(() => {
        refresh().then(() => {
          // Re-schedule if the online state changed (interval needs updating)
          const newInterval = onlineRef.current ? POLL_STATUS_MS : POLL_STATUS_OFFLINE_MS;
          if (newInterval !== interval) {
            scheduleInterval();
          }
        });
      }, interval);
    }

    scheduleInterval();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { status, lastUpdated, refresh } as const;
}
