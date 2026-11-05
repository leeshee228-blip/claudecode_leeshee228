import type { AppData, Category, SetEntry, Settings, Workout } from '../lib/types';

export type Action =
  | { type: 'replaceAll'; data: AppData }
  | { type: 'startWorkout'; id: string; date: string; startedAt: number }
  | { type: 'updateWorkout'; id: string; patch: Partial<Pick<Workout, 'note' | 'date' | 'endedAt'>> }
  | { type: 'deleteWorkout'; id: string }
  | { type: 'addWorkoutExercise'; workoutId: string; id: string; exerciseId: string; firstSet: SetEntry }
  | { type: 'removeWorkoutExercise'; workoutId: string; weId: string }
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

export function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'replaceAll':
      return action.data;

    case 'startWorkout':
      return {
        ...data,
        workouts: [
          ...data.workouts,
          { id: action.id, date: action.date, startedAt: action.startedAt, note: '', exercises: [] },
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
      return mapWorkout(data, action.workoutId, (w) => ({
        ...w,
        exercises: w.exercises.filter((we) => we.id !== action.weId),
      }));

    case 'moveWorkoutExercise':
      return mapWorkout(data, action.workoutId, (w) => {
        const i = w.exercises.findIndex((we) => we.id === action.weId);
        const j = i + action.dir;
        if (i < 0 || j < 0 || j >= w.exercises.length) return w;
        const exercises = [...w.exercises];
        [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
        return { ...w, exercises };
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
