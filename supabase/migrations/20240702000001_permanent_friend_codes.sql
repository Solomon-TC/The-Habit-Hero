-- Create a dedicated friend_codes table with a unique constraint
CREATE TABLE IF NOT EXISTS public.friend_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_codes_user_id ON public.friend_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON public.friend_codes(code);

-- Create a function to generate a random friend code
CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS VARCHAR AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(10) := '';
  i INTEGER := 0;
  pos INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  -- Try up to 10 times to generate a unique code
  FOR attempt IN 1..10 LOOP
    -- Generate an 8-character code
    result := '';
    FOR i IN 1..8 LOOP
      pos := 1 + floor(random() * length(chars));
      result := result || substr(chars, pos, 1);
    END LOOP;
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM public.friend_codes WHERE code = result) INTO code_exists;
    IF NOT code_exists THEN
      -- Found a unique code
      RETURN result;
    END IF;
  END LOOP;
  
  -- If we couldn't generate a unique code after 10 attempts, add a timestamp suffix
  RETURN substr(result, 1, 5) || substr(md5(clock_timestamp()::text), 1, 3);
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically assign friend codes to new users
CREATE OR REPLACE FUNCTION assign_friend_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user already has a friend code
  IF NOT EXISTS (SELECT 1 FROM public.friend_codes WHERE user_id = NEW.id) THEN
    -- Insert a new friend code for this user
    INSERT INTO public.friend_codes (user_id, code)
    VALUES (NEW.id, generate_friend_code());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to assign friend codes when users are created
DROP TRIGGER IF EXISTS assign_friend_code_trigger ON auth.users;
CREATE TRIGGER assign_friend_code_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION assign_friend_code();

-- Migrate existing friend codes from users table to friend_codes table
INSERT INTO public.friend_codes (user_id, code, created_at, updated_at)
SELECT id, 
       COALESCE(friend_code, generate_friend_code()), 
       created_at, 
       updated_at
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.friend_codes)
ON CONFLICT (user_id) DO NOTHING;

-- Create a view to easily access user friend codes
CREATE OR REPLACE VIEW public.user_friend_codes AS
SELECT u.id, u.email, u.name, fc.code as friend_code
FROM public.users u
LEFT JOIN public.friend_codes fc ON u.id = fc.user_id;

-- Update the friends view to use the new friend_codes table
CREATE OR REPLACE VIEW public.friends AS
SELECT 
  fr.id,
  fr.sender_id,
  fr.receiver_id,
  fr.created_at,
  fr.updated_at,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN fr.receiver_id
    ELSE fr.sender_id
  END as friend_id,
  CASE 
    WHEN fr.sender_id = auth.uid() THEN fr.receiver_id
    ELSE fr.sender_id
  END as user_id
FROM public.friend_requests fr
WHERE fr.status = 'accepted'
AND (fr.sender_id = auth.uid() OR fr.receiver_id = auth.uid());

-- Add RLS policies for the friend_codes table
ALTER TABLE public.friend_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own friend code
DROP POLICY IF EXISTS "Users can read their own friend code" ON public.friend_codes;
CREATE POLICY "Users can read their own friend code"
ON public.friend_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to read any friend code (needed for friend requests)
DROP POLICY IF EXISTS "Users can read any friend code" ON public.friend_codes;
CREATE POLICY "Users can read any friend code"
ON public.friend_codes FOR SELECT
TO authenticated
USING (true);

-- Only allow the system to insert/update friend codes
DROP POLICY IF EXISTS "System can manage friend codes" ON public.friend_codes;
CREATE POLICY "System can manage friend codes"
ON public.friend_codes FOR ALL
TO service_role
USING (true);
