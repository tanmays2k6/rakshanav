-- =============================================================================
-- 1008_fix_jurisdiction_trigger_columns.sql
-- Fix column names in auto_assign_jurisdiction trigger (use latitude/longitude).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_jurisdiction()
RETURNS TRIGGER AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
BEGIN
  v_lat := NEW.latitude;
  v_lng := NEW.longitude;

  IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
    BEGIN
      NEW.jurisdiction_id := (
        SELECT id 
        FROM public.police_jurisdictions 
        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326))
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
      NEW.jurisdiction_id := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

DROP TRIGGER IF EXISTS trigger_assign_jurisdiction ON public.incident_reports;
CREATE TRIGGER trigger_assign_jurisdiction
BEFORE INSERT ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_jurisdiction();
