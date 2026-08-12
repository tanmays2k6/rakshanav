-- 1. Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS government_department TEXT,
ADD COLUMN IF NOT EXISTS travel_preference TEXT,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS office_address TEXT,
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- 2. Create auto-update trigger for profiles updated_at if not exists
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 3. Create Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Setup Storage Policies for avatars
-- Allow public access to read avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars (but only to their own user id folder/file)
DROP POLICY IF EXISTS "Users can upload their own avatars." ON storage.objects;
CREATE POLICY "Users can upload their own avatars." 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars." ON storage.objects;
CREATE POLICY "Users can update their own avatars."
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars." ON storage.objects;
CREATE POLICY "Users can delete their own avatars."
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- 5. Enable Realtime on profiles
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


