import { addDays, weekStartKey } from './date';
import type { SetEntry, Workout, WorkoutExercise } from './types';

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

export type HistoryPoint = {
  workoutId: string;
  date: string;
  maxWeight: number;
  best1RM: number;
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
        s = { exerciseId: we.exerciseId, sessions: 0, maxWeight: 0, best1RM: 0, lastDate: w.date, seen: new Set() };
        map.set(we.exerciseId, s);
      }
      if (!s.seen.has(w.id)) {
        s.seen.add(w.id);
        s.sessions++;
      }
      for (const set of sets) {
        s.maxWeight = Math.max(s.maxWeight, set.weight);
        s.best1RM = Math.max(s.best1RM, estimate1RM(set.weight, set.reps));
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
