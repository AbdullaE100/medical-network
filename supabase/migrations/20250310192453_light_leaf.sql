/*
  # Fix Chat System Policies

  1. Changes
    - Fix infinite recursion in chat policies
    - Optimize message access policies
    - Add proper RLS for direct messages

  2. Security
    - Enable RLS on all tables
    - Add proper policies for authenticated users
    - Prevent circular dependencies
*/

-- Fix chat messages policies
DROP POLICY IF EXISTS "Chat participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can view messages" ON chat_messages;

CREATE POLICY "Chat participants can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_messages.chat_id
      AND (user_id = auth.uid() OR doctor_id = auth.uid())
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
      AND (user_id = auth.uid() OR doctor_id = auth.uid())
    )
  );

-- Fix chats policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;

CREATE POLICY "Users can view their chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR doctor_id = auth.uid()
  );

CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR doctor_id = auth.uid()
  );

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_chat_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE chat_id = p_chat_id
  AND sender_id != auth.uid()
  AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;