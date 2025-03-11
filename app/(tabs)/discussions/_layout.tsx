import { Stack } from 'expo-router';

export default function DiscussionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Discussions' }} />
      <Stack.Screen name="[id]" options={{ title: 'Discussion' }} />
      <Stack.Screen name="create" options={{ title: 'New Discussion', presentation: 'modal' }} />
    </Stack>
  );
}