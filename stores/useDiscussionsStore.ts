import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Discussion {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category_id: string;
  is_ama: boolean;
  is_pinned: boolean;
  upvotes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string;
    specialty: string;
    hospital: string;
  };
  category?: {
    name: string;
    slug: string;
  };
  has_voted?: boolean;
  is_bookmarked?: boolean;
}

interface Comment {
  id: string;
  discussion_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  upvotes_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string;
    specialty: string;
  };
  replies?: Comment[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface DiscussionsState {
  discussions: Discussion[];
  currentDiscussion: Discussion | null;
  comments: Comment[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchDiscussions: (options?: {
    category?: string;
    sort?: 'trending' | 'latest' | 'most_commented';
    search?: string;
  }) => Promise<void>;
  fetchDiscussion: (id: string) => Promise<void>;
  createDiscussion: (data: {
    title: string;
    content: string;
    category_id: string;
    is_ama?: boolean;
  }) => Promise<string>;
  updateDiscussion: (id: string, data: Partial<Discussion>) => Promise<void>;
  deleteDiscussion: (id: string) => Promise<void>;
  voteDiscussion: (id: string, voteType: 'upvote' | 'downvote') => Promise<void>;
  bookmarkDiscussion: (id: string) => Promise<void>;
  unbookmarkDiscussion: (id: string) => Promise<void>;
  fetchComments: (discussionId: string) => Promise<void>;
  createComment: (discussionId: string, content: string, parentId?: string) => Promise<void>;
  updateComment: (id: string, content: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  voteComment: (id: string, voteType: 'upvote' | 'downvote') => Promise<void>;
  fetchCategories: () => Promise<void>;
}

export const useDiscussionsStore = create<DiscussionsState>((set, get) => ({
  discussions: [],
  currentDiscussion: null,
  comments: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchDiscussions: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('discussions')
        .select(`
          *,
          author:profiles!discussions_author_id_fkey(
            full_name,
            avatar_url,
            specialty,
            hospital
          ),
          category:discussion_categories(
            name,
            slug
          )
        `);

      if (options.category) {
        const { data: categoryData } = await supabase
          .from('discussion_categories')
          .select('id')
          .eq('slug', options.category)
          .single();

        if (categoryData) {
          query = query.eq('category_id', categoryData.id);
        }
      }

      if (options.sort === 'trending') {
        query = query.order('upvotes_count', { ascending: false });
      } else if (options.sort === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (options.sort === 'most_commented') {
        query = query.order('comments_count', { ascending: false });
      } else {
        // Default sorting by created_at
        query = query.order('created_at', { ascending: false });
      }

      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,content.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user's votes and bookmarks if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        const { data: votes } = await supabase
          .from('discussion_votes')
          .select('discussion_id, vote_type')
          .eq('user_id', user.id)
          .in('discussion_id', data.map(d => d.id));

        const { data: bookmarks } = await supabase
          .from('discussion_bookmarks')
          .select('discussion_id')
          .eq('user_id', user.id)
          .in('discussion_id', data.map(d => d.id));

        const votesMap = new Map(votes?.map(v => [v.discussion_id, v.vote_type]));
        const bookmarksMap = new Map(bookmarks?.map(b => [b.discussion_id, true]));

        data.forEach(discussion => {
          discussion.has_voted = votesMap.get(discussion.id) === 'upvote';
          discussion.is_bookmarked = bookmarksMap.has(discussion.id);
        });
      }

      set({ discussions: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDiscussion: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          author:profiles!discussions_author_id_fkey(
            full_name,
            avatar_url,
            specialty,
            hospital
          ),
          category:discussion_categories(
            name,
            slug
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch user's vote and bookmark status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: votes }, { data: bookmarks }] = await Promise.all([
          supabase
            .from('discussion_votes')
            .select('vote_type')
            .eq('discussion_id', id)
            .eq('user_id', user.id),
          supabase
            .from('discussion_bookmarks')
            .select('discussion_id')
            .eq('discussion_id', id)
            .eq('user_id', user.id)
        ]);

        data.has_voted = votes?.[0]?.vote_type === 'upvote';
        data.is_bookmarked = bookmarks?.length > 0;
      }

      set({ currentDiscussion: data });

      // Increment view count
      await supabase.rpc('increment_discussion_views', { discussion_id: id });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  createDiscussion: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: discussion, error } = await supabase
        .from('discussions')
        .insert({
          ...data,
          author_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return discussion.id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateDiscussion: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('discussions')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        discussions: state.discussions.map(d =>
          d.id === id ? { ...d, ...data } : d
        ),
        currentDiscussion: state.currentDiscussion?.id === id
          ? { ...state.currentDiscussion, ...data }
          : state.currentDiscussion
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDiscussion: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        discussions: state.discussions.filter(d => d.id !== id),
        currentDiscussion: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  voteDiscussion: async (id, voteType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existingVote } = await supabase
        .from('discussion_votes')
        .select('vote_type')
        .eq('discussion_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await supabase
            .from('discussion_votes')
            .delete()
            .eq('discussion_id', id)
            .eq('user_id', user.id);
        } else {
          // Change vote
          await supabase
            .from('discussion_votes')
            .update({ vote_type: voteType })
            .eq('discussion_id', id)
            .eq('user_id', user.id);
        }
      } else {
        // Add new vote
        await supabase
          .from('discussion_votes')
          .insert({
            discussion_id: id,
            user_id: user.id,
            vote_type: voteType
          });
      }

      // Optimistic update
      set(state => ({
        discussions: state.discussions.map(d =>
          d.id === id
            ? {
                ...d,
                upvotes_count: voteType === 'upvote'
                  ? d.upvotes_count + (d.has_voted ? -1 : 1)
                  : d.upvotes_count,
                has_voted: !d.has_voted
              }
            : d
        ),
        currentDiscussion: state.currentDiscussion?.id === id
          ? {
              ...state.currentDiscussion,
              upvotes_count: voteType === 'upvote'
                ? state.currentDiscussion.upvotes_count + (state.currentDiscussion.has_voted ? -1 : 1)
                : state.currentDiscussion.upvotes_count,
              has_voted: !state.currentDiscussion.has_voted
            }
          : state.currentDiscussion
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  bookmarkDiscussion: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('discussion_bookmarks')
        .insert({
          discussion_id: id,
          user_id: user.id
        });

      if (error) throw error;

      // Optimistic update
      set(state => ({
        discussions: state.discussions.map(d =>
          d.id === id ? { ...d, is_bookmarked: true } : d
        ),
        currentDiscussion: state.currentDiscussion?.id === id
          ? { ...state.currentDiscussion, is_bookmarked: true }
          : state.currentDiscussion
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  unbookmarkDiscussion: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('discussion_bookmarks')
        .delete()
        .eq('discussion_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Optimistic update
      set(state => ({
        discussions: state.discussions.map(d =>
          d.id === id ? { ...d, is_bookmarked: false } : d
        ),
        currentDiscussion: state.currentDiscussion?.id === id
          ? { ...state.currentDiscussion, is_bookmarked: false }
          : state.currentDiscussion
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchComments: async (discussionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .select(`
          *,
          author:profiles(
            full_name,
            avatar_url,
            specialty
          )
        `)
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into threads
      const comments = data || [];
      const threads = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      comments.forEach(comment => {
        threads.set(comment.id, { ...comment, replies: [] });
      });

      comments.forEach(comment => {
        if (comment.parent_id) {
          const parent = threads.get(comment.parent_id);
          if (parent) {
            parent.replies?.push(threads.get(comment.id)!);
          }
        } else {
          rootComments.push(threads.get(comment.id)!);
        }
      });

      set({ comments: rootComments });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  createComment: async (discussionId, content, parentId?) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: comment, error } = await supabase
        .from('discussion_comments')
        .insert({
          discussion_id: discussionId,
          author_id: user.id,
          parent_id: parentId,
          content
        })
        .select(`
          *,
          author:profiles(
            full_name,
            avatar_url,
            specialty
          )
        `)
        .single();

      if (error) throw error;

      // Update comments count
      await supabase.rpc('increment_discussion_comments', {
        discussion_id: discussionId
      });

      // Optimistic update
      set(state => {
        if (!parentId) {
          return {
            comments: [...state.comments, { ...comment, replies: [] }]
          };
        }

        const updateReplies = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), comment]
              };
            }
            if (c.replies) {
              return {
                ...c,
                replies: updateReplies(c.replies)
              };
            }
            return c;
          });
        };

        return {
          comments: updateReplies(state.comments)
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateComment: async (id, content) => {
    try {
      const { error } = await supabase
        .from('discussion_comments')
        .update({ content })
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      set(state => {
        const updateCommentContent = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === id) {
              return { ...c, content };
            }
            if (c.replies) {
              return {
                ...c,
                replies: updateCommentContent(c.replies)
              };
            }
            return c;
          });
        };

        return {
          comments: updateCommentContent(state.comments)
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteComment: async (id) => {
    try {
      const { error } = await supabase
        .from('discussion_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      set(state => {
        const removeComment = (comments: Comment[]): Comment[] => {
          return comments.filter(c => {
            if (c.id === id) {
              return false;
            }
            if (c.replies) {
              c.replies = removeComment(c.replies);
            }
            return true;
          });
        };

        return {
          comments: removeComment(state.comments)
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  voteComment: async (id, voteType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.rpc('vote_comment', {
        p_comment_id: id,
        p_vote_type: voteType
      });

      // Optimistic update
      set(state => {
        const updateCommentVotes = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === id) {
              return {
                ...c,
                upvotes_count: voteType === 'upvote'
                  ? c.upvotes_count + 1
                  : c.upvotes_count - 1
              };
            }
            if (c.replies) {
              return {
                ...c,
                replies: updateCommentVotes(c.replies)
              };
            }
            return c;
          });
        };

        return {
          comments: updateCommentVotes(state.comments)
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('discussion_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      set({ categories: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));