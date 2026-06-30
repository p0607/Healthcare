import { View, StyleSheet } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useBookingCart } from '../../src/context/BookingCartContext';
import VisitOtpFocusRefresh from '../../src/components/VisitOtpFocusRefresh';
import { useLandingBackHandler } from '../../src/lib/navigation';
import { colors } from '../../src/theme/theme';

/**
 * Authenticated area — bottom tab navigation (Home / Bookings / Cart / Profile).
 */
export default function AppLayout() {
  const { hydrating, isAuthenticated, user } = useAuth();
  const { itemCount } = useBookingCart();
  useLandingBackHandler({
    enabled: isAuthenticated && user?.role !== 'admin' && user?.role !== 'nurse',
  });

  if (hydrating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role === 'admin') {
    return <Redirect href="/(admin)/home" />;
  }

  if (user?.role === 'nurse') {
    return <Redirect href="/(caregiver)/home" />;
  }

  return (
    <View style={styles.root}>
      <VisitOtpFocusRefresh />
      <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.brand,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: 60,
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: 'Bookings',
              tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="cart"
            options={{
              title: 'Cart',
              tabBarBadge: itemCount > 0 ? itemCount : undefined,
              tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
            }}
          />
          <Tabs.Screen name="service/[pillarId]" options={{ href: null }} />
          <Tabs.Screen name="book/[serviceType]" options={{ href: null }} />
          <Tabs.Screen name="payment" options={{ href: null }} />
          <Tabs.Screen name="track/[requestId]" options={{ href: null }} />
          <Tabs.Screen name="ongoing" options={{ href: null }} />
        </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
