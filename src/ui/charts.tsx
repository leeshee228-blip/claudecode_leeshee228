import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from './theme';

const PAD = { top: 16, right: 12, bottom: 24, left: 40 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

function shortNum(v: number): string {
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v * 10) / 10);
}

function useWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return { width, onLayout };
}

function Grid({ width, height, max }: { width: number; height: number; max: number }) {
  const innerH = height - PAD.top - PAD.bottom;
  return (
    <>
      {[0, 0.5, 1].map((f) => {
        const y = PAD.top + innerH * (1 - f);
        return (
          <Line key={f} x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />
        );
      })}
      {[0, 0.5, 1].map((f) => (
        <SvgText
          key={`l${f}`}
          x={PAD.left - 6}
          y={PAD.top + innerH * (1 - f) + 4}
          fontSize={10}
          fill={colors.textFaint}
          textAnchor="end"
        >
          {shortNum(max * f)}
        </SvgText>
      ))}
    </>
  );
}

export type ChartPoint = { label: string; value: number };

export function BarChart({ data, height = 180 }: { data: ChartPoint[]; height?: number }) {
  const { width, onLayout } = useWidth();
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const slot = data.length ? innerW / data.length : 0;
  const barW = Math.min(28, slot * 0.6);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Grid width={width} height={height} max={max} />
          {data.map((d, i) => {
            const h = (d.value / max) * innerH;
            const x = PAD.left + slot * i + (slot - barW) / 2;
            const last = i === data.length - 1;
            return (
              <Rect
                key={i}
                x={x}
                y={PAD.top + innerH - h}
                width={barW}
                height={Math.max(h, d.value > 0 ? 2 : 0)}
                rx={4}
                fill={last ? colors.primary : '#34507F'}
              />
            );
          })}
          {data.map((d, i) => (
            <SvgText
              key={`x${i}`}
              x={PAD.left + slot * i + slot / 2}
              y={height - 6}
              fontSize={10}
              fill={colors.textFaint}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

export function LineChart({ data, height = 200 }: { data: ChartPoint[]; height?: number }) {
  const { width, onLayout } = useWidth();
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>기록이 쌓이면 그래프가 표시됩니다</Text>
      </View>
    );
  }
  const values = data.map((d) => d.value);
  const max = niceMax(Math.max(...values) * 1.05);
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
  const y = (v: number) => PAD.top + innerH * (1 - v / max);
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  // 라벨이 겹치지 않게 최대 5개만 표시
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Grid width={width} height={height} max={max} />
          <Path d={path} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
          {data.map((d, i) => (
            <Circle key={i} cx={x(i)} cy={y(d.value)} r={data.length > 30 ? 2 : 3.5} fill={colors.primary} />
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <SvgText key={`x${i}`} x={x(i)} y={height - 6} fontSize={10} fill={colors.textFaint} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textFaint, fontSize: 13 },
});
