/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSupersets, reducer } from '../../store/reducer';
import { createDefaultData } from '../defaults';
import { bestE1RMBefore, exerciseSummaries, formatSet, prSetIds } from '../stats';
import type { AppData, Workout, WorkoutExercise } from '../types';

const we = (id: string, supersetId?: string): WorkoutExercise => ({ id, exerciseId: 'preset-1', sets: [], supersetId });
const ids = (list: WorkoutExercise[]) => list.map((e) => e.supersetId ?? '-').join('');

test('normalizeSupersets keeps only contiguous groups of 2+', () => {
  assert.equal(ids(normalizeSupersets([we('a', 'g'), we('b', 'g'), we('c')])), 'gg-');
  assert.equal(ids(normalizeSupersets([we('a', 'g'), we('b'), we('c', 'g')])), '---');
  assert.equal(ids(normalizeSupersets([we('a', 'g'), we('b', 'g'), we('c'), we('d', 'g'), we('e', 'g')])), 'gg---');
  const untouched = [we('a', 'g'), we('b', 'g')];
  assert.equal(normalizeSupersets(untouched), untouched); // 변경 없으면 같은 배열
});

test('moving an exercise out of a superset dissolves the broken group', () => {
  const w: Workout = { id: 'w', date: '2026-11-20', startedAt: 0, note: '', exercises: [we('a', 'g'), we('b', 'g'), we('c')] };
  const data: AppData = { ...createDefaultData(), workouts: [w] };
  const next = reducer(data, { type: 'moveWorkoutExercise', workoutId: 'w', weId: 'b', dir: 1 });
  assert.equal(ids(next.workouts[0].exercises), '---');
});

const set = (id: string, weight: number, reps: number, done = true) => ({ id, weight, reps, done });

test('PR detection compares against prior best and running best', () => {
  const past: Workout = { id: 'p', date: '2026-11-01', startedAt: 0, note: '', exercises: [{ id: 'x', exerciseId: 'preset-1', sets: [set('1', 100, 5)] }] };
  const cur: Workout = { id: 'c', date: '2026-11-20', startedAt: 1, note: '', exercises: [] };
  const best = bestE1RMBefore([past, cur], 'preset-1', cur);
  assert.ok(Math.abs(best - 116.67) < 0.01);
  const prs = prSetIds([set('a', 100, 5), set('b', 105, 5), set('c', 110, 5, false), set('d', 105, 6)], best);
  assert.deepEqual([...prs], ['b', 'd']);
  assert.equal(prSetIds([set('a', 100, 5)], 0).size, 0); // 첫 기록은 PR 아님
});

test('bodyweight sets format and summaries', () => {
  assert.equal(formatSet({ weight: 0, reps: 12 }), '12회');
  assert.equal(formatSet({ weight: 62.5, reps: 8 }, 'kg'), '62.5kg×8');
  const w: Workout = { id: 'w', date: '2026-11-20', startedAt: 0, note: '', exercises: [{ id: 'x', exerciseId: 'preset-8', sets: [set('1', 0, 12), set('2', 0, 9)] }] };
  const [s] = exerciseSummaries([w]);
  assert.equal(s.maxWeight, 0);
  assert.equal(s.maxReps, 12);
});
