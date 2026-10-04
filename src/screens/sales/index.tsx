import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { DataTable } from '../../components/data-table';
import { HeaderTitle } from '../../components/header-title';
import { PageHeader } from '../../components/page-header';
import { QueryState } from '../../components/query-state';
import { Text } from '../../components/text';
import { saleTime, useSalesQuery } from '../../features/sales/queries';
import type { SaleRow } from '../../features/sales/queries';
import { useTableFits } from '../../lib/columns';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

type Props = { merchantId: string; merchantName: string; currency: string };

/** Receipts: every sale the Register made, newest first — a table when wide, rows when narrow. */
export function Sales({ merchantId, merchantName, currency }: Props) {
  const { colors } = useAppTheme();
  // Wide at a readable font scale; else rows (instruction_mds/frontend.md §3.5).
  const table = useTableFits();
  const sales = useSalesQuery({ merchantId });
  const rows = sales.data ?? [];

  const empty = (
    <View style={styles.state}>
      <QueryState query={sales} offline="You're offline. Receipts will load when you reconnect." failure="Couldn't load receipts. Try again.">
        <Text variant="bodyMedium">No sales yet. Every sale made on the Register lands here.</Text>
      </QueryState>
    </View>
  );

  const renderItem = ({ item }: { item: SaleRow }) => <SaleRowView item={item} wide={table} currency={currency} merchantId={merchantId} />;
  const list = <FlashList data={rows} keyExtractor={(item) => item.id} ListEmptyComponent={empty} renderItem={renderItem} />;

  return (
    <View style={styles.fill}>
      <PageHeader kicker={merchantName} title="Receipts" meta={`${rows.length} ${rows.length === 1 ? 'sale' : 'sales'}`} />
      {table ? (
        <DataTable style={styles.fill}>
          <DataTable.Header style={{ borderBottomColor: colors.outlineVariant }}>
            <HeaderTitle label="Date / time" style={styles.dateCell} />
            <HeaderTitle label="Receipt" style={styles.codeCell} />
            <HeaderTitle label="Items" style={styles.countCell} />
            <HeaderTitle label="Total" style={styles.moneyCell} />
            <HeaderTitle label="Status" style={styles.statusCell} />
          </DataTable.Header>
          {list}
        </DataTable>
      ) : (
        list
      )}
    </View>
  );
}

function SaleRowView({ item, wide, currency, merchantId }: { item: SaleRow; wide: boolean; currency: string; merchantId: string }) {
  const { colors } = useAppTheme();
  const count = item.lines.reduce((sum, line) => sum + line.qty, 0);
  const voided = item.voided_at !== null;
  const status = (
    <Text variant="labelMedium" style={{ color: voided ? colors.onSurfaceFaint : colors.onSurface }}>
      {voided ? 'Void' : 'Paid'}
    </Text>
  );
  const total = (
    <Text variant="bodyMedium" style={[wide && styles.moneyCell, voided && styles.struck]}>
      {formatMoney(item.total, currency)}
    </Text>
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/systems/[id]/receipts/[saleId]', params: { id: merchantId, saleId: item.id } })}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/frontend.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`${item.code}, ${formatMoney(item.total, currency)}${voided ? ', void' : ''}`}
      style={[wide ? styles.tableRow : styles.cardRow, { borderBottomColor: colors.surfaceVariant }]}
    >
      {wide ? (
        <>
          <Text variant="bodyMedium" style={styles.dateCell}>
            {saleTime(item.created_at)}
          </Text>
          <Text variant="titleMedium" style={styles.codeCell}>
            {item.code}
          </Text>
          <Text variant="bodyMedium" style={styles.countCell}>
            {count}
          </Text>
          {total}
          <View style={styles.statusCell}>{status}</View>
        </>
      ) : (
        <>
          <View style={styles.cardText}>
            <Text variant="titleMedium">
              {item.code}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
              {`${saleTime(item.created_at)} · ${count} ${count === 1 ? 'item' : 'items'}`}
            </Text>
          </View>
          <View style={styles.cardEnd}>
            {total}
            {status}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  dateCell: { flex: 1.6, paddingRight: spacing.sm },
  codeCell: { flex: 1.2, paddingRight: spacing.sm },
  countCell: { flex: 0.7, paddingRight: spacing.sm },
  moneyCell: { flex: 1.1, paddingRight: spacing.sm },
  statusCell: { flex: 0.8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.ms, borderBottomWidth: 1 },
  cardText: { flex: 1, gap: spacing.xs },
  cardEnd: { alignItems: 'flex-end', gap: spacing.xs },
  struck: { textDecorationLine: 'line-through' },
});
