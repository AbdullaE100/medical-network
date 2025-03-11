export interface Profile {
  id: string;
  full_name: string;
  specialty: string;
  hospital: string;
  location: string;
  bio: string;
  avatar_url: string;
  expertise: string[];
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileSettings {
  profile_id: string;
  is_private: boolean;
  allow_messages_from: 'everyone' | 'followers';
  allow_anonymous_posts: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorFollow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface DoctorRecommendation {
  doctor_id: string;
  recommended_id: string;
  score: number;
  reason: string;
  created_at: string;
}