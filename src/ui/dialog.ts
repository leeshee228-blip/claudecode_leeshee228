import { Alert, Platform } from 'react-native';

/*
 * 확인/선택 대화상자.
 * 네이티브는 시스템 Alert, 웹은 앱 안의 DialogHost로 그린다.
 * (react-native-web의 Alert는 동작하지 않고, 브라우저 confirm()은
 *  iframe 등에서 막혀 있을 수 있어 쓰지 않는다)
 */

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; value: string | null };
export type DialogRequest = {
  title: string;
  message?: string;
  buttons: DialogButton[];
  resolve: (value: string | null) => void;
};

type Listener = (req: DialogRequest) => void;
let listener: Listener | null = null;

/** DialogHost가 등록. 웹에서만 사용 */
export function setDialogListener(l: Listener | null) {
  listener = l;
}

function show(title: string, message: string | undefined, buttons: DialogButton[]): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (listener) listener({ title, message, buttons, resolve });
      else resolve(null);
    });
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      buttons.map((b) => ({ text: b.text, style: b.style, onPress: () => resolve(b.value) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export function notify(title: string, message?: string) {
  void show(title, message, [{ text: '확인', value: 'ok' }]);
}

export async function confirm(title: string, message: string, okText = '확인', destructive = false): Promise<boolean> {
  const v = await show(title, message, [
    { text: '취소', style: 'cancel', value: null },
    { text: okText, style: destructive ? 'destructive' : 'default', value: 'ok' },
  ]);
  return v === 'ok';
}

export type Choice<T extends string> = { value: T; text: string; destructive?: boolean };

/** 여러 선택지 중 하나. 취소하면 null */
export async function choose<T extends string>(title: string, message: string, choices: Choice<T>[]): Promise<T | null> {
  const v = await show(title, message, [
    ...choices.map((c) => ({ text: c.text, style: c.destructive ? ('destructive' as const) : ('default' as const), value: c.value })),
    { text: '취소', style: 'cancel', value: null },
  ]);
  return v as T | null;
}
