import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDateKo, monthGrid, todayKey } from '../../lib/date';
import { formatNumber, workoutVolume } from '../../lib/stats';
import type { Workout } from '../../lib/types';
import { useData } from '../../store/DataProvider';
import { useStartWorkout } from '../../store/useStartWorkout';
import { Button, Card, Empty, SectionTitle, Stat } from '../../ui/components';
import { WorkoutCard } from '../../ui/WorkoutCard';
import { colors, radius, space } from '../../ui/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarScreen() {
  const { data } = useData();
  const startWorkout = useStartWorkout();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  // 홈의 주간 달력에서 날짜를 눌러 들어온 경우 그 날짜/달로 이동
  useEffect(() => {
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;
    setSelected(dateParam);
    setCursor({ year: Number(dateParam.slice(0, 4)), month: Number(dateParam.slice(5, 7)) - 1 });
  }, [dateParam]);

  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of data.workouts) map.set(w.date, [...(map.get(w.date) ?? []), w]);
    return map;
  }, [data.workouts]);

  const cells = monthGrid(cursor.year, cursor.month);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthWorkouts = data.workouts.filter((w) => w.date.startsWith(monthPrefix));
  const monthDays = new Set(monthWorkouts.map((w) => w.date)).size;
  const monthVolume = monthWorkouts.reduce((s, w) => s + workoutVolume(w), 0);
  const selectedWorkouts = [...(byDate.get(selected) ?? [])].sort((a, b) => a.startedAt - b.startedAt);

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.monthRow}>
          <Pressable onPress={() => move(-1)} hitSlop={12} accessibilityLabel="이전 달">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.month}>
            {cursor.year}년 {cursor.month + 1}월
          </Text>
          <Pressable onPress={() => move(1)} hitSlop={12} accessibilityLabel="다음 달">
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WEEK.map((d, i) => (
            <Text key={d} style={[styles.weekday, i === 0 && { color: colors.danger }]}>
              {d}
            </Text>
          ))}
          {cells.map((key, i) => {
            if (!key) return <View key={`e${i}`} style={styles.cell} />;
            const has = byDate.has(key);
            const isSel = key === selected;
            const isToday = key === today;
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(key)}
                style={styles.cell}
                accessibilityLabel={`${formatDateKo(key)}${has ? ', 운동함' : ''}`}
              >
                <View style={[styles.day, has && styles.dayDone, isSel && (has ? styles.daySelDone : styles.daySel)]}>
                  <Text style={[styles.dayText, has && styles.dayTextDone, isToday && !has && { color: colors.primary }]}>
                    {Number(key.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.summary}>
        <Stat label="운동한 날" value={`${monthDays}일`} />
        <Stat label="월간 볼륨" value={`${formatNumber(monthVolume)}${data.settings.unit}`} />
      </Card>

      <SectionTitle>{formatDateKo(selected)}</SectionTitle>
      {selectedWorkouts.length === 0 ? (
        <View>
          <Empty icon="calendar-clear-outline" title="이 날은 운동 기록이 없어요" />
          {selected <= today && (
            <Button title="이 날짜에 기록 추가" variant="secondary" onPress={() => startWorkout({ date: selected })} />
          )}
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {selectedWorkouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  month: { color: colors.text, fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: colors.textFaint, fontSize: 12, paddingBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: '82%',
    height: '82%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayDone: { backgroundColor: colors.primary },
  daySel: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  daySelDone: { backgroundColor: colors.primary, borderColor: colors.primaryMid },
  dayText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  dayTextDone: { color: colors.primaryText, fontWeight: '800' },
  summary: { flexDirection: 'row', marginTop: space.md },
});
