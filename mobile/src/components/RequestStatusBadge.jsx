import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius } from '../theme/theme';

const STATUS_META = {
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: colors.brand, bg: colors.brandSoft },
  on_the_way: { label: 'On the way', color: '#7c3aed', bg: '#ede9fe' },
  in_progress: { label: 'In progress', color: colors.brand, bg: colors.brandSoft },
  completed: { label: 'Completed', color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
};

export default function RequestStatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color: colors.muted, bg: '#f1f5f9' };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: fontSize.xs, fontWeight: '800', textTransform: 'capitalize' },
});
