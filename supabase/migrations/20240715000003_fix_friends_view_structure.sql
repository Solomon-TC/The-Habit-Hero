-- Drop the existing view if it exists
DROP VIEW IF EXISTS friends_with_details;

-- Recreate the view with the correct column names
CREATE VIEW friends_with_details AS
SELECT 
  fr.friend_id,
  fr.user_id,
  u.name,
  u.email,
  u.avatar_url,
  ul.current_level as level,
  ul.current_xp as xp,
  (ul.current_level * 100) as xp_to_next_level
FROM friends fr
LEFT JOIN users u ON fr.friend_id = u.id
LEFT JOIN user_levels ul ON fr.friend_id = ul.user_id;

-- Make sure the view is included in realtime
alter publication supabase_realtime add table friends_with_details;
