import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/activity-indicator';
import { Button } from '../../components/button';
import { DataTable } from '../../components/data-table';
import { displayDate } from '../../components/form-fields';
import { HeaderTitle } from '../../components/header-title';
import { Text } from '../../components/text';
import { RECEIPT_STATUS_LABEL, receiptStatus, receiptTotal, useStockReceiptsQuery } from '../../features/stock-receipts/queries';
import type { ReceiptListRow, ReceiptStatus } from '../../features/stock-receipts/queries';
import { useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

// A receipt's status in the muted scale of instruction_mds/visual-language.md §4: only Partial, the one
// that still needs attention, carries the accent.
const STATUS_TONE = {
  full: 'onSurface',
  partial: 'accent',
  depleted: 'onSurfaceMuted',
  void: 'onSurfaceFaint',
} satisfies Record<ReceiptStatus, 'onSurface' | 'accent' | 'onSurfaceMuted' | 'onSurfaceFaint'>;

type Props = { merchantId: string; currency: string };

export function ReceiptsPane({ merchantId, currency }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const receipts = useStockReceiptsQuery({ merchantId });
  const rows = receipts.data ?? [];

  const open = (receiptId: string) =>
    router.push({ pathname: '/systems/[id]/stock/receipts/[receiptId]', params: { id: merchantId, receiptId } });

  const empty = (
    <View style={styles.state}>
      {/* Paused before pending (instruction_mds/data-layer.md §5). */}
      {receipts.isPaused && !receipts.data ? (
        <Text variant="bodyMedium">You&apos;re offline. Receipts will load when you reconnect.</Text>
      ) : receipts.isPending ? (
        <ActivityIndicator />
      ) : receipts.isError ? (
        <>
          <Text variant="bodyMedium">{failureMessage("Couldn't load receipts. Try again.")}</Text>
          <Button onPress={() => receipts.refetch()}>Try again</Button>
        </>
      ) : (
        <>
          <Text variant="bodyMedium">
            No receipts yet. Record a delivery, or your opening stock with no supplier, to start counting.
          </Text>
          <Button
            mode="contained"
            icon="add"
            onPress={() => router.push({ pathname: '/systems/[id]/stock/receipts/new', params: { id: merchantId } })}
          >
            New receipt
          </Button>
        </>
      )}
    </View>
  );

  if (!wide) {
    return (
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={empty}
        renderItem={({ item }) => <CardRow item={item} currency={currency} onOpen={() => open(item.id)} />}
      />
    );
  }

  return (
    <DataTable style={styles.fill}>
      <DataTable.Header style={{ borderBottomColor: colors.outlineVariant }}>
        <HeaderTitle label="Date" style={styles.dateCell} />
        <HeaderTitle label="Receipt" style={styles.codeCell} />
        <HeaderTitle label="Supplier" style={styles.supplierCell} />
        <HeaderTitle label="Lines" style={styles.linesCell} />
        <HeaderTitle label="Status" style={styles.statusCell} />
        <HeaderTitle label="Total" style={styles.totalCell} />
      </DataTable.Header>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={empty}
        renderItem={({ item }) => <TableRow item={item} currency={currency} onOpen={() => open(item.id)} />}
      />
    </DataTable>
  );
}

type RowProps = { item: ReceiptListRow; currency: string; onOpen: () => void };

/** "Metro Wholesale", or "Opening stock" for a receipt with no supplier (design.md §3). */
const supplierLabel = (item: ReceiptListRow) => item.supplier?.name ?? 'Opening stock';
const linesLabel = (item: ReceiptListRow) => `${item.lots.length} ${item.lots.length === 1 ? 'line' : 'lines'}`;

function TableRow({ item, currency, onOpen }: RowProps) {
  const { colors } = useAppTheme();
  const status = receiptStatus(item);

  return (
    <DataTable.Row onPress={onOpen} style={[styles.tableRow, { borderBottomColor: colors.surfaceVariant }]}>
      <View style={styles.dateCell}>
        <Text variant="bodyMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {displayDate(item.received_on)}
        </Text>
      </View>
      <View style={styles.codeCell}>
        <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {item.code}
        </Text>
        {item.invoice_no ? (
          <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
            {item.invoice_no}
          </Text>
        ) : null}
      </View>
      <View style={styles.supplierCell}>
        <Text variant="bodyMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {supplierLabel(item)}
        </Text>
      </View>
      <View style={styles.linesCell}>
        <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
          {linesLabel(item)}
        </Text>
      </View>
      <View style={styles.statusCell}>
        <Text variant="labelMedium" maxFontSizeMultiplier={1.3} style={{ color: colors[STATUS_TONE[status]] }}>
          {RECEIPT_STATUS_LABEL[status]}
        </Text>
      </View>
      <View style={styles.totalCell}>
        <Text variant="bodyMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {formatMoney(receiptTotal(item), currency)}
        </Text>
      </View>
    </DataTable.Row>
  );
}

function CardRow({ item, currency, onOpen }: RowProps) {
  const { colors } = useAppTheme();
  const status = receiptStatus(item);

  return (
    <Pressable
      onPress={onOpen}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`${item.code}, ${supplierLabel(item)}`}
      style={[styles.cardRow, { borderBottomColor: colors.surfaceVariant }]}
    >
      <View style={styles.cardText}>
        <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {`${item.code} · ${supplierLabel(item)}`}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {`${displayDate(item.received_on)} · ${linesLabel(item)}`}
        </Text>
        <Text variant="labelMedium" maxFontSizeMultiplier={1.3} style={{ color: colors[STATUS_TONE[status]] }}>
          {RECEIPT_STATUS_LABEL[status]}
        </Text>
      </View>
      <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {formatMoney(receiptTotal(item), currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  tableRow: { borderBottomWidth: 1, minHeight: 60 },
  dateCell: { flex: 1.2, justifyContent: 'center', paddingRight: spacing.ms },
  codeCell: { flex: 1.3, justifyContent: 'center', paddingRight: spacing.ms },
  supplierCell: { flex: 2.5, justifyContent: 'center', paddingRight: spacing.ms },
  linesCell: { flex: 1, justifyContent: 'center' },
  statusCell: { flex: 1, justifyContent: 'center' },
  totalCell: { flex: 1.4, justifyContent: 'center', alignItems: 'flex-end' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
  },
  cardText: { flex: 1, gap: spacing.xs },
});
