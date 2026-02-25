# Pourtocol | Technical Documentation

## System Overview
**Pourtocol** is a smart drink dispenser control system designed for high-performance party environments (LMAO). It features a distributed architecture where a centralized Python/Flask server coordinates communication between a modern web interface and an ESP32-powered hardware dispenser.

### Core Features
- **Real-time Monitoring:** Synchronized status updates for glass presence and machine state.
- **Precision Pouring:** Selectable shot sizes (15ml, 30ml, 45ml) with custom override support.
- **QR Identity Integration:** Instant user identification via camera-based QR scanning.
- **Audit Logging:** Comprehensive SQLite database for tracking every pour and failure event.
- **Safety Interlocks:** Hardware-level checks for glass presence and concurrent flow prevention.

---

## Tech Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, shadcn/ui |
| **Backend** | Python 3.13+, Flask |
| **Database** | SQLite3 |
| **Hardware** | ESP32 (Micro-controller) |
| **Icons** | Lucide React |
| **Scanning** | html5-qrcode |

---

## Project Structure
```text
Pourtocol/
├── backend/
│   ├── app.py           # Flask application factory
│   ├── routes.py        # API blueprint & route handlers
│   ├── esp32.py         # ESP32 hardware communication layer
│   ├── database.py      # SQLite schema and data access layer
│   └── pyproject.toml   # Python dependencies (uv)
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (shadcn/ui + custom)
│   │   ├── hooks/       # Custom hooks (useStatus, useLogs, useDispense)
│   │   ├── lib/         # API client, constants, utilities
│   │   ├── types/       # TypeScript interfaces
│   │   ├── App.tsx      # Root application component
│   │   └── main.tsx     # Entry point
│   ├── package.json
│   └── vite.config.ts   # Vite config with API proxy
└── README.md
```

---

## API Architecture

### 1. Server API (Flask)
The server acts as a proxy/logger between the frontend and the ESP32.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/status` | `GET` | Returns connectivity status for both Server and ESP32. |
| `/api/dispense` | `POST` | Initiates a pour order. Requires `{ "amount_ml": int, "user_token": str }`. |
| `/api/logs` | `GET` | Retrieves the latest `n` activity records from the database. |

### 2. ESP32 Interface (Expected)
The ESP32 must expose these local network endpoints:
- `GET /status`: Returns JSON `{ "state": "idle|pouring", "glass_present": bool, "uptime": int }`.
- `POST /dispense`: Receives `{ "amount_ml": int, "request_id": str }`.

---

## Data Schema (SQLite)
The `events` table tracks all system interactions:
```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_token TEXT,
    amount_ml INTEGER,
    status TEXT,         -- 'started', 'success', 'failed'
    reason TEXT          -- Error details if status is 'failed'
);
```

---

## Setup & Installation

### Prerequisites
- **Python 3.13+**
- **Node.js 18+** and **npm**
- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** — Python package manager

### 1. Backend
```bash
cd backend

# Install dependencies (automatically creates a .venv)
uv sync

# Launch server (database is initialized automatically)
uv run flask run --host 0.0.0.0 --port 5000
```

### 2. Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api/* to Flask on port 5000)
npm run dev
```

The Vite dev server starts on `http://localhost:5173` and automatically proxies all `/api/*` requests to the Flask backend on port 5000.

#### Production Build
```bash
npm run build    # outputs to frontend/dist/
npm run preview  # preview the production build locally
```

### 3. Hardware Configuration
- Flash ESP32 with an HTTP-responsive firmware.
- Connect a submersible pump/solenoid and an IR/Ultrasonic proximity sensor for glass detection.
- Ensure the ESP32 is on the same local network as the Flask server.
- Update `ESP32_URL` in `backend/esp32.py` if your device is not reachable at `http://esp32.local`.

---

## Safety Protocols
1. **Glass Interlock:** The frontend disables the "POUR" button unless `glass_present` is true.
2. **Busy Guard:** The backend rejects new requests if `is_pouring` is active or if the ESP32 reports a non-idle state.
3. **Volume Cap:** Hard-coded limits prevent dispensing more than 60ml in a single request.
4. **Timeout Handling:** 1.0s - 2.0s timeouts on all hardware requests to prevent server hang.

---

## Future Roadmap
- [ ] **Multi-Tap Support:** Coordinate multiple ESP32 dispensers from one dashboard.
- [ ] **Inventory Tracking:** Real-time remaining liquid estimation.
- [ ] **Analytics Dashboard:** Graphical representation of pour trends over time.
- [ ] **User ACLs:** Restricted access for specific tokens/IDs.
