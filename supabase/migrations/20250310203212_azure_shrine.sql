/*
  # Add Comment Voting Function

  1. New Functions
    - `vote_comment(p_comment_id uuid, p_vote_type text)`: Handles upvoting/downvoting comments
      - Manages vote creation, update, and removal
      - Updates comment upvote counts
      - Ensures data consistency

  2. Changes
    - Adds function to handle comment voting logic
    - Implements optimistic vote counting
    - Handles vote type validation

  3. Security
    - Function is only accessible to authenticated users
    - Users can only vote once per comment
    - Vote types are restricted to 'upvote' and 'downvote'
*/

-- Create function to handle comment voting
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
  v_vote_change integer;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
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

  -- Calculate vote change
  IF v_existing_vote IS NULL THEN
    -- New vote
    INSERT INTO discussion_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_user_id, p_vote_type);
    
    v_vote_change := CASE WHEN p_vote_type = 'upvote' THEN 1 ELSE -1 END;
  ELSIF v_existing_vote = p_vote_type THEN
    -- Remove vote
    DELETE FROM discussion_comment_votes
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
    
    v_vote_change := CASE WHEN p_vote_type = 'upvote' THEN -1 ELSE 1 END;
  ELSE
    -- Change vote
    UPDATE discussion_comment_votes
    SET vote_type = p_vote_type
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
    
    v_vote_change := CASE WHEN p_vote_type = 'upvote' THEN 2 ELSE -2 END;
  END IF;

  -- Update comment vote count
  UPDATE discussion_comments
  SET upvotes_count = GREATEST(0, upvotes_count + v_vote_change)
  WHERE id = p_comment_id;
END;
$$;

-- Create table for comment votes if it doesn't exist
CREATE TABLE IF NOT EXISTS public.discussion_comment_votes (
  comment_id uuid REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- Add RLS policies
ALTER TABLE public.discussion_comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own votes"
  ON public.discussion_comment_votes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.vote_comment TO authenticated;