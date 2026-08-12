-- Hazard Reports Schema Redesign

-- 1. Hazard Reports Table
CREATE TABLE IF NOT EXISTS public.hazard_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    description TEXT,
    photo_url TEXT,
    ai_category TEXT,
    ai_confidence INTEGER,
    impact_score TEXT,
    status TEXT DEFAULT 'Pending Verification',
    anonymous BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view reports (for public heatmap/clustering)
DROP POLICY IF EXISTS "Anyone can view hazard reports" ON public.hazard_reports;
CREATE POLICY "Anyone can view hazard reports" ON public.hazard_reports FOR SELECT USING (true);

-- Allow authenticated users to insert reports
DROP POLICY IF EXISTS "Users can insert hazard reports" ON public.hazard_reports;
CREATE POLICY "Users can insert hazard reports" ON public.hazard_reports FOR INSERT WITH CHECK (
    auth.uid() = user_id OR anonymous = true
);

-- Allow users to update their own reports (or allow upvotes via RPC in future, for now simple updates)
DROP POLICY IF EXISTS "Users can update own reports" ON public.hazard_reports;
CREATE POLICY "Users can update own reports" ON public.hazard_reports FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT ON public.hazard_reports TO anon, authenticated;
GRANT INSERT, UPDATE ON public.hazard_reports TO authenticated;

-- 2. Enable Realtime for Hazard Reports
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.hazard_reports;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Storage Bucket for Hazard Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hazards', 'hazards', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Hazard images are publicly accessible" ON storage.objects;
CREATE POLICY "Hazard images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'hazards');

DROP POLICY IF EXISTS "Authenticated users can upload hazard images" ON storage.objects;

CREATE POLICY "Authenticated users can upload hazard images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'hazards' AND auth.role() = 'authenticated');


