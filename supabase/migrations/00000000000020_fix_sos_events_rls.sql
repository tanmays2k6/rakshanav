-- Drop the old generic policy
DROP POLICY IF EXISTS "Users can manage own sos events" ON public.sos_events;

-- Ensure RLS is enabled
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Users can only see their own SOS events
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.sos_events;
CREATE POLICY "Enable read for users based on user_id" 
ON public.sos_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. INSERT policy: Users can only insert their own SOS events
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sos_events;
CREATE POLICY "Enable insert for authenticated users only" 
ON public.sos_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: Users can only update their own SOS events
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.sos_events;
CREATE POLICY "Enable update for users based on user_id" 
ON public.sos_events 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE policy: Users can only delete their own SOS events
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.sos_events;
CREATE POLICY "Enable delete for users based on user_id" 
ON public.sos_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_events TO authenticated;


