-- 1. Add feedback columns to incident_reports
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5);
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

-- 2. Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_id TEXT, -- Can be user ID, report ID, org ID, etc.
    target_type TEXT NOT NULL, -- e.g. 'user', 'report', 'notification', 'system'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admins and internal DB functions can insert
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Note: We might allow other privileged roles to log audits if required later, 
-- but normally audit logs are written by triggers or backend services using a service role. 
-- For this client-driven app, we'll let authenticated users insert their own audit logs if they have the right role
CREATE POLICY "Privileged roles can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'government', 'enterprise'))
);

-- 3. Update Notifications Table
-- Add related_report_id to notifications to easily link
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_report_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE;

-- 4. Enable realtime on audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
