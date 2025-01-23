-- Create the ticket-attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove any existing policies
DROP POLICY IF EXISTS "Customer Access Policy" ON storage.objects;
DROP POLICY IF EXISTS "Agent Access Policy" ON storage.objects;
DROP POLICY IF EXISTS "Admin Access Policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users full access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing of attachments" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_policy" ON storage.objects;

-- Enable RLS on the storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a single, simple policy for ticket attachments
CREATE POLICY "ticket_attachments_policy" ON storage.objects
FOR ALL USING (
    bucket_id = 'ticket-attachments'
    AND auth.role() = 'authenticated'
) WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.role() = 'authenticated'
);

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Remove any existing avatar policies
DROP POLICY IF EXISTS "Avatar Upload Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar View Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Manage Policy" ON storage.objects;

-- Policy for users to upload their own avatar
CREATE POLICY "Avatar Upload Policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for users to update/delete their own avatar
CREATE POLICY "Avatar Manage Policy" ON storage.objects
FOR ALL USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for everyone to view avatars
CREATE POLICY "Avatar View Policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
); 