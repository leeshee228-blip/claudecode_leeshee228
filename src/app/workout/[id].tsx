import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, formatClock, formatDateLong, formatDuration, todayKey } from '../../lib/date';
import { uid } from '../../lib/id';
import { isLastInSuperset } from '../../lib/routines';
import { formatNumber, previousSets, workoutSetCount, workoutVolume } from '../../lib/stats';
import type { Category, Exercise, SetEntry, WorkoutExercise } from '../../lib/types';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { useRestTimer } from '../../store/RestTimer';
import { Button, Card, Empty } from '../../ui/components';
import { choose, confirm, notify } from '../../ui/dialog';
import { ExerciseMenu } from '../../ui/ExerciseMenu';
import { ExercisePicker } from '../../ui/ExercisePicker';
import { MuscleFigure } from '../../ui/MuscleFigure';
import { RestTimerBar } from '../../ui/RestTimerBar';
import { SetHeader, SetRow } from '../../ui/SetRow';
import { colors, radius, space } from '../../ui/theme';

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  return <Text style={styles.metaText}>진행 {formatDuration(now - since)}</Text>;
}

type PickerMode = { mode: 'add' } | { mode: 'swap'; weId: string } | null;

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useData();
  const router = useRouter();
  const exMap = useExerciseMap();
  const timer = useRestTimer();
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState<PickerMode>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const workout = data.workouts.find((w) => w.id === id);
  const unit = data.settings.unit;

  const prevByExercise = useMemo(() => {
    const map = new Map<string, SetEntry[] | null>();
    if (!workout) return map;
    for (const we of workout.exercises) {
      if (!map.has(we.exerciseId)) map.set(we.exerciseId, previousSets(data.workouts, we.exerciseId, workout));
    }
    return map;
  }, [data.workouts, workout]);

  // 슈퍼세트 그룹마다 A, B, C… 라벨
  const supersetLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const we of workout?.exercises ?? []) {
      if (we.supersetId && !labels.has(we.supersetId)) labels.set(we.supersetId, String.fromCharCode(65 + labels.size));
    }
    return labels;
  }, [workout]);

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: '운동' }} />
        <Empty title="운동 기록을 찾을 수 없습니다" />
      </View>
    );
  }

  const inProgress = !workout.endedAt;
  const wid = workout.id;
  const menuIndex = workout.exercises.findIndex((we) => we.id === menuFor);
  const menuWe = menuIndex >= 0 ? workout.exercises[menuIndex] : null;

  const onPick = (exercise: Exercise) => {
    if (picker?.mode === 'swap') {
      dispatch({ type: 'updateWorkoutExercise', workoutId: wid, weId: picker.weId, patch: { exerciseId: exercise.id } });
      return;
    }
    const prev = previousSets(data.workouts, exercise.id, workout);
    const first = prev?.[0];
    dispatch({
      type: 'addWorkoutExercise',
      workoutId: wid,
      id: uid(),
      exerciseId: exercise.id,
      firstSet: { id: uid(), weight: first?.weight ?? 0, reps: first?.reps ?? 0, done: false },
    });
  };

  const addSet = (we: WorkoutExercise) => {
    const last = we.sets[we.sets.length - 1];
    const prev = prevByExercise.get(we.exerciseId)?.[we.sets.length];
    const base = last ?? prev;
    dispatch({
      type: 'addSet',
      workoutId: wid,
      weId: we.id,
      set: { id: uid(), weight: base?.weight ?? 0, reps: base?.reps ?? 0, done: false },
    });
  };

  const toggleDone = (we: WorkoutExercise, set: SetEntry) => {
    if (!set.done && set.reps <= 0) {
      notify('횟수를 입력하세요', '완료 처리하려면 1회 이상이어야 합니다.');
      return;
    }
    dispatch({ type: 'updateSet', workoutId: wid, weId: we.id, setId: set.id, patch: { done: !set.done } });
    // 슈퍼세트는 그룹의 마지막 종목을 끝냈을 때만 휴식
    if (!set.done && inProgress && isLastInSuperset(workout.exercises, we.id)) {
      timer.start(we.restSeconds ?? data.settings.restSeconds);
    }
  };

  const removeSet = async (we: WorkoutExercise, set: SetEntry, index: number) => {
    if (await confirm('세트 삭제', `${index + 1}세트를 삭제할까요?`, '삭제', true)) {
      dispatch({ type: 'removeSet', workoutId: wid, weId: we.id, setId: set.id });
    }
  };

  const removeExercise = async (we: WorkoutExercise) => {
    const name = exMap.get(we.exerciseId)?.name ?? '종목';
    if (await confirm('종목 삭제', `"${name}"과(와) 모든 세트를 삭제할까요?`, '삭제', true)) {
      dispatch({ type: 'removeWorkoutExercise', workoutId: wid, weId: we.id });
    }
  };

  const finish = async () => {
    const all = workout.exercises.flatMap((we) => we.sets);
    const unchecked = all.filter((s) => !s.done);
    if (all.length === 0) {
      if (await confirm('빈 운동', '기록된 세트가 없습니다. 이 운동을 삭제할까요?', '삭제', true)) {
        dispatch({ type: 'deleteWorkout', id: wid });
        timer.stop();
        router.back();
      }
      return;
    }
    let mode: 'complete' | 'discard' | 'keep' = 'keep';
    if (unchecked.length > 0) {
      const choice = await choose('운동 완료', `완료 체크하지 않은 세트가 ${unchecked.length}개 있습니다.`, [
        { value: 'complete', text: '모두 완료 처리' },
        { value: 'discard', text: '체크 안 한 세트 삭제', destructive: true },
      ]);
      if (!choice) return;
      mode = choice;
    } else if (!(await confirm('운동 완료', '오늘 운동을 마칠까요?', '완료'))) {
      return;
    }
    dispatch({ type: 'finishWorkout', id: wid, endedAt: Date.now(), uncheckedSets: mode });
    timer.stop();
    router.back();
  };

  const deleteWorkout = async () => {
    if (await confirm('운동 삭제', '이 운동 기록 전체를 삭제할까요? 되돌릴 수 없습니다.', '삭제', true)) {
      dispatch({ type: 'deleteWorkout', id: wid });
      if (inProgress) timer.stop();
      router.back();
    }
  };

  const shiftDate = (days: number) => {
    const next = addDays(workout.date, days);
    if (next > todayKey()) return;
    dispatch({ type: 'updateWorkout', id: wid, patch: { date: next } });
  };

  // 시트가 닫히는 애니메이션이 끝난 뒤 다음 모달을 연다 (iOS는 모달 두 개를 동시에 못 띄움)
  const afterSheet = (fn: () => void) => setTimeout(fn, 350);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Stack.Screen
        options={{
          title: workout.name ?? (inProgress ? '운동 중' : '운동 기록'),
          headerRight: () => (
            <Pressable onPress={deleteWorkout} hitSlop={10} accessibilityLabel="운동 삭제" accessibilityRole="button">
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.dateRow}>
          <Pressable onPress={() => shiftDate(-1)} hitSlop={10} accessibilityLabel="하루 전으로">
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.date}>{formatDateLong(workout.date)}</Text>
          <Pressable onPress={() => shiftDate(1)} hitSlop={10} disabled={workout.date >= todayKey()} accessibilityLabel="하루 뒤로">
            <Ionicons name="chevron-forward" size={22} color={workout.date >= todayKey() ? colors.border : colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          {inProgress ? (
            <Elapsed since={workout.startedAt} />
          ) : (
            <Text style={styles.metaText}>운동 시간 {formatDuration(workout.endedAt! - workout.startedAt)}</Text>
          )}
          <Text style={styles.metaText}>
            {workoutSetCount(workout)}세트 · 볼륨 {formatNumber(workoutVolume(workout))}
            {unit}
          </Text>
        </View>

        <TextInput
          value={workout.note}
          onChangeText={(note) => dispatch({ type: 'updateWorkout', id: wid, patch: { note } })}
          placeholder="오늘 운동 메모 (컨디션, 특이사항 등)"
          placeholderTextColor={colors.textFaint}
          multiline
          style={styles.note}
        />

        {workout.exercises.map((we) => {
          const ex = exMap.get(we.exerciseId);
          return (
            <ExerciseBlock
              key={we.id}
              we={we}
              name={ex?.name ?? '(삭제된 종목)'}
              category={ex?.category ?? '기타'}
              superset={we.supersetId ? supersetLabels.get(we.supersetId) : undefined}
              rest={we.restSeconds ?? data.settings.restSeconds}
              prev={prevByExercise.get(we.exerciseId) ?? null}
              unit={unit}
              onOpen={() => router.push(`/exercise/${we.exerciseId}`)}
              onMenu={() => setMenuFor(we.id)}
              onAddSet={() => addSet(we)}
              onToggleDone={(s) => toggleDone(we, s)}
              onRemoveSet={(s, idx) => removeSet(we, s, idx)}
              onChangeSet={(s, patch) => dispatch({ type: 'updateSet', workoutId: wid, weId: we.id, setId: s.id, patch })}
            />
          );
        })}

        <Button title="+ 종목 추가" variant="secondary" onPress={() => setPickerOpen(true)} style={{ marginTop: space.lg }} />
        {inProgress && <Button title="운동 완료" onPress={finish} style={{ marginTop: space.md }} />}
        {workout.exercises.length > 0 && (
          <>
            <Button
              title="이 구성을 루틴으로 저장"
              variant="ghost"
              onPress={() => router.push({ pathname: '/routine/edit', params: { fromWorkout: wid } })}
              style={{ marginTop: space.sm }}
            />
            <Text style={styles.hint}>세트 번호를 길게 누르면 삭제 · '이전' 기록을 누르면 값이 채워집니다</Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.timer, { bottom: insets.bottom + space.md }]} pointerEvents="box-none">
        <RestTimerBar />
      </View>

      <ExercisePicker visible={picker !== null} onClose={() => setPicker(null)} onPick={onPick} />

      {menuWe && (
        <ExerciseMenu
          visible
          onClose={() => setMenuFor(null)}
          name={exMap.get(menuWe.exerciseId)?.name ?? '종목'}
          we={menuWe}
          defaultRest={data.settings.restSeconds}
          canMoveUp={menuIndex > 0}
          canMoveDown={menuIndex < workout.exercises.length - 1}
          hasNext={menuIndex < workout.exercises.length - 1}
          onRest={(restSeconds) => dispatch({ type: 'updateWorkoutExercise', workoutId: wid, weId: menuWe.id, patch: { restSeconds } })}
          onNote={(note) => dispatch({ type: 'updateWorkoutExercise', workoutId: wid, weId: menuWe.id, patch: { note } })}
          onToggleSetNotes={(showSetNotes) =>
            dispatch({ type: 'updateWorkoutExercise', workoutId: wid, weId: menuWe.id, patch: { showSetNotes } })
          }
          onMove={(dir) => dispatch({ type: 'moveWorkoutExercise', workoutId: wid, weId: menuWe.id, dir })}
          onSwap={() => {
            const weId = menuWe.id;
            afterSheet(() => setPicker({ mode: 'swap', weId }));
          }}
          onAnalyze={() => {
            const exId = menuWe.exerciseId;
            afterSheet(() => router.push(`/exercise/${exId}`));
          }}
          onSuperset={() =>
            dispatch(
              menuWe.supersetId
                ? { type: 'unlinkSuperset', workoutId: wid, weId: menuWe.id }
                : { type: 'linkSuperset', workoutId: wid, weId: menuWe.id, groupId: uid() },
            )
          }
          onRemove={() => {
            const target = menuWe;
            afterSheet(() => removeExercise(target));
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

type BlockProps = {
  we: WorkoutExercise;
  name: string;
  category: Category;
  superset?: string;
  rest: number;
  prev: SetEntry[] | null;
  unit: string;
  onOpen: () => void;
  onMenu: () => void;
  onAddSet: () => void;
  onToggleDone: (s: SetEntry) => void;
  onRemoveSet: (s: SetEntry, index: number) => void;
  onChangeSet: (s: SetEntry, patch: Partial<Omit<SetEntry, 'id'>>) => void;
};

function ExerciseBlock(p: BlockProps) {
  return (
    <Card style={[styles.block, p.superset ? styles.blockSuperset : null]}>
      <View style={styles.blockHead}>
        <Pressable onPress={p.onOpen} style={{ flex: 1 }} accessibilityHint="종목 기록 보기">
          <Text style={styles.blockTitle}>{p.name}</Text>
        </Pressable>
      </View>
      {p.we.note ? <Text style={styles.exNote}>📝 {p.we.note}</Text> : null}
      <SetHeader unit={p.unit} />
      {p.we.sets.map((s, i) => (
        <SetRow
          key={s.id}
          index={i}
          set={s}
          prev={p.prev?.[i]}
          unit={p.unit}
          showNote={p.we.showSetNotes}
          onChange={(patch) => p.onChangeSet(s, patch)}
          onToggleDone={() => p.onToggleDone(s)}
          onRemove={() => p.onRemoveSet(s, i)}
        />
      ))}
      <Button title="세트 추가" icon="add" variant="ghost" small onPress={p.onAddSet} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.text, fontSize: 18, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  metaText: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  note: {
    marginTop: space.md,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 44,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  block: { marginTop: space.md, gap: 4, paddingHorizontal: space.md },
  blockHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  blockTitle: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  blockActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: space.lg },
  timer: { position: 'absolute', left: space.lg, right: space.lg },
});
