/** ESP32 hardware status returned from the microcontroller. */
export interface EspStatus {
  state: "idle" | "pouring" | "offline" | "error";
  glass_present: boolean;
  uptime: number;
  last_pour_ml: number;
}

/** Combined system status from GET /api/status. */
export interface SystemStatus {
  server_online: boolean;
  esp_online: boolean;
  esp_status: EspStatus;
  timestamp: number;
  is_pouring: boolean;
}

/** Dispense request body for POST /api/dispense. */
export interface DispenseRequest {
  amount_ml: number;
  user_token: string;
}

/** Standard API response from POST /api/dispense. */
export interface DispenseResponse {
  success: boolean;
  message?: string;
  reason?: string;
}

/** Single event log entry returned from GET /api/logs. */
export interface LogEntry {
  timestamp: number;
  user_token: string;
  amount_ml: number;
  status: "started" | "completed" | "failed";
  reason: string | null;
}

/** Single leaderboard entry returned from GET /api/leaderboard. */
export interface LeaderboardEntry {
  user_token: string;
  pour_count: number;
  total_ml: number;
  last_pour: string;
}

/** Volume preset option for the dispense control. */
export interface VolumePreset {
  label: string;
  description: string;
  ml: number;
}
