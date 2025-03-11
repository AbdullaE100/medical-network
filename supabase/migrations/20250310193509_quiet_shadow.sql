/*
  # Fix Chat System RLS Policies

  1. Changes
    - Drop and recreate chat policies
    - Add optimized message policies
    - Add message read function
    - Handle existing policy cleanup

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Ensure chat privacy
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  -- Drop all existing policies on chats
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats') THEN
    DROP POLICY IF EXISTS "Users can view their chats" ON chats;
    DROP POLICY IF EXISTS "Users can create chats" ON chats;
    DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
    DROP POLICY IF EXISTS "Users can view any chat" ON chats;
  END IF;

  -- Drop all existing policies on chat_messages
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages') THEN
    DROP POLICY IF EXISTS "Users can view chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can send chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can view messages" ON chat_messages;
  END IF;
END $$;

-- Enable RLS on tables if not already enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create chat policies
CREATE POLICY "View own chats"
ON chats FOR SELECT
TO authenticated
USING (
  auth.uid() IN (user_id, doctor_id)
);

CREATE POLICY "Insert own chats"
ON chats FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (user_id, doctor_id)
);

-- Create chat message policies
CREATE POLICY "View chat messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_messages.chat_id
    AND auth.uid() IN (chats.user_id, chats.doctor_id)
    LIMIT 1
  )
);

CREATE POLICY "Send chat messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_messages.chat_id
    AND auth.uid() IN (chats.user_id, chats.doctor_id)
    LIMIT 1
  )
  AND sender_id = auth.uid()
);

-- Create or replace the mark messages as read function
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_chat_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE chat_id = p_chat_id
  AND sender_id != auth.uid()
  AND NOT is_read;
END;
$$;