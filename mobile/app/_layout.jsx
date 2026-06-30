/**
 * Root layout — wraps the whole app in providers and defines the navigator.
 * Expo Router renders this around every route.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { EmergencyAlertProvider } from '../src/context/EmergencyAlertContext';
import { BookingCartProvider } from '../src/context/BookingCartContext';
import { AddressProvider } from '../src/context/AddressContext';
import { VisitOtpProvider } from '../src/context/VisitOtpContext';
import VisitOtpPopup from '../src/components/VisitOtpPopup';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EmergencyAlertProvider>
        <VisitOtpProvider>
          <BookingCartProvider>
            <AddressProvider>
              <StatusBar style="dark" />
              <VisitOtpPopup />
              <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="pillar/[pillarId]" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(caregiver)" />
          <Stack.Screen name="(admin)" />
              </Stack>
            </AddressProvider>
          </BookingCartProvider>
        </VisitOtpProvider>
        </EmergencyAlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
