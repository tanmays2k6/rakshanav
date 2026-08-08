-- 1. Drop existing if needed
DROP TABLE IF EXISTS public.sos_events CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.user_medical_info CASCADE;

-- 2. Create user_medical_info table
CREATE TABLE public.user_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  medications TEXT,
  organ_donor BOOLEAN DEFAULT false,
  wheelchair_required BOOLEAN DEFAULT false,
  special_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  priority TEXT DEFAULT 'Secondary', -- 'Primary' or 'Secondary'
  notify_sms BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create sos_events table
CREATE TABLE public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  live_session_id UUID, -- Reference to live_sessions if active
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  battery INTEGER,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  status TEXT DEFAULT 'active', -- 'active', 'resolved', 'false_alarm'
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 5. Auto-update timestamps triggers
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_medical_info_modtime
BEFORE UPDATE ON public.user_medical_info
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_emergency_contacts_modtime
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.user_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- 7. Create Policies for user_medical_info
CREATE POLICY "Users can view own medical info" ON public.user_medical_info 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medical info" ON public.user_medical_info 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medical info" ON public.user_medical_info 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own medical info" ON public.user_medical_info 
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create Policies for emergency_contacts
CREATE POLICY "Users can view own emergency contacts" ON public.emergency_contacts 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emergency contacts" ON public.emergency_contacts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emergency contacts" ON public.emergency_contacts 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own emergency contacts" ON public.emergency_contacts 
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create Policies for sos_events
CREATE POLICY "Users can view own sos events" ON public.sos_events 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sos events" ON public.sos_events 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sos events" ON public.sos_events 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sos events" ON public.sos_events 
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_medical_info;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events;
