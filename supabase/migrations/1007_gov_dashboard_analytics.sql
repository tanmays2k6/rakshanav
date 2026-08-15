-- Government Dashboard Analytics & Audit Logs

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can only read audit logs (if they have the appropriate role)
-- Inserts are primarily done via RPCs or secure backend endpoints.
DROP POLICY IF EXISTS "Gov Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Gov Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.government_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Allow admins to insert audit logs (will also enforce on backend)
DROP POLICY IF EXISTS "Gov Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Gov Admins can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.government_members 
            WHERE user_id = auth.uid() 
            AND status = 'approved'
        )
        AND auth.uid() = admin_id
    );

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- 2. Analytics RPCs

-- A. Get Aggregated Analytics (Counts over a date range)
CREATE OR REPLACE FUNCTION get_gov_analytics(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    total_active_sessions INT;
    total_incidents INT;
    total_sos INT;
    resolved_incidents INT;
BEGIN
    -- Check Authorization: User must be an approved government member
    IF NOT EXISTS (
        SELECT 1 FROM public.government_members 
        WHERE user_id = auth.uid() 
        AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Count active sessions in range (rough estimate by created_at)
    SELECT count(*) INTO total_active_sessions 
    FROM public.live_sessions 
    WHERE created_at >= start_date AND created_at <= end_date;

    -- Count incidents
    SELECT count(*) INTO total_incidents 
    FROM public.incident_reports 
    WHERE created_at >= start_date AND created_at <= end_date;

    -- Count SOS (Assuming sos_events table exists. If not, fallback to 0)
    -- Checking if table exists safely
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sos_events') THEN
        EXECUTE 'SELECT count(*) FROM public.sos_events WHERE created_at >= $1 AND created_at <= $2'
        INTO total_sos
        USING start_date, end_date;
    ELSE
        total_sos := 0;
    END IF;

    -- Count resolved incidents
    SELECT count(*) INTO resolved_incidents 
    FROM public.incident_reports 
    WHERE created_at >= start_date AND created_at <= end_date 
    AND status IN ('Resolved', 'Closed');

    result := jsonb_build_object(
        'total_active_sessions', total_active_sessions,
        'total_incidents', total_incidents,
        'total_sos', total_sos,
        'resolved_incidents', resolved_incidents
    );

    RETURN result;
END;
$$;

-- B. Get Safety Heatmap Data
CREATE OR REPLACE FUNCTION get_safety_heatmap_data(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    weight INT,
    type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check Authorization
    IF NOT EXISTS (
        SELECT 1 FROM public.government_members 
        WHERE user_id = auth.uid() 
        AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        latitude as lat, 
        longitude as lng, 
        CASE 
            WHEN priority = 'Critical' THEN 10
            WHEN priority = 'High' THEN 7
            WHEN priority = 'Medium' THEN 4
            ELSE 1
        END as weight,
        category as type
    FROM public.incident_reports
    WHERE created_at >= start_date AND created_at <= end_date
    AND latitude IS NOT NULL AND longitude IS NOT NULL;
END;
$$;

-- C. Get Active SOS Events for Emergency Response
CREATE OR REPLACE FUNCTION get_active_sos_events()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    status TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check Authorization
    IF NOT EXISTS (
        SELECT 1 FROM public.government_members 
        WHERE user_id = auth.uid() 
        AND status = 'approved'
        AND role IN ('admin', 'officer', 'owner')
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- If sos_events exists, return active ones
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sos_events') THEN
        RETURN QUERY EXECUTE '
            SELECT id, user_id, status, latitude, longitude, accuracy, created_at, updated_at, resolved_at 
            FROM public.sos_events 
            WHERE status != ''resolved'' 
            ORDER BY created_at DESC
        ';
    END IF;
END;
$$;

-- D. Get Daily Analytics for Charts
CREATE OR REPLACE FUNCTION get_daily_gov_analytics(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    day DATE,
    incidents BIGINT,
    resolved BIGINT,
    sos_alerts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check Authorization
    IF NOT EXISTS (
        SELECT 1 FROM public.government_members 
        WHERE user_id = auth.uid() 
        AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    WITH dates AS (
        SELECT generate_series(start_date::DATE, end_date::DATE, '1 day'::interval)::DATE as day
    ),
    daily_incidents AS (
        SELECT DATE(created_at) as day, count(*) as cnt 
        FROM public.incident_reports 
        WHERE created_at >= start_date AND created_at <= end_date
        GROUP BY DATE(created_at)
    ),
    daily_resolved AS (
        SELECT DATE(created_at) as day, count(*) as cnt 
        FROM public.incident_reports 
        WHERE created_at >= start_date AND created_at <= end_date AND status IN ('Resolved', 'Closed')
        GROUP BY DATE(created_at)
    ),
    daily_sos AS (
        SELECT DATE(created_at) as day, count(*) as cnt 
        FROM (
            SELECT created_at FROM public.sos_events WHERE created_at >= start_date AND created_at <= end_date
        ) s
        GROUP BY DATE(created_at)
    )
    SELECT 
        d.day,
        COALESCE(i.cnt, 0) as incidents,
        COALESCE(r.cnt, 0) as resolved,
        COALESCE(s.cnt, 0) as sos_alerts
    FROM dates d
    LEFT JOIN daily_incidents i ON d.day = i.day
    LEFT JOIN daily_resolved r ON d.day = r.day
    LEFT JOIN daily_sos s ON d.day = s.day
    ORDER BY d.day ASC;
END;
$$;

