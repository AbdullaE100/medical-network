import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Building2, Users, Star, MessageCircle, UserPlus, Share2, UserCheck } from 'lucide-react-native';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useChatStore } from '@/stores/useChatStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

const StatButton = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.statButton}>
    {Icon && <Icon size={20} color="#666666" />}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function DoctorProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { doctors, followedDoctors, followDoctor, unfollowDoctor } = useNetworkStore();
  const { startChat } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doctor = doctors.find(d => d.id === id);
  const isFollowing = followedDoctors.has(id as string);

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollowDoctor(id as string);
      } else {
        await followDoctor(id as string);
      }
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleMessage = async () => {
    try {
      setIsLoading(true);
      const chatId = await startChat(id as string);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out Dr. ${doctor?.full_name}'s profile on Medical Network!`,
        url: `https://medical.network/doctor/${id}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share profile');
    }
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!doctor) {
    return (
      <View style={styles.container}>
        <ErrorMessage message="Doctor not found" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      <View style={styles.header}>
        <Image 
          source={{ 
            uri: doctor.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
          }} 
          style={styles.coverPhoto} 
        />
        <View style={styles.profileInfo}>
          <Image 
            source={{ 
              uri: doctor.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
            }} 
            style={styles.avatar} 
          />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{doctor.full_name}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            </View>
            <Text style={styles.specialty}>{doctor.specialty}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Building2 size={16} color="#666666" />
          <Text style={styles.detailText}>{doctor.hospital}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPin size={16} color="#666666" />
          <Text style={styles.detailText}>{doctor.location}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <StatButton
          icon={Users}
          value={doctor.followers_count?.toString() || '0'}
          label="Followers"
        />
        <StatButton
          icon={Star}
          value="4.9"
          label="Rating"
        />
        <StatButton
          icon={MessageCircle}
          value="Active"
          label="Response"
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, isFollowing && styles.actionButtonOutline]}
          onPress={handleFollow}
        >
          {isFollowing ? (
            <>
              <UserCheck size={20} color="#0066CC" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextOutline]}>
                Following
              </Text>
            </>
          ) : (
            <>
              <UserPlus size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Follow</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={handleMessage}
        >
          <MessageCircle size={20} color="#0066CC" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextOutline]}>
            Message
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={handleShare}
        >
          <Share2 size={20} color="#0066CC" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextOutline]}>
            Share
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{doctor.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expertise</Text>
        <View style={styles.tags}>
          {doctor.expertise?.map((item) => (
            <View key={item} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
  },
  coverPhoto: {
    width: '100%',
    height: 150,
    backgroundColor: '#E5E5E5',
  },
  profileInfo: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    marginLeft: 16,
    marginTop: 40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
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
  specialty: {
    fontSize: 16,
    color: '#0066CC',
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  details: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    justifyContent: 'space-around',
  },
  statButton: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    gap: 8,
  },
  actionButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  actionButtonTextOutline: {
    color: '#0066CC',
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
    color: '#666666',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter_500Medium',
  },
});