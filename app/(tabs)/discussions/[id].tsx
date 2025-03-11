import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MessageCircle, Bookmark, Share2, Send, UserCheck } from 'lucide-react-native';
import { useDiscussionsStore } from '@/stores/useDiscussionsStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

const CommentCard = ({ comment, onReply }: { 
  comment: any; 
  onReply: (parentId: string) => void;
}) => {
  const { voteComment } = useDiscussionsStore();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async () => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      await voteComment(comment.id, 'upvote');
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <Image 
          source={{ 
            uri: comment.author?.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
          }} 
          style={styles.commentAvatar} 
        />
        <View style={styles.commentAuthorInfo}>
          <View style={styles.commentAuthorRow}>
            <Text style={styles.commentAuthorName}>{comment.author?.full_name}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          </View>
          <Text style={styles.commentAuthorSpecialty}>{comment.author?.specialty}</Text>
        </View>
        <Text style={styles.commentTimestamp}>
          {new Date(comment.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.commentContent}>{comment.content}</Text>

      <View style={styles.commentActions}>
        <Pressable onPress={handleVote} style={styles.commentAction}>
          <Heart
            size={16}
            color="#666666"
            fill={comment.has_voted ? '#FF4D4D' : 'transparent'}
          />
          <Text style={styles.commentActionText}>{comment.upvotes_count || 0}</Text>
        </Pressable>

        <Pressable onPress={() => onReply(comment.id)} style={styles.commentAction}>
          <MessageCircle size={16} color="#666666" />
          <Text style={styles.commentActionText}>Reply</Text>
        </Pressable>
      </View>

      {comment.replies?.map((reply: any) => (
        <View key={reply.id} style={styles.replyContainer}>
          <CommentCard comment={reply} onReply={onReply} />
        </View>
      ))}
    </View>
  );
};

export default function DiscussionDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { 
    currentDiscussion,
    comments,
    isLoading,
    error,
    fetchDiscussion,
    fetchComments,
    createComment,
    voteDiscussion,
    bookmarkDiscussion,
    unbookmarkDiscussion
  } = useDiscussionsStore();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscussion(id as string);
    fetchComments(id as string);
  }, [id]);

  const handleVote = async () => {
    if (!currentDiscussion) return;
    await voteDiscussion(currentDiscussion.id, 'upvote');
  };

  const handleBookmark = async () => {
    if (!currentDiscussion) return;
    if (currentDiscussion.is_bookmarked) {
      await unbookmarkDiscussion(currentDiscussion.id);
    } else {
      await bookmarkDiscussion(currentDiscussion.id);
    }
  };

  const handleShare = async () => {
    // Implement share functionality
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await createComment(id as string, newComment.trim(), replyTo);
      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading discussion..." />;
  }

  if (!currentDiscussion) {
    return (
      <View style={styles.container}>
        <ErrorMessage message="Discussion not found" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => useDiscussionsStore.setState({ error: null })}
          />
        )}

        <View style={styles.header}>
          <View style={styles.authorSection}>
            <Image 
              source={{ 
                uri: currentDiscussion.author?.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
              }} 
              style={styles.authorAvatar} 
            />
            <View style={styles.authorInfo}>
              <View style={styles.authorRow}>
                <Text style={styles.authorName}>{currentDiscussion.author?.full_name}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              </View>
              <Text style={styles.authorSpecialty}>{currentDiscussion.author?.specialty}</Text>
              <Text style={styles.authorHospital}>{currentDiscussion.author?.hospital}</Text>
            </View>
            <Text style={styles.timestamp}>
              {new Date(currentDiscussion.created_at).toLocaleDateString()}
            </Text>
          </View>

          <Text style={styles.title}>{currentDiscussion.title}</Text>

          <View style={styles.tags}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {currentDiscussion.category?.name || 'General'}
              </Text>
            </View>
          </View>

          <Text style={styles.discussionContent}>{currentDiscussion.content}</Text>

          <View style={styles.actions}>
            <Pressable onPress={handleVote} style={styles.action}>
              <Heart
                size={24}
                color={currentDiscussion.has_voted ? '#FF4D4D' : '#666666'}
                fill={currentDiscussion.has_voted ? '#FF4D4D' : 'transparent'}
              />
              <Text style={styles.actionText}>{currentDiscussion.upvotes_count}</Text>
            </Pressable>
            <View style={styles.action}>
              <MessageCircle size={24} color="#666666" />
              <Text style={styles.actionText}>{currentDiscussion.comments_count}</Text>
            </View>
            <Pressable onPress={handleBookmark} style={styles.action}>
              <Bookmark
                size={24}
                color={currentDiscussion.is_bookmarked ? '#0066CC' : '#666666'}
                fill={currentDiscussion.is_bookmarked ? '#0066CC' : 'transparent'}
              />
            </Pressable>
            <Pressable onPress={handleShare} style={styles.action}>
              <Share2 size={24} color="#666666" />
            </Pressable>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.map((comment) => (
            <CommentCard 
              key={comment.id} 
              comment={comment}
              onReply={(parentId) => setReplyTo(parentId)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.commentInput}>
        {replyTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyText}>Replying to comment</Text>
            <Pressable onPress={() => setReplyTo(null)}>
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        <TextInput
          placeholder="Add your comment..."
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          placeholderTextColor="#666666"
        />
        <Pressable 
          style={[
            styles.sendButton,
            !newComment.trim() && styles.sendButtonDisabled
          ]} 
          onPress={handleComment}
          disabled={!newComment.trim()}
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 16,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginRight: 4,
  },
  verifiedBadge: {
    backgroundColor: '#0066CC',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  authorSpecialty: {
    fontSize: 14,
    color: '#0066CC',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  authorHospital: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    lineHeight: 28,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#0066CC',
    fontFamily: 'Inter_500Medium',
  },
  discussionContent: {
    fontSize: 16,
    color: '#1A1A1A',
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  commentsSection: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  commentCard: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAuthorName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginRight: 4,
  },
  commentAuthorSpecialty: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  commentContent: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  replyContainer: {
    marginLeft: 24,
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5E5',
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    padding: 16,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  replyText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_500Medium',
  },
  cancelReplyText: {
    fontSize: 12,
    color: '#0066CC',
    fontFamily: 'Inter_500Medium',
  },
  input: {
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sendButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
});