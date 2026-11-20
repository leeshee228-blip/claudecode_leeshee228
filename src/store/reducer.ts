import type { AppData, Category, Routine, SetEntry, Settings, Workout, WorkoutExercise } from '../lib/types';

export type Action =
  | { type: 'replaceAll'; data: AppData }
  | {
      type: 'startWorkout';
      id: string;
      date: string;
      startedAt: number;
      exercises?: WorkoutExercise[];
      routineId?: string;
      name?: string;
    }
  | { type: 'updateWorkout'; id: string; patch: Partial<Pick<Workout, 'note' | 'date' | 'endedAt'>> }
  | { type: 'deleteWorkout'; id: string }
  | { type: 'addWorkoutExercise'; workoutId: string; id: string; exerciseId: string; firstSet: SetEntry }
  | { type: 'removeWorkoutExercise'; workoutId: string; weId: string }
  | {
      type: 'updateWorkoutExercise';
      workoutId: string;
      weId: string;
      patch: Partial<Pick<WorkoutExercise, 'exerciseId' | 'restSeconds' | 'note' | 'showSetNotes'>>;
    }
  | { type: 'linkSuperset'; workoutId: string; weId: string; groupId: string }
  | { type: 'unlinkSuperset'; workoutId: string; weId: string }
  | { type: 'saveRoutine'; routine: Routine }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'moveWorkoutExercise'; workoutId: string; weId: string; dir: -1 | 1 }
  | { type: 'addSet'; workoutId: string; weId: string; set: SetEntry }
  | { type: 'updateSet'; workoutId: string; weId: string; setId: string; patch: Partial<Omit<SetEntry, 'id'>> }
  | { type: 'removeSet'; workoutId: string; weId: string; setId: string }
  | { type: 'finishWorkout'; id: string; endedAt: number; uncheckedSets: 'complete' | 'discard' | 'keep' }
  | { type: 'addExercise'; id: string; name: string; category: Category }
  | { type: 'deleteExercise'; id: string }
  | { type: 'updateSettings'; patch: Partial<Settings> };

function mapWorkout(data: AppData, id: string, fn: (w: Workout) => Workout): AppData {
  return { ...data, workouts: data.workouts.map((w) => (w.id === id ? fn(w) : w)) };
}

function mapExercise(
  data: AppData,
  workoutId: string,
  weId: string,
  fn: (sets: SetEntry[]) => SetEntry[],
): AppData {
  return mapWorkout(data, workoutId, (w) => ({
    ...w,
    exercises: w.exercises.map((we) => (we.id === weId ? { ...we, sets: fn(we.sets) } : we)),
  }));
}

/**
 * 슈퍼세트는 연속된 2개 이상의 종목이어야 한다. 순서 변경·삭제 후
 * 혼자 남거나 떨어진 종목의 그룹을 해제해 규칙을 지킨다.
 */
export function normalizeSupersets(exercises: WorkoutExercise[]): WorkoutExercise[] {
  const out = [...exercises];
  const seen = new Set<string>();
  let changed = false;
  let i = 0;
  while (i < out.length) {
    const id = out[i].supersetId;
    let j = i + 1;
    if (id) while (j < out.length && out[j].supersetId === id) j++;
    // [i, j) 구간이 같은 그룹. 2개 미만이거나 앞에서 이미 쓰인 그룹이면 해제
    if (id && (j - i < 2 || seen.has(id))) {
      for (let k = i; k < j; k++) out[k] = { ...out[k], supersetId: undefined };
      changed = true;
    }
    if (id) seen.add(id);
    i = j;
  }
  return changed ? out : exercises;
}

function withExercises(w: Workout, exercises: WorkoutExercise[]): Workout {
  return { ...w, exercises: normalizeSupersets(exercises) };
}

export function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'replaceAll':
      return action.data;

    case 'startWorkout':
      return {
        ...data,
        workouts: [
          ...data.workouts,
          {
            id: action.id,
            date: action.date,
            startedAt: action.startedAt,
            note: '',
            exercises: action.exercises ?? [],
            ...(action.routineId ? { routineId: action.routineId } : {}),
            ...(action.name ? { name: action.name } : {}),
          },
        ],
      };

    case 'updateWorkout':
      return mapWorkout(data, action.id, (w) => ({ ...w, ...action.patch }));

    case 'deleteWorkout':
      return { ...data, workouts: data.workouts.filter((w) => w.id !== action.id) };

    case 'addWorkoutExercise':
      return mapWorkout(data, action.workoutId, (w) => ({
        ...w,
        exercises: [...w.exercises, { id: action.id, exerciseId: action.exerciseId, sets: [action.firstSet] }],
      }));

    case 'removeWorkoutExercise':
      return mapWorkout(data, action.workoutId, (w) =>
        withExercises(
          w,
          w.exercises.filter((we) => we.id !== action.weId),
        ),
      );

    case 'updateWorkoutExercise':
      return mapWorkout(data, action.workoutId, (w) => ({
        ...w,
        exercises: w.exercises.map((we) => (we.id === action.weId ? { ...we, ...action.patch } : we)),
      }));

    case 'linkSuperset':
      // 이 종목과 바로 다음 종목을 같은 슈퍼세트로 묶는다
      return mapWorkout(data, action.workoutId, (w) => {
        const i = w.exercises.findIndex((we) => we.id === action.weId);
        if (i < 0 || i >= w.exercises.length - 1) return w;
        const group = w.exercises[i].supersetId ?? w.exercises[i + 1].supersetId ?? action.groupId;
        const old = w.exercises[i + 1].supersetId;
        return withExercises(
          w,
          w.exercises.map((we, j) => (j === i || j === i + 1 || (old && we.supersetId === old) ? { ...we, supersetId: group } : we)),
        );
      });

    case 'unlinkSuperset':
      return mapWorkout(data, action.workoutId, (w) => {
        const target = w.exercises.find((we) => we.id === action.weId);
        const group = target?.supersetId;
        if (!group) return w;
        // 그룹 중간 종목을 빼면 앞뒤가 끊어지므로 정규화가 남은 쪽을 정리한다
        return withExercises(
          w,
          w.exercises.map((we) => (we.id === action.weId ? { ...we, supersetId: undefined } : we)),
        );
      });

    case 'saveRoutine': {
      const exists = data.routines.some((r) => r.id === action.routine.id);
      return {
        ...data,
        routines: exists
          ? data.routines.map((r) => (r.id === action.routine.id ? action.routine : r))
          : [...data.routines, action.routine],
      };
    }

    case 'deleteRoutine':
      return { ...data, routines: data.routines.filter((r) => r.id !== action.id) };

    case 'moveWorkoutExercise':
      return mapWorkout(data, action.workoutId, (w) => {
        const i = w.exercises.findIndex((we) => we.id === action.weId);
        const j = i + action.dir;
        if (i < 0 || j < 0 || j >= w.exercises.length) return w;
        const exercises = [...w.exercises];
        [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
        return withExercises(w, exercises);
      });

    case 'addSet':
      return mapExercise(data, action.workoutId, action.weId, (sets) => [...sets, action.set]);

    case 'updateSet':
      return mapExercise(data, action.workoutId, action.weId, (sets) =>
        sets.map((s) => (s.id === action.setId ? { ...s, ...action.patch } : s)),
      );

    case 'removeSet':
      return mapExercise(data, action.workoutId, action.weId, (sets) => sets.filter((s) => s.id !== action.setId));

    case 'finishWorkout':
      return mapWorkout(data, action.id, (w) => ({
        ...w,
        endedAt: action.endedAt,
        exercises: w.exercises
          .map((we) => ({
            ...we,
            sets:
              action.uncheckedSets === 'complete'
                ? we.sets.map((s) => (s.reps > 0 ? { ...s, done: true } : s)).filter((s) => s.done)
                : action.uncheckedSets === 'discard'
                  ? we.sets.filter((s) => s.done)
                  : we.sets,
          }))
          .filter((we) => action.uncheckedSets === 'keep' || we.sets.length > 0),
      }));

    case 'addExercise':
      return {
        ...data,
        exercises: [...data.exercises, { id: action.id, name: action.name, category: action.category, custom: true }],
      };

    case 'deleteExercise':
      return { ...data, exercises: data.exercises.filter((e) => e.id !== action.id) };

    case 'updateSettings':
      return { ...data, settings: { ...data.settings, ...action.patch } };
  }
}
