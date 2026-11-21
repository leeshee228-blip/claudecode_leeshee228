import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildProgram, DAY_OPTIONS, GOALS, type Days, type Goal } from '../../lib/programs';
import { estimateMinutes, muscleSummary } from '../../lib/routines';
import { useData, useExerciseMap } from '../../store/DataProvider';
import { Button, SectionTitle } from '../../ui/components';
import { notify } from '../../ui/dialog';
import { MuscleFigure } from '../../ui/MuscleFigure';
import { colors, radius, shadow, space } from '../../ui/theme';

/** 목표·주당 횟수를 고르면 분할 루틴 묶음을 만들어 준다 */
export default function RecommendScreen() {
  const { data, dispatch } = useData();
  const exMap = useExerciseMap();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [days, setDays] = useState<Days>(3);

  const program = useMemo(() => buildProgram(goal, days), [goal, days]);

  const save = () => {
    for (const routine of program.routines) dispatch({ type: 'saveRoutine', routine });
    notify('루틴을 만들었어요', `${program.label}\n홈의 '내 루틴'에서 바로 시작할 수 있어요.`);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: '루틴 추천' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}>
        <Text style={styles.lead}>목표와 운동할 수 있는 날을 고르면 그에 맞는 분할 루틴을 만들어 드려요.</Text>

        <SectionTitle>목표</SectionTitle>
        <View style={styles.options}>
          {GOALS.map((g) => (
            <Option key={g.key} label={g.label} desc={g.desc} selected={goal === g.key} onPress={() => setGoal(g.key)} />
          ))}
        </View>

        <SectionTitle>주당 운동 횟수</SectionTitle>
        <View style={styles.options}>
          {DAY_OPTIONS.map((d) => (
            <Option key={d.key} label={d.label} desc={d.split} selected={days === d.key} onPress={() => setDays(d.key)} />
          ))}
        </View>

        <SectionTitle>미리보기</SectionTitle>
        <View style={{ gap: space.md }}>
          {program.routines.map((r, i) => {
            const muscles = muscleSummary(r.items, exMap).slice(0, 3);
            const est = estimateMinutes(r, [], data.settings.restSeconds);
            return (
              <View key={r.id} style={styles.day}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayNum}>Day {i + 1}</Text>
                  <Text style={styles.dayName} numberOfLines={1}>
                    {r.name.split(' · ')[1] ?? r.name}
                  </Text>
                  <Text style={styles.dayMeta}>약 {est.minutes}분</Text>
                </View>
                <View style={styles.figures}>
                  {muscles.map((m) => (
                    <View key={m.category} style={styles.figure}>
                      <MuscleFigure category={m.category} size={36} />
                      <Text style={styles.figureText}>
                        {m.category} {m.sets}
                      </Text>
                    </View>
                  ))}
                </View>
                {r.items.map((it) => (
                  <View key={it.id} style={styles.line}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {exMap.get(it.exerciseId)?.name ?? it.exerciseId}
                    </Text>
                    <Text style={styles.lineSets}>
                      {it.sets}세트 × {it.reps}회
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
        <Text style={styles.note}>
          처음엔 가벼운 무게로 목표 횟수를 채우고, 세트가 쉬워지면 앱의 &quot;오늘 목표&quot; 추천을 따라 무게를 올리세요.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={`루틴 ${program.routines.length}개 만들기`} icon="sparkles" onPress={save} />
      </View>
    </View>
  );
}

function Option({ label, desc, selected, onPress }: { label: string; desc: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.option, selected && styles.optionOn]}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelOn]}>{label}</Text>
      <Text style={styles.optionDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  lead: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '800' },
  optionLabelOn: { color: colors.primary },
  optionDesc: { color: colors.textMuted, fontSize: 12 },
  day: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 6, ...shadow },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dayNum: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  dayName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  dayMeta: { color: colors.textMuted, fontSize: 12 },
  figures: { flexDirection: 'row', gap: space.md, marginVertical: 4 },
  figure: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  figureText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  lineName: { color: colors.text, fontSize: 14, flexShrink: 1 },
  lineSets: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  note: { color: colors.textFaint, fontSize: 12, lineHeight: 18, marginTop: space.lg },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
