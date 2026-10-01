import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/activity-indicator';
import { Button } from '../../components/button';
import { DataTable } from '../../components/data-table';
import { FolderBreadcrumb, FolderRow, useFolderPath } from '../../components/folder-nav';
import { displayDate } from '../../components/form-fields';
import { HeaderTitle } from '../../components/header-title';
import { Icon } from '../../components/icon';
import { PackRow } from '../../components/pack-row';
import { ProgressBar } from '../../components/progress-bar';
import { QueryState } from '../../components/query-state';
import { Text } from '../../components/text';
import { useCategoriesQuery } from '../../features/categories/queries';
import { useProductGroupsQuery } from '../../features/product-groups/queries';
import { folderEntries, folderTrail } from '../../features/products/folders';
import type { FolderEntry } from '../../features/products/folders';
import { lotBalance } from '../../features/stock-movements/queries';
import { RECEIPT_STATUS_LABEL, lineStatus, useLotPacksQuery, useReceiptLinesQuery } from '../../features/stock-receipts/queries';
import type { ReceiptLineRow, ReceiptStatus } from '../../features/stock-receipts/queries';
import { useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

// Stock → Receipts (.claude/inventory-stock/Stock_Receiving.html): one row per receipt line — what
// arrived, from whom, and how much of it is left — each opening onto its cases and packs. Receipt data is
// fixed as history; the remaining counts move as stock is sold, used or written off. The lines sit in
// Inventory's folders — category, subcategory, variant group — newest first inside each.

// A line's status in the muted scale of instruction_mds/visual-language.md §3: only Partial, the one that
// is being drawn from, carries the accent.
const STATUS_TONE = {
  full: 'onSurface',
  partial: 'accent',
  depleted: 'onSurfaceMuted',
  void: 'onSurfaceFaint',
} satisfies Record<ReceiptStatus, 'onSurface' | 'accent' | 'onSurfaceMuted' | 'onSurfaceFaint'>;

/** Packs shown per case before "+ N more packs". */
const PACKS_SHOWN = 5;

type Props = { merchantId: string; currency: string };

export function ReceiptsPane({ merchantId, currency }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const lines = useReceiptLinesQuery({ merchantId });
  const rows = lines.data ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const folders = useFolderPath('/systems/[id]/stock', merchantId);
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const groups = useProductGroupsQuery({ merchantId });
  const named = [...(categories.data ?? []), ...(groups.data ?? [])];
  const entries = folderEntries(rows, placeOf, folders.path, named);
  const crumbs = <FolderBreadcrumb root="Stock" trail={folderTrail(folders.path, named)} />;

  const toggle = (id: string) => setOpen((current) => (current === id ? null : id));
  const openReceipt = (receiptId: string) =>
    router.push({ pathname: '/systems/[id]/stock/receipts/[receiptId]', params: { id: merchantId, receiptId } });

  const empty = <EmptyLines lines={lines} merchantId={merchantId} />;

  const renderItem = ({ item: entry }: { item: FolderEntry<ReceiptLineRow> }) => {
    if (entry.kind === 'folder') {
      const caption = `${entry.count} receipt ${entry.count === 1 ? 'line' : 'lines'}`;
      return <FolderRow name={entry.name} caption={caption} onOpen={() => folders.open(entry.level, entry.id)} />;
    }
    const { item } = entry;
    return (
      <LineRow
        item={item}
        wide={wide}
        currency={currency}
        open={open === item.id}
        onToggle={() => toggle(item.id ?? '')}
        onOpenReceipt={() => item.receipt_id && openReceipt(item.receipt_id)}
      />
    );
  };
  const list = (
    <FlashList
      data={entries}
      keyExtractor={(entry) => (entry.kind === 'item' ? (entry.item.id ?? '') : `${entry.level}:${entry.id}`)}
      getItemType={(entry) => entry.kind}
      extraData={open}
      ListEmptyComponent={empty}
      renderItem={renderItem}
    />
  );

  if (!wide) {
    return (
      <View style={styles.fill}>
        {crumbs}
        {list}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {crumbs}
      <DataTable style={styles.fill}>
        <DataTable.Header style={{ borderBottomColor: colors.outlineVariant }}>
          <HeaderTitle label="Date / Receipt" style={styles.dateCell} />
          <HeaderTitle label="Supplier" style={styles.supplierCell} />
          <HeaderTitle label="Item" style={styles.itemCell} />
          <HeaderTitle label="Batch / Lot" style={styles.lotCell} />
          <HeaderTitle label="Remaining / Received" style={styles.remainingCell} />
          <HeaderTitle label="Status" style={styles.statusCell} />
          <HeaderTitle label="Cost" style={styles.moneyCell} />
          <HeaderTitle label="Unit cost" style={styles.moneyCell} />
          <HeaderTitle label="Location" style={styles.locationCell} />
        </DataTable.Header>
        {list}
      </DataTable>
    </View>
  );
}

function EmptyLines({ lines, merchantId }: { lines: ReturnType<typeof useReceiptLinesQuery>; merchantId: string }) {
  return (
    <View style={styles.state}>
      {/* Paused before pending (instruction_mds/data-layer.md §5). */}
      {lines.isPaused && !lines.data ? (
        <Text variant="bodyMedium">You&apos;re offline. Receipts will load when you reconnect.</Text>
      ) : lines.isPending ? (
        <ActivityIndicator />
      ) : lines.isError ? (
        <>
          <Text variant="bodyMedium">{failureMessage("Couldn't load receipts. Try again.")}</Text>
          <Button onPress={() => lines.refetch()}>Try again</Button>
        </>
      ) : (
        <>
          <Text variant="bodyMedium">No receipts yet. Record a delivery from a supplier to start counting stock.</Text>
          <Button
            mode="contained"
            icon="add"
            onPress={() => router.push({ pathname: '/systems/[id]/stock/receipts/new', params: { id: merchantId } })}
          >
            Stock receipt
          </Button>
        </>
      )}
    </View>
  );
}

/** Where a line's item sits in the folders. */
const placeOf = (item: ReceiptLineRow) => ({
  category: item.product?.category_id ?? null,
  sub: item.product?.subcategory_id ?? null,
  group: item.product?.group_id ?? null,
});

/** "Chicken — Whole Chicken" for a variant, else the item's name. */
const itemLabel = (item: ReceiptLineRow) =>
  item.product ? (item.product.group ? `${item.product.group.name} — ${item.product.name}` : item.product.name) : '—';
const unitLabel = (item: ReceiptLineRow) => item.product?.base_unit_name ?? item.product?.pack_unit_name ?? 'unit';

function statusOf(item: ReceiptLineRow) {
  return lineStatus({
    voided: item.receipt?.voided_at != null,
    received: item.qty_received ?? 0,
    remaining: item.qty_remaining ?? 0,
  });
}

type RowProps = {
  item: ReceiptLineRow;
  wide: boolean;
  currency: string;
  open: boolean;
  onToggle: () => void;
  onOpenReceipt: () => void;
};

function LineRow({ item, wide, currency, open, onToggle, onOpenReceipt }: RowProps) {
  const { colors } = useAppTheme();
  const unit = unitLabel(item);

  return (
    <View style={{ borderBottomColor: colors.surfaceVariant, borderBottomWidth: 1 }}>
      <Pressable
        onPress={onToggle}
        // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §4).
        android_ripple={{ color: colors.ripple }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${itemLabel(item)}, ${item.receipt?.code ?? ''}`}
        style={wide ? styles.tableRow : styles.cardRow}
      >
        {wide ? <WideCells item={item} unit={unit} currency={currency} open={open} /> : <NarrowCells item={item} unit={unit} open={open} />}
      </Pressable>
      {open && item.id ? (
        <LineDrill lotId={item.id} unit={unit} currency={currency} unitCost={item.unit_cost ?? 0} expiresOn={item.expires_on} onOpenReceipt={onOpenReceipt} />
      ) : null}
    </View>
  );
}

type CellsProps = { item: ReceiptLineRow; unit: string; open: boolean };

function StatusCell({ item }: { item: ReceiptLineRow }) {
  const { colors } = useAppTheme();
  const status = statusOf(item);
  return (
    <Text variant="labelMedium" maxFontSizeMultiplier={1.3} style={{ color: colors[STATUS_TONE[status]] }}>
      {RECEIPT_STATUS_LABEL[status]}
    </Text>
  );
}

/** Remaining / received as a bar and a count. */
function RemainingBar({ item, unit }: { item: ReceiptLineRow; unit: string }) {
  const { colors } = useAppTheme();
  const received = item.qty_received ?? 0;
  const remaining = item.qty_remaining ?? 0;
  return (
    <View style={styles.barRow}>
      <View style={styles.barTrack}>
        <ProgressBar progress={received > 0 ? remaining / received : 0} color={colors.accent} style={styles.bar} />
      </View>
      <Text variant="bodySmall" maxFontSizeMultiplier={1.3}>{`${remaining} / ${received} ${unit}`}</Text>
    </View>
  );
}

const receivedOn = (item: ReceiptLineRow) => (item.receipt ? displayDate(item.receipt.received_on) : '—');

function WideCells({ item, unit, currency, open }: CellsProps & { currency: string }) {
  const { colors } = useAppTheme();
  const cost = (item.line_cost ?? 0) + (item.freight_share ?? 0);

  return (
    <>
      <View style={[styles.dateCell, styles.caretCell]}>
        <Icon source={open ? 'chevron-down' : 'chevron-right'} size={18} color={colors.onSurfaceMuted} />
        <View>
          <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
            {receivedOn(item)}
          </Text>
          <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
            {item.receipt?.code}
          </Text>
        </View>
      </View>
      <Text variant="bodyMedium" numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.supplierCell}>
        {item.receipt?.supplier?.name ?? '—'}
      </Text>
      <Text variant="titleMedium" numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.itemCell}>
        {itemLabel(item)}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.lotCell}>
        {item.code ?? '—'}
      </Text>
      <View style={styles.remainingCell}>
        <RemainingBar item={item} unit={unit} />
      </View>
      <View style={styles.statusCell}>
        <StatusCell item={item} />
      </View>
      <Text variant="bodyMedium" maxFontSizeMultiplier={1.3} style={styles.moneyCell}>
        {formatMoney(cost, currency)}
      </Text>
      <Text variant="bodyMedium" maxFontSizeMultiplier={1.3} style={styles.moneyCell}>
        {`${formatMoney(item.unit_cost ?? 0, currency)}/${unit}`}
      </Text>
      <Text variant="bodySmall" numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.locationCell}>
        {item.location ?? '—'}
      </Text>
    </>
  );
}

function NarrowCells({ item, unit, open }: CellsProps) {
  const { colors } = useAppTheme();

  return (
    <>
      <Icon source={open ? 'chevron-down' : 'chevron-right'} size={18} color={colors.onSurfaceMuted} />
      <View style={styles.cardText}>
        <Text variant="titleMedium" numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {itemLabel(item)}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {[item.receipt?.code, receivedOn(item), item.receipt?.supplier?.name].filter(Boolean).join(' · ')}
        </Text>
        <RemainingBar item={item} unit={unit} />
        <StatusCell item={item} />
      </View>
    </>
  );
}

type DrillProps = {
  lotId: string;
  unit: string;
  currency: string;
  unitCost: number;
  expiresOn: string | null;
  onOpenReceipt: () => void;
};

type LotPack = NonNullable<ReturnType<typeof useLotPacksQuery>['data']>[number];
type CaseGroup = { key: string; title: string; packs: LotPack[] };

/** Packs grouped by the case they came in, loose packs last. */
function caseGroups(packs: LotPack[]): CaseGroup[] {
  const groups = new Map<string, CaseGroup>();
  for (const pack of packs) {
    const key = pack.case?.id ?? 'loose';
    const title = pack.case ? `Case ${pack.case.code}${pack.case.sscc ? ` · SSCC ${pack.case.sscc}` : ''}` : 'Loose packs · no case';
    const group = groups.get(key) ?? { key, title, packs: [] };
    group.packs.push(pack);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => Number(a.key === 'loose') - Number(b.key === 'loose'));
}

/** A line's packs, case by case, then the note and the way to the receipt. */
function LineDrill({ lotId, unit, currency, unitCost, expiresOn, onOpenReceipt }: DrillProps) {
  const { colors } = useAppTheme();
  const packs = useLotPacksQuery({ lotId });

  return (
    <Drill>
      {packs.data ? (
        caseGroups(packs.data).map((group) => (
          <CaseBlock key={group.key} group={group} unit={unit} currency={currency} unitCost={unitCost} expiresOn={expiresOn} />
        ))
      ) : (
        <QueryState query={packs} offline="You're offline. Packs will load when you reconnect." failure="Couldn't load the packs. Try again." />
      )}
      <View style={styles.drillFoot}>
        <Text variant="bodySmall" style={[styles.note, { color: colors.onSurfaceMuted }]}>
          Receipt data is fixed as history; remaining counts update as units sell or are used. Unit cost is set per pack at receipt: as typed, or pack cost ÷ units per pack.
        </Text>
        <Button mode="outlined" compact onPress={onOpenReceipt}>
          Open receipt
        </Button>
      </View>
    </Drill>
  );
}

type CaseBlockProps = { group: CaseGroup; unit: string; currency: string; unitCost: number; expiresOn: string | null };

function CaseBlock({ group, unit, currency, unitCost, expiresOn }: CaseBlockProps) {
  const { colors } = useAppTheme();
  const [all, setAll] = useState(false);
  const balance = lotBalance(group);
  const total = group.packs.reduce((sum, pack) => sum + pack.units, 0);
  const shown = all ? group.packs : group.packs.slice(0, PACKS_SHOWN);
  const caption = (pack: LotPack) =>
    [pack.serial ? `SN ${pack.serial}` : 'No serial', expiresOn ? `exp ${displayDate(expiresOn)}` : null, `${formatMoney(unitCost, currency)}/${unit}`]
      .filter(Boolean)
      .join(' · ');

  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text variant="labelMedium">{group.title}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
          {`${balance.remaining}/${total} ${unit} left · ${group.packs.length} packs · ${balance.active} active · ${balance.open} open`}
        </Text>
      </View>
      {shown.map((pack) => (
        <PackRow key={pack.id} pack={pack} caption={caption(pack)} />
      ))}
      {!all && group.packs.length > PACKS_SHOWN ? (
        <Button mode="text" compact style={styles.more} onPress={() => setAll(true)}>
          {`+ ${group.packs.length - PACKS_SHOWN} more packs`}
        </Button>
      ) : null}
    </View>
  );
}

function Drill({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={[styles.drill, { backgroundColor: colors.surfaceMuted, borderTopColor: colors.outlineVariant }]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  caretCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateCell: { flex: 1.3, paddingRight: spacing.sm },
  supplierCell: { flex: 1.4, paddingRight: spacing.sm },
  itemCell: { flex: 1.8, paddingRight: spacing.sm },
  lotCell: { flex: 1.4, paddingRight: spacing.sm },
  remainingCell: { flex: 1.8, paddingRight: spacing.sm },
  statusCell: { flex: 0.9 },
  moneyCell: { flex: 1.1, paddingRight: spacing.sm },
  locationCell: { flex: 1.1 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  cardText: { flex: 1, gap: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barTrack: { flex: 1, minWidth: 40 },
  bar: { height: spacing.xs },
  drill: { gap: spacing.ms, borderTopWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  group: { gap: spacing.xs },
  groupHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs },
  more: { alignSelf: 'flex-start' },
  drillFoot: { gap: spacing.sm, alignItems: 'flex-start' },
  note: { maxWidth: 640 },
});
