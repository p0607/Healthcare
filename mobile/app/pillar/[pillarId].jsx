/**
 * Public pillar detail (reached from the landing page) — shows a pillar's
 * description and sub-services without requiring login. Booking sends the user
 * to the login page, matching the web flow.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import PillarDetail from '../../src/components/PillarDetail';
import GuestOnly from '../../src/components/GuestOnly';

export default function PublicPillarScreen() {
  const { pillarId } = useLocalSearchParams();
  const router = useRouter();
  return (
    <GuestOnly>
      <PillarDetail
        pillarId={pillarId}
        bookLabel="Sign in to book"
        onBook={() => router.push('/(auth)/login')}
      />
    </GuestOnly>
  );
}
