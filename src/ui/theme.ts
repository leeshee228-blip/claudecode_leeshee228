import type { ViewStyle } from 'react-native';

/*
 * 심플 모노톤 테마 (인스타그램 스타일)
 * - 흰 바탕, 검정 글자, 얇은 회색 구분선, 그림자 없음
 * - 포인트 색 = 밝은 회색(accent): 버튼·선택 칩·강조 카드의 "채움"에만 사용하고
 *   그 위 글자는 검정(primaryText)
 * - primary = 강조 글자·아이콘·그래프용 잉크(검정). 밝은 회색은 흰 바탕 위 글자로는 읽히지 않기 때문
 * - 의미 색은 경고(주황)와 삭제(빨강)만 남긴다
 */
export const colors = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  border: '#EBEBEB',
  text: '#000000',
  textMuted: '#737373',
  textFaint: '#A8A8A8',
  /** 포인트 색: 밝은 회색 채움 */
  accent: '#EFEFEF',
  /** 눌림·완료 표시 등 조금 더 진한 회색 */
  accentStrong: '#DBDBDB',
  /** 강조 글자·아이콘·그래프 잉크 */
  primary: '#000000',
  /** 아주 옅은 회색 바탕 (카드 안 강조 영역) */
  primarySoft: '#F5F5F5',
  /** 보조 선·막대 */
  primaryMid: '#DBDBDB',
  /** accent 채움 위의 글자 */
  primaryText: '#000000',
  success: '#262626',
  successBg: '#F2F2F2',
  danger: '#ED4956',
  dangerSoft: '#FDECEE',
  warning: '#E08A00',
  warningSoft: '#FFF5E5',
};

export const radius = { sm: 8, md: 10, lg: 14 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** 카드 테두리 (그림자 대신 얇은 선) */
export const shadow: ViewStyle = {
  borderWidth: 1,
  borderColor: colors.border,
};
