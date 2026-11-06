const pad = (n: number) => String(n).padStart(2, '0');

/** Date → 로컬 기준 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** YYYY-MM-DD → 로컬 자정 Date */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateKo(key: string): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function formatDateLong(key: string): string {
  const d = parseDateKey(key);
  return `${d.getFullYear()}년 ${formatDateKo(key)}`;
}

/** 해당 날짜가 속한 주의 월요일 날짜 키 */
export function weekStartKey(key: string): string {
  const d = parseDateKey(key);
  const diff = (d.getDay() + 6) % 7; // 월요일=0
  d.setDate(d.getDate() - diff);
  return toDateKey(d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** 달력 표시용: 해당 월을 일요일 시작 6주 그리드로 (null = 빈칸) */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toDateKey(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
