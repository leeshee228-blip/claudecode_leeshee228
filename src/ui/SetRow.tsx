import * as Haptics from 'expo-haptics';
import { memo, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatNumber } from '../lib/stats';
import type { SetEntry } from '../lib/types';
import { colors, radius } from './theme';

type Props = {
  index: number;
  set: SetEntry;
  prev?: SetEntry;
  unit: string;
  onChange: (patch: Partial<Omit<SetEntry, 'id'>>) => void;
  onToggleDone: () => void;
  onRemove: () => void;
};

/** 입력 중 "62." 같은 중간 상태를 유지하기 위해 텍스트를 로컬로 들고 있는 숫자 입력 */
function NumberField({
  value,
  onChange,
  decimal,
  placeholder,
  done,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  decimal?: boolean;
  placeholder: string;
  done: boolean;
  label: string;
}) {
  const [text, setText] = useState(value ? String(value) : '');

  useEffect(() => {
    const parsed = parseFloat(text);
    if ((Number.isNaN(parsed) ? 0 : parsed) !== value) setText(value ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      accessibilityLabel={label}
      value={text}
      onChangeText={(t) => {
        const cleaned = decimal ? t.replace(',', '.').replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, '');
        setText(cleaned);
        const n = parseFloat(cleaned);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      selectTextOnFocus
      style={[styles.input, done && styles.inputDone]}
    />
  );
}

export const SetRow = memo(function SetRow({ index, set, prev, unit, onChange, onToggleDone, onRemove }: Props) {
  const prevText = prev ? `${formatNumber(prev.weight)}×${prev.reps}` : '—';
  return (
    <View style={[styles.row, set.done && styles.rowDone]}>
      <Pressable
        onLongPress={onRemove}
        accessibilityHint="길게 누르면 세트를 삭제합니다"
        style={styles.indexCell}
        hitSlop={6}
      >
        <Text style={styles.index}>{index + 1}</Text>
      </Pressable>
      <Pressable
        style={styles.prevCell}
        disabled={!prev}
        onPress={() => prev && onChange({ weight: prev.weight, reps: prev.reps })}
        accessibilityHint="이전 기록으로 채웁니다"
      >
        <Text style={styles.prev} numberOfLines={1}>
          {prevText}
        </Text>
      </Pressable>
      <NumberField
        label={`${index + 1}세트 무게`}
        value={set.weight}
        decimal
        placeholder={unit}
        done={set.done}
        onChange={(weight) => onChange({ weight })}
      />
      <NumberField
        label={`${index + 1}세트 횟수`}
        value={set.reps}
        placeholder="회"
        done={set.done}
        onChange={(reps) => onChange({ reps })}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`${index + 1}세트 완료`}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onToggleDone();
        }}
        style={[styles.check, set.done && styles.checkDone]}
        hitSlop={4}
      >
        <Ionicons name="checkmark" size={20} color={set.done ? colors.primaryText : colors.textFaint} />
      </Pressable>
    </View>
  );
});

export function SetHeader({ unit }: { unit: string }) {
  return (
    <View style={[styles.row, { paddingVertical: 2 }]}>
      <Text style={[styles.head, styles.indexCell]}>세트</Text>
      <Text style={[styles.head, styles.prevCell]}>이전</Text>
      <Text style={[styles.head, styles.headInput]}>{unit}</Text>
      <Text style={[styles.head, styles.headInput]}>회</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderRadius: radius.sm },
  rowDone: { backgroundColor: colors.successBg },
  indexCell: { width: 32, alignItems: 'center' },
  index: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  prevCell: { flex: 1, minWidth: 56 },
  prev: { color: colors.textFaint, fontSize: 13, fontVariant: ['tabular-nums'] },
  input: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  inputDone: { backgroundColor: 'transparent' },
  check: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success },
  head: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  headInput: { width: 64, textAlign: 'center' },
});
