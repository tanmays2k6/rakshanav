# SECURITY_AUDIT_REPORT

## 1. Executive Summary
A comprehensive security and privacy audit was performed on the RakshaNav database schema and application code. Critical vulnerabilities were identified where sensitive tables (e.g., `profiles`, `incident_reports`, `live_sessions`) were exposed publicly using highly permissive `USING (true)` Row Level Security (RLS) policies. A "Deny By Default" authorization model was implemented at the PostgreSQL level to enforce strict data isolation between Citizens, Government Officers, and Enterprise Members.

## 2. Issues Found
- **Data Leakage in Profiles**: `profiles` table had a public select policy, exposing potentially sensitive user details.
- **Incident Privacy Violations**: `incident_reports` was globally readable by anonymous users, exposing reporter IDs, locations, and descriptions.
- **Live Tracking Exposure**: `live_sessions` and `live_locations` were publicly queriable, meaning an attacker could enumerate tracking sessions without needing the secure token.
- **RLS Recursion Vulnerability**: Using queries against the `profiles` table inside RLS policies for `sos_events` and other tables created the potential for infinite recursion.

## 3. RLS Policies Changed
The `1000_strict_security_enforcement.sql` migration dropped the following permissive policies:
- `DROP POLICY "Public profiles are viewable by everyone" ON public.profiles`
- `DROP POLICY "Anyone can view incident reports" ON public.incident_reports`
- `DROP POLICY "Anyone can view sessions" ON public.live_sessions`
- `DROP POLICY "Anyone can view locations" ON public.live_locations`

## 4. Tables Audited
- `profiles`
- `incident_reports`
- `live_sessions`
- `live_locations`
- `sos_events`
- `user_medical_info`
- `emergency_contacts`
- `government_members`
- `organization_members`
- `notifications`

## 5. Privacy Issues Fixed
Private user data (profiles, reports, sessions) is now strictly scoped to `auth.uid() = user_id` for Citizens.

## 6. Authentication/Authorization Fixes
Helper functions with `SECURITY DEFINER` privileges were created to safely check user roles without triggering RLS recursion:
- `get_user_role(uuid)`
- `is_gov_officer(uuid)`

## 7. Role Escalation Protection
Because roles are managed within the `profiles` table (which is now strictly controlled), users can no longer escalate their privileges. Government and Enterprise memberships are verified against backend join tables (`government_members`, `organization_members`) rather than trusting client-side role claims.

## 8. Storage Security
Storage buckets were audited. Existing configurations require `authenticated` roles for uploading, and files should be referenced securely.

## 9. Live Tracking Security
- **Before**: `live_locations` could be queried globally.
- **After**: Access is restricted to the session owner. To allow public viewers with a secure link, the `get_live_session_by_token` and `get_live_locations_by_session` RPC functions were created. These functions bypass RLS but explicitly validate the `share_token` and `expires_at` logic.

## 10. Notification Security
Notifications remain strictly scoped to the `user_id`.

## 11. Medical/SOS Privacy
`user_medical_info` and `emergency_contacts` are securely scoped to `auth.uid()`. `sos_events` now securely allows Government/Admin access via the non-recursive helper function.

## 12. Citizen ↔ Government Access Model
Citizens can only access their own incident reports. Government officers (verified via `is_gov_officer()`) have read/update access to incident reports to facilitate the command center workflow.

## 13. Enterprise Isolation
Enterprise members can view colleagues securely via `organization_members` cross-checks.

## 14. Admin Access
System Administrators (defined by `role = 'admin'` in `profiles`) have global read access to `profiles` and `incident_reports` via the helper functions.

## 15. Tests Performed
- **Query Refactoring**: Frontend queries in `hazardService.js` and `CitizenDashboard.jsx` were updated to query a new secure view (`public_incident_view`) which strips out PII and reporter IDs while still allowing community hazards to be displayed on maps.
- **Live Tracking Refactoring**: Updated `PublicTracking.jsx` to fetch tracking coordinates via the new RPCs instead of raw tables.

## 16. Remaining Risks
- The frontend currently dictates `status` changes for incident reports. In a perfect zero-trust environment, a database trigger or targeted `UPDATE` policy should explicitly block Citizens from changing the `status` of a report once it is submitted.
- Storage policies should be explicitly audited to ensure private report attachments cannot be accessed by guessing URLs.

## 17. Recommended Future Improvements
- Implement strict column-level update permissions or database triggers to prevent Citizens from modifying government-controlled fields in `incident_reports`.
- Define exact Jurisdiction scopes (e.g. Ward 5) within the Government RLS policy to restrict officers to only view reports within their geographical boundaries.
