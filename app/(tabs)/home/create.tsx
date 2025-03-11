import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Image, X } from 'lucide-react-native';
import { useFeedStore } from '@/stores/useFeedStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function CreatePost() {
  const router = useRouter();
  const { createPost, isLoading, error } = useFeedStore();
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');

  const handleAddHashtag = () => {
    if (newHashtag.trim() && !hashtags.includes(newHashtag.trim())) {
      setHashtags([...hashtags, newHashtag.trim()]);
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createPost(content.trim(), hashtags);
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Creating post..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.back()} style={styles.cancelButton}>
            <X size={20} color="#666666" />
          </Pressable>
          <Pressable 
            style={[
              styles.submitButton,
              !content.trim() && styles.submitButtonDisabled
            ]} 
            onPress={handleSubmit}
            disabled={!content.trim()}
          >
            <Text style={styles.submitButtonText}>Post</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => useFeedStore.setState({ error: null })}
          />
        )}

        <View style={styles.form}>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Share your medical insights..."
            placeholderTextColor="#666666"
            multiline
            textAlignVertical="top"
          />

          <View style={styles.hashtagsSection}>
            <Text style={styles.sectionTitle}>Add Hashtags</Text>
            <View style={styles.hashtagInput}>
              <Text style={styles.hashtagPrefix}>#</Text>
              <TextInput
                style={styles.hashtagTextInput}
                value={newHashtag}
                onChangeText={setNewHashtag}
                placeholder="Add a hashtag"
                placeholderTextColor="#666666"
                onSubmitEditing={handleAddHashtag}
              />
              <Pressable 
                style={[
                  styles.addHashtagButton,
                  !newHashtag.trim() && styles.addHashtagButtonDisabled
                ]}
                onPress={handleAddHashtag}
                disabled={!newHashtag.trim()}
              >
                <Text style={styles.addHashtagButtonText}>Add</Text>
              </Pressable>
            </View>

            <View style={styles.hashtags}>
              {hashtags.map((tag) => (
                <View key={tag} style={styles.hashtagTag}>
                  <Text style={styles.hashtagTagText}>#{tag}</Text>
                  <Pressable 
                    onPress={() => handleRemoveHashtag(tag)}
                    style={styles.removeHashtagButton}
                  >
                    <X size={16} color="#666666" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.attachments}>
            <Pressable style={styles.attachButton}>
              <Image size={20} color="#666666" />
              <Text style={styles.attachButtonText}>Add Image</Text>
            </Pressable>
          </View>
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
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0066CC',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 24,
  },
  contentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 150,
  },
  hashtagsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  hashtagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  hashtagPrefix: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
    marginRight: 4,
  },
  hashtagTextInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  addHashtagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0066CC',
    borderRadius: 16,
    marginLeft: 8,
  },
  addHashtagButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addHashtagButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F0FF',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    gap: 4,
  },
  hashtagTagText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#0066CC',
  },
  removeHashtagButton: {
    padding: 2,
  },
  attachments: {
    flexDirection: 'row',
    gap: 12,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F0F2F5',
  },
  attachButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
});