import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_LOGO_ALT, APP_NAME, APP_TAGLINE } from '@nursecare/shared';
import { colors, fontSize, radius } from '../theme/theme';

const logoSource = require('../../assets/care360-logo.png');

const SIZES = {
  sm: { image: 32, name: fontSize.sm },
  md: { image: 40, name: fontSize.lg },
  lg: { image: 52, name: fontSize.xl },
};

export default function BrandLogo({
  size = 'md',
  showName = true,
  showTagline = false,
  onPress,
  style,
}) {
  const s = SIZES[size] || SIZES.md;
  const content = (
    <View style={[styles.row, style]}>
      <Image
        source={logoSource}
        accessibilityLabel={APP_LOGO_ALT}
        style={[
          styles.image,
          {
            width: s.image,
            height: s.image,
            borderRadius: radius.lg,
          },
        ]}
      />
      {showName ? (
        <View style={styles.textCol}>
          <Text style={[styles.name, { fontSize: s.name }]}>{APP_NAME}</Text>
          {showTagline ? <Text style={styles.tagline}>{APP_TAGLINE}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={APP_NAME}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  image: {
    resizeMode: 'contain',
    backgroundColor: '#f3f4f6',
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  textCol: { flexShrink: 1 },
  name: { fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  tagline: { fontSize: fontSize.xs, color: colors.muted, marginTop: 1 },
});
