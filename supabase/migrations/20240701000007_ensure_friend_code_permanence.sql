-- This migration ensures that friend codes remain permanent

-- Add a unique constraint to the friend_code column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_friend_code_key' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_friend_code_key UNIQUE (friend_code);
  END IF;
END $$;

-- Create a function to prevent friend_code updates if already set
CREATE OR REPLACE FUNCTION prevent_friend_code_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If old record has a friend_code and it's different from the new one
  -- and the new one is not null, keep the old friend_code
  IF OLD.friend_code IS NOT NULL AND 
     OLD.friend_code != NEW.friend_code AND 
     NEW.friend_code IS NOT NULL THEN
    NEW.friend_code := OLD.friend_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to prevent friend_code changes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'prevent_friend_code_change_trigger' AND tgrelid = 'users'::regclass
  ) THEN
    CREATE TRIGGER prevent_friend_code_change_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_friend_code_change();
  END IF;
END $$;
