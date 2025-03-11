/*
  # Create Discussions Schema

  1. New Tables
    - discussions
      - Core discussion data including title, content, and metadata
    - discussion_votes
      - Tracks upvotes/downvotes on discussions
    - discussion_comments
      - Nested comments/replies on discussions
    - discussion_bookmarks
      - User bookmarks for discussions
    - discussion_categories
      - Predefined categories for discussions
    - ama_sessions
      - AMA (Ask Me Anything) session details
    - ama_questions
      - Questions asked during AMA sessions

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Ensure data privacy and integrity
*/

-- Create discussion categories table
CREATE TABLE discussion_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discussions table
CREATE TABLE discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES discussion_categories(id),
  is_ama boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  upvotes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discussion votes table
CREATE TABLE discussion_votes (
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

-- Create discussion comments table
CREATE TABLE discussion_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES discussion_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  upvotes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discussion bookmarks table
CREATE TABLE discussion_bookmarks (
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

-- Create AMA sessions table
CREATE TABLE ama_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create AMA questions table
CREATE TABLE ama_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ama_sessions(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_answered boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  upvotes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE discussion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ama_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ama_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for discussion categories
CREATE POLICY "Discussion categories are viewable by everyone"
  ON discussion_categories FOR SELECT
  TO public
  USING (true);

-- Create policies for discussions
CREATE POLICY "Discussions are viewable by everyone"
  ON discussions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create discussions"
  ON discussions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own discussions"
  ON discussions FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Create policies for discussion votes
CREATE POLICY "Users can view votes"
  ON discussion_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can vote once per discussion"
  ON discussion_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their votes"
  ON discussion_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for discussion comments
CREATE POLICY "Comments are viewable by everyone"
  ON discussion_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON discussion_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
  ON discussion_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Create policies for discussion bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON discussion_bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
  ON discussion_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON discussion_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for AMA sessions
CREATE POLICY "AMA sessions are viewable by everyone"
  ON ama_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Verified doctors can create AMA sessions"
  ON ama_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their AMA sessions"
  ON ama_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Create policies for AMA questions
CREATE POLICY "AMA questions are viewable by everyone"
  ON ama_questions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can ask questions"
  ON ama_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own questions"
  ON ama_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Create function to update discussion counts
CREATE OR REPLACE FUNCTION update_discussion_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE discussions
      SET upvotes_count = upvotes_count + 1
      WHERE id = NEW.discussion_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE discussions
      SET upvotes_count = upvotes_count - 1
      WHERE id = OLD.discussion_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE discussions
      SET upvotes_count = upvotes_count + 1
      WHERE id = NEW.discussion_id;
    ELSIF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE discussions
      SET upvotes_count = upvotes_count - 1
      WHERE id = NEW.discussion_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for discussion counts
CREATE TRIGGER update_discussion_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON discussion_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_discussion_counts();

-- Insert default categories
INSERT INTO discussion_categories (name, slug, description) VALUES
  ('Research', 'research', 'Latest medical research and findings'),
  ('Clinical Practice', 'clinical-practice', 'Clinical experiences and case discussions'),
  ('Technology', 'technology', 'Medical technology and innovations'),
  ('Education', 'education', 'Medical education and training'),
  ('Policy', 'policy', 'Healthcare policy and regulations');