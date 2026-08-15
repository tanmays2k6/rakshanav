-- =============================================================================
-- 1009_fix_incident_updates_permissions.sql
-- Grant full privileges and RLS policies on incident_updates + SECURITY DEFINER
-- =============================================================================

-- 1. Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_updates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_updates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO service_role;

-- 2. RLS Policies on incident_updates
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view incident_updates" ON public.incident_updates;
CREATE POLICY "Public can view incident_updates" 
ON public.incident_updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert incident_updates" ON public.incident_updates;
CREATE POLICY "Authenticated can insert incident_updates" 
ON public.incident_updates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert incident_updates" ON public.incident_updates;
CREATE POLICY "Anyone can insert incident_updates" 
ON public.incident_updates FOR INSERT WITH CHECK (true);

-- 3. Rebuild triggers with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_initial_incident_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.incident_updates (incident_id, status, description, updated_by)
  VALUES (NEW.id, 'Submitted', 'Incident report submitted.', NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_initial_incident_update ON public.incident_reports;
CREATE TRIGGER trigger_create_initial_incident_update
AFTER INSERT ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_incident_update();

CREATE OR REPLACE FUNCTION public.update_incident_status_timeline()
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

DROP TRIGGER IF EXISTS trigger_update_incident_status ON public.incident_reports;
CREATE TRIGGER trigger_update_incident_status
AFTER UPDATE OF status ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_incident_status_timeline();
