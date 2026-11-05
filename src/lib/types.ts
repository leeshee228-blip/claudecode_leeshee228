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
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
};

export type Workout = {
  id: string;
  /** 로컬 날짜, YYYY-MM-DD */
  date: string;
  startedAt: number;
  endedAt?: number;
  note: string;
  exercises: WorkoutExercise[];
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
  settings: Settings;
};
