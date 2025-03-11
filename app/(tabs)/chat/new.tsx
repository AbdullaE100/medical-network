import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Users, UserPlus, Check } from 'lucide-react-native';
import { useChatStore } from '@/stores/useChatStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function NewChat() {
  const router = useRouter();
  const { startChat, createGroupChat, isLoading, error } = useChatStore();
  const { doctors, fetchDoctors } = useNetworkStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedDoctors, setSelectedDoctors] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');

  React.useEffect(() => {
    fetchDoctors(searchQuery);
  }, [searchQuery]);

  const handleStartChat = async (doctorId: string) => {
    try {
      const chatId = await startChat(doctorId);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedDoctors.size < 2) {
      Alert.alert('Error', 'Please select at least 2 members');
      return;
    }

    try {
      const groupId = await createGroupChat(groupName, Array.from(selectedDoctors));
      router.push(`/chat/${groupId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const toggleDoctorSelection = (doctorId: string) => {
    const newSelected = new Set(selectedDoctors);
    if (newSelected.has(doctorId)) {
      newSelected.delete(doctorId);
    } else {
      newSelected.add(doctorId);
    }
    setSelectedDoctors(newSelected);
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Message</Text>
        {isCreatingGroup && selectedDoctors.size > 0 && (
          <Pressable style={styles.createButton} onPress={handleCreateGroup}>
            <Text style={styles.createButtonText}>Create</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useChatStore.setState({ error: null })}
        />
      )}

      {isCreatingGroup && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            placeholderTextColor="#666666"
          />
        </View>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666666" />
          <TextInput
            placeholder="Search doctors"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666666"
          />
        </View>
      </View>

      <Pressable 
        style={styles.createGroupButton}
        onPress={() => setIsCreatingGroup(!isCreatingGroup)}
      >
        <Users size={20} color="#0066CC" />
        <Text style={styles.createGroupText}>
          {isCreatingGroup ? 'Cancel Group Chat' : 'Create Group Chat'}
        </Text>
      </Pressable>

      <FlatList
        data={doctors}
        renderItem={({ item: doctor }) => (
          <Pressable 
            style={styles.doctorItem}
            onPress={() => {
              if (isCreatingGroup) {
                toggleDoctorSelection(doctor.id);
              } else {
                handleStartChat(doctor.id);
              }
            }}
          >
            <View style={styles.avatarContainer}>
              <Image source={{ uri: doctor.avatar_url }} style={styles.avatar} />
              {doctor.is_online && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.full_name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              <Text style={styles.doctorHospital}>{doctor.hospital}</Text>
            </View>

            {isCreatingGroup ? (
              <View style={[
                styles.checkbox,
                selectedDoctors.has(doctor.id) && styles.checkboxSelected
              ]}>
                {selectedDoctors.has(doctor.id) && (
                  <Check size={16} color="#FFFFFF" />
                )}
              </View>
            ) : (
              <UserPlus size={20} color="#0066CC" />
            )}
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.doctorList}
        showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  createButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  groupNameContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  groupNameInput: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
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
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  createGroupText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
  },
  doctorList: {
    padding: 16,
    gap: 12,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  doctorSpecialty: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
    marginTop: 2,
  },
  doctorHospital: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
});