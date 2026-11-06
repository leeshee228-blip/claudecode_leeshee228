import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  icon?: IconName;
};

export function Button({ title, onPress, variant = 'primary', disabled, style, small, icon }: ButtonProps) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.primarySoft
          : 'transparent';
  const fg = variant === 'ghost' || variant === 'secondary' ? colors.primary : colors.primaryText;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === 'primary' && !disabled && styles.buttonRaised,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 20} color={fg} /> : null}
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tint = colors.primary,
  tintBg = colors.primarySoft,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: IconName;
  tint?: string;
  tintBg?: string;
}) {
  return (
    <View style={styles.stat}>
      {icon ? (
        <View style={[styles.statIcon, { backgroundColor: tintBg }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      ) : null}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Empty({ title, hint, icon }: { title: string; hint?: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      {icon ? (
        <View style={styles.emptyIcon}>
          <Ionicons name={icon} size={30} color={colors.primary} />
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonRaised: { boxShadow: '0px 4px 12px rgba(61, 109, 242, 0.28)' },
  buttonSmall: { minHeight: 38, paddingHorizontal: space.md, borderRadius: radius.sm, gap: 6 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextSmall: { fontSize: 14, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: colors.primaryText },
  stat: { flex: 1, gap: 2 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: { color: colors.textMuted, fontSize: 13 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statSub: { color: colors.textFaint, fontSize: 12 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
