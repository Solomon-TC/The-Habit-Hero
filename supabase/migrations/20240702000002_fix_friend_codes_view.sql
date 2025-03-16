-- Drop the existing friends view first
DROP VIEW IF EXISTS public.friends;

-- Recreate the friends view with the correct columns
CREATE VIEW public.friends AS
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

-- Make sure all existing users have a friend code in the friend_codes table
INSERT INTO public.friend_codes (user_id, code)
SELECT id, COALESCE(friend_code, generate_friend_code())
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.friend_codes)
ON CONFLICT (user_id) DO NOTHING;

-- Update the generate-friend-code function to always use the friend_codes table
CREATE OR REPLACE FUNCTION public.get_user_friend_code(user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  user_code VARCHAR;
BEGIN
  -- Get the user's friend code from the friend_codes table
  SELECT code INTO user_code FROM public.friend_codes WHERE user_id = $1;
  RETURN user_code;
END;
$$ LANGUAGE plpgsql;