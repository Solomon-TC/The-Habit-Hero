-- This migration fixes the friends view structure without trying to enable RLS on the view

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

-- Create a function to get user level data
CREATE OR REPLACE FUNCTION get_user_level(user_id UUID)
RETURNS TABLE (level INT, xp INT, xp_to_next_level INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.current_level AS level,
    ul.current_xp AS xp,
    CAST(ROUND(100 * POWER(1.5, ul.current_level - 1)) AS INT) AS xp_to_next_level
  FROM user_levels ul
  WHERE ul.user_id = get_user_level.user_id;
  
  -- If no rows returned, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT 1, 0, 100;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view that joins friends with user data including level info
DROP VIEW IF EXISTS friends_with_details;
CREATE VIEW friends_with_details AS
SELECT
  f.id,
  f.friend_id,
  f.user_id,
  f.created_at,
  f.updated_at,
  u.name,
  u.email,
  u.avatar_url,
  ul.current_level AS level,
  ul.current_xp AS xp,
  CAST(ROUND(100 * POWER(1.5, ul.current_level - 1)) AS INT) AS xp_to_next_level
FROM friends f
LEFT JOIN users u ON f.friend_id = u.id
LEFT JOIN user_levels ul ON f.friend_id = ul.user_id;
