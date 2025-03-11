/*
  # Create Chat System Tables

  1. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `doctor_id` (uuid, references profiles)
      - `is_archived` (boolean)
      - `is_muted` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_message_at` (timestamp)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `is_read` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for chat access and message management
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_archived boolean DEFAULT false,
  is_muted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  UNIQUE(user_id, doctor_id)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chats
CREATE POLICY "Users can view their chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (user_id, doctor_id));

CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (user_id, doctor_id));

CREATE POLICY "Users can update their chats"
  ON chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (user_id, doctor_id));

CREATE POLICY "Users can delete their chats"
  ON chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() IN (user_id, doctor_id));

-- Policies for chat messages
CREATE POLICY "Users can view chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_id
      AND auth.uid() IN (user_id, doctor_id)
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_id
      AND auth.uid() IN (user_id, doctor_id)
    )
    AND auth.uid() = sender_id
  );

-- Function to update chat last_message_at
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating chat timestamp
CREATE TRIGGER on_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamp();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_chat_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE chat_id = p_chat_id
  AND sender_id != auth.uid()
  AND is_read = false;
END;
$$ LANGUAGE plpgsql;