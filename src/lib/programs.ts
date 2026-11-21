import { uid } from './id';
import type { Routine } from './types';

export type Goal = 'hypertrophy' | 'strength' | 'beginner';
export type Days = 2 | 3 | 4 | 5;

export const GOALS: { key: Goal; label: string; desc: string }[] = [
  { key: 'hypertrophy', label: '근비대', desc: '근육 크기 · 8~12회' },
  { key: 'strength', label: '근력', desc: '중량 위주 · 5회' },
  { key: 'beginner', label: '입문', desc: '자세 익히기 · 종목 적게' },
];

export const DAY_OPTIONS: { key: Days; label: string; split: string }[] = [
  { key: 2, label: '주 2회', split: '전신 2분할' },
  { key: 3, label: '주 3회', split: '밀기·당기기·하체' },
  { key: 4, label: '주 4회', split: '상체·하체 2회씩' },
  { key: 5, label: '주 5회', split: '부위별 5분할' },
];

type DayTemplate = { name: string; exercises: string[] };

// 기본 종목 id (defaults.ts 참고). 각 날의 앞쪽이 주 운동(복합 관절)
const P = (n: number) => `preset-${n}`;
const TEMPLATES: Record<Days, DayTemplate[]> = {
  2: [
    { name: '전신 A', exercises: [P(11), P(1), P(7), P(20), P(27)] },
    { name: '전신 B', exercises: [P(6), P(18), P(9), P(14), P(29)] },
  ],
  3: [
    { name: '밀기 (가슴·어깨·삼두)', exercises: [P(1), P(2), P(19), P(20), P(25)] },
    { name: '당기기 (등·이두)', exercises: [P(6), P(8), P(10), P(21), P(22)] },
    { name: '하체', exercises: [P(11), P(12), P(13), P(16), P(17)] },
  ],
  4: [
    { name: '상체 A', exercises: [P(1), P(7), P(18), P(9), P(22), P(25)] },
    { name: '하체 A', exercises: [P(11), P(13), P(15), P(17), P(28)] },
    { name: '상체 B', exercises: [P(2), P(8), P(19), P(10), P(24), P(26)] },
    { name: '하체 B', exercises: [P(6), P(12), P(14), P(16), P(29)] },
  ],
  5: [
    { name: '가슴', exercises: [P(1), P(2), P(3), P(4)] },
    { name: '등', exercises: [P(6), P(8), P(9), P(10)] },
    { name: '하체', exercises: [P(11), P(12), P(13), P(15), P(16)] },
    { name: '어깨', exercises: [P(18), P(19), P(20), P(21)] },
    { name: '팔·코어', exercises: [P(22), P(24), P(25), P(26), P(27)] },
  ],
};

/** 여러 관절을 쓰는 주 운동 (무겁게, 세트 많이) */
const COMPOUND = new Set([1, 2, 3, 5, 6, 7, 8, 11, 12, 13, 14, 18].map(P));

const SCHEME: Record<Goal, { main: [number, number, number]; acc: [number, number, number]; maxExercises: number }> = {
  // [세트, 반복, 휴식(초)]
  hypertrophy: { main: [4, 8, 120], acc: [3, 12, 75], maxExercises: 6 },
  strength: { main: [5, 5, 180], acc: [3, 8, 90], maxExercises: 5 },
  beginner: { main: [3, 10, 90], acc: [2, 12, 60], maxExercises: 4 },
};

export type ProgramPreview = { routines: Routine[]; label: string };

/** 목표와 주당 횟수로 루틴 묶음을 만든다 */
export function buildProgram(goal: Goal, days: Days, now = Date.now()): ProgramPreview {
  const scheme = SCHEME[goal];
  const goalLabel = GOALS.find((g) => g.key === goal)!.label;
  const routines = TEMPLATES[days].map((day, i) => ({
    id: uid(),
    name: `${goalLabel} ${days}일 · ${day.name}`,
    // 목록에서 Day 1이 먼저 보이도록 앞날일수록 늦은 시각
    createdAt: now + (TEMPLATES[days].length - i),
    items: day.exercises.slice(0, scheme.maxExercises).map((exerciseId) => {
      const [sets, reps, rest] = COMPOUND.has(exerciseId) ? scheme.main : scheme.acc;
      return { id: uid(), exerciseId, sets, reps, restSeconds: rest };
    }),
  }));
  return { routines, label: `${goalLabel} · 주 ${days}회 (${DAY_OPTIONS.find((d) => d.key === days)!.split})` };
}
