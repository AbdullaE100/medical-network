/*
  # Chat System Implementation

  1. New Tables
    - `chat_groups`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `specialty` (text)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `chat_group_members`
      - `group_id` (uuid, references chat_groups)
      - `member_id` (uuid, references profiles)
      - `role` (text: 'member' or 'admin')
      - `joined_at` (timestamp)

    - `chat_messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `group_id` (uuid, references chat_groups)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `type` (text: 'text', 'image', 'file')
      - `file_url` (text)
      - `file_type` (text)
      - `file_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_read` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for chat access and message creation
    - Add policies for group management

  3. Functions & Triggers
    - Add trigger for updating chat/group timestamps
    - Add function for managing read receipts
*/

-- Create chat_groups table
CREATE TABLE IF NOT EXISTS chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  specialty text,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_group_members table
CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  member_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member', 'admin')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
  file_url text,
  file_type text,
  file_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  CONSTRAINT chat_message_target_check CHECK (
    (chat_id IS NOT NULL AND group_id IS NULL) OR
    (chat_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat group policies
CREATE POLICY "Users can view groups they are members of"
  ON chat_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = id
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON chat_groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Group member policies
CREATE POLICY "Users can view group members"
  ON chat_group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_members.group_id
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members"
  ON chat_group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_members.group_id
      AND member_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Message policies
CREATE POLICY "Users can view messages in their chats/groups"
  ON chat_messages
  FOR SELECT
  USING (
    (
      chat_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM chats
        WHERE id = chat_messages.chat_id
        AND (user_id = auth.uid() OR doctor_id = auth.uid())
      )
    ) OR (
      group_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM chat_group_members
        WHERE group_id = chat_messages.group_id
        AND member_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      (
        chat_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM chats
          WHERE id = chat_messages.chat_id
          AND (user_id = auth.uid() OR doctor_id = auth.uid())
        )
      ) OR (
        group_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM chat_group_members
          WHERE group_id = chat_messages.group_id
          AND member_id = auth.uid()
        )
      )
    )
  );

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_chat_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chat_id IS NOT NULL THEN
    UPDATE chats
    SET updated_at = now()
    WHERE id = NEW.chat_id;
  ELSIF NEW.group_id IS NOT NULL THEN
    UPDATE chat_groups
    SET updated_at = now()
    WHERE id = NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_timestamps
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamps();

-- Read receipts function
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_chat_id uuid DEFAULT NULL, p_group_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_chat_id IS NOT NULL THEN
    UPDATE chat_messages
    SET is_read = true
    WHERE chat_id = p_chat_id
    AND sender_id != auth.uid()
    AND is_read = false;
  ELSIF p_group_id IS NOT NULL THEN
    UPDATE chat_messages
    SET is_read = true
    WHERE group_id = p_group_id
    AND sender_id != auth.uid()
    AND is_read = false;
  END IF;
END;
$$ LANGUAGE plpgsql;