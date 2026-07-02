import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { api } from '../api/client';
import { getApiConfigDebugInfo } from '../lib/apiConfig';
import { colors, fontSize, spacing } from '../theme/theme';

/**
 * On-device API diagnostics — tap "Connection" on login screens to verify
 * the baked-in EAS URLs and test /api/health from the phone.
 */
export default function ConnectionDiagnostics() {
  const info = useMemo(() => getApiConfigDebugInfo(), []);
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const onTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const { data } = await api.get('/health');
      setResult({
        ok: true,
        text: data?.ok ? `OK — db: ${data.db || '?'}` : JSON.stringify(data),
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Request failed';
      setResult({
        ok: false,
        text: status ? `HTTP ${status}: ${msg}` : msg,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>{open ? '▼' : '▶'} Connection debug</Text>
      </Pressable>
      {open ? (
        <View style={styles.panel}>
          <Text style={styles.line}>Profile: {info.buildProfile || 'local/dev'}</Text>
          <Text style={styles.line}>API: {info.resolvedApi}</Text>
          <Text style={styles.line}>
            Socket: {info.resolvedSocket}
            {info.resolvedSocketPath}
          </Text>
          <Text style={styles.hint}>
            Configured: {info.configuredApi || '(missing — rebuild with eas.json env)'}
          </Text>
          <Pressable style={styles.testBtn} onPress={onTest} disabled={testing}>
            <Text style={styles.testBtnText}>{testing ? 'Testing…' : 'Test API /health'}</Text>
          </Pressable>
          {result ? (
            <Text style={[styles.result, result.ok ? styles.ok : styles.fail]}>{result.text}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  toggle: { paddingVertical: spacing.sm },
  toggleText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '600' },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  line: { fontSize: fontSize.xs, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  hint: { fontSize: fontSize.xs, color: colors.muted },
  testBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.brand,
  },
  testBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  result: { marginTop: spacing.sm, fontSize: fontSize.sm, fontWeight: '600' },
  ok: { color: '#059669' },
  fail: { color: colors.danger },
});
