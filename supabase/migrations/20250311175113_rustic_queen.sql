/*
  # Add Connection Requests System

  1. New Tables
    - `connection_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `status` (enum: pending, accepted, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `connection_requests` table
    - Add policies for creating and managing requests
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
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

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