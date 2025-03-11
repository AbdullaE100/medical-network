import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Index() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/sign-in'} />;
}