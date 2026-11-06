/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reducer } from '../../store/reducer';
import { parseBackup, serialize } from '../backup';
import { createDefaultData, DEFAULT_EXERCISES } from '../defaults';
import { estimateMinutes, exercisesFromRoutine, isLastInSuperset, itemsFromWorkout, muscleSummary } from '../routines';
import type { AppData, Routine, Workout } from '../types';

const routine: Routine = {
  id: 'r1',
  name: '등',
  createdAt: 0,
  items: [
    { id: 'i1', exerciseId: 'preset-8', sets: 3 }, // 풀업 (등)
    { id: 'i2', exerciseId: 'preset-21', sets: 2, restSeconds: 60 }, // 페이스 풀 (어깨)
  ],
};

const past: Workout = {
  id: 'w0',
  date: '2026-11-01',
  startedAt: 1000,
  endedAt: 1000 + 50 * 60000,
  note: '',
  routineId: 'r1',
  exercises: [
    {
      id: 'we0',
      exerciseId: 'preset-8',
      sets: [
        { id: 's1', weight: 10, reps: 8, done: true },
        { id: 's2', weight: 12, reps: 6, done: true },
      ],
    },
  ],
};

test('exercisesFromRoutine prefills from last session and pads with last set', () => {
  const ex = exercisesFromRoutine(routine, [past], 5000);
  assert.equal(ex.length, 2);
  assert.deepEqual(ex[0].sets.map((s) => [s.weight, s.reps, s.done]), [[10, 8, false], [12, 6, false], [12, 6, false]]);
  assert.deepEqual(ex[1].sets.map((s) => s.weight), [0, 0]);
  assert.equal(ex[1].restSeconds, 60);
});

test('itemsFromWorkout uses recorded set counts', () => {
  assert.deepEqual(itemsFromWorkout(past).map((i) => [i.exerciseId, i.sets]), [['preset-8', 2]]);
});

test('muscleSummary groups by category', () => {
  const map = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));
  assert.deepEqual(muscleSummary(routine.items, map), [
    { category: '등', sets: 3 },
    { category: '어깨', sets: 2 },
  ]);
});

test('estimateMinutes prefers measured duration', () => {
  assert.deepEqual(estimateMinutes(routine, [past], 90), { minutes: 50, measured: true });
  // 3×(40+90) + 2×(40+60) = 590초 ≈ 10분
  assert.deepEqual(estimateMinutes(routine, [], 90), { minutes: 10, measured: false });
});

test('superset link / unlink and rest-timer rule', () => {
  let data: AppData = { ...createDefaultData(), workouts: [{ ...past, endedAt: undefined, exercises: [
    { id: 'a', exerciseId: 'preset-1', sets: [] },
    { id: 'b', exerciseId: 'preset-2', sets: [] },
    { id: 'c', exerciseId: 'preset-3', sets: [] },
  ] }] };
  data = reducer(data, { type: 'linkSuperset', workoutId: 'w0', weId: 'a', groupId: 'g' });
  const ex = data.workouts[0].exercises;
  assert.deepEqual(ex.map((e) => e.supersetId), ['g', 'g', undefined]);
  assert.equal(isLastInSuperset(ex, 'a'), false);
  assert.equal(isLastInSuperset(ex, 'b'), true);
  assert.equal(isLastInSuperset(ex, 'c'), true);

  data = reducer(data, { type: 'unlinkSuperset', workoutId: 'w0', weId: 'b' });
  assert.deepEqual(data.workouts[0].exercises.map((e) => e.supersetId), [undefined, undefined, undefined]);
});

test('routine CRUD and persistence of new fields', () => {
  let data = createDefaultData();
  data = reducer(data, { type: 'saveRoutine', routine });
  data = reducer(data, { type: 'saveRoutine', routine: { ...routine, name: '등 (2)' } });
  assert.equal(data.routines.length, 1);
  assert.equal(data.routines[0].name, '등 (2)');

  const w: Workout = {
    ...past,
    name: '등 (2)',
    exercises: [{ ...past.exercises[0], note: '그립 넓게', restSeconds: 75, showSetNotes: true, supersetId: 'g',
      sets: [{ id: 'x', weight: 1, reps: 1, done: true, note: '마지막 힘듦' }] }],
  };
  data = { ...data, workouts: [w] };
  const back = parseBackup(serialize(data));
  assert.deepEqual(back.workouts[0], w);
  assert.deepEqual(back.routines, data.routines);

  data = reducer(data, { type: 'deleteRoutine', id: 'r1' });
  assert.equal(data.routines.length, 0);
});
