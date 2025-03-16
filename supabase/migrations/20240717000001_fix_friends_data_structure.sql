-- Drop the existing view if it exists
DROP VIEW IF EXISTS friends_with_details;

-- Create a new view that properly joins user data with friends
CREATE VIEW friends_with_details AS
SELECT 
  f.id,
  f.user_id,
  f.friend_id,
  f.created_at,
  u.id as user_id,
  u.name,
  u.email,
  u.avatar_url,
  ul.level,
  ul.xp,
  ul.xp_to_next_level
FROM friends f
LEFT JOIN users u ON f.friend_id = u.id
LEFT JOIN user_levels ul ON f.friend_id = ul.user_id;

-- Make sure the underlying tables are in the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_levels;
