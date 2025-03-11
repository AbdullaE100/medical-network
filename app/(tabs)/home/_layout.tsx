import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Feed' }} />
      <Stack.Screen 
        name="create" 
        options={{ 
          title: 'Create Post',
          presentation: 'modal',
          headerShown: false
        }} 
      />
      <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
    </Stack>
  );
}