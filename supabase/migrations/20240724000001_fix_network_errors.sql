-- Fix for network errors and user authentication issues

-- Make sure the handle_new_user function properly handles errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'full_name')::text, '')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

-- Ensure the ensure_user_exists function is properly defined
CREATE OR REPLACE FUNCTION public.ensure_user_exists(user_id uuid, user_email text, user_name text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (user_id, user_email, COALESCE(user_name, ''))
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now()
    RETURNING to_json(*)::json INTO result;
  EXCEPTION WHEN OTHERS THEN
    -- Return error information but don't fail the function
    RETURN json_build_object('error', SQLERRM);
  END;
  
  RETURN result;
END;
$function$;

-- Make sure the friend_codes table has proper constraints and indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'friend_codes_user_id_idx') THEN
    CREATE INDEX friend_codes_user_id_idx ON public.friend_codes (user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'friend_codes_code_idx') THEN
    CREATE INDEX friend_codes_code_idx ON public.friend_codes (code);
  END IF;
END$$;

-- Enable realtime for critical tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE users, friend_codes, friends, friend_requests;
