/*
  # Feed Functionality

  1. New Tables
    - `posts`: Main posts table
    - `post_likes`: Tracks post likes
    - `post_reposts`: Tracks post reposts
    - `post_comments`: Stores post comments
    - `hashtags`: Tracks trending hashtags

  2. Functions
    - `like_post`: Handles post liking/unliking
    - `repost_post`: Handles reposting
    - `update_post_counts`: Updates engagement counts
    - `update_hashtags`: Updates hashtag statistics

  3. Security
    - RLS policies for all tables
    - Function permissions
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON post_likes;
DROP POLICY IF EXISTS "Authenticated users can manage their likes" ON post_likes;
DROP POLICY IF EXISTS "Post reposts are viewable by everyone" ON post_reposts;
DROP POLICY IF EXISTS "Authenticated users can manage their reposts" ON post_reposts;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON post_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON post_comments;
DROP POLICY IF EXISTS "Hashtags are viewable by everyone" ON hashtags;

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_url text[],
  hashtags text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  reposts_count integer DEFAULT 0,
  is_repost boolean DEFAULT false,
  original_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Create post_reposts table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_reposts (
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Create post_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hashtags table if it doesn't exist
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  post_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now()
);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS like_post(uuid);
DROP FUNCTION IF EXISTS repost_post(uuid, text);

-- Function to handle post liking
CREATE OR REPLACE FUNCTION like_post(p_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_liked boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already liked
  IF EXISTS (
    SELECT 1 FROM post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) THEN
    -- Unlike
    DELETE FROM post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id;
    v_liked := false;
  ELSE
    -- Like
    INSERT INTO post_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id);
    v_liked := true;
  END IF;

  RETURN v_liked;
END;
$$;

-- Function to handle reposting
CREATE OR REPLACE FUNCTION repost_post(p_post_id uuid, p_content text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_original_post posts;
  v_reposted boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get original post
  SELECT * INTO v_original_post
  FROM posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Check if already reposted
  IF EXISTS (
    SELECT 1 FROM post_reposts
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) THEN
    -- Remove repost
    DELETE FROM post_reposts
    WHERE post_id = p_post_id AND user_id = v_user_id;

    -- Delete repost post if exists
    DELETE FROM posts
    WHERE original_post_id = p_post_id AND author_id = v_user_id;
    
    v_reposted := false;
  ELSE
    -- Create repost
    INSERT INTO post_reposts (post_id, user_id)
    VALUES (p_post_id, v_user_id);

    -- Create repost post
    INSERT INTO posts (
      author_id,
      content,
      media_url,
      hashtags,
      is_repost,
      original_post_id
    ) VALUES (
      v_user_id,
      COALESCE(p_content, v_original_post.content),
      v_original_post.media_url,
      v_original_post.hashtags,
      true,
      p_post_id
    );
    
    v_reposted := true;
  END IF;

  RETURN v_reposted;
END;
$$;

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- Update counts when removing engagement
    IF TG_TABLE_NAME = 'post_likes' THEN
      UPDATE posts
      SET likes_count = likes_count - 1
      WHERE id = OLD.post_id;
    ELSIF TG_TABLE_NAME = 'post_reposts' THEN
      UPDATE posts
      SET reposts_count = reposts_count - 1
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'INSERT') THEN
    -- Update counts when adding engagement
    IF TG_TABLE_NAME = 'post_likes' THEN
      UPDATE posts
      SET likes_count = likes_count + 1
      WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'post_reposts' THEN
      UPDATE posts
      SET reposts_count = reposts_count + 1
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update hashtag statistics
CREATE OR REPLACE FUNCTION update_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update existing hashtags or create new ones
  INSERT INTO hashtags (name, post_count, last_used_at)
  SELECT 
    unnest(NEW.hashtags),
    1,
    now()
  ON CONFLICT (name) DO UPDATE
  SET 
    post_count = hashtags.post_count + 1,
    last_used_at = now();

  RETURN NEW;
END;
$$;

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can manage their own posts"
  ON posts FOR ALL
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Post likes are viewable by everyone"
  ON post_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage their likes"
  ON post_likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Post reposts are viewable by everyone"
  ON post_reposts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage their reposts"
  ON post_reposts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone"
  ON post_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can manage their own comments"
  ON post_comments FOR ALL
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Hashtags are viewable by everyone"
  ON hashtags FOR SELECT
  TO public
  USING (true);

-- Create triggers
DROP TRIGGER IF EXISTS update_post_like_counts ON post_likes;
CREATE TRIGGER update_post_like_counts
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_counts();

DROP TRIGGER IF EXISTS update_post_repost_counts ON post_reposts;
CREATE TRIGGER update_post_repost_counts
  AFTER INSERT OR DELETE ON post_reposts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_counts();

DROP TRIGGER IF EXISTS update_hashtags_on_post ON posts;
CREATE TRIGGER update_hashtags_on_post
  AFTER INSERT ON posts
  FOR EACH ROW
  WHEN (NEW.hashtags IS NOT NULL)
  EXECUTE FUNCTION update_hashtags();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION like_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION repost_post(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_post_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION update_hashtags() TO authenticated;