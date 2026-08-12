-- RakshaNav Government Command Center Schema
-- Adds government organizations, members, notifications, and modifies incident_reports

-- 1. Modify incident_reports
ALTER TABLE public.incident_reports
ADD COLUMN IF NOT EXISTS assigned_department TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_category TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
ADD COLUMN IF NOT EXISTS is_duplicate_of UUID REFERENCES public.incident_reports(id) ON DELETE SET NULL;

-- 2. Government Organizations
CREATE TABLE IF NOT EXISTS public.government_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Government Members
CREATE TABLE IF NOT EXISTS public.government_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.government_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'officer', 'viewer')),
    department TEXT NOT NULL,
    designation TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gov_members_user_id ON public.government_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_members_org_id ON public.government_members(org_id);

-- 4. Government Notifications (Official Advisories)
CREATE TABLE IF NOT EXISTS public.government_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.government_organizations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., Safety Alert, Traffic Advisory
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
    target_area TEXT,
    target_ward TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 5. Enable RLS
ALTER TABLE public.government_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- government_organizations: Members can read their own org
DROP POLICY IF EXISTS "Gov members can view their orgs" ON public.government_organizations;
CREATE POLICY "Gov members can view their orgs" ON public.government_organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM public.government_members WHERE user_id = auth.uid())
    );

-- government_members: Members can read other members in their org
DROP POLICY IF EXISTS "Gov members can view colleagues" ON public.government_members;
CREATE POLICY "Gov members can view colleagues" ON public.government_members
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.government_members WHERE user_id = auth.uid())
    );

-- Admins can update members
DROP POLICY IF EXISTS "Gov Admins can update members" ON public.government_members;
CREATE POLICY "Gov Admins can update members" ON public.government_members
    FOR UPDATE USING (
        org_id IN (SELECT org_id FROM public.government_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );
    
-- Allow inserting members on signup
DROP POLICY IF EXISTS "Users can sign up as gov members" ON public.government_members;
CREATE POLICY "Users can sign up as gov members" ON public.government_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- government_notifications: Public can read SENT notifications
DROP POLICY IF EXISTS "Public can read sent gov notifications" ON public.government_notifications;
CREATE POLICY "Public can read sent gov notifications" ON public.government_notifications
    FOR SELECT USING (
        status = 'sent'
    );
    
-- Gov members can read all notifications from their org
DROP POLICY IF EXISTS "Gov members can read org notifications" ON public.government_notifications;
CREATE POLICY "Gov members can read org notifications" ON public.government_notifications
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.government_members WHERE user_id = auth.uid())
    );

-- Only authorized Gov members can insert/update notifications
DROP POLICY IF EXISTS "Gov Admins/Officers can insert notifications" ON public.government_notifications;
CREATE POLICY "Gov Admins/Officers can insert notifications" ON public.government_notifications
    FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM public.government_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'officer') AND status = 'approved')
    );

DROP POLICY IF EXISTS "Gov Admins/Officers can update notifications" ON public.government_notifications;

CREATE POLICY "Gov Admins/Officers can update notifications" ON public.government_notifications
    FOR UPDATE USING (
        org_id IN (SELECT org_id FROM public.government_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'officer') AND status = 'approved')
    );

-- Grant Privileges
GRANT SELECT, INSERT, UPDATE ON public.government_organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.government_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.government_notifications TO authenticated;
GRANT SELECT ON public.government_notifications TO anon;

-- Update incident_reports policies to allow approved government members to UPDATE
DROP POLICY IF EXISTS "Approved Gov members can update incident_reports" ON public.incident_reports;
CREATE POLICY "Approved Gov members can update incident_reports" ON public.incident_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.government_members 
            WHERE user_id = auth.uid() 
            AND status = 'approved'
            AND role IN ('owner', 'admin', 'officer')
        )
    );


