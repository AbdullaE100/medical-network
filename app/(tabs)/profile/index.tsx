import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, RefreshControl } from 'react-native';
import { Link } from 'expo-router';
import { Settings, CreditCard as Edit3, MapPin, Building2, Users, Heart, MessageCircle, Share2, Award, Bookmark, FileText } from 'lucide-react-native';
import { useProfileStore } from '@/stores/useProfileStore';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingOverlay } from '@/components/LoadingOverlay';

const Achievement = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <View style={styles.achievement}>
    <View style={styles.achievementIcon}>
      <Icon size={20} color="#0066CC" />
    </View>
    <Text style={styles.achievementText}>{label}</Text>
  </View>
);

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ExpertiseTag = ({ label }: { label: string }) => (
  <View style={styles.expertiseTag}>
    <Text style={styles.expertiseText}>{label}</Text>
  </View>
);

export default function Profile() {
  const { profile, settings, isLoading, error, fetchProfile } = useProfileStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  if (isLoading && !refreshing) {
    return <LoadingOverlay />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerActions}>
          <Link href="/profile/edit" asChild>
            <Pressable style={styles.headerButton}>
              <Edit3 size={20} color="#666666" />
            </Pressable>
          </Link>
          <Link href="/profile/settings" asChild>
            <Pressable style={styles.headerButton}>
              <Settings size={20} color="#666666" />
            </Pressable>
          </Link>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => useProfileStore.setState({ error: null })}
          />
        )}

        <View style={styles.profileHeader}>
          <Image 
            source={{ 
              uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400'
            }} 
            style={styles.avatar} 
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile?.full_name || 'Dr. Thalib Ehsan'}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            </View>
            <Text style={styles.title}>{profile?.specialty || 'Loading...'}</Text>
            <View style={styles.locationRow}>
              <View style={styles.detailRow}>
                <Building2 size={16} color="#666666" />
                <Text style={styles.detailText}>{profile?.hospital || 'Loading...'}</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin size={16} color="#666666" />
                <Text style={styles.detailText}>{profile?.location || 'Loading...'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.stats}>
          <StatBox label="Followers" value={profile?.followers_count || 0} />
          <View style={styles.statDivider} />
          <StatBox label="Following" value={profile?.following_count || 0} />
          <View style={styles.statDivider} />
          <StatBox label="Posts" value={profile?.posts_count || 0} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{profile?.bio || 'Loading...'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expertise</Text>
          <View style={styles.expertiseTags}>
            {profile?.expertise?.map((tag) => (
              <ExpertiseTag key={tag} label={tag} />
            )) || (
              <Text style={styles.loadingText}>Loading expertise...</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievements}>
            <Achievement icon={Award} label="Top Contributor 2024" />
            <Achievement icon={FileText} label="50+ Publications" />
            <Achievement icon={Users} label="Research Lead" />
          </View>
        </View>

        <View style={styles.engagementSection}>
          <Pressable style={styles.engagementButton}>
            <Heart size={20} color="#666666" />
            <Text style={styles.engagementText}>Liked Posts</Text>
          </Pressable>
          <Pressable style={styles.engagementButton}>
            <Bookmark size={20} color="#666666" />
            <Text style={styles.engagementText}>Saved Items</Text>
          </Pressable>
          <Pressable style={styles.engagementButton}>
            <Share2 size={20} color="#666666" />
            <Text style={styles.engagementText}>Share Profile</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginRight: 8,
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
  title: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
    marginBottom: 8,
  },
  locationRow: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5E5',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  expertiseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expertiseTag: {
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  expertiseText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  achievements: {
    gap: 12,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  engagementSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
  },
  engagementText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
});