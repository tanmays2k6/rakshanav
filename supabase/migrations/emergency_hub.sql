-- 1. Drop existing emergency tables to match the new strict schema requested by the user.
DROP TABLE IF EXISTS public.sos_events CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.user_medical_info CASCADE;
DROP TABLE IF EXISTS public.medical_profile CASCADE;

-- 2. Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  priority TEXT DEFAULT 'Secondary', -- 'Primary' or 'Secondary'
  receive_sms BOOLEAN DEFAULT true,
  receive_whatsapp BOOLEAN DEFAULT true,
  receive_email BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create medical_profile table
CREATE TABLE public.medical_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  current_medications TEXT,
  organ_donor BOOLEAN DEFAULT false,
  doctor_name TEXT,
  doctor_phone TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create sos_events table
CREATE TABLE public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID, -- Reference to live_sessions (we won't strictly FK it in case session gets deleted)
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  accuracy DOUBLE PRECISION,
  battery_level INTEGER,
  device TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- 'active', 'resolved', 'false_alarm'
  reason TEXT,
  notes TEXT
);

-- 5. Auto-update timestamps triggers
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emergency_contacts_modtime
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_medical_profile_modtime
BEFORE UPDATE ON public.medical_profile
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- 7. Create Policies
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own medical profile" ON public.medical_profile 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sos events" ON public.sos_events 
  FOR ALL USING (auth.uid() = user_id);

-- 8. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events;
