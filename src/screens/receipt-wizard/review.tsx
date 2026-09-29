import { StyleSheet, View } from 'react-native';

import { displayDate } from '../../components/form-fields';
import { Text } from '../../components/text';
import { caseTotals, landedCosts, lineCostPerPack, linePacks, receiptLines } from '../../features/stock-receipts/schema';
import type { ReceiptValues } from '../../features/stock-receipts/schema';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

type Props = { receipt: ReceiptValues; supplierName: string; currency: string };

/**
 * The receipt before it is saved (Stock_Receiving.html step 7): each product's packs, cases and cost per
 * base unit with its freight share, then the total. Pack and case codes are issued on save, so they read
 * as a count here. The split is a preview of the one save_receipt does; the saved costs are the server's.
 */
export function ReceiptReview({ receipt, supplierName, currency }: Props) {
  const { colors } = useAppTheme();
  const lines = receiptLines(receipt);
  const costs = landedCosts(receipt);
  const cases = receipt.multi ? null : caseTotals(receipt);
  const freight = Number(receipt.freight || 0);
  const total = costs.reduce((sum, cost) => sum + cost.value, 0) + freight;
  const muted = { color: colors.onSurfaceMuted };

  return (
    <View style={styles.root}>
      <Row label="Supplier" value={supplierName} />
      <Row label="Date received" value={receipt.receivedOn ? displayDate(receipt.receivedOn) : '—'} />
      <Row label="Freight / other charges" value={freight ? formatMoney(freight, currency) : '—'} />

      {lines.map((line, index) => {
        const unit = line.sellBy === 'pack' ? 'pack' : line.baseUnit || 'unit';
        const packs = linePacks(line, receipt);
        return (
          <View key={index} style={[styles.line, { borderTopColor: colors.outlineVariant }]}>
            <Text variant="titleMedium">{line.name || 'Item'}</Text>
            <Row label="Lot / batch" value={line.lotCode || 'Issued on save'} />
            <Row label="Received packs" value={`${packs} · pack IDs issued on save`} />
            {index === 0 && !receipt.multi ? (
              <Row label="Cases" value={cases ? `${cases.cases} × ${cases.per} packs · case IDs issued on save` : 'None (loose packs)'} />
            ) : null}
            <Row label={`Total ${unit}`} value={String(costs[index].units)} />
            <Row label="Cost per pack" value={formatMoney(lineCostPerPack(line, receipt), currency)} />
            <Row label={`Cost per ${unit}`} value={`${formatMoney(costs[index].unitCost, currency)} landed`} />
            {costs[index].share > 0 ? <Row label="Freight share" value={formatMoney(costs[index].share, currency)} /> : null}
            <Row label="Expiry date" value={line.hasExpiry && line.expiresOn ? displayDate(line.expiresOn) : 'None'} />
          </View>
        );
      })}

      <View style={[styles.line, { borderTopColor: colors.onSurface }]}>
        <Row label="Total" value={formatMoney(total, currency)} strong />
        <Text variant="bodySmall" style={muted}>
          Freight is spread across the products by value and added into each cost per base unit.
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
        {label}
      </Text>
      <Text variant={strong ? 'titleMedium' : 'bodyMedium'} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  line: { gap: spacing.xs, borderTopWidth: 1, paddingTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.ms },
  value: { flexShrink: 1, textAlign: 'right' },
});
