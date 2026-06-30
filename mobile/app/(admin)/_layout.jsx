import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLandingBackHandler } from '../../src/lib/navigation';
import { colors } from '../../src/theme/theme';

export default function AdminLayout() {
  const { hydrating, isAuthenticated, user } = useAuth();
  useLandingBackHandler({ enabled: isAuthenticated && user?.role === 'admin' });

  if (hydrating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!isAuthenticated || !user || user?.role !== 'admin') {
    return <Redirect href="/(auth)/staff-login?admin=1" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
