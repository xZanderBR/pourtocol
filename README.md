# Pourtocol

A networked drink dispenser system. A React/TypeScript web app talks to a Python/Flask coordinator, which talks to an ESP32-powered hardware dispenser over the local network.

**Demo:** [youtu.be/go4TOXk46Cg](https://youtu.be/go4TOXk46Cg)
**Companion firmware:** [xZanderBR/Pourtocol-Firmware](https://github.com/xZanderBR/Pourtocol-Firmware)

## System Overview

```text
┌────────────┐   /api/*    ┌──────────────┐  /status, /dispense  ┌────────────┐
│  React UI  │ ──────────▶ │  Flask app   │ ───────────────────▶ │   ESP32    │
│ (Vite 7)   │ ◀────────── │  (Python)    │ ◀─────────────────── │ (firmware) │
└────────────┘             └──────┬───────┘                      └─────┬──────┘
                                  │                                    │
                                  ▼                                    ▼
                              SQLite                            pump + HC-SR04
                            (audit log)                         + PN532 NFC
```

### Core Features
- **Real-time monitoring** — synchronized status updates for glass presence, pump state, and NFC tap.
- **Precision pouring** — selectable 15/30/45 ml shot sizes with a hard `MAX_DISPENSE_ML` cap.
- **NFC identity** — PN532 tap reads a tag UID; first-time UIDs can be registered with a friendly name on the spot.
- **Audit logging** — every pour and failure is persisted to SQLite with timestamp, user, amount, and reason.
- **Safety interlocks** — hardware-level checks for glass presence and concurrent-flow prevention, enforced on both firmware and server.
- **Leaderboard** — aggregated per-user totals across all successful pours.

## Tech Stack

| Layer | Stack |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, shadcn/ui, Lucide React |
| **Backend** | Python 3.13, Flask 3, Pydantic Settings, Requests |
| **Database** | SQLite3 |
| **Firmware** | ESP32 (Arduino framework), ESPAsyncWebServer, ArduinoJson, Adafruit PN532 |
| **Hardware** | ESP32 DevKit, HC-SR04 ultrasonic sensor, PN532 NFC reader, relay-driven submersible pump |
| **Tooling** | `uv` (Python), `npm` + Vite (frontend), PlatformIO / Arduino IDE (firmware) |

## Project Structure

```text
pourtocol/
├── backend/
│   ├── app.py          # Flask application factory
│   ├── routes.py       # API blueprint & route handlers
│   ├── esp32.py        # ESP32 communication (cached resolution, single-flight status)
│   ├── database.py     # SQLite schema & query helpers
│   ├── users.py        # UID → display-name mapping (users.json)
│   ├── config.py       # Pydantic Settings (env / .env loader)
│   └── pyproject.toml  # Python dependencies (uv)
├── frontend/
│   ├── src/
│   │   ├── components/ # React components (shadcn/ui + custom)
│   │   ├── hooks/      # useStatus, useLogs, useDispense, useLeaderboard
│   │   ├── lib/        # API client, constants, utilities
│   │   └── types/      # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts  # Vite config with /api/* proxy
└── README.md
```

## API

### Server (Flask) — consumed by the frontend

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/status` | `GET` | Coordinator + ESP32 reachability, machine state, glass presence, last NFC UID/name. |
| `/api/dispense` | `POST` | `{ "amount_ml": int, "user_token": str }` — validates and forwards to the ESP32. |
| `/api/logs` | `GET` | Last `n` events from the audit log (`?limit=20`). |
| `/api/leaderboard` | `GET` | Per-user `pour_count` and `total_ml`, ranked. |
| `/api/users` | `POST` | `{ "uid": str, "name": str }` — register a friendly name for an NFC UID. |

### ESP32 — consumed by the Flask server

Documented in the [firmware README](https://github.com/xZanderBR/Pourtocol-Firmware#http-api). Briefly:

- `GET /status` → `{ state, glass_present, uptime, last_pour_ml, nfc_uid, nfc_tag_present, nfc_ready }`
- `POST /dispense` ← `{ amount_ml, request_id }`

## Performance Notes

The Flask layer keeps a single resolved IP for the ESP32 (one mDNS lookup instead of one per request) and reuses a `requests.Session` for HTTP keep-alive. A short-lived (150 ms) status cache with a single-flight lock means N browser tabs polling every 500 ms still produce only ~6 device round-trips per second total, not 2N.

## Data Schema (SQLite)

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_token TEXT,
    amount_ml INTEGER,
    status TEXT,         -- 'completed' | 'failed'
    reason TEXT          -- failure detail (NULL on success)
);
```

## Setup

### Prerequisites
- **Python 3.13+**
- **Node.js 18+** and **npm**
- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** — Python package manager

### 1. Backend
```bash
cd backend
uv sync                                              # install deps into .venv
uv run flask run --host 0.0.0.0 --port 8080          # database initializes on boot
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                                          # http://localhost:5173 (proxies /api/* → :8080)
```

Production build:
```bash
npm run build      # outputs to frontend/dist/
npm run preview
```

### 3. Configuration

All values can be overridden via environment variables or `backend/.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOST` | `0.0.0.0` | Flask bind address |
| `PORT` | `8080` | Flask server port |
| `DEBUG` | `true` | Enable Flask debug mode |
| `DATABASE_PATH` | `dispenser.db` | SQLite database file |
| `ESP32_URL` | `http://esp32.local` | ESP32 base URL (mDNS) |
| `ESP32_IP` | `None` | Override mDNS with a static IP (pair with DHCP reservation) |
| `ESP32_STATUS_TIMEOUT` | `1.0` | Seconds — `/status` timeout |
| `ESP32_DISPENSE_TIMEOUT` | `2.0` | Seconds — `/dispense` timeout |
| `MOCK_ESP32` | `false` | Simulate hardware locally (no device needed) |
| `MAX_DISPENSE_ML` | `60` | Hard cap on pour volume |

### 4. Hardware

Flash the ESP32 with [Pourtocol-Firmware](https://github.com/xZanderBR/Pourtocol-Firmware). Both devices must be on the same local network. If mDNS (`esp32.local`) is flaky on your host, set `ESP32_IP` to bypass it entirely.

## Safety Protocols

1. **Glass interlock** — the dispense button is disabled in the UI unless `glass_present` is `true`, and the ESP32 rejects pours when no glass is detected.
2. **Busy guard** — the firmware returns `409` if asked to start a pour while one is in progress; the server surfaces the same state in `/api/status`.
3. **Volume cap** — `MAX_DISPENSE_ML` (default `60`) is enforced on both the server and the firmware.
4. **Timeouts** — every server→firmware HTTP call has a low single-digit-second timeout to prevent the Flask process from hanging on an unreachable device.

## Roadmap

- [ ] Multi-tap support — coordinate multiple ESP32 dispensers from one dashboard
- [ ] Inventory tracking — real-time remaining-liquid estimation
- [ ] Analytics dashboard — pour trends over time
- [ ] User ACLs — restricted access for specific tokens/UIDs
