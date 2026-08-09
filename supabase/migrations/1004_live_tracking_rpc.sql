-- ========================================================================================
-- LIVE TRACKING PUBLIC RPC UPDATE
-- ========================================================================================
-- This updates the get_live_session_by_token RPC to return last_location and last_updated
-- so that the frontend public tracking page does not crash on PGRST202 or missing data.

-- 1. Drop existing RPC if signatures differ
DROP FUNCTION IF EXISTS public.get_live_session_by_token(TEXT);

-- 2. Recreate with correct signature
CREATE OR REPLACE FUNCTION public.get_live_session_by_token(p_token TEXT)
RETURNS TABLE(
    id UUID, 
    user_id UUID, 
    is_active BOOLEAN, 
    created_at TIMESTAMPTZ, 
    expires_at TIMESTAMPTZ,
    last_location JSONB,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
   RETURN QUERY SELECT 
       l.id, 
       l.user_id, 
       l.is_active, 
       l.created_at, 
       l.expires_at,
       l.last_location,
       l.last_updated
   FROM public.live_sessions l
   WHERE l.share_token = p_token 
   AND l.is_active = true 
   AND (l.expires_at IS NULL OR l.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_live_session_by_token(TEXT) TO anon, authenticated;

-- 4. Reload PostgREST schema cache to immediately resolve PGRST202
NOTIFY pgrst, 'reload schema';
