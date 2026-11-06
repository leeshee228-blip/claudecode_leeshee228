import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider, useData } from '../store/DataProvider';
import { RestTimerProvider } from '../store/RestTimer';
import { colors } from '../ui/theme';

function AppStack() {
  const { ready } = useData();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: '뒤로',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workout/[id]" options={{ title: '운동' }} />
      <Stack.Screen name="exercise/[id]" options={{ title: '종목 기록' }} />
      <Stack.Screen name="routine/[id]" options={{ title: '루틴' }} />
      <Stack.Screen name="routine/edit" options={{ title: '루틴 편집', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <RestTimerProvider>
          <StatusBar style="dark" />
          <AppStack />
        </RestTimerProvider>
      </DataProvider>
    </SafeAreaProvider>
  );
}
