/*
  # Fix mark_messages_as_read Function

  1. Changes
    - Drop existing mark_messages_as_read functions
    - Create new unified function with optional group_id parameter
    - Add proper security checks

  2. Security
    - Maintain proper access control
    - Ensure message privacy
    - Add proper parameter validation
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid, uuid);

-- Create new unified function
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_chat_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate that exactly one parameter is provided
  IF (p_chat_id IS NULL AND p_group_id IS NULL) OR (p_chat_id IS NOT NULL AND p_group_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one of p_chat_id or p_group_id must be provided';
  END IF;

  -- Handle direct messages
  IF p_chat_id IS NOT NULL THEN
    -- Verify user has access to the chat
    IF NOT EXISTS (
      SELECT 1 FROM chats
      WHERE id = p_chat_id
      AND (user_id = auth.uid() OR doctor_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    -- Mark messages as read
    UPDATE chat_messages
    SET is_read = true
    WHERE chat_id = p_chat_id
    AND sender_id != auth.uid()
    AND NOT is_read;
  END IF;

  -- Handle group messages
  IF p_group_id IS NOT NULL THEN
    -- Verify user is a member of the group
    IF NOT EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = p_group_id
      AND member_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    -- Mark messages as read
    UPDATE chat_messages
    SET is_read = true
    WHERE group_id = p_group_id
    AND sender_id != auth.uid()
    AND NOT is_read;
  END IF;
END;
$$;