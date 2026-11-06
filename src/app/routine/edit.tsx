import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { uid } from '../../lib/id';
import { itemsFromWorkout } from '../../lib/routines';
import type { RoutineItem } from '../../lib/types';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { Button, Card, Empty, SectionTitle } from '../../ui/components';
import { notify } from '../../ui/dialog';
import { ExercisePicker } from '../../ui/ExercisePicker';
import { MuscleFigure } from '../../ui/MuscleFigure';
import { colors, radius, space } from '../../ui/theme';

export default function RoutineEditScreen() {
  const params = useLocalSearchParams<{ id?: string; fromWorkout?: string }>();
  const { data, dispatch } = useData();
  const exMap = useExerciseMap();
  const router = useRouter();

  const existing = params.id ? data.routines.find((r) => r.id === params.id) : undefined;
  const fromWorkout = params.fromWorkout ? data.workouts.find((w) => w.id === params.fromWorkout) : undefined;

  const [name, setName] = useState(existing?.name ?? fromWorkout?.name ?? '');
  const [items, setItems] = useState<RoutineItem[]>(
    () => existing?.items ?? (fromWorkout ? itemsFromWorkout(fromWorkout) : []),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (id: string, patch: Partial<RoutineItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return notify('루틴 이름을 입력하세요');
    if (items.length === 0) return notify('종목을 1개 이상 추가하세요');
    const routine = { id: existing?.id ?? uid(), name: trimmed, items, createdAt: existing?.createdAt ?? Date.now() };
    dispatch({ type: 'saveRoutine', routine });
    if (existing) router.back();
    else router.replace(`/routine/${routine.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: existing ? '루틴 편집' : '새 루틴',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10} accessibilityRole="button">
              <Text style={styles.save}>저장</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="루틴 이름 (예: 등 · 이두)"
          placeholderTextColor={colors.textFaint}
          style={styles.name}
          maxLength={30}
        />

        <SectionTitle>종목 {items.length}개 · {items.reduce((s, it) => s + it.sets, 0)}세트</SectionTitle>
        {items.length === 0 && <Empty title="아직 종목이 없어요" hint="아래 버튼으로 종목을 추가하세요" />}
        <View style={{ gap: space.sm }}>
          {items.map((it, i) => {
            const ex = exMap.get(it.exerciseId);
            return (
              <Card key={it.id} style={styles.item}>
                <MuscleFigure category={ex?.category ?? '기타'} size={48} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {ex?.name ?? '(삭제된 종목)'}
                  </Text>
                  <View style={styles.stepper}>
                    <StepBtn icon="remove" label="세트 줄이기" disabled={it.sets <= 1} onPress={() => update(it.id, { sets: it.sets - 1 })} />
                    <Text style={styles.sets}>{it.sets}세트</Text>
                    <StepBtn icon="add" label="세트 늘리기" disabled={it.sets >= 20} onPress={() => update(it.id, { sets: it.sets + 1 })} />
                  </View>
                </View>
                <View style={styles.actions}>
                  <StepBtn icon="arrow-up" label="위로" disabled={i === 0} onPress={() => move(i, -1)} />
                  <StepBtn icon="arrow-down" label="아래로" disabled={i === items.length - 1} onPress={() => move(i, 1)} />
                  <StepBtn icon="close" label="삭제" color={colors.danger} onPress={() => setItems((l) => l.filter((x) => x.id !== it.id))} />
                </View>
              </Card>
            );
          })}
        </View>

        <Button title="+ 종목 추가" variant="secondary" onPress={() => setPickerOpen(true)} style={{ marginTop: space.lg }} />
        <Button title="저장" onPress={save} style={{ marginTop: space.md }} />
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(e) => setItems((l) => [...l, { id: uid(), exerciseId: e.id, sets: 3 }])}
      />
    </View>
  );
}

function StepBtn({
  icon,
  label,
  onPress,
  disabled,
  color = colors.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[styles.stepBtn, disabled && { opacity: 0.3 }]}
    >
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 48 },
  save: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  name: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    height: 52,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sets: { color: colors.text, fontSize: 14, fontWeight: '600', minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 4 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
