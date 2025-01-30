-- Create notifications table
CREATE TABLE IF NOT EXISTS autocrm.notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user ON autocrm.notifications(user_id);
CREATE INDEX idx_notifications_org ON autocrm.notifications(organization_id);
CREATE INDEX idx_notifications_read ON autocrm.notifications(read);
CREATE INDEX idx_notifications_created ON autocrm.notifications(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON autocrm.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create notification functions
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    notification_id UUID,
    message TEXT,
    read BOOLEAN,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.notification_id,
        n.message,
        n.read,
        n.created_at,
        n.metadata
    FROM autocrm.notifications n
    WHERE n.user_id = p_user_id
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[]
)
RETURNS SETOF UUID
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE autocrm.notifications
    SET 
        read = TRUE,
        read_at = NOW(),
        updated_at = NOW()
    WHERE 
        user_id = p_user_id
        AND notification_id = ANY(p_notification_ids)
    RETURNING notification_id;
END;
$$;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM autocrm.notifications
    WHERE user_id = p_user_id AND read = FALSE;
    
    RETURN v_count;
END;
$$; 