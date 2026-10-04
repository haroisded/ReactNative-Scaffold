import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { FactGrid } from '../../components/fact-grid';
import type { Fact } from '../../components/fact-grid';
import { PageHeader } from '../../components/page-header';
import { QueryState } from '../../components/query-state';
import { Text } from '../../components/text';
import { VoidSaleDialog } from '../../components/void-sale-dialog';
import { VoidedNotice } from '../../components/voided-notice';
import { saleTime, useSaleQuery } from '../../features/sales/queries';
import { MOVEMENT_KIND_LABEL } from '../../features/stock-movements/queries';
import { useShellWide } from '../../lib/columns';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = { currency: string; id: string };

/**
 * One sale's receipt: what was sold, what was paid, and — under "Stock drawn" — every pack the sale took
 * units from, which is the ledger proving it moved. Void is here while the sale stands.
 */
export function SaleDetailScreen({ currency, id }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const query = useSaleQuery({ id });
  const [voiding, setVoiding] = useState(false);
  const sale = query.data;

  if (!sale) {
    return (
      <View style={styles.fill}>
        <PageHeader kicker="Receipt" title="Sale" onBack={() => router.back()} />
        <View style={styles.state}>
          <QueryState query={query} offline="You're offline. This receipt will load when you reconnect." failure="Couldn't load this receipt. Try again.">
            <Text variant="bodyMedium">This receipt is no longer available.</Text>
          </QueryState>
        </View>
      </View>
    );
  }

  const openVoid = () => {
    if (wide) setVoiding(true);
    else router.push({ pathname: '/sheets/void-sale', params: { saleId: sale.id } });
  };
  const muted = { color: colors.onSurfaceMuted };
  const facts: Fact[] = [
    ['Sold', saleTime(sale.created_at)],
    ['Cash received', formatMoney(sale.tendered, currency)],
    ['Change', formatMoney(sale.change_due, currency)],
  ];

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker="Receipt"
        title={sale.code}
        meta={sale.voided_at ? 'Void' : 'Paid · cash'}
        onBack={() => router.back()}
        actions={
          sale.voided_at ? null : (
            <Button mode="outlined" icon="close" textColor={colors.error} onPress={openVoid}>
              Void
            </Button>
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {sale.voided_at ? <VoidedNotice when={saleTime(sale.voided_at)} reason={sale.void_reason} /> : null}

        <FactGrid facts={facts} />

        <Text variant="titleMedium">{`Items (${sale.lines.length})`}</Text>
        <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
          {sale.lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <View style={styles.fill}>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {line.name}
                </Text>
                <Text variant="bodySmall" style={muted}>
                  {`${line.qty} × ${formatMoney(line.unit_price, currency)}${line.tax_rate > 0 ? ` · tax ${line.tax_rate}%` : ''}`}
                </Text>
              </View>
              <Text variant="bodyMedium">
                {formatMoney(line.line_total, currency)}
              </Text>
            </View>
          ))}
          <View style={[styles.rule, { backgroundColor: colors.onSurface }]} />
          <View style={styles.row}>
            {/* fill, so the total lines up under the line amounts at the right edge. */}
            <Text variant="titleMedium" style={styles.fill}>
              Total
            </Text>
            <Text variant="amount">{formatMoney(sale.total, currency)}</Text>
          </View>
          <Text variant="bodySmall" style={[styles.taxLine, muted]}>
            {`Includes tax ${formatMoney(sale.tax_total, currency)}`}
          </Text>
        </View>

        <Text variant="titleMedium">Stock drawn</Text>
        {sale.movements.length === 0 ? (
          <Text variant="bodyMedium" style={muted}>
            Nothing on this sale is counted in stock.
          </Text>
        ) : (
          <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
            {sale.movements.map((move) => (
              <View key={move.id} style={styles.row}>
                <View style={styles.fill}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {move.product?.name ?? 'Item no longer available'}
                  </Text>
                  <Text variant="bodySmall" style={muted}>
                    {`${MOVEMENT_KIND_LABEL[move.kind]} · ${move.pack?.code ?? 'no pack'}`}
                  </Text>
                </View>
                <Text variant="bodyMedium">
                  {`${move.qty > 0 ? '+' : ''}${move.qty} ${move.product?.base_unit_name ?? 'units'}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {voiding ? <VoidSaleDialog sale={sale} onDismiss={() => setVoiding(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  card: { gap: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingHorizontal: spacing.md },
  rule: { height: 1, marginHorizontal: spacing.md },
  taxLine: { paddingHorizontal: spacing.md },
});
