import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useNetworkStore } from '@/stores/useNetworkStore';

interface ConnectionRequestCardProps {
  request: {
    id: string;
    sender?: {
      full_name: string;
      specialty: string;
      hospital: string;
      avatar_url: string;
    };
  };
}

export function ConnectionRequestCard({ request }: ConnectionRequestCardProps) {
  const { acceptConnectionRequest, rejectConnectionRequest } = useNetworkStore();

  if (!request.sender) return null;

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: request.sender.avatar_url }} 
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{request.sender.full_name}</Text>
        <Text style={styles.specialty}>{request.sender.specialty}</Text>
        <Text style={styles.hospital}>{request.sender.hospital}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => acceptConnectionRequest(request.id)}
        >
          <Check size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => rejectConnectionRequest(request.id)}
        >
          <X size={20} color="#666666" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
    marginBottom: 2,
  },
  hospital: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#0066CC',
  },
  rejectButton: {
    backgroundColor: '#F0F2F5',
  },
});