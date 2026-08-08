-- Drop the old generic policy
DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON public.emergency_contacts;

-- Ensure RLS is enabled
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Users can only see their own contacts
CREATE POLICY "Enable read for users based on user_id" 
ON public.emergency_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. INSERT policy: Users can only insert their own contacts
CREATE POLICY "Enable insert for authenticated users only" 
ON public.emergency_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: Users can only update their own contacts
CREATE POLICY "Enable update for users based on user_id" 
ON public.emergency_contacts 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE policy: Users can only delete their own contacts
CREATE POLICY "Enable delete for users based on user_id" 
ON public.emergency_contacts 
FOR DELETE 
USING (auth.uid() = user_id);
