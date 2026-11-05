import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uid } from '../lib/id';
import { CATEGORIES, type Category, type Exercise } from '../lib/types';
import { useData } from '../store/DataProvider';
import { Button, Chip } from './components';
import { confirm, notify } from './dialog';
import { colors, radius, space } from './theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
};

export function ExercisePicker({ visible, onClose, onPick }: Props) {
  const { data, dispatch } = useData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<Category>('기타');

  const usedIds = useMemo(
    () => new Set(data.workouts.flatMap((w) => w.exercises.map((we) => we.exerciseId))),
    [data.workouts],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.exercises
      .filter((e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [data.exercises, query, category]);

  const close = () => {
    setQuery('');
    setAdding(false);
    onClose();
  };

  const pick = (e: Exercise) => {
    onPick(e);
    close();
  };

  const createExercise = () => {
    const name = query.trim();
    if (!name) return;
    if (data.exercises.some((e) => e.name === name)) {
      notify('이미 있는 종목입니다', name);
      return;
    }
    const exercise: Exercise = { id: uid(), name, category: newCategory, custom: true };
    dispatch({ type: 'addExercise', id: exercise.id, name, category: newCategory });
    pick(exercise);
  };

  const confirmDelete = (e: Exercise) => {
    if (!e.custom) return;
    if (usedIds.has(e.id)) {
      notify('삭제할 수 없음', '운동 기록에 사용된 종목은 삭제할 수 없습니다.');
      return;
    }
    confirm('종목 삭제', `"${e.name}"을(를) 삭제할까요?`, '삭제', true).then((ok) => {
      if (ok) dispatch({ type: 'deleteExercise', id: e.id });
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>종목 선택</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
            <Text style={styles.close}>닫기</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="종목 검색 또는 새 종목 이름"
          placeholderTextColor={colors.textFaint}
          style={styles.search}
          autoCorrect={false}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
          <Chip label="전체" selected={category === null} onPress={() => setCategory(null)} />
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: space.xl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => pick(item)}
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCat}>
                {item.category}
                {item.custom ? ' · 직접 추가' : ''}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              {!adding ? (
                <Button
                  title={query.trim() ? `"${query.trim()}" 새 종목으로 추가` : '+ 새 종목 추가'}
                  variant="secondary"
                  onPress={() => {
                    setNewCategory(category ?? '기타');
                    setAdding(true);
                  }}
                />
              ) : (
                <View style={{ gap: space.md }}>
                  <Text style={styles.hint}>위 입력창에 이름을 입력하고 부위를 고르세요</Text>
                  <View style={styles.wrapChips}>
                    {CATEGORIES.map((c) => (
                      <Chip key={c} label={c} selected={newCategory === c} onPress={() => setNewCategory(c)} />
                    ))}
                  </View>
                  <Button title="추가하고 선택" onPress={createExercise} disabled={!query.trim()} />
                </View>
              )}
              <Text style={styles.hint}>직접 추가한 종목은 길게 눌러 삭제할 수 있습니다</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  close: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  search: {
    marginHorizontal: space.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    height: 46,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexGrow: 0, marginTop: space.md },
  chipsContent: { paddingHorizontal: space.lg, gap: space.sm },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  item: {
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemCat: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  footer: { padding: space.lg, gap: space.md },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
});
