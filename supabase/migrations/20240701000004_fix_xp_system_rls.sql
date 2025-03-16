-- Enable RLS on user_levels
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for user_levels
DROP POLICY IF EXISTS "Users can view their own levels" ON public.user_levels;
CREATE POLICY "Users can view their own levels"
    ON public.user_levels FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own levels" ON public.user_levels;
CREATE POLICY "Users can update their own levels"
    ON public.user_levels FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own levels" ON public.user_levels;
CREATE POLICY "Users can insert their own levels"
    ON public.user_levels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS on xp_history
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

-- Create policies for xp_history
DROP POLICY IF EXISTS "Users can view their own XP history" ON public.xp_history;
CREATE POLICY "Users can view their own XP history"
    ON public.xp_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own XP history" ON public.xp_history;
CREATE POLICY "Users can insert their own XP history"
    ON public.xp_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);
