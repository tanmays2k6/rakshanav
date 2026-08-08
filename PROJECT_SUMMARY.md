# RakshaNav Project Summary

## 1. PROJECT OVERVIEW
- **Project Name**: RakshaNav
- **One-line Description**: A smart city safety and urban navigation ecosystem.
- **Detailed Purpose**: RakshaNav provides citizens with safety-oriented route planning, hazard reporting, live location sharing and AI assistance, while authorized Government users can review and process citizen hazard reports.
- **Current Implementation Status**: DEMO-READY MVP. RakshaNav is a demo-ready MVP with the core Citizen and Government workflows implemented. Several advanced modules remain incomplete, and some safety intelligence requires further validation before production deployment.

## 2. USER ROLE STATUS
### Citizen
- **Authentication**: Fully Implemented
- **Onboarding**: Fully Implemented
- **Dashboard**: Fully Implemented
- **Core Functionality**: Fully Implemented (Navigation, Reporting, Chat)

### Government
- **Authentication**: Fully Implemented (with organization mapping)
- **Onboarding**: Fully Implemented
- **Dashboard**: Fully Implemented (Command Center)
- **Core Functionality**: Partially Implemented. Ward Monitoring, Infrastructure, and Analytics are Placeholders. Command Center and Live Reports are Fully Implemented.

### Enterprise
- **Authentication**: Fully Implemented
- **Onboarding**: Partially Implemented
- **Dashboard**: Not Implemented (Renders empty Placeholders.jsx)
- **Core Functionality**: Not Implemented

### Admin
- **Authentication**: Fully Implemented
- **Dashboard**: Not Implemented (Renders empty Placeholders.jsx)
- **Core Functionality**: Not Implemented

## 3. APPLICATION ARCHITECTURE & DEPLOYMENT
- **Frontend**: React 18 SPA built with Vite.
- **Backend (Database)**: Supabase (PostgreSQL, GoTrue Auth, Realtime).
- **Backend (API Proxy)**: A custom Node.js/Express server (`/server`).
- **Production Deployment Status**: Production deployment requires a separately hosted Express backend (to proxy Gemini/Overpass requests) alongside the static frontend, and is not fully configured in the repository. The current architecture operates smoothly in local development.

## 4. SECURITY & ROW LEVEL SECURITY (RLS) AUDIT
RLS is enabled on key tables including `profiles`, `incident_reports`, `sos_events`, and `notifications`. The following policies were verified:

### `profiles`
- **SELECT**: Users can view their own profile (`auth.uid() = id`). Public profiles are viewable by everyone (`true`).
- **INSERT**: Users can insert their own profile (`auth.uid() = id`).
- **UPDATE**: Users can update their own profile (`auth.uid() = id`).
- **DELETE**: No explicit policy exists for user deletion.

### `incident_reports`
- **SELECT**: Anyone can view incident reports (`true`).
- **INSERT**: Authenticated users can insert, strictly enforcing `auth.uid() = user_id`. Anonymous inserts are allowed if `is_anonymous = true` and `user_id` is null.
- **UPDATE**: The owner can update (`auth.uid() = user_id`). Crucially, Government members can also update reports IF they are in the `government_members` table with status='approved' and role in ('owner', 'admin', 'officer').
- **DELETE**: The owner can delete (`auth.uid() = user_id`).

### `sos_events`
- **SELECT**: Users view their own (`auth.uid() = user_id`). Government/Enterprise/Admin profiles can view all.
- **INSERT**: Users insert their own (`auth.uid() = user_id`).
- **UPDATE**: Users update their own (`auth.uid() = user_id`).

*Note: The previously observed "null value in column email of relation profiles violates not-null constraint" issue has been resolved; the `profiles` table does not enforce a not-null email column in the current schema (uses `phone`).*

## 5. SAFE NAVIGATION MECHANICS
RakshaNav's routing leverages multiple external APIs. **Safety scoring uses dynamically retrieved data combined with application-defined heuristics.**

A. **Route Generation**: OSRM generates up to 3 candidate routes (`alternatives=3`).
B. **Route Independence**: Each candidate route possesses unique geometry, distance, and duration.
C. **Metric Calculation**: The frontend requests safety metrics for *each route independently* in parallel (`Promise.all`). 
D. **Data Sources**:
   - **Infrastructure**: Overpass API calculates proximity of police, hospitals, and lighting based on OpenStreetMap tags along the specific route polyline.
   - **Weather**: Open-Meteo fetches real live weather at the route's midpoint.
   - **Community Hazards**: Supabase filters active `incident_reports` intersecting the route polyline.
E. **Heuristic Scoring**: The backend `SafetyEngine.js` calculates a 0-100 score using these exact heuristic weights:
   - Emergency (Police/Hospitals): 25%
   - Lighting/Commercial: 20%
   - Community Reports: 20%
   - Road Class (OSM): 10%
   - Transit: 10%
   - Weather: 5%
   - Isolation: 5%
   - Historical: 5%
F. **Gemini AI Role**: **Gemini does not calculate the numerical safety score.** The backend `SafetyEngine` calculates the score, and Gemini receives those specific numerical metrics to generate a natural-language explanation. If Gemini fails, a deterministic fallback sentence is rendered.

## 6. REPORTING FLOW & REALTIME DATA
- **Citizen Submission**: Citizen inserts an `incident_report`.
- **Government View**: Authorized government users view the SAME database record on the Command Center and Live Reports Kanban board. 
- **Status Updates**: When Government updates the status to "resolved", a PostgreSQL trigger fires, inserting a row into `notifications`.
- **Realtime Delivery**: The Citizen UI reflects the update instantly via a **Supabase Realtime subscription** on the `notifications` table.

## 7. GOVERNMENT DASHBOARD
- **Status**: The Government Command Center is **Fully Implemented**.
- **Data Integrity**: Dashboard KPIs (Active Reports, Resolved, Average Response, Average Resolution, Hotspots) are calculated dynamically from actual `incident_reports` database records. No dummy, placeholder, or hardcoded operational metrics remain on this dashboard.
- **Incomplete Views**: Ward Monitoring, Infrastructure, and Analytics are merely UI Placeholders.

## 8. NOTIFICATION SYSTEM
- **Persistence**: Notifications are persisted in the `notifications` and `government_notifications` tables.
- **Broadcasts**: Government users (Admin/Officer roles) can insert into `government_notifications` to broadcast advisories.
- **Realtime**: The frontend `notificationService.js` subscribes to the database for live updates.

## 9. EMERGENCY SOS
- **Internal Action**: Clicking SOS creates a live tracking session, inserts a row into `sos_events`, and triggers a `critical` internal notification containing a tracking link.
- **External Action**: **External emergency dispatch is not implemented.** The application does not communicate with Twilio, WhatsApp, SMS, or Police APIs.

## 10. LIVE TRACKING
- Genuinely realtime via `navigator.geolocation` polling.
- Generates a shareable URL token stored in `live_sessions` / `live_locations`.
- **Limitation**: Requires HTTPS in production environments for the browser to permit Geolocation access.

## 11. AI COPILOT & ROUTING AUDIT
- The AI Copilot parses XML tags (e.g., `<action type="navigate" target="/dashboard/navigation" />`) to trigger frontend React Router changes.
- **Route Reference Audit**: All obsolete `/navigate` references have been successfully purged from the AI prompts and replaced with the correct `/dashboard/navigation` route.

## 12. ENVIRONMENT VARIABLES
- `VITE_SUPABASE_URL` (Required: Frontend & Backend)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (Required: Frontend & Backend)
- `GEMINI_API_KEY` (Required: Backend only)
*(No values exposed).*

## 13. FEATURE MATRIX

| Capability | Citizen | Enterprise | Government | Admin |
|---|---|---|---|---|
| **Authentication** | ✅ Fully Implemented | ✅ Fully Implemented | ✅ Fully Implemented | ✅ Fully Implemented |
| **Onboarding** | ✅ Fully Implemented | ⚠️ Partial | ✅ Fully Implemented | ❌ Not Implemented |
| **Dashboard UI** | ✅ Fully Implemented | ❌ Not Implemented | ✅ Fully Implemented | ❌ Not Implemented |
| **Safe Navigation** | ✅ Fully Implemented | ❌ Not Implemented | ❌ Not Implemented | ❌ Not Implemented |
| **Hazard Reporting** | ✅ Fully Implemented | ❌ Not Implemented | ✅ Fully Implemented | ❌ Not Implemented |
| **Live Tracking** | ✅ Fully Implemented | ❌ Not Implemented | ❌ Not Implemented | ❌ Not Implemented |
| **Emergency SOS** | ⚠️ Partial (Internal) | ❌ Not Implemented | ❌ Not Implemented | ❌ Not Implemented |

## 14. CURRENT KNOWN ISSUES
**P0 / CRITICAL**
- **Production Architecture**: Production deployment requires a separately hosted Express backend to function securely; currently only configured for local dev servers.

**P1 / HIGH**
- **External SOS Missing**: SOS functionality notifies internal app users but lacks crucial SMS/Twilio external dispatch integration.
- **Geolocation Security**: Live tracking will fail in production without HTTPS.

**P2 / MEDIUM**
- **Enterprise / Admin Placeholders**: The Enterprise and Admin dashboards render empty placeholders.
- **Government Placeholders**: Ward Monitoring, Infrastructure, and Analytics routes are empty placeholders.

## Audit Metadata
- **Audit Date**: 2026-08-08
- **Overall Project Status**: Demo-ready MVP
- **Core Production-Ready Areas**: Authentication, Role-based Routing, Database RLS, Live Kanban Reporting, Safe Navigation Infrastructure.
- **Partially Implemented Areas**: Internal SOS Notifications, Government Advisories.
- **Not Implemented Areas**: External SMS Dispatch, Enterprise Dashboard, Admin Dashboard, Advanced Gov Analytics.
- **Simulated/Heuristic Areas**: The numerical safety score applies a heuristic weight formula to real-world infrastructure/weather data.
- **Critical Findings**: The Express backend must be continuously hosted alongside the frontend for Gemini and Overpass safety metrics to function.
- **Recommended Next Steps**: Implement Twilio integration for external SOS dispatch, and build out the Enterprise fleet views.
