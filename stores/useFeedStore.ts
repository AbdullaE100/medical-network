import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Post {
  id: string;
  author_id: string;
  content: string;
  media_url: string[];
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_repost: boolean;
  original_post_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string;
    specialty: string;
    hospital: string;
  };
  has_liked?: boolean;
  has_reposted?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string;
    specialty: string;
  };
}

interface Hashtag {
  name: string;
  post_count: number;
}

interface FeedState {
  posts: Post[];
  trendingHashtags: Hashtag[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: (options?: {
    userId?: string;
    hashtag?: string;
    following?: boolean;
  }) => Promise<void>;
  createPost: (content: string, hashtags?: string[], mediaUrls?: string[]) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  repostPost: (postId: string, content?: string) => Promise<void>;
  fetchTrendingHashtags: () => Promise<void>;
  fetchComments: (postId: string) => Promise<Comment[]>;
  createComment: (postId: string, content: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  trendingHashtags: [],
  isLoading: false,
  error: null,

  fetchPosts: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(
            full_name,
            avatar_url,
            specialty,
            hospital
          )
        `)
        .order('created_at', { ascending: false });

      if (options.userId) {
        query = query.eq('author_id', options.userId);
      }

      if (options.hashtag) {
        query = query.contains('hashtags', [options.hashtag]);
      }

      if (options.following) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: following } = await supabase
          .from('doctor_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (following?.length) {
          query = query.in('author_id', following.map(f => f.following_id));
        }
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      // Fetch user's likes and reposts if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user && posts) {
        const [{ data: likes }, { data: reposts }] = await Promise.all([
          supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', posts.map(p => p.id)),
          supabase
            .from('post_reposts')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', posts.map(p => p.id))
        ]);

        const likedPosts = new Set(likes?.map(l => l.post_id));
        const repostedPosts = new Set(reposts?.map(r => r.post_id));

        posts.forEach(post => {
          post.has_liked = likedPosts.has(post.id);
          post.has_reposted = repostedPosts.has(post.id);
        });
      }

      set({ posts: posts || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  createPost: async (content, hashtags = [], mediaUrls = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content,
          hashtags,
          media_url: mediaUrls
        });

      if (error) throw error;

      // Refresh feed
      await get().fetchPosts();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  likePost: async (postId) => {
    try {
      await supabase.rpc('like_post', { p_post_id: postId });

      // Optimistic update
      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes_count: post.has_liked
                  ? post.likes_count - 1
                  : post.likes_count + 1,
                has_liked: !post.has_liked
              }
            : post
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  repostPost: async (postId, content?) => {
    try {
      await supabase.rpc('repost_post', {
        p_post_id: postId,
        p_content: content
      });

      // Optimistic update
      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? {
                ...post,
                reposts_count: post.has_reposted
                  ? post.reposts_count - 1
                  : post.reposts_count + 1,
                has_reposted: !post.has_reposted
              }
            : post
        )
      }));

      // Refresh feed to show the repost
      await get().fetchPosts();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchTrendingHashtags: async () => {
    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('name, post_count')
        .order('post_count', { ascending: false })
        .order('last_used_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      set({ trendingHashtags: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchComments: async (postId) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          author:profiles(
            full_name,
            avatar_url,
            specialty
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    }
  },

  createComment: async (postId, content) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content
        });

      if (error) throw error;

      // Update comments count
      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  }
}));