-- RakshaNav Enterprise Dashboard Schema
-- This adds the necessary relational structure for enterprise organizations, fleet tracking, alerts, and audit logs.

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_id TEXT UNIQUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
    department TEXT,
    employee_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Index for fast member lookups
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(org_id);

-- 3. Enterprise Alerts
CREATE TABLE IF NOT EXISTS public.enterprise_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    trip_id UUID, -- Optional link to trips table
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved')),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    result TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------------

-- 1. Organizations Policies
-- Users can view their own organization if they are a member
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- Only owners/admins can update organizations
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
CREATE POLICY "Admins can update organizations" ON public.organizations
    FOR UPDATE USING (
        id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );


-- 2. Organization Members Policies
-- Users can view members of the same organization
DROP POLICY IF EXISTS "Members can view colleagues" ON public.organization_members;
CREATE POLICY "Members can view colleagues" ON public.organization_members
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- Admins can manage members
DROP POLICY IF EXISTS "Admins can insert members" ON public.organization_members;
CREATE POLICY "Admins can insert members" ON public.organization_members
    FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;

CREATE POLICY "Admins can update members" ON public.organization_members
    FOR UPDATE USING (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

DROP POLICY IF EXISTS "Admins can delete members" ON public.organization_members;

CREATE POLICY "Admins can delete members" ON public.organization_members
    FOR DELETE USING (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );


-- 3. Enterprise Alerts Policies
-- All members can view alerts in their org
DROP POLICY IF EXISTS "Members can view alerts" ON public.enterprise_alerts;
CREATE POLICY "Members can view alerts" ON public.enterprise_alerts
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- System or authorized users can insert alerts
DROP POLICY IF EXISTS "Authorized can insert alerts" ON public.enterprise_alerts;
CREATE POLICY "Authorized can insert alerts" ON public.enterprise_alerts
    FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- Admins/Managers can update (resolve) alerts
DROP POLICY IF EXISTS "Managers can update alerts" ON public.enterprise_alerts;
CREATE POLICY "Managers can update alerts" ON public.enterprise_alerts
    FOR UPDATE USING (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );


-- 4. Audit Logs Policies
-- Only owners and admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Anyone in the org can have an audit log generated for them (usually via RPC, but allowing insert if they are a member)
DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Members can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- No updates or deletes allowed on audit logs
-- (Omitted UPDATE/DELETE policies means they are denied by default)


-- Grant Privileges
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.enterprise_alerts TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;


