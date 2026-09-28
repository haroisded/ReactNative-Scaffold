import { StyleSheet, View } from 'react-native';

import { useShellWide } from '../lib/columns';
import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { Text } from './text';

/** A label and its value. A fact with no value is left out, so a caller lists every field it has. */
export type Fact = [label: string, value: string | null | undefined];

/** A detail screen's label-over-value grid: three to a row on a tablet, two on a phone. */
export function FactGrid({ facts }: { facts: Fact[] }) {
  const { colors } = useAppTheme();
  const wide = useShellWide();

  return (
    <View style={styles.facts}>
      {facts.map(([label, value]) =>
        value ? (
          <View key={label} style={wide ? styles.factWide : styles.factNarrow}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceMuted }}>
              {label}
            </Text>
            <Text variant="bodyMedium">{value}</Text>
          </View>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.ms },
  factWide: { width: '33%', gap: spacing.xs, paddingRight: spacing.md },
  factNarrow: { width: '50%', gap: spacing.xs, paddingRight: spacing.md },
});
