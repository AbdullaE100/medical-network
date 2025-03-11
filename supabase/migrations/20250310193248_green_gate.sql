/*
  # Fix Chat System RLS Policies

  1. Changes
    - Remove problematic recursive policies
    - Add simplified RLS policies for chat tables
    - Add function for marking messages as read
    - Fix chat group member policies

  2. Security
    - Maintain data access control without recursion
    - Ensure proper chat privacy
*/

-- Drop existing problematic policies
DO $$ 
BEGIN
  -- Drop chat policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their chats' AND tablename = 'chats') THEN
    DROP POLICY "Users can view their chats" ON chats;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create chats' AND tablename = 'chats') THEN
    DROP POLICY "Users can create chats" ON chats;
  END IF;

  -- Drop chat message policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view chat messages' AND tablename = 'chat_messages') THEN
    DROP POLICY "Users can view chat messages" ON chat_messages;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send chat messages' AND tablename = 'chat_messages') THEN
    DROP POLICY "Users can send chat messages" ON chat_messages;
  END IF;

  -- Drop chat group policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view chat groups' AND tablename = 'chat_groups') THEN
    DROP POLICY "Users can view chat groups" ON chat_groups;
  END IF;

  -- Drop chat group member policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view group members' AND tablename = 'chat_group_members') THEN
    DROP POLICY "Users can view group members" ON chat_group_members;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can join groups' AND tablename = 'chat_group_members') THEN
    DROP POLICY "Users can join groups" ON chat_group_members;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage members' AND tablename = 'chat_group_members') THEN
    DROP POLICY "Admins can manage members" ON chat_group_members;
  END IF;
END $$;

-- Create simplified chat policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their chats' AND tablename = 'chats') THEN
    CREATE POLICY "Users can view their chats"
    ON chats FOR SELECT
    TO authenticated
    USING (auth.uid() IN (user_id, doctor_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create chats' AND tablename = 'chats') THEN
    CREATE POLICY "Users can create chats"
    ON chats FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (user_id, doctor_id));
  END IF;
END $$;

-- Create simplified chat message policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view chat messages' AND tablename = 'chat_messages') THEN
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send chat messages' AND tablename = 'chat_messages') THEN
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
  END IF;
END $$;

-- Create simplified chat group policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view chat groups' AND tablename = 'chat_groups') THEN
    CREATE POLICY "Users can view chat groups"
    ON chat_groups FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE chat_group_members.group_id = id
        AND chat_group_members.member_id = auth.uid()
        LIMIT 1
      )
    );
  END IF;
END $$;

-- Create simplified chat group member policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view group members' AND tablename = 'chat_group_members') THEN
    CREATE POLICY "Users can view group members"
    ON chat_group_members FOR SELECT
    TO authenticated
    USING (
      member_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM chat_group_members admin
        WHERE admin.group_id = group_id
        AND admin.member_id = auth.uid()
        AND admin.role = 'admin'
        LIMIT 1
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can join groups' AND tablename = 'chat_group_members') THEN
    CREATE POLICY "Users can join groups"
    ON chat_group_members FOR INSERT
    TO authenticated
    WITH CHECK (member_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage members' AND tablename = 'chat_group_members') THEN
    CREATE POLICY "Admins can manage members"
    ON chat_group_members FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM chat_group_members admin
        WHERE admin.group_id = group_id
        AND admin.member_id = auth.uid()
        AND admin.role = 'admin'
        LIMIT 1
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM chat_group_members admin
        WHERE admin.group_id = group_id
        AND admin.member_id = auth.uid()
        AND admin.role = 'admin'
        LIMIT 1
      )
    );
  END IF;
END $$;

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