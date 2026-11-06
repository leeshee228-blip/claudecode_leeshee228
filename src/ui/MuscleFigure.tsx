import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Category } from '../lib/types';
import { colors, radius } from './theme';

/*
 * 앱 전용 근육 부위 그림. 60×100 좌표계의 단순화된 인체 실루엣에서
 * 운동 부위만 강조색으로 칠한다. (앞면 / 뒷면)
 */

type Region =
  | 'delts'
  | 'upperArms'
  | 'forearms'
  | 'thighs'
  | 'calves'
  | 'pecs'
  | 'abs'
  | 'traps'
  | 'lats'
  | 'lowerBack'
  | 'glutes';

const SHARED: Record<'delts' | 'upperArms' | 'forearms' | 'calves', string[]> = {
  delts: ['M19.5 20.5 Q12 21 11 29.5 L17 30.5 Q17.5 24.5 21.5 21.5 Z', 'M40.5 20.5 Q48 21 49 29.5 L43 30.5 Q42.5 24.5 38.5 21.5 Z'],
  upperArms: ['M11 31 L17 32 L16.2 44 L11.2 44 Z', 'M49 31 L43 32 L43.8 44 L48.8 44 Z'],
  forearms: ['M11.2 45.5 L16.2 45.5 L14.6 58 L10.2 58 Z', 'M48.8 45.5 L43.8 45.5 L45.4 58 L49.8 58 Z'],
  calves: ['M22.2 78 L28.4 78 L27.4 95 L23.2 95 Z', 'M37.8 78 L31.6 78 L32.6 95 L36.8 95 Z'],
};

const TORSO = ['M19.5 20.5 Q30 17.5 40.5 20.5 L42 36 Q40.5 46 39.5 53 L20.5 53 Q19.5 46 18 36 Z'];

// 객체 키 순서 = 그리는 순서 (몸통을 먼저 깔고 부위를 위에)
const FRONT: Record<string, string[]> = {
  torso: TORSO,
  ...SHARED,
  pecs: ['M21.5 22.5 Q26 20.5 29.5 21.5 L29.5 31 Q24.5 33 20.2 30 Z', 'M38.5 22.5 Q34 20.5 30.5 21.5 L30.5 31 Q35.5 33 39.8 30 Z'],
  abs: ['M23.5 33 Q30 34.5 36.5 33 L35.8 50.5 L24.2 50.5 Z'],
  hips: ['M20.5 53 L39.5 53 L40.2 57 L19.8 57 Z'],
  thighs: ['M19.8 58 L29.5 58 L28.6 76.5 L22 76.5 Z', 'M40.2 58 L30.5 58 L31.4 76.5 L38 76.5 Z'],
};

const BACK: Record<string, string[]> = {
  torso: TORSO,
  ...SHARED,
  traps: ['M24 18.5 L36 18.5 L39 22 L30 29.5 L21 22 Z'],
  lats: ['M21.2 23.5 L29.4 30.8 L29.4 44 Q24 44.5 20.6 38 Z', 'M38.8 23.5 L30.6 30.8 L30.6 44 Q36 44.5 39.4 38 Z'],
  lowerBack: ['M22.5 45.5 L37.5 45.5 L38.6 52 L21.4 52 Z'],
  glutes: ['M20 53 L29.5 53 L29.5 61 L20.6 61 Z', 'M40 53 L30.5 53 L30.5 61 L39.4 61 Z'],
  thighs: ['M20.4 62 L29.5 62 L28.6 76.5 L22 76.5 Z', 'M39.6 62 L30.5 62 L31.4 76.5 L38 76.5 Z'],
};

const CATEGORY_VIEW: Record<Category, { view: 'front' | 'back'; regions: Region[]; crop: 'upper' | 'full' }> = {
  가슴: { view: 'front', regions: ['pecs'], crop: 'upper' },
  등: { view: 'back', regions: ['traps', 'lats', 'lowerBack'], crop: 'upper' },
  하체: { view: 'front', regions: ['thighs', 'calves'], crop: 'full' },
  어깨: { view: 'front', regions: ['delts'], crop: 'upper' },
  팔: { view: 'front', regions: ['upperArms', 'forearms'], crop: 'upper' },
  코어: { view: 'front', regions: ['abs'], crop: 'upper' },
  기타: { view: 'front', regions: [], crop: 'full' },
};

const BASE = '#3A404C';
const LINE = '#4A5160';

type Props = {
  category: Category;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** 배경 타일 없이 그림만 */
  bare?: boolean;
};

export const MuscleFigure = memo(function MuscleFigure({ category, size = 48, style, bare }: Props) {
  const { view, regions, crop } = CATEGORY_VIEW[category];
  const paths = view === 'front' ? FRONT : BACK;
  const hot = new Set<string>(regions);
  const viewBox = crop === 'upper' ? '6 2 48 58' : '0 0 60 100';

  return (
    <View
      accessibilityLabel={`${category} 부위`}
      style={[
        !bare && { width: size, height: size, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
        { alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Svg width={size * (bare ? 1 : 0.9)} height={size * (bare ? 1 : 0.9)} viewBox={viewBox}>
        <Circle cx={30} cy={9.5} r={6} fill={BASE} />
        <Path d="M27 14.5 h6 v5 h-6z" fill={BASE} />
        {Object.entries(paths).map(([name, ds]) =>
          ds.map((d, i) => (
            <Path
              key={`${name}${i}`}
              d={d}
              fill={hot.has(name) ? colors.primary : BASE}
              stroke={hot.has(name) ? colors.primary : LINE}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          )),
        )}
        <Circle cx={12.3} cy={60.5} r={2.2} fill={BASE} />
        <Circle cx={47.7} cy={60.5} r={2.2} fill={BASE} />
      </Svg>
    </View>
  );
});
