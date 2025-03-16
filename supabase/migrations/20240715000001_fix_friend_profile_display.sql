-- Ensure the friends_with_details view includes all necessary user data
DROP VIEW IF EXISTS friends_with_details;
CREATE VIEW friends_with_details AS
SELECT 
  f.user_id,
  f.friend_id,
  u.name,
  u.email,
  u.avatar_url,
  COALESCE(ul.level, 1) as level,
  COALESCE(ul.xp, 0) as xp,
  COALESCE(ul.xp_to_next_level, 100) as xp_to_next_level
FROM friends f
LEFT JOIN users u ON f.friend_id = u.id
LEFT JOIN user_levels ul ON f.friend_id = ul.user_id;

-- Make sure the view is accessible
GRANT SELECT ON friends_with_details TO authenticated;

-- Ensure realtime is enabled for relevant tables
DO $$
BEGIN
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
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_achievements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
  END IF;
END $$;