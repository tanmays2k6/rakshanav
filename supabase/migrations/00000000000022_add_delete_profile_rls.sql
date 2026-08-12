-- RakshaNav: Add DELETE policy for profiles table
-- This allows authenticated users to delete their own profile data without deleting their auth account.

-- Ensure RLS is enabled (should already be true, but just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create the DELETE policy
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" 
  ON public.profiles FOR DELETE 
  USING (auth.uid() = id);

-- Grant base table privileges for DELETE to the authenticated role
GRANT DELETE ON public.profiles TO authenticated;


