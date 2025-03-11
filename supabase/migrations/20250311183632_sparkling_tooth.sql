/*
  # Add Chat Management Columns

  1. New Columns
    - `last_message_at` (timestamp) - Tracks when the last message was sent
    - `is_archived` (boolean) - Indicates if the chat is archived
    - `is_muted` (boolean) - Indicates if notifications are muted
    - `unread_count` (integer) - Number of unread messages

  2. Functions
    - Updates last_message_at when a new message is sent
    - Increments/decrements unread count
    - Marks messages as read

  3. Triggers
    - Automatically updates last_message_at and unread_count
*/

-- Add new columns to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0;

-- Function to update last_message_at and unread_count
CREATE OR REPLACE FUNCTION update_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_message_at
  UPDATE chats
  SET 
    last_message_at = NEW.created_at,
    unread_count = unread_count + 1
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat when new message is sent
DROP TRIGGER IF EXISTS update_chat_trigger ON chat_messages;
CREATE TRIGGER update_chat_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_chat_id uuid)
RETURNS void AS $$
BEGIN
  -- Mark messages as read
  UPDATE chat_messages
  SET is_read = true
  WHERE chat_id = p_chat_id
  AND is_read = false;

  -- Reset unread count
  UPDATE chats
  SET unread_count = 0
  WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Update existing chats with last message timestamp
UPDATE chats c
SET last_message_at = (
  SELECT created_at
  FROM chat_messages m
  WHERE m.chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE last_message_at IS NULL;