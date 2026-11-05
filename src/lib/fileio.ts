import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** 텍스트 파일을 만들어 공유 시트(웹은 다운로드)로 내보냄 */
export async function exportTextFile(filename: string, content: string, mimeType: string, uti: string) {
  if (Platform.OS === 'web') {
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
