-- Drop the existing view if it exists
DROP VIEW IF EXISTS friends_with_details;

-- Create a new view that properly joins user data with friends
CREATE VIEW friends_with_details AS
SELECT 
  f.id,
  f.user_id,
  f.friend_id,
  f.created_at,
  u.name,
  u.email,
  u.avatar_url,
  ul.current_level as level,
  ul.current_xp as xp,
  (ul.current_level * 100) as xp_to_next_level
FROM friends f
LEFT JOIN users u ON f.friend_id = u.id
LEFT JOIN user_levels ul ON f.friend_id = ul.user_id;

-- Only add user_levels to realtime if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_levels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_levels;
  END IF;
END
$$;