/**
 * Service pillar detail (logged-in) — thin wrapper over the shared PillarDetail.
 * Booking a service routes into the in-app caregiver list / booking flow.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import PillarDetail from '../../../src/components/PillarDetail';

export default function ServicePillarScreen() {
  const { pillarId } = useLocalSearchParams();
  const router = useRouter();
  return (
    <PillarDetail
      pillarId={pillarId}
      bookLabel="Book at home"
      onBook={(serviceType) => router.push(`/(app)/book/${serviceType}`)}
    />
  );
}
