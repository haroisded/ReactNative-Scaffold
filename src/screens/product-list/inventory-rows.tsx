import { Pressable, StyleSheet, View } from 'react-native';

import { Checkbox } from '../../components/checkbox';
import { Icon } from '../../components/icon';
import { ExpiryBadge, LowStockBadge, NeedsPriceBadge, StatusText, StockRoleBadge, Thumbnail } from '../../components/product-badges';
import { Text } from '../../components/text';
import type { ProductListRow } from '../../features/products/queries';
import { expiryState, packsAndLoose } from '../../features/products/stock-item';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

// The Inventory screen's rows (design.md §6): packs and loose units instead of a price, the item's
// type, Low / Expiring, and variants gathered under their group.

export type InventorySource = 'all' | 'stock' | 'inventory';

export const SOURCE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'stock', label: 'Received via Stock' },
  { value: 'inventory', label: 'Added in Inventory' },
] satisfies { value: InventorySource; label: string }[];

/** The lots still counted: a voided receipt's lots stay only as history. */
const liveLots = (item: ProductListRow) => item.lots.filter((lot) => lot.receipt.voided_at === null);

/**
 * Received via Stock: at least one lot came on a supplier's receipt. Everything else — made here, and at
 * most given opening stock — was added in Inventory.
 */
export function itemSource(item: ProductListRow): Exclude<InventorySource, 'all'> {
  return liveLots(item).some((lot) => lot.receipt.supplier_id !== null) ? 'stock' : 'inventory';
}

/** The worst expiry among the lots with anything left: one expired lot makes the item Expired. */
function itemExpiry(item: ProductListRow, today: string) {
  const states = liveLots(item)
    .filter((lot) => lot.qty_remaining > 0)
    .map((lot) => expiryState(lot.expires_on, item.expiry_alert_days, today));
  return states.includes('expired') ? 'expired' : states.includes('soon') ? 'soon' : null;
}

export type InventoryEntry =
  | { kind: 'group'; id: string; name: string; count: number; open: boolean }
  | { kind: 'item'; item: ProductListRow; nested: boolean };

/**
 * The list's rows in display order: each group's header followed by its variants (unless collapsed),
 * the groups in the order their first variant arrives in, then every item without a group.
 */
export function groupInventory(rows: ProductListRow[], collapsed: ReadonlySet<string>): InventoryEntry[] {
  const groups = new Map<string, { name: string; items: ProductListRow[] }>();
  const loose: InventoryEntry[] = [];
  for (const item of rows) {
    if (item.group_id === null) {
      loose.push({ kind: 'item', item, nested: false });
      continue;
    }
    const group = groups.get(item.group_id) ?? { name: item.group?.name ?? 'Group', items: [] };
    group.items.push(item);
    groups.set(item.group_id, group);
  }

  const entries: InventoryEntry[] = [];
  for (const [id, group] of groups) {
    const open = !collapsed.has(id);
    entries.push({ kind: 'group', id, name: group.name, count: group.items.length, open });
    if (open) entries.push(...group.items.map((item) => ({ kind: 'item' as const, item, nested: true })));
  }
  return [...entries, ...loose];
}

export function GroupHeader({ name, count, open, onToggle }: { name: string; count: number; open: boolean; onToggle: () => void }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onToggle}
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${name}, ${count} variants`}
      style={[styles.group, { backgroundColor: colors.surfaceMuted, borderBottomColor: colors.surfaceVariant }]}
    >
      <Icon source={open ? 'chevron-down' : 'chevron-right'} size={20} color={colors.onSurfaceMuted} />
      <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.fill}>
        {name}
      </Text>
      <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
        {`${count} ${count === 1 ? 'variant' : 'variants'}`}
      </Text>
    </Pressable>
  );
}

type RowProps = {
  item: ProductListRow;
  today: string;
  /** Under a group header: indented, and named by its attributes when it has them. */
  nested: boolean;
  selecting: boolean;
  selected: boolean;
  /** The item open in the tablet's second pane. */
  active?: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

export function InventoryRow({ item, today, nested, selecting, selected, active, onToggle, onOpen }: RowProps) {
  const { colors } = useAppTheme();
  const name = nested && item.attributes.length > 0 ? item.attributes.join(' / ') : item.name;

  return (
    <Pressable
      // Long-press starts selecting; while anything is selected, a tap toggles instead of opening.
      onPress={selecting ? onToggle : onOpen}
      onLongPress={onToggle}
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityHint={selecting ? 'Toggles selection' : 'Opens the item. Long press to select.'}
      accessibilityState={{ selected: selected || active }}
      style={[
        styles.row,
        { borderBottomColor: colors.surfaceVariant },
        (selected || active) && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <View style={[styles.inner, nested && styles.nested]}>
        {selecting ? <Checkbox.Android status={selected ? 'checked' : 'unchecked'} onPress={onToggle} /> : <Thumbnail size={44} />}
        <View style={styles.text}>
          <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
            {[item.sku ?? 'No SKU', item.storage_location].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.badges}>
            {item.stock_role ? <StockRoleBadge role={item.stock_role} /> : null}
            {item.status === 'active' ? null : <StatusText status={item.status} />}
            {item.is_low_stock ? <LowStockBadge /> : null}
            <ExpiryBadge state={itemExpiry(item, today)} />
            <NeedsPriceBadge product={item} />
          </View>
        </View>
        <Text variant="bodyMedium" maxFontSizeMultiplier={1.3} style={styles.amount}>
          {packsAndLoose(item.qty_on_hand ?? 0, item.conversion_factor ?? 1, item.pack_unit_name, item.base_unit_name)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
  },
  row: { borderBottomWidth: 1 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  nested: { paddingLeft: spacing.xl },
  text: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  amount: { textAlign: 'right' },
});
