import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useVisitOtp } from '../context/VisitOtpContext';

/** Refreshes pending OTP whenever the patient navigates to another screen. */
export default function VisitOtpFocusRefresh() {
  const pathname = usePathname();
  const { refreshFromApi } = useVisitOtp();

  useEffect(() => {
    refreshFromApi();
  }, [pathname, refreshFromApi]);

  return null;
}
