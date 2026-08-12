-- PRODUCTION RLS AUDIT & SECURITY HARDENING
-- Ensure all tables have proper policies to prevent data leakage and unauthorized modifications

-- 1. PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Allow public viewing for community features but exclude sensitive fields via application logic, or just limit to id/name/avatar
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. INCIDENT REPORTS TABLE
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Authenticated users can insert incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Users can update own incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Users can delete own incident reports" ON public.incident_reports;

DROP POLICY IF EXISTS "Anyone can view incident reports" ON public.incident_reports;

CREATE POLICY "Anyone can view incident reports" ON public.incident_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert incident reports" ON public.incident_reports;
CREATE POLICY "Authenticated users can insert incident reports" ON public.incident_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) OR (is_anonymous = true AND user_id IS NULL));
DROP POLICY IF EXISTS "Users can update own incident reports" ON public.incident_reports;
CREATE POLICY "Users can update own incident reports" ON public.incident_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own incident reports" ON public.incident_reports;
CREATE POLICY "Users can delete own incident reports" ON public.incident_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. TRIPS TABLE
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trip_history;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trip_history;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trip_history;

DROP POLICY IF EXISTS "Users can view own trips" ON public.trip_history;

CREATE POLICY "Users can view own trips" ON public.trip_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trip_history;
CREATE POLICY "Users can insert own trips" ON public.trip_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trip_history;
CREATE POLICY "Users can delete own trips" ON public.trip_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. EMERGENCY CONTACTS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.emergency_contacts;

DROP POLICY IF EXISTS "Users can view own contacts" ON public.emergency_contacts;

CREATE POLICY "Users can view own contacts" ON public.emergency_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert own contacts" ON public.emergency_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update own contacts" ON public.emergency_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete own contacts" ON public.emergency_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. SOS EVENTS
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own SOS events" ON public.sos_events;
DROP POLICY IF EXISTS "Users can insert own SOS events" ON public.sos_events;
DROP POLICY IF EXISTS "Users can update own SOS events" ON public.sos_events;
DROP POLICY IF EXISTS "Authorities can view all SOS events" ON public.sos_events;

DROP POLICY IF EXISTS "Users can view own SOS events" ON public.sos_events;

CREATE POLICY "Users can view own SOS events" ON public.sos_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own SOS events" ON public.sos_events;
CREATE POLICY "Users can insert own SOS events" ON public.sos_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own SOS events" ON public.sos_events;
CREATE POLICY "Users can update own SOS events" ON public.sos_events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authorities can view all SOS events" ON public.sos_events;
CREATE POLICY "Authorities can view all SOS events" ON public.sos_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('government', 'enterprise', 'admin'))
);

-- 6. LIVE SESSIONS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Anyone can view live sessions by token" ON public.live_sessions;

DROP POLICY IF EXISTS "Users can manage own live sessions" ON public.live_sessions;

CREATE POLICY "Users can manage own live sessions" ON public.live_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anyone can view live sessions by token" ON public.live_sessions;
CREATE POLICY "Anyone can view live sessions by token" ON public.live_sessions FOR SELECT USING (true); -- Filtered by token in application logic

-- 7. SAVED PLACES
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own saved places" ON public.saved_places;

DROP POLICY IF EXISTS "Users can manage own saved places" ON public.saved_places;

CREATE POLICY "Users can manage own saved places" ON public.saved_places FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- These policies are commented out because the notifications table was redesigned
-- to use sender_id and recipient_id, and sophisticated RLS is handled in notifications_system.sql
-- CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
