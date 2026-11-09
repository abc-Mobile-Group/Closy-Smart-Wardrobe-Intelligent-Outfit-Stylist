import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../src/constants/theme';

const icon =
  (name: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Tabs.Screen name="wardrobe" options={{ title: 'Tủ đồ', tabBarIcon: icon('shirt-outline') }} />
      <Tabs.Screen name="add" options={{ title: 'Thêm món', tabBarIcon: icon('add-circle-outline') }} />
      <Tabs.Screen name="suggest" options={{ title: 'Gợi ý', tabBarIcon: icon('sparkles-outline') }} />
    </Tabs>
  );
}
