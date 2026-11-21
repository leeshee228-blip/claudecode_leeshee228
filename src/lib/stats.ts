import { addDays, weekStartKey } from './date';
import type { Category, SetEntry, Workout, WorkoutExercise } from './types';

/** 기록으로 인정되는 세트: 완료 체크 + 횟수 1 이상 */
export function isCounted(s: SetEntry): boolean {
  return s.done && s.reps > 0;
}

/** Epley 공식 추정 1RM */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function exerciseVolume(we: WorkoutExercise): number {
  return we.sets.filter(isCounted).reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, we) => sum + exerciseVolume(we), 0);
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((sum, we) => sum + we.sets.filter(isCounted).length, 0);
}

/** 최신순 정렬 (날짜 → 시작 시각) */
export function sortWorkoutsDesc(workouts: Workout[]): Workout[] {
  return [...workouts].sort((a, b) =>
    a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1,
  );
}

function isBefore(a: Workout, b: Workout): boolean {
  return a.date === b.date ? a.startedAt < b.startedAt : a.date < b.date;
}

/** 현재 운동 이전에 해당 종목을 수행한 가장 최근 세트 목록 */
export function previousSets(
  workouts: Workout[],
  exerciseId: string,
  current: Workout,
): SetEntry[] | null {
  let best: { w: Workout; sets: SetEntry[] } | null = null;
  for (const w of workouts) {
    if (w.id === current.id || !isBefore(w, current)) continue;
    const sets = w.exercises
      .filter((we) => we.exerciseId === exerciseId)
      .flatMap((we) => we.sets.filter(isCounted));
    if (sets.length === 0) continue;
    if (!best || isBefore(best.w, w)) best = { w, sets };
  }
  return best?.sets ?? null;
}

/** 현재 운동 이전 모든 기록 중 해당 종목의 최고 추정 1RM (기록 없으면 0) */
export function bestE1RMBefore(workouts: Workout[], exerciseId: string, current: Workout): number {
  let best = 0;
  for (const w of workouts) {
    if (w.id === current.id || !isBefore(w, current)) continue;
    for (const we of w.exercises) {
      if (we.exerciseId !== exerciseId) continue;
      for (const s of we.sets) if (isCounted(s)) best = Math.max(best, estimate1RM(s.weight, s.reps));
    }
  }
  return best;
}

/**
 * 이번 운동에서 개인 최고 기록(PR)을 갱신한 세트 id.
 * 이전 기록이 있을 때만 판단하며, 같은 운동 안에서도 갱신될 때마다 표시한다.
 */
export function prSetIds(sets: SetEntry[], bestBefore: number): Set<string> {
  const ids = new Set<string>();
  if (bestBefore <= 0) return ids;
  let running = bestBefore;
  for (const s of sets) {
    if (!isCounted(s)) continue;
    const e = estimate1RM(s.weight, s.reps);
    if (e > running + 1e-9) {
      ids.add(s.id);
      running = e;
    }
  }
  return ids;
}

export type HistoryPoint = {
  workoutId: string;
  date: string;
  maxWeight: number;
  best1RM: number;
  maxReps: number;
  volume: number;
  sets: SetEntry[];
};

/** 종목별 날짜순(오래된 → 최신) 기록 */
export function exerciseHistory(workouts: Workout[], exerciseId: string): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  for (const w of workouts) {
    const sets = w.exercises
      .filter((we) => we.exerciseId === exerciseId)
      .flatMap((we) => we.sets.filter(isCounted));
    if (sets.length === 0) continue;
    points.push({
      workoutId: w.id,
      date: w.date,
      maxWeight: Math.max(...sets.map((s) => s.weight)),
      best1RM: Math.max(...sets.map((s) => estimate1RM(s.weight, s.reps))),
      maxReps: Math.max(...sets.map((s) => s.reps)),
      volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
      sets,
    });
  }
  return points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export type ExerciseSummary = {
  exerciseId: string;
  sessions: number;
  maxWeight: number;
  best1RM: number;
  maxReps: number;
  lastDate: string;
};

export function exerciseSummaries(workouts: Workout[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary & { seen: Set<string> }>();
  for (const w of workouts) {
    for (const we of w.exercises) {
      const sets = we.sets.filter(isCounted);
      if (sets.length === 0) continue;
      let s = map.get(we.exerciseId);
      if (!s) {
        s = { exerciseId: we.exerciseId, sessions: 0, maxWeight: 0, best1RM: 0, maxReps: 0, lastDate: w.date, seen: new Set() };
        map.set(we.exerciseId, s);
      }
      if (!s.seen.has(w.id)) {
        s.seen.add(w.id);
        s.sessions++;
      }
      for (const set of sets) {
        s.maxWeight = Math.max(s.maxWeight, set.weight);
        s.best1RM = Math.max(s.best1RM, estimate1RM(set.weight, set.reps));
        s.maxReps = Math.max(s.maxReps, set.reps);
      }
      if (w.date > s.lastDate) s.lastDate = w.date;
    }
  }
  return [...map.values()]
    .map(({ seen: _seen, ...rest }) => rest)
    .sort((a, b) => b.sessions - a.sessions || (a.lastDate < b.lastDate ? 1 : -1));
}

export type WeekBucket = { weekStart: string; volume: number; workouts: number };

/** 최근 N주(이번 주 포함) 주간 볼륨 */
export function weeklyVolume(workouts: Workout[], weeks: number, today: string): WeekBucket[] {
  const thisWeek = weekStartKey(today);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: addDays(thisWeek, -7 * i), volume: 0, workouts: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]));
  for (const w of workouts) {
    const i = index.get(weekStartKey(w.date));
    if (i === undefined) continue;
    buckets[i].volume += workoutVolume(w);
    buckets[i].workouts += 1;
  }
  return buckets;
}

/** 운동한 주가 연속된 횟수 (이번 주에 아직 안 했으면 지난주부터 계산) */
export function weekStreak(workouts: Workout[], today: string): number {
  const weeks = new Set(workouts.map((w) => weekStartKey(w.date)));
  let cursor = weekStartKey(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString('ko-KR');
}

/** 세트 표기: 무게가 있으면 "60×10", 맨몸이면 "10회" (unit을 주면 "60kg×10") */
export function formatSet(s: { weight: number; reps: number }, unit = ''): string {
  return s.weight > 0 ? `${formatNumber(s.weight)}${unit}×${s.reps}` : `${s.reps}회`;
}

/** 주당 부위별 권장 세트 (근비대 기준 일반적 가이드: 10~20세트) */
export const WEEKLY_SET_RANGE = { min: 10, max: 20 };

export type MuscleWeek = { category: Category; sets: number };

/** 해당 주(월~일)에 부위별로 완료한 세트 수. 기타는 제외 */
export function weeklyMuscleSets(
  workouts: Workout[],
  categoryOf: (exerciseId: string) => Category | undefined,
  weekStart: string,
): MuscleWeek[] {
  const end = addDays(weekStart, 7);
  const counts = new Map<Category, number>();
  for (const w of workouts) {
    if (w.date < weekStart || w.date >= end) continue;
    for (const we of w.exercises) {
      const cat = categoryOf(we.exerciseId);
      if (!cat || cat === '기타') continue;
      counts.set(cat, (counts.get(cat) ?? 0) + we.sets.filter(isCounted).length);
    }
  }
  return (['가슴', '등', '하체', '어깨', '팔', '코어'] as Category[]).map((category) => ({
    category,
    sets: counts.get(category) ?? 0,
  }));
}
