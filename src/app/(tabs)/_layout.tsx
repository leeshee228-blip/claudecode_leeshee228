import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors } from '../../ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type IconProps = { color: ColorValue; size: number; focused: boolean };

function TabIcon({ name, active, color, size, focused }: IconProps & { name: IconName; active: IconName }) {
  return <Ionicons name={focused ? active : name} color={color as string} size={size} />;
}

const icon = (name: IconName, active: IconName) => {
  const render = (props: IconProps) => <TabIcon name={name} active={active} {...props} />;
  render.displayName = `TabIcon(${name})`;
  return render;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        // 보이지 않는 탭은 데이터가 바뀌어도 다시 그리지 않음 (운동 입력 중 성능)
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: '운동 기록', tabBarLabel: '홈', tabBarIcon: icon('barbell-outline', 'barbell') }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더', tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="stats" options={{ title: '통계', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: icon('settings-outline', 'settings') }} />
    </Tabs>
  );
}
