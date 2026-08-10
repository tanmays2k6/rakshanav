-- =============================================================================
-- 1006_fix_trigger_permissions.sql
-- ROOT CAUSE FIX for "permission denied" on incident_reports INSERT.
--
-- DIAGNOSIS:
-- Two separate permission failures were blocking ALL report submissions:
--
-- ROOT CAUSE 1 (Primary): The AFTER INSERT trigger on incident_reports
-- calls create_initial_incident_update(), which does an INSERT into
-- incident_updates. This trigger has no SECURITY DEFINER, so it executes
-- as the calling authenticated user. Since incident_updates has RLS enabled
-- with ZERO INSERT policies for the authenticated role, PostgreSQL's
-- deny-by-default blocks the trigger INSERT. The entire transaction rolls
-- back with "permission denied" before the incident_reports row is committed.
--
-- ROOT CAUSE 2 (Secondary): incident_reports itself was never explicitly
-- GRANTed INSERT to the authenticated role. hazard_reports has this GRANT
-- but incident_reports does not. RLS policies alone are not sufficient —
-- the role must also have the table privilege.
--
-- FIX:
-- 1. Rebuild create_initial_incident_update() as SECURITY DEFINER so the
--    trigger runs with the table owner's privileges, bypassing RLS on
--    incident_updates safely.
-- 2. Rebuild update_incident_status_timeline() as SECURITY DEFINER for
--    the same reason (it also inserts into incident_updates on UPDATE).
-- 3. GRANT INSERT, SELECT, UPDATE on incident_reports to authenticated.
-- 4. GRANT INSERT on incident_updates to authenticated (belt-and-suspenders,
--    ensures future direct inserts from backend also work).
-- =============================================================================

-- =============================================================================
-- 1. GRANT table privileges to authenticated role
--    RLS policies are checked AFTER table-level grants.
--    Without GRANT, RLS is never even reached.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON public.incident_reports TO authenticated;
GRANT SELECT, INSERT          ON public.incident_updates  TO authenticated;
GRANT SELECT, INSERT          ON public.incident_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE  ON public.incident_votes    TO authenticated;

-- Also grant to anon for SELECT (community map reads)
GRANT SELECT ON public.incident_reports TO anon;
GRANT SELECT ON public.incident_updates TO anon;

-- =============================================================================
-- 2. Rebuild create_initial_incident_update as SECURITY DEFINER
--
--    This trigger fires AFTER INSERT on incident_reports. It inserts the
--    initial "Submitted" timeline entry into incident_updates.
--    SECURITY DEFINER causes it to run as the function's owning role
--    (postgres/service), bypassing RLS on incident_updates entirely, which
--    is correct — this is an automated internal action, not a user action.
--    SET search_path = public prevents search_path injection attacks.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_initial_incident_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.incident_updates (incident_id, status, description, updated_by)
  VALUES (NEW.id, 'Submitted', 'Incident report submitted.', NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- =============================================================================
-- 3. Rebuild update_incident_status_timeline as SECURITY DEFINER
--
--    This trigger fires AFTER UPDATE OF status on incident_reports. It also
--    inserts into incident_updates. Same fix applies.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_incident_status_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.incident_updates (incident_id, status, description, updated_by)
    VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- =============================================================================
-- 4. Rebuild update_incident_vote_counts as SECURITY DEFINER
--
--    This trigger fires on incident_votes changes and UPDATEs incident_reports
--    (upvotes/downvotes counters). An authenticated user inserting a vote
--    should not need UPDATE permission on incident_reports directly.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_incident_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'confirm' THEN
      UPDATE public.incident_reports SET upvotes = upvotes + 1 WHERE id = NEW.incident_id;
    ELSIF NEW.vote_type = 'reject' THEN
      UPDATE public.incident_reports SET downvotes = downvotes + 1 WHERE id = NEW.incident_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'confirm' THEN
      UPDATE public.incident_reports SET upvotes = upvotes - 1 WHERE id = OLD.incident_id;
    ELSIF OLD.vote_type = 'reject' THEN
      UPDATE public.incident_reports SET downvotes = downvotes - 1 WHERE id = OLD.incident_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'confirm' AND NEW.vote_type = 'reject' THEN
      UPDATE public.incident_reports SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.incident_id;
    ELSIF OLD.vote_type = 'reject' AND NEW.vote_type = 'confirm' THEN
      UPDATE public.incident_reports SET downvotes = downvotes - 1, upvotes = upvotes + 1 WHERE id = NEW.incident_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- =============================================================================
-- 5. Rebuild update_incident_comment_count as SECURITY DEFINER
--
--    This trigger fires on incident_comments and UPDATEs incident_reports
--    (comments_count). Same pattern.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_incident_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.incident_reports SET comments_count = comments_count + 1 WHERE id = NEW.incident_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.incident_reports SET comments_count = comments_count - 1 WHERE id = OLD.incident_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- =============================================================================
-- 6. Ensure the canonical INSERT policy exists on incident_reports
--    (idempotent — safe to run even if 1005 was already applied)
-- =============================================================================

DROP POLICY IF EXISTS "Users can create incident reports"              ON public.incident_reports;
DROP POLICY IF EXISTS "Authenticated users can insert incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Citizens can insert own incident reports"        ON public.incident_reports;

-- Final canonical policy: authenticated user's UUID must match user_id.
-- Anonymous reports keep user_id = auth.uid() and set is_anonymous = true.
CREATE POLICY "Citizens can insert own incident reports"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 7. Ensure SELECT policy exists (idempotent)
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Public can read incident reports" ON public.incident_reports;

CREATE POLICY "Anyone can view incident reports"
ON public.incident_reports
FOR SELECT
USING (true);

-- =============================================================================
-- 8. Ensure incident_updates INSERT policy exists for direct inserts
--    (backend / government status updates that go through the client)
-- =============================================================================

DROP POLICY IF EXISTS "Public can read incident updates"                ON public.incident_updates;
DROP POLICY IF EXISTS "Authenticated users can insert incident updates" ON public.incident_updates;

CREATE POLICY "Public can read incident updates"
ON public.incident_updates
FOR SELECT
USING (true);

-- Government officers and report owners can add timeline entries directly
CREATE POLICY "Authenticated users can insert incident updates"
ON public.incident_updates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
