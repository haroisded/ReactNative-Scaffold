import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../lib/theme';
import { radius, spacing } from '../themes';
import { Text } from './text';

/** The red-bordered "Voided …" box and its reason, at the top of a voided stock receipt or sale. */
export function VoidedNotice({ when, reason }: { when: string; reason: string | null }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.box, { borderColor: colors.error }]}>
      <Text variant="titleMedium" style={{ color: colors.error }}>
        {`Voided ${when}`}
      </Text>
      {reason ? <Text variant="bodyMedium">{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous' },
});
