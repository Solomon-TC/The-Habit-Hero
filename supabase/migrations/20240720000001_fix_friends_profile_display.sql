-- Ensure the friends_with_details view includes all necessary fields for profile display
DROP VIEW IF EXISTS friends_with_details;

CREATE VIEW friends_with_details AS
SELECT 
  u.id as friend_id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  COALESCE(ul.level, 1) as level,
  COALESCE(ul.xp, 0) as xp,
  COALESCE(ul.xp_to_next_level, 100) as xp_to_next_level
FROM auth.users u
LEFT JOIN user_levels ul ON u.id = ul.user_id;

-- Make sure the view is accessible
GRANT SELECT ON friends_with_details TO authenticated;

-- Check if user_levels is already in the realtime publication
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