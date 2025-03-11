import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image as ImageIcon, File, Send, Paperclip } from 'lucide-react-native';
import { useChatStore } from '@/stores/useChatStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

const MessageBubble = ({ message, isCurrentUser }: { 
  message: any; 
  isCurrentUser: boolean;
}) => (
  <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
    {!isCurrentUser && (
      <Image 
        source={{ uri: message.sender?.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400' }} 
        style={styles.messageAvatar} 
      />
    )}
    <View style={[styles.messageContent, isCurrentUser ? styles.currentUserContent : styles.otherUserContent]}>
      {!isCurrentUser && (
        <Text style={styles.senderName}>{message.sender?.full_name}</Text>
      )}
      {message.type === 'image' && message.file_url && (
        <Image source={{ uri: message.file_url }} style={styles.attachmentImage} />
      )}
      {message.type === 'file' && message.file_url && (
        <View style={styles.documentAttachment}>
          <File size={24} color="#0066CC" />
          <Text style={styles.documentName}>{message.file_name}</Text>
        </View>
      )}
      <Text style={[styles.messageText, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
        {message.content}
      </Text>
      <Text style={[styles.messageTime, isCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  </View>
);

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [newMessage, setNewMessage] = useState('');
  const { 
    messages, 
    currentChat,
    isLoading, 
    error,
    fetchMessages,
    sendMessage,
    subscribeToMessages,
    cleanup
  } = useChatStore();

  useEffect(() => {
    // Fetch initial messages
    fetchMessages(id as string);
    
    // Subscribe to new messages
    subscribeToMessages(id as string);

    // Cleanup on unmount
    return () => cleanup();
  }, [id]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading messages..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useChatStore.setState({ error: null })}
        />
      )}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={{ 
              uri: currentChat?.other_user?.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
            }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {currentChat?.other_user?.full_name || 'Loading...'}
            </Text>
            <Text style={styles.headerSpecialty}>
              {currentChat?.other_user?.specialty || 'Doctor'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item} 
            isCurrentUser={item.sender_id === currentChat?.user_id}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        inverted
      />

      <View style={styles.inputContainer}>
        <Pressable style={styles.attachButton}>
          <Paperclip size={24} color="#666666" />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          placeholderTextColor="#666666"
          onSubmitEditing={handleSend}
        />
        <Pressable 
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]} 
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Send size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  headerSpecialty: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
  messageList: {
    padding: 16,
    gap: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  currentUserBubble: {
    justifyContent: 'flex-end',
  },
  otherUserBubble: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  currentUserContent: {
    backgroundColor: '#0066CC',
    borderBottomRightRadius: 4,
  },
  otherUserContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#1A1A1A',
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherUserTime: {
    color: '#666666',
  },
  attachment: {
    marginBottom: 8,
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    padding: 8,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  documentName: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
});