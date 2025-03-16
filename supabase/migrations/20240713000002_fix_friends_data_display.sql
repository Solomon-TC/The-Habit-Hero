-- This migration ensures the friends_with_details view returns the correct data structure

-- Create a view that joins users with their data for friend display
DROP VIEW IF EXISTS friends_with_details;
CREATE VIEW friends_with_details AS
SELECT 
  u.id as friend_id,
  u.email,
  u.name,
  u.avatar_url,
  ul.current_level as level,
  ul.current_xp as xp,
  (ul.current_level * 100) as xp_to_next_level
FROM users u
LEFT JOIN user_levels ul ON u.id = ul.user_id;

-- Enable RLS on the friends_with_details view
ALTER TABLE friends_with_details ENABLE ROW LEVEL SECURITY;

-- Create policy for the friends_with_details view
DROP POLICY IF EXISTS "Users can see friend details" ON friends_with_details;
CREATE POLICY "Users can see friend details"
  ON friends_with_details
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure the user_achievements_with_details view has the correct structure
DROP VIEW IF EXISTS user_achievements_with_details;
CREATE VIEW user_achievements_with_details AS
SELECT 
  ua.id,
  ua.user_id,
  ua.achievement_id,
  ua.earned_at,
  ua.is_public,
  a.title,
  a.description,
  a.icon,
  a.xp_reward as xp_value
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id;

-- Enable RLS on the user_achievements_with_details view
ALTER TABLE user_achievements_with_details ENABLE ROW LEVEL SECURITY;

-- Create policy for the user_achievements_with_details view
DROP POLICY IF EXISTS "Users can see public achievements" ON user_achievements_with_details;
CREATE POLICY "Users can see public achievements"
  ON user_achievements_with_details
  FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_codes;
