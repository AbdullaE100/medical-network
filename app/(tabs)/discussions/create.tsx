import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDiscussionsStore } from '@/stores/useDiscussionsStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Image, X } from 'lucide-react-native';

export default function CreateDiscussion() {
  const router = useRouter();
  const { 
    categories, 
    isLoading, 
    error, 
    fetchCategories, 
    createDiscussion,
    fetchDiscussions 
  } = useDiscussionsStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAma, setIsAma] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !selectedCategory) {
      return;
    }

    try {
      const discussionId = await createDiscussion({
        title: title.trim(),
        content: content.trim(),
        category_id: selectedCategory,
        is_ama: isAma
      });
      
      // Fetch updated discussions list
      await fetchDiscussions();
      
      // Navigate to the new discussion
      router.push(`/discussions/${discussionId}`);
    } catch (error) {
      console.error('Error creating discussion:', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Creating discussion..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Discussion</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.back()} style={styles.cancelButton}>
            <X size={20} color="#666666" />
          </Pressable>
          <Pressable 
            style={[
              styles.submitButton,
              (!title.trim() || !content.trim() || !selectedCategory) && styles.submitButtonDisabled
            ]} 
            onPress={handleSubmit}
            disabled={!title.trim() || !content.trim() || !selectedCategory}
          >
            <Text style={styles.submitButtonText}>Post</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => useDiscussionsStore.setState({ error: null })}
          />
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="What would you like to discuss?"
              placeholderTextColor="#666666"
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonSelected
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category.id && styles.categoryButtonTextSelected
                  ]}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Share your thoughts, insights, or questions..."
              placeholderTextColor="#666666"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.optionsGroup}>
            <Pressable 
              style={styles.optionButton}
              onPress={() => setIsAma(!isAma)}
            >
              <View style={[styles.checkbox, isAma && styles.checkboxChecked]} />
              <Text style={styles.optionText}>Mark as AMA (Ask Me Anything)</Text>
            </Pressable>
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
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  categories: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
  },
  categoryButtonSelected: {
    backgroundColor: '#0066CC',
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666666',
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
  },
  contentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 200,
  },
  optionsGroup: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666666',
  },
  checkboxChecked: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A1A',
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