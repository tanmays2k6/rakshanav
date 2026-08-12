-- RakshaNav Supabase Full Schema Additions (OSM Stack)

-- 1. Saved Places
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type TEXT DEFAULT 'custom' CHECK (type IN ('home', 'work', 'gym', 'custom')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own saved places" ON public.saved_places;
CREATE POLICY "Users can view own saved places" ON public.saved_places FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own saved places" ON public.saved_places;
CREATE POLICY "Users can insert own saved places" ON public.saved_places FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own saved places" ON public.saved_places;
CREATE POLICY "Users can update own saved places" ON public.saved_places FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own saved places" ON public.saved_places;
CREATE POLICY "Users can delete own saved places" ON public.saved_places FOR DELETE USING (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;

-- 2. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'alert', 'error')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- 3. Community Reports
CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('broken_streetlight', 'road_damage', 'flooding', 'harassment', 'obstruction', 'accident', 'construction', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'resolved', 'dismissed')),
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
-- Anyone can view community reports (they are public hazard markers)
DROP POLICY IF EXISTS "Anyone can view community reports" ON public.community_reports;
CREATE POLICY "Anyone can view community reports" ON public.community_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert community reports" ON public.community_reports;
CREATE POLICY "Users can insert community reports" ON public.community_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Only the owner can update (unless it's a voting system, then we need a secure RPC, but for now we keep it simple)
DROP POLICY IF EXISTS "Users can update own reports" ON public.community_reports;
CREATE POLICY "Users can update own reports" ON public.community_reports FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON public.community_reports TO authenticated;
GRANT SELECT ON public.community_reports TO anon;

-- 4. Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert feedback" ON public.feedback;
CREATE POLICY "Users can insert feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
GRANT INSERT ON public.feedback TO authenticated;

-- 5. Trip History Additions (Assuming base exists, we add routing metrics)
-- Alter table if needed, assuming the user already has trip_history in schema.sql.
-- But let's create it if it doesn't exist just to be safe.
CREATE TABLE IF NOT EXISTS public.trip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_address TEXT NOT NULL,
  dest_address TEXT NOT NULL,
  source_lat DOUBLE PRECISION NOT NULL,
  source_lng DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION,
  duration_mins INTEGER,
  safety_score INTEGER,
  route_geometry TEXT, -- Polyline
  status TEXT DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trip_history;
CREATE POLICY "Users can view own trips" ON public.trip_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trip_history;
CREATE POLICY "Users can insert own trips" ON public.trip_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own trips" ON public.trip_history;
CREATE POLICY "Users can update own trips" ON public.trip_history FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON public.trip_history TO authenticated;


