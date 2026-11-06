import type { ViewStyle } from 'react-native';

/** 밝고 부드러운 라이트 테마 */
export const colors = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F7',
  border: '#E2E7F0',
  text: '#1B1F2A',
  textMuted: '#5A6375',
  textFaint: '#8A92A3',
  primary: '#3D6DF2',
  primarySoft: '#E8EEFF',
  primaryMid: '#B7C9FA',
  primaryText: '#FFFFFF',
  success: '#1E9E5F',
  successBg: '#E4F6EC',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#F29D0C',
  warningSoft: '#FFF4DE',
};

export const radius = { sm: 10, md: 14, lg: 20 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** 카드용 은은한 그림자 */
export const shadow: ViewStyle = {
  boxShadow: '0px 2px 10px rgba(30, 45, 90, 0.07)',
};
