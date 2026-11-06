import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors } from '../../ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (name: IconName, active: IconName) =>
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : name} color={color as string} size={size} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          boxShadow: '0px -2px 12px rgba(30, 45, 90, 0.06)',
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen name="index" options={{ title: '운동 기록', tabBarLabel: '홈', tabBarIcon: icon('barbell-outline', 'barbell') }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더', tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="guide" options={{ title: '운동 가이드', tabBarLabel: '가이드', tabBarIcon: icon('book-outline', 'book') }} />
      <Tabs.Screen name="stats"options={{ title: '통계', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: icon('settings-outline', 'settings') }} />
    </Tabs>
  );
}
