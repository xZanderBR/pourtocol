export const VOLUME_PRESETS = [
  { label: "Shot", description: "15ml", ml: 15 },
  { label: "Double", description: "30ml", ml: 30 },
  { label: "Triple", description: "45ml", ml: 45 },
] as const;

export const MAX_DISPENSE_ML = 60;

/** Status polling intervals in milliseconds. */
export const POLL_STATUS_MS = 500;
export const POLL_STATUS_OFFLINE_MS = 5_000;

/** Duration to show success/error feedback before resetting (ms). */
export const FEEDBACK_DURATION_MS = 3_000;
