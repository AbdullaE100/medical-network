/*
  # Profile and Settings Schema

  1. New Tables
    - `profiles`
      - Basic doctor profile information
      - Includes name, specialty, hospital, location, bio
      - Tracks followers, following, and posts counts
      - Stores expertise as text array
    
    - `profile_settings`
      - Privacy and communication preferences
      - Controls who can follow and message
      - Manages anonymous posting settings

  2. Security
    - Row Level Security (RLS) enabled on both tables
    - Policies ensure users can only access their own data
    - Automatic timestamp updates via triggers
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  specialty text,
  hospital text,
  location text,
  bio text,
  avatar_url text,
  expertise text[],
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profile_settings table
CREATE TABLE IF NOT EXISTS profile_settings (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  allow_messages_from text DEFAULT 'everyone',
  allow_anonymous_posts boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_profile_settings_updated_at ON profile_settings;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_settings_updated_at
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own settings" ON profile_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON profile_settings;

-- Create RLS policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for profile_settings
CREATE POLICY "Users can read own settings"
  ON profile_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own settings"
  ON profile_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);