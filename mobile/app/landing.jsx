/**
 * Public landing page — the mobile mirror of the web homepage.
 *
 * Navigation rules (match the web):
 *   - Landing always shows "Sign in" / "Book a service" (public labels)
 *   - Tapping routes to login, or straight to the app when a valid saved session exists
 */
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SERVICE_PILLARS } from '@nursecare/shared';
import PillarImageTile from '../src/components/PillarImageTile';
import GuestOnly from '../src/components/GuestOnly';
import BrandLogo from '../src/components/BrandLogo';
import { useAuth } from '../src/context/AuthContext';
import { navigateForUser } from '../src/lib/accountKinds';
import { getPillarImage, PILLAR_BORDER_COLORS } from '../src/lib/serviceImages';
import { colors, fontSize, radius, spacing } from '../src/theme/theme';

const HOW_IT_WORKS = [
  {
    icon: 'search',
    title: 'Tell us what you need',
    text: 'Choose a service and share your location.',
  },
  {
    icon: 'people',
    title: 'Get matched instantly',
    text: 'We find verified caregivers near you.',
  },
  {
    icon: 'home',
    title: 'Care at your door',
    text: 'Track arrival live and pay securely in the app.',
  },
];

const FEATURES = [
  {
    icon: 'shield-checkmark',
    title: 'Verified professionals',
    text: 'Background-checked nurses, doctors & physiotherapists.',
  },
  {
    icon: 'navigate',
    title: 'Live tracking',
    text: 'See your caregiver on the way in real time.',
  },
  {
    icon: 'card',
    title: 'Transparent pricing',
    text: 'Clear quotes before you confirm — no surprises.',
  },
  {
    icon: 'time',
    title: '24/7 availability',
    text: "Urgent or scheduled, we're ready when you are.",
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const goLogin = () => router.push('/(auth)/login');
  const goDashboard = () => navigateForUser(user, router);
  const goPrimary = () => (isAuthenticated ? goDashboard() : goLogin());
  const openPillar = (pillarId) => router.push(`/pillar/${pillarId}`);

  return (
    <GuestOnly>
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar: brand + sign in */}
      <View style={styles.topBar}>
        <BrandLogo size="md" showTagline />
        <Pressable onPress={goPrimary} hitSlop={8}>
          <Text style={styles.signIn}>Sign in</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
      >
        {/* Hero */}
        <View style={styles.heroBlock}>
        <View style={styles.heroBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.heroBadgeText}>Live · verified · at home</Text>
        </View>

        <Text style={styles.heading}>
          Your family's health hub{' '}
          <Text style={styles.headingAccent}>one app, every service.</Text>
        </Text>

        <Pressable
          style={({ pressed }) => [styles.bookBtn, pressed && styles.pressed]}
          onPress={goPrimary}
        >
          <Text style={styles.bookBtnText}>Book a service</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </Pressable>
        </View>

        {/* Pillar cards -> description */}
        <View style={styles.pillarGrid}>
          {SERVICE_PILLARS.map((pillar) => (
            <PillarImageTile
              key={pillar.id}
              source={getPillarImage(pillar.id)}
              borderColor={PILLAR_BORDER_COLORS[pillar.id]}
              title={pillar.title.toUpperCase()}
              onPress={() => openPillar(pillar.id)}
            />
          ))}
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.stepsWrap}>
          {HOW_IT_WORKS.map((step, idx) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepNumWrap}>
                <Text style={styles.stepNum}>{idx + 1}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
              <Ionicons name={step.icon} size={20} color={colors.brand} />
            </View>
          ))}
        </View>

        {/* Why families choose us */}
        <Text style={styles.sectionTitle}>Why families choose Care360</Text>
        <View style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={18} color={colors.brand} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Doctor on call highlight */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="call" size={20} color={colors.white} />
          </View>
          <Text style={styles.ctaTitle}>Doctor on call</Text>
          <Text style={styles.ctaText}>
            Speak with a licensed physician by video in minutes, or book a home visit.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
            onPress={goPrimary}
          >
            <Text style={styles.ctaBtnText}>Sign in to start</Text>
          </Pressable>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalTitle}>Ready when you are</Text>
          <Text style={styles.finalText}>
            Patients, caregivers, and admins each have a dedicated login — one trusted home-care
            network.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.bookBtn, styles.bookBtnFull, pressed && styles.pressed]}
            onPress={goPrimary}
          >
            <Text style={styles.bookBtnText}>Book a service</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
    </GuestOnly>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  brandName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.brand },
  signIn: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heroBlock: { alignItems: 'center', width: '100%' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroBadgeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text },
  heading: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.xl,
  },
  headingAccent: { color: colors.brand },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    shadowColor: colors.brand,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  bookBtnFull: { alignSelf: 'stretch', marginTop: spacing.lg },
  bookBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSize.md },
  pressed: { opacity: 0.85 },
  pillarGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    width: '100%',
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  stepsWrap: { width: '100%', gap: spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: colors.white, fontWeight: '800', fontSize: fontSize.sm },
  stepTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  stepText: { fontSize: fontSize.xs, color: colors.muted, marginTop: 1 },
  featureGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  featureTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  featureText: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 16 },
  ctaCard: {
    width: '100%',
    marginTop: spacing.xxl,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  ctaTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  ctaText: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  ctaBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  ctaBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  finalCta: {
    width: '100%',
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  finalTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  finalText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
