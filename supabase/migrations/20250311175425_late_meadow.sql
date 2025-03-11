/*
  # Create Connection System Tables

  1. New Tables
    - `connection_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `status` (enum: pending, accepted, rejected)
      - `created_at` (timestamp)
    
    - `doctor_follows`
      - `follower_id` (uuid, references profiles)
      - `following_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for creating and managing connections
*/

-- Create connection request status enum
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create connection requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status connection_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create doctor follows table
CREATE TABLE IF NOT EXISTS doctor_follows (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_follows ENABLE ROW LEVEL SECURITY;

-- Policies for connection requests
CREATE POLICY "Users can create connection requests"
  ON connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their connection requests"
  ON connection_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can update their received requests"
  ON connection_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Policies for doctor follows
CREATE POLICY "Users can view their follows"
  ON doctor_follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (follower_id, following_id));

CREATE POLICY "Users can create follows"
  ON doctor_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their follows"
  ON doctor_follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() IN (follower_id, following_id));

-- Function to handle accepted connections
CREATE OR REPLACE FUNCTION handle_accepted_connection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    -- Add to doctor_follows table in both directions
    INSERT INTO doctor_follows (follower_id, following_id)
    VALUES 
      (NEW.sender_id, NEW.receiver_id),
      (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for handling accepted connections
CREATE TRIGGER on_connection_accepted
  AFTER UPDATE ON connection_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION handle_accepted_connection();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update follower count for the person being followed
  UPDATE profiles 
  SET followers_count = (
    SELECT COUNT(*) 
    FROM doctor_follows 
    WHERE following_id = NEW.following_id
  )
  WHERE id = NEW.following_id;
  
  -- Update following count for the follower
  UPDATE profiles 
  SET following_count = (
    SELECT COUNT(*) 
    FROM doctor_follows 
    WHERE follower_id = NEW.follower_id
  )
  WHERE id = NEW.follower_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating follower counts
CREATE TRIGGER on_follow_insert
  AFTER INSERT ON doctor_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

CREATE TRIGGER on_follow_delete
  AFTER DELETE ON doctor_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();