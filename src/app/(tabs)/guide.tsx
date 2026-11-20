import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { getGuide } from '../../lib/guides';
import { CATEGORIES, type Category } from '../../lib/types';
import { useData } from '../../store/DataProvider';
import { Chip, Empty } from '../../ui/components';
import { MuscleFigure } from '../../ui/MuscleFigure';
import { colors, radius, shadow, space } from '../../ui/theme';

/** 부위별 종목 목록. 누르면 운동 방법과 내 기록이 있는 종목 화면으로 이동 */
export default function GuideScreen() {
  const { data } = useData();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.filter((c) => !category || c === category)
      .map((c) => ({
        title: c,
        data: data.exercises
          .filter((e) => e.category === c && (!q || e.name.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
      }))
      .filter((s) => s.data.length > 0);
  }, [data.exercises, query, category]);

  return (
    <SectionList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(e) => e.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="종목 이름 검색"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
            <Chip label="전체" selected={category === null} onPress={() => setCategory(null)} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHead}>
          <MuscleFigure category={section.title} size={28} bare />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const guide = getGuide(item);
        return (
          <Pressable
            onPress={() => router.push(`/exercise/${item.id}`)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
          >
            <MuscleFigure category={item.category} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSub} numberOfLines={1}>
                {guide ? guide.muscles.join(' · ') : '직접 추가한 종목'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      ListEmptyComponent={<Empty icon="search" title="검색 결과가 없어요" />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 40 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 46,
    ...shadow,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16 },
  chipsWrap: { marginHorizontal: -space.lg },
  chips: { paddingHorizontal: space.lg, gap: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xl, marginBottom: space.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionCount: { color: colors.textFaint, fontSize: 14, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow,
  },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  itemSub: { color: colors.textMuted, fontSize: 12 },
});
