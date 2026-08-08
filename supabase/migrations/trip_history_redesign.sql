-- 1. Drop existing if needed (be careful with prod data, but for redesign this ensures clean slate)
DROP TABLE IF EXISTS public.trip_history CASCADE;

-- 2. Create the redesigned table
CREATE TABLE public.trip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  origin_name TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  
  destination_name TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  
  distance_km DOUBLE PRECISION NOT NULL,
  duration_minutes INTEGER NOT NULL,
  route_type TEXT NOT NULL CHECK (route_type IN ('safest', 'fastest', 'balanced')),
  safety_score INTEGER NOT NULL,
  
  route_geometry JSONB NOT NULL, -- Storing as GeoJSON coordinates array or similar JSON structure
  
  lighting_score TEXT,
  hospital_count INTEGER DEFAULT 0,
  police_count INTEGER DEFAULT 0,
  commercial_count INTEGER DEFAULT 0,
  
  weather TEXT,
  
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
CREATE POLICY "Users can view own trips" ON public.trip_history 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON public.trip_history 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON public.trip_history 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON public.trip_history 
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_history;
