import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useArchiveUndo } from '../../components/archive-undo';
import { Button } from '../../components/button';
import { Checkbox } from '../../components/checkbox';
import { Chip } from '../../components/chip';
import { DataTable } from '../../components/data-table';
import { AddFromInventoryDialog } from '../../components/add-from-inventory-dialog';
import { DeleteProductDialog } from '../../components/delete-product-dialog';
import { HeaderTitle } from '../../components/header-title';
import { HelperText } from '../../components/helper-text';
import { IconButton } from '../../components/icon-button';
import { Menu } from '../../components/menu';
import { OptionItems } from '../../components/menu-select';
import { PageHeader } from '../../components/page-header';
import { QueryState } from '../../components/query-state';
import { LowStockBadge, NeedsPriceBadge, StatusText, Thumbnail, TypeBadge, availabilityLabel } from '../../components/product-badges';
import { Switch } from '../../components/switch';
import { Text } from '../../components/text';
import { TextInput } from '../../components/text-input';
import { topLevel, useCategoriesQuery } from '../../features/categories/queries';
import { useProductsQuery, useSetProductStatusMutation } from '../../features/products/queries';
import type { ProductListRow, ProductSort } from '../../features/products/queries';
import { RESOURCE_META, RESOURCE_ROUTE } from '../../features/products/resources';
import type { ResourceScope } from '../../features/products/resources';
import { STATUS_META, TYPE_META, productStatus, usesInventory } from '../../features/products/schema';
import type { ProductStatus, ProductType } from '../../features/products/schema';
import { STOCK_ROLE_LABEL, stockRole as stockRoles } from '../../features/products/stock-item';
import type { StockRole } from '../../features/products/stock-item';
import { localToday } from '../../features/stock-receipts/schema';
import { useShellWide } from '../../lib/columns';
import { failureMessage, mutationNotice, postgrestError } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { useSheetResult } from '../../Store/sheet-result';
import { spacing } from '../../themes';
import { InventoryDetail } from '../inventory-detail';
import { ProductGate } from '../product-detail';
import { GroupHeader, InventoryRow, SOURCE_FILTERS, SectionLabel, groupInventory, itemSource } from './inventory-rows';
import type { InventorySource } from './inventory-rows';

type Props = {
  merchantId: string;
  merchantName: string;
  currency: string;
  /** Which Resources screen this is (src/features/products/resources.ts). */
  scope: ResourceScope;
};

const STATUS_FILTERS: { value: ProductStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All but archived' },
  ...productStatus.options.map((status) => ({ value: status, label: STATUS_META[status].label })),
];
const ROLE_FILTERS: { value: StockRole | ''; label: string }[] = [
  { value: '', label: 'All' },
  ...stockRoles.options.map((role) => ({ value: role, label: STOCK_ROLE_LABEL[role] })),
];
const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'price', label: 'Price' },
  { value: 'stock', label: 'Stock' },
  { value: 'created', label: 'Newest' },
];

type Filters = {
  categoryId: string;
  type: ProductType | '';
  status: ProductStatus | 'all';
  lowStockOnly: boolean;
  // Inventory only: the item's type, and where its stock came from.
  role: StockRole | '';
  source: InventorySource;
  sort: ProductSort;
};
const NO_FILTERS: Filters = { categoryId: '', type: '', status: 'all', lowStockOnly: false, role: '', source: 'all', sort: 'name' };

type Target = { id: string; name: string };

export function ProductList({ merchantId, merchantName, currency, scope }: Props) {
  const wide = useShellWide();
  const meta = RESOURCE_META[scope];
  const route = RESOURCE_ROUTE[scope];
  const inventory = scope === 'inventory';

  const [searchDraft, setSearchDraft] = useState('');
  const search = useDebounced(searchDraft);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // The rows awaiting delete, held here and not in a row: FlashList recycles its cells.
  const [deleting, setDeleting] = useState<Target[] | null>(null);
  // Inventory only: whether the lot drill lists packs that are used up.
  const [showEmpty, setShowEmpty] = useState(false);
  const { addFromInventory, addDialog } = useAddFromInventory(merchantId, wide);
  // Archive writes immediately and offers Undo; only Delete still asks (src/components/archive-undo.tsx).
  const { archive, snackbar } = useArchiveUndo();
  // Narrow, the delete dialog is a formSheet route; its outcome comes back here to clear the selection.
  useSheetResult('delete-product:list', () => setSelected(new Set()));

  const remove = (targets: Target[]) => {
    if (wide) setDeleting(targets);
    else router.push({ pathname: '/sheets/delete-product', params: { products: JSON.stringify(targets), resultKey: 'delete-product:list' } });
  };


  const { products, rows } = useProductRows(merchantId, scope, search, filters);
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const filtered = isFiltered(filters, search);

  const patch = (next: Partial<Filters>) => setFilters((previous) => ({ ...previous, ...next }));
  const clearFilters = () => {
    setSearchDraft('');
    setFilters({ ...NO_FILTERS, sort: filters.sort });
  };
  const toggle = (id: string) => setSelected((previous) => toggled(previous, id));
  const clearSelection = () => setSelected(new Set());
  const openDetail = (id: string) => router.push({ pathname: route.detail, params: { id: merchantId, productId: id } });
  const list: ListProps = {
    rows,
    selected,
    onToggle: toggle,
    onOpen: openDetail,
    empty: <EmptyList query={products} merchantId={merchantId} scope={scope} filtered={filtered} onClear={clearFilters} />,
  };

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={merchantName}
        title={meta.title}
        meta={products.data ? countLabel(rows.length, meta.item, filtered) : undefined}
        actions={<ListActions merchantId={merchantId} scope={scope} onAddFromInventory={addFromInventory} />}
      />

      <Toolbar wide={wide} inventory={inventory} search={searchDraft} onSearch={setSearchDraft}>
        <FilterControls merchantId={merchantId} scope={scope} filters={filters} onChange={patch} />
      </Toolbar>

      <InventoryChips visible={inventory} filters={filters} onChange={patch} showEmpty={showEmpty} onShowEmpty={setShowEmpty} />

      <BulkBar rows={selectedRows} onClear={clearSelection} archive={archive} remove={remove} />

      <ListBody
        scope={scope}
        wide={wide}
        list={list}
        merchantId={merchantId}
        currency={currency}
        showEmpty={showEmpty}
        onSelect={setSelected}
        archive={archive}
        remove={remove}
      />

      {addDialog}
      {deleting ? (
        <DeleteProductDialog
          products={deleting}
          onDismiss={() => setDeleting(null)}
          onDone={() => {
            setDeleting(null);
            clearSelection();
          }}
        />
      ) : null}
      {snackbar}
    </View>
  );
}

/** The search box's text once typing pauses: a request per pause, not per keystroke. */
function useDebounced(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

/** Products → Add from Inventory: a dialog on a tablet, the sheet route on a phone. */
function useAddFromInventory(merchantId: string, wide: boolean) {
  const [adding, setAdding] = useState(false);
  const addFromInventory = () => {
    if (wide) setAdding(true);
    else router.push({ pathname: '/sheets/add-from-inventory', params: { merchantId } });
  };
  const addDialog = adding ? <AddFromInventoryDialog merchantId={merchantId} onDismiss={() => setAdding(false)} /> : null;
  return { addFromInventory, addDialog };
}

type ListBodyProps = {
  scope: ResourceScope;
  wide: boolean;
  list: ListProps;
  merchantId: string;
  currency: string;
  showEmpty: boolean;
  onSelect: (selected: ReadonlySet<string>) => void;
  archive: ReturnType<typeof useArchiveUndo>['archive'];
  remove: (targets: Target[]) => void;
};

/** Inventory's grouped panes, the wide table, or the narrow cards. */
function ListBody({ scope, wide, list, merchantId, currency, showEmpty, onSelect, archive, remove }: ListBodyProps) {
  if (scope === 'inventory') return <InventoryPanes {...list} merchantId={merchantId} currency={currency} wide={wide} showEmpty={showEmpty} />;
  if (!wide) return <CardList {...list} currency={currency} />;
  return (
    <ProductTable
      {...list}
      currency={currency}
      onSelect={onSelect}
      onEdit={(id) => router.push({ pathname: RESOURCE_ROUTE[scope].edit, params: { id: merchantId, productId: id } })}
      onArchive={(item) => archive([{ id: item.id, name: item.name, status: item.status }])}
      onDelete={(item) => remove([{ id: item.id, name: item.name }])}
    />
  );
}

/** Setup, Add from Inventory (Products only), and Add. */
function ListActions({ merchantId, scope, onAddFromInventory }: { merchantId: string; scope: ResourceScope; onAddFromInventory: () => void }) {
  const route = RESOURCE_ROUTE[scope];
  return (
    <>
      <Button mode="outlined" icon="settings" onPress={() => router.push({ pathname: route.setup, params: { id: merchantId } })}>
        Setup
      </Button>
      {scope === 'products' ? (
        <Button mode="outlined" icon="inventory" onPress={onAddFromInventory}>
          Add from Inventory
        </Button>
      ) : null}
      <Button mode="contained" icon="add" onPress={() => router.push({ pathname: route.new, params: { id: merchantId } })}>
        {`Add ${RESOURCE_META[scope].item}`}
      </Button>
    </>
  );
}

/** The query the filters make, and the rows it returns after Source, which the query cannot apply. */
function useProductRows(merchantId: string, scope: ResourceScope, search: string, filters: Filters) {
  const inventory = scope === 'inventory';
  const products = useProductsQuery({
    merchantId,
    scope,
    search,
    categoryId: filters.categoryId || null,
    type: filters.type || null,
    stockRole: inventory ? filters.role || null : null,
    status: filters.status,
    lowStockOnly: filters.lowStockOnly,
    sort: filters.sort,
  });
  // ponytail: Source is filtered here, not in the query — it reads the embedded lots. Move it to a
  // generated column if the list gains pagination.
  const rows = (products.data ?? []).filter((row) => !inventory || filters.source === 'all' || itemSource(row) === filters.source);
  return { products, rows };
}

/** Search, and the filter menus: always shown wide, behind the filter button narrow. */
function Toolbar({
  wide,
  inventory,
  search,
  onSearch,
  children,
}: {
  wide: boolean;
  inventory: boolean;
  search: string;
  onSearch: (search: string) => void;
  children: ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View style={styles.toolbar}>
      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          dense
          value={search}
          onChangeText={onSearch}
          placeholder={inventory ? 'Search name, SKU, barcode, location' : 'Search name or SKU'}
          accessibilityLabel="Search products"
          left={<TextInput.Icon icon="search" />}
          right={search !== '' ? <TextInput.Icon icon="close" onPress={() => onSearch('')} accessibilityLabel="Clear search" /> : undefined}
          style={styles.fill}
        />
        {wide ? null : (
          <IconButton
            icon="filter"
            mode={filtersOpen ? 'contained' : 'outlined'}
            onPress={() => setFiltersOpen((open) => !open)}
            accessibilityLabel="Filters and sort"
            accessibilityState={{ expanded: filtersOpen }}
          />
        )}
      </View>
      {wide || filtersOpen ? <View style={styles.filters}>{children}</View> : null}
    </View>
  );
}

function FilterControls({
  merchantId,
  scope,
  filters,
  onChange,
}: {
  merchantId: string;
  scope: ResourceScope;
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
}) {
  const { colors } = useAppTheme();
  const categories = useCategoriesQuery({ merchantId, scope });
  const { types } = RESOURCE_META[scope];
  const inventory = scope === 'inventory';
  // Sorting by stock, and filtering to what is running low, only mean something where a count is kept:
  // Inventory and Rentables. A flat service has no quantity.
  const counted = types.some(usesInventory);
  // Inventory items carry no price of their own; their register drafts do.
  const sorts = SORTS.filter((option) => (counted || option.value !== 'stock') && (!inventory || option.value !== 'price'));

  return (
    <>
      <FilterMenu
        label="Category"
        value={filters.categoryId}
        options={[{ value: '', label: 'All' }, ...topLevel(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))]}
        onChange={(categoryId) => onChange({ categoryId })}
      />
      {/* A screen with one type has nothing to filter by; Rentables has two. */}
      {types.length > 1 ? (
        <FilterMenu
          label="Type"
          value={filters.type}
          options={[{ value: '', label: 'All' }, ...types.map((type) => ({ value: type, label: TYPE_META[type].badge }))]}
          onChange={(type) => onChange({ type })}
        />
      ) : null}
      <FilterMenu label="Status" value={filters.status} options={STATUS_FILTERS} onChange={(status) => onChange({ status })} />
      <FilterMenu label="Sort" value={filters.sort} options={sorts} onChange={(sort) => onChange({ sort })} />
      {counted ? (
        <View style={styles.switchRow}>
          <Switch
            value={filters.lowStockOnly}
            onValueChange={(lowStockOnly) => onChange({ lowStockOnly })}
            color={colors.accent}
            accessibilityLabel="Low stock only"
          />
          <Text variant="bodyMedium">Low stock</Text>
        </View>
      ) : null}
    </>
  );
}

function EmptyList({
  query,
  merchantId,
  scope,
  filtered,
  onClear,
}: {
  query: ReturnType<typeof useProductsQuery>;
  merchantId: string;
  scope: ResourceScope;
  filtered: boolean;
  onClear: () => void;
}) {
  const meta = RESOURCE_META[scope];

  return (
    <View style={styles.state}>
      <QueryState
        query={query}
        offline={`You're offline. ${meta.title} will load when you reconnect.`}
        failure={`Couldn't load ${meta.title.toLowerCase()}. Try again.`}
      >
        {filtered ? (
          <>
            <Text variant="bodyMedium">Nothing matches these filters.</Text>
            <Button onPress={onClear}>Clear filters</Button>
          </>
        ) : (
          <>
            <Text variant="bodyMedium">{`No ${meta.title.toLowerCase()} yet.`}</Text>
            <Button mode="contained" icon="add" onPress={() => router.push({ pathname: RESOURCE_ROUTE[scope].new, params: { id: merchantId } })}>
              {`Add ${meta.item}`}
            </Button>
          </>
        )}
      </QueryState>
    </View>
  );
}

type ChipsProps = {
  /** Inventory only; other screens draw nothing here. */
  visible: boolean;
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  showEmpty: boolean;
  onShowEmpty: (showEmpty: boolean) => void;
};

/**
 * Inventory's always-visible filters (.claude/inventory-stock/Inventory.html): where the stock came from,
 * the item's type, and whether the drill lists empty packs — with the pick order the drill marks.
 */
function InventoryChips({ visible, filters, onChange, showEmpty, onShowEmpty }: ChipsProps) {
  const { colors } = useAppTheme();
  if (!visible) return null;

  return (
    <View style={styles.chipBlock}>
      <View style={styles.chipRow}>
        {SOURCE_FILTERS.map((option) => (
          <Chip key={option.value} compact selected={filters.source === option.value} showSelectedCheck={false} onPress={() => onChange({ source: option.value })}>
            {option.label}
          </Chip>
        ))}
      </View>
      <View style={styles.chipRow}>
        {ROLE_FILTERS.map((option) => (
          <Chip key={option.value || 'all'} compact selected={filters.role === option.value} showSelectedCheck={false} onPress={() => onChange({ role: option.value })}>
            {option.label}
          </Chip>
        ))}
        <View style={styles.switchRow}>
          <Switch value={showEmpty} onValueChange={onShowEmpty} color={colors.accent} accessibilityLabel="Show empty packs" />
          <Text variant="bodyMedium">Show empty packs</Text>
        </View>
      </View>
      <Text variant="bodySmall" style={[styles.pickOrder, { color: colors.onSurfaceMuted }]}>
        Pick order: open before sealed → closest expiry → fewest left → oldest first → pack ID. Unit cost = (pack cost + freight share) ÷ units per pack, fixed per pack at receipt.
      </Text>
    </View>
  );
}

/** What a selection can do at once: status, archive, delete. The notice stays after the bar clears. */
function BulkBar({
  rows,
  onClear,
  archive,
  remove,
}: {
  rows: ProductListRow[];
  onClear: () => void;
  archive: ReturnType<typeof useArchiveUndo>['archive'];
  remove: (targets: Target[]) => void;
}) {
  const { colors } = useAppTheme();
  const setStatus = useSetProductStatusMutation();
  const bulkStatus = (next: ProductStatus) => setStatus.mutate({ ids: rows.map((row) => row.id), status: next }, { onSuccess: onClear });
  const notice = mutationNotice(setStatus, bulkFailure(setStatus.error));

  return (
    <>
      {rows.length > 0 ? (
        <View style={[styles.bulkBar, { backgroundColor: colors.surfaceVariant }]}>
          <IconButton icon="close" size={18} onPress={onClear} accessibilityLabel="Clear selection" style={styles.bulkClear} />
          <Text variant="labelLarge" style={styles.bulkCount}>{`${rows.length} selected`}</Text>
          <Button compact onPress={() => bulkStatus('active')} disabled={setStatus.isPending}>
            Activate
          </Button>
          <Button compact onPress={() => bulkStatus('inactive')} disabled={setStatus.isPending}>
            Deactivate
          </Button>
          <Button compact onPress={() => archive(rows.map((row) => ({ id: row.id, name: row.name, status: row.status })), onClear)}>
            Archive
          </Button>
          <Button compact textColor={colors.error} onPress={() => remove(rows.map((row) => ({ id: row.id, name: row.name })))}>
            Delete
          </Button>
        </View>
      ) : null}
      {notice ? (
        <HelperText type={notice.type} style={styles.bulkNotice}>
          {notice.text}
        </HelperText>
      ) : null}
    </>
  );
}

type ListProps = {
  rows: ProductListRow[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  empty: ReactElement;
};

type PanesProps = ListProps & { merchantId: string; currency: string; wide: boolean; showEmpty: boolean };

/**
 * Inventory's grouped list. Wide, it spans the screen in columns until an item is opened, then narrows to
 * a row list beside the item (instruction_mds/layout.md §2: a row card gets a second pane, never more
 * width). Narrow, an item opens on its own screen.
 */
function InventoryPanes({ rows, selected, onToggle, onOpen, empty, merchantId, currency, wide, showEmpty }: PanesProps) {
  const { colors } = useAppTheme();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // Rows whose lot drill is open. Held here, not in a row: FlashList recycles its cells.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [paneId, setPaneId] = useState<string | null>(null);
  const today = localToday();
  const selecting = rows.some((row) => selected.has(row.id));
  const paned = wide && paneId !== null;
  const open = (id: string) => (wide ? setPaneId(id) : onOpen(id));

  return (
    <View style={[styles.fill, paned && styles.panes]}>
      <View style={paned ? [styles.listPane, { borderRightColor: colors.outlineVariant }] : styles.fill}>
        <FlashList
          data={groupInventory(rows, collapsed)}
          keyExtractor={(entry) => (entry.kind === 'item' ? entry.item.id : `${entry.kind}:${entry.id}`)}
          getItemType={(entry) => entry.kind}
          extraData={{ expanded, showEmpty, selected, paneId }}
          ListEmptyComponent={empty}
          renderItem={({ item: entry }) =>
            entry.kind === 'label' ? (
              <SectionLabel name={entry.name} />
            ) : entry.kind === 'group' ? (
              <GroupHeader
                name={entry.name}
                count={entry.count}
                open={entry.open}
                onToggle={() => setCollapsed((previous) => toggled(previous, entry.id))}
              />
            ) : (
              <InventoryRow
                item={entry.item}
                today={today}
                currency={currency}
                wide={wide && !paned}
                nested={entry.nested}
                expanded={expanded.has(entry.item.id)}
                showEmpty={showEmpty}
                onExpand={() => setExpanded((previous) => toggled(previous, entry.item.id))}
                selecting={selecting}
                selected={selected.has(entry.item.id)}
                active={paneId === entry.item.id}
                onToggle={() => onToggle(entry.item.id)}
                onOpen={() => open(entry.item.id)}
              />
            )
          }
        />
      </View>
      {paned ? (
        <View style={styles.detailPane}>
          <ProductGate key={paneId} id={paneId} scope="inventory">
            {(product) => (
              <InventoryDetail merchantId={merchantId} product={product} currency={currency} embedded onClose={() => setPaneId(null)} />
            )}
          </ProductGate>
        </View>
      ) : null}
    </View>
  );
}

/** Narrow, the list is cards. */
function CardList({ rows, selected, onToggle, onOpen, empty, currency }: ListProps & { currency: string }) {
  const selecting = rows.some((row) => selected.has(row.id));

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <CardRow
          item={item}
          currency={currency}
          selecting={selecting}
          selected={selected.has(item.id)}
          onToggle={() => onToggle(item.id)}
          onOpen={() => onOpen(item.id)}
        />
      )}
    />
  );
}

function ProductTable({
  rows,
  selected,
  onToggle,
  onOpen,
  empty,
  currency,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
}: ListProps & {
  currency: string;
  onSelect: (ids: ReadonlySet<string>) => void;
  onEdit: (id: string) => void;
  onArchive: (item: ProductListRow) => void;
  onDelete: (item: ProductListRow) => void;
}) {
  const { colors } = useAppTheme();
  const count = rows.filter((row) => selected.has(row.id)).length;
  const allSelected = rows.length > 0 && count === rows.length;

  return (
    <DataTable style={styles.fill}>
      <DataTable.Header style={{ borderBottomColor: colors.outlineVariant }}>
        <View style={styles.checkCell}>
          <Checkbox.Android
            status={checkStatus(allSelected, count > 0)}
            onPress={() => onSelect(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
            accessibilityLabel="Select all"
          />
        </View>
        <View style={styles.thumbCell} />
        <HeaderTitle label="Product" style={styles.nameCell} />
        <HeaderTitle label="Category" style={styles.categoryCell} />
        <HeaderTitle label="Type" style={styles.typeCell} />
        <HeaderTitle label="Availability" style={styles.stockCell} />
        <HeaderTitle label="Price" style={styles.priceCell} />
        <HeaderTitle label="Status" style={styles.statusCell} />
        <View style={styles.actionsCell} />
      </DataTable.Header>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={empty}
        renderItem={({ item }) => (
          <TableRow
            item={item}
            currency={currency}
            selected={selected.has(item.id)}
            onToggle={() => onToggle(item.id)}
            onOpen={() => onOpen(item.id)}
            onEdit={() => onEdit(item.id)}
            onArchive={() => onArchive(item)}
            onDelete={() => onDelete(item)}
          />
        )}
      />
    </DataTable>
  );
}

function FilterMenu<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value)?.label ?? '';

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <Button mode="outlined" compact icon="chevron-down" contentStyle={styles.trailingIcon} onPress={() => setOpen(true)}>
          {`${label}: ${current}`}
        </Button>
      }
    >
      <OptionItems
        options={options}
        value={value}
        onPick={(next) => {
          setOpen(false);
          onChange(next);
        }}
      />
    </Menu>
  );
}

type RowProps = {
  item: ProductListRow;
  currency: string;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

function TableRow({
  item,
  currency,
  selected,
  onToggle,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: RowProps & { onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  const { colors } = useAppTheme();

  return (
    <DataTable.Row onPress={onOpen} style={[styles.tableRow, { borderBottomColor: colors.surfaceVariant }]}>
      <View style={styles.checkCell}>
        <Checkbox.Android status={selected ? 'checked' : 'unchecked'} onPress={onToggle} accessibilityLabel={`Select ${item.name}`} />
      </View>
      <View style={styles.thumbCell}>
        <Thumbnail size={36} />
      </View>
      <View style={styles.nameCell}>
        <Text variant="titleMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceMuted }}>
          {item.sku ?? 'No SKU'}
        </Text>
      </View>
      <View style={styles.categoryCell}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.category?.name ?? '—'}
        </Text>
      </View>
      <View style={styles.typeCell}>
        <TypeBadge type={item.type} />
      </View>
      <View style={styles.stockCell}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {availabilityLabel(item)}
        </Text>
        {item.is_low_stock ? <LowStockBadge /> : null}
        <NeedsPriceBadge product={item} />
      </View>
      <View style={styles.priceCell}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {formatMoney(item.selling_price, currency)}
        </Text>
      </View>
      <View style={styles.statusCell}>
        <StatusText status={item.status} />
      </View>
      <View style={[styles.actionsCell, styles.actions]}>
        <IconButton icon="edit" size={18} onPress={onEdit} accessibilityLabel={`Edit ${item.name}`} />
        {/* Two controls, because they are two different things: archive is reversible, delete is not. */}
        <IconButton icon="archive" size={18} onPress={onArchive} accessibilityLabel={`Archive ${item.name}`} />
        <IconButton icon="delete" size={18} iconColor={colors.error} onPress={onDelete} accessibilityLabel={`Delete ${item.name}`} />
      </View>
    </DataTable.Row>
  );
}

function CardRow({ item, currency, selecting, selected, onToggle, onOpen }: RowProps & { selecting: boolean }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      // Long-press starts selecting; while anything is selected, a tap toggles instead of opening.
      onPress={selecting ? onToggle : onOpen}
      onLongPress={onToggle}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityHint={selecting ? 'Toggles selection' : 'Opens the product. Long press to select.'}
      accessibilityState={{ selected }}
      style={[styles.cardRow, { borderBottomColor: colors.surfaceVariant }, selected && { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={styles.cardInner}>
        {selecting ? (
          <Checkbox.Android status={selected ? 'checked' : 'unchecked'} onPress={onToggle} />
        ) : (
          <Thumbnail size={44} />
        )}
        <View style={styles.cardText}>
          <Text variant="titleMedium" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceMuted }}>
            {[item.sku ?? 'No SKU', item.category?.name].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.cardBadges}>
            <TypeBadge type={item.type} />
            <StatusText status={item.status} />
            {item.is_low_stock ? <LowStockBadge /> : null}
            <NeedsPriceBadge product={item} />
          </View>
        </View>
        <View style={styles.cardAmount}>
          <Text variant="titleMedium" numberOfLines={1}>
            {formatMoney(item.selling_price, currency)}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
            {availabilityLabel(item)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Whether anything narrows the list. Sort only orders it. */
function isFiltered(filters: Filters, search: string) {
  return (
    search !== '' ||
    filters.categoryId !== '' ||
    filters.type !== '' ||
    filters.status !== 'all' ||
    filters.lowStockOnly ||
    filters.role !== '' ||
    filters.source !== 'all'
  );
}

/** "12 products shown" */
function countLabel(count: number, item: string, filtered: boolean) {
  return `${count} ${count === 1 ? item : `${item}s`}${filtered ? ' shown' : ''}`;
}

/** products_price_when_sold: a product sold on its own cannot leave draft without a price. */
function bulkFailure(error: Error | null) {
  return postgrestError(error)?.code === '23514'
    ? 'A product sold on its own needs a selling price before it can be active.'
    : failureMessage("Couldn't update these products. Try again.");
}

function checkStatus(all: boolean, some: boolean) {
  if (all) return 'checked';
  return some ? 'indeterminate' : 'unchecked';
}

/** A copy of the set with the id flipped in or out. */
function toggled(set: ReadonlySet<string>, id: string) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  toolbar: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chipBlock: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.ms },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  pickOrder: { maxWidth: 640 },
  trailingIcon: { flexDirection: 'row-reverse' },
  bulkBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  // IconButton ships a 6dp margin of its own; zeroed so the bar's gap is the only spacing.
  bulkClear: { margin: 0 },
  bulkCount: { paddingRight: spacing.sm },
  bulkNotice: { paddingHorizontal: spacing.md },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  panes: { flexDirection: 'row' },
  // The list side of the tablet's two panes; the detail takes the rest.
  listPane: { flex: 2, borderRightWidth: 1 },
  detailPane: { flex: 3 },
  tableRow: { borderBottomWidth: 1, minHeight: 60 },
  checkCell: { width: 44, justifyContent: 'center' },
  thumbCell: { width: 48, justifyContent: 'center' },
  nameCell: { flex: 3, justifyContent: 'center', paddingRight: spacing.ms },
  categoryCell: { flex: 2, justifyContent: 'center', paddingRight: spacing.ms },
  typeCell: { flex: 1.3, justifyContent: 'center' },
  stockCell: { flex: 1.4, justifyContent: 'center' },
  priceCell: { flex: 1.3, justifyContent: 'center' },
  statusCell: { flex: 1, justifyContent: 'center' },
  // Three 18dp IconButtons: edit, archive, delete.
  actionsCell: { width: 132 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  cardRow: { borderBottomWidth: 1 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  cardText: { flex: 1, gap: spacing.xs },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  cardAmount: { alignItems: 'flex-end', gap: spacing.xs },
});
