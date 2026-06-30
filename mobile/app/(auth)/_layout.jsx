import { Stack, Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { dashboardHref } from '../../src/lib/accountKinds';
import { colors } from '../../src/theme/theme';

export default function AuthLayout() {
  const { hydrating, isAuthenticated, user } = useAuth();

  if (hydrating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (isAuthenticated && user) {
    return <Redirect href={dashboardHref(user)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
