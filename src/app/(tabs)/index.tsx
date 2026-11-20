import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDateLong, todayKey, weekStartKey } from '../../lib/date';
import { sortWorkoutsDesc, weekStreak } from '../../lib/stats';
import { useData } from '../../store/DataProvider';
import { useStartWorkout } from '../../store/useStartWorkout';
import { Button, Card, Empty, SectionTitle, Stat } from '../../ui/components';
import { RoutineCard } from '../../ui/RoutineCard';
import { WeekStrip } from '../../ui/WeekStrip';
import { WorkoutCard } from '../../ui/WorkoutCard';
import { colors, radius, space } from '../../ui/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '늦은 밤에도 힘내요 🌙';
  if (h < 12) return '좋은 아침이에요 ☀️';
  if (h < 18) return '오늘도 화이팅 💪';
  return '오늘 하루도 수고했어요 🌆';
}

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
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Text style={styles.heroDate}>{formatDateLong(today)}</Text>
              <View style={styles.streak} accessibilityLabel={`${streak}주 연속 운동`}>
                <Ionicons name="flame" size={14} color={streak > 0 ? colors.warning : colors.textFaint} />
                <Text style={styles.streakText}>{streak}주 연속</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{greeting()}</Text>
            <Text style={styles.heroSub}>
              {active
                ? '진행 중인 운동이 있어요. 이어서 기록해 보세요.'
                : doneToday
                  ? '오늘 운동을 완료했어요. 멋져요!'
                  : '오늘의 운동을 기록해 볼까요?'}
            </Text>
            <View style={styles.week}>
              <WeekStrip
                today={today}
                workedDays={workedDays}
                onPressDay={(date) => router.push({ pathname: '/calendar', params: { date } })}
              />
            </View>
            {active ? (
              <Button
                title="진행 중인 운동 이어하기"
                icon="play"
                onPress={() => router.push(`/workout/${active.id}`)}
                style={styles.heroButton}
              />
            ) : (
              <Button title="빈 운동 시작" icon="add-circle" onPress={() => startWorkout()} style={styles.heroButton} />
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

          <View style={styles.stats}>
            <Card style={styles.statCard}>
              <Stat label="이번 주" value={`${weekCount}회`} icon="today" />
            </Card>
            <Card style={styles.statCard}>
              <Stat label="이번 달" value={`${monthCount}회`} icon="calendar" tint={colors.success} tintBg={colors.successBg} />
            </Card>
            <Card style={styles.statCard}>
              <Stat label="총 운동" value={`${data.workouts.length}회`} icon="trophy" tint={colors.warning} tintBg={colors.warningSoft} />
            </Card>
          </View>
          <SectionTitle>최근 운동</SectionTitle>
        </View>
      }
      renderItem={({ item }) => <WorkoutCard workout={item} />}
      ListEmptyComponent={
        <Empty icon="barbell" title="아직 운동 기록이 없어요" hint={"루틴을 만들거나 '빈 운동 시작'으로\n첫 기록을 남겨보세요"} />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: 4,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroDate: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroSub: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  heroButton: { marginTop: space.lg },
  week: { marginTop: space.md, marginHorizontal: -space.sm },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streakText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  routineScroll: { marginHorizontal: -space.lg },
  routines: { paddingHorizontal: space.lg, paddingVertical: 4, gap: space.md },
  routineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primaryMid,
    backgroundColor: colors.surface,
  },
  routineEmptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, flex: 1 },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  statCard: { flex: 1, padding: space.md },
});
