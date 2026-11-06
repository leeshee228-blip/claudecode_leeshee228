import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatClock } from '../lib/date';
import { useRestTimer } from '../store/RestTimer';
import { colors, radius, space } from './theme';

export function RestTimerBar() {
  const { remaining, total, add, stop } = useRestTimer();
  if (remaining === null) return null;
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>휴식</Text>
          <Text style={styles.time}>{formatClock(remaining)}</Text>
        </View>
        <View style={styles.actions}>
          <TimerButton label="-15초" onPress={() => add(-15)} />
          <TimerButton label="+15초" onPress={() => add(15)} />
          <TimerButton label="건너뛰기" onPress={stop} strong />
        </View>
      </View>
    </View>
  );
}

function TimerButton({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, strong && styles.btnStrong, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.btnText, strong && { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primaryMid,
    boxShadow: '0px 6px 20px rgba(30, 45, 90, 0.15)',
  },
  progress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.primarySoft },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  label: { color: colors.textMuted, fontSize: 12 },
  time: { color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
  btn: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
  },
  btnStrong: { backgroundColor: colors.primary },
  btnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
