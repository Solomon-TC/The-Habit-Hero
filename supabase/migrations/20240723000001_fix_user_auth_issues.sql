-- Fix issues with user authentication and granting permissions

-- Make token_identifier nullable to prevent constraint violations
ALTER TABLE IF EXISTS public.users
ALTER COLUMN token_identifier DROP NOT NULL;

-- Fix the handle_new_user function to properly handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    full_name,
    avatar_url,
    token_identifier,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.id::text,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to ensure user exists
CREATE OR REPLACE FUNCTION public.ensure_user_exists(user_id UUID, user_email TEXT, user_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    token_identifier,
    created_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    user_id::text,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
