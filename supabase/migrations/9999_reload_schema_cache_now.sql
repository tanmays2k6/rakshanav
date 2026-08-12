-- Force PostgREST schema cache reload to ensure all views and tables are exposed via REST
NOTIFY pgrst, 'reload schema';
