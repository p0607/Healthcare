import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { dashboardHref } from '../lib/accountKinds';
import { colors } from '../theme/theme';

/** Blocks signed-in users from public/guest screens (landing, login, etc.). */
export default function GuestOnly({ children }) {
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

  return children;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
