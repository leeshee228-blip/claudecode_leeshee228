import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

type ClaudeDownloads = { save: (req: { filename: string; data: string }) => Promise<unknown> };
type ClaudeHost = { use?: (name: string) => Promise<unknown> };

/**
 * claude.ai 페이지로 열린 경우 브라우저 다운로드가 막혀 있으므로
 * 그 환경이 제공하는 저장 기능을 쓴다. 없으면 null.
 */
async function claudeDownloads(): Promise<ClaudeDownloads | null> {
  const host = (globalThis as { claude?: ClaudeHost }).claude;
  if (!host?.use) return null;
  try {
    return ((await host.use('downloads')) as ClaudeDownloads | null) ?? null;
  } catch {
    return null;
  }
}

/** 텍스트 파일을 만들어 공유 시트(웹은 다운로드)로 내보냄 */
export async function exportTextFile(filename: string, content: string, mimeType: string, uti: string) {
  if (Platform.OS === 'web') {
    const downloads = await claudeDownloads();
    if (downloads) {
      try {
        await downloads.save({ filename, data: content });
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === 'declined') return; // 사용자가 저장을 취소함
        if (code === 'rate_limited') throw new Error('저장 창이 이미 열려 있어요. 잠시 후 다시 시도하세요.');
        throw new Error('이 화면에서는 파일을 저장할 수 없어요.');
      }
      return;
    }
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('이 기기에서는 공유 기능을 사용할 수 없습니다.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti });
}

/** 파일을 골라 텍스트로 읽음. 취소하면 null */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    if (asset.file) return asset.file.text();
    return (await fetch(asset.uri)).text();
  }
  return new File(asset.uri).text();
}
