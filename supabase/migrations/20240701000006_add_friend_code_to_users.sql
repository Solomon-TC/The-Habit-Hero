-- Add friend_code column to users table if it doesn't exist
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- Create a unique index on friend_code to ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS users_friend_code_idx ON public.users (friend_code);

-- Create a trigger to prevent friend_code from being changed once set
CREATE OR REPLACE FUNCTION prevent_friend_code_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.friend_code IS NOT NULL AND NEW.friend_code != OLD.friend_code THEN
        NEW.friend_code := OLD.friend_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS prevent_friend_code_change_trigger ON public.users;

-- Create the trigger
CREATE TRIGGER prevent_friend_code_change_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION prevent_friend_code_change();
