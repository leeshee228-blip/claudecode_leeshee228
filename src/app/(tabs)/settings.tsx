import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { mergeData, parseBackup, serialize, toCSV } from '../../lib/backup';
import { createDefaultData } from '../../lib/defaults';
import { todayKey } from '../../lib/date';
import { exportTextFile, pickTextFile } from '../../lib/fileio';
import { useData } from '../../store/DataProvider';
import { Button, Card, Chip, SectionTitle } from '../../ui/components';
import { choose, confirm, notify } from '../../ui/dialog';
import { colors, space } from '../../ui/theme';

const REST_OPTIONS = [30, 60, 90, 120, 180, 240];

const restLabel = (s: number) => (s < 60 ? `${s}초` : s % 60 === 0 ? `${s / 60}분` : `${Math.floor(s / 60)}분 ${s % 60}초`);

export default function SettingsScreen() {
  const { data, dispatch } = useData();
  const { restSeconds, unit } = data.settings;

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      notify('오류', e instanceof Error ? e.message : String(e));
    }
  };

  const exportJSON = () =>
    run(() => exportTextFile(`workout-backup-${todayKey()}.json`, serialize(data), 'application/json', 'public.json'));

  const exportCSV = () =>
    run(() => exportTextFile(`workout-${todayKey()}.csv`, toCSV(data), 'text/csv', 'public.comma-separated-values-text'));

  const importJSON = () =>
    run(async () => {
      const text = await pickTextFile();
      if (text === null) return;
      const incoming = parseBackup(text);
      const mode = await choose(
        '백업 가져오기',
        `운동 ${incoming.workouts.length}개, 종목 ${incoming.exercises.length}개가 들어 있습니다.`,
        [
          { value: 'merge', text: '기존 기록에 합치기' },
          { value: 'replace', text: '전부 교체하기', destructive: true },
        ],
      );
      if (!mode) return;
      dispatch({ type: 'replaceAll', data: mode === 'merge' ? mergeData(data, incoming) : incoming });
      notify('가져오기 완료', mode === 'merge' ? '기존 기록과 합쳤습니다.' : '백업 데이터로 교체했습니다.');
    });

  const resetAll = async () => {
    if (await confirm('모든 데이터 삭제', '모든 운동 기록과 직접 추가한 종목이 삭제됩니다. 먼저 백업을 권장합니다.', '삭제', true)) {
      dispatch({ type: 'replaceAll', data: createDefaultData() });
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <SectionTitle>기본 휴식 시간</SectionTitle>
      <Card>
        <View style={styles.chips}>
          {REST_OPTIONS.map((s) => (
            <Chip
              key={s}
              label={restLabel(s)}
              selected={restSeconds === s}
              onPress={() => dispatch({ type: 'updateSettings', patch: { restSeconds: s } })}
            />
          ))}
        </View>
        <Text style={styles.help}>세트를 완료 체크하면 휴식 타이머가 자동으로 시작됩니다.</Text>
      </Card>

      <SectionTitle>무게 단위</SectionTitle>
      <Card>
        <View style={styles.chips}>
          {(['kg', 'lb'] as const).map((u) => (
            <Chip key={u} label={u} selected={unit === u} onPress={() => dispatch({ type: 'updateSettings', patch: { unit: u } })} />
          ))}
        </View>
        <Text style={styles.help}>표시 단위만 바뀌며, 이미 입력한 숫자는 변환되지 않습니다.</Text>
      </Card>

      <SectionTitle>데이터 백업</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Button title="백업 파일 내보내기 (JSON)" variant="secondary" onPress={exportJSON} />
        <Button title="백업 파일 가져오기" variant="secondary" onPress={importJSON} />
        <Button title="엑셀용 내보내기 (CSV)" variant="secondary" onPress={exportCSV} />
        <Text style={styles.help}>
          기록은 이 기기에만 저장됩니다. 기기를 바꾸거나 앱을 지우기 전에 JSON 백업을 내보내 두세요.
        </Text>
      </Card>

      <SectionTitle>위험 구역</SectionTitle>
      <Button title="모든 데이터 삭제" variant="danger" onPress={resetAll} />

      <Text style={styles.version}>운동 기록 v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  help: { color: colors.textFaint, fontSize: 12, marginTop: space.md, lineHeight: 18 },
  version: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: space.xl },
});
