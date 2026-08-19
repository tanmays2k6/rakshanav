-- =============================================================================
-- 1013_fix_postgis_spatial_ref_sys.sql
-- Moves PostGIS extension & spatial_ref_sys out of the public schema into extensions schema.
-- This stops PostgREST from exposing spatial_ref_sys and resolves the Supabase linter warning:
-- "Table public.spatial_ref_sys is public, but RLS has not been enabled."
-- =============================================================================

-- 1. Ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- 2. Move postgis extension out of the public schema if currently in public
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_extension 
        WHERE extname = 'postgis' 
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        BEGIN
            ALTER EXTENSION postgis SET SCHEMA extensions;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not relocate postgis extension automatically: %', SQLERRM;
        END;
    END IF;
END $$;

-- 3. If spatial_ref_sys table is still in public, move it to extensions schema or revoke PostgREST exposure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'spatial_ref_sys'
    ) THEN
        BEGIN
            ALTER TABLE public.spatial_ref_sys SET SCHEMA extensions;
        EXCEPTION WHEN OTHERS THEN
            -- In case altering table schema is restricted on managed extension tables,
            -- ensure public permissions are stripped so PostgREST ignores it
            REVOKE ALL ON public.spatial_ref_sys FROM anon, authenticated, public;
        END;
    END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
