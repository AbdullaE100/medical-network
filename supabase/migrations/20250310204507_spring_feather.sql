/*
  # Add Discussion Voting Functions

  1. New Functions
    - `vote_comment`: Handles upvoting/downvoting comments
    - `update_comment_vote_counts`: Updates vote counts when votes change

  2. Changes
    - Adds function to handle comment voting
    - Adds trigger to update vote counts
    - Ensures atomic operations for vote counting
*/

-- Function to handle comment voting
CREATE OR REPLACE FUNCTION vote_comment(
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

  -- Check if user has already voted
  SELECT vote_type INTO v_existing_vote
  FROM discussion_comment_votes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;

  IF v_existing_vote IS NULL THEN
    -- Insert new vote
    INSERT INTO discussion_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_user_id, p_vote_type);
  ELSIF v_existing_vote = p_vote_type THEN
    -- Remove vote if same type
    DELETE FROM discussion_comment_votes
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
  ELSE
    -- Update vote type
    UPDATE discussion_comment_votes
    SET vote_type = p_vote_type
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
  END IF;
END;
$$;

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- Decrement vote count
    UPDATE discussion_comments
    SET upvotes_count = (
      SELECT COUNT(*)
      FROM discussion_comment_votes
      WHERE comment_id = OLD.comment_id
      AND vote_type = 'upvote'
    )
    WHERE id = OLD.comment_id;
    RETURN OLD;
  ELSIF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Update vote count
    UPDATE discussion_comments
    SET upvotes_count = (
      SELECT COUNT(*)
      FROM discussion_comment_votes
      WHERE comment_id = NEW.comment_id
      AND vote_type = 'upvote'
    )
    WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS update_comment_vote_counts ON discussion_comment_votes;
CREATE TRIGGER update_comment_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON discussion_comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_vote_counts();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION vote_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_comment_vote_counts() TO authenticated;