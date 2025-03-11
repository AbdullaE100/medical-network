/*
  # Create Connection System Tables

  1. New Tables
    - `connection_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `status` (text, enum: pending, accepted, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `doctor_follows`
      - `follower_id` (uuid, references profiles)
      - `following_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for connection management
*/

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create doctor_follows table
CREATE TABLE IF NOT EXISTS doctor_follows (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_follows ENABLE ROW LEVEL SECURITY;

-- Policies for connection_requests
CREATE POLICY "Users can view their connection requests"
  ON connection_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can create connection requests"
  ON connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their connection requests"
  ON connection_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

-- Policies for doctor_follows
CREATE POLICY "Users can view follows"
  ON doctor_follows
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create follows"
  ON doctor_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (follower_id, following_id));

CREATE POLICY "Users can delete follows"
  ON doctor_follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() IN (follower_id, following_id));

-- Function to handle connection acceptance
CREATE OR REPLACE FUNCTION handle_connection_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create bidirectional follow relationship
    INSERT INTO doctor_follows (follower_id, following_id)
    VALUES 
      (NEW.sender_id, NEW.receiver_id),
      (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT DO NOTHING;
    
    -- Update followers count for both users
    UPDATE profiles 
    SET followers_count = followers_count + 1
    WHERE id IN (NEW.sender_id, NEW.receiver_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for connection acceptance
CREATE TRIGGER on_connection_accepted
  AFTER UPDATE ON connection_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION handle_connection_acceptance();