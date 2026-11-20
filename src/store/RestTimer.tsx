import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Vibration } from 'react-native';

/*
 * 상태(endAt)와 동작(start/add/stop)을 별도 컨텍스트로 나눈다.
 * 운동 화면은 동작만 구독하므로 타이머가 흐르는 동안 다시 렌더링되지 않고,
 * 매 초 갱신은 RestTimerBar 안에서만 일어난다.
 */

type TimerState = { endAt: number | null; total: number };
type TimerActions = {
  start: (seconds: number) => void;
  add: (seconds: number) => void;
  stop: () => void;
};

const StateContext = createContext<TimerState>({ endAt: null, total: 0 });
const ActionsContext = createContext<TimerActions | null>(null);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>({ endAt: null, total: 0 });

  // 종료 시각에 한 번만 깨어나 진동 후 타이머를 끈다
  useEffect(() => {
    if (state.endAt === null) return;
    const t = setTimeout(
      () => {
        setState((s) => ({ ...s, endAt: null }));
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Vibration.vibrate([0, 300, 150, 300]);
        }
      },
      Math.max(0, state.endAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [state.endAt]);

  const start = useCallback((seconds: number) => setState({ endAt: Date.now() + seconds * 1000, total: seconds }), []);
  const add = useCallback(
    (seconds: number) =>
      setState((s) =>
        s.endAt === null
          ? s
          : { endAt: Math.max(Date.now() + 1000, s.endAt + seconds * 1000), total: Math.max(1, s.total + seconds) },
      ),
    [],
  );
  const stop = useCallback(() => setState((s) => ({ ...s, endAt: null })), []);
  const actions = useMemo(() => ({ start, add, stop }), [start, add, stop]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** start / add / stop (참조가 바뀌지 않음) */
export function useRestTimerActions(): TimerActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useRestTimerActions must be used inside RestTimerProvider');
  return ctx;
}

/** 남은 초를 주기적으로 갱신해서 돌려줌 (타이머가 꺼져 있으면 null) */
export function useRestTimerRemaining(intervalMs = 250): { remaining: number | null; total: number } {
  const { endAt, total } = useContext(StateContext);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt === null) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [endAt, intervalMs]);

  // 시작 직후 now가 아직 갱신 전이면 total을 넘지 않도록 자른다
  return { remaining: endAt === null ? null : Math.min(total, Math.max(0, (endAt - now) / 1000)), total };
}
