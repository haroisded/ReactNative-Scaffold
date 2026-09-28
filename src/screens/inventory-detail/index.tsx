import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/activity-indicator';
import { useArchiveUndo } from '../../components/archive-undo';
import { Button } from '../../components/button';
import { displayDate } from '../../components/form-fields';
import { IconButton } from '../../components/icon-button';
import { Menu } from '../../components/menu';
import { PageHeader } from '../../components/page-header';
import { ExpiryBadge, LowStockBadge, NeedsPriceBadge, StatusText, StockRoleBadge } from '../../components/product-badges';
import { StockMovementDialog } from '../../components/stock-movement-dialog';
import { Switch } from '../../components/switch';
import { Text } from '../../components/text';
import type { ProductDetail } from '../../features/products/queries';
import { RESOURCE_ROUTE } from '../../features/products/resources';
import { expiryState, packsAndLoose } from '../../features/products/stock-item';
import { MOVEMENT_KIND_LABEL, useItemStockQuery, useMovementHistoryQuery } from '../../features/stock-movements/queries';
import type { MovementRow, MovementTarget } from '../../features/stock-movements/queries';
import type { ManualMovementKind } from '../../features/stock-movements/schema';
import { localToday } from '../../features/stock-receipts/schema';
import { useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = {
  merchantId: string;
  product: ProductDetail;
  /** Set when this is the tablet list's second pane: there is nothing to go back to. */
  embedded?: boolean;
};

type Moving = { target: MovementTarget; kind: ManualMovementKind };

/**
 * One Inventory item and where its stock sits (design.md §6): the lots it arrived in, their cases, the
 * packs already opened, and every movement. Each row adjusts, writes off or returns through
 * record_stock_movement; nothing here edits a count directly. Stock only arrives through a receipt.
 */
export function InventoryDetail({ merchantId, product, embedded }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const stock = useItemStockQuery({ productId: product.id });
  const history = useMovementHistoryQuery({ productId: product.id });
  const { archive, restore, snackbar } = useArchiveUndo();
  const [moving, setMoving] = useState<Moving | null>(null);
  const [showEmpty, setShowEmpty] = useState(false);

  const route = RESOURCE_ROUTE.inventory;
  const base = product.base_unit_name ?? 'units';
  const perPack = product.conversion_factor ?? 1;
  const today = localToday();
  const muted = { color: colors.onSurfaceMuted };
  const archived = product.status === 'archived';
  const target = [{ id: product.id, name: product.name, status: product.status }];
  const toggleArchive = () => (archived ? restore(target) : archive(target));
  const edit = () => router.push({ pathname: route.edit, params: { id: merchantId, productId: product.id } });

  const move = (next: Moving) => {
    if (wide) {
      setMoving(next);
      return;
    }
    router.push({ pathname: '/sheets/stock-movement', params: { productId: product.id, kind: next.kind, ...next.target } });
  };

  const lots = stock.data ?? [];
  const shownLots = showEmpty ? lots : lots.filter((lot) => lot.qty_remaining > 0);
  const cases = shownLots.flatMap((lot) =>
    lot.cases.filter((row) => showEmpty || row.qty_remaining > 0).map((row) => ({ row, lot }))
  );
  // A serial item moves one pack at a time (stock_target_pack_required), so every pack is listed;
  // otherwise only the opened ones — a sealed pack is counted in its case or lot.
  const packs = shownLots.flatMap((lot) =>
    lot.packs
      .filter((row) => (product.serial_tracked || row.opened_at !== null) && (showEmpty || row.qty_remaining > 0))
      .map((row) => ({ row, lot }))
  );
  const hidden = lots.length - shownLots.length;

  const facts = [
    ['SKU', product.sku],
    ['Barcode', product.barcode],
    ['Variant', product.attributes.length > 0 ? product.attributes.join(' · ') : null],
    ['Per pack', perPack > 1 ? `1 ${product.pack_unit_name ?? 'pack'} = ${perPack} ${base}` : null],
    ['Reorder at', product.reorder_threshold === null ? null : `${product.reorder_threshold} ${base}`],
    ['Location', product.storage_location],
    ['Expiry alert', product.expiry_alert_days === null ? null : `${product.expiry_alert_days} days before`],
    ['Serial numbers', product.serial_tracked ? 'Tracked per pack' : null],
    ['Category', [product.category?.name, product.subcategory?.name].filter(Boolean).join(' › ') || null],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker="Inventory item"
        title={product.name}
        onBack={embedded ? undefined : () => router.back()}
        actions={
          wide ? (
            <>
              <Button mode="outlined" icon={archived ? 'restore' : 'archive'} onPress={toggleArchive}>
                {archived ? 'Restore' : 'Archive'}
              </Button>
              <Button mode="contained" icon="edit" onPress={edit}>
                Edit
              </Button>
            </>
          ) : (
            <>
              <IconButton
                icon={archived ? 'restore' : 'archive'}
                onPress={toggleArchive}
                accessibilityLabel={archived ? 'Restore' : 'Archive'}
                style={styles.headerIcon}
              />
              <IconButton icon="edit" onPress={edit} accessibilityLabel="Edit" style={styles.headerIcon} />
            </>
          )
        }
      />

      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <View style={styles.badges}>
          {product.stock_role ? <StockRoleBadge role={product.stock_role} /> : null}
          <StatusText status={product.status} />
          {product.is_low_stock ? <LowStockBadge /> : null}
          <NeedsPriceBadge product={product} />
        </View>
        <View>
          <Text variant="headlineSmall">{packsAndLoose(product.qty_on_hand ?? 0, perPack, product.pack_unit_name, base)}</Text>
          {perPack > 1 ? (
            <Text variant="bodyMedium" style={muted}>
              {`${product.qty_on_hand ?? 0} ${base} on hand`}
            </Text>
          ) : null}
        </View>
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

        {!stock.data ? (
          <View style={styles.state}>
            {/* Paused before pending (instruction_mds/data-layer.md §5). */}
            {stock.isPaused ? (
              <Text variant="bodyMedium">You&apos;re offline. Stock will load when you reconnect.</Text>
            ) : stock.isPending ? (
              <ActivityIndicator />
            ) : (
              <>
                <Text variant="bodyMedium">{failureMessage("Couldn't load this item's stock. Try again.")}</Text>
                <Button onPress={() => stock.refetch()}>Try again</Button>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.sectionHead}>
              <Text variant="titleMedium" style={styles.fill}>{`Lots (${shownLots.length})`}</Text>
              <Switch value={showEmpty} onValueChange={setShowEmpty} color={colors.accent} accessibilityLabel="Show empty" />
              <Text variant="bodyMedium">Show empty</Text>
            </View>
            {shownLots.length === 0 ? (
              <Text variant="bodyMedium" style={muted}>
                {hidden > 0 ? 'Every lot is used up.' : 'No stock yet. It arrives through a receipt on the Stock screen.'}
              </Text>
            ) : (
              <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
                {shownLots.map((lot) => (
                  <StockRow
                    key={lot.id}
                    title={lot.code}
                    detail={[
                      lot.receipt.supplier_id ? lot.receipt.code : `${lot.receipt.code} · opening stock`,
                      `received ${displayDate(lot.receipt.received_on)}`,
                      lot.expires_on ? `expires ${displayDate(lot.expires_on)}` : null,
                    ]}
                    amount={`${lot.qty_remaining} ${base}`}
                    expiry={expiryState(lot.expires_on, product.expiry_alert_days, today)}
                    // A serial item's lot cannot be moved as a whole; its packs can. Nor can the units already
                    // in a case or pack (stock_target_too_high): the lot offers only what sits outside them.
                    actions={product.serial_tracked || unassigned(lot) <= 0 ? null : { lotId: lot.id }}
                    returnable={lot.receipt.supplier_id !== null}
                    onMove={move}
                  />
                ))}
              </View>
            )}

            {cases.length > 0 ? (
              <>
                <Text variant="titleMedium">{`Cases (${cases.length})`}</Text>
                <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
                  {cases.map(({ row, lot }) => (
                    <StockRow
                      key={row.id}
                      title={row.code}
                      detail={[`lot ${lot.code}`]}
                      amount={`${row.qty_remaining} ${base}`}
                      expiry={expiryState(lot.expires_on, product.expiry_alert_days, today)}
                      actions={product.serial_tracked || row.qty_remaining === 0 ? null : { caseId: row.id }}
                      returnable={lot.receipt.supplier_id !== null}
                      onMove={move}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {packs.length > 0 ? (
              <>
                <Text variant="titleMedium">{`${product.serial_tracked ? 'Packs' : 'Open packs'} (${packs.length})`}</Text>
                <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
                  {packs.map(({ row, lot }) => (
                    <StockRow
                      key={row.id}
                      title={row.serial ? `${row.code} · ${row.serial}` : row.code}
                      detail={[`lot ${lot.code}`, row.opened_at ? `opened ${displayDate(row.opened_at.slice(0, 10))}` : 'sealed']}
                      amount={`${row.qty_remaining} of ${row.units} ${base}`}
                      expiry={expiryState(lot.expires_on, product.expiry_alert_days, today)}
                      actions={row.qty_remaining === 0 ? null : { packId: row.id }}
                      returnable={lot.receipt.supplier_id !== null}
                      onMove={move}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}

        <Text variant="titleMedium">History</Text>
        {history.data ? (
          history.data.length === 0 ? (
            <Text variant="bodyMedium" style={muted}>
              Nothing has moved yet.
            </Text>
          ) : (
            <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
              {history.data.map((row) => (
                <HistoryRow key={row.id} row={row} base={base} />
              ))}
            </View>
          )
        ) : history.isPaused ? (
          <Text variant="bodyMedium">You&apos;re offline. History will load when you reconnect.</Text>
        ) : history.isPending ? (
          <ActivityIndicator />
        ) : (
          <Text variant="bodyMedium">{failureMessage("Couldn't load the history. Try again.")}</Text>
        )}
      </ScrollView>

      {moving ? (
        <StockMovementDialog productId={product.id} target={moving.target} kind={moving.kind} onDismiss={() => setMoving(null)} />
      ) : null}
      {snackbar}
    </View>
  );
}

/** What a lot holds outside its cases and loose packs — the part a movement on the lot itself can take. */
const unassigned = (lot: NonNullable<ReturnType<typeof useItemStockQuery>['data']>[number]) =>
  lot.qty_remaining -
  lot.cases.reduce((sum, row) => sum + row.qty_remaining, 0) -
  lot.packs.filter((row) => row.case_id === null).reduce((sum, row) => sum + row.qty_remaining, 0);

/** A lot, case or pack, with the three movements in a menu. `actions` null: nothing left to move here. */
function StockRow({
  title,
  detail,
  amount,
  expiry,
  actions,
  returnable,
  onMove,
}: {
  title: string;
  detail: (string | null)[];
  amount: string;
  expiry: ReturnType<typeof expiryState>;
  actions: MovementTarget | null;
  returnable: boolean;
  onMove: (moving: Moving) => void;
}) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const pick = (kind: ManualMovementKind) => {
    setOpen(false);
    if (actions) onMove({ target: actions, kind });
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceVariant }]}>
      <View style={styles.fill}>
        <View style={styles.rowTitle}>
          <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          <ExpiryBadge state={expiry} />
        </View>
        <Text variant="bodySmall" numberOfLines={2} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {detail.filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
        {amount}
      </Text>
      {actions ? (
        <Menu
          visible={open}
          onDismiss={() => setOpen(false)}
          anchor={<IconButton icon="more" size={20} onPress={() => setOpen(true)} accessibilityLabel={`Actions for ${title}`} />}
        >
          <Menu.Item title="Adjust count" onPress={() => pick('adjust')} />
          <Menu.Item title="Write off" onPress={() => pick('write_off')} />
          {/* Opening stock has no supplier to go back to (receipt_has_no_supplier). */}
          <Menu.Item title="Return to supplier" disabled={!returnable} onPress={() => pick('return_supplier')} />
        </Menu>
      ) : (
        <View style={styles.menuSpace} />
      )}
    </View>
  );
}

function HistoryRow({ row, base }: { row: MovementRow; base: string }) {
  const { colors } = useAppTheme();
  const where = row.pack ? (row.pack.serial ? `${row.pack.code} · ${row.pack.serial}` : row.pack.code) : (row.case?.code ?? row.lot?.code);
  const when = new Date(row.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceVariant }]}>
      <View style={styles.fill}>
        <Text variant="titleMedium" maxFontSizeMultiplier={1.3}>
          {row.override ? `${MOVEMENT_KIND_LABEL[row.kind]} · override` : MOVEMENT_KIND_LABEL[row.kind]}
        </Text>
        <Text variant="bodySmall" numberOfLines={3} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {[when, where, row.ref, row.reason, row.note].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="bodyMedium" maxFontSizeMultiplier={1.3} style={{ color: row.qty < 0 ? colors.error : colors.onSurface }}>
        {`${row.qty > 0 ? '+' : '−'}${Math.abs(row.qty)} ${base}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerIcon: { margin: 0 },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.ms },
  factWide: { width: '33%', gap: spacing.xs, paddingRight: spacing.md },
  factNarrow: { width: '50%', gap: spacing.xs, paddingRight: spacing.md },
  state: { gap: spacing.ms, alignItems: 'flex-start' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  rowTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  // The width of the 20dp IconButton a row without actions leaves out, so amounts stay aligned.
  menuSpace: { width: 44 },
});
