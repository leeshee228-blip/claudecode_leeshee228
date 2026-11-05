import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { todayKey } from '../lib/date';
import { uid } from '../lib/id';
import { useData } from './DataProvider';

/** 새 운동을 만들고 운동 화면으로 이동 */
export function useStartWorkout() {
  const { dispatch } = useData();
  const router = useRouter();
  return useCallback(
    (date: string = todayKey()) => {
      const id = uid();
      dispatch({ type: 'startWorkout', id, date, startedAt: Date.now() });
      router.push(`/workout/${id}`);
    },
    [dispatch, router],
  );
}
