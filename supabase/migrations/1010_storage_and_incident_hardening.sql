-- 1010_storage_and_incident_hardening.sql
-- Zero-Trust Storage & Incident Modification Guardrails

-- ========================================================================================
-- 1. INCIDENT REPORT STATUS / ASSIGNMENT MUTATION GUARDRAIL
-- Prevents standard citizens from tampering with government workflow fields
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.prevent_citizen_status_tampering()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- If status or assigned_to is changed
  IF (OLD.status IS DISTINCT FROM NEW.status) OR 
     (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) OR
     (OLD.priority IS DISTINCT FROM NEW.priority) THEN
     
     caller_role := public.get_user_role(auth.uid());
     
     -- Only Admin, Government, or verified Gov Officers can change status/assignment
     IF caller_role NOT IN ('admin', 'government') AND NOT public.is_gov_officer(auth.uid()) THEN
       RAISE EXCEPTION 'Access Denied: Citizens cannot modify incident triage status, priority, or officer assignment.';
     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_citizen_status_tampering ON public.incident_reports;
CREATE TRIGGER trg_prevent_citizen_status_tampering
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.prevent_citizen_status_tampering();

-- ========================================================================================
-- 2. STORAGE POLICIES AUDIT & USER SCOPING FOR HAZARDS BUCKET
-- Ensures users can only upload into their own folder (auth.uid()/*) and prevents unauthorized overwrites
-- ========================================================================================

-- Ensure bucket exists and is not globally open for arbitrary uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hazards', 'hazards', true)
ON CONFLICT (id) DO NOTHING;

-- Drop insecure permissive storage policies if existing
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow hazard uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload hazard images" ON storage.objects;

-- Allow authenticated users to upload to hazards bucket only
CREATE POLICY "Authenticated users can upload hazard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hazards' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read of hazard images for civic awareness
CREATE POLICY "Public can view hazard images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hazards');

-- Only original uploader can delete their uploaded image
CREATE POLICY "Users can delete own hazard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hazards' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
