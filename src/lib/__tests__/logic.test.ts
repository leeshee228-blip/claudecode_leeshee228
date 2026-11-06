/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reducer } from '../../store/reducer';
import { mergeData, parseBackup, serialize, toCSV } from '../backup';
import { addDays, monthGrid, weekStartKey } from '../date';
import { createDefaultData } from '../defaults';
import {
  estimate1RM,
  exerciseHistory,
  exerciseSummaries,
  previousSets,
  weeklyVolume,
  weekStreak,
  workoutVolume,
} from '../stats';
import type { Workout } from '../types';

const set = (id: string, weight: number, reps: number, done = true) => ({ id, weight, reps, done });

function workout(id: string, date: string, sets: ReturnType<typeof set>[], exerciseId = 'preset-1'): Workout {
  return {
    id,
    date,
    startedAt: new Date(date).getTime(),
    endedAt: new Date(date).getTime() + 3600_000,
    note: '',
    exercises: [{ id: `we-${id}`, exerciseId, sets }],
  };
}

test('date helpers', () => {
  assert.equal(weekStartKey('2026-11-05'), '2026-11-02'); // 목 → 월
  assert.equal(weekStartKey('2026-11-08'), '2026-11-02'); // 일 → 같은 주 월요일
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  const grid = monthGrid(2026, 10); // 2026년 11월, 1일은 일요일
  assert.equal(grid[0], '2026-11-01');
  assert.equal(grid.length % 7, 0);
});

test('estimate1RM uses Epley and handles edge cases', () => {
  assert.equal(estimate1RM(100, 1), 100);
  assert.equal(estimate1RM(100, 0), 0);
  assert.ok(Math.abs(estimate1RM(100, 10) - 133.33) < 0.01);
});

test('volume counts only completed sets', () => {
  const w = workout('a', '2026-11-01', [set('1', 100, 5), set('2', 100, 5, false), set('3', 50, 0)]);
  assert.equal(workoutVolume(w), 500);
});

test('previousSets finds the most recent earlier session', () => {
  const ws = [
    workout('old', '2026-10-01', [set('1', 80, 5)]),
    workout('mid', '2026-10-15', [set('2', 90, 5)]),
    workout('cur', '2026-11-01', []),
    workout('future', '2026-11-20', [set('3', 120, 5)]),
  ];
  assert.deepEqual(previousSets(ws, 'preset-1', ws[2])?.map((s) => s.weight), [90]);
  assert.equal(previousSets(ws, 'preset-1', ws[0]), null);
});

test('exercise history and summaries', () => {
  const ws = [
    workout('b', '2026-10-15', [set('2', 90, 5)]),
    workout('a', '2026-10-01', [set('1', 80, 10)]),
  ];
  const h = exerciseHistory(ws, 'preset-1');
  assert.deepEqual(h.map((p) => p.date), ['2026-10-01', '2026-10-15']);
  const [s] = exerciseSummaries(ws);
  assert.equal(s.sessions, 2);
  assert.equal(s.maxWeight, 90);
  assert.equal(s.lastDate, '2026-10-15');
});

test('weekly volume and streak', () => {
  const ws = [
    workout('a', '2026-11-03', [set('1', 100, 10)]),
    workout('b', '2026-10-28', [set('2', 100, 5)]),
    workout('c', '2026-10-14', [set('3', 100, 5)]),
  ];
  const weeks = weeklyVolume(ws, 4, '2026-11-05');
  assert.deepEqual(weeks.map((w) => w.volume), [500, 0, 500, 1000]);
  assert.equal(weekStreak(ws, '2026-11-05'), 2);
  // 이번 주에 아직 운동 안 했어도 지난주까지 연속이면 유지
  assert.equal(weekStreak(ws.slice(1), '2026-11-05'), 1);
});

test('backup round-trip, validation and merge', () => {
  const data = { ...createDefaultData(), workouts: [workout('a', '2026-11-01', [set('1', 100, 5)])] };
  const parsed = parseBackup(serialize(data));
  assert.deepEqual(parsed.workouts, data.workouts);
  assert.throws(() => parseBackup('not json'), /JSON/);
  assert.throws(() => parseBackup('{"version":2}'), /백업 파일/);

  const other = { ...createDefaultData(), workouts: [workout('b', '2026-11-02', [set('2', 60, 8)])] };
  const merged = mergeData(data, other);
  assert.equal(merged.workouts.length, 2);
  assert.equal(merged.exercises.length, data.exercises.length);
});

test('CSV escapes values and lists completed sets', () => {
  const w = workout('a', '2026-11-01', [set('1', 100, 5), set('2', 100, 5, false)]);
  w.note = '좋음, "가볍게"';
  const csv = toCSV({ ...createDefaultData(), workouts: [w] });
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[1], '2026-11-01,벤치프레스,가슴,1,100,5,"좋음, ""가볍게"""');
});

test('reducer: finishWorkout handles unchecked sets', () => {
  const base = {
    ...createDefaultData(),
    workouts: [{ ...workout('a', '2026-11-01', [set('1', 100, 5), set('2', 100, 5, false), set('3', 0, 0, false)]), endedAt: undefined }],
  };
  const complete = reducer(base, { type: 'finishWorkout', id: 'a', endedAt: 1, uncheckedSets: 'complete' });
  assert.deepEqual(complete.workouts[0].exercises[0].sets.map((s) => s.id), ['1', '2']);
  assert.ok(complete.workouts[0].exercises[0].sets.every((s) => s.done));

  const discard = reducer(base, { type: 'finishWorkout', id: 'a', endedAt: 1, uncheckedSets: 'discard' });
  assert.deepEqual(discard.workouts[0].exercises[0].sets.map((s) => s.id), ['1']);
  assert.equal(discard.workouts[0].endedAt, 1);
});

test('reducer: move exercise', () => {
  const w = workout('a', '2026-11-01', []);
  w.exercises = [
    { id: 'x', exerciseId: 'preset-1', sets: [] },
    { id: 'y', exerciseId: 'preset-2', sets: [] },
  ];
  const next = reducer({ ...createDefaultData(), workouts: [w] }, { type: 'moveWorkoutExercise', workoutId: 'a', weId: 'y', dir: -1 });
  assert.deepEqual(next.workouts[0].exercises.map((e) => e.id), ['y', 'x']);
});
