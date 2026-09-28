import { StyleSheet, View } from 'react-native';

import { displayDate } from '../../components/form-fields';
import { Text } from '../../components/text';
import type { StockItemOption } from '../../features/products/queries';
import { lineCost } from '../../features/stock-receipts/schema';
import type { ReceiptHeaderValues, ReceiptLineValues } from '../../features/stock-receipts/schema';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';
import { lineItem, lineSummary } from './line-editor';

type Props = {
  header: ReceiptHeaderValues;
  supplierName: string;
  lines: ReceiptLineValues[];
  items: StockItemOption[];
  currency: string;
};

/**
 * The receipt before it is saved: every line's value, freight spread across them by value, and the
 * landed total. The split here is a preview of the one save_receipt does; the saved lot costs are the
 * server's and are fixed from then on (design.md §3).
 */
export function ReceiptReview({ header, supplierName, lines, items, currency }: Props) {
  const { colors } = useAppTheme();
  const costs = lines.map((line) => lineCost(line, lineItem(line, items)?.unitsPerPack ?? 1));
  const subtotal = costs.reduce((sum, cost) => sum + cost, 0);
  const freight = Number(header.freight || 0);
  const muted = { color: colors.onSurfaceMuted };

  return (
    <View style={styles.root}>
      <View style={styles.block}>
        <Text variant="titleMedium">{supplierName}</Text>
        <Text variant="bodySmall" style={muted}>
          {[displayDate(header.receivedOn), header.invoiceNo, header.receivedBy && `by ${header.receivedBy}`]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <View style={[styles.block, styles.rule, { borderTopColor: colors.outlineVariant }]}>
        {lines.length === 0 ? (
          <Text variant="bodyMedium" style={muted}>
            No lines yet.
          </Text>
        ) : (
          lines.map((line, index) => {
            const item = lineItem(line, items);
            const share = subtotal > 0 ? (freight * costs[index]) / subtotal : 0;
            return (
              <View key={index} style={styles.row}>
                <View style={styles.fill}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item?.name ?? 'Item'}
                  </Text>
                  <Text variant="bodySmall" style={muted} numberOfLines={1}>
                    {share > 0
                      ? `${lineSummary(line, item)} · + ${formatMoney(share, currency)} freight`
                      : lineSummary(line, item)}
                  </Text>
                </View>
                <Text variant="bodyMedium">{formatMoney(costs[index], currency)}</Text>
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.block, styles.rule, { borderTopColor: colors.outlineVariant }]}>
        <View style={styles.row}>
          <Text variant="bodyMedium" style={[styles.fill, muted]}>
            Lines
          </Text>
          <Text variant="bodyMedium">{formatMoney(subtotal, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodyMedium" style={[styles.fill, muted]}>
            Freight
          </Text>
          <Text variant="bodyMedium">{formatMoney(freight, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="titleMedium" style={styles.fill}>
            Total
          </Text>
          <Text variant="titleMedium">{formatMoney(subtotal + freight, currency)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { gap: spacing.md },
  block: { gap: spacing.sm },
  rule: { borderTopWidth: 1, paddingTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
});
