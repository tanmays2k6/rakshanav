-- 1. Add new columns to live_sessions
ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS last_location JSONB,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;

-- 2. Drop existing RLS policies on live_sessions to clean up
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.live_sessions;

-- Ensure RLS is active
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create strict SELECT policy for public tracking
-- Anon users can only SELECT sessions that are active and not expired
DROP POLICY IF EXISTS "Public can view active non-expired sessions" ON public.live_sessions;
CREATE POLICY "Public can view active non-expired sessions"
ON public.live_sessions FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Also allow authenticated users to see their own sessions explicitly
DROP POLICY IF EXISTS "Users can view own sessions" ON public.live_sessions;
CREATE POLICY "Users can view own sessions"
ON public.live_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Create INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.live_sessions;
CREATE POLICY "Users can insert own sessions"
ON public.live_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.live_sessions;

CREATE POLICY "Users can update own sessions"
ON public.live_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Explicitly grant permissions to roles to prevent PGRST errors
GRANT SELECT ON public.live_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;

-- Ensure live_locations is similarly granted
GRANT SELECT ON public.live_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_locations TO authenticated;


