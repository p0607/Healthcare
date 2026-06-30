/** Safe-area page wrapper so content avoids the notch / home indicator. */
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/theme';

export default function Screen({ children, style, padded = true }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.body, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  padded: {
    padding: spacing.xl,
  },
});
