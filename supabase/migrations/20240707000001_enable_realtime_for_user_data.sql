-- Create a view to get user achievements with achievement details
CREATE OR REPLACE VIEW public.user_achievements_with_details AS
SELECT 
  ua.id,
  ua.user_id,
  ua.achievement_id,
  ua.earned_at,
  ua.is_public,
  a.title,
  a.description,
  a.icon,
  a.xp_reward
FROM 
  public.user_achievements ua
JOIN 
  public.achievements a ON ua.achievement_id = a.id;

-- Enable realtime for user_achievements table if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_achievements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
  END IF;
END $$;

-- Note: Views cannot be added to realtime publications
-- We'll use the underlying tables for realtime updates instead
