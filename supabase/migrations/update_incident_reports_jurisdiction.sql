-- Add jurisdiction_id to incident_reports
ALTER TABLE public.incident_reports 
ADD COLUMN IF NOT EXISTS jurisdiction_id UUID REFERENCES public.police_jurisdictions(id) ON DELETE SET NULL;

-- Create an index for faster filtering by jurisdiction
CREATE INDEX IF NOT EXISTS idx_incident_reports_jurisdiction_id ON public.incident_reports(jurisdiction_id);

-- Create a trigger function to automatically set jurisdiction_id based on lat/lng using PostGIS
CREATE OR REPLACE FUNCTION public.auto_assign_jurisdiction()
RETURNS TRIGGER AS $$
BEGIN
  -- If lat and lng are provided, find the intersecting police jurisdiction
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.jurisdiction_id := (
      SELECT id 
      FROM public.police_jurisdictions 
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326))
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to incident_reports before insert
DROP TRIGGER IF EXISTS trigger_assign_jurisdiction ON public.incident_reports;
CREATE TRIGGER trigger_assign_jurisdiction
BEFORE INSERT ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_jurisdiction();
