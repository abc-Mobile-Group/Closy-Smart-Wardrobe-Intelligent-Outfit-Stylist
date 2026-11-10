import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';

const renderIcon =
  (outlineName: React.ComponentProps<typeof Ionicons>['name'], filledName: React.ComponentProps<typeof Ionicons>['name']) =>
    ({ focused, color }: { focused: boolean; color: any; size: number }) => {
      return (
        <View style={[styles.iconContainer, focused && styles.iconActiveBg]}>
          <Ionicons name={focused ? filledName : outlineName} size={20} color={color} />
        </View>
      );
    };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 8,
          paddingTop: 6,
          ...Platform.select({
            web: {
              boxShadow: 'none',
              borderTop: `1px solid ${colors.border}`,
            } as any,
          }),
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 2,
          ...Platform.select({
            web: {
              outline: 'none',
              outlineStyle: 'none',
              boxShadow: 'none',
              cursor: 'pointer',
            } as any,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hôm nay',
          headerShown: false,
          tabBarIcon: renderIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Tủ đồ',
          headerShown: false,
          tabBarIcon: renderIcon('shirt-outline', 'shirt'),
        }}
      />
      <Tabs.Screen
        name="suggest"
        options={{
          title: 'Phối đồ',
          headerShown: false,
          tabBarIcon: renderIcon('sparkles-outline', 'sparkles'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          headerShown: false,
          tabBarIcon: renderIcon('calendar-outline', 'calendar'),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          href: null, // ẩn khỏi tab bar vì đã mở qua nút Thêm món
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 48,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconActiveBg: {
    backgroundColor: colors.primaryLight,
  },
});