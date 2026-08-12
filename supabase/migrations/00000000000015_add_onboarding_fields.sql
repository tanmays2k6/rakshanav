-- Add new fields for onboarding flow to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other')),
ADD COLUMN IF NOT EXISTS age INT CHECK (age >= 16 AND age <= 100),
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS travel_mode TEXT,
ADD COLUMN IF NOT EXISTS preferred_route TEXT,
ADD COLUMN IF NOT EXISTS night_travel TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- The role column already exists, but we update the check constraint to ensure it includes the expected values
-- Actually, the role column already has CHECK (role IN ('citizen', 'enterprise', 'government', 'unassigned'))
-- so no change is needed there.


