import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, formatClock, formatDateLong, formatDuration, todayKey } from '../../lib/date';
import { uid } from '../../lib/id';
import { recommendNext, type Recommendation } from '../../lib/progression';
import { isLastInSuperset } from '../../lib/routines';
import { bestE1RMBefore, formatNumber, formatSet, previousSets, prSetIds, workoutSetCount, workoutVolume } from '../../lib/stats';
import type { Category, Exercise, SetEntry, Unit, WorkoutExercise } from '../../lib/types';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { useRestTimerActions } from '../../store/RestTimer';
import { Button, Card, Empty } from '../../ui/components';
import { choose, confirm, notify } from '../../ui/dialog';
import { ExerciseMenu } from '../../ui/ExerciseMenu';
import { ExercisePicker } from '../../ui/ExercisePicker';
import { MuscleFigure } from '../../ui/MuscleFigure';
import { RestTimerBar } from '../../ui/RestTimerBar';
import { SetHeader, SetRow } from '../../ui/SetRow';
import { colors, radius, space } from '../../ui/theme';

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
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
  const timer = useRestTimerActions();
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState<PickerMode>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const workout = data.workouts.find((w) => w.id === id);
  const unit = data.settings.unit;

  // 종목별 지난 세션 세트와 이전 최고 추정 1RM
  const history = useMemo(() => {
    const map = new Map<string, { prev: SetEntry[] | null; best: number }>();
    if (!workout) return map;
    for (const we of workout.exercises) {
      if (map.has(we.exerciseId)) continue;
      map.set(we.exerciseId, {
        prev: previousSets(data.workouts, we.exerciseId, workout),
        best: bestE1RMBefore(data.workouts, we.exerciseId, workout),
      });
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
    const prev = history.get(we.exerciseId)?.prev?.[we.sets.length];
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
              prev={history.get(we.exerciseId)?.prev ?? null}
              bestBefore={history.get(we.exerciseId)?.best ?? 0}
              recommendation={
                inProgress ? recommendNext(history.get(we.exerciseId)?.prev ?? null, ex?.category ?? '기타', unit, we.exerciseId) : null
              }
              rpeEnabled={data.settings.trackRpe !== false}
              unit={unit}
              onApplyRec={(rec) => {
                for (const s of we.sets) {
                  if (!s.done) dispatch({ type: 'updateSet', workoutId: wid, weId: we.id, setId: s.id, patch: { weight: rec.weight, reps: rec.reps } });
                }
              }}
              onOpen={() => router.push(`/exercise/${we.exerciseId}`)}
              onMenu={() => setMenuFor(we.id)}
              onAddSet={() => addSet(we)}
              onToggleDone={(s) => toggleDone(we, s)}
              onRemoveSet={(s, idx) => removeSet(we, s, idx)}
              onChangeSet={(s, patch) => dispatch({ type: 'updateSet', workoutId: wid, weId: we.id, setId: s.id, patch })}
            />
          );
        })}

        <Button title="종목 추가" icon="add" variant="secondary" onPress={() => setPicker({ mode: 'add' })} style={{ marginTop: space.lg }} />
        {inProgress && <Button title="운동 완료" icon="checkmark-circle" onPress={finish} style={{ marginTop: space.md }} />}
        {workout.exercises.length > 0 && (
          <>
            <Button
              title="이 구성을 루틴으로 저장"
              variant="ghost"
              onPress={() => router.push({ pathname: '/routine/edit', params: { fromWorkout: wid } })}
              style={{ marginTop: space.sm }}
            />
            <Text style={styles.hint}>세트 번호 길게 누르기: 삭제 · 이전 기록 누르기: 값 채우기{'\n'}🏆 = 개인 최고 기록 갱신</Text>
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
  bestBefore: number;
  recommendation: Recommendation | null;
  rpeEnabled: boolean;
  unit: Unit;
  onApplyRec: (rec: Recommendation) => void;
  onOpen: () => void;
  onMenu: () => void;
  onAddSet: () => void;
  onToggleDone: (s: SetEntry) => void;
  onRemoveSet: (s: SetEntry, index: number) => void;
  onChangeSet: (s: SetEntry, patch: Partial<Omit<SetEntry, 'id'>>) => void;
};

function ExerciseBlock(p: BlockProps) {
  const prs = prSetIds(p.we.sets, p.bestBefore);
  // 방금 끝낸(가장 뒤의 완료) 세트에만 체감 강도를 묻는다
  const lastDone = [...p.we.sets].reverse().find((s) => s.done);
  const rec = p.recommendation;
  const pending = p.we.sets.filter((s) => !s.done);
  // 아직 안 한 세트가 추천값과 다를 때만 추천 카드 표시
  const showRec = !!rec && pending.length > 0 && pending.some((s) => s.weight !== rec.weight || s.reps !== rec.reps);
  return (
    <Card style={[styles.block, p.superset ? styles.blockSuperset : null]}>
      <View style={styles.blockHead}>
        <Pressable onPress={p.onOpen} style={styles.blockTitleWrap} accessibilityHint="운동 방법과 기록 보기">
          <MuscleFigure category={p.category} size={44} />
          <View style={{ flex: 1 }}>
            {p.superset ? <Text style={styles.supersetTag}>슈퍼세트 {p.superset}</Text> : null}
            <View style={styles.blockTitleRow}>
              <Text style={styles.blockTitle} numberOfLines={1}>
                {p.name}
              </Text>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.blockSub}>휴식 {formatClock(p.rest)}</Text>
          </View>
        </Pressable>
        <Pressable onPress={p.onMenu} hitSlop={8} style={styles.menuBtn} accessibilityLabel={`${p.name} 메뉴`} accessibilityRole="button">
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      {p.we.note ? <Text style={styles.exNote}>📝 {p.we.note}</Text> : null}
      {showRec && rec ? (
        <View style={styles.rec}>
          <Ionicons
            name={rec.kind === 'up' ? 'trending-up' : rec.kind === 'down' ? 'trending-down' : 'flag-outline'}
            size={18}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.recTitle}>
              오늘 목표 {formatSet(rec, p.unit)}
            </Text>
            <Text style={styles.recReason}>{rec.reason}</Text>
          </View>
          <Pressable
            onPress={() => p.onApplyRec(rec)}
            style={({ pressed }) => [styles.recBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`남은 세트에 ${formatSet(rec, p.unit)} 적용`}
          >
            <Text style={styles.recBtnText}>적용</Text>
          </Pressable>
        </View>
      ) : null}
      <SetHeader unit={p.unit} />
      {p.we.sets.map((s, i) => (
        <SetRow
          key={s.id}
          index={i}
          set={s}
          prev={p.prev?.[i]}
          unit={p.unit}
          showNote={p.we.showSetNotes}
          isPR={prs.has(s.id)}
          rpeEnabled={p.rpeEnabled}
          askRpe={lastDone?.id === s.id}
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
  blockSuperset: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  blockHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  blockTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  blockTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  blockSub: { color: colors.textFaint, fontSize: 12, marginTop: 1 },
  supersetTag: { color: colors.warning, fontSize: 11, fontWeight: '800', marginBottom: 1 },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: 6,
  },
  recTitle: { color: colors.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  recReason: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  recBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  recBtnText: { color: colors.primaryText, fontWeight: '700', fontSize: 13 },
  exNote: { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: space.md },
  timer: { position: 'absolute', left: space.lg, right: space.lg },
});
