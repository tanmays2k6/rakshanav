-- 1. Drop existing if needed
DROP TABLE IF EXISTS public.saved_places CASCADE;

-- 2. Create the table
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Home', 'Office', 'School', 'College', 'Hospital', 'Gym', 'Metro', 'Bus Stop', 'Favourite', 'Custom')),
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  
  notes TEXT,
  icon TEXT,
  color TEXT,
  favorite BOOLEAN DEFAULT false,
  
  visit_count INTEGER DEFAULT 0,
  last_visited TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_saved_places_modtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_places_modtime
BEFORE UPDATE ON public.saved_places
FOR EACH ROW
EXECUTE FUNCTION update_saved_places_modtime();

-- 4. Enable RLS
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies
DROP POLICY IF EXISTS "Users can view own saved places" ON public.saved_places;
CREATE POLICY "Users can view own saved places" ON public.saved_places 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved places" ON public.saved_places;

CREATE POLICY "Users can insert own saved places" ON public.saved_places 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved places" ON public.saved_places;

CREATE POLICY "Users can update own saved places" ON public.saved_places 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved places" ON public.saved_places;

CREATE POLICY "Users can delete own saved places" ON public.saved_places 
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_places;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


