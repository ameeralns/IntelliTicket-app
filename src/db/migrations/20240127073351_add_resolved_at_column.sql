-- Add resolved_at column to tickets table
ALTER TABLE tickets ADD COLUMN resolved_at TIMESTAMPTZ;

-- Create function to handle resolved_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_resolved_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
        NEW.resolved_at = NOW();
    ELSIF NEW.status != 'Resolved' AND OLD.status = 'Resolved' THEN
        NEW.resolved_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update resolved_at
CREATE TRIGGER set_ticket_resolved_timestamp
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_resolved_timestamp();

-- Update existing resolved tickets to have a resolved_at timestamp
UPDATE tickets 
SET resolved_at = updated_at 
WHERE status = 'Resolved' AND resolved_at IS NULL; 