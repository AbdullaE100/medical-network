import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  chat_id: string | null;
  group_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
}

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  user_id?: string;
  doctor_id?: string;
  group_id?: string;
  is_archived: boolean;
  is_muted: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message?: string;
  unread_count: number;
  other_user?: {
    full_name: string;
    avatar_url: string;
    specialty: string;
    is_online: boolean;
  };
  members?: {
    id: string;
    full_name: string;
    avatar_url: string;
  }[];
}

interface ChatState {
  chats: Chat[];
  messages: Message[];
  currentChat: Chat | null;
  isLoading: boolean;
  error: string | null;
  subscriptions: { unsubscribe: () => void }[];
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  subscribeToMessages: (chatId: string) => void;
  startChat: (doctorId: string) => Promise<string>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<string>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  muteChat: (chatId: string) => Promise<void>;
  unmuteChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  cleanup: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: [],
  currentChat: null,
  isLoading: false,
  error: null,
  subscriptions: [],

  fetchChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch direct chats
      const { data: directChats } = await supabase
        .from('chats')
        .select(`
          *,
          other_user:profiles!chats_doctor_id_fkey(
            full_name,
            avatar_url,
            specialty
          ),
          messages:chat_messages(
            content,
            created_at,
            is_read
          )
        `)
        .or(`user_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      // Fetch group chats
      const { data: groupChats } = await supabase
        .from('chat_groups')
        .select(`
          *,
          members:chat_group_members(
            profiles(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .order('last_message_at', { ascending: false });

      // Process and combine chats
      const processedDirectChats = (directChats || []).map(chat => ({
        ...chat,
        type: 'direct' as const,
        last_message: chat.messages?.[0]?.content,
        unread_count: chat.messages?.filter(
          (m: any) => !m.is_read && m.sender_id !== user.id
        ).length || 0,
        messages: undefined
      }));

      const processedGroupChats = (groupChats || []).map(chat => ({
        ...chat,
        type: 'group' as const,
        members: chat.members?.map((m: any) => m.profiles) || [],
      }));

      set({ 
        chats: [...processedDirectChats, ...processedGroupChats].sort(
          (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        )
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  startChat: async (doctorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check for existing chat
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('*')
        .or(`user_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .eq(user.id === doctorId ? 'user_id' : 'doctor_id', doctorId)
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;

      if (existingChat) {
        return existingChat.id;
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          doctor_id: doctorId,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Refresh chats list
      await get().fetchChats();

      return newChat.id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createGroupChat: async (name: string, memberIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members (including creator)
      const members = [...new Set([...memberIds, user.id])];
      const { error: membersError } = await supabase
        .from('chat_group_members')
        .insert(
          members.map(memberId => ({
            group_id: group.id,
            user_id: memberId,
            role: memberId === user.id ? 'admin' : 'member'
          }))
        );

      if (membersError) throw membersError;

      // Refresh chats list
      await get().fetchChats();

      return group.id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  archiveChat: async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_archived: true })
        .eq('id', chatId);

      if (error) throw error;

      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, is_archived: true } : chat
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  unarchiveChat: async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_archived: false })
        .eq('id', chatId);

      if (error) throw error;

      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, is_archived: false } : chat
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  muteChat: async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_muted: true })
        .eq('id', chatId);

      if (error) throw error;

      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, is_muted: true } : chat
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  unmuteChat: async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_muted: false })
        .eq('id', chatId);

      if (error) throw error;

      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, is_muted: false } : chat
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      set(state => ({
        chats: state.chats.filter(chat => chat.id !== chatId)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMessages: async (chatId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if it's a direct chat or group chat
      const [{ data: directChat }, { data: groupChat }] = await Promise.all([
        supabase
          .from('chats')
          .select(`
            *,
            other_user:profiles!chats_doctor_id_fkey(
              full_name,
              avatar_url,
              specialty
            )
          `)
          .eq('id', chatId)
          .maybeSingle(),
        supabase
          .from('chat_groups')
          .select(`
            *,
            members:chat_group_members(
              profiles(
                id,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('id', chatId)
          .maybeSingle()
      ]);

      const chat = directChat || groupChat;
      if (!chat) throw new Error('Chat not found');

      set({ currentChat: chat });

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(
            full_name,
            avatar_url
          )
        `)
        .or(`chat_id.eq.${chatId},group_id.eq.${chatId}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;
      set({ messages: messages || [] });

      // Mark messages as read
      await supabase.rpc('mark_messages_as_read', { 
        p_chat_id: directChat ? chatId : null,
        p_group_id: groupChat ? chatId : null
      });

      // Refresh chats to update unread counts
      await get().fetchChats();
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    try {
      const { currentChat } = get();
      if (!currentChat) throw new Error('No active chat');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const message = {
        chat_id: currentChat.type === 'direct' ? currentChat.id : null,
        group_id: currentChat.type === 'group' ? currentChat.id : null,
        sender_id: user.id,
        content,
        is_read: false
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(message)
        .select(`
          *,
          sender:profiles(
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Optimistic update
      set(state => ({
        messages: [data, ...state.messages]
      }));

      // Refresh chats to update last message
      await get().fetchChats();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  subscribeToMessages: (chatId: string) => {
    const { subscriptions } = get();

    // Clean up existing subscriptions
    subscriptions.forEach(sub => sub.unsubscribe());

    const subscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          const { data: message } = payload;
          
          // Fetch sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', message.sender_id)
            .single();

          // Add new message to state
          set(state => ({
            messages: [{ ...message, sender }, ...state.messages]
          }));

          // Mark message as read if we're the recipient
          const { data: { user } } = await supabase.auth.getUser();
          if (user && message.sender_id !== user.id) {
            await supabase.rpc('mark_messages_as_read', { p_chat_id: chatId });
          }

          // Refresh chats to update last message and unread count
          await get().fetchChats();
        }
      )
      .subscribe();

    set({ subscriptions: [{ unsubscribe: () => subscription.unsubscribe() }] });
  },

  cleanup: () => {
    const { subscriptions } = get();
    subscriptions.forEach(sub => sub.unsubscribe());
    set({
      subscriptions: [],
      currentChat: null,
      messages: [],
    });
  },
}));