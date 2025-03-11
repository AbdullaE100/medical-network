import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function NetworkLayout() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Doctor Directory' }} />
      <Stack.Screen name="doctor/[id]" options={{ title: 'Doctor Profile' }} />
      <Stack.Screen name="recommended" options={{ title: 'Recommended' }} />
    </Stack>
  );
}