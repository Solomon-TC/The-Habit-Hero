-- Fix issues with user authentication and granting permissions

-- Ensure the users table has the correct structure and constraints
ALTER TABLE IF EXISTS public.users
ALTER COLUMN user_id DROP NOT NULL;

-- Fix the handle_new_user function to properly handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    user_id,
    email,
    name,
    full_name,
    avatar_url,
    token_identifier,
    created_at
  ) VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix the handle_user_update function
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the update trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Fix the subscriptions table foreign key reference
ALTER TABLE IF EXISTS public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey,
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey_fixed;

ALTER TABLE IF EXISTS public.subscriptions
ADD CONSTRAINT subscriptions_user_id_uuid_fkey
FOREIGN KEY (user_id_uuid) REFERENCES public.users(id);

-- Enable realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;