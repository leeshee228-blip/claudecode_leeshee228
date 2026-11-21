import { formatNumber } from './stats';
import type { Category, SetEntry, Unit } from './types';

export type Recommendation = {
  weight: number;
  reps: number;
  /** 무게를 올림 / 횟수를 올림 / 유지 / 무게를 내림 */
  kind: 'up' | 'reps' | 'keep' | 'down';
  /** 화면에 보여줄 이유 */
  reason: string;
};

/** 한 번에 올릴 무게. 하체·데드리프트처럼 큰 근육 운동은 두 배 */
export function weightStep(category: Category, unit: Unit, exerciseId?: string): number {
  const big = category === '하체' || exerciseId === 'preset-6';
  if (unit === 'lb') return big ? 10 : 5;
  return big ? 5 : 2.5;
}

/**
 * 지난 세션 기록으로 다음 세션의 무게·횟수를 추천한다 (점진적 과부하).
 * - 가장 무거운 무게의 세트들을 기준으로 판단
 * - RPE(체감 강도)가 있으면 우선 사용:
 *     7.5 이하 → 무게 올리기, 8~8.5 → 같은 무게로 1회 더, 9~9.5 → 유지, 10 → 한 단계 내리기
 * - RPE가 없으면: 기준 무게로 2세트 이상 목표 횟수를 채웠으면 무게 올리기, 아니면 유지
 * - 맨몸 운동은 횟수만 늘린다
 */
export function recommendNext(
  lastSets: SetEntry[] | null,
  category: Category,
  unit: Unit,
  exerciseId?: string,
): Recommendation | null {
  const sets = (lastSets ?? []).filter((s) => s.reps > 0);
  if (sets.length === 0) return null;

  const topWeight = Math.max(...sets.map((s) => s.weight));
  const top = sets.filter((s) => s.weight === topWeight);
  const targetReps = Math.max(...top.map((s) => s.reps));
  const rpes = top.map((s) => s.rpe).filter((r): r is number => typeof r === 'number');
  const rpe = rpes.length ? Math.max(...rpes) : null;
  const rpeText = rpe !== null ? `지난번 RPE ${formatNumber(rpe)}` : '';

  if (topWeight === 0) {
    if (rpe !== null && rpe >= 9.5) {
      return { weight: 0, reps: targetReps, kind: 'keep', reason: `${rpeText} · 같은 횟수로 다지기` };
    }
    return { weight: 0, reps: targetReps + 1, kind: 'reps', reason: rpeText ? `${rpeText} · 1회 더 도전` : '1회 더 도전' };
  }

  const step = weightStep(category, unit, exerciseId);
  const up = { weight: topWeight + step, reps: targetReps, kind: 'up' as const };
  const keep = { weight: topWeight, reps: targetReps, kind: 'keep' as const };

  if (rpe !== null) {
    if (rpe <= 7.5) return { ...up, reason: `${rpeText} · 여유가 있었어요` };
    if (rpe <= 8.5) return { weight: topWeight, reps: targetReps + 1, kind: 'reps', reason: `${rpeText} · 같은 무게로 1회 더` };
    if (rpe < 10) return { ...keep, reason: `${rpeText} · 이번엔 유지` };
    return {
      weight: Math.max(0, topWeight - step),
      reps: targetReps,
      kind: 'down',
      reason: `${rpeText}(한계) · 한 단계 낮춰 자세 다지기`,
    };
  }

  const hit = top.filter((s) => s.reps >= targetReps).length;
  if (top.length >= 2 && hit === top.length) {
    return { ...up, reason: `지난번 ${formatNumber(topWeight)}${unit}×${targetReps} ${top.length}세트 성공` };
  }
  return { ...keep, reason: '지난번 무게로 목표 횟수 채우기' };
}
