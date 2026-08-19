-- =============================================================================
-- 1011_security_linter_resolutions.sql
-- Fixes Supabase Security Advisor warnings:
-- 1. Sets security_invoker = true on public.public_incident_view (instead of default SECURITY DEFINER behavior).
-- 2. Revokes modifying permissions on public.spatial_ref_sys if created by PostGIS extension.
-- =============================================================================

-- 1. Ensure public_incident_view is defined with security_invoker = true
DROP VIEW IF EXISTS public.public_incident_view;

CREATE VIEW public.public_incident_view
WITH (security_invoker = true) AS
SELECT 
    id,
    category,
    title,
    priority,
    status,
    severity,
    verification_status,
    created_at,
    updated_at,
    latitude  AS lat,
    longitude AS lng,
    latitude,
    longitude,
    city,
    address,
    description,
    photo_url,
    upvotes,
    downvotes,
    comments_count,
    is_anonymous,
    assigned_department,
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
WHERE status NOT IN ('Rejected');

-- Ensure permissions on the view
GRANT SELECT ON public.public_incident_view TO anon, authenticated;

-- 2. Handle spatial_ref_sys table (PostGIS)
-- Note: spatial_ref_sys is owned by supabase_admin / postgres extension owner.
-- Standard migration role can revoke DML grants or handle RLS via DO block if permitted,
-- but we safely attempt and catch ownership limitations.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'spatial_ref_sys'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
            EXECUTE 'DROP POLICY IF EXISTS "Allow read access to spatial_ref_sys" ON public.spatial_ref_sys';
            EXECUTE 'CREATE POLICY "Allow read access to spatial_ref_sys" ON public.spatial_ref_sys FOR SELECT USING (true)';
        EXCEPTION WHEN insufficient_privilege THEN
            -- In Supabase managed cloud, spatial_ref_sys is owned by supabase_admin (extension).
            RAISE NOTICE 'spatial_ref_sys is owned by extension superuser; skipping ALTER TABLE.';
        END;

        BEGIN
            EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.spatial_ref_sys FROM anon, authenticated, public';
            EXECUTE 'GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- 3. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
