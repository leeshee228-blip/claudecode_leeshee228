import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDateKo, parseDateKey, todayKey } from '../../lib/date';
import { exerciseSummaries, formatNumber, weeklyVolume, weekStreak, workoutSetCount } from '../../lib/stats';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { BarChart } from '../../ui/charts';
import { Card, Empty, SectionTitle, Stat } from '../../ui/components';
import { colors, space } from '../../ui/theme';

export default function StatsScreen() {
  const { data } = useData();
  const exMap = useExerciseMap();
  const router = useRouter();
  const unit = data.settings.unit;
  const today = todayKey();

  const weeks = useMemo(() => weeklyVolume(data.workouts, 8, today), [data.workouts, today]);
  const summaries = useMemo(() => exerciseSummaries(data.workouts), [data.workouts]);
  const totalSets = data.workouts.reduce((s, w) => s + workoutSetCount(w), 0);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const diff = lastWeek && lastWeek.volume > 0 ? ((thisWeek.volume - lastWeek.volume) / lastWeek.volume) * 100 : null;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Card style={styles.row}>
        <Stat label="총 운동" value={`${data.workouts.length}회`} />
        <Stat label="총 세트" value={formatNumber(totalSets)} />
        <Stat label="연속 운동" value={`${weekStreak(data.workouts, today)}주`} />
      </Card>

      <SectionTitle>주간 볼륨 ({unit})</SectionTitle>
      <Card>
        <View style={styles.row}>
          <Stat
            label="이번 주"
            value={formatNumber(thisWeek.volume)}
            sub={diff === null ? `${thisWeek.workouts}회 운동` : `${thisWeek.workouts}회 · 지난주 대비 ${diff >= 0 ? '+' : ''}${Math.round(diff)}%`}
          />
        </View>
        <BarChart
          data={weeks.map((w) => {
            const d = parseDateKey(w.weekStart);
            return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: w.volume };
          })}
        />
      </Card>

      <SectionTitle>종목별 기록</SectionTitle>
      {summaries.length === 0 ? (
        <Empty title="완료한 세트가 없어요" hint="운동 중 세트를 완료 체크하면 통계에 반영됩니다" />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {summaries.map((s, i) => (
            <Pressable
              key={s.exerciseId}
              onPress={() => router.push(`/exercise/${s.exerciseId}`)}
              style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { opacity: 0.6 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{exMap.get(s.exerciseId)?.name ?? '(삭제된 종목)'}</Text>
                <Text style={styles.itemSub}>
                  {s.sessions}회 · 최근 {formatDateKo(s.lastDate)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemValue}>
                  {formatNumber(s.maxWeight)}
                  {unit}
                </Text>
                <Text style={styles.itemSub}>
                  1RM≈{formatNumber(s.best1RM)}
                  {unit}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  row: { flexDirection: 'row' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: space.md },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  itemValue: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
