import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function ProfileTabBar({ tabs, activeId, onChange }) {
  if (!tabs?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={2}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { maxHeight: 52 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxWidth: 220,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
  },
  chipTextActive: { color: colors.brand },
  pressed: { opacity: 0.85 },
});
