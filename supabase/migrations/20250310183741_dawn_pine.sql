/*
  # Network Tables Setup

  1. New Tables
    - `doctor_follows`
      - Tracks follow relationships between doctors
      - Contains follower_id and following_id
      - Includes timestamp for follow date
    
    - `doctor_recommendations`
      - Stores recommended connections for doctors
      - Based on specialty and engagement metrics
      - Includes recommendation score and reason

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Protect follow relationships
*/

-- Doctor follows table
CREATE TABLE IF NOT EXISTS doctor_follows (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE doctor_follows ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_follows
CREATE POLICY "Users can view their follow relationships"
  ON doctor_follows
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = follower_id OR 
    auth.uid() = following_id
  );

CREATE POLICY "Users can follow/unfollow"
  ON doctor_follows
  FOR ALL
  TO authenticated
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- Doctor recommendations table
CREATE TABLE IF NOT EXISTS doctor_recommendations (
  doctor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recommended_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score float NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (doctor_id, recommended_id)
);

-- Enable RLS
ALTER TABLE doctor_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_recommendations
CREATE POLICY "Users can view their recommendations"
  ON doctor_recommendations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = doctor_id);

-- Add trigger to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET followers_count = followers_count - 1 
    WHERE id = OLD.following_id;
    
    UPDATE profiles 
    SET following_count = following_count - 1 
    WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follower_counts
AFTER INSERT OR DELETE ON doctor_follows
FOR EACH ROW
EXECUTE FUNCTION update_follower_counts();