import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, Alert } from 'react-native';
import { Link } from 'expo-router';
import { Search, Plus, Circle, Archive, Bell, BellOff, Trash2 } from 'lucide-react-native';
import { useChatStore } from '@/stores/useChatStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Swipeable } from 'react-native-gesture-handler';

const ChatItem = ({ chat, onArchive, onMute, onDelete }: { 
  chat: any; 
  onArchive: () => void;
  onMute: () => void;
  onDelete: () => void;
}) => {
  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <Pressable style={[styles.swipeAction, styles.archiveAction]} onPress={onArchive}>
        <Archive size={20} color="#FFFFFF" />
      </Pressable>
      <Pressable style={[styles.swipeAction, styles.muteAction]} onPress={onMute}>
        {chat.is_muted ? (
          <BellOff size={20} color="#FFFFFF" />
        ) : (
          <Bell size={20} color="#FFFFFF" />
        )}
      </Pressable>
      <Pressable style={[styles.swipeAction, styles.deleteAction]} onPress={onDelete}>
        <Trash2 size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <Link href={`/chat/${chat.id}`} asChild>
        <Pressable style={[styles.chatItem, chat.is_archived && styles.archivedChat]}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: chat.other_user?.avatar_url }} 
              style={styles.avatar} 
            />
            {chat.other_user?.is_online && (
              <View style={styles.onlineIndicator} />
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName}>{chat.other_user?.full_name}</Text>
              <Text style={styles.timestamp}>{chat.last_message_at}</Text>
            </View>

            <View style={styles.chatPreview}>
              <Text numberOfLines={1} style={[
                styles.lastMessage,
                chat.is_muted && styles.mutedText
              ]}>
                {chat.last_message || 'No messages yet'}
              </Text>
              {chat.unread_count > 0 && !chat.is_muted && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{chat.unread_count}</Text>
                </View>
              )}
            </View>

            {chat.is_muted && (
              <View style={styles.mutedBadge}>
                <BellOff size={12} color="#666666" />
              </View>
            )}
          </View>
        </Pressable>
      </Link>
    </Swipeable>
  );
};

export default function ChatList() {
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    chats,
    isLoading, 
    error,
    fetchChats,
    archiveChat,
    unarchiveChat,
    muteChat,
    unmuteChat,
    deleteChat
  } = useChatStore();

  useEffect(() => {
    fetchChats();
  }, []);

  const handleArchive = async (chatId: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await unarchiveChat(chatId);
      } else {
        await archiveChat(chatId);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to archive chat');
    }
  };

  const handleMute = async (chatId: string, isMuted: boolean) => {
    try {
      if (isMuted) {
        await unmuteChat(chatId);
      } else {
        await muteChat(chatId);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mute chat');
    }
  };

  const handleDelete = async (chatId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chatId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete chat');
            }
          }
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading chats..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Link href="/chat/new" asChild>
          <Pressable style={styles.newChatButton}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.newChatText}>New Chat</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666666" />
          <TextInput
            placeholder="Search messages"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666666"
          />
        </View>
      </View>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useChatStore.setState({ error: null })}
        />
      )}

      <FlatList
        data={chats}
        renderItem={({ item }) => (
          <ChatItem 
            chat={item}
            onArchive={() => handleArchive(item.id, item.is_archived)}
            onMute={() => handleMute(item.id, item.is_muted)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start a conversation with a doctor
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  chatList: {
    padding: 16,
    gap: 12,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  archivedChat: {
    opacity: 0.6,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    marginRight: 8,
  },
  mutedText: {
    color: '#999999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  mutedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    padding: 4,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  swipeAction: {
    width: 48,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveAction: {
    backgroundColor: '#0066CC',
  },
  muteAction: {
    backgroundColor: '#666666',
  },
  deleteAction: {
    backgroundColor: '#CC0000',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
});