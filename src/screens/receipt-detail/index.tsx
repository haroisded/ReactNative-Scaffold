import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/activity-indicator';
import { Button } from '../../components/button';
import { displayDate } from '../../components/form-fields';
import { Icon } from '../../components/icon';
import { PageHeader } from '../../components/page-header';
import { Text } from '../../components/text';
import { VoidReceiptDialog } from '../../components/void-receipt-dialog';
import { RECEIPT_STATUS_LABEL, receiptStatus, receiptTotal, useStockReceiptQuery } from '../../features/stock-receipts/queries';
import type { ReceiptDetail } from '../../features/stock-receipts/queries';
import { useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = { currency: string; id: string };

type Lot = ReceiptDetail['lots'][number];

/**
 * One receipt, read-only (design.md §3: its quantities and costs are fixed once saved). Each line opens
 * onto its cases, and each case onto its packs. Void is here, and only while nothing has been drawn —
 * void_receipt refuses otherwise and the dialog says so.
 */
export function ReceiptDetailScreen({ currency, id }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const query = useStockReceiptQuery({ id });
  const [voiding, setVoiding] = useState(false);
  const receipt = query.data;

  if (!receipt) {
    return (
      <View style={styles.fill}>
        <PageHeader kicker="Stock" title="Receipt" onBack={() => router.back()} />
        <View style={styles.state}>
          {/* Paused before pending (instruction_mds/data-layer.md §5). */}
          {query.isPaused ? (
            <Text variant="bodyMedium">You&apos;re offline. This receipt will load when you reconnect.</Text>
          ) : query.isPending ? (
            <ActivityIndicator />
          ) : query.isError ? (
            <>
              <Text variant="bodyMedium">{failureMessage("Couldn't load this receipt. Try again.")}</Text>
              <Button onPress={() => query.refetch()}>Try again</Button>
            </>
          ) : (
            <Text variant="bodyMedium">This receipt is no longer available.</Text>
          )}
        </View>
      </View>
    );
  }

  const status = receiptStatus(receipt);
  const openVoid = () => {
    if (wide) setVoiding(true);
    else router.push({ pathname: '/sheets/void-receipt', params: { receiptId: receipt.id } });
  };
  const muted = { color: colors.onSurfaceMuted };
  const facts = [
    ['Supplier', receipt.supplier ? `${receipt.supplier.name} · ${receipt.supplier.code}` : 'Opening stock'],
    ['Received on', displayDate(receipt.received_on)],
    ['Invoice / DR', receipt.invoice_no],
    ['Received by', receipt.received_by],
    ['Location', receipt.location],
    ['Freight', receipt.freight > 0 ? formatMoney(receipt.freight, currency) : null],
    ['Total', formatMoney(receiptTotal(receipt), currency)],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={receipt.supplier ? 'Receipt' : 'Opening stock'}
        title={receipt.code}
        meta={RECEIPT_STATUS_LABEL[status]}
        onBack={() => router.back()}
        actions={
          receipt.voided_at ? null : (
            <Button mode="outlined" icon="close" textColor={colors.error} onPress={openVoid}>
              Void
            </Button>
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {receipt.voided_at ? (
          <View style={[styles.voided, { borderColor: colors.error }]}>
            <Text variant="titleMedium" style={{ color: colors.error }}>
              {`Voided ${displayDate(receipt.voided_at.slice(0, 10))}`}
            </Text>
            {receipt.void_reason ? <Text variant="bodyMedium">{receipt.void_reason}</Text> : null}
          </View>
        ) : null}

        <View style={styles.facts}>
          {facts.map(([label, value]) => (
            <View key={label} style={wide ? styles.factWide : styles.factNarrow}>
              <Text variant="labelMedium" style={muted}>
                {label}
              </Text>
              <Text variant="bodyMedium">{value}</Text>
            </View>
          ))}
        </View>
        {receipt.notes ? (
          <Text variant="bodyMedium" style={muted}>
            {receipt.notes}
          </Text>
        ) : null}

        <Text variant="titleMedium">{`Lines (${receipt.lots.length})`}</Text>
        {receipt.lots.map((lot) => (
          <LotCard key={lot.id} lot={lot} currency={currency} />
        ))}
      </ScrollView>

      {voiding ? <VoidReceiptDialog receipt={receipt} onDismiss={() => setVoiding(false)} /> : null}
    </View>
  );
}

/** A line: its lot, and under it the cases and the packs outside any case. */
function LotCard({ lot, currency }: { lot: Lot; currency: string }) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const base = lot.product?.base_unit_name ?? 'units';
  const pack = lot.product?.pack_unit_name ?? 'packs';
  const muted = { color: colors.onSurfaceMuted };
  const loosePacks = lot.packs.filter((row) => row.case_id === null);
  const received = lot.cases.length > 0 ? `${lot.cases.length} cases × ${lot.packs_per_case} ${pack}` : `${lot.packs_received} ${pack}`;
  const summary = [
    lot.loose_units ? `${received} + ${lot.loose_units} ${base}` : received,
    lot.expires_on ? `expires ${displayDate(lot.expires_on)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const hasChildren = lot.cases.length > 0 || lot.packs.length > 0;

  return (
    <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        disabled={!hasChildren}
        android_ripple={{ color: colors.ripple }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${lot.product?.name ?? 'Item'}, lot ${lot.code}`}
        style={styles.cardHead}
      >
        {hasChildren ? <Icon source={open ? 'chevron-down' : 'chevron-right'} size={20} color={colors.onSurfaceMuted} /> : null}
        <View style={styles.fill}>
          <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {lot.product?.name ?? 'Item no longer available'}
          </Text>
          <Text variant="bodySmall" numberOfLines={2} maxFontSizeMultiplier={1.3} style={muted}>
            {`${lot.code} · ${summary}`}
          </Text>
          <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={muted}>
            {`${lot.qty_remaining} of ${lot.qty_received ?? 0} ${base} left`}
          </Text>
        </View>
        <View style={styles.money}>
          <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
            {formatMoney(lot.line_cost, currency)}
          </Text>
          {lot.freight_share ? (
            <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={muted}>
              {`+ ${formatMoney(lot.freight_share, currency)} freight`}
            </Text>
          ) : null}
          <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={muted}>
            {`${formatMoney(lot.unit_cost, currency)} / ${base}`}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.children, { borderTopColor: colors.outlineVariant }]}>
          {lot.cases.map((row) => (
            <CaseRow key={row.id} code={row.code} left={`${row.qty_remaining} ${base} left`} packs={lot.packs.filter((entry) => entry.case_id === row.id)} base={base} />
          ))}
          {loosePacks.map((row) => (
            <PackRow key={row.id} pack={row} base={base} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CaseRow({ code, left, packs, base }: { code: string; left: string; packs: Lot['packs']; base: string }) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        disabled={packs.length === 0}
        android_ripple={{ color: colors.ripple }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Case ${code}`}
        style={styles.childRow}
      >
        {packs.length > 0 ? <Icon source={open ? 'chevron-down' : 'chevron-right'} size={18} color={colors.onSurfaceMuted} /> : null}
        <Text variant="bodyMedium" style={styles.fill} maxFontSizeMultiplier={1.3}>
          {code}
        </Text>
        <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {left}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.nested}>
          {packs.map((row) => (
            <PackRow key={row.id} pack={row} base={base} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PackRow({ pack, base }: { pack: Lot['packs'][number]; base: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.childRow}>
      <Text variant="bodyMedium" style={styles.fill} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {pack.serial ? `${pack.code} · ${pack.serial}` : pack.code}
      </Text>
      <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
        {`${pack.qty_remaining} of ${pack.units} ${base}${pack.opened_at ? ' · open' : ''}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  voided: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.ms },
  factWide: { width: '33%', gap: spacing.xs, paddingRight: spacing.md },
  factNarrow: { width: '50%', gap: spacing.xs, paddingRight: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, padding: spacing.md },
  money: { alignItems: 'flex-end', gap: spacing.xs },
  children: { borderTopWidth: 1, paddingVertical: spacing.xs },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  nested: { paddingLeft: spacing.lg },
});
