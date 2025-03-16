-- Drop the existing view if it exists
DROP VIEW IF EXISTS friends_with_details;

-- Recreate the view with the correct column names
CREATE VIEW friends_with_details AS
SELECT 
  fr.id,
  fr.sender_id as friend_id,
  fr.receiver_id as user_id,
  u.name,
  u.email,
  u.avatar_url,
  ul.current_level as level,
  ul.current_xp as xp,
  (ul.current_level * 100) as xp_to_next_level
FROM friend_requests fr
LEFT JOIN users u ON fr.sender_id = u.id
LEFT JOIN user_levels ul ON fr.sender_id = ul.user_id
WHERE fr.status = 'accepted' AND fr.receiver_id = auth.uid()

UNION ALL

SELECT 
  fr.id,
  fr.receiver_id as friend_id,
  fr.sender_id as user_id,
  u.name,
  u.email,
  u.avatar_url,
  ul.current_level as level,
  ul.current_xp as xp,
  (ul.current_level * 100) as xp_to_next_level
FROM friend_requests fr
LEFT JOIN users u ON fr.receiver_id = u.id
LEFT JOIN user_levels ul ON fr.receiver_id = ul.user_id
WHERE fr.status = 'accepted' AND fr.sender_id = auth.uid();

-- Make sure the underlying tables are included in realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_levels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_levels;
  END IF;
END $$;