import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateKo, formatDuration } from '../lib/date';
import { formatNumber, isCounted, workoutSetCount, workoutVolume } from '../lib/stats';
import type { Workout } from '../lib/types';
import { useData, useExerciseMap } from '../store/DataProvider';
import { colors, radius, shadow, space } from './theme';

export function WorkoutCard({ workout }: { workout: Workout }) {
  const router = useRouter();
  const exMap = useExerciseMap();
  const { data } = useData();
  const unit = data.settings.unit;
  const inProgress = !workout.endedAt;

  return (
    <Pressable
      onPress={() => router.push(`/workout/${workout.id}`)}
      style={({ pressed }) => [styles.card, inProgress && styles.cardActive, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.head}>
        <Text style={styles.date}>{formatDateKo(workout.date)}</Text>
        {inProgress ? (
          <Text style={styles.badge}>진행 중</Text>
        ) : (
          <Text style={styles.meta}>{formatDuration(workout.endedAt! - workout.startedAt)}</Text>
        )}
      </View>

      {workout.exercises.length === 0 ? (
        <Text style={styles.muted}>아직 추가한 종목이 없습니다</Text>
      ) : (
        <View style={{ gap: 3 }}>
          {workout.exercises.slice(0, 5).map((we) => {
            const sets = we.sets.filter(isCounted);
            const top = sets.reduce((m, s) => (s.weight > m.weight ? s : m), sets[0]);
            return (
              <View key={we.id} style={styles.line}>
                <Text style={styles.exName} numberOfLines={1}>
                  {exMap.get(we.exerciseId)?.name ?? '(삭제된 종목)'}
                </Text>
                <Text style={styles.exSets}>
                  {sets.length}세트{top ? ` · 최고 ${formatNumber(top.weight)}${unit}×${top.reps}` : ''}
                </Text>
              </View>
            );
          })}
          {workout.exercises.length > 5 && <Text style={styles.muted}>외 {workout.exercises.length - 5}개 종목</Text>}
        </View>
      )}

      <View style={styles.foot}>
        <Text style={styles.meta}>총 {workoutSetCount(workout)}세트</Text>
        <Text style={styles.meta}>
          볼륨 {formatNumber(workoutVolume(workout))}
          {unit}
        </Text>
      </View>
      {workout.note ? (
        <Text style={styles.note} numberOfLines={2}>
          {workout.note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow,
  },
  cardActive: { borderColor: colors.primary },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  exName: { color: colors.text, fontSize: 14, flexShrink: 1 },
  exSets: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  meta: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  muted: { color: colors.textFaint, fontSize: 13 },
  note: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
});
