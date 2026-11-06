import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { todayKey } from '../lib/date';
import { uid } from '../lib/id';
import { exercisesFromRoutine } from '../lib/routines';
import type { Routine } from '../lib/types';
import { useData } from './DataProvider';

/** 새 운동을 만들고 운동 화면으로 이동. 루틴을 주면 루틴 구성으로 시작. */
export function useStartWorkout() {
  const { data, dispatch } = useData();
  const router = useRouter();
  return useCallback(
    (opts: { date?: string; routine?: Routine } = {}) => {
      const id = uid();
      const now = Date.now();
      const { routine } = opts;
      dispatch({
        type: 'startWorkout',
        id,
        date: opts.date ?? todayKey(),
        startedAt: now,
        ...(routine
          ? { routineId: routine.id, name: routine.name, exercises: exercisesFromRoutine(routine, data.workouts, now) }
          : {}),
      });
      router.push(`/workout/${id}`);
    },
    [data.workouts, dispatch, router],
  );
}
