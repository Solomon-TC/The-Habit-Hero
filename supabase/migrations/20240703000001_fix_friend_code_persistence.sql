-- This migration ensures friend codes persist across sign-ins and sign-outs

-- First, make sure the friend_codes table exists
CREATE TABLE IF NOT EXISTS public.friend_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_friend_codes_user_id ON public.friend_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON public.friend_codes(code);

-- Update the generate-friend-code edge function to always check the friend_codes table first
-- and only generate a new code if one doesn't exist

-- Create a function to get a user's friend code or generate one if it doesn't exist
CREATE OR REPLACE FUNCTION get_or_create_friend_code(user_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
  existing_code VARCHAR;
  new_code VARCHAR;
BEGIN
  -- First check if the user already has a friend code
  SELECT code INTO existing_code FROM public.friend_codes WHERE user_id = user_uuid;
  
  -- If a code exists, return it
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate a new code
  new_code := generate_friend_code();
  
  -- Insert the new code
  INSERT INTO public.friend_codes (user_id, code)
  VALUES (user_uuid, new_code);
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Ensure all existing users have a friend code in the friend_codes table
DO $$
BEGIN
  -- Migrate any existing friend codes from users table to friend_codes table
  INSERT INTO public.friend_codes (user_id, code, created_at, updated_at)
  SELECT id, 
         COALESCE(friend_code, generate_friend_code()), 
         created_at, 
         updated_at
  FROM public.users
  WHERE id NOT IN (SELECT user_id FROM public.friend_codes)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- For any auth.users that don't have an entry in friend_codes, create one
  INSERT INTO public.friend_codes (user_id, code)
  SELECT id, generate_friend_code()
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM public.friend_codes)
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- Update the user_friend_codes view to use the friend_codes table
CREATE OR REPLACE VIEW public.user_friend_codes AS
SELECT u.id, u.email, u.name, fc.code as friend_code
FROM public.users u
LEFT JOIN public.friend_codes fc ON u.id = fc.user_id;

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

-- Add the friend_codes table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friend_codes;
