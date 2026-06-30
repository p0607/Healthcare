import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { timelineStepsFromCompletion } from '@nursecare/shared';
import { colors, radius, spacing } from '../theme/theme';

const GREEN = '#059669';
const RED = '#e11d48';
const NODE = 10;
const LINE = 2;

function AnimatedTimelineTrack() {
  const shimmer = useRef(new Animated.Value(0)).current;
  const flow = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (!trackWidth) return undefined;
    shimmer.setValue(0);
    flow.setValue(0);
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const flowLoop = Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();
    flowLoop.start();
    return () => {
      shimmerLoop.stop();
      flowLoop.stop();
    };
  }, [flow, shimmer, trackWidth]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-trackWidth * 0.35, trackWidth * 0.35],
  });

  const flowTranslate = flow.interpolate({
    inputRange: [0, 1],
    outputRange: [-trackWidth * 0.5, trackWidth * 1.2],
  });

  return (
    <View
      style={styles.lineTrack}
      pointerEvents="none"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.lineBase} />
      {trackWidth > 0 ? (
        <>
          <Animated.View
            style={[styles.lineShimmer, { transform: [{ translateX: shimmerTranslate }] }]}
          />
          <Animated.View style={[styles.lineFlow, { transform: [{ translateX: flowTranslate }] }]} />
        </>
      ) : null}
    </View>
  );
}

export default function ProfileCompletionTimeline({ completion, onStepPress }) {
  const steps = timelineStepsFromCompletion(completion);

  return (
    <View style={styles.card}>
      <View style={styles.track}>
        <AnimatedTimelineTrack />

        <View style={styles.stepsRow}>
          {steps.map((step) => {
            const complete = step.status === 'complete';

            return (
              <Pressable
                key={step.id}
                style={styles.stepCol}
                onPress={() => onStepPress?.(step.id)}
                disabled={!onStepPress}
                accessibilityLabel={`${step.label}: ${complete ? 'complete' : 'incomplete'}`}
              >
                <View style={[styles.node, complete ? styles.nodeDone : styles.nodePending]} />
                <Text
                  style={[styles.label, complete ? styles.labelDone : styles.labelPending]}
                  numberOfLines={2}
                >
                  {step.shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  track: {
    position: 'relative',
  },
  lineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: NODE / 2 - LINE / 2,
    height: LINE,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  lineBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
  },
  lineShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.pill,
  },
  lineFlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 56,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: radius.pill,
    opacity: 0.55,
  },
  stepsRow: {
    flexDirection: 'row',
    zIndex: 1,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 1.5,
    borderColor: colors.surface,
    zIndex: 2,
  },
  nodeDone: { backgroundColor: GREEN },
  nodePending: { backgroundColor: RED },
  label: {
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 44,
    lineHeight: 9,
  },
  labelDone: { color: GREEN },
  labelPending: { color: RED },
});
