import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable, Alert, Platform } from 'react-native';
import { Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '@/stores/useProfileStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useRouter } from 'expo-router';

export default function EditProfile() {
  const router = useRouter();
  const { profile, isLoading, error, updateProfile } = useProfileStore();
  const [newExpertise, setNewExpertise] = useState('');
  const [localProfile, setLocalProfile] = useState({
    full_name: profile?.full_name || '',
    specialty: profile?.specialty || '',
    hospital: profile?.hospital || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    expertise: profile?.expertise || [],
  });

  const handleImagePick = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera roll permissions to change your photo.');
          return;
        }
      }

      // Pick the image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        await updateProfile({ avatar_url: file.uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(localProfile);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const addExpertise = () => {
    if (newExpertise.trim()) {
      setLocalProfile(prev => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()],
      }));
      setNewExpertise('');
    }
  };

  const removeExpertise = (index: number) => {
    setLocalProfile(prev => ({
      ...prev,
      expertise: prev.expertise.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return <LoadingOverlay message="Updating profile..." />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useProfileStore.setState({ error: null })}
        />
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.avatarSection}>
        <Image 
          source={{ 
            uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400'
          }} 
          style={styles.avatar} 
        />
        <Pressable style={styles.changeAvatarButton} onPress={handleImagePick}>
          <Camera size={20} color="#FFFFFF" />
          <Text style={styles.changeAvatarText}>Change Photo</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={localProfile.full_name}
            onChangeText={(text) => setLocalProfile(prev => ({ ...prev, full_name: text }))}
            placeholder="Enter your full name"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Specialty</Text>
          <TextInput
            style={styles.input}
            value={localProfile.specialty}
            onChangeText={(text) => setLocalProfile(prev => ({ ...prev, specialty: text }))}
            placeholder="Enter your medical specialty"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hospital</Text>
          <TextInput
            style={styles.input}
            value={localProfile.hospital}
            onChangeText={(text) => setLocalProfile(prev => ({ ...prev, hospital: text }))}
            placeholder="Enter your hospital"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={localProfile.location}
            onChangeText={(text) => setLocalProfile(prev => ({ ...prev, location: text }))}
            placeholder="Enter your location"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={localProfile.bio}
            onChangeText={(text) => setLocalProfile(prev => ({ ...prev, bio: text }))}
            placeholder="Write something about yourself"
            placeholderTextColor="#666666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expertise</Text>
          <View style={styles.expertiseTags}>
            {localProfile.expertise.map((tag, index) => (
              <View key={index} style={styles.expertiseTag}>
                <Text style={styles.expertiseText}>{tag}</Text>
                <Pressable onPress={() => removeExpertise(index)} style={styles.removeTag}>
                  <X size={16} color="#666666" />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.addExpertise}>
            <TextInput
              style={styles.expertiseInput}
              value={newExpertise}
              onChangeText={setNewExpertise}
              placeholder="Add expertise"
              placeholderTextColor="#666666"
              onSubmitEditing={addExpertise}
            />
            <Pressable style={styles.addButton} onPress={addExpertise}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
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
  saveButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  avatarSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  changeAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  form: {
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  expertiseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  expertiseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  expertiseText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
  },
  removeTag: {
    padding: 2,
  },
  addExpertise: {
    flexDirection: 'row',
    gap: 8,
  },
  expertiseInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  addButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});