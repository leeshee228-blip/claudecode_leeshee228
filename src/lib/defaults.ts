import type { AppData, Category, Exercise } from './types';

const preset: [string, Category][] = [
  ['벤치프레스', '가슴'],
  ['인클라인 벤치프레스', '가슴'],
  ['덤벨 프레스', '가슴'],
  ['체스트 플라이', '가슴'],
  ['딥스', '가슴'],
  ['데드리프트', '등'],
  ['바벨 로우', '등'],
  ['풀업', '등'],
  ['랫 풀다운', '등'],
  ['시티드 케이블 로우', '등'],
  ['스쿼트', '하체'],
  ['레그 프레스', '하체'],
  ['루마니안 데드리프트', '하체'],
  ['런지', '하체'],
  ['레그 익스텐션', '하체'],
  ['레그 컬', '하체'],
  ['카프 레이즈', '하체'],
  ['오버헤드 프레스', '어깨'],
  ['덤벨 숄더 프레스', '어깨'],
  ['사이드 레터럴 레이즈', '어깨'],
  ['페이스 풀', '어깨'],
  ['바벨 컬', '팔'],
  ['덤벨 컬', '팔'],
  ['해머 컬', '팔'],
  ['트라이셉스 푸시다운', '팔'],
  ['라잉 트라이셉스 익스텐션', '팔'],
  ['플랭크', '코어'],
  ['크런치', '코어'],
  ['행잉 레그 레이즈', '코어'],
];

export const DEFAULT_EXERCISES: Exercise[] = preset.map(([name, category], i) => ({
  id: `preset-${i + 1}`,
  name,
  category,
}));

export function createDefaultData(): AppData {
  return {
    version: 1,
    exercises: DEFAULT_EXERCISES,
    workouts: [],
    settings: { restSeconds: 90, unit: 'kg' },
  };
}
