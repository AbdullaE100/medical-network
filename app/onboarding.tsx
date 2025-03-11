import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '@/stores/useProfileStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';
import { X } from 'lucide-react-native';

export default function Onboarding() {
  const router = useRouter();
  const { updateProfile, isLoading, error } = useProfileStore();
  const [profile, setProfile] = useState({
    full_name: '',
    specialty: '',
    hospital: '',
    location: '',
    bio: '',
    expertise: [] as string[],
  });
  const [newExpertise, setNewExpertise] = useState('');

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !profile.expertise.includes(newExpertise.trim())) {
      setProfile(prev => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()],
      }));
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (index: number) => {
    setProfile(prev => ({
      ...prev,
      expertise: prev.expertise.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!profile.full_name || !profile.specialty || !profile.hospital) {
      useProfileStore.setState({ 
        error: 'Please fill in all required fields (Name, Specialty, and Hospital)' 
      });
      return;
    }

    const success = await updateProfile(profile);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Setting up your profile..." />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us about your medical practice</Text>

        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => useProfileStore.setState({ error: null })}
          />
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={profile.full_name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, full_name: text }))}
              placeholder="Dr. John Smith"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specialty *</Text>
            <TextInput
              style={styles.input}
              value={profile.specialty}
              onChangeText={(text) => setProfile(prev => ({ ...prev, specialty: text }))}
              placeholder="e.g., Cardiology, Neurology"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital/Clinic *</Text>
            <TextInput
              style={styles.input}
              value={profile.hospital}
              onChangeText={(text) => setProfile(prev => ({ ...prev, hospital: text }))}
              placeholder="e.g., Mayo Clinic"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={profile.location}
              onChangeText={(text) => setProfile(prev => ({ ...prev, location: text }))}
              placeholder="City, Country"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={profile.bio}
              onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about your medical experience and interests"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Areas of Expertise</Text>
            <View style={styles.expertiseTags}>
              {profile.expertise.map((tag, index) => (
                <View key={index} style={styles.expertiseTag}>
                  <Text style={styles.expertiseText}>{tag}</Text>
                  <Pressable onPress={() => handleRemoveExpertise(index)} style={styles.removeTag}>
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
                placeholder="Add area of expertise"
                onSubmitEditing={handleAddExpertise}
              />
              <Pressable 
                style={[
                  styles.addButton,
                  !newExpertise.trim() && styles.addButtonDisabled
                ]} 
                onPress={handleAddExpertise}
                disabled={!newExpertise.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Complete Profile</Text>
          </Pressable>
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
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
    marginBottom: 32,
  },
  form: {
    gap: 24,
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
    height: 120,
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
  addButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});