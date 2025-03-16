-- Create achievements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'award',
  xp_reward INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT true,
  UNIQUE(user_id, achievement_id)
);

-- Enable realtime for user_achievements table
alter publication supabase_realtime add table user_achievements;

-- Create or replace view for achievements with user data
CREATE OR REPLACE VIEW public.achievements_with_users AS
SELECT 
  ua.id,
  ua.user_id,
  ua.achievement_id,
  ua.earned_at,
  ua.is_public,
  a.title,
  a.description,
  a.icon,
  a.xp_reward,
  u.name as user_name,
  u.avatar_url
FROM 
  public.user_achievements ua
JOIN 
  public.achievements a ON ua.achievement_id = a.id
JOIN 
  public.users u ON ua.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON public.achievements_with_users TO authenticated;
GRANT SELECT ON public.achievements_with_users TO anon;
