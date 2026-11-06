import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { formatClock } from '../lib/date';
import type { WorkoutExercise } from '../lib/types';
import { BottomSheet } from './BottomSheet';
import { Chip } from './components';
import { colors, radius, space } from './theme';

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240];

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  we: WorkoutExercise;
  defaultRest: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** 다음 종목이 있어야 슈퍼세트로 묶을 수 있음 */
  hasNext: boolean;
  onRest: (seconds: number | undefined) => void;
  onNote: (note: string) => void;
  onToggleSetNotes: (on: boolean) => void;
  onMove: (dir: -1 | 1) => void;
  onSwap: () => void;
  onAnalyze: () => void;
  onSuperset: () => void;
  onRemove: () => void;
};

type Panel = 'rest' | 'note' | 'order' | null;

export function ExerciseMenu(p: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (x: Panel) => setPanel((cur) => (cur === x ? null : x));
  const rest = p.we.restSeconds ?? p.defaultRest;

  const close = () => {
    setPanel(null);
    p.onClose();
  };
  // 다른 화면/모달을 여는 항목은 시트를 먼저 닫는다
  const thenClose = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <BottomSheet visible={p.visible} onClose={close} title={p.name}>
      <Row icon="timer-outline" label="휴식 타이머" value={formatClock(rest) + (p.we.restSeconds ? '' : ' (기본)')} onPress={() => toggle('rest')} open={panel === 'rest'}>
        <View style={styles.chips}>
          {REST_OPTIONS.map((s) => (
            <Chip key={s} label={formatClock(s)} selected={rest === s} onPress={() => p.onRest(s)} />
          ))}
          {p.we.restSeconds ? <Chip label="기본값 사용" selected={false} onPress={() => p.onRest(undefined)} /> : null}
        </View>
      </Row>

      <Row icon="create-outline" label="메모" value={p.we.note ? '작성됨' : ''} onPress={() => toggle('note')} open={panel === 'note'}>
        <TextInput
          value={p.we.note ?? ''}
          onChangeText={p.onNote}
          placeholder="자세, 그립, 기구 설정 등"
          placeholderTextColor={colors.textFaint}
          multiline
          style={styles.input}
        />
      </Row>

      <View style={styles.row}>
        <Ionicons name="list-outline" size={24} color={colors.text} />
        <Text style={styles.label}>세트별 메모</Text>
        <Switch
          value={!!p.we.showSetNotes}
          onValueChange={p.onToggleSetNotes}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      <Row icon="swap-vertical" label="종목 순서 바꾸기" onPress={() => toggle('order')} open={panel === 'order'}>
        <View style={styles.orderBtns}>
          <SmallBtn label="위로 이동" icon="arrow-up" disabled={!p.canMoveUp} onPress={() => p.onMove(-1)} />
          <SmallBtn label="아래로 이동" icon="arrow-down" disabled={!p.canMoveDown} onPress={() => p.onMove(1)} />
        </View>
      </Row>

      <Row icon="repeat" label="다른 종목으로 교체" onPress={thenClose(p.onSwap)} />
      <Row icon="bar-chart-outline" label="기록 분석" onPress={thenClose(p.onAnalyze)} />
      <Row
        icon="link-outline"
        label={p.we.supersetId ? '슈퍼세트 해제' : '다음 종목과 슈퍼세트 만들기'}
        onPress={thenClose(p.onSuperset)}
        disabled={!p.we.supersetId && !p.hasNext}
      />
      <Row icon="trash-outline" label="종목 삭제하기" danger onPress={thenClose(p.onRemove)} />
    </BottomSheet>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  open,
  danger,
  disabled,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  open?: boolean;
  danger?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }, disabled && { opacity: 0.35 }]}
      >
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {children ? <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.textMuted} /> : null}
      </Pressable>
      {open && children ? <View style={styles.panel}>{children}</View> : null}
    </View>
  );
}

function SmallBtn({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.smallBtn, (pressed || disabled) && { opacity: disabled ? 0.3 : 0.7 }]}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={styles.smallBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    minHeight: 58,
  },
  label: { flex: 1, color: colors.text, fontSize: 17 },
  value: { color: colors.textMuted, fontSize: 16, fontVariant: ['tabular-nums'] },
  panel: { paddingHorizontal: space.xl, paddingBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 72,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  orderBtns: { flexDirection: 'row', gap: space.sm },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  smallBtnText: { color: colors.text, fontWeight: '600' },
});
