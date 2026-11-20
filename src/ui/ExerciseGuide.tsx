import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Guide } from '../lib/guides';
import { colors, radius, shadow, space } from './theme';

/** 종목 화면 상단의 운동 방법 카드 (접기/펼치기) */
export function ExerciseGuide({ guide, name }: { guide: Guide; name: string }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.head}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${name} 운동 방법 ${open ? '접기' : '펼치기'}`}
      >
        <View style={styles.headIcon}>
          <Ionicons name="book" size={16} color={colors.primary} />
        </View>
        <Text style={styles.title}>운동 방법</Text>
        {guide.bodyweight ? <Text style={styles.tag}>맨몸</Text> : null}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.muscles}>
        {guide.muscles.map((m) => (
          <Text key={m} style={styles.muscle}>
            {m}
          </Text>
        ))}
      </View>

      {open && (
        <>
          <View style={styles.section}>
            {guide.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <View style={styles.tips}>
            {guide.tips.map((tip, i) => (
              <View key={i} style={styles.tip}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  tag: {
    color: colors.success,
    backgroundColor: colors.successBg,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscle: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  section: { gap: 10 },
  step: { flexDirection: 'row', gap: 10 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  stepText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 21 },
  tips: { gap: 6, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md },
  tip: { flexDirection: 'row', gap: 6 },
  tipText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
