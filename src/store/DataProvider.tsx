import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { parseBackup } from '../lib/backup';
import { createDefaultData } from '../lib/defaults';
import type { AppData } from '../lib/types';
import { reducer, type Action } from './reducer';

const STORAGE_KEY = 'workout-log/data/v1';
const SAVE_DELAY_MS = 400;

type Ctx = { data: AppData; dispatch: (a: Action) => void; ready: boolean };

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, createDefaultData);
  const [ready, setReady] = useState(false);
  // 마지막으로 저장한 객체. 같은 객체면 다시 쓰지 않는다.
  const saved = useRef<AppData | null>(null);
  const latest = useRef(data);

  useEffect(() => {
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) dispatch({ type: 'replaceAll', data: parseBackup(raw) });
      } catch (e) {
        // 읽기에 실패한 원본을 따로 보관해서 기본값으로 덮어써도 복구할 수 있게 한다
        console.warn('저장된 데이터를 불러오지 못했습니다', e);
        if (raw) await AsyncStorage.setItem(`${STORAGE_KEY}.unreadable-${Date.now()}`, raw).catch(() => {});
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    latest.current = data;
    if (!ready) return;
    if (saved.current === null) {
      // 불러온 직후의 상태는 저장소와 같으므로 건너뜀
      saved.current = data;
      return;
    }
    const t = setTimeout(() => persist(data, saved), SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [data, ready]);

  // 앱이 백그라운드로 갈 때 대기 중인 변경을 즉시 저장
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && saved.current !== null) persist(latest.current, saved);
    });
    return () => sub.remove();
  }, []);

  const value = useMemo(() => ({ data, dispatch, ready }), [data, ready]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function persist(data: AppData, saved: { current: AppData | null }) {
  if (saved.current === data) return;
  saved.current = data;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) => console.warn('저장 실패', e));
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
