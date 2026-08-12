-- 1. Drop existing table
DROP TABLE IF EXISTS public.hazard_reports CASCADE;
DROP TABLE IF EXISTS public.incident_votes CASCADE;
DROP TABLE IF EXISTS public.incident_comments CASCADE;
DROP TABLE IF EXISTS public.incident_updates CASCADE;
DROP TABLE IF EXISTS public.incident_reports CASCADE;

-- 2. Create Incident Reports Table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  city TEXT,
  photo_url TEXT,
  priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
  status TEXT DEFAULT 'Pending', -- Pending, Verified, Assigned, In Progress, Resolved, Rejected
  verification_status TEXT DEFAULT 'Unverified',
  severity TEXT DEFAULT 'Medium',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Incident Updates (Timeline)
CREATE TABLE IF NOT EXISTS public.incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Incident Comments
CREATE TABLE IF NOT EXISTS public.incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Incident Votes
CREATE TABLE IF NOT EXISTS public.incident_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('confirm', 'reject')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id, user_id) -- Prevent duplicate voting
);

-- 6. Trigger to auto-update 'updated_at'
CREATE OR REPLACE FUNCTION update_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incident_timestamp
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION update_incident_timestamp();

-- 7. Trigger to auto-update vote counts
CREATE OR REPLACE FUNCTION update_incident_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'confirm' THEN
      UPDATE public.incident_reports SET upvotes = upvotes + 1 WHERE id = NEW.incident_id;
    ELSIF NEW.vote_type = 'reject' THEN
      UPDATE public.incident_reports SET downvotes = downvotes + 1 WHERE id = NEW.incident_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'confirm' THEN
      UPDATE public.incident_reports SET upvotes = upvotes - 1 WHERE id = OLD.incident_id;
    ELSIF OLD.vote_type = 'reject' THEN
      UPDATE public.incident_reports SET downvotes = downvotes - 1 WHERE id = OLD.incident_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'confirm' AND NEW.vote_type = 'reject' THEN
      UPDATE public.incident_reports SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.incident_id;
    ELSIF OLD.vote_type = 'reject' AND NEW.vote_type = 'confirm' THEN
      UPDATE public.incident_reports SET downvotes = downvotes - 1, upvotes = upvotes + 1 WHERE id = NEW.incident_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incident_votes
AFTER INSERT OR UPDATE OR DELETE ON public.incident_votes
FOR EACH ROW EXECUTE FUNCTION update_incident_vote_counts();

-- 8. Trigger to auto-update comment counts
CREATE OR REPLACE FUNCTION update_incident_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.incident_reports SET comments_count = comments_count + 1 WHERE id = NEW.incident_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.incident_reports SET comments_count = comments_count - 1 WHERE id = OLD.incident_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incident_comments
AFTER INSERT OR DELETE ON public.incident_comments
FOR EACH ROW EXECUTE FUNCTION update_incident_comment_count();

-- 9. Trigger to insert timeline record when report is created
CREATE OR REPLACE FUNCTION create_initial_incident_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.incident_updates (incident_id, status, description, updated_by)
  VALUES (NEW.id, 'Submitted', 'Incident report submitted.', NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initial_incident_update
AFTER INSERT ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION create_initial_incident_update();

-- 10. Trigger to insert timeline record when status changes
CREATE OR REPLACE FUNCTION update_incident_status_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.incident_updates (incident_id, status, description, updated_by)
    VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_status_change_timeline
AFTER UPDATE OF status ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION update_incident_status_timeline();

-- 11. Security & Policies
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read reports
DROP POLICY IF EXISTS "Public can read incident reports" ON public.incident_reports;
CREATE POLICY "Public can read incident reports" ON public.incident_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read incident updates" ON public.incident_updates;
CREATE POLICY "Public can read incident updates" ON public.incident_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read incident comments" ON public.incident_comments;
CREATE POLICY "Public can read incident comments" ON public.incident_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read incident votes" ON public.incident_votes;
CREATE POLICY "Public can read incident votes" ON public.incident_votes FOR SELECT USING (true);

-- Authenticated users can create
DROP POLICY IF EXISTS "Users can create incident reports" ON public.incident_reports;
CREATE POLICY "Users can create incident reports" ON public.incident_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can create incident comments" ON public.incident_comments;
CREATE POLICY "Users can create incident comments" ON public.incident_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can vote" ON public.incident_votes;
CREATE POLICY "Users can vote" ON public.incident_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update their votes" ON public.incident_votes;
CREATE POLICY "Users can update their votes" ON public.incident_votes FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_comments;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_votes;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


