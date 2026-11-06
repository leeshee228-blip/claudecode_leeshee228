import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClock, formatDateKo } from '../../lib/date';
import { estimateMinutes, muscleSummary } from '../../lib/routines';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { useStartWorkout } from '../../store/useStartWorkout';
import { Button, Empty, SectionTitle } from '../../ui/components';
import { confirm } from '../../ui/dialog';
import { MuscleFigure } from '../../ui/MuscleFigure';
import { colors, space } from '../../ui/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useData();
  const exMap = useExerciseMap();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startWorkout = useStartWorkout();
  const routine = data.routines.find((r) => r.id === id);

  const summary = useMemo(() => (routine ? muscleSummary(routine.items, exMap) : []), [routine, exMap]);

  if (!routine) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: '루틴' }} />
        <Empty title="루틴을 찾을 수 없습니다" />
      </View>
    );
  }

  const est = estimateMinutes(routine, data.workouts, data.settings.restSeconds);
  const lastDone = data.workouts
    .filter((w) => w.routineId === routine.id && w.endedAt)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  const active = data.workouts.find((w) => !w.endedAt);

  const remove = async () => {
    if (await confirm('루틴 삭제', `"${routine.name}" 루틴을 삭제할까요? 운동 기록은 그대로 남습니다.`, '삭제', true)) {
      dispatch({ type: 'deleteRoutine', id: routine.id });
      router.back();
    }
  };

  const start = async () => {
    if (active && !(await confirm('진행 중인 운동이 있어요', '진행 중인 운동은 그대로 두고 새 운동을 시작할까요?', '새로 시작'))) {
      return;
    }
    startWorkout({ routine });
  };

  const hours = Math.floor(est.minutes / 60);
  const durationText = hours > 0 ? `${hours}시간 ${est.minutes % 60}분` : `${est.minutes}분`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: routine.name,
          headerRight: () => (
            <Pressable onPress={remove} hitSlop={10} accessibilityLabel="루틴 삭제" accessibilityRole="button">
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}>
        <Text style={styles.meta}>
          {routine.items.length}종목 · {est.measured ? '' : '약 '}
          {durationText}
          {est.measured ? ' (지난 기록)' : ''}
        </Text>
        {lastDone && <Text style={styles.metaFaint}>마지막 수행 {formatDateKo(lastDone.date)}</Text>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscles} style={styles.musclesWrap}>
          {summary.map((m) => (
            <View key={m.category} style={styles.muscle}>
              <MuscleFigure category={m.category} size={76} />
              <View>
                <Text style={styles.muscleName}>{m.category}</Text>
                <Text style={styles.muscleSets}>{m.sets}세트</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <SectionTitle>종목</SectionTitle>
        {routine.items.length === 0 ? (
          <Empty title="종목이 없어요" hint="'루틴 편집'에서 종목을 추가하세요" />
        ) : (
          <View style={{ gap: space.lg }}>
            {routine.items.map((it) => {
              const ex = exMap.get(it.exerciseId);
              return (
                <Pressable key={it.id} style={styles.item} onPress={() => router.push(`/exercise/${it.exerciseId}`)}>
                  <MuscleFigure category={ex?.category ?? '기타'} size={64} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{ex?.name ?? '(삭제된 종목)'}</Text>
                    <Text style={styles.itemSub}>
                      {it.sets}세트
                      {it.restSeconds ? ` · 휴식 ${formatClock(it.restSeconds)}` : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          title="루틴 편집"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/routine/edit', params: { id: routine.id } })}
        />
        <Button title="운동 시작하기" style={{ flex: 1 }} onPress={start} disabled={routine.items.length === 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  meta: { color: colors.text, fontSize: 17, fontWeight: '800' },
  metaFaint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  musclesWrap: { marginTop: space.lg, marginHorizontal: -space.lg },
  muscles: { paddingHorizontal: space.lg, gap: space.xl },
  muscle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  muscleName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muscleSets: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  itemName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  itemSub: { color: colors.textMuted, fontSize: 14, marginTop: 3 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
