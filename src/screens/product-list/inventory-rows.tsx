import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/activity-indicator';
import { Button } from '../../components/button';
import { Checkbox } from '../../components/checkbox';
import { Chip } from '../../components/chip';
import { IconButton } from '../../components/icon-button';
import { LotDrill } from '../../components/lot-drill';
import { Menu } from '../../components/menu';
import { ExpiryBadge, LowStockBadge, StatusText, StockRoleBadge } from '../../components/product-badges';
import { QueryState } from '../../components/query-state';
import { Text } from '../../components/text';
import { useSetStockRoleMutation } from '../../features/products/queries';
import type { ProductListRow } from '../../features/products/queries';
import { STOCK_ROLE_LABEL, expiryState, stockRole } from '../../features/products/stock-item';
import { useItemStockQuery } from '../../features/stock-movements/queries';
import { failureMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import type { InventorySource } from '../../Store/list-filters';
import { spacing } from '../../themes';

// The Inventory screen's rows (.claude/inventory-stock/Inventory.html): live counts per item in its base
// unit, how many packs and how many open, its type — changed right here — cost and value, and a drill
// down to lot and individual pack. The folders around them are src/features/products/folders.ts.

/** Received via Stock once any of its stock came on a receipt; otherwise it was added in Inventory. */
export function itemSource(item: ProductListRow): Exclude<InventorySource, 'all'> {
  return item.lots.some((lot) => lot.source === 'stock') ? 'stock' : 'inventory';
}

/** The worst expiry among the lots that still hold a pack: one expired lot makes the item Expired. */
function itemExpiry(item: ProductListRow, today: string) {
  const live = new Set(item.packs.map((pack) => pack.lot_id));
  const states = item.lots.filter((lot) => live.has(lot.id)).map((lot) => expiryState(lot.expires_on, item.expiry_alert_on, today));
  return states.includes('expired') ? 'expired' : states.includes('soon') ? 'soon' : null;
}

type RowProps = {
  item: ProductListRow;
  today: string;
  currency: string;
  wide: boolean;
  /** In its variant group's folder: named by its attributes when it has them. */
  nested: boolean;
  selecting: boolean;
  selected: boolean;
  /** The item open in the tablet's second pane. */
  active?: boolean;
  /** The lot drill is open under the row. */
  expanded: boolean;
  showEmpty: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onOpen: () => void;
};

export function InventoryRow(props: RowProps) {
  const { item, currency, wide, selecting, selected, active, expanded, showEmpty, onExpand, onToggle } = props;
  const { colors } = useAppTheme();
  const highlighted = selected || active;
  const unit = unitName(item);

  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceVariant }, highlighted && { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.inner}>
        {selecting ? (
          <Checkbox.Android status={selected ? 'checked' : 'unchecked'} onPress={onToggle} />
        ) : (
          <IconButton
            icon={expanded ? 'chevron-down' : 'chevron-right'}
            size={20}
            onPress={onExpand}
            accessibilityLabel={expanded ? `Hide ${item.name}'s packs` : `Show ${item.name}'s packs`}
            accessibilityState={{ expanded }}
            style={styles.caret}
          />
        )}
        <NameCell {...props} highlighted={highlighted} />
        {wide ? (
          <View style={styles.typeCell}>
            <TypeMenu item={item} />
          </View>
        ) : null}
        <QtyCell item={item} unit={unit} />
        {wide ? <WideColumns item={item} unit={unit} currency={currency} /> : null}
      </View>
      {expanded ? <RowDrill item={item} unit={unit} currency={currency} showEmpty={showEmpty} /> : null}
    </View>
  );
}

/** Name, SKU and conversion, and the badges; opens the item, long-press selects. */
function NameCell({ item, today, wide, nested, selecting, highlighted, onToggle, onOpen }: RowProps & { highlighted: boolean | undefined }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      // Long-press starts selecting; while anything is selected, a tap toggles instead of opening.
      onPress={selecting ? onToggle : onOpen}
      onLongPress={onToggle}
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityHint={selecting ? 'Toggles selection' : 'Opens the item. Long press to select.'}
      accessibilityState={{ selected: highlighted }}
      style={styles.nameCell}
    >
      <Text variant="titleMedium" numberOfLines={2}>
        {rowName(item, nested)}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceMuted }}>
        {`${item.sku ?? 'No SKU'} · ${conversion(item)}`}
      </Text>
      <View style={styles.badges}>
        {!wide && item.stock_role ? <StockRoleBadge role={item.stock_role} /> : null}
        {item.status === 'active' ? null : <StatusText status={item.status} />}
        <ExpiryBadge state={itemExpiry(item, today)} />
      </View>
    </Pressable>
  );
}

/** On hand in the base unit, Low when at or under the re-order point, and the packs behind it. */
function QtyCell({ item, unit }: { item: ProductListRow; unit: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.qtyCell}>
      <View style={styles.qtyLine}>
        <Text variant="titleMedium">{`${item.qty_on_hand ?? 0} ${unit}`}</Text>
        {item.is_low_stock ? <LowStockBadge /> : null}
      </View>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
        {packInfo(item)}
      </Text>
    </View>
  );
}

/** Wide only: average cost and value, re-order point, location. */
function WideColumns({ item, unit, currency }: { item: ProductListRow; unit: string; currency: string }) {
  const { colors } = useAppTheme();
  const qty = item.qty_on_hand ?? 0;
  const cost = item.cost_price ?? 0;
  return (
    <>
      <View style={styles.moneyCell}>
        <Text variant="bodyMedium">{`${formatMoney(cost, currency)}/${unit} avg`}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
          {`value ${formatMoney(qty * cost, currency)}`}
        </Text>
      </View>
      <Text variant="bodySmall" style={[styles.reorderCell, { color: colors.onSurfaceMuted }]}>
        {item.reorder_threshold === null ? '—' : `Reorder ${item.reorder_threshold}`}
      </Text>
      <Text variant="bodySmall" numberOfLines={2} style={[styles.locationCell, { color: colors.onSurfaceMuted }]}>
        {item.storage_location ?? '—'}
      </Text>
    </>
  );
}

/** The inline Type menu: Sellable, Component or Both. Changing it makes or removes the item's Products drafts. */
function TypeMenu({ item }: { item: ProductListRow }) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const setRole = useSetStockRoleMutation();
  const role = item.stock_role ?? 'component';

  return (
    <View style={styles.typeMenu}>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Chip compact icon="chevron-down" onPress={() => setOpen(true)} disabled={setRole.isPending} accessibilityLabel={`Type: ${STOCK_ROLE_LABEL[role]}. Change`}>
            {STOCK_ROLE_LABEL[role]}
          </Chip>
        }
      >
        {stockRole.options.map((option) => (
          <Menu.Item
            key={option}
            title={STOCK_ROLE_LABEL[option]}
            onPress={() => {
              setOpen(false);
              if (option !== role) setRole.mutate({ id: item.id, stockRole: option });
            }}
          />
        ))}
      </Menu>
      {setRole.isError ? (
        <Text variant="bodySmall" style={{ color: colors.error }}>
          {failureMessage("Couldn't change the type.")}
        </Text>
      ) : null}
    </View>
  );
}

/** The drill under a row: the item's lots and packs, with the next pick marked. */
function RowDrill({ item, unit, currency, showEmpty }: { item: ProductListRow; unit: string; currency: string; showEmpty: boolean }) {
  const { colors } = useAppTheme();
  const stock = useItemStockQuery({ productId: item.id });

  return (
    <View style={[styles.drill, { backgroundColor: colors.surfaceMuted, borderTopColor: colors.outlineVariant }]}>
      {stock.data ? (
        <LotDrill
          lots={stock.data.lots}
          nextPick={item.sell_by === 'pack' ? stock.data.nextPick.pack : stock.data.nextPick.base}
          unit={unit}
          currency={currency}
          expiryAlertOn={item.expiry_alert_on}
          showEmpty={showEmpty}
        />
      ) : stock.isPending && !stock.isPaused ? (
        <ActivityIndicator />
      ) : (
        <QueryState query={stock} offline="You're offline. Packs will load when you reconnect." failure="Couldn't load the packs. Try again.">
          <Button onPress={() => stock.refetch()}>Try again</Button>
        </QueryState>
      )}
    </View>
  );
}

/** A variant in its group's folder reads as its attributes: "Red / Large". */
function rowName(item: ProductListRow, nested: boolean) {
  return nested && item.attributes.length > 0 ? item.attributes.join(' / ') : item.name;
}

/** The unit its count is in: the base unit, or the pack when it is sold by the pack. */
const unitName = (item: ProductListRow) => item.base_unit_name ?? item.pack_unit_name ?? 'unit';

/** "12 tablet/cup", or "1 per sack" for an item sold by the pack. */
function conversion(item: ProductListRow) {
  const per = item.conversion_factor ?? 1;
  const pack = item.pack_unit_name ?? 'pack';
  return per > 1 ? `${per} ${item.base_unit_name ?? 'unit'}/${pack}` : `1 per ${pack}`;
}

/** "3 cups · 1 open" from the live packs, or "sold per sack". */
function packInfo(item: ProductListRow) {
  const pack = item.pack_unit_name ?? 'pack';
  if ((item.conversion_factor ?? 1) <= 1) return `sold per ${pack}`;
  const open = item.packs.filter((row) => row.qty_remaining < row.units).length;
  return `${item.packs.length} ${pack} · ${open} open`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { borderBottomWidth: 1 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs, paddingRight: spacing.md, paddingVertical: spacing.sm },
  // IconButton ships a 6dp margin of its own; zeroed so the row's gap is the only spacing.
  caret: { margin: 0 },
  nameCell: { flex: 1.6, gap: spacing.xs },
  typeCell: { flex: 0.9 },
  typeMenu: { alignItems: 'flex-start', gap: spacing.xs },
  qtyCell: { flex: 1.1, gap: spacing.xs },
  qtyLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  moneyCell: { flex: 1, gap: spacing.xs },
  reorderCell: { flex: 0.7 },
  locationCell: { flex: 0.9 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  drill: { borderTopWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
});
