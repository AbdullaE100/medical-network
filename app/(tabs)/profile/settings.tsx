import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Lock, MessageCircle, Shield, HelpCircle, LogOut } from 'lucide-react-native';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

type SettingSection = {
  title: string;
  icon: any;
  options: {
    label: string;
    type: 'toggle' | 'select' | 'action';
    value?: boolean;
    description?: string;
    key?: string;
    action?: () => void;
  }[];
};

export default function Settings() {
  const router = useRouter();
  const { settings, isLoading, error, updateSettings } = useProfileStore();
  const { signOut } = useAuthStore();

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
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
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
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
  actionButton: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
  },
  helpSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
    gap: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
  },
  helpButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#CC0000',
  },
});