-- Add is_anonymous column to track anonymous reports explicitly
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "Users can create incident reports" ON public.incident_reports;

-- Create the strict policy requiring exact user_id match or explicit anonymous report
DROP POLICY IF EXISTS "Authenticated users can insert incident reports" ON public.incident_reports;
CREATE POLICY "Authenticated users can insert incident reports"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR
  (is_anonymous = true AND user_id IS NULL)
);

-- Allow anyone (including backend anon key) to read incident reports for safety routing
DROP POLICY IF EXISTS "Anyone can view incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Anyone can view incident reports" ON public.incident_reports;
CREATE POLICY "Anyone can view incident reports"
ON public.incident_reports
FOR SELECT
USING (true);


