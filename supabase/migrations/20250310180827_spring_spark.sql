/*
  # Create profiles and settings tables

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `specialty` (text)
      - `hospital` (text)
      - `location` (text)
      - `bio` (text)
      - `avatar_url` (text)
      - `expertise` (text[])
      - `followers_count` (int)
      - `following_count` (int)
      - `posts_count` (int)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `profile_settings`
      - `profile_id` (uuid, primary key, references profiles)
      - `is_private` (boolean)
      - `allow_messages_from` (text)
      - `allow_anonymous_posts` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read their own profile and settings
      - Update their own profile and settings
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  specialty text,
  hospital text,
  location text,
  bio text,
  avatar_url text,
  expertise text[],
  followers_count int DEFAULT 0,
  following_count int DEFAULT 0,
  posts_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profile_settings table
CREATE TABLE IF NOT EXISTS profile_settings (
  profile_id uuid PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  allow_messages_from text DEFAULT 'everyone',
  allow_anonymous_posts boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view any profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policies for profile_settings
CREATE POLICY "Users can view own settings"
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_settings_updated_at
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();