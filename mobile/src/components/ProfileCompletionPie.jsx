/**
 * Radial progress ring — mirrors web ProfileCompletionPie.jsx.
 * Light track, red (or green at 100%) arc, percent in center.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontSize } from '../theme/theme';

const GREEN = '#22c55e';
const RED = '#ef4444';
const TRACK = 'rgba(100, 116, 139, 0.35)';

export default function ProfileCompletionPie({ completion, size = 88, style }) {
  const { percent = 0 } = completion || {};
  const target = Math.min(100, Math.max(0, Math.round(percent)));
  const isComplete = target >= 100;
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    setDisplay(0);
    const start = Date.now();
    const duration = 650;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target]);

  const stroke = Math.max(3, Math.round(size * 0.055));
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (display / 100) * circumference;
  const progressColor = isComplete ? GREEN : RED;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Profile ${target} percent complete`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={TRACK}
          strokeWidth={stroke}
        />
        {display > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90, ${center}, ${center})`}
          />
        ) : null}
      </Svg>
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.percent, { fontSize: size * 0.22, color: isComplete ? GREEN : colors.text }]}>
          {display}%
        </Text>
      </View>
    </View>
  );
}

/** Summary row shown beside the pie on profile screens. */
export function ProfileCompletionSummary({ completion, style }) {
  const { percent = 0, filled = 0, total = 0, pending = 0 } = completion || {};
  const isComplete = percent >= 100;

  return (
    <View style={[styles.summary, style]}>
      <Text style={styles.summaryTitle}>
        {isComplete ? 'Profile complete' : 'Profile progress'}
      </Text>
      <Text style={styles.summaryLine}>
        {filled} of {total} sections complete
      </Text>
      {!isComplete && pending > 0 ? (
        <Text style={styles.summaryPending}>
          {pending} section{pending === 1 ? '' : 's'} pending
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontWeight: '700',
  },
  summary: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
  },
  summaryLine: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.muted,
  },
  summaryPending: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: RED,
    marginTop: 2,
  },
});
