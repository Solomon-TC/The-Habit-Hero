-- First, drop existing views if they exist to avoid conflicts
DROP VIEW IF EXISTS user_achievements_with_details;
DROP VIEW IF EXISTS friends;

-- Create a view to get user achievements with details
CREATE VIEW user_achievements_with_details AS
SELECT 
  ua.id,
  ua.user_id,
  ua.achievement_id,
  ua.earned_at,
  ua.is_public,
  a.title,
  a.description,
  a.icon
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id;

-- Create the friends view to include more user details
CREATE VIEW friends AS
SELECT 
  fr.id,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN fr.receiver_id
    ELSE fr.sender_id
  END AS friend_id,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN 'sent'
    ELSE 'received'
  END AS request_type,
  fr.created_at,
  fr.updated_at,
  auth.uid() AS user_id
FROM friend_requests fr
WHERE 
  (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid())
  AND fr.status = 'accepted';

-- Add tables to realtime publication if they aren't already
DO $$
BEGIN
  -- Try to add each table to the publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_codes;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, ignore
  END;
  
  -- Note: We don't add views to the publication as they're not supported
  -- Instead, we'll rely on the underlying tables being in the publication
END
$$;