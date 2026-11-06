import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { formatDateLong, todayKey, weekStartKey } from '../../lib/date';
import { sortWorkoutsDesc, weekStreak } from '../../lib/stats';
import { useData } from '../../store/DataProvider';
import { useStartWorkout } from '../../store/useStartWorkout';
import { Button, Card, Empty, SectionTitle, Stat } from '../../ui/components';
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
      data={workouts}
      keyExtractor={(w) => w.id}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            <Text style={styles.heroDate}>{formatDateLong(today)}</Text>
            <Text style={styles.heroTitle}>{greeting()}</Text>
            <Text style={styles.heroSub}>
              {active
                ? '진행 중인 운동이 있어요. 이어서 기록해 보세요.'
                : doneToday
                  ? '오늘 운동을 완료했어요. 멋져요!'
                  : '오늘의 운동을 기록해 볼까요?'}
            </Text>
            {active ? (
              <Button
                title="진행 중인 운동 이어하기"
                icon="play"
                onPress={() => router.push(`/workout/${active.id}`)}
                style={styles.heroButton}
              />
            ) : (
              <Button title="오늘 운동 시작" icon="add-circle" onPress={() => startWorkout()} style={styles.heroButton} />
            )}
          </View>

          <View style={styles.stats}>
            <Card style={styles.statCard}>
              <Stat label="이번 주" value={`${weekCount}회`} icon="today" />
            </Card>
            <Card style={styles.statCard}>
              <Stat
                label="이번 달"
                value={`${monthCount}회`}
                icon="calendar"
                tint={colors.success}
                tintBg={colors.successBg}
              />
            </Card>
            <Card style={styles.statCard}>
              <Stat label="연속" value={`${streak}주`} icon="flame" tint={colors.warning} tintBg={colors.warningSoft} />
            </Card>
          </View>
          <SectionTitle>최근 운동</SectionTitle>
        </View>
      }
      renderItem={({ item }) => <WorkoutCard workout={item} />}
      ListEmptyComponent={
        <Empty icon="barbell" title="아직 운동 기록이 없어요" hint={"위의 '오늘 운동 시작'을 눌러\n첫 기록을 남겨보세요"} />
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
  heroDate: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroSub: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  heroButton: { marginTop: space.lg },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  statCard: { flex: 1, padding: space.md },
});
