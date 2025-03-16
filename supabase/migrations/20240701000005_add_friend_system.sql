-- Create friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friends view
CREATE VIEW friends AS
SELECT 
  fr.id,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN fr.receiver_id
    ELSE fr.sender_id
  END AS friend_id,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN fr.sender_id
    ELSE fr.receiver_id
  END AS user_id,
  fr.created_at,
  fr.updated_at,
  fr.sender_id,
  fr.receiver_id
FROM friend_requests fr
WHERE fr.status = 'accepted' AND (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid());

-- Enable RLS on friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for friend_requests
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own friend requests"
  ON friend_requests FOR UPDATE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can delete their own friend requests"
  ON friend_requests FOR DELETE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
