/*
  # Add vote_comment function

  1. New Functions
    - `vote_comment` - Handles upvoting/downvoting comments
      - Parameters:
        - p_comment_id (uuid) - The ID of the comment to vote on
        - p_vote_type (text) - The type of vote ('upvote' or 'downvote')
      - Returns: void
      - Description: Manages comment voting, updating vote counts and handling vote changes

  2. Security
    - Function is accessible to authenticated users only
    - Validates vote type input
    - Handles existing votes appropriately
*/

CREATE OR REPLACE FUNCTION public.vote_comment(
  p_comment_id uuid,
  p_vote_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_existing_vote text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate vote type
  IF p_vote_type NOT IN ('upvote', 'downvote') THEN
    RAISE EXCEPTION 'Invalid vote type';
  END IF;

  -- Check for existing vote
  SELECT vote_type INTO v_existing_vote
  FROM discussion_comment_votes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;

  -- Handle vote
  IF v_existing_vote IS NULL THEN
    -- Insert new vote
    INSERT INTO discussion_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_user_id, p_vote_type);

    -- Update comment vote count
    UPDATE discussion_comments
    SET upvotes_count = CASE
      WHEN p_vote_type = 'upvote' THEN upvotes_count + 1
      ELSE upvotes_count - 1
    END
    WHERE id = p_comment_id;
  ELSIF v_existing_vote = p_vote_type THEN
    -- Remove vote if same type
    DELETE FROM discussion_comment_votes
    WHERE comment_id = p_comment_id AND user_id = v_user_id;

    -- Update comment vote count
    UPDATE discussion_comments
    SET upvotes_count = CASE
      WHEN p_vote_type = 'upvote' THEN upvotes_count - 1
      ELSE upvotes_count + 1
    END
    WHERE id = p_comment_id;
  ELSE
    -- Change vote type
    UPDATE discussion_comment_votes
    SET vote_type = p_vote_type
    WHERE comment_id = p_comment_id AND user_id = v_user_id;

    -- Update comment vote count
    UPDATE discussion_comments
    SET upvotes_count = CASE
      WHEN p_vote_type = 'upvote' THEN upvotes_count + 2
      ELSE upvotes_count - 2
    END
    WHERE id = p_comment_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.vote_comment(uuid, text) TO authenticated;