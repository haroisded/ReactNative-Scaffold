import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ArchiveButton, useArchiveUndo } from '../../components/archive-undo';
import { Button } from '../../components/button';
import { FactGrid } from '../../components/fact-grid';
import type { Fact } from '../../components/fact-grid';
import { IconButton } from '../../components/icon-button';
import { LotDrill } from '../../components/lot-drill';
import { Menu } from '../../components/menu';
import { PageHeader } from '../../components/page-header';
import { LowStockBadge, StatusText, StockRoleBadge } from '../../components/product-badges';
import { QueryState } from '../../components/query-state';
import { Switch } from '../../components/switch';
import { Text } from '../../components/text';
import { useItemFacesQuery } from '../../features/products/queries';
import type { ProductDetail } from '../../features/products/queries';
import { RESOURCE_ROUTE } from '../../features/products/resources';
import { STATUS_META } from '../../features/products/schema';
import { SELL_BY_LABEL, packsAndLoose } from '../../features/products/stock-item';
import { MOVEMENT_KIND_LABEL, useItemStockQuery, useMovementHistoryQuery } from '../../features/stock-movements/queries';
import type { MovementRow, StockLot, StockPack } from '../../features/stock-movements/queries';
import type { ManualMovementKind } from '../../features/stock-movements/schema';
import { useShellWide } from '../../lib/columns';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = {
  merchantId: string;
  product: ProductDetail;
  currency: string;
  /** Set when this is the tablet list's second pane: there is nothing to go back to. */
  embedded?: boolean;
  /** Closes the second pane, handing the list its full width back. */
  onClose?: () => void;
};

type Moving = { packId: string; kind: ManualMovementKind };

/**
 * One Inventory item: what it is, where its stock sits — lot by lot, pack by pack, with the next pick
 * marked — how it is sold on the Products screen, and everything that has moved. Adjust, write off and
 * return start from a pack's menu.
 */
export function InventoryDetail({ merchantId, product, currency, embedded, onClose }: Props) {
  const wide = useShellWide();
  const { toggle, snackbar } = useArchiveUndo();

  const base = product.base_unit_name ?? product.pack_unit_name ?? 'units';
  const perPack = product.conversion_factor ?? 1;
  const edit = () => router.push({ pathname: RESOURCE_ROUTE.inventory.edit, params: { id: merchantId, productId: product.id } });
  // A full-page form at every width (instruction_mds/visual-language.md §5).
  const move = (next: Moving) =>
    router.push({ pathname: '/forms/stock-movement', params: { productId: product.id, kind: next.kind, packId: next.packId } });

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker="Inventory item"
        title={product.name}
        onBack={embedded ? onClose : () => router.back()}
        actions={<HeaderActions wide={wide} product={product} onArchive={() => toggle(product)} onEdit={edit} />}
      />

      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <View style={styles.badges}>
          {product.stock_role ? <StockRoleBadge role={product.stock_role} /> : null}
          <StatusText status={product.status} />
          {product.is_low_stock ? <LowStockBadge /> : null}
        </View>
        <OnHand product={product} base={base} currency={currency} />
        <FactGrid facts={itemFacts(product, base, perPack)} />
        <FacesSection merchantId={merchantId} product={product} currency={currency} />
        <StockSection product={product} base={base} currency={currency} onMove={move} />
        <HistorySection productId={product.id} base={base} />
      </ScrollView>

      {snackbar}
    </View>
  );
}

type HeaderActionsProps = { wide: boolean; product: ProductDetail; onArchive: () => void; onEdit: () => void };

function HeaderActions({ wide, product, onArchive, onEdit }: HeaderActionsProps) {
  if (wide) {
    return (
      <>
        <ArchiveButton status={product.status} onPress={onArchive} />
        <Button mode="contained" icon="edit" onPress={onEdit}>
          Edit
        </Button>
      </>
    );
  }
  return (
    <>
      <ArchiveButton status={product.status} onPress={onArchive} compact style={styles.headerIcon} />
      <IconButton icon="edit" onPress={onEdit} accessibilityLabel="Edit" style={styles.headerIcon} />
    </>
  );
}

/** "9 cups + 7 tablets", then the base-unit total, average cost and value. */
function OnHand({ product, base, currency }: { product: ProductDetail; base: string; currency: string }) {
  const { colors } = useAppTheme();
  const qty = product.qty_on_hand ?? 0;
  const perPack = product.conversion_factor ?? 1;
  const cost = product.cost_price;
  return (
    <View>
      <Text variant="headlineSmall">{packsAndLoose(qty, perPack, product.pack_unit_name, base)}</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
        {[
          perPack > 1 ? `${qty} ${base} on hand` : null,
          cost === null ? null : `${formatMoney(cost, currency)}/${base} avg`,
          cost === null ? null : `value ${formatMoney(qty * cost, currency)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}

function itemFacts(product: ProductDetail, base: string, perPack: number): Fact[] {
  return [
    ['SKU', product.sku],
    ['Barcode', product.barcode],
    ['Variant', product.attributes.join(' · ')],
    ['Sell by', product.sell_by ? SELL_BY_LABEL[product.sell_by] : null],
    ['Pack unit', product.pack_unit_name],
    ['Per pack', perPack > 1 ? `1 ${product.pack_unit_name ?? 'pack'} = ${perPack} ${base}` : null],
    ['Reorder at', product.reorder_threshold === null ? null : `${product.reorder_threshold} ${base}`],
    ['Location', product.storage_location],
    ['Expiry', product.perishable ? 'Has an expiration date' : 'Does not expire'],
    ['Expiry alert', product.expiry_alert_days === null ? null : `${product.expiry_alert_days} days before`],
    ['Category', [product.category?.name, product.subcategory?.name].filter(Boolean).join(' › ')],
    ['Notes', product.internal_notes],
  ];
}

/**
 * "Selling as": the item's drafts on the Assets screen, one per Sell By unit. A draft needs a price
 * before the Register can sell it.
 */
function FacesSection({ merchantId, product, currency }: { merchantId: string; product: ProductDetail; currency: string }) {
  const { colors } = useAppTheme();
  const faces = useItemFacesQuery({ itemId: product.id });
  if (product.stock_role === 'component' || !faces.data) return null;

  return (
    <>
      <Text variant="titleMedium">Selling as</Text>
      {faces.data.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
          No asset yet. Use Add from Inventory on the Assets screen to make one.
        </Text>
      ) : (
        <Card>
          {faces.data.map((face) => (
            <Pressable
              key={face.id}
              // withAnchor: another destination, so its list goes under the detail (products/_layout.tsx).
              onPress={() =>
                router.push({ pathname: RESOURCE_ROUTE.products.detail, params: { id: merchantId, productId: face.id } }, { withAnchor: true })
              }
              // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §4).
              android_ripple={{ color: colors.ripple }}
              accessibilityRole="button"
              accessibilityLabel={`Open ${face.name}`}
              style={[styles.row, { borderBottomColor: colors.surfaceVariant }]}
            >
              <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.fill}>
                {face.name}
              </Text>
              <Text variant="labelMedium" maxFontSizeMultiplier={1.3} style={{ color: face.selling_price === null ? colors.error : colors[STATUS_META[face.status].tone] }}>
                {face.selling_price === null ? 'Needs price' : `${STATUS_META[face.status].label} · ${formatMoney(face.selling_price, currency)}`}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}
    </>
  );
}

type StockProps = { product: ProductDetail; base: string; currency: string; onMove: (moving: Moving) => void };

/** The item's lots and packs, each live pack with its menu. */
function StockSection({ product, base, currency, onMove }: StockProps) {
  const { colors } = useAppTheme();
  const stock = useItemStockQuery({ productId: product.id });
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <>
      <View style={styles.sectionHead}>
        <Text variant="titleMedium" style={styles.fill}>
          {`Lots (${stock.data?.lots.length ?? 0})`}
        </Text>
        <Switch value={showEmpty} onValueChange={setShowEmpty} color={colors.accent} accessibilityLabel="Show empty packs" />
        <Text variant="bodyMedium">Show empty packs</Text>
      </View>
      {stock.data ? (
        <LotDrill
          lots={stock.data.lots}
          nextPick={product.sell_by === 'pack' ? stock.data.nextPick.pack : stock.data.nextPick.base}
          unit={base}
          currency={currency}
          expiryAlertDays={product.expiry_alert_days}
          showEmpty={showEmpty}
          packAction={(pack, lot) => <PackMenu pack={pack} lot={lot} onMove={onMove} />}
        />
      ) : (
        <View style={styles.state}>
          <QueryState query={stock} offline="You're offline. Stock will load when you reconnect." failure="Couldn't load this item's stock. Try again." />
        </View>
      )}
    </>
  );
}

function PackMenu({ pack, lot, onMove }: { pack: StockPack; lot: StockLot; onMove: (moving: Moving) => void }) {
  const [open, setOpen] = useState(false);
  const pick = (kind: ManualMovementKind) => {
    setOpen(false);
    onMove({ packId: pack.id, kind });
  };
  if (lot.receipt?.voided_at) return null;

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<IconButton icon="more" size={20} onPress={() => setOpen(true)} accessibilityLabel={`Actions for ${pack.code}`} style={styles.menuButton} />}
    >
      <Menu.Item title="Adjust count" onPress={() => pick('adjust')} />
      <Menu.Item title="Write off" disabled={pack.qty_remaining === 0} onPress={() => pick('write_off')} />
      {/* Stock added in Inventory has no supplier to go back to (receipt_has_no_supplier). */}
      <Menu.Item title="Return to supplier" disabled={lot.source !== 'stock' || pack.qty_remaining === 0} onPress={() => pick('return_supplier')} />
    </Menu>
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
          <QueryState query={history} offline="You're offline. History will load when you reconnect." failure="Couldn't load the history. Try again." />
        </View>
      )}
      {history.data?.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
          Nothing has moved yet.
        </Text>
      ) : null}
      {history.data?.length ? (
        <Card>
          {history.data.map((row) => (
            <HistoryRow key={row.id} row={row} base={base} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function Card({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { borderColor: colors.outlineVariant }]}>{children}</View>;
}

function HistoryRow({ row, base }: { row: MovementRow; base: string }) {
  const { colors } = useAppTheme();
  const where = row.pack ? (row.pack.serial ? `${row.pack.code} · ${row.pack.serial}` : row.pack.code) : row.lot?.code;
  const when = new Date(row.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceVariant }]}>
      <View style={styles.fill}>
        <Text variant="titleMedium" maxFontSizeMultiplier={1.3}>
          {MOVEMENT_KIND_LABEL[row.kind]}
        </Text>
        <Text variant="bodySmall" numberOfLines={3} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {[when, where, row.lot?.location, row.ref, row.reason, row.note].filter(Boolean).join(' · ')}
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
  // IconButton ships a 6dp margin of its own; zeroed so the header's gap is the only spacing.
  headerIcon: { margin: 0 },
  menuButton: { margin: 0 },
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
