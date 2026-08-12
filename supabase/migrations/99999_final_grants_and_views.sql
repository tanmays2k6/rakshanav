-- ==============================================================================
-- COMPREHENSIVE GRANTS & VIEW RESTORATION
-- ==============================================================================

-- 1. Ensure is_anonymous exists (if it was rolled back previously)
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- 2. Ensure public_incident_view exists
DROP VIEW IF EXISTS public.public_incident_view;
CREATE VIEW public.public_incident_view AS
SELECT 
    id,
    category,
    title,
    description,
    latitude,
    longitude,
    latitude AS lat,
    longitude AS lng,
    address,
    city,
    photo_url,
    priority,
    status,
    verification_status,
    severity,
    upvotes,
    downvotes,
    comments_count,
    created_at,
    updated_at,
    is_anonymous,
    -- User privacy masking
    CASE 
        WHEN is_anonymous = true THEN 'Anonymous Citizen'
        ELSE (SELECT full_name FROM public.profiles WHERE profiles.id = incident_reports.user_id)
    END as reporter_name,
    CASE 
        WHEN is_anonymous = true THEN NULL
        ELSE (SELECT avatar_url FROM public.profiles WHERE profiles.id = incident_reports.user_id)
    END as reporter_avatar
FROM public.incident_reports
WHERE status != 'Rejected';

-- 3. Grant table base privileges to AUTHENTICATED
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hazard_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;

-- 4. Grant table base privileges to ANON (read-only usually, but RLS handles actual security)
-- PostgREST requires at least SELECT for anonymous users to query public views/tables
GRANT SELECT ON public.incident_reports TO anon;
GRANT SELECT ON public.trip_history TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.public_incident_view TO anon, authenticated;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
