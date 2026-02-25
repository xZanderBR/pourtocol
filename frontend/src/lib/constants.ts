export const VOLUME_PRESETS = [
  { label: "Shot", description: "15ml", ml: 15 },
  { label: "Double", description: "30ml", ml: 30 },
  { label: "Triple", description: "45ml", ml: 45 },
] as const;

export const MAX_DISPENSE_ML = 60;

/** Polling intervals in milliseconds. */
export const POLL_STATUS_MS = 2_000;
export const POLL_STATUS_OFFLINE_MS = 5_000;
export const POLL_LOGS_MS = 5_000;
export const POLL_LEADERBOARD_MS = 10_000;

/** Duration to show success/error feedback before resetting (ms). */
export const FEEDBACK_DURATION_MS = 3_000;

/** Simulated pour duration before resetting state (ms). */
export const POUR_TIMEOUT_MS = 4_000;
