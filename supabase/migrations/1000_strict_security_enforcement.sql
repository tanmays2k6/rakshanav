-- 1000_strict_security_enforcement.sql
-- Enforces Deny-by-Default and cleans up permissive USING (true) policies on sensitive data.

-- ========================================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS (Prevent RLS Recursion)
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(lookup_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = lookup_id;
  RETURN COALESCE(user_role, 'citizen');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_gov_officer(lookup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_gov BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.government_members 
    WHERE user_id = lookup_id 
    AND status = 'approved'
  ) INTO is_gov;
  RETURN is_gov;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ========================================================================================
-- 2. PROFILES SECURITY FIX
-- ========================================================================================

-- Drop permissive public policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Ensure own viewing policy exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- Allow Government and Admin to view all profiles for official duties
DROP POLICY IF EXISTS "Gov and Admin can view all profiles" ON public.profiles;
CREATE POLICY "Gov and Admin can view all profiles" ON public.profiles 
FOR SELECT USING (
   public.get_user_role(auth.uid()) IN ('admin', 'government')
);

-- ========================================================================================
-- 3. INCIDENT REPORTS SECURITY FIX
-- ========================================================================================

-- Drop permissive public policies
DROP POLICY IF EXISTS "Anyone can view incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Public can read incident reports" ON public.incident_reports;

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own incident reports" ON public.incident_reports;
CREATE POLICY "Users can view own incident reports" ON public.incident_reports
FOR SELECT USING (user_id = auth.uid());

-- Gov and Admin can view all reports (to process them)
DROP POLICY IF EXISTS "Gov and Admin can view all incident reports" ON public.incident_reports;
CREATE POLICY "Gov and Admin can view all incident reports" ON public.incident_reports
FOR SELECT USING (
   public.get_user_role(auth.uid()) IN ('admin', 'government') OR public.is_gov_officer(auth.uid())
);

-- Prevent users from updating their own reports (they should use a different mechanism or be restricted)
-- For now, allow UPDATE but only if it's their own report. The application should not expose status updates to Citizens.
-- (This relies on frontend restriction, but ideally we'd restrict columns. We leave it scoped to own).

-- ========================================================================================
-- 4. PUBLIC INCIDENT VIEW (For Community Maps)
-- ========================================================================================

-- A secure view that exposes only safe metadata for public hazard maps
DROP VIEW IF EXISTS public.public_incident_view;
CREATE OR REPLACE VIEW public.public_incident_view AS
SELECT 
    id, 
    category, 
    priority, 
    status, 
    severity, 
    verification_status,
    created_at, 
    latitude as lat,  -- Map to lat for frontend convenience
    longitude as lng, -- Map to lng for frontend convenience
    latitude,
    longitude,
    city, 
    upvotes, 
    downvotes, 
    comments_count
FROM public.incident_reports
WHERE status NOT IN ('Rejected'); 
-- Does not expose user_id, description (which might contain PII), photo_url, or exact address string.

-- Grant access to the view
GRANT SELECT ON public.public_incident_view TO anon, authenticated;

-- ========================================================================================
-- 5. LIVE SESSIONS & LOCATIONS SECURITY FIX
-- ========================================================================================

-- Drop permissive public policies
DROP POLICY IF EXISTS "Anyone can view live sessions by token" ON public.live_sessions;
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Anyone can view locations" ON public.live_locations;

-- Own sessions only
DROP POLICY IF EXISTS "Users can view own sessions" ON public.live_sessions;
CREATE POLICY "Users can view own sessions" ON public.live_sessions 
FOR SELECT USING (user_id = auth.uid());

-- Own locations only
DROP POLICY IF EXISTS "Users can view own locations" ON public.live_locations;
CREATE POLICY "Users can view own locations" ON public.live_locations 
FOR SELECT USING (
   session_id IN (SELECT id FROM public.live_sessions WHERE user_id = auth.uid())
);

-- Secure RPC for accessing live tracking via share_token
CREATE OR REPLACE FUNCTION public.get_live_session_by_token(p_token TEXT)
RETURNS TABLE(id UUID, user_id UUID, is_active BOOLEAN, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ) AS $$
BEGIN
   RETURN QUERY SELECT l.id, l.user_id, l.is_active, l.created_at, l.expires_at 
   FROM public.live_sessions l
   WHERE l.share_token = p_token 
   AND l.is_active = true 
   AND (l.expires_at IS NULL OR l.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_live_locations_by_session(p_session_id UUID)
RETURNS TABLE(latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, speed DOUBLE PRECISION, heading DOUBLE PRECISION, battery DOUBLE PRECISION, timestamp TIMESTAMPTZ) AS $$
BEGIN
   -- Only return if session is active
   IF EXISTS (SELECT 1 FROM public.live_sessions WHERE id = p_session_id AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())) THEN
      RETURN QUERY SELECT l.latitude, l.longitude, l.speed, l.heading, l.battery, l.timestamp 
      FROM public.live_locations l
      WHERE l.session_id = p_session_id
      ORDER BY l.timestamp DESC LIMIT 100;
   END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_live_session_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_locations_by_session(UUID) TO anon, authenticated;


-- ========================================================================================
-- 6. SOS EVENTS (Fix recursive policy)
-- ========================================================================================

DROP POLICY IF EXISTS "Authorities can view all SOS events" ON public.sos_events;
CREATE POLICY "Authorities can view all SOS events" ON public.sos_events
FOR SELECT USING (
   public.get_user_role(auth.uid()) IN ('admin', 'government', 'enterprise') OR public.is_gov_officer(auth.uid())
);
