-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS autocrm;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION autocrm.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create vector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create uuid-ossp extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 