import type { DispenseRequest, DispenseResponse, LeaderboardEntry, LogEntry, SystemStatus } from "@/types/api";

const API_BASE = "/api";

class ApiError extends Error {
  status: number;
  reason?: string;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.reason = reason;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.reason ?? "Request failed",
      response.status,
      data.reason,
    );
  }

  return data as T;
}

/** Fetch current system & ESP32 status. */
export function fetchStatus(): Promise<SystemStatus> {
  return request<SystemStatus>("/status");
}

/** Send a dispense command. */
export function sendDispense(payload: DispenseRequest): Promise<DispenseResponse> {
  return request<DispenseResponse>("/dispense", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Fetch recent activity logs. */
export function fetchLogs(limit = 15): Promise<LogEntry[]> {
  return request<LogEntry[]>(`/logs?limit=${limit}`);
}

/** Fetch leaderboard rankings. */
export function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`);
}

export { ApiError };
