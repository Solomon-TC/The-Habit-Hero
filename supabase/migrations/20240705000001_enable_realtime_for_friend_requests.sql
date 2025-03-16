-- Enable realtime for friend_requests table
alter publication supabase_realtime add table friend_requests;

-- Add created_at and updated_at columns to friend_requests if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friend_requests' AND column_name = 'created_at') THEN
        ALTER TABLE friend_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friend_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE friend_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;
