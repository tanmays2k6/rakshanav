-- Live Tracking Supabase Migration

-- 1. Live Sessions Table
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    share_duration TEXT
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read a session if they have the token (or just allow select, since token is unguessed)
CREATE POLICY "Anyone can view sessions" ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert own sessions" ON public.live_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.live_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.live_sessions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.live_sessions TO authenticated;

-- 2. Live Locations Table
CREATE TABLE IF NOT EXISTS public.live_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    battery DOUBLE PRECISION,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- Anyone can read locations (filtered by session_id in the client)
CREATE POLICY "Anyone can view locations" ON public.live_locations FOR SELECT USING (true);
-- But only authenticated users can insert locations to their sessions (using subquery check)
CREATE POLICY "Users can insert locations to own sessions" ON public.live_locations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.live_sessions WHERE id = session_id AND user_id = auth.uid())
);

GRANT SELECT ON public.live_locations TO anon, authenticated;
GRANT INSERT ON public.live_locations TO authenticated;

-- 3. Enable Realtime
-- Drop publication tables if they already exist, just to prevent duplicate errors, then add them
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
