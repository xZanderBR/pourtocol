# Aztec Pour | Technical Documentation

## System Overview
**Aztec Pour** is a smart drink dispenser control system designed for high-performance party environments (LMAO). It features a distributed architecture where a centralized Python/Flask server coordinates communication between a modern web interface and an ESP32-powered hardware dispenser.

### Core Features
- **Real-time Monitoring:** Synchronized status updates for glass presence and machine state.
- **Precision Pouring:** Selectable shot sizes (15ml, 30ml, 45ml) with custom override support.
- **QR Identity Integration:** Instant user identification via `html5-qrcode` scanning.
- **Audit Logging:** Comprehensive SQLite database for tracking every pour and failure event.
- **Safety Interlocks:** Hardware-level checks for glass presence and concurrent flow prevention.

---

## Tech Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS, JavaScript (ES6+) |
| **Backend** | Python 3.x, Flask |
| **Database** | SQLite3 |
| **Hardware** | ESP32 (Micro-controller) |
| **Icons/Fonts** | Google Fonts (Outfit), Custom SVGs |
| **Scanning** | html5-qrcode Library |

---

## Project Structure
```text
aztec-pour/
├── app.py             # Flask application & API controller
├── database.py        # SQLite schema and data access layer
├── index.html         # Unified frontend application
├── dispenser.db       # Persistent SQLite storage
└── README_TECHNICAL.md # This documentation
```

---

## API Architecture

### 1. Server API (Flask)
The server acts as a proxy/logger between the frontend and the ESP32.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Serves the main web interface. |
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

### 1. Backend Setup
```bash
# Install dependencies
pip install flask requests

# Initialize database
python database.py

# Launch server
python app.py
```
*Note: Ensure `ESP32_URL` in `app.py` matches your hardware's local IP or mDNS name.*

### 2. Hardware Configuration
- Flash ESP32 with an HTTP-responsive firmware.
- Connect a submersible pump/solenoid and an IR/Ultrasonic proximity sensor for glass detection.
- Ensure the ESP32 is on the same local network as the Flask server.

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
