import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ArchiveButton, useArchiveUndo } from '../../components/archive-undo';
import { Button } from '../../components/button';
import { FactGrid } from '../../components/fact-grid';
import type { Fact } from '../../components/fact-grid';
import { displayDate } from '../../components/form-fields';
import { IconButton } from '../../components/icon-button';
import { Menu } from '../../components/menu';
import { PageHeader } from '../../components/page-header';
import { QueryState } from '../../components/query-state';
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
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = {
  merchantId: string;
  product: ProductDetail;
  /** Set when this is the tablet list's second pane: there is nothing to go back to. */
  embedded?: boolean;
};

type Moving = { target: MovementTarget; kind: ManualMovementKind };

type Lot = NonNullable<ReturnType<typeof useItemStockQuery>['data']>[number];

/**
 * One Inventory item and where its stock sits (design.md §6): the lots it arrived in, their cases, the
 * packs already opened, and every movement. Each row adjusts, writes off or returns through
 * record_stock_movement; nothing here edits a count directly. Stock only arrives through a receipt.
 */
export function InventoryDetail({ merchantId, product, embedded }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const { toggle, snackbar } = useArchiveUndo();
  const [moving, setMoving] = useState<Moving | null>(null);

  const base = product.base_unit_name ?? 'units';
  const perPack = product.conversion_factor ?? 1;
  const toggleArchive = () => toggle(product);
  const edit = () => router.push({ pathname: RESOURCE_ROUTE.inventory.edit, params: { id: merchantId, productId: product.id } });
  const move = (next: Moving) => {
    if (wide) setMoving(next);
    else router.push({ pathname: '/sheets/stock-movement', params: { productId: product.id, kind: next.kind, ...next.target } });
  };

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker="Inventory item"
        title={product.name}
        onBack={embedded ? undefined : () => router.back()}
        actions={
          wide ? (
            <>
              <ArchiveButton status={product.status} onPress={toggleArchive} />
              <Button mode="contained" icon="edit" onPress={edit}>
                Edit
              </Button>
            </>
          ) : (
            <>
              <ArchiveButton status={product.status} onPress={toggleArchive} compact style={styles.headerIcon} />
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
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
              {`${product.qty_on_hand ?? 0} ${base} on hand`}
            </Text>
          ) : null}
        </View>
        <FactGrid facts={itemFacts(product, base, perPack)} />
        <StockSection product={product} base={base} onMove={move} />
        <HistorySection productId={product.id} base={base} />
      </ScrollView>

      {moving ? (
        <StockMovementDialog productId={product.id} target={moving.target} kind={moving.kind} onDismiss={() => setMoving(null)} />
      ) : null}
      {snackbar}
    </View>
  );
}

function itemFacts(product: ProductDetail, base: string, perPack: number): Fact[] {
  return [
    ['SKU', product.sku],
    ['Barcode', product.barcode],
    ['Variant', product.attributes.join(' · ')],
    ['Per pack', perPack > 1 ? `1 ${product.pack_unit_name ?? 'pack'} = ${perPack} ${base}` : null],
    ['Reorder at', product.reorder_threshold === null ? null : `${product.reorder_threshold} ${base}`],
    ['Location', product.storage_location],
    ['Expiry alert', product.expiry_alert_days === null ? null : `${product.expiry_alert_days} days before`],
    ['Serial numbers', product.serial_tracked ? 'Tracked per pack' : null],
    ['Category', [product.category?.name, product.subcategory?.name].filter(Boolean).join(' › ')],
  ];
}

type SectionProps = { product: ProductDetail; base: string; onMove: (moving: Moving) => void };

/** The item's lots, then the cases and packs inside them — each row a place a movement can start. */
function StockSection({ product, base, onMove }: SectionProps) {
  const stock = useItemStockQuery({ productId: product.id });

  if (!stock.data) {
    return (
      <View style={styles.state}>
        <QueryState
          query={stock}
          offline="You're offline. Stock will load when you reconnect."
          failure="Couldn't load this item's stock. Try again."
        />
      </View>
    );
  }
  return <StockLists product={product} base={base} onMove={onMove} lots={stock.data} />;
}

function StockLists({ product, base, onMove, lots }: SectionProps & { lots: Lot[] }) {
  const { colors } = useAppTheme();
  const [showEmpty, setShowEmpty] = useState(false);
  const today = localToday();
  const expiry = (lot: Lot) => expiryState(lot.expires_on, product.expiry_alert_days, today);
  const kept = (row: { qty_remaining: number }) => showEmpty || row.qty_remaining > 0;

  const shownLots = lots.filter(kept);
  const cases = shownLots.flatMap((lot) => lot.cases.filter(kept).map((row) => ({ row, lot })));
  // A serial item moves one pack at a time (stock_target_pack_required), so every pack is listed;
  // otherwise only the opened ones — a sealed pack is counted in its case or lot.
  const packs = shownLots.flatMap((lot) =>
    lot.packs.filter((row) => (product.serial_tracked || row.opened_at !== null) && kept(row)).map((row) => ({ row, lot }))
  );

  return (
    <>
      <View style={styles.sectionHead}>
        <Text variant="titleMedium" style={styles.fill}>{`Lots (${shownLots.length})`}</Text>
        <Switch value={showEmpty} onValueChange={setShowEmpty} color={colors.accent} accessibilityLabel="Show empty" />
        <Text variant="bodyMedium">Show empty</Text>
      </View>
      {shownLots.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
          {lots.length > 0 ? 'Every lot is used up.' : 'No stock yet. It arrives through a receipt on the Stock screen.'}
        </Text>
      ) : (
        <StockCard>
          {shownLots.map((lot) => (
            <StockRow
              key={lot.id}
              title={lot.code}
              detail={lotDetail(lot)}
              amount={`${lot.qty_remaining} ${base}`}
              expiry={expiry(lot)}
              // A serial item's lot cannot be moved as a whole; its packs can. Nor can the units already
              // in a case or pack (stock_target_too_high): the lot offers only what sits outside them.
              actions={product.serial_tracked || unassigned(lot) <= 0 ? null : { lotId: lot.id }}
              returnable={lot.receipt.supplier_id !== null}
              onMove={onMove}
            />
          ))}
        </StockCard>
      )}

      <StockCard title={`Cases (${cases.length})`} hidden={cases.length === 0}>
        {cases.map(({ row, lot }) => (
          <StockRow
            key={row.id}
            title={row.code}
            detail={[`lot ${lot.code}`]}
            amount={`${row.qty_remaining} ${base}`}
            expiry={expiry(lot)}
            actions={product.serial_tracked || row.qty_remaining === 0 ? null : { caseId: row.id }}
            returnable={lot.receipt.supplier_id !== null}
            onMove={onMove}
          />
        ))}
      </StockCard>

      <StockCard title={`${product.serial_tracked ? 'Packs' : 'Open packs'} (${packs.length})`} hidden={packs.length === 0}>
        {packs.map(({ row, lot }) => (
          <StockRow
            key={row.id}
            title={row.serial ? `${row.code} · ${row.serial}` : row.code}
            detail={[`lot ${lot.code}`, row.opened_at ? `opened ${displayDate(row.opened_at.slice(0, 10))}` : 'sealed']}
            amount={`${row.qty_remaining} of ${row.units} ${base}`}
            expiry={expiry(lot)}
            actions={row.qty_remaining === 0 ? null : { packId: row.id }}
            returnable={lot.receipt.supplier_id !== null}
            onMove={onMove}
          />
        ))}
      </StockCard>
    </>
  );
}

/** An outlined list of rows, under its heading when it has one. */
function StockCard({ title, hidden, children }: { title?: string; hidden?: boolean; children: ReactNode }) {
  const { colors } = useAppTheme();
  if (hidden) return null;

  return (
    <>
      {title ? <Text variant="titleMedium">{title}</Text> : null}
      <View style={[styles.card, { borderColor: colors.outlineVariant }]}>{children}</View>
    </>
  );
}

function HistorySection({ productId, base }: { productId: string; base: string }) {
  const { colors } = useAppTheme();
  const history = useMovementHistoryQuery({ productId });

  return (
    <>
      <Text variant="titleMedium">History</Text>
      {history.data ? null : (
        <View style={styles.state}>
          <QueryState
            query={history}
            offline="You're offline. History will load when you reconnect."
            failure="Couldn't load the history. Try again."
          />
        </View>
      )}
      {history.data?.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
          Nothing has moved yet.
        </Text>
      ) : null}
      <StockCard hidden={!history.data?.length}>
        {history.data?.map((row) => (
          <HistoryRow key={row.id} row={row} base={base} />
        ))}
      </StockCard>
    </>
  );
}

/** "R-0012 · received 3 Sep 2026 · expires 1 Oct 2026" */
function lotDetail(lot: Lot) {
  return [
    lot.receipt.supplier_id ? lot.receipt.code : `${lot.receipt.code} · opening stock`,
    `received ${displayDate(lot.receipt.received_on)}`,
    lot.expires_on ? `expires ${displayDate(lot.expires_on)}` : null,
  ];
}

/** What a lot holds outside its cases and loose packs — the part a movement on the lot itself can take. */
const unassigned = (lot: Lot) =>
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
