import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { FormNoticeText } from '../../components/form-footer';
import { HelperText } from '../../components/helper-text';
import { IconButton } from '../../components/icon-button';
import { AppText, Text } from '../../components/text';
import { TextInput } from '../../components/text-input';
import { lineTotal } from '../../features/sales/cart';
import type { CartLine } from '../../features/sales/cart';
import type { Notice } from '../../lib/errors';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = {
  currency: string;
  lines: CartLine[];
  totals: { total: number; tax: number };
  onSetQty: (productId: string, qty: number) => void;
  onClear: () => void;
  tendered: string;
  onTendered: (value: string) => void;
  /** Shown under the cash field once Complete sale has been pressed. */
  tenderError: string | null;
  changeDue: number | null;
  notice: Notice | null;
  pending: boolean;
  onComplete: () => void;
};

/** The cart, its totals, and cash payment (instruction_mds/visual-language.md §4 "Register"). */
export function CartPane(props: Props) {
  const { currency, lines, totals, onSetQty, onClear, tendered, onTendered, tenderError, changeDue, notice, pending, onComplete } = props;
  const { colors } = useAppTheme();
  const muted = { color: colors.onSurfaceMuted };

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text variant="titleMedium">Cart</Text>
          {lines.length > 0 ? (
            <Button mode="text" compact onPress={onClear} disabled={pending}>
              Clear
            </Button>
          ) : null}
        </View>

        {lines.length === 0 ? (
          <Text variant="bodyMedium" style={muted}>
            Tap a product to add it.
          </Text>
        ) : (
          lines.map((line) => (
            <View key={line.productId} style={[styles.line, { borderBottomColor: colors.surfaceVariant }]}>
              <View style={styles.fill}>
                <Text variant="titleMedium" numberOfLines={2} maxFontSizeMultiplier={1.3}>
                  {line.name}
                </Text>
                <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={muted}>
                  {`${formatMoney(line.price, currency)} each`}
                </Text>
              </View>
              <View style={[styles.stepper, { borderColor: colors.outlineVariant }]}>
                <IconButton
                  icon="minus"
                  size={18}
                  style={styles.step}
                  disabled={pending}
                  onPress={() => onSetQty(line.productId, line.qty - 1)}
                  accessibilityLabel={line.qty === 1 ? `Remove ${line.name}` : `One fewer ${line.name}`}
                />
                <Text variant="titleMedium" maxFontSizeMultiplier={1.3}>
                  {line.qty}
                </Text>
                <IconButton
                  icon="add"
                  size={18}
                  style={styles.step}
                  disabled={pending}
                  onPress={() => onSetQty(line.productId, line.qty + 1)}
                  accessibilityLabel={`One more ${line.name}`}
                />
              </View>
              <Text variant="bodyMedium" maxFontSizeMultiplier={1.3} style={styles.amount}>
                {formatMoney(lineTotal(line), currency)}
              </Text>
            </View>
          ))
        )}

        <View style={styles.totals}>
          <View style={[styles.rule, { backgroundColor: colors.onSurface }]} />
          <View style={styles.row}>
            <Text variant="titleMedium">Total</Text>
            <AppText variant="amount">{formatMoney(totals.total, currency)}</AppText>
          </View>
          <Text variant="bodySmall" style={muted}>
            {`Includes tax ${formatMoney(totals.tax, currency)}`}
          </Text>
        </View>

        <View style={styles.cash}>
          <View style={styles.row}>
            <View style={styles.fill}>
              <TextInput
                mode="outlined"
                dense
                label="Cash received (required)"
                value={tendered}
                onChangeText={onTendered}
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={currencySymbol(currency)} />}
                error={tenderError !== null}
                disabled={pending}
              />
            </View>
            <Button mode="outlined" compact disabled={pending || lines.length === 0} onPress={() => onTendered(totals.total.toFixed(2))}>
              Exact amount
            </Button>
          </View>
          <HelperText type="error" visible={tenderError !== null} padding="none">
            {tenderError}
          </HelperText>
          <View style={styles.row}>
            <Text variant="bodyMedium">Change due</Text>
            <Text variant="titleMedium">{formatMoney(changeDue, currency)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
        <FormNoticeText notice={notice} />
        <Button
          mode="contained"
          onPress={onComplete}
          loading={pending}
          disabled={pending || lines.length === 0}
          contentStyle={styles.charge}
        >
          {`Complete sale · ${formatMoney(totals.total, currency)}`}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: spacing.ms, padding: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.ms, borderBottomWidth: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.sm, borderCurve: 'continuous' },
  // IconButton ships a 6dp margin of its own; zeroed so the border hugs the buttons.
  step: { margin: 0 },
  amount: { minWidth: 72, textAlign: 'right' },
  totals: { gap: spacing.xs },
  rule: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cash: { gap: spacing.xs },
  footer: { gap: spacing.sm, padding: spacing.ms, borderTopWidth: 1 },
  // A full-width Button centres its label (instruction_mds/visual-language.md §4 "Full-width buttons").
  charge: { justifyContent: 'flex-start' },
});
