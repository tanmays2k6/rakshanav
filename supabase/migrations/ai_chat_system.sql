-- ==============================================================================
-- RakshaNav AI Chat System Schema
-- ==============================================================================

-- 1. Create AI Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create AI Chat Messages Table
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for AI Sessions
CREATE POLICY "Users can view their own AI sessions" 
    ON public.ai_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI sessions" 
    ON public.ai_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI sessions" 
    ON public.ai_sessions FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. RLS Policies for AI Messages
CREATE POLICY "Users can view messages of their sessions" 
    ON public.ai_messages FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.ai_sessions s 
        WHERE s.id = session_id AND s.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages to their sessions" 
    ON public.ai_messages FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.ai_sessions s 
        WHERE s.id = session_id AND s.user_id = auth.uid()
    ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON public.ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session_id ON public.ai_messages(session_id);
