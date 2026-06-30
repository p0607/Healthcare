import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THUMB_SIZE = 52;
const TRACK_HEIGHT = 56;
const THUMB_PAD = 4;
const ACTIVATE_RATIO = 0.88;

/**
 * Full-width red slide-to-confirm SOS control (mirrors web EmergencyPillSlider / SosSlideControl).
 */
export default function SosSlideControl({ onActivate, disabled = false }) {
  const trackWidthRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activated, setActivated] = useState(false);

  const getMaxDrag = useCallback(() => {
    return Math.max(trackWidthRef.current - THUMB_SIZE - THUMB_PAD * 2, 1);
  }, []);

  const reset = useCallback(() => {
    setDragX(0);
    setDragging(false);
    setActivated(false);
  }, []);

  const finishDrag = useCallback(
    (x) => {
      const max = getMaxDrag();
      const clamped = Math.min(max, Math.max(0, x));
      const ratio = clamped / max;

      if (ratio >= ACTIVATE_RATIO) {
        setActivated(true);
        setDragX(max);
        onActivate?.();
        setTimeout(reset, 1200);
        return;
      }
      reset();
    },
    [getMaxDrag, onActivate, reset]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !activated,
        onMoveShouldSetPanResponder: () => !disabled && !activated,
        onPanResponderGrant: () => {
          if (disabled || activated) return;
          setDragging(true);
        },
        onPanResponderMove: (_, gestureState) => {
          if (disabled || activated) return;
          const max = getMaxDrag();
          setDragX(Math.min(max, Math.max(0, gestureState.dx)));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (disabled || activated) return;
          setDragging(false);
          finishDrag(gestureState.dx);
        },
        onPanResponderTerminate: (_, gestureState) => {
          if (disabled || activated) return;
          setDragging(false);
          finishDrag(gestureState.dx);
        },
      }),
    [activated, disabled, finishDrag, getMaxDrag]
  );

  const progressWidth = dragX + THUMB_SIZE + THUMB_PAD;

  return (
    <View
      style={[
        styles.track,
        dragging && styles.trackDragging,
        activated && styles.trackActive,
        disabled && styles.trackDisabled,
      ]}
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
      }}
      accessibilityRole="adjustable"
      accessibilityLabel="Slide right for emergency SOS"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.label} pointerEvents="none">
        SOS
      </Text>

      <View
        style={[styles.progress, { width: progressWidth }]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.thumb,
          { transform: [{ translateX: dragX }] },
          dragging && styles.thumbDragging,
          activated && styles.thumbActive,
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="warning" size={24} color={activated ? '#fff' : '#dc2626'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#dc2626',
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  trackDragging: {
    backgroundColor: '#ef4444',
  },
  trackActive: {
    backgroundColor: '#b91c1c',
  },
  trackDisabled: {
    opacity: 0.6,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#fff',
    textAlign: 'center',
  },
  progress: {
    position: 'absolute',
    top: THUMB_PAD,
    left: THUMB_PAD,
    bottom: THUMB_PAD,
    borderRadius: (TRACK_HEIGHT - THUMB_PAD * 2) / 2,
    backgroundColor: 'rgba(254, 226, 226, 0.45)',
  },
  thumb: {
    position: 'absolute',
    top: THUMB_PAD,
    left: THUMB_PAD,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbDragging: {
    shadowOpacity: 0.5,
    elevation: 6,
  },
  thumbActive: {
    backgroundColor: '#ef4444',
  },
});
