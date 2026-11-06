import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { todayKey, weekStartKey } from '../../lib/date';
import { sortWorkoutsDesc, weekStreak } from '../../lib/stats';
import { useData } from '../../store/DataProvider';
import { useStartWorkout } from '../../store/useStartWorkout';
import { Button, Card, Empty, SectionTitle, Stat } from '../../ui/components';
import { RoutineCard } from '../../ui/RoutineCard';
import { WeekStrip } from '../../ui/WeekStrip';
import { WorkoutCard } from '../../ui/WorkoutCard';
import { colors, radius, space } from '../../ui/theme';

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

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      data={workouts.slice(0, 20)}
      keyExtractor={(w) => w.id}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      ListHeaderComponent={
        <View>
          <View style={styles.topRow}>
            <View style={styles.streak} accessibilityLabel={`${streak}주 연속 운동`}>
              <Ionicons name="flame" size={18} color={streak > 0 ? '#FF6B3D' : colors.textFaint} />
              <Text style={styles.streakText}>{streak}주 연속</Text>
            </View>
            <Text style={styles.weekInfo}>이번 주 {weekCount}회</Text>
          </View>
          <WeekStrip
            today={today}
            workedDays={workedDays}
            onPressDay={(date) => router.push({ pathname: '/calendar', params: { date } })}
          />

          <View style={{ marginTop: space.lg }}>
            {active ? (
              <Button title="진행 중인 운동 이어하기" onPress={() => router.push(`/workout/${active.id}`)} />
            ) : (
              <Button title="빈 운동 시작" onPress={() => startWorkout()} />
            )}
          </View>

          <SectionTitle
            right={
              <Pressable onPress={() => router.push('/routine/edit')} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>+ 새 루틴</Text>
              </Pressable>
            }
          >
            내 루틴
          </SectionTitle>
          {routines.length === 0 ? (
            <Pressable style={styles.routineEmpty} onPress={() => router.push('/routine/edit')}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.routineEmptyText}>자주 하는 운동을 루틴으로 저장해 두면{'\n'}한 번에 시작할 수 있어요</Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routineScroll} contentContainerStyle={styles.routines}>
              {routines.map((r) => (
                <RoutineCard key={r.id} routine={r} />
              ))}
            </ScrollView>
          )}

          <Card style={styles.stats}>
            <Stat label="이번 주" value={`${weekCount}회`} />
            <Stat label="이번 달" value={`${monthCount}회`} />
            <Stat label="총 운동" value={`${data.workouts.length}회`} />
          </Card>
          <SectionTitle>최근 운동</SectionTitle>
        </View>
      }
      renderItem={({ item }) => <WorkoutCard workout={item} />}
      ListEmptyComponent={<Empty title="아직 운동 기록이 없어요" hint="루틴을 만들거나 '빈 운동 시작'으로 첫 기록을 남겨보세요" />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  weekInfo: { color: colors.textMuted, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  routineScroll: { marginHorizontal: -space.lg },
  routines: { paddingHorizontal: space.lg, gap: space.md },
  routineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  routineEmptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, flex: 1 },
  stats: { flexDirection: 'row', marginTop: space.lg },
});
