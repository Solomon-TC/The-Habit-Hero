-- Create user_levels table
CREATE TABLE IF NOT EXISTS public.user_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1,
    current_xp INTEGER NOT NULL DEFAULT 0,
    total_xp_earned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_levels_user_id_key UNIQUE (user_id)
);

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

-- Enable realtime for user_levels
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_levels;

-- Create xp_history table
CREATE TABLE IF NOT EXISTS public.xp_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'habit', 'goal', 'milestone', etc.
    source_id TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Enable realtime for xp_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_history;
