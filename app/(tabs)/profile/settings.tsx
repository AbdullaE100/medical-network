import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable, Alert, Platform } from 'react-native';
import { Lock, MessageCircle, Shield, HelpCircle, LogOut, Camera } from 'lucide-react-native';
import { Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';
import * as ImagePicker from 'expo-image-picker';

type SettingOption = {
  label: string;
  type: 'toggle' | 'select' | 'action';
  value?: boolean;
  description?: string;
  key?: string;
  action?: () => void;
};

type SettingSection = {
  title: string;
  icon: any;
  options: SettingOption[];
};

export default function Settings() {
  const router = useRouter();
  const { profile, settings, isLoading, error, updateSettings, updateProfile } = useProfileStore();
  const { signOut } = useAuthStore();

  const handleImagePick = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera roll permissions to change your photo.');
          return;
        }
      }

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

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/sign-in');
          },
        },
      ]
    );
  };

  const SETTINGS: SettingSection[] = [
    {
      title: 'Privacy',
      icon: Lock,
      options: [
        {
          label: 'Private Profile',
          type: 'toggle',
          value: settings?.is_private ?? false,
          description: 'Only approved followers can see your full profile',
          key: 'is_private',
        },
      ],
    },
    {
      title: 'Communication',
      icon: MessageCircle,
      options: [
        {
          label: 'Allow Anonymous Posts',
          type: 'toggle',
          value: settings?.allow_anonymous_posts ?? false,
          description: 'Allow anonymous users to post on your profile',
          key: 'allow_anonymous_posts',
        },
        {
          label: 'Message Privacy',
          type: 'select',
          value: settings?.allow_messages_from === 'everyone',
          description: 'Who can send you direct messages',
          key: 'allow_messages_from',
        },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      options: [
        {
          label: 'Two-Factor Authentication',
          type: 'action',
          description: 'Add an extra layer of security',
          action: () => Alert.alert('Coming Soon', 'This feature will be available soon!'),
        },
      ],
    },
  ];

  if (isLoading) {
    return <LoadingOverlay message="Loading settings..." />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => useProfileStore.setState({ error: null })}
        />
      )}

      <View style={styles.profileSection}>
        <Image 
          source={{ 
            uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400'
          }} 
          style={styles.avatar} 
        />
        <Pressable style={styles.changePhotoButton} onPress={handleImagePick}>
          <Camera size={20} color="#FFFFFF" />
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </Pressable>
      </View>

      {SETTINGS.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <section.icon size={20} color="#1A1A1A" />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.sectionContent}>
            {section.options.map((option) => (
              <View key={option.label} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{option.label}</Text>
                  {option.description && (
                    <Text style={styles.settingDescription}>{option.description}</Text>
                  )}
                </View>
                {option.type === 'toggle' && option.key && (
                  <Switch
                    value={option.value}
                    onValueChange={(value) => handleToggle(option.key!, value)}
                    trackColor={{ false: '#E5E5E5', true: '#0066CC' }}
                    thumbColor="#FFFFFF"
                  />
                )}
                {option.type === 'select' && (
                  <Pressable 
                    style={styles.selectButton}
                    onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
                  >
                    <Text style={styles.selectButtonText}>
                      {settings?.allow_messages_from || 'Everyone'}
                    </Text>
                  </Pressable>
                )}
                {option.type === 'action' && option.action && (
                  <Pressable style={styles.actionButton} onPress={option.action}>
                    <Text style={styles.actionButtonText}>Configure</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.helpSection}>
        <Pressable 
          style={styles.helpButton}
          onPress={() => Alert.alert('Help & Support', 'Contact us at support@medical.network')}
        >
          <HelpCircle size={20} color="#666666" />
          <Text style={styles.helpButtonText}>Help & Support</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#CC0000" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  sectionContent: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
  selectButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  actionButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  helpSection: {
    marginTop: 24,
    marginBottom: 32,
    gap: 16,
    padding: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
  },
  helpButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#CC0000',
  },
});