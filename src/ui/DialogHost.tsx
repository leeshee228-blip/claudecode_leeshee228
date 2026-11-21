import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { setDialogListener, type DialogButton, type DialogRequest } from './dialog';
import { colors, radius, space } from './theme';

/** 웹용 앱 내 대화상자. 요청은 순서대로 하나씩 보여준다. */
export function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setDialogListener((req) => setQueue((q) => [...q, req]));
    return () => setDialogListener(null);
  }, []);

  const current = queue[0];
  if (!current) return null;

  const answer = (b: DialogButton | null) => {
    current.resolve(b ? b.value : null);
    setQueue((q) => q.slice(1));
  };
  const cancel = current.buttons.find((b) => b.style === 'cancel') ?? null;
  // 버튼이 3개 이상이면 세로로 쌓는다
  const stacked = current.buttons.length > 2;
  // 취소는 가로 배치에선 왼쪽, 세로 배치에선 맨 아래
  const ordered = stacked
    ? [...current.buttons.filter((b) => b.style !== 'cancel'), ...current.buttons.filter((b) => b.style === 'cancel')]
    : current.buttons;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => answer(cancel)}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={() => answer(cancel)} accessibilityLabel="닫기" />
        <View style={styles.box} accessibilityRole="alert">
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
            {ordered.map((b) => {
              const isCancel = b.style === 'cancel';
              const danger = b.style === 'destructive';
              return (
                <Pressable
                  key={b.text}
                  onPress={() => answer(b)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.btn,
                    !stacked && { flex: 1 },
                    isCancel ? styles.btnCancel : danger ? styles.btnDanger : styles.btnPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.btnText, isCancel ? { color: colors.text } : { color: colors.primaryText }]}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20, 26, 40, 0.45)' },
  box: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.sm,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  message: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  buttonsStacked: { flexDirection: 'column' },
  btn: { minHeight: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnCancel: { backgroundColor: colors.surfaceAlt },
  btnText: { fontSize: 15, fontWeight: '700' },
});
