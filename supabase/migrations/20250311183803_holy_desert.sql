/*
  # Add Group Chat Support

  1. New Tables
    - `chat_groups` - Stores group chat information
    - `chat_group_members` - Stores group chat membership
  
  2. Modifications
    - Add group_id to chat_messages table
    - Update existing functions and triggers
*/

-- Create chat_groups table
CREATE TABLE IF NOT EXISTS chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  is_muted boolean DEFAULT false,
  unread_count integer DEFAULT 0
);

-- Create chat_group_members table
CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Add group_id to chat_messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE;

-- Update message trigger to handle group messages
CREATE OR REPLACE FUNCTION update_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chat_id IS NOT NULL THEN
    -- Update direct chat
    UPDATE chats
    SET 
      last_message_at = NEW.created_at,
      unread_count = unread_count + 1
    WHERE id = NEW.chat_id;
  ELSIF NEW.group_id IS NOT NULL THEN
    -- Update group chat
    UPDATE chat_groups
    SET 
      last_message_at = NEW.created_at,
      unread_count = unread_count + 1
    WHERE id = NEW.group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update mark_messages_as_read function
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_chat_id uuid, p_group_id uuid)
RETURNS void AS $$
BEGIN
  IF p_chat_id IS NOT NULL THEN
    -- Mark direct chat messages as read
    UPDATE chat_messages
    SET is_read = true
    WHERE chat_id = p_chat_id
    AND is_read = false;

    -- Reset direct chat unread count
    UPDATE chats
    SET unread_count = 0
    WHERE id = p_chat_id;
  ELSIF p_group_id IS NOT NULL THEN
    -- Mark group chat messages as read
    UPDATE chat_messages
    SET is_read = true
    WHERE group_id = p_group_id
    AND is_read = false;

    -- Reset group chat unread count
    UPDATE chat_groups
    SET unread_count = 0
    WHERE id = p_group_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view groups they are members of"
  ON chat_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON chat_groups
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group members can view membership"
  ON chat_group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_members.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON chat_group_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());