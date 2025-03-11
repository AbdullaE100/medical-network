/*
  # Fix Chat System Recursion Issues

  1. Changes
    - Remove recursive policies causing infinite loops
    - Simplify chat message access control
    - Add proper RLS policies for chat messages
    - Add function to mark messages as read

  2. Security
    - Ensure proper access control without recursion
    - Maintain data integrity and security
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Chat participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Create simplified policies for chats
CREATE POLICY "Users can view their chats"
ON chats FOR SELECT
TO authenticated
USING (
  auth.uid() IN (user_id, doctor_id)
);

-- Create simplified policies for chat messages
CREATE POLICY "Users can view chat messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_messages.chat_id
    AND auth.uid() IN (chats.user_id, chats.doctor_id)
  )
);

CREATE POLICY "Users can send chat messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_messages.chat_id
    AND auth.uid() IN (chats.user_id, chats.doctor_id)
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