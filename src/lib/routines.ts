import { uid } from './id';
import { isCounted } from './stats';
import type { Category, Exercise, Routine, RoutineItem, SetEntry, Workout, WorkoutExercise } from './types';

/** 해당 종목을 가장 최근에 수행한 완료 세트들 (기준 시점 이전) */
function lastSetsFor(workouts: Workout[], exerciseId: string, before: number): SetEntry[] {
  let best: { at: number; sets: SetEntry[] } | null = null;
  for (const w of workouts) {
    if (w.startedAt >= before) continue;
    const sets = w.exercises.filter((we) => we.exerciseId === exerciseId).flatMap((we) => we.sets.filter(isCounted));
    if (sets.length && (!best || w.startedAt > best.at)) best = { at: w.startedAt, sets };
  }
  return best?.sets ?? [];
}

/** 루틴으로 운동을 시작할 때의 종목/세트. 지난 기록의 무게·횟수로 미리 채운다. */
export function exercisesFromRoutine(routine: Routine, workouts: Workout[], now: number): WorkoutExercise[] {
  return routine.items.map((item) => {
    const last = lastSetsFor(workouts, item.exerciseId, now);
    return {
      id: uid(),
      exerciseId: item.exerciseId,
      ...(item.restSeconds ? { restSeconds: item.restSeconds } : {}),
      sets: Array.from({ length: item.sets }, (_, i) => {
        const ref = last[i] ?? last[last.length - 1];
        return { id: uid(), weight: ref?.weight ?? 0, reps: ref?.reps ?? 0, done: false };
      }),
    };
  });
}

/** 운동 기록을 루틴 항목으로 변환 (세트 수 = 기록된 세트 수) */
export function itemsFromWorkout(workout: Workout): RoutineItem[] {
  return workout.exercises.map((we) => ({
    id: uid(),
    exerciseId: we.exerciseId,
    sets: Math.max(1, we.sets.length),
    ...(we.restSeconds ? { restSeconds: we.restSeconds } : {}),
  }));
}

export type MuscleCount = { category: Category; sets: number };

/** 부위별 세트 수 합계 (많은 순) */
export function muscleSummary(
  items: { exerciseId: string; sets: number }[],
  exercises: Map<string, Exercise>,
): MuscleCount[] {
  const map = new Map<Category, number>();
  for (const it of items) {
    const cat = exercises.get(it.exerciseId)?.category ?? '기타';
    map.set(cat, (map.get(cat) ?? 0) + it.sets);
  }
  return [...map.entries()].map(([category, sets]) => ({ category, sets })).sort((a, b) => b.sets - a.sets);
}

/**
 * 예상 소요 시간(분). 이 루틴으로 끝낸 최근 운동(5분 이상)이 있으면 그 시간,
 * 없으면 세트당 40초 + 휴식 시간으로 계산.
 */
export function estimateMinutes(routine: Routine, workouts: Workout[], defaultRest: number): { minutes: number; measured: boolean } {
  // 5분 미만은 기록 실수로 보고 무시
  const last = workouts
    .filter((w) => w.routineId === routine.id && w.endedAt && w.endedAt - w.startedAt >= 5 * 60000)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (last?.endedAt) return { minutes: Math.max(1, Math.round((last.endedAt - last.startedAt) / 60000)), measured: true };
  const seconds = routine.items.reduce((sum, it) => sum + it.sets * (40 + (it.restSeconds ?? defaultRest)), 0);
  return { minutes: Math.max(1, Math.round(seconds / 60)), measured: false };
}

/** 슈퍼세트 그룹에서 이 종목이 마지막인지 (마지막일 때만 휴식 타이머 시작) */
export function isLastInSuperset(exercises: WorkoutExercise[], weId: string): boolean {
  const i = exercises.findIndex((we) => we.id === weId);
  const group = exercises[i]?.supersetId;
  if (!group) return true;
  return exercises[i + 1]?.supersetId !== group;
}
