-- 1. Ensure columns exist (just in case the previous migration failed)
ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS last_location JSONB,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;

-- 2. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';


