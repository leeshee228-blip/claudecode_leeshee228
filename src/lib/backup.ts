import { CATEGORIES, type AppData, type Exercise, type Workout } from './types';
import { isCounted } from './stats';

export function serialize(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function parseExercise(v: unknown): Exercise {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name)) throw new Error('종목 데이터 형식이 올바르지 않습니다.');
  const category = CATEGORIES.includes(v.category as never) ? (v.category as Exercise['category']) : '기타';
  return { id: v.id, name: v.name, category, ...(v.custom ? { custom: true } : {}) };
}

function parseWorkout(v: unknown): Workout {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.date) || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !Array.isArray(v.exercises)) {
    throw new Error('운동 기록 형식이 올바르지 않습니다.');
  }
  return {
    id: v.id,
    date: v.date,
    startedAt: isNum(v.startedAt) ? v.startedAt : 0,
    ...(isNum(v.endedAt) ? { endedAt: v.endedAt } : {}),
    note: isStr(v.note) ? v.note : '',
    exercises: v.exercises.map((we) => {
      if (!isObj(we) || !isStr(we.id) || !isStr(we.exerciseId) || !Array.isArray(we.sets)) {
        throw new Error('운동 기록 형식이 올바르지 않습니다.');
      }
      return {
        id: we.id,
        exerciseId: we.exerciseId,
        sets: we.sets.map((s) => {
          if (!isObj(s) || !isStr(s.id)) throw new Error('세트 기록 형식이 올바르지 않습니다.');
          return {
            id: s.id,
            weight: isNum(s.weight) ? s.weight : 0,
            reps: isNum(s.reps) ? s.reps : 0,
            done: s.done === true,
          };
        }),
      };
    }),
  };
}

/** 백업 JSON을 검증해 AppData로 변환. 형식이 틀리면 Error를 던진다. */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다.');
  }
  if (!isObj(raw) || raw.version !== 1 || !Array.isArray(raw.exercises) || !Array.isArray(raw.workouts)) {
    throw new Error('이 앱의 백업 파일이 아닙니다.');
  }
  const settings = isObj(raw.settings) ? raw.settings : {};
  return {
    version: 1,
    exercises: raw.exercises.map(parseExercise),
    workouts: raw.workouts.map(parseWorkout),
    settings: {
      restSeconds: isNum(settings.restSeconds) && settings.restSeconds > 0 ? settings.restSeconds : 90,
      unit: settings.unit === 'lb' ? 'lb' : 'kg',
    },
  };
}

/** 기존 데이터에 백업을 합침. 같은 id는 백업 쪽으로 덮어쓴다. 설정은 기존 유지. */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const map = new Map(a.map((x) => [x.id, x]));
    for (const x of b) map.set(x.id, x);
    return [...map.values()];
  };
  return {
    ...current,
    exercises: byId(current.exercises, incoming.exercises),
    workouts: byId(current.workouts, incoming.workouts),
  };
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 완료된 세트를 한 줄씩 CSV로 */
export function toCSV(data: AppData): string {
  const names = new Map(data.exercises.map((e) => [e.id, e]));
  const rows: (string | number)[][] = [['날짜', '종목', '부위', '세트', `무게(${data.settings.unit})`, '횟수', '메모']];
  const workouts = [...data.workouts].sort((a, b) =>
    a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1,
  );
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = names.get(we.exerciseId);
      we.sets.filter(isCounted).forEach((s, i) => {
        rows.push([w.date, ex?.name ?? '(삭제된 종목)', ex?.category ?? '', i + 1, s.weight, s.reps, w.note]);
      });
    }
  }
  // 엑셀에서 한글이 깨지지 않도록 BOM 추가
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
