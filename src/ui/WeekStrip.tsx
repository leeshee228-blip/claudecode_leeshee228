import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, weekStartKey } from '../lib/date';
import { colors, space } from './theme';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

type Props = {
  today: string;
  workedDays: Set<string>;
  onPressDay: (date: string) => void;
};

/** 이번 주 월~일. 오늘은 강조, 운동한 날은 점 표시, 미래는 흐리게 */
export function WeekStrip({ today, workedDays, onPressDay }: Props) {
  const monday = weekStartKey(today);
  return (
    <View style={styles.row}>
      {DAYS.map((label, i) => {
        const key = addDays(monday, i);
        const isToday = key === today;
        const future = key > today;
        const worked = workedDays.has(key);
        return (
          <Pressable
            key={key}
            onPress={() => onPressDay(key)}
            style={[styles.day, isToday && styles.today]}
            accessibilityLabel={`${label}요일 ${Number(key.slice(8))}일${worked ? ', 운동함' : ''}`}
          >
            <Text style={[styles.label, isToday && styles.labelToday, future && styles.future]}>{label}</Text>
            <Text style={[styles.num, future && styles.future]}>{Number(key.slice(8))}</Text>
            <View style={[styles.dot, worked && styles.dotOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6, paddingVertical: space.sm, width: 44, borderRadius: 22 },
  today: { backgroundColor: colors.surfaceAlt },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  labelToday: {
    color: colors.bg,
    backgroundColor: colors.text,
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
  },
  num: { color: colors.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  future: { color: colors.textFaint },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: colors.primary },
});
