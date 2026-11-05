import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Vibration } from 'react-native';

type Ctx = {
  /** 남은 초 (타이머가 꺼져 있으면 null) */
  remaining: number | null;
  total: number;
  start: (seconds: number) => void;
  add: (seconds: number) => void;
  stop: () => void;
};

const TimerContext = createContext<Ctx | null>(null);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  // 종료 시각 기준으로 계산해서 앱이 잠깐 백그라운드에 가도 정확함
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endAt]);

  useEffect(() => {
    if (endAt !== null && now >= endAt) {
      setEndAt(null);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Vibration.vibrate([0, 300, 150, 300]);
      }
    }
  }, [now, endAt]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setTotal(seconds);
    setEndAt(t + seconds * 1000);
  }, []);

  const add = useCallback((seconds: number) => {
    setEndAt((e) => (e === null ? e : Math.max(Date.now() + 1000, e + seconds * 1000)));
    setTotal((t) => Math.max(1, t + seconds));
  }, []);

  const stop = useCallback(() => setEndAt(null), []);

  const remaining = endAt === null ? null : Math.max(0, (endAt - now) / 1000);
  const value = useMemo(() => ({ remaining, total, start, add, stop }), [remaining, total, start, add, stop]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useRestTimer(): Ctx {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useRestTimer must be used inside RestTimerProvider');
  return ctx;
}
