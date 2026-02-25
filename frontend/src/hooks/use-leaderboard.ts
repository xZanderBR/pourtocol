import { useCallback, useEffect, useRef, useState } from "react";

import { fetchLeaderboard } from "@/lib/api";
import { POLL_LEADERBOARD_MS } from "@/lib/constants";
import type { LeaderboardEntry } from "@/types/api";

/**
 * Polls GET /api/leaderboard at a fixed interval.
 * Returns the ranked entries and a manual refresh callback.
 */
export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch {
      // Silently fail — stale leaderboard is fine
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
    intervalRef.current = setInterval(refresh, POLL_LEADERBOARD_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { entries, refresh } as const;
}
