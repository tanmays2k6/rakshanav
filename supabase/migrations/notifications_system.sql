-- 1. Update profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('citizen', 'enterprise', 'government', 'admin', 'unassigned'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"route_alerts": true, "hazard_alerts": true, "weather_alerts": true, "gov_advisories": true, "enterprise_notifs": true, "community_notifs": true, "push_enabled": true, "email_enabled": false}';

-- 2. Create Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'danger')),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'government', 'enterprise', 'system')),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'user', 'city', 'route', 'role')),
    recipient_id TEXT, -- Can be user UUID, city name, route ID, or role name
    city TEXT,
    route_id TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    is_read BOOLEAN DEFAULT false, -- For direct 1-to-1 only
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notifications_recipient_type ON public.notifications(recipient_type);
CREATE INDEX idx_notifications_city ON public.notifications(city);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- 3. Create Notification Reads Table (for broadcasts)
CREATE TABLE public.notification_reads (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, notification_id)
);

-- 4. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- 5. Notification Policies
-- Read Policy: Citizens can see 'all', their specific 'user', their 'city' (if stored in profile but since it's not, we'll simplify to just 'all' and 'user' for now unless city is passed in context. Assuming city is handled loosely for now or we match 'all').
CREATE POLICY "Users can read intended notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
    recipient_type = 'all' OR
    (recipient_type = 'user' AND recipient_id = auth.uid()::text) OR
    (recipient_type = 'role' AND recipient_id = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    -- city targeting might require client to filter if profile doesn't store city, or admin can broadcast to 'all'
);

-- Insert Policy: Admin, Gov, Enterprise can create
CREATE POLICY "Privileged roles can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'government', 'enterprise'))
);

-- Update/Delete Policy: Admin or sender
CREATE POLICY "Sender or admin can update"
ON public.notifications FOR UPDATE
TO authenticated
USING (
    sender_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    sender_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Sender or admin can delete"
ON public.notifications FOR DELETE
TO authenticated
USING (
    sender_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Notification Reads Policies
CREATE POLICY "Users can manage own reads"
ON public.notification_reads FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Realtime setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;

-- 8. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;
