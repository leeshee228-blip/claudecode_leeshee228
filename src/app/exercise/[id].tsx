import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDateKo, parseDateKey } from '../../lib/date';
import { getGuide } from '../../lib/guides';
import { exerciseHistory, formatNumber, formatSet } from '../../lib/stats';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { LineChart } from '../../ui/charts';
import { Card, Chip, Empty, SectionTitle, Stat } from '../../ui/components';
import { ExerciseGuide } from '../../ui/ExerciseGuide';
import { colors, space } from '../../ui/theme';

type Metric = 'best1RM' | 'maxWeight' | 'volume' | 'maxReps';
const WEIGHTED: { key: Metric; label: string }[] = [
  { key: 'best1RM', label: '추정 1RM' },
  { key: 'maxWeight', label: '최고 무게' },
  { key: 'volume', label: '볼륨' },
];
const BODYWEIGHT: { key: Metric; label: string }[] = [{ key: 'maxReps', label: '최다 반복' }];

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useData();
  const router = useRouter();
  const exercise = useExerciseMap().get(id);
  const unit = data.settings.unit;
  const [picked, setPicked] = useState<Metric>('best1RM');
  const guide = getGuide(exercise);

  const history = useMemo(() => exerciseHistory(data.workouts, id), [data.workouts, id]);
  const maxWeight = Math.max(0, ...history.map((h) => h.maxWeight));
  const best1RM = Math.max(0, ...history.map((h) => h.best1RM));
  const maxReps = Math.max(0, ...history.map((h) => h.maxReps));
  // 무게 기록이 한 번도 없으면 맨몸 운동으로 보고 반복 횟수 위주로 보여준다
  const bodyweight = (history.length > 0 || !!guide?.bodyweight) && maxWeight === 0;
  const metrics = bodyweight ? BODYWEIGHT : WEIGHTED;
  const metric = metrics.some((m) => m.key === picked) ? picked : metrics[0].key;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise?.name ?? '종목 기록' }} />
      {exercise && <Text style={styles.category}>{exercise.category}</Text>}

      {guide && exercise ? (
        <ExerciseGuide guide={guide} name={exercise.name} />
      ) : exercise?.custom ? (
        <Card style={styles.customNote}>
          <Text style={styles.customNoteText}>직접 추가한 종목이라 운동 설명이 없어요.</Text>
        </Card>
      ) : null}

      <SectionTitle>나의 기록</SectionTitle>

      {history.length === 0 ? (
        <Empty icon="barbell-outline" title="아직 이 종목 기록이 없어요" hint="운동 중 세트를 완료 체크하면 여기에 기록과 그래프가 쌓여요" />
      ) : (
        <>
      <Card style={styles.row}>
        {bodyweight ? (
          <>
            <Stat label="최다 반복" value={`${maxReps}회`} />
            <Stat label="수행 횟수" value={`${history.length}회`} />
          </>
        ) : (
          <>
            <Stat label="최고 무게" value={`${formatNumber(maxWeight)}${unit}`} />
            <Stat label="추정 1RM" value={`${formatNumber(best1RM)}${unit}`} />
            <Stat label="최다 반복" value={`${maxReps}회`} />
          </>
        )}
      </Card>

      <SectionTitle>추이</SectionTitle>
      <Card>
        <View style={styles.chips}>
          {metrics.map((m) => (
            <Chip key={m.key} label={m.label} selected={metric === m.key} onPress={() => setPicked(m.key)} />
          ))}
        </View>
        <LineChart
          data={history.map((h) => {
            const d = parseDateKey(h.date);
            return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: h[metric] };
          })}
        />
        {!bodyweight && <Text style={styles.note}>추정 1RM = 무게 × (1 + 횟수 ÷ 30) (Epley 공식)</Text>}
      </Card>

        </>
      )}

      {history.length > 0 && <SectionTitle>기록 ({history.length}회)</SectionTitle>}
      {history.length > 0 && (
        <View style={{ gap: space.sm }}>
          {[...history].reverse().map((h) => (
            <Pressable key={h.workoutId} onPress={() => router.push(`/workout/${h.workoutId}`)}>
              <Card style={{ gap: 6 }}>
                <View style={styles.histHead}>
                  <Text style={styles.histDate}>{formatDateKo(h.date)}</Text>
                  <Text style={styles.histMeta}>
                    {h.maxWeight > 0
                      ? `볼륨 ${formatNumber(h.volume)}${unit}`
                      : `총 ${h.sets.reduce((sum, s) => sum + s.reps, 0)}회`}
                  </Text>
                </View>
                <Text style={styles.histSets}>
                  {h.sets.map((s) => formatSet(s)).join('   ')}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  category: { color: colors.textMuted, marginBottom: space.md },
  row: { flexDirection: 'row' },
  customNote: { backgroundColor: colors.surfaceAlt, boxShadow: 'none' },
  customNoteText: { color: colors.textMuted, fontSize: 14 },
  chips: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  note: { color: colors.textFaint, fontSize: 11, marginTop: space.sm },
  histHead: { flexDirection: 'row', justifyContent: 'space-between' },
  histDate: { color: colors.text, fontWeight: '700' },
  histMeta: { color: colors.textMuted, fontSize: 12 },
  histSets: { color: colors.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], lineHeight: 20 },
});
