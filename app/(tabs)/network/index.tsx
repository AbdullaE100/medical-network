import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable, FlatList, RefreshControl } from 'react-native';
import { Link } from 'expo-router';
import { Search, Filter, MapPin, Building2, Users, ChevronRight, UserPlus, UserCheck } from 'lucide-react-native';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ConnectionRequestCard } from '@/components/ConnectionRequestCard';

export default function DoctorDirectory() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'followers' | 'recent'>('followers');
  const { 
    doctors, 
    receivedRequests,
    isLoading, 
    error, 
    fetchDoctors,
    fetchConnectionRequests,
    followDoctor,
    unfollowDoctor
  } = useNetworkStore();
  const [refreshing, setRefreshing] = useState(false);

  const filters = ['All', 'Neurology', 'Cardiology', 'Oncology', 'Surgery', 'Pediatrics'];

  useEffect(() => {
    fetchDoctors(searchQuery, activeFilter === 'All' ? undefined : activeFilter, sortBy);
    fetchConnectionRequests();
  }, [activeFilter, searchQuery, sortBy]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDoctors(searchQuery, activeFilter === 'All' ? undefined : activeFilter, sortBy),
      fetchConnectionRequests()
    ]);
    setRefreshing(false);
  }, [searchQuery, activeFilter, sortBy]);

  if (isLoading && !refreshing) {
    return <LoadingOverlay message="Loading doctors..." />;
  }

  return (
    <View style={styles.container}>
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useNetworkStore.setState({ error: null })}
        />
      )}

      <FlatList
        ListHeaderComponent={
          <>
            {receivedRequests.length > 0 && (
              <View style={styles.requestsSection}>
                <Text style={styles.requestsTitle}>Connection Requests</Text>
                {receivedRequests.map((request) => (
                  <ConnectionRequestCard key={request.id} request={request} />
                ))}
              </View>
            )}

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color="#666666" />
                <TextInput
                  placeholder="Search doctors..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#666666"
                />
              </View>
              <Pressable 
                style={styles.filterIcon}
                onPress={() => setSortBy(sortBy === 'followers' ? 'recent' : 'followers')}
              >
                <Filter size={20} color="#0066CC" />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              {filters.map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterButton,
                    activeFilter === filter && styles.filterButtonActive
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === filter && styles.filterButtonTextActive
                  ]}>{filter}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        }
        data={doctors}
        renderItem={({ item: doctor }) => (
          <Link href={`/network/doctor/${doctor.id}`} asChild>
            <Pressable style={styles.doctorCard}>
              <Image 
                source={{ uri: doctor.avatar_url }} 
                style={styles.doctorAvatar} 
              />
              <View style={styles.doctorInfo}>
                <View style={styles.doctorHeader}>
                  <Text style={styles.doctorName}>{doctor.full_name}</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                </View>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                <View style={styles.doctorDetails}>
                  <View style={styles.detailRow}>
                    <Building2 size={16} color="#666666" />
                    <Text style={styles.detailText}>{doctor.hospital}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="#666666" />
                    <Text style={styles.detailText}>{doctor.location}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Users size={16} color="#666666" />
                    <Text style={styles.detailText}>{doctor.followers_count} followers</Text>
                  </View>
                </View>
              </View>
              <Pressable 
                style={[
                  styles.followButton,
                  doctor.connection_status === 'connected' && styles.followingButton,
                  doctor.connection_status === 'pending' && styles.pendingButton
                ]}
                onPress={(e) => {
                  e.preventDefault();
                  doctor.connection_status === 'connected'
                    ? unfollowDoctor(doctor.id)
                    : followDoctor(doctor.id);
                }}
              >
                {doctor.connection_status === 'connected' ? (
                  <UserCheck size={20} color="#0066CC" />
                ) : doctor.connection_status === 'pending' ? (
                  <Text style={styles.pendingText}>Pending</Text>
                ) : (
                  <UserPlus size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </Pressable>
          </Link>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.doctorList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  requestsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  requestsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  filterIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
  },
  filterButtonActive: {
    backgroundColor: '#0066CC',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  doctorList: {
    padding: 16,
    gap: 12,
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
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
  doctorSpecialty: {
    fontSize: 14,
    color: '#0066CC',
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  doctorDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  followingButton: {
    backgroundColor: '#E5F0FF',
  },
  pendingButton: {
    backgroundColor: '#F0F2F5',
    width: 'auto',
    paddingHorizontal: 12,
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
});