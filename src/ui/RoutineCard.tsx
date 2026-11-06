import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { muscleSummary } from '../lib/routines';
import type { Routine } from '../lib/types';
import { useExerciseMap } from '../store/DataProvider';
import { MuscleFigure } from './MuscleFigure';
import { colors, radius, space } from './theme';

export function RoutineCard({ routine }: { routine: Routine }) {
  const router = useRouter();
  const exMap = useExerciseMap();
  const muscles = muscleSummary(routine.items, exMap).slice(0, 3);
  const sets = routine.items.reduce((s, it) => s + it.sets, 0);

  return (
    <Pressable
      onPress={() => router.push(`/routine/${routine.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.figures}>
        {muscles.map((m) => (
          <MuscleFigure key={m.category} category={m.category} size={40} />
        ))}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {routine.name}
      </Text>
      <Text style={styles.sub}>
        {routine.items.length}종목 · {sets}세트
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  figures: { flexDirection: 'row', gap: 6, marginBottom: 6, minHeight: 40 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: 12 },
});
