export const CATEGORIES = ['가슴', '등', '하체', '어깨', '팔', '코어', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Exercise = {
  id: string;
  name: string;
  category: Category;
  /** 사용자가 직접 추가한 종목이면 true */
  custom?: boolean;
};

export type SetEntry = {
  id: string;
  weight: number;
  reps: number;
  done: boolean;
  /** 세트별 메모 */
  note?: string;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
  /** 이 종목만의 휴식 시간 (없으면 기본 설정) */
  restSeconds?: number;
  /** 종목 메모 */
  note?: string;
  /** 세트별 메모 입력란 표시 */
  showSetNotes?: boolean;
  /** 같은 값을 가진 연속된 종목끼리 슈퍼세트 */
  supersetId?: string;
};

export type Workout = {
  id: string;
  /** 로컬 날짜, YYYY-MM-DD */
  date: string;
  startedAt: number;
  endedAt?: number;
  note: string;
  exercises: WorkoutExercise[];
  /** 루틴으로 시작한 경우 */
  routineId?: string;
  name?: string;
};

export type RoutineItem = {
  id: string;
  exerciseId: string;
  sets: number;
  restSeconds?: number;
};

export type Routine = {
  id: string;
  name: string;
  items: RoutineItem[];
  createdAt: number;
};

export type Unit = 'kg' | 'lb';

export type Settings = {
  restSeconds: number;
  unit: Unit;
};

export type AppData = {
  version: 1;
  exercises: Exercise[];
  workouts: Workout[];
  routines: Routine[];
  settings: Settings;
};
