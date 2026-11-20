import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatSet } from '../lib/stats';
import type { SetEntry } from '../lib/types';
import { colors, radius } from './theme';

type Props = {
  index: number;
  set: SetEntry;
  prev?: SetEntry;
  unit: string;
  showNote?: boolean;
  /** 이 세트가 개인 최고 기록을 갱신했는지 */
  isPR?: boolean;
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
  const [text, setText] = useState(() => format(value));
  // 외부에서 값이 바뀌면(이전 기록 채우기 등) 입력 중인 텍스트 대신 새 값을 보여준다.
  // "62." 처럼 입력 중인 상태는 숫자로 같으므로 그대로 유지된다.
  const shown = parse(text) === value ? text : format(value);

  return (
    <TextInput
      accessibilityLabel={label}
      value={shown}
      onChangeText={(t) => {
        let cleaned = decimal ? t.replace(',', '.').replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, '');
        if (decimal) {
          // 소수점은 하나만, 소수 둘째 자리까지
          const [int, ...rest] = cleaned.split('.');
          cleaned = rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
        }
        setText(cleaned);
        onChange(parse(cleaned));
      }}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      maxLength={decimal ? 7 : 3}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      selectTextOnFocus
      style={[styles.input, done && styles.inputDone]}
    />
  );
}

function parse(t: string): number {
  const n = parseFloat(t);
  return Number.isNaN(n) ? 0 : n;
}

function format(n: number): string {
  return n ? String(n) : '';
}

export const SetRow = memo(function SetRow({ index, set, prev, unit, showNote, isPR, onChange, onToggleDone, onRemove }: Props) {
  const prevText = prev ? formatSet(prev) : '—';
  return (
    <View>
    <View style={[styles.row, set.done && styles.rowDone]}>
      <Pressable
        onLongPress={onRemove}
        accessibilityHint="길게 누르면 세트를 삭제합니다"
        style={styles.indexCell}
        hitSlop={6}
      >
        <Text style={styles.index}>{index + 1}</Text>
        {isPR ? (
          <Text style={styles.pr} accessibilityLabel="개인 최고 기록">
            🏆
          </Text>
        ) : null}
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
    {showNote ? (
      <TextInput
        accessibilityLabel={`${index + 1}세트 메모`}
        value={set.note ?? ''}
        onChangeText={(note) => onChange({ note })}
        placeholder={`${index + 1}세트 메모`}
        placeholderTextColor={colors.textFaint}
        style={styles.note}
      />
    ) : null}
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
  pr: { position: 'absolute', top: -10, right: -6, fontSize: 12 },
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
  note: {
    marginLeft: 40,
    marginTop: 2,
    marginBottom: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 13,
  },
  head: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  headInput: { width: 64, textAlign: 'center' },
});
