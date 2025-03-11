import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable, FlatList, RefreshControl } from 'react-native';
import { Link } from 'expo-router';
import { Heart, MessageCircle, Repeat2, Bookmark, Share2, Search, TrendingUp, Plus } from 'lucide-react-native';
import { useFeedStore, Post } from '@/stores/useFeedStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

const PostCard = ({ post }: { post: Post }) => {
  const { likePost, repostPost } = useFeedStore();
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await likePost(post.id);
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    if (isReposting) return;
    setIsReposting(true);
    try {
      await repostPost(post.id);
    } catch (error) {
      console.error('Error reposting:', error);
    } finally {
      setIsReposting(false);
    }
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image 
          source={{ 
            uri: post.author?.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
          }} 
          style={styles.avatar} 
        />
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>{post.author?.full_name}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          </View>
          <Text style={styles.authorSpecialty}>{post.author?.specialty}</Text>
          <Text style={styles.timestamp}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>
      
      {post.media_url?.map((url, index) => (
        <Image 
          key={index}
          source={{ uri: url }} 
          style={styles.postImage}
          resizeMode="cover"
        />
      ))}

      {post.hashtags && post.hashtags.length > 0 && (
        <View style={styles.hashtags}>
          {post.hashtags.map((tag) => (
            <Text key={tag} style={styles.hashtag}>#{tag}</Text>
          ))}
        </View>
      )}

      <View style={styles.engagement}>
        <Pressable onPress={handleLike} style={styles.engagementButton}>
          <Heart 
            size={20} 
            color={post.has_liked ? '#FF4D4D' : '#666666'} 
            fill={post.has_liked ? '#FF4D4D' : 'transparent'} 
          />
          <Text style={styles.engagementText}>{post.likes_count}</Text>
        </Pressable>

        <Link href={`/home/post/${post.id}`} asChild>
          <Pressable style={styles.engagementButton}>
            <MessageCircle size={20} color="#666666" />
            <Text style={styles.engagementText}>{post.comments_count}</Text>
          </Pressable>
        </Link>

        <Pressable onPress={handleRepost} style={styles.engagementButton}>
          <Repeat2 
            size={20} 
            color={post.has_reposted ? '#22C55E' : '#666666'} 
          />
          <Text style={styles.engagementText}>{post.reposts_count}</Text>
        </Pressable>

        <Pressable style={styles.engagementButton}>
          <Share2 size={20} color="#666666" />
        </Pressable>
      </View>
    </View>
  );
};

const TrendingHashtag = ({ hashtag }: { hashtag: { name: string; post_count: number } }) => (
  <Link href={`/home/hashtag/${hashtag.name}`} asChild>
    <Pressable style={styles.trendingTag}>
      <Text style={styles.trendingTagText}>#{hashtag.name}</Text>
      <Text style={styles.trendingCount}>{hashtag.post_count} posts</Text>
    </Pressable>
  </Link>
);

export default function Feed() {
  const { 
    posts, 
    trendingHashtags,
    isLoading, 
    error, 
    fetchPosts,
    fetchTrendingHashtags 
  } = useFeedStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPosts();
    fetchTrendingHashtags();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPosts(),
      fetchTrendingHashtags()
    ]);
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    // Implement search functionality
  };

  if (isLoading && !refreshing) {
    return <LoadingOverlay message="Loading feed..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medical Feed</Text>
        <Link href="/home/create" asChild>
          <Pressable style={styles.newButton}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>New Post</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666666" />
          <TextInput
            placeholder="Search posts, doctors, or topics..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#666666"
          />
        </View>
      </View>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useFeedStore.setState({ error: null })}
        />
      )}

      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <TrendingUp size={20} color="#1A1A1A" />
          <Text style={styles.trendingTitle}>Trending Topics</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingContainer}>
          {trendingHashtags.map((hashtag) => (
            <TrendingHashtag key={hashtag.name} hashtag={hashtag} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No posts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Follow doctors or create your first post
            </Text>
          </View>
        }
      />

      <Link href="/home/create" asChild>
        <Pressable style={styles.fab}>
          <Plus size={24} color="#FFFFFF" />
        </Pressable>
      </Link>
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
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  newButtonText: {
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
  trendingSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    marginBottom: 8,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  trendingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  trendingContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  trendingTag: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  trendingTagText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
  },
  trendingCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    marginTop: 2,
  },
  feed: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
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
  timestamp: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    color: '#1A1A1A',
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  hashtag: {
    color: '#0066CC',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  engagement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  engagementText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
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