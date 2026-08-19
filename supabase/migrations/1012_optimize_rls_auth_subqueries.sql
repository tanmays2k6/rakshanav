-- =============================================================================
-- 1012_optimize_rls_auth_subqueries.sql
-- Optimizes RLS performance & satisfies Supabase linter:
-- Wraps auth.<function>() calls in (SELECT auth.<function>()) across all active RLS policies.
-- This ensures Postgres evaluates auth.<function>() once per query rather than once per row.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Gov and Admin can view all profiles" ON public.profiles;
CREATE POLICY "Gov and Admin can view all profiles" ON public.profiles
FOR SELECT USING (
    public.get_user_role((SELECT auth.uid())) IN ('admin', 'government')
);

-- -----------------------------------------------------------------------------
-- 2. INCIDENT REPORTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Citizens can insert own incident reports" ON public.incident_reports;
CREATE POLICY "Citizens can insert own incident reports" ON public.incident_reports
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own incident reports" ON public.incident_reports;
CREATE POLICY "Users can view own incident reports" ON public.incident_reports
FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Gov and Admin can view all incident reports" ON public.incident_reports;
CREATE POLICY "Gov and Admin can view all incident reports" ON public.incident_reports
FOR SELECT USING (
    public.get_user_role((SELECT auth.uid())) IN ('admin', 'government') 
    OR public.is_gov_officer((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Users can update own incident reports" ON public.incident_reports;
CREATE POLICY "Users can update own incident reports" ON public.incident_reports
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own incident reports" ON public.incident_reports;
CREATE POLICY "Users can delete own incident reports" ON public.incident_reports
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Approved Gov members can update incident_reports" ON public.incident_reports;
CREATE POLICY "Approved Gov members can update incident_reports" ON public.incident_reports
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.government_members
        WHERE user_id = (SELECT auth.uid())
        AND status = 'approved'
    )
);

-- -----------------------------------------------------------------------------
-- 3. INCIDENT UPDATES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert incident updates" ON public.incident_updates;
CREATE POLICY "Authenticated users can insert incident updates" ON public.incident_updates
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 4. HAZARD REPORTS (Legacy / Bridge table if present)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hazard_reports') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own hazard reports" ON public.hazard_reports';
        EXECUTE 'CREATE POLICY "Users can view own hazard reports" ON public.hazard_reports FOR SELECT USING ((SELECT auth.uid()) = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "Users can insert own hazard reports" ON public.hazard_reports';
        EXECUTE 'CREATE POLICY "Users can insert own hazard reports" ON public.hazard_reports FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "Users can update own hazard reports" ON public.hazard_reports';
        EXECUTE 'CREATE POLICY "Users can update own hazard reports" ON public.hazard_reports FOR UPDATE USING ((SELECT auth.uid()) = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "Users can delete own hazard reports" ON public.hazard_reports';
        EXECUTE 'CREATE POLICY "Users can delete own hazard reports" ON public.hazard_reports FOR DELETE USING ((SELECT auth.uid()) = user_id)';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. TRIP HISTORY
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own trips" ON public.trip_history;
CREATE POLICY "Users can view own trips" ON public.trip_history
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own trips" ON public.trip_history;
CREATE POLICY "Users can insert own trips" ON public.trip_history
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON public.trip_history;
CREATE POLICY "Users can update own trips" ON public.trip_history
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON public.trip_history;
CREATE POLICY "Users can delete own trips" ON public.trip_history
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 6. EMERGENCY CONTACTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can view own contacts" ON public.emergency_contacts
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert own contacts" ON public.emergency_contacts
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update own contacts" ON public.emergency_contacts
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete own contacts" ON public.emergency_contacts
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 7. MEDICAL PROFILE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_profile') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own medical profile" ON public.medical_profile';
        EXECUTE 'CREATE POLICY "Users can view own medical profile" ON public.medical_profile FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "Users can insert own medical profile" ON public.medical_profile';
        EXECUTE 'CREATE POLICY "Users can insert own medical profile" ON public.medical_profile FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "Users can update own medical profile" ON public.medical_profile';
        EXECUTE 'CREATE POLICY "Users can update own medical profile" ON public.medical_profile FOR UPDATE USING ((SELECT auth.uid()) = user_id)';

        EXECUTE 'DROP POLICY IF EXISTS "Users can delete own medical profile" ON public.medical_profile';
        EXECUTE 'CREATE POLICY "Users can delete own medical profile" ON public.medical_profile FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id)';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. SOS EVENTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own SOS events" ON public.sos_events;
CREATE POLICY "Users can view own SOS events" ON public.sos_events
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own SOS events" ON public.sos_events;
CREATE POLICY "Users can insert own SOS events" ON public.sos_events
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own SOS events" ON public.sos_events;
CREATE POLICY "Users can update own SOS events" ON public.sos_events
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Authorities can view all SOS events" ON public.sos_events;
CREATE POLICY "Authorities can view all SOS events" ON public.sos_events
FOR SELECT TO authenticated
USING (
    public.get_user_role((SELECT auth.uid())) IN ('admin', 'government', 'enterprise') 
    OR public.is_gov_officer((SELECT auth.uid()))
);

-- -----------------------------------------------------------------------------
-- 9. LIVE SESSIONS & LOCATIONS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own sessions" ON public.live_sessions;
CREATE POLICY "Users can view own sessions" ON public.live_sessions
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own live sessions" ON public.live_sessions;
CREATE POLICY "Users can manage own live sessions" ON public.live_sessions
FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own locations" ON public.live_locations;
CREATE POLICY "Users can view own locations" ON public.live_locations
FOR SELECT TO authenticated
USING (
    session_id IN (SELECT id FROM public.live_sessions WHERE user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert own locations" ON public.live_locations;
CREATE POLICY "Users can insert own locations" ON public.live_locations
FOR INSERT TO authenticated
WITH CHECK (
    session_id IN (SELECT id FROM public.live_sessions WHERE user_id = (SELECT auth.uid()))
);

-- -----------------------------------------------------------------------------
-- 10. SAVED PLACES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own saved places" ON public.saved_places;
CREATE POLICY "Users can manage own saved places" ON public.saved_places
FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 11. NOTIFICATIONS & READS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read intended notifications" ON public.notifications;
CREATE POLICY "Users can read intended notifications" ON public.notifications
FOR SELECT TO authenticated
USING (
    recipient_type = 'all' OR
    (recipient_type = 'user' AND recipient_id = (SELECT auth.uid())::text) OR
    (recipient_type = 'role' AND recipient_id = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())))
);

DROP POLICY IF EXISTS "Privileged roles can create notifications" ON public.notifications;
CREATE POLICY "Privileged roles can create notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'government', 'enterprise'))
);

DROP POLICY IF EXISTS "Sender or admin can update" ON public.notifications;
CREATE POLICY "Sender or admin can update" ON public.notifications
FOR UPDATE TO authenticated
USING (
    sender_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
)
WITH CHECK (
    sender_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
);

DROP POLICY IF EXISTS "Sender or admin can delete" ON public.notifications;
CREATE POLICY "Sender or admin can delete" ON public.notifications
FOR DELETE TO authenticated
USING (
    sender_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
);

DROP POLICY IF EXISTS "Users can manage own reads" ON public.notification_reads;
CREATE POLICY "Users can manage own reads" ON public.notification_reads
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 12. GOVERNMENT & ENTERPRISE TABLES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'government_members') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Gov members can view own membership" ON public.government_members';
        EXECUTE 'CREATE POLICY "Gov members can view own membership" ON public.government_members FOR SELECT USING (user_id = (SELECT auth.uid()))';

        EXECUTE 'DROP POLICY IF EXISTS "Gov admins can view all members" ON public.government_members';
        EXECUTE 'CREATE POLICY "Gov admins can view all members" ON public.government_members FOR SELECT USING (public.get_user_role((SELECT auth.uid())) IN (''admin'', ''government''))';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enterprise_members') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Enterprise members can view own membership" ON public.enterprise_members';
        EXECUTE 'CREATE POLICY "Enterprise members can view own membership" ON public.enterprise_members FOR SELECT USING (user_id = (SELECT auth.uid()))';

        EXECUTE 'DROP POLICY IF EXISTS "Enterprise admins can view members" ON public.enterprise_members';
        EXECUTE 'CREATE POLICY "Enterprise admins can view members" ON public.enterprise_members FOR SELECT USING (public.get_user_role((SELECT auth.uid())) IN (''admin'', ''enterprise''))';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Gov Admins can view audit logs" ON public.audit_logs';
        EXECUTE 'CREATE POLICY "Gov Admins can view audit logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.government_members WHERE user_id = (SELECT auth.uid()) AND status = ''approved'' AND role IN (''admin'', ''supervisor'')))';

        EXECUTE 'DROP POLICY IF EXISTS "Gov Admins can insert audit logs" ON public.audit_logs';
        EXECUTE 'CREATE POLICY "Gov Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.government_members WHERE user_id = (SELECT auth.uid()) AND status = ''approved''))';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 13. STORAGE BUCKET (hazards)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload hazard images" ON storage.objects;
CREATE POLICY "Authenticated users can upload hazard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'hazards'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own hazard images" ON storage.objects;
CREATE POLICY "Users can update own hazard images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'hazards'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own hazard images" ON storage.objects;
CREATE POLICY "Users can delete own hazard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'hazards'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- -----------------------------------------------------------------------------
-- 14. RELOAD SCHEMA CACHE
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
