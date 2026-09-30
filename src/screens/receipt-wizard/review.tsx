import { StyleSheet, View } from 'react-native';

import { displayDate } from '../../components/form-fields';
import { Text } from '../../components/text';
import {
  caseTotals,
  lineCost,
  lineCostPerPack,
  lineExpected,
  linePacks,
  lineUnitCost,
  receiptLines,
  unitsPerPack,
} from '../../features/stock-receipts/schema';
import type { ReceiptValues } from '../../features/stock-receipts/schema';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

type Props = { receipt: ReceiptValues; supplierName: string; currency: string };

/**
 * The receipt before it is saved (Stock_Receiving.html step 7): each product's expected and received packs,
 * cases and cost per base unit, then the total. Pack and case codes are issued on save, so they read as a
 * count here. Shipping cost is part of the total but of no product's cost (20260930100000_receipt_inputs.sql).
 */
export function ReceiptReview({ receipt, supplierName, currency }: Props) {
  const { colors } = useAppTheme();
  const lines = receiptLines(receipt);
  const cases = receipt.multi ? null : caseTotals(receipt);
  const freight = Number(receipt.freight || 0);
  const total = lines.reduce((sum, line) => sum + lineCost(line, receipt), 0) + freight;
  const muted = { color: colors.onSurfaceMuted };

  return (
    <View style={styles.root}>
      <Row label="Supplier" value={supplierName} />
      <Row label="Date received" value={receipt.receivedOn ? displayDate(receipt.receivedOn) : '—'} />
      <Row label="Shipping cost" value={freight ? formatMoney(freight, currency) : '—'} />

      {lines.map((line, index) => {
        const unit = line.sellBy === 'pack' ? 'pack' : line.baseUnit || 'unit';
        const packs = linePacks(line, receipt);
        const units = line.sellBy === 'pack' ? packs : packs * unitsPerPack(line);
        return (
          <View key={index} style={[styles.line, { borderTopColor: colors.outlineVariant }]}>
            <Text variant="titleMedium">{line.name || 'Item'}</Text>
            <Row label="Lot / batch" value={line.lotCode || '—'} />
            <Row label="Pack quantity" value={String(lineExpected(line, receipt))} />
            <Row label="Received packs" value={`${packs} · pack IDs issued on save`} />
            {index === 0 && !receipt.multi ? (
              <Row label="Cases" value={cases ? `${cases.cases} × ${cases.per} packs · case IDs issued on save` : 'None (loose packs)'} />
            ) : null}
            <Row label={`Total ${unit}`} value={String(units)} />
            <Row label="Cost per pack" value={formatMoney(lineCostPerPack(line, receipt), currency)} />
            {line.sellBy === 'pack' ? null : <Row label={`Cost per ${unit}`} value={formatMoney(lineUnitCost(line, receipt), currency)} />}
            <Row label="Expiry date" value={line.hasExpiry && line.expiresOn ? displayDate(line.expiresOn) : 'None'} />
          </View>
        );
      })}

      <View style={[styles.line, { borderTopColor: colors.onSurface }]}>
        <Row label="Total" value={formatMoney(total, currency)} strong />
        <Text variant="bodySmall" style={muted}>
          Shipping cost is in the total, and in no product's cost.
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
