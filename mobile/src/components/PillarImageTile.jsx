import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/theme';

/** Square pillar tile — photo fills the frame (web uses ~168% zoom to crop circular source art). */
export function PillarImageSquare({ source, borderColor, size = '100%' }) {
  if (!source) {
    return (
      <View
        style={[
          styles.square,
          typeof size === 'number' ? { width: size, height: size } : { width: size, aspectRatio: 1 },
          { borderColor: borderColor || colors.border, backgroundColor: colors.background },
        ]}
      />
    );
  }

  const squareStyle =
    typeof size === 'number'
      ? { width: size, height: size }
      : { width: size, aspectRatio: 1 };

  return (
    <View style={[styles.square, squareStyle, { borderColor: borderColor || colors.border }]}>
      <Image source={source} style={styles.fillImage} resizeMode="cover" />
    </View>
  );
}

/** Pillar picker tile with label — used on the landing page grid. */
export default function PillarImageTile({ source, borderColor, title, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <PillarImageSquare source={source} borderColor={borderColor} />
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.hint}>Tap to explore →</Text>
    </Pressable>
  );
}

/** Wide service card image — full-bleed cover (subservice assets are already composed). */
export function ServiceCardImage({ source, name }) {
  return (
    <View style={styles.serviceCardImage}>
      {source ? (
        <Image source={source} style={styles.serviceCoverImage} resizeMode="cover" />
      ) : (
        <View style={styles.serviceFallback} />
      )}
      <View style={styles.serviceOverlay} />
      {name ? (
        <View style={styles.serviceCaption}>
          <Text style={styles.serviceName}>{name}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    borderRadius: radius.lg,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  fillImage: {
    position: 'absolute',
    width: '168%',
    height: '168%',
    left: '-34%',
    top: '-34%',
  },
  serviceCoverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  card: { width: '48%', gap: spacing.xs },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  hint: { fontSize: 10, color: colors.brand, fontWeight: '600' },
  pressed: { opacity: 0.85 },
  serviceCardImage: {
    width: '100%',
    aspectRatio: 5 / 4,
    minHeight: 160,
    backgroundColor: colors.border,
  },
  serviceFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#94a3b8' },
  serviceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  serviceCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  serviceName: { color: colors.white, fontWeight: '800', fontSize: fontSize.sm },
});
