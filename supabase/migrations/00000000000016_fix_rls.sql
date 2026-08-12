-- RakshaNav: Fix Profiles RLS to allow Upsert during Role Selection
-- If the auto-create trigger fails (e.g. missing metadata on social login), 
-- the frontend must be able to insert the profile.

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create the missing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Note: SELECT and UPDATE policies should already exist per schema.sql
-- However, we recreate the UPDATE policy to ensure it has both USING and WITH CHECK

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CRITICAL: Grant base table privileges to the authenticated role
-- Without this, Postgres denies access before RLS is even checked.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;


