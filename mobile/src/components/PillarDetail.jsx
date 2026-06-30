/**
 * Shared pillar-detail view — sub-service photo cards with bullet highlights only.
 */
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SERVICE_PILLARS } from '@nursecare/shared';
import { PillarImageSquare, ServiceCardImage } from './PillarImageTile';
import { getPillarImage, getSubserviceImage, PILLAR_BORDER_COLORS } from '../lib/serviceImages';
import { colors, fontSize, radius, spacing } from '../theme/theme';

export default function PillarDetail({ pillarId, bookLabel = 'Book at home', onBook }) {
  const router = useRouter();
  const pillar = SERVICE_PILLARS.find((p) => p.id === pillarId);

  if (!pillar) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.notFound}>Service not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/landing'))}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {pillar.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={false}
      >
        <View style={styles.heroRow}>
          <PillarImageSquare
            source={getPillarImage(pillar.id)}
            borderColor={PILLAR_BORDER_COLORS[pillar.id]}
            size={112}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{pillar.title}</Text>
            <Text style={styles.tagline}>{pillar.tagline}</Text>
          </View>
        </View>

        {pillar.services.map((service) => (
          <View key={service.id} style={styles.card}>
            <ServiceCardImage source={getSubserviceImage(service.id)} name={service.name} />

            <View style={styles.cardBody}>
              {service.highlights?.length ? (
                <View style={styles.highlights}>
                  {service.highlights.map((h) => (
                    <View key={h} style={styles.highlightRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {service.serviceType ? (
                <Pressable
                  style={({ pressed }) => [styles.bookBtn, pressed && styles.pressed]}
                  onPress={() => onBook?.(service.serviceType)}
                >
                  <Text style={styles.bookBtnText}>{bookLabel}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                </Pressable>
              ) : (
                <View style={styles.enquireNote}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                  <Text style={styles.enquireText}>
                    Available on request — contact support to set up.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1, gap: spacing.xs },
  heroTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  tagline: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  highlights: { gap: spacing.xs },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  highlightText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  bookBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  pressed: { opacity: 0.85 },
  enquireNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  enquireText: { fontSize: fontSize.xs, color: colors.muted, flex: 1 },
  notFound: { padding: spacing.xl, color: colors.muted },
});
