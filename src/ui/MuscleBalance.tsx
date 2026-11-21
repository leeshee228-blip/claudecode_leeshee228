import { StyleSheet, Text, View } from 'react-native';
import { WEEKLY_SET_RANGE, type MuscleWeek } from '../lib/stats';
import { MuscleFigure } from './MuscleFigure';
import { colors, radius, space } from './theme';

const SCALE_MAX = 25; // 막대 끝 = 25세트

function status(sets: number): { label: string; color: string; bg: string } {
  if (sets === 0) return { label: '안 함', color: colors.textFaint, bg: colors.surfaceAlt };
  if (sets < WEEKLY_SET_RANGE.min) return { label: '부족', color: colors.warning, bg: colors.warningSoft };
  if (sets <= WEEKLY_SET_RANGE.max) return { label: '적정', color: colors.success, bg: colors.successBg };
  return { label: '많음', color: colors.primary, bg: colors.primarySoft };
}

/** 부위별 주간 세트 수를 권장 범위(10~20세트)와 함께 막대로 보여준다 */
export function MuscleBalance({ rows }: { rows: MuscleWeek[] }) {
  const lo = (WEEKLY_SET_RANGE.min / SCALE_MAX) * 100;
  const hi = (WEEKLY_SET_RANGE.max / SCALE_MAX) * 100;
  return (
    <View style={{ gap: space.md }}>
      {rows.map((r) => {
        const st = status(r.sets);
        const pct = Math.min(100, (r.sets / SCALE_MAX) * 100);
        return (
          <View key={r.category} style={styles.row} accessibilityLabel={`${r.category} ${r.sets}세트, ${st.label}`}>
            <MuscleFigure category={r.category} size={34} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.head}>
                <Text style={styles.name}>{r.category}</Text>
                <Text style={styles.sets}>{r.sets}세트</Text>
                <Text style={[styles.pill, { color: st.color, backgroundColor: st.bg }]}>{st.label}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.zone, { left: `${lo}%`, width: `${hi - lo}%` }]} />
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: r.sets > 0 ? st.color : 'transparent' }]} />
              </View>
            </View>
          </View>
        );
      })}
      <Text style={styles.legend}>
        옅은 칸 = 권장 범위(주 {WEEKLY_SET_RANGE.min}~{WEEKLY_SET_RANGE.max}세트, 근비대 기준). 완료 체크한 세트만 셉니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  sets: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pill: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  track: { height: 8, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  zone: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.successBg },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.sm },
  legend: { color: colors.textFaint, fontSize: 12, lineHeight: 18 },
});
