/**

 * Entry route — public landing for guests; signed-in users go straight to their dashboard.

 */

import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Redirect } from 'expo-router';

import { useAuth } from '../src/context/AuthContext';

import { dashboardHref } from '../src/lib/accountKinds';

import { colors } from '../src/theme/theme';



export default function Index() {

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



  return <Redirect href="/landing" />;

}



const styles = StyleSheet.create({

  center: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: colors.background,

  },

});

