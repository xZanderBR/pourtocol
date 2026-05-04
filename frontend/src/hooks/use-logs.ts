import { useCallback, useEffect, useState } from "react";

import { fetchLogs } from "@/lib/api";
import type { LogEntry } from "@/types/api";

/**
 * Loads activity logs once on mount (when enabled). Logs only change after a
 * pour completes, so the consumer should call `refresh` from its dispense
 * success handler rather than poll on a timer.
 */
export function useLogs(enabled = true) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLogs();
      setLogs(data);
    } catch {
      // Silently fail — stale logs are fine
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [refresh, enabled]);

  return { logs, refresh } as const;
}
