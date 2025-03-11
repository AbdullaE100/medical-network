/*
  # Fix Chat System Relationships

  1. Changes
    - Fix chat relationships with profiles
    - Add proper foreign key constraints
    - Update chat queries to handle relationships correctly

  2. Security
    - Update RLS policies for better security
    - Add proper access control for chat messages
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Chat participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can view messages" ON chat_messages;

-- Update chats table
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey;
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_doctor_id_fkey;

ALTER TABLE chats
ADD CONSTRAINT chats_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE chats
ADD CONSTRAINT chats_doctor_id_fkey
  FOREIGN KEY (doctor_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Create policies for chats
CREATE POLICY "Users can view their chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (user_id, doctor_id)
  );

CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (user_id, doctor_id)
  );

-- Create policies for chat messages
CREATE POLICY "Chat participants can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_messages.chat_id
      AND auth.uid() IN (user_id, doctor_id)
    )
  );

CREATE POLICY "Chat participants can view messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_messages.chat_id
      AND auth.uid() IN (user_id, doctor_id)
    )
  );

-- Create function to get other user in chat
CREATE OR REPLACE FUNCTION get_other_chat_user(chat_row chats)
RETURNS profiles
LANGUAGE sql
STABLE
AS $$
  SELECT p.*
  FROM profiles p
  WHERE p.id = CASE 
    WHEN chat_row.user_id = auth.uid() THEN chat_row.doctor_id
    ELSE chat_row.user_id
  END
  LIMIT 1;
$$;