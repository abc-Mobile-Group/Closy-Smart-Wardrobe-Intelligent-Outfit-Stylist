import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return null; // _layout đang hiện màn splash
  return <Redirect href={status === 'signedIn' ? '/(tabs)/wardrobe' : '/login'} />;
}