import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { todayKey, weekStartKey } from '../../lib/date';
import { sortWorkoutsDesc, weekStreak } from '../../lib/stats';
import { useData } from '../../store/DataProvider';
import { useStartWorkout } from '../../store/useStartWorkout';
import { Button, Card, Empty, SectionTitle, Stat } from '../../ui/components';
import { RoutineCard } from '../../ui/RoutineCard';
import { WeekStrip } from '../../ui/WeekStrip';
import { WorkoutCard } from '../../ui/WorkoutCard';
import { colors, space } from '../../ui/theme';

export default function HomeScreen() {
  const { data } = useData();
  const router = useRouter();
  const startWorkout = useStartWorkout();

  const workouts = useMemo(() => sortWorkoutsDesc(data.workouts), [data.workouts]);
  const workedDays = useMemo(() => new Set(data.workouts.map((w) => w.date)), [data.workouts]);
  const routines = useMemo(() => [...data.routines].sort((a, b) => b.createdAt - a.createdAt), [data.routines]);
  const active = workouts.find((w) => !w.endedAt);
  const today = todayKey();
  const thisWeek = weekStartKey(today);
  const weekCount = data.workouts.filter((w) => weekStartKey(w.date) === thisWeek).length;
  const monthCount = data.workouts.filter((w) => w.date.slice(0, 7) === today.slice(0, 7)).length;
  const streak = weekStreak(data.workouts, today);
  const doneToday = data.workouts.some((w) => w.date === today && w.endedAt);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      data={workouts.slice(0, 20)}
      keyExtractor={(w) => w.id}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      ListHeaderComponent={
        <View>
          {active ? (
            <Button title="진행 중인 운동 이어하기" onPress={() => router.push(`/workout/${active.id}`)} />
          ) : (
            <Button title="오늘 운동 시작" onPress={() => startWorkout()} />
          )}
          <Card style={styles.stats}>
            <Stat label="이번 주" value={`${weekCount}회`} />
            <Stat label="이번 달" value={`${monthCount}회`} />
            <Stat label="연속" value={`${streak}주`} />
          </Card>
          <SectionTitle>최근 운동</SectionTitle>
        </View>
      }
      renderItem={({ item }) => <WorkoutCard workout={item} />}
      ListEmptyComponent={<Empty title="아직 운동 기록이 없어요" hint="'오늘 운동 시작'을 눌러 첫 기록을 남겨보세요" />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  stats: { flexDirection: 'row', marginTop: space.lg },
});
