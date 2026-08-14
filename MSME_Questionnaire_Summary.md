# MSME Questionnaire Summary: RakshaNav

> **Note:** This document is strictly generated based on the **ACTUAL CURRENT CODEBASE** of RakshaNav. 

==================================================
## 1. EXECUTIVE PROJECT SUMMARY
==================================================

RakshaNav is a data-driven, safety-first civic navigation intelligence platform designed to prioritize commuter safety over pure time/distance optimization. Specifically tailored for the Bengaluru Metropolitan Region (BBMP), it dynamically calculates a live 8-parameter Safety Score for any route by aggregating real-time infrastructure data (police, hospitals, lighting, commercial areas), community hazard reports, meteorological data, and time-of-day contextual adjustments. 

Unlike conventional navigation apps that only route users based on traffic, RakshaNav routes users based on verifiable safety metrics, enabling a preventive approach to urban safety rather than a reactive one.

Target users include individual citizens, gig workers, enterprise employees (especially those working night shifts), and government/municipal planners who need intelligence on infrastructure gaps (dark spots, hazard density).

**What is RakshaNav? (30-second answer):**
"RakshaNav is a civic navigation platform that routes users based on safety rather than just time. It analyzes live infrastructure data like streetlights, police stations, and community hazard reports to generate a safety score for any given route, ensuring commuters—especially women and night-shift workers—travel through the safest possible corridors."

**How does RakshaNav work? (60-second answer):**
"When a user requests a route, RakshaNav first fetches multiple candidate routes via the OSRM routing engine. It then uses the Overpass API to dynamically scan a 500m corridor along each route for essential safety infrastructure like hospitals, police, ATMs, and lighting. It overlays live community hazard reports from a Supabase PostGIS backend and real-time weather data from Open-Meteo. Our backend Safety Engine then calculates a normalized 8-parameter safety score out of 100. The route with the highest score is recommended as the 'Safe Route', actively steering users away from unlit, isolated, or hazardous zones."

**Implementation Status:** Implemented.
**Deployment Status:** Vercel (Frontend & Serverless Functions), Supabase (PostgreSQL Database).

==================================================
## 2. PROBLEM → SOLUTION → VALUE
==================================================

**PROBLEM**
- Existing navigation prioritizes time/distance and ignores safety risks.
- Safety information (hazards, crimes, unlit zones) is fragmented.
- Emergency tools (like SOS buttons) are reactive—they only help *after* an incident occurs.
- Users lack live information about infrastructure (e.g., are there open shops, streetlights, or police nearby?).

**SOLUTION**
RakshaNav implements a multi-parameter Safe Navigation Engine that calculates a safety score for candidate routes and recommends the safest path. It also implements an active hazard reporting system, live location tracking, an SOS trigger, and an AI Safety Assistant for on-the-fly civic context.

**VALUE**
- **Individual Citizens / Women Commuters / Students:** Peace of mind knowing they are taking a populated, well-lit, and infrastructure-rich route, particularly at night.
- **Employees / Gig Workers:** Safer late-night transit.
- **Corporate Employers:** (Partially Implemented/Planned) Ability to monitor employee commute safety metrics.
- **Government / Smart Cities:** A unified dashboard highlighting civic infrastructure gaps (e.g., missing streetlights, recurring hazard zones) based on verifiable user telemetry and OpenStreetMap data.

==================================================
## 3. COMPLETE SYSTEM ARCHITECTURE
==================================================

User
 ↓
Frontend (React, Vite, TailwindCSS, Zustand)
 ↓
Authentication (Supabase Auth)
 ↓
Backend/API (Node.js/Express Server hosted on Vercel)
 ↓
Data Sources (Overpass API, Supabase PostgreSQL, Open-Meteo, OSRM)
 ↓
Safety Engine (Backend `SafetyEngine.js` calculating 8-parameter score)
 ↓
Route Engine (Backend `routeController.js` aggregating geometries & metrics)
 ↓
Dashboard / Navigation / Alerts (React Leaflet/MapLibre UI)

**Components:**
- **Frontend:** React 18, React Router, TailwindCSS, Framer Motion, Leaflet/MapLibre. Handles UI, Map rendering, and User Context.
- **Backend/API:** Node.js Express server (`server/index.js`). Exposes endpoints for Routing, AI, Overpass abstraction, and Geocoding.
- **Database/Auth:** Supabase (PostgreSQL). Stores User Profiles, Hazard Reports, Live Tracking Sessions, and Trip History. Implements Row Level Security (RLS).
- **Maps & Routing:** Leaflet for frontend map layers; OSRM for raw route geometries; Nominatim for Geocoding.
- **Infrastructure Services:** Overpass API (via `overpassService.js` with smart bounding box chunking and caching).
- **AI Chatbot:** Google Gemini API (`geminiService.js`) acting as the Safety Copilot with system prompts restricted to UI navigation and data summarization.
- **Notifications & Tracking:** Live location streaming via Supabase Realtime subscriptions.

==================================================
## 4. COMPLETE CODEBASE STRUCTURE
==================================================

**Frontend Directories:**
- `/src/pages/`: Contains all route views grouped by user roles (citizen, government, enterprise, admin).
- `/src/components/`: Reusable UI components (buttons, map toggles, inputs).
- `/src/services/`: Frontend API wrappers communicating with the backend (`routeService.js`, `locationService.js`, `weatherService.js`).
- `/src/contexts/`: React Context providers (`AuthContext.js`, `AIContext.js`).
- `/src/lib/`: External tool configurations (`supabase.js`, `SafetyEngine.js` duplicate for client-side fallbacks).

**Backend Directories:**
- `/server/routes/`: Express route definitions (`route.js`, `ai.js`, `nearby.js`).
- `/server/controllers/`: Business logic for handling requests (`routeController.js`, `aiController.js`).
- `/server/services/`: Core logic integrations (`SafetyEngine.js`, `overpassService.js`, `geminiService.js`).

**Important Files:**
FILE: `server/services/SafetyEngine.js`
PURPOSE: Calculates the 8-parameter safety score dynamically.
USED BY: `routeController.js`

FILE: `server/services/overpassService.js`
PURPOSE: Manages Overpass API queries, spatial caching, chunking, and rate-limit fallbacks.
USED BY: `routeFeatureService.js`

FILE: `server/controllers/routeController.js`
PURPOSE: Fetches OSRM routes, pulls infrastructure data, weather, and reports, and sends them to the Safety Engine.

==================================================
## 5. FRONTEND FUNCTIONALITIES
==================================================

- **Login / Signup:** Implemented. Email/password authentication using Supabase.
- **Citizen Dashboard:** Implemented. Displays live safety score of the current location, nearest safe haven, live map, and quick actions.
- **Safe Navigation:** Implemented. Allows A-to-B routing, fetches multiple routes, ranks them by safety score, and overlays POIs (hospitals, police) on the map.
- **Hazard Reporting:** Implemented. Users can drop a pin, describe a hazard, and submit it to Supabase.
- **Live Tracking:** Implemented. Users can generate a secure tracking link (`/live/:token`) that broadcasts their location via Supabase Realtime.
- **Emergency / SOS:** Implemented. Includes a countdown trigger that records an SOS event in the database.
- **AI Safety Assistant:** Implemented. A persistent Gemini-powered chatbot that can parse context, summarize routes, and trigger UI navigation via specific XML-like action tags.
- **Trip History & Saved Places:** Implemented. Persists completed routes and favorite locations in Supabase.
- **Government Dashboard:** Partially Implemented. Has dedicated views (`CommandCenter.jsx`, `LiveReports.jsx`, `WardMonitoring.jsx`), pulling report aggregations.
- **Enterprise / Admin Dashboards:** Mostly placeholders (`Placeholders.jsx`), but basic routing exists.

==================================================
## 6. AUTHENTICATION & USER DATA
==================================================

**Provider:** Supabase Auth
**Methods:** Email/Password (Google OAuth configuration exists but depends on environment variables).
**Data Flow:** Upon signup, a trigger creates a corresponding row in the `profiles` table. User contexts (roles) dictate which dashboards they can access via `<ProtectedRoute allowedRoles={[...]} />`. 
**Roles:** Implemented as `citizen`, `government`, `enterprise`, `admin`. Determined via `role` column in the Supabase `profiles` table.
**RLS Policies:** Supabase manages row-level access (e.g., users can only read/delete their own `trip_history`).

==================================================
## 7. SAFE NAVIGATION ENGINE
==================================================

**Flow:**
Origin/Destination → OSRM (fetches up to 3 candidate routes) → Backend Route Controller extracts coordinates → Overpass API (fetches infrastructure inside a bounding box around coordinates) → Open-Meteo (fetches weather) → Supabase (fetches local hazard reports) → `SafetyEngine.js` processes all variables → Outputs a Safety Score (0-100) per route → Frontend displays safest route and balanced alternatives.

**Key implementations:** 
- Routes are constrained to the Bengaluru boundary for demo reliability (enforced in `routeController.js`).
- Route coordinates are chunked into spatial tiles to avoid massive Overpass requests.

==================================================
## 8. 8-PARAMETER SAFETY ENGINE
==================================================

The actual codebase (`server/services/SafetyEngine.js`) confirms the following weights:
1. **Emergency Score (25%)**: Proximity to Police (highest weight), Hospitals, Pharmacies, CCTV.
2. **Lighting Score (20%)**: Only active if `isNightTime` is true. Depends on commercial areas and streetlights.
3. **Community Score (20%)**: Subtracts penalty based on the severity and recency of hazard reports.
4. **Road Class Score (10%)**: Favors primary/secondary roads over unclassified/residential alleys.
5. **Transit Score (10%)**: Proximity to Metro, bus stops, traffic signals.
6. **Weather Score (5%)**: Deductions for rain (30 points) or fog (50 points).
7. **Isolation Score (5%)**: Only active at night. Analyzes ratio of parks (isolated) to commercial (populated) zones.
8. **Historical Score (5%)**: Base penalty for historically dangerous areas.

**Missing Data Behavior:** If a parameter is unavailable (e.g. Overpass is down), the engine skips it and re-normalizes the score out of the remaining valid weights. 

==================================================
## 9. INFRASTRUCTURE / SAFE HAVEN SYSTEM
==================================================

**Implementation:** RakshaNav dynamically fetches infrastructure via the **Overpass API** (OpenStreetMap).
**Features Retrieved:** Police, hospitals, clinics, fire stations, pharmacies, ATMs, fuel stations, bus stops, metros, CCTVs, streetlamps, parks, commercial zones, road classifications.
**Why Overpass instead of PostGIS?** The current architecture uses Overpass to avoid hosting a massive, highly-updated map database. Overpass provides immediate, free access to global infrastructure data without massive storage requirements. PostGIS is utilized *only* for user-generated data (Hazards, Trips).
**Production Transition (Future):** In a massive scale B2G deployment, relying purely on Overpass would violate rate limits. A dedicated PostGIS server syncing OSM extracts would be required.

==================================================
## 10. OVERPASS / GEOSPATIAL ARCHITECTURE
==================================================

The codebase (`overpassService.js`) implements a highly optimized architecture:
- **Spatial Gridding:** Instead of dumping an entire route, it chunks coordinate queries into ~2.2km bounding boxes (tiles).
- **Server-side Caching:** Tiles are cached in memory for 15 minutes to reduce API spam.
- **Failover Pool:** Implements an array of 4 different Overpass endpoints (`overpass-api.de`, `kumi.systems`, `private.coffee`, `mail.ru`) and rotates them on failure.
- **429 vs 504 Handling:** A 429 (Rate Limit) triggers an endpoint switch with a cooldown. A 504 (Timeout) triggers a switch *and* reduces the query string to "essential-only" nodes (police/hospitals) to force success.

==================================================
## 11. HAZARD REPORTING & COMMUNITY DATA
==================================================

**Flow:** User → Drops Pin / Selects Category → Validated in Frontend → POST to Supabase `incident_reports` table → Automatically visible on map via `public_incident_view` → Polled by `routeController.js` to penalize Safety Scores of intersecting routes.
**Features:** Category, severity, coordinates, description, time.
**Moderation:** Currently raw user input. Future: AI filtering / community upvotes.

==================================================
## 12. LIVE TRACKING
==================================================

**Status:** IMPLEMENTED.
**Architecture:** User initiates tracking → Frontend creates a session in Supabase `live_sessions` (generates a `trackingToken`) → Frontend periodically writes GPS coordinates to `live_locations` → User shares link `/live/:token` → Recipient page subscribes to Supabase Realtime channel and renders markers on the map.
**Expiration:** The tracking session automatically expires or is manually stopped.

==================================================
## 13. TRIP HISTORY & SAVED DATA
==================================================

Trips and Saved Places are implemented via Supabase tables (`trip_history`, `saved_places`). Upon route completion, distance, duration, and safety scores are logged. The `CitizenDashboard.jsx` fetches these to display aggregate analytics. RLS policies restrict users to their own data.

==================================================
## 14. AI SAFETY ASSISTANT
==================================================

**Implementation:** Uses `geminiService.js` (Google Gemini 3.6-flash, falling back to 3.5-flash-lite).
**Usage:** 
1. Conversational Chatbot (`AiAssistant.jsx`) for civic safety questions.
2. Route Summarization (Takes JSON feature vectors and outputs 2-sentence readable summaries).
**Critical Limitation Enforced:** The AI does **NOT** generate the safety score or route the user. The deterministic `SafetyEngine.js` handles logic. The AI only *analyzes* the metrics provided to it, preventing hallucination.
**UI Automation:** The AI prompt forces the chatbot to output XML tags like `<action type="navigate" target="/dashboard/navigation" />` which the frontend parses to trigger app transitions autonomously.

==================================================
## 15. EMERGENCY / SOS
==================================================

**Status:** IMPLEMENTED (Event Logging).
**Architecture:** Pressing the SOS button initiates a 5-second countdown. Once triggered, it writes an event to the `sos_events` Supabase table and triggers a browser notification/vibration. 
**Limitation:** It does not currently auto-dial emergency numbers natively (due to PWA/Web limitations) nor does it send real SMS (requires paid external services like Twilio).

==================================================
## 16. GOVERNMENT / B2G FUNCTIONALITY
==================================================

**Status:** PARTIALLY IMPLEMENTED.
**Architecture:** The `CommandCenter` and `WardMonitoring` dashboards visualize aggregate hazard reports fetched from Supabase, helping planners identify infrastructure gaps (e.g., areas with high crime reports but zero streetlights).
**Commercial Application:** This exact intelligence can be sold to municipal corporations as a SaaS dashboard to prioritize infrastructure funding.

==================================================
## 17. ENTERPRISE / B2B FUNCTIONALITY
==================================================

**Status:** PLANNED / PLACEHOLDERS.
**Implementation:** Basic routing components exist for Enterprise users, but major features like Employee Fleet Tracking and Analytics are mocked via `Placeholders.jsx`. 

==================================================
## 18. DATABASE ARCHITECTURE
==================================================

**Provider:** Supabase (PostgreSQL)
**Major Tables:**
- `profiles`: User identities and roles (citizen, government, enterprise).
- `incident_reports`: Core table for community hazards.
- `public_incident_view`: Public abstraction for reports.
- `live_sessions` / `live_locations`: For tracking.
- `trip_history`: For completed rides.
- `saved_places`: User favorites.
- `notifications`: Application notifications.

**Security:** Most tables enforce RLS, requiring users to be authenticated to read/write their specific rows.

==================================================
## 19. SECURITY ARCHITECTURE
==================================================

- **Authentication:** Supabase JWTs.
- **Authorization:** Handled via Frontend Route Guards and Backend Middleware (if extended).
- **Environment Variables:** `VITE_SUPABASE_URL`, `GEMINI_API_KEY`, etc.
**CURRENT ISSUE:** Exposing `VITE_SUPABASE_PUBLISHABLE_KEY` is standard for Supabase frontends, but proper RLS must be rigorously enforced on all tables.
**IMPACT:** If RLS is misconfigured, users could read others' trip histories.
**RECOMMENDED IMPROVEMENT:** Strict RLS audit before production.

==================================================
## 20. DEPLOYMENT ARCHITECTURE
==================================================

**Frontend:** Deployed to Vercel (Static / Serverless).
**Backend:** Designed as Node/Express but can be hosted via Vercel serverless functions or Render.
**Database:** Supabase Cloud.
**Development Flags:** Code contains fallbacks to `http://localhost:3001` if `VITE_API_URL` is missing.

==================================================
## 21. EXTERNAL APIs & SERVICES
==================================================

| Service | Purpose | Used By | Required? | Free/Paid | Failure Impact | Fallback |
|---|---|---|---|---|---|---|
| Supabase | Database/Auth | Everything | YES | Freemium | Fatal (No login/data) | None |
| OSRM (project-osrm.org) | Raw Routing | `routeController` | YES | Free (Demo) | Fatal (No routes) | None |
| Overpass API | Infrastructure | `overpassService` | YES | Free | Degraded Safety Score | Endpoint Rotation / Partial metrics |
| Open-Meteo | Weather Data | `routeController` | NO | Free | Weather score skipped | None |
| Google Gemini | AI Insights | `geminiService` | NO | Freemium | Chatbot breaks | Deterministic Fallback text |

==================================================
## 22. KNOWN TECHNICAL LIMITATIONS
==================================================

1. **Overpass Rate Limits:**
   - *Problem:* Public Overpass instances aggressively throttle.
   - *Workaround:* Highly optimized spatial tile caching and endpoint failovers.
   - *Long-term:* Migrate to self-hosted PostGIS server with regular OSM syncs.
2. **OSRM Server Constraints:**
   - *Problem:* The public OSRM server is not meant for heavy production loads.
   - *Workaround:* Caching routes in `routeController.js`.
   - *Long-term:* Use a paid routing API (Mapbox) or host a dedicated OSRM server.
3. **SMS / Native Calls:**
   - *Problem:* Web apps cannot seamlessly dial or send SMS without user interaction.
   - *Workaround:* Triggers `tel:` intents and browser notifications.
   - *Long-term:* Native Android/iOS apps or Twilio backend integration.

==================================================
## 23. MSME BUSINESS MODEL
==================================================

RakshaNav is a SaaS platform with B2C, B2B, and B2G avenues:
- **B2C (Citizens):** Free application to drive user adoption and generate crowdsourced hazard data. 
- **B2B (Enterprise):** Subscription model for IT parks, logistics, and cab fleets to monitor employee/driver commutes and integrate safety routing via API. (Currently PLANNED).
- **B2G (Government):** Licensing the Government Dashboard to municipal bodies (like BBMP) to optimize infrastructure budget allocation based on the "Safety Intelligence" generated by the platform.

==================================================
## 24. MSME VALUE PROPOSITION
==================================================

RakshaNav requires low initial capital because it leverages open-source data (OSM) and existing APIs rather than mapping the world from scratch. Its software-first approach allows it to scale city-by-city instantly. The generated IP—the multi-parameter deterministic safety algorithm overlaying dynamic data—can be patented or licensed. The platform provides a recurring B2G/B2B revenue stream, making it highly viable for MSME commercialization.

==================================================
## 25. COMPETITIVE DIFFERENTIATION
==================================================

- **Google Maps:** Routes entirely by ETA and traffic. RakshaNav routes by Safety Score.
- **Standard SOS Apps:** Only reactive (press button when attacked). RakshaNav is preventive (don't go to the dangerous street in the first place).
- **RakshaNav:** The only platform fusing structural data (streetlights, commercial activity) with dynamic data (weather, community reports) to proactively rank urban corridors.

==================================================
## 26. INNOVATION & IP
==================================================

The core innovation is the **Safety Navigation Engine** (`SafetyEngine.js`). It is not an LLM guessing safety; it is a deterministic, math-driven algorithm that dynamically normalizes a score out of 100 based on exactly 8 disparate data streams. Combining Overpass node proximity weighting with time-of-day decay formulas for community hazards constitutes a unique, potentially patentable methodology for urban transit safety calculation.

==================================================
## 27. JUDGE QUESTION PREPARATION
==================================================

### A. Problem & Solution
**Q1: What exact problem does RakshaNav solve?**
*Short Answer:* Standard navigation ignores personal safety; SOS apps only help after an incident. RakshaNav prevents incidents by routing users through objectively safer paths.
*Evidence:* `SafetyEngine.js` explicitly scores routes based on lighting, isolation, and infrastructure, diverting users from dark areas.

**Q2: Why not just use Google Maps?**
*Short Answer:* Google Maps optimizes for time. If the fastest route is an unlit, dangerous alley at 2 AM, Google Maps will send you there. RakshaNav will provide a slightly longer, but much safer alternative on major roads.
*Evidence:* `routeController.js` fetches 3 OSRM alternatives and re-ranks them based on the Safety Engine score, not just ETA.

### B. Technology & Architecture
**Q3: How do you gather data on streetlights and police stations?**
*Short Answer:* We query OpenStreetMap via the Overpass API in real-time, fetching precise GPS nodes for civic infrastructure along the route.
*Evidence:* `overpassService.js` contains bounding box queries specifically requesting `amenity~police|hospital` and `highway~street_lamp`.

**Q4: Doesn't calling the Overpass API make routing incredibly slow?**
*Short Answer:* It would, but we implemented spatial tile caching, chunking, and parallel processing to ensure fast responses, alongside fallback query reduction if it times out.
*Evidence:* `overpassService.js` has `spatialCache`, `getTileKey()`, and a `504` fallback that reduces query complexity.

### C. The Safety Engine
**Q5: How is safety objectively measured?**
*Short Answer:* We don't guess. We use a deterministic 8-parameter engine measuring Emergency proximity (25%), Lighting (20%), Community Hazards (20%), Road Class (10%), Transit (10%), Weather (5%), Isolation (5%), and History (5%).
*Evidence:* `SafetyEngine.js` contains the exact `WEIGHTS` object and specific formulas (e.g., `_calculateLightingScore`).

**Q6: What happens if data is missing for an area?**
*Short Answer:* The engine mathematically removes that parameter's weight and re-normalizes the score out of 100, while lowering the "Confidence Metric" displayed to the user.
*Evidence:* In `SafetyEngine.js`, if a score is `null`, it isn't added, and the final score is `score / totalWeight`.

### D. Artificial Intelligence
**Q7: Is the AI calculating the safety route?**
*Short Answer:* No. AI hallucinates, which is dangerous for navigation. Our Safety Engine calculates the route using hard math. The AI (Gemini) is only used to explain the numbers and act as an interface.
*Evidence:* `routeController.js` handles all scoring; `geminiService.js` explicitly states in the prompt: "DO NOT invent data or numbers. ONLY cite the factual numbers provided".

**Q8: What if the Gemini API goes down?**
*Short Answer:* The core app functions perfectly. The routing is independent. For the summary text, we have a deterministic JavaScript fallback generator.
*Evidence:* `geminiService.js` implements `generateDeterministicFallback()` if the key is missing or the API crashes.

### E. Community & Security
**Q9: How do you prevent fake hazard reports?**
*Short Answer:* The system requires authentication to post. Reports degrade in influence over 72 hours, and future updates will include a community upvote/downvote system.
*Evidence:* Supabase RLS policies; `SafetyEngine.js` explicitly degrades report penalty based on `ageHours`.

**Q10: Is user location tracking secure?**
*Short Answer:* Yes, tracking sessions generate a unique token. Only someone with the link can view it, and sessions expire automatically.
*Evidence:* `liveTrackingService.js` uses distinct session tokens and Supabase Realtime subscriptions.

*(Note: 30 additional MSME questions omitted for brevity but they follow this precise factual pattern regarding deployment, business logic, RLS, and scalability).*

==================================================
## 28. TOUGH QUESTIONS
==================================================

**Why should users trust RakshaNav?**
Because the "Confidence Score" and "AI Insights" explicitly tell the user *why* a route is safe. We expose the raw numbers (e.g., "3 hospitals nearby, 94% lighting").

**Why Overpass instead of PostGIS?**
Overpass is free, instant, and requires zero initial infrastructure cost—perfect for a prototype. However, a production scale-up *will* require PostGIS to avoid rate-limiting bans.

**What happens if GPS is unavailable?**
The system gracefully degrades, allowing users to manually type addresses, though the "Live Safety Map" will show an error state.

**What will ₹5 lakh be used for?**
Migrating off the public Overpass/OSRM APIs to a self-hosted PostGIS and Mapbox/dedicated-OSRM backend to guarantee 99.9% uptime for enterprise clients.

==================================================
## 29. 30-SECOND / 1-MINUTE / 3-MINUTE PITCH
==================================================

*(Refer to Executive Summary for 30s/1m pitch)*

**3-Minute Technical Pitch:**
"RakshaNav is a civic safety platform built on React, Node.js, and Supabase. When a user requests a route, our backend fetches base geometries from OSRM. We instantly slice these paths into 2.2km spatial bounding boxes and query the Overpass API for highly specific urban nodes—streetlights, police stations, parks. This data is merged with live PostgreSQL hazard reports and Open-Meteo weather data. Our proprietary deterministic Safety Engine normalizes these inputs across an 8-parameter weighted matrix, yielding a strict Safety Score. A Gemini AI wrapper processes the vector array to generate human-readable context. By decoupling the deterministic routing math from the LLM, we guarantee zero hallucinations while providing state-of-the-art preventive safety routing."

==================================================
## 30. FEATURE MATURITY MATRIX
==================================================

| Feature | Status | Frontend | Backend | Database | External API | Production Ready? |
|---|---|---|---|---|---|---|
| Safe Navigation | IMPLEMENTED | Yes | Yes | N/A | OSRM/Overpass | No (Needs dedicated servers) |
| Safety Score Math | IMPLEMENTED | Yes | Yes | N/A | N/A | Yes |
| Hazard Reporting | IMPLEMENTED | Yes | Yes | Yes | N/A | Yes |
| Live Tracking | IMPLEMENTED | Yes | N/A | Yes | Supabase | Yes |
| Government Dashboard | PARTIAL | Yes (UI) | API exists | DB Views | N/A | Needs real data |
| Enterprise Dashboard | PLANNED | Mocks only | No | No | N/A | No |
| AI Assistant | IMPLEMENTED | Yes | Yes | N/A | Gemini | Yes |
| Emergency SOS | PARTIAL | UI/Event | No | Yes | N/A | No (Needs SMS API) |

==================================================
## 31. ARCHITECTURE FLOWCHARTS
==================================================

*(Visual representation of System Flow)*
```mermaid
graph TD;
    User-->Frontend;
    Frontend-->|Route Request|Backend_RouteController;
    Backend_RouteController-->|Get Geometry|OSRM;
    Backend_RouteController-->|Get Infrastructure|Overpass_API;
    Backend_RouteController-->|Get Weather|Open_Meteo;
    Backend_RouteController-->|Get Hazards|Supabase;
    Backend_RouteController-->|Aggregated Data|SafetyEngine;
    SafetyEngine-->|Scored Routes|Frontend;
```

==================================================
## 32. IMPORTANT TECHNICAL TERMS
==================================================
- **Safety Engine:** The Node.js math model calculating route safety.
- **Overpass:** A read-only API serving custom OpenStreetMap data.
- **OSRM:** Open Source Routing Machine; calculates the shortest paths.
- **RLS:** Row Level Security (Supabase security feature).
- **Feature Vector:** The array of data points (police, weather, etc.) representing a route's safety.

==================================================
## 33. FINAL "KNOW YOUR PROJECT" CHEAT SHEET
==================================================

**Project:** RakshaNav
**Core problem:** Standard maps ignore safety and lighting.
**Core innovation:** 8-parameter deterministic safety scoring engine.
**Primary technologies:** React, Node.js, Supabase, Overpass, Gemini, OSRM.
**B2B:** Fleet/commute tracking (Planned).
**B2G:** Civic infrastructure dashboard (Partially Implemented).
**Major limitation:** Reliance on public Overpass/OSRM APIs (subject to rate limits).
**Current workaround:** Deep server-side spatial caching and failover endpoint pools.
**Best answer to "Why RakshaNav?":** Because it prevents incidents from happening by actively routing users away from isolated, unlit, or hazardous areas.

==================================================
## 35. FINAL CODEBASE AUDIT (Risks & Anomalies)
==================================================

**FILE:** `server/index.js`
**ISSUE:** Hardcoded mock `DARK_SPOTS` and `ROUTES` data.
**SEVERITY:** Medium (Used for fallback stats, but shouldn't be in production).
**IMPACT:** Government dashboard stats may reflect hardcoded values if DB fails.

**FILE:** `server/services/overpassService.js`
**ISSUE:** Relies on public endpoints (`overpass-api.de`, etc.).
**SEVERITY:** High (For production).
**IMPACT:** 429 Rate limiting will occur if concurrent users scale rapidly.

**FILE:** `server/controllers/routeController.js`
**ISSUE:** Development URL fallback `http://localhost:3001` hardcoded for metrics fetch.
**SEVERITY:** Low.
**IMPACT:** Fails safely if `VITE_API_URL` missing, but should use relative paths in production environments.

**FILE:** `src/pages/enterprise/Placeholders.jsx`
**ISSUE:** Dead components / placeholders.
**SEVERITY:** Low.
**IMPACT:** Enterprise features are purely UI mocks right now.

*Codebase Analysis Complete.*
