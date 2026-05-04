import { useCallback, useEffect, useState } from "react";

import { fetchLeaderboard } from "@/lib/api";
import type { LeaderboardEntry } from "@/types/api";

/**
 * Loads leaderboard rankings once on mount. Entries only change after a pour
 * completes, so the consumer should call `refresh` from its dispense success
 * handler rather than poll on a timer.
 */
export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch {
      // Silently fail — stale leaderboard is fine
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, refresh } as const;
}
