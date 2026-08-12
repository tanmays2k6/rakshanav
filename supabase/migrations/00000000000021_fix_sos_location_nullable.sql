-- Migration: Drop NOT NULL constraint on sos_events latitude and longitude to allow GPS-less SOS triggers
ALTER TABLE public.sos_events ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.sos_events ALTER COLUMN longitude DROP NOT NULL;


