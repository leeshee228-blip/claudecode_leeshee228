import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { parseBackup, serialize } from '../lib/backup';
import { createDefaultData } from '../lib/defaults';
import type { AppData } from '../lib/types';
import { reducer, type Action } from './reducer';

const STORAGE_KEY = 'workout-log/data/v1';

type Ctx = { data: AppData; dispatch: (a: Action) => void; ready: boolean };

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, createDefaultData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) dispatch({ type: 'replaceAll', data: parseBackup(raw) });
      } catch (e) {
        console.warn('저장된 데이터를 불러오지 못했습니다', e);
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  // 변경될 때마다 저장 (짧게 디바운스)
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, serialize(data)).catch((e) => console.warn('저장 실패', e));
    }, 300);
    return () => clearTimeout(t);
  }, [data]);

  const value = useMemo(() => ({ data, dispatch, ready }), [data, ready]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

export function useExerciseMap() {
  const { data } = useData();
  return useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);
}
