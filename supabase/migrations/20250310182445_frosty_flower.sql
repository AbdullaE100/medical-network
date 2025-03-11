/*
  # Fix Profile RLS Policies

  1. Changes
    - Add INSERT policies for profiles and profile_settings
    - Add PUBLIC SELECT policy for profiles
    - Fix RLS policies for authenticated users
    - Add default profile creation trigger

  2. Security
    - Enable RLS on both tables
    - Allow authenticated users to manage their own data
    - Allow public read access to profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own settings" ON profile_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON profile_settings;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policies for profile_settings
CREATE POLICY "Users can insert their own settings" 
ON profile_settings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can read their own settings" 
ON profile_settings FOR SELECT 
TO authenticated 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own settings" 
ON profile_settings FOR UPDATE 
TO authenticated 
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Create function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (new.id, new.email, now(), now());
  
  INSERT INTO public.profile_settings (profile_id, created_at, updated_at)
  VALUES (new.id, now(), now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();