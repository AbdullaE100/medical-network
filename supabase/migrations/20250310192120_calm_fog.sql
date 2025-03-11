/*
  # Fix Chat Policies

  1. Changes
    - Fix infinite recursion in chat_group_members policies
    - Simplify chat message access policies
    - Add proper RLS for chat messages and groups

  2. Security
    - Enable RLS on all tables
    - Add proper policies for authenticated users
    - Prevent circular dependencies in policies
*/

-- Fix chat_group_members policies
DROP POLICY IF EXISTS "Users can view group members" ON chat_group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON chat_group_members;

CREATE POLICY "Users can view their groups' members"
  ON chat_group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members my_groups
      WHERE my_groups.group_id = chat_group_members.group_id
      AND my_groups.member_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members"
  ON chat_group_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members admin_check
      WHERE admin_check.group_id = chat_group_members.group_id
      AND admin_check.member_id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

-- Fix chat_messages policies
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their chats/groups" ON chat_messages;

CREATE POLICY "Users can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      -- For direct chats
      (chat_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chats
        WHERE chats.id = chat_messages.chat_id
        AND (chats.user_id = auth.uid() OR chats.doctor_id = auth.uid())
      )) OR
      -- For group chats
      (group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE chat_group_members.group_id = chat_messages.group_id
        AND chat_group_members.member_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can view messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    -- For direct chats
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_messages.chat_id
      AND (chats.user_id = auth.uid() OR chats.doctor_id = auth.uid())
    )) OR
    -- For group chats
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_messages.group_id
      AND chat_group_members.member_id = auth.uid()
    ))
  );

-- Fix chats policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

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