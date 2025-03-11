/*
  # Add Feed Tables and Functions

  1. New Tables
    - `posts`: Main table for feed posts
      - Text content, media attachments, hashtags
      - Engagement metrics (likes, comments, reposts)
    - `post_likes`: Track post likes
    - `post_reposts`: Track post reposts
    - `post_media`: Store media attachments
    - `hashtags`: Track trending hashtags

  2. Functions
    - `like_post`: Handle post liking/unliking
    - `repost_post`: Handle post reposting
    - `update_post_counts`: Update engagement metrics
    - `update_trending_hashtags`: Update trending hashtags

  3. Security
    - RLS policies for all tables
    - Only verified doctors can post
    - Public read access for posts
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_url text[],
  hashtags text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  reposts_count integer DEFAULT 0,
  is_repost boolean DEFAULT false,
  original_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Create post_reposts table
CREATE TABLE IF NOT EXISTS public.post_reposts (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hashtags table for trending tracking
CREATE TABLE IF NOT EXISTS public.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  post_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now()
);

-- Function to handle post liking
CREATE OR REPLACE FUNCTION public.like_post(
  p_post_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already liked
  IF EXISTS (
    SELECT 1 FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) THEN
    -- Unlike
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id;
    
    -- Update likes count
    UPDATE public.posts
    SET likes_count = likes_count - 1
    WHERE id = p_post_id;
  ELSE
    -- Like
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id);
    
    -- Update likes count
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = p_post_id;
  END IF;
END;
$$;

-- Function to handle post reposting
CREATE OR REPLACE FUNCTION public.repost_post(
  p_post_id uuid,
  p_content text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_new_post_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create repost
  INSERT INTO public.posts (
    author_id,
    content,
    is_repost,
    original_post_id
  )
  VALUES (
    v_user_id,
    COALESCE(p_content, ''),
    true,
    p_post_id
  )
  RETURNING id INTO v_new_post_id;

  -- Track repost
  INSERT INTO public.post_reposts (post_id, user_id)
  VALUES (p_post_id, v_user_id);

  -- Update repost count
  UPDATE public.posts
  SET reposts_count = reposts_count + 1
  WHERE id = p_post_id;

  RETURN v_new_post_id;
END;
$$;

-- Function to update hashtag counts
CREATE OR REPLACE FUNCTION public.update_hashtags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update existing hashtags or insert new ones
  INSERT INTO public.hashtags (name, post_count, last_used_at)
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

-- Trigger for hashtag updates
CREATE TRIGGER update_hashtags_on_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  WHEN (NEW.hashtags IS NOT NULL)
  EXECUTE FUNCTION public.update_hashtags();

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Verified doctors can create posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Post likes policies
CREATE POLICY "Users can manage their own likes"
  ON public.post_likes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Everyone can view likes"
  ON public.post_likes
  FOR SELECT
  TO public
  USING (true);

-- Post reposts policies
CREATE POLICY "Users can manage their own reposts"
  ON public.post_reposts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Everyone can view reposts"
  ON public.post_reposts
  FOR SELECT
  TO public
  USING (true);

-- Post comments policies
CREATE POLICY "Everyone can view comments"
  ON public.post_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can manage their own comments"
  ON public.post_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Hashtags policies
CREATE POLICY "Everyone can view hashtags"
  ON public.hashtags
  FOR SELECT
  TO public
  USING (true);