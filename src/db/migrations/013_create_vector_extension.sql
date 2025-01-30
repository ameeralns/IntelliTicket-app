-- First, connect as superuser to create the extension
-- Note: This needs to be run by a superuser
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Grant usage on the schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;

-- Grant execute on all functions in the extensions schema to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated;

-- Make the vector extension available in public schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public; 