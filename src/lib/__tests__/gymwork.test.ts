/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBackup, serialize, toCSV } from '../backup';
import { createDefaultData, DEFAULT_EXERCISES } from '../defaults';
import { buildProgram } from '../programs';
import { recommendNext, weightStep } from '../progression';
import { exercisesFromRoutine } from '../routines';
import { weeklyMuscleSets } from '../stats';
import type { SetEntry, Workout } from '../types';

const set = (weight: number, reps: number, rpe?: number): SetEntry => ({ id: Math.random().toString(36), weight, reps, done: true, ...(rpe ? { rpe } : {}) });

test('weight step: bigger for legs and deadlift, lb doubles', () => {
  assert.equal(weightStep('가슴', 'kg'), 2.5);
  assert.equal(weightStep('하체', 'kg'), 5);
  assert.equal(weightStep('등', 'kg', 'preset-6'), 5);
  assert.equal(weightStep('가슴', 'lb'), 5);
});

test('recommendation uses RPE when logged', () => {
  assert.equal(recommendNext(null, '가슴', 'kg'), null);
  const easy = recommendNext([set(60, 8, 7), set(60, 8, 7)], '가슴', 'kg')!;
  assert.deepEqual([easy.kind, easy.weight, easy.reps], ['up', 62.5, 8]);
  const mid = recommendNext([set(60, 8, 8)], '가슴', 'kg')!;
  assert.deepEqual([mid.kind, mid.weight, mid.reps], ['reps', 60, 9]);
  const hard = recommendNext([set(60, 8, 9)], '가슴', 'kg')!;
  assert.deepEqual([hard.kind, hard.weight], ['keep', 60]);
  const max = recommendNext([set(100, 5, 10)], '하체', 'kg')!;
  assert.deepEqual([max.kind, max.weight], ['down', 95]);
  assert.ok(!/로 |으로 /.test(easy.reason)); // 숫자 뒤 조사 없이 표기
});

test('recommendation without RPE: progress only after hitting reps on 2+ sets', () => {
  const ok = recommendNext([set(100, 5), set(100, 5), set(90, 8)], '하체', 'kg')!;
  assert.deepEqual([ok.kind, ok.weight, ok.reps], ['up', 105, 5]);
  const missed = recommendNext([set(100, 5), set(100, 3)], '하체', 'kg')!;
  assert.deepEqual([missed.kind, missed.weight], ['keep', 100]);
  const single = recommendNext([set(100, 5)], '하체', 'kg')!;
  assert.equal(single.kind, 'keep');
  const bw = recommendNext([set(0, 10), set(0, 8)], '등', 'kg')!;
  assert.deepEqual([bw.kind, bw.weight, bw.reps], ['reps', 0, 11]);
});

test('program builder makes one routine per day with sensible schemes', () => {
  const known = new Set(DEFAULT_EXERCISES.map((e) => e.id));
  for (const days of [2, 3, 4, 5] as const) {
    for (const goal of ['hypertrophy', 'strength', 'beginner'] as const) {
      const p = buildProgram(goal, days);
      assert.equal(p.routines.length, days);
      for (const r of p.routines) {
        assert.ok(r.items.length >= 3);
        for (const it of r.items) assert.ok(known.has(it.exerciseId) && it.sets > 0 && it.reps! > 0);
      }
    }
  }
  const strength = buildProgram('strength', 3).routines[0].items[0];
  assert.deepEqual([strength.sets, strength.reps], [5, 5]); // 벤치 5×5
  assert.ok(buildProgram('beginner', 5).routines.every((r) => r.items.length <= 4));
  // 루틴 시작 시 기록이 없으면 목표 횟수로 채움
  const ex = exercisesFromRoutine(buildProgram('hypertrophy', 3).routines[0], [], Date.now());
  assert.equal(ex[0].sets[0].reps, 8);
});

test('weekly muscle sets count completed sets in the week', () => {
  const map = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e.category]));
  const w = (id: string, date: string, exerciseId: string, sets: SetEntry[]): Workout => ({ id, date, startedAt: 0, note: '', exercises: [{ id: id + 'x', exerciseId, sets }] });
  const rows = weeklyMuscleSets(
    [
      w('a', '2026-11-16', 'preset-1', [set(60, 8), set(60, 8), { ...set(60, 8), done: false }]),
      w('b', '2026-11-22', 'preset-8', [set(0, 10)]),
      w('c', '2026-11-15', 'preset-1', [set(60, 8)]), // 지난주
    ],
    (id) => map.get(id),
    '2026-11-16',
  );
  assert.equal(rows.find((r) => r.category === '가슴')!.sets, 2);
  assert.equal(rows.find((r) => r.category === '등')!.sets, 1);
  assert.equal(rows.length, 6);
});

test('RPE, target reps and trackRpe survive backup; CSV has RPE column', () => {
  const data = createDefaultData();
  data.settings.trackRpe = false;
  data.routines = buildProgram('strength', 2).routines;
  data.workouts = [{ id: 'w', date: '2026-11-20', startedAt: 0, note: '', exercises: [{ id: 'x', exerciseId: 'preset-1', sets: [{ id: 's', weight: 60, reps: 8, done: true, rpe: 8.5 }] }] }];
  const back = parseBackup(serialize(data));
  assert.equal(back.workouts[0].exercises[0].sets[0].rpe, 8.5);
  assert.equal(back.routines[0].items[0].reps, 5);
  assert.equal(back.settings.trackRpe, false);
  assert.ok(toCSV(data).split('\n')[1].includes(',60,8,8.5,'));
});
