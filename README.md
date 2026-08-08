# 🛡 RakshaNav — Safe Urban Navigation MVP

**Track:** Mobility, Infrastructure & Built Environment  
**Stack:** React + Vite (Frontend) · Express + Node.js (Backend) · MapLibre GL

---

## What This Prototype Demonstrates

RakshaNav is a **dual-view urban safety platform** that reframes the problem of unsafe streets from *individual criminal intent* to **infrastructure deficit** — broken streetlights, dark zones, and unmaintained public lighting.

### Two Views, One Mission

| View | Audience | What It Shows |
|------|----------|---------------|
| **User Mobility** | Citizens | Safe vs. dangerous route comparison with live lux data |
| **Govt Infrastructure** | City authorities (BBMP) | Real-time darkness map, complaint feed, work order system |

---

## Project Structure

```
rakshanav/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── Header.jsx       ← View toggle + branding
│   │   ├── UserView.jsx     ← B2C: Mobile map + route cards + sensor demo
│   │   └── GovtView.jsx     ← B2G: Dashboard + heatmap + live reports
│   └── data/
│       └── bangaloreData.js ← Hardcoded GeoJSON + dark spot coordinates
└── server/
    ├── package.json
    └── index.js             ← Express API (routes, sensor reports, work orders)
```

---

## Quick Start

### 1. Frontend (React + Vite)

```bash
# In the root directory
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend (Express API)

```bash
cd server
npm install
npm run dev     # uses nodemon for hot reload
# → http://localhost:3001
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server status |
| `GET` | `/api/dark-spots` | All darkness zones (filter: `?severity=critical`) |
| `GET` | `/api/stats` | City-wide aggregate statistics |
| `GET` | `/api/routes` | Dangerous + safe route GeoJSON |
| `POST` | `/api/sensor-report` | Submit ambient light reading `{ lat, lng, lux }` |
| `GET` | `/api/sensor-reports` | Last 50 citizen sensor reports |
| `POST` | `/api/work-orders` | Raise a streetlight repair work order |

### Example: Submit a sensor reading

```bash
curl -X POST http://localhost:3001/api/sensor-report \
  -H "Content-Type: application/json" \
  -d '{ "lat": 12.9716, "lng": 77.5946, "lux": 2.3 }'
```

---

## Key Features

### User Mobility View (B2C)
- **MapLibre GL** map with two rendered routes
- **Silk Board Service Rd** — 3.2 lux, 91/100 risk score, 14 incidents
- **Church Street** — 28.5 lux, 12/100 risk score, 1 incident
- Clickable route cards to isolate each route on the map
- **AmbientLightSensor API** live demo (Chrome on Android with permissions)
- Simulated lux sensor for browsers without hardware support

### Govt Infrastructure View (B2G)
- Full-screen dark map of Bangalore with **15 dark zone markers**
- Color-coded by severity: 🔴 Critical (<5 lux) · 🟠 High (5–10 lux) · 🟡 Medium (10–15 lux)
- Filter by severity with instant map update
- Click any marker for area details + "Raise Work Order" button
- **City Safety Deficit Dashboard** — 6 live stats (dark zones, complaints, response time)
- Infrastructure Deficit Index progress bar
- Live citizen report feed with lux readings

---

## Pitch Talking Points

1. **Infrastructure Deficit, Not Criminal Intent** — RakshaNav maps *broken infrastructure* as the root cause of unsafe streets. The fix is civic, not behavioral.

2. **Passive Telemetry** — Every user with the app automatically audits the city. Their ambient light sensor becomes a municipal sensor for free.

3. **Dual Revenue Model**
   - **B2C**: Premium safe-route navigation for individuals
   - **B2G**: City-Level Safety Deficit Dashboard licensed to municipal corporations (BBMP, BMC, GHMC)

4. **Network Effect** — More users → more lux data → more accurate darkness map → better routes → more users

---

## Tech Stack Choices

| Choice | Reason |
|--------|--------|
| **MapLibre GL** | Open-source, no Mapbox API key needed for demo |
| **OpenFreeMap tiles** | Free dark-mode tiles, no token required |
| **React + Vite** | Fast HMR, easy component structure |
| **Express** | Lightweight API, easy to extend to MongoDB |
| **AmbientLightSensor API** | Real W3C standard, works on Chrome Android |

---

## Next Steps (Post-Hackathon)

- [ ] MongoDB integration for persistent sensor reports
- [ ] WebSocket for true real-time report feed
- [ ] Mapbox heatmap layer using sensor density
- [ ] BBMP Open Data API integration for official streetlight data
- [ ] React Native app with background sensor polling
- [ ] JWT auth for govt dashboard

---

*Built for the Mobility, Infrastructure & Built Environment track*  
*"Standard apps route around bad infrastructure. RakshaNav maps it so cities can fix it."*
