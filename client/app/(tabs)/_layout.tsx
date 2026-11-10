import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../src/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Hàm tạo icon cho tab; color có thể là null nên đổi sang undefined.
const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: unknown; size: number }) => (
    <Ionicons name={name} size={size} color={(color ?? undefined) as string | undefined} />
  );

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
      <Tabs.Screen name="wardrobe" options={{ title: 'Tủ đồ', tabBarIcon: tabIcon('shirt-outline') }} />
      <Tabs.Screen name="add" options={{ title: 'Thêm món', tabBarIcon: tabIcon('add-circle-outline') }} />
      <Tabs.Screen name="suggest" options={{ title: 'Gợi ý', tabBarIcon: tabIcon('sparkles-outline') }} />
    </Tabs>
  );
}