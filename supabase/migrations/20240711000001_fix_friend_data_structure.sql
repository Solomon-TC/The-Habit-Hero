-- This migration ensures the friends view returns the correct data structure

-- Recreate the friends view with proper structure
DROP VIEW IF EXISTS friends;
CREATE VIEW friends AS
SELECT 
  fr.id,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN fr.receiver_id 
    ELSE fr.sender_id 
  END AS friend_id,
  auth.uid() AS user_id,
  fr.created_at,
  fr.updated_at
FROM friend_requests fr
WHERE 
  fr.status = 'accepted' AND 
  (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid());

-- Enable RLS on the friends view
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Create policy for the friends view
DROP POLICY IF EXISTS "Users can see their own friends" ON friends;
CREATE POLICY "Users can see their own friends"
  ON friends
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
