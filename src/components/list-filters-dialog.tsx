import { StyleSheet, View } from 'react-native';

import { topLevel, useCategoriesQuery } from '../features/categories/queries';
import { RESOURCE_META } from '../features/products/resources';
import type { ResourceScope } from '../features/products/resources';
import { STATUS_META, TYPE_META, productStatus, usesInventory } from '../features/products/schema';
import type { ProductStatus } from '../features/products/schema';
import { STOCK_ROLE_LABEL, stockRole } from '../features/products/stock-item';
import { useAppTheme } from '../lib/theme';
import { useListFilters } from '../Store/list-filters';
import type { InventorySource, ListFilters } from '../Store/list-filters';
import { spacing } from '../themes';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { Field } from './form-fields';
import { MenuSelect } from './menu-select';
import { SegmentedButtons } from './segmented-buttons';
import { Switch } from './switch';
import { Text } from './text';

const STATUS_FILTERS: { value: ProductStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All but archived' },
  ...productStatus.options.map((status) => ({ value: status, label: STATUS_META[status].label })),
];

const SOURCE_LABEL = {
  all: 'All',
  stock: 'Received via Stock',
  inventory: 'Added in Inventory',
} satisfies Record<InventorySource, string>;

/** Short enough for three segments on a phone; the chip under the toolbar says it in full. */
const SOURCE_SEGMENTS = [
  { value: 'all', label: 'All' },
  { value: 'stock', label: 'Via Stock' },
  { value: 'inventory', label: 'In Inventory' },
];

const ROLE_SEGMENTS = [{ value: '', label: 'All' }, ...stockRole.options.map((role) => ({ value: role, label: STOCK_ROLE_LABEL[role] }))];

type Props = {
  merchantId: string;
  scope: ResourceScope;
  /** The shell's width decision; a Dialog when wide. */
  wide?: boolean;
  /** The narrow formSheet route's body (src/app/(app)/sheets/list-filters.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

/**
 * The list's Filters panel (instruction_mds/visual-language.md §4, Filter panel): every filter but search and
 * sort. A change applies as it is made, so the panel has Done and no Apply.
 *
 * In src/components/ because the list (wide) and the formSheet route (narrow) both mount it.
 */
export function ListFiltersDialog({ merchantId, scope, wide, inSheet, onDismiss }: Props) {
  const [filters, patch] = useListFilters(merchantId, scope);
  const { types } = RESOURCE_META[scope];
  const inventory = scope === 'inventory';

  return (
    <AdaptiveDialog
      wide={wide}
      inSheet={inSheet}
      onDismiss={onDismiss}
      title="Filters"
      actions={
        <Button mode="contained" onPress={onDismiss}>
          Done
        </Button>
      }
    >
      <Field label="Status" span="full">
        <MenuSelect
          value={filters.status}
          options={STATUS_FILTERS}
          onChange={(value) => patch({ status: STATUS_FILTERS.find((option) => option.value === value)?.value ?? 'all' })}
          placeholder="All"
          accessibilityLabel="Status"
        />
      </Field>
      {/* A screen with one type has nothing to filter by; Rentables has two. */}
      {types.length > 1 ? (
        <Field label="Type" span="full">
          <MenuSelect
            value={filters.type}
            options={[{ value: '', label: 'All' }, ...types.map((type) => ({ value: type, label: TYPE_META[type].badge }))]}
            onChange={(value) => patch({ type: types.find((type) => type === value) ?? '' })}
            placeholder="All"
          accessibilityLabel="Type"
          />
        </Field>
      ) : null}
      {/* Inventory's categories are its folders. */}
      {inventory ? <InventoryFilters filters={filters} patch={patch} /> : <CategoryFilter merchantId={merchantId} scope={scope} filters={filters} patch={patch} />}
      {/* Running low only means something where a count is kept: Inventory and Rentables. */}
      {types.some(usesInventory) ? (
        <Toggle label="Low stock only" value={filters.lowStockOnly} onChange={(lowStockOnly) => patch({ lowStockOnly })} />
      ) : null}
      {inventory ? <EmptyPacks filters={filters} patch={patch} /> : null}
    </AdaptiveDialog>
  );
}

type SectionProps = { filters: ListFilters; patch: (next: Partial<ListFilters>) => void };

function InventoryFilters({ filters, patch }: SectionProps) {
  return (
    <>
      <Field label="Type" span="full">
        <SegmentedButtons
          density="small"
          value={filters.role}
          onValueChange={(value) => patch({ role: stockRole.options.find((role) => role === value) ?? '' })}
          buttons={ROLE_SEGMENTS}
        />
      </Field>
      <Field label="Source" span="full">
        <SegmentedButtons
          density="small"
          value={filters.source}
          onValueChange={(value) => patch({ source: value === 'stock' || value === 'inventory' ? value : 'all' })}
          buttons={SOURCE_SEGMENTS}
        />
      </Field>
    </>
  );
}

function CategoryFilter({ merchantId, scope, filters, patch }: SectionProps & { merchantId: string; scope: ResourceScope }) {
  const categories = useCategoriesQuery({ merchantId, scope });
  return (
    <Field label="Category" span="full">
      <MenuSelect
        value={filters.categoryId}
        options={[{ value: '', label: 'All' }, ...topLevel(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))]}
        onChange={(categoryId) => patch({ categoryId })}
        placeholder="All"
        accessibilityLabel="Category"
      />
    </Field>
  );
}

/** The lot drill's empty packs, and the pick order the drill marks. */
function EmptyPacks({ filters, patch }: SectionProps) {
  const { colors } = useAppTheme();
  return (
    <>
      <Toggle label="Show empty packs" value={filters.showEmpty} onChange={(showEmpty) => patch({ showEmpty })} />
      <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
        Pick order: open before sealed → closest expiry → fewest left → oldest first → pack ID. Unit cost = as typed at receipt, or pack cost ÷ units per pack, fixed per pack.
      </Text>
    </>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.toggle}>
      <Switch value={value} onValueChange={onChange} color={colors.accent} accessibilityLabel={label} />
      <Text variant="bodyMedium">{label}</Text>
    </View>
  );
}

/** One chip under the toolbar per filter off its default; closing it puts that filter back. */
export function activeFilters(filters: ListFilters, categoryName: (id: string) => string | undefined) {
  const chips: { label: string; reset: Partial<ListFilters> }[] = [];
  if (filters.status !== 'all') chips.push({ label: `Status: ${STATUS_META[filters.status].label}`, reset: { status: 'all' } });
  if (filters.type !== '') chips.push({ label: `Type: ${TYPE_META[filters.type].badge}`, reset: { type: '' } });
  if (filters.categoryId !== '') chips.push({ label: categoryName(filters.categoryId) ?? 'Category', reset: { categoryId: '' } });
  if (filters.role !== '') chips.push({ label: STOCK_ROLE_LABEL[filters.role], reset: { role: '' } });
  if (filters.source !== 'all') chips.push({ label: SOURCE_LABEL[filters.source], reset: { source: 'all' } });
  if (filters.lowStockOnly) chips.push({ label: 'Low stock only', reset: { lowStockOnly: false } });
  if (filters.showEmpty) chips.push({ label: 'Showing empty packs', reset: { showEmpty: false } });
  return chips;
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
