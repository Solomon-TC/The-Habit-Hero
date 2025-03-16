-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_habits table to link goals with habits
CREATE TABLE IF NOT EXISTS goal_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, habit_id)
);

-- Add RLS policies
-- Enable row level security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_habits ENABLE ROW LEVEL SECURITY;

-- Create policies for goals table
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for milestones table
DROP POLICY IF EXISTS "Users can view their own milestones" ON milestones;
CREATE POLICY "Users can view their own milestones"
  ON milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own milestones" ON milestones;
CREATE POLICY "Users can insert their own milestones"
  ON milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own milestones" ON milestones;
CREATE POLICY "Users can update their own milestones"
  ON milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own milestones" ON milestones;
CREATE POLICY "Users can delete their own milestones"
  ON milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = milestones.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- Create policies for goal_habits table
DROP POLICY IF EXISTS "Users can view their own goal_habits" ON goal_habits;
CREATE POLICY "Users can view their own goal_habits"
  ON goal_habits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_habits.goal_id
      AND goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own goal_habits" ON goal_habits;
CREATE POLICY "Users can insert their own goal_habits"
  ON goal_habits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_habits.goal_id
      AND goals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own goal_habits" ON goal_habits;
CREATE POLICY "Users can delete their own goal_habits"
  ON goal_habits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_habits.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- Enable realtime for all tables
alter publication supabase_realtime add table goals;
alter publication supabase_realtime add table milestones;
alter publication supabase_realtime add table goal_habits;
