import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable, FlatList, RefreshControl } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Search, Filter, MapPin, Building2, Users, ChevronRight, UserPlus, UserCheck, CircleAlert as AlertCircle, Plus, MessageCircle } from 'lucide-react-native';
import { useDiscussionsStore } from '@/stores/useDiscussionsStore';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Discussion } from '@/stores/useDiscussionsStore';

const CategoryButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.categoryButton,
      active && styles.categoryButtonActive
    ]}>
    <Text style={[
      styles.categoryButtonText,
      active && styles.categoryButtonTextActive
    ]}>{label}</Text>
  </Pressable>
);

const DiscussionCard = ({ discussion }: { discussion: Discussion }) => (
  <Link href={`/discussions/${discussion.id}`} asChild>
    <Pressable style={styles.discussionCard}>
      {discussion.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>📌 Pinned</Text>
        </View>
      )}
      <View style={styles.discussionHeader}>
        <Image 
          source={{ 
            uri: discussion.author?.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
          }} 
          style={styles.authorAvatar} 
        />
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{discussion.author?.full_name}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          </View>
          <Text style={styles.authorSpecialty}>{discussion.author?.specialty}</Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(discussion.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.discussionContent}>
        <Text style={styles.discussionTitle}>{discussion.title}</Text>
        
        <View style={styles.tags}>
          <View style={[styles.categoryTag, discussion.is_ama && styles.amaTag]}>
            <Text style={[styles.categoryTagText, discussion.is_ama && styles.amaTagText]}>
              {discussion.category?.name || 'General'}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Users size={16} color="#666666" />
            <Text style={styles.statText}>{discussion.upvotes_count} upvotes</Text>
          </View>
          <View style={styles.stat}>
            <MessageCircle size={16} color="#666666" />
            <Text style={styles.statText}>{discussion.comments_count} comments</Text>
          </View>
        </View>
      </View>
    </Pressable>
  </Link>
);

export default function DiscussionList() {
  const router = useRouter();
  const { 
    discussions, 
    categories,
    isLoading, 
    error, 
    fetchDiscussions,
    fetchCategories 
  } = useDiscussionsStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchDiscussions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDiscussions();
    setRefreshing(false);
  };

  const handleCategoryChange = async (category: string) => {
    setActiveCategory(category);
    await fetchDiscussions({
      category: category === 'All' ? undefined : category
    });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    await fetchDiscussions({ search: query });
  };

  if (isLoading && !refreshing) {
    return <LoadingOverlay message="Loading discussions..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medical Discussions</Text>
        <Link href="/discussions/create" asChild>
          <Pressable style={styles.newButton}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>New Discussion</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666666" />
          <TextInput
            placeholder="Search discussions..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#666666"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}>
        <CategoryButton
          label="All"
          active={activeCategory === 'All'}
          onPress={() => handleCategoryChange('All')}
        />
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            label={category.name}
            active={activeCategory === category.slug}
            onPress={() => handleCategoryChange(category.slug)}
          />
        ))}
      </ScrollView>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useDiscussionsStore.setState({ error: null })}
        />
      )}

      <FlatList
        data={discussions}
        renderItem={({ item }) => <DiscussionCard discussion={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.discussionList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No discussions found</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to start a discussion!
            </Text>
          </View>
        }
      />

      <Link href="/discussions/create" asChild>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  categoryScroll: {
    backgroundColor: '#FFFFFF',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
  },
  categoryButtonActive: {
    backgroundColor: '#0066CC',
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  discussionList: {
    padding: 16,
    gap: 12,
  },
  discussionCard: {
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
  pinnedBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#FF9500',
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 14,
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
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  discussionContent: {
    gap: 12,
  },
  discussionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    lineHeight: 24,
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
  amaTag: {
    backgroundColor: '#FFE5E5',
  },
  amaTagText: {
    color: '#CC0000',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
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