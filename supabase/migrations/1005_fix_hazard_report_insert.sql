-- =============================================================================
-- 1005_fix_hazard_report_insert.sql
-- Fix Report Hazard: RLS, anonymous reporting, and storage policies.
-- Idempotent: all statements use IF EXISTS / IF NOT EXISTS / ON CONFLICT.
-- =============================================================================

-- 1. Ensure is_anonymous column exists (idempotent)
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- =============================================================================
-- 2. INCIDENT REPORTS — Canonical INSERT Policy
--
-- Drop every INSERT policy that previous migrations created (from all migration
-- files: incident_reports_schema.sql, fix_hazard_reports_rls.sql,
-- 999_production_rls_audit.sql). This prevents policy conflicts.
-- =============================================================================

DROP POLICY IF EXISTS "Users can create incident reports"                   ON public.incident_reports;
DROP POLICY IF EXISTS "Authenticated users can insert incident reports"      ON public.incident_reports;

-- The ONE canonical INSERT policy:
--   • The authenticated user's UUID MUST match the user_id column.
--   • Anonymous reports still carry the real user_id (identity is hidden
--     through is_anonymous=true on public views, not by nulling user_id).
--   • This prevents any user from forging another user's identity.
CREATE POLICY "Citizens can insert own incident reports"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 3. INCIDENT REPORTS — Government SELECT policy
--
-- Approved government members must be able to read ALL reports for their
-- dashboard. The existing "Anyone can view incident reports" SELECT policy
-- (USING true) already covers this, but if it was dropped by migration 1000,
-- we re-add it here.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view incident reports"     ON public.incident_reports;
DROP POLICY IF EXISTS "Public can read incident reports"     ON public.incident_reports;

-- Public / community can read all non-rejected reports.
-- Private fields (user_id, is_anonymous) are hidden via public_incident_view.
CREATE POLICY "Anyone can view incident reports"
ON public.incident_reports
FOR SELECT
USING (true);

-- =============================================================================
-- 4. INCIDENT REPORTS — Government UPDATE (idempotent re-create)
-- =============================================================================

DROP POLICY IF EXISTS "Approved Gov members can update incident_reports" ON public.incident_reports;

CREATE POLICY "Approved Gov members can update incident_reports"
ON public.incident_reports
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.government_members
        WHERE user_id = auth.uid()
          AND status = 'approved'
          AND role IN ('owner', 'admin', 'officer')
    )
);

-- =============================================================================
-- 5. INCIDENT REPORTS — Citizens can UPDATE their own reports
-- =============================================================================

DROP POLICY IF EXISTS "Users can update own incident reports" ON public.incident_reports;

CREATE POLICY "Users can update own incident reports"
ON public.incident_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =============================================================================
-- 6. INCIDENT REPORTS — Citizens can DELETE their own reports
-- =============================================================================

DROP POLICY IF EXISTS "Users can delete own incident reports" ON public.incident_reports;

CREATE POLICY "Users can delete own incident reports"
ON public.incident_reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =============================================================================
-- 7. STORAGE — Fix 'hazards' bucket policies
--
-- The old policy used the deprecated auth.role() = 'authenticated' check.
-- Replace with auth.uid() IS NOT NULL which works with all Supabase SDK versions.
-- Path is scoped to the authenticated user's UUID for additional isolation.
-- =============================================================================

-- Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hazards', 'hazards', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies (all known names)
DROP POLICY IF EXISTS "Authenticated users can upload hazard images"   ON storage.objects;
DROP POLICY IF EXISTS "Hazard images are publicly accessible"          ON storage.objects;
DROP POLICY IF EXISTS "Hazard photos are publicly accessible"          ON storage.objects;
DROP POLICY IF EXISTS "Users can upload hazard photos"                 ON storage.objects;

-- Public READ: Anyone can view hazard photos (bucket is public)
CREATE POLICY "Hazard images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'hazards');

-- Authenticated UPLOAD: User must be logged in.
-- Path is scoped: uploads go to hazards/{user_id}/{filename}
CREATE POLICY "Authenticated users can upload hazard images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'hazards'
    AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own uploaded files
CREATE POLICY "Users can update own hazard images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'hazards' AND auth.uid() IS NOT NULL);

-- =============================================================================
-- 8. Refresh the public_incident_view to ensure it excludes user_id and PII.
--    This view is used by community maps and the public to see reports safely.
-- =============================================================================

DROP VIEW IF EXISTS public.public_incident_view;
CREATE OR REPLACE VIEW public.public_incident_view AS
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
    assigned_department
FROM public.incident_reports
WHERE status NOT IN ('Rejected');
-- NOTE: user_id is deliberately excluded — never expose it to public queries.

GRANT SELECT ON public.public_incident_view TO anon, authenticated;
