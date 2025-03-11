/*
  # Create Discussions Schema

  1. New Tables
    - discussion_categories: Categories for organizing discussions
    - discussions: Main discussions table
    - discussion_comments: Comments on discussions
    - discussion_votes: User votes on discussions
    - discussion_bookmarks: User bookmarks for discussions

  2. Functions
    - update_updated_at_column: Updates timestamp on record changes
    - increment_discussion_views: Increments view count
    - increment_discussion_comments: Increments comment count
    - update_discussion_vote_counts: Updates vote counts

  3. Security
    - RLS policies for all tables
    - Public read access for categories and discussions
    - Authenticated user access for interactions
*/

-- Create or replace the updated_at function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create discussion categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussion_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE discussion_categories ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create discussions table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES discussion_categories(id),
  is_ama boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  upvotes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create discussion comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussion_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES discussion_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  upvotes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create discussion votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussion_votes (
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create discussion bookmarks table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussion_bookmarks (
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE discussion_bookmarks ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create functions for discussion management
CREATE OR REPLACE FUNCTION increment_discussion_views(discussion_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE discussions
  SET views_count = views_count + 1
  WHERE id = discussion_id;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION increment_discussion_comments(discussion_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE discussions
  SET comments_count = comments_count + 1
  WHERE id = discussion_id;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_discussion_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE discussions SET upvotes_count = upvotes_count + 1 WHERE id = NEW.discussion_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE discussions SET upvotes_count = upvotes_count - 1 WHERE id = OLD.discussion_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE discussions SET upvotes_count = upvotes_count - 1 WHERE id = NEW.discussion_id;
    ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE discussions SET upvotes_count = upvotes_count + 1 WHERE id = NEW.discussion_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_discussions_updated_at ON discussions;
DROP TRIGGER IF EXISTS update_discussion_comments_updated_at ON discussion_comments;
DROP TRIGGER IF EXISTS update_discussion_vote_counts ON discussion_votes;

-- Create triggers
CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_comments_updated_at
  BEFORE UPDATE ON discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_vote_counts
  AFTER INSERT OR DELETE OR UPDATE ON discussion_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_discussion_vote_counts();

-- Add RLS policies with safety checks

-- Discussion categories policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Discussion categories are viewable by everyone" ON discussion_categories;
  CREATE POLICY "Discussion categories are viewable by everyone"
    ON discussion_categories
    FOR SELECT
    TO public
    USING (true);
END $$;

-- Discussions policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Discussions are viewable by everyone" ON discussions;
  CREATE POLICY "Discussions are viewable by everyone"
    ON discussions
    FOR SELECT
    TO public
    USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create discussions" ON discussions;
  CREATE POLICY "Authenticated users can create discussions"
    ON discussions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

  DROP POLICY IF EXISTS "Users can update their own discussions" ON discussions;
  CREATE POLICY "Users can update their own discussions"
    ON discussions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
END $$;

-- Discussion comments policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Comments are viewable by everyone" ON discussion_comments;
  CREATE POLICY "Comments are viewable by everyone"
    ON discussion_comments
    FOR SELECT
    TO public
    USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create comments" ON discussion_comments;
  CREATE POLICY "Authenticated users can create comments"
    ON discussion_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

  DROP POLICY IF EXISTS "Users can update their own comments" ON discussion_comments;
  CREATE POLICY "Users can update their own comments"
    ON discussion_comments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);
END $$;

-- Discussion votes policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can vote once per discussion" ON discussion_votes;
  CREATE POLICY "Users can vote once per discussion"
    ON discussion_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can change their votes" ON discussion_votes;
  CREATE POLICY "Users can change their votes"
    ON discussion_votes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view votes" ON discussion_votes;
  CREATE POLICY "Users can view votes"
    ON discussion_votes
    FOR SELECT
    TO authenticated
    USING (true);
END $$;

-- Discussion bookmarks policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create bookmarks" ON discussion_bookmarks;
  CREATE POLICY "Users can create bookmarks"
    ON discussion_bookmarks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON discussion_bookmarks;
  CREATE POLICY "Users can delete their own bookmarks"
    ON discussion_bookmarks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view their own bookmarks" ON discussion_bookmarks;
  CREATE POLICY "Users can view their own bookmarks"
    ON discussion_bookmarks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
END $$;

-- Insert initial categories
INSERT INTO discussion_categories (name, slug, description) VALUES
  ('Research', 'research', 'Latest medical research and findings'),
  ('Clinical Cases', 'clinical-cases', 'Interesting patient cases and treatment discussions'),
  ('Technology', 'technology', 'Medical technology and innovation'),
  ('Education', 'education', 'Medical education and training resources'),
  ('General Discussion', 'general', 'General medical topics and discussions')
ON CONFLICT (slug) DO NOTHING;