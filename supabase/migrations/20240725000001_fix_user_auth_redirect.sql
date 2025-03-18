-- Improve the ensure_user_exists function to better handle errors
CREATE OR REPLACE FUNCTION ensure_user_exists(user_id UUID, user_email TEXT, user_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- First check if the user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Insert the user if they don't exist
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (user_id, user_email, user_name, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create a friend code for the new user
    INSERT INTO friend_codes (user_id, code)
    VALUES (user_id, SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Ensure notification settings exist
  IF NOT EXISTS (SELECT 1 FROM notification_settings WHERE user_id = user_id) THEN
    INSERT INTO notification_settings (user_id, email_notifications, push_notifications)
    VALUES (user_id, TRUE, TRUE)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the transaction
  RAISE NOTICE 'Error in ensure_user_exists: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_friend_codes_user_id ON friend_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_settings;
