import { StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { caregiverServiceLabel } from '@nursecare/shared';

import { useAuth } from '../context/AuthContext';

import { colors, fontSize, spacing } from '../theme/theme';



export default function CaregiverScreenHeader({ title, subtitle, left }) {

  const { user } = useAuth();

  const category = user?.caregiverCategory || 'nurse_visit';

  const metaLine =

    subtitle ||

    `${user?.name || 'Caregiver'} · ${caregiverServiceLabel(category)}`;



  return (

    <SafeAreaView edges={['top']} style={styles.safe}>

      <View style={styles.header}>

        {left ? <View style={styles.topRow}>{left}</View> : null}

        <Text style={styles.brand}>Care provider</Text>

        <Text style={styles.title}>{title}</Text>

        <Text style={styles.meta}>{metaLine}</Text>

      </View>

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  safe: { backgroundColor: colors.surface },

  header: {

    paddingHorizontal: spacing.lg,

    paddingBottom: spacing.md,

    borderBottomWidth: 1,

    borderBottomColor: colors.border,

    gap: 2,

  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },

  brand: { fontSize: 11, fontWeight: '800', color: colors.brand, textTransform: 'uppercase' },

  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },

  meta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },

});

