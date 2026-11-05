import { Alert, Platform } from 'react-native';

// react-native-web의 Alert는 아무 동작도 하지 않으므로 웹에서는 브라우저 대화상자를 사용

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirm(
  title: string,
  message: string,
  okText = '확인',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export type Choice<T extends string> = { value: T; text: string; destructive?: boolean };

/** 여러 선택지 중 하나. 취소하면 null. 웹에서는 확인 창을 순서대로 띄운다. */
export function choose<T extends string>(title: string, message: string, choices: Choice<T>[]): Promise<T | null> {
  if (Platform.OS === 'web') {
    for (const c of choices) {
      if (window.confirm(`${title}\n\n${message}\n\n→ "${c.text}" 하시겠습니까?`)) return Promise.resolve(c.value);
    }
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        ...choices.map((c) => ({
          text: c.text,
          style: c.destructive ? ('destructive' as const) : ('default' as const),
          onPress: () => resolve(c.value),
        })),
        { text: '취소', style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
