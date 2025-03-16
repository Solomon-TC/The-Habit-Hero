-- Create a dedicated table for friend codes if it doesn't exist yet
CREATE TABLE IF NOT EXISTS friend_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create an index on the code for faster lookups
CREATE INDEX IF NOT EXISTS friend_codes_code_idx ON friend_codes(code);

-- Create or replace the friends view without dropping columns
CREATE OR REPLACE VIEW friends AS
SELECT 
  fr.id,
  fr.created_at,
  fr.updated_at,
  CASE 
    WHEN fr.sender_id = u.id THEN fr.receiver_id
    ELSE fr.sender_id
  END AS friend_id,
  u.id AS user_id
FROM friend_requests fr
JOIN users u ON (fr.sender_id = u.id OR fr.receiver_id = u.id)
WHERE fr.status = 'accepted';

-- Enable realtime for friend_codes table
alter publication supabase_realtime add table friend_codes;
