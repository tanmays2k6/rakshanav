-- RakshaNav Supabase Schema

-- Profiles table: Extends auth.users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'unassigned' CHECK (role IN ('citizen', 'enterprise', 'government', 'unassigned')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant privileges to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'unassigned'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Incident Reports Table
CREATE TABLE public.incident_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  lux_reading FLOAT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'in_progress')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view incident reports" 
  ON public.incident_reports FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create reports" 
  ON public.incident_reports FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Government can update reports" 
  ON public.incident_reports FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'government')
  );

-- Trip History Table
CREATE TABLE public.trip_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_lat FLOAT NOT NULL,
  start_lng FLOAT NOT NULL,
  end_lat FLOAT NOT NULL,
  end_lng FLOAT NOT NULL,
  safety_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip history" 
  ON public.trip_history FOR ALL 
  USING (auth.uid() = user_id);
