import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { expiryState } from '../features/products/stock-item';
import { lotBalance } from '../features/stock-movements/queries';
import type { StockLot, StockPack } from '../features/stock-movements/queries';
import { localToday } from '../features/stock-receipts/schema';
import { formatMoney } from '../lib/money';
import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { Button } from './button';
import { displayDate } from './form-fields';
import { PackRow } from './pack-row';
import { ExpiryBadge } from './product-badges';
import { Text } from './text';

// An item's stock, lot by lot and pack by pack (.claude/inventory-stock/Inventory.html's drill): each lot's
// number, expiry and what is left, then its packs with the one the next draw takes marked. The Inventory
// list's row opens onto it, and the Inventory detail lists it with a menu on each pack.

/** Packs shown per lot before "+ N more packs". */
const PACKS_SHOWN = 4;

type Props = {
  lots: StockLot[];
  /** The pack the next draw takes (stock_pick_queue), marked Next pick. */
  nextPick: string | null;
  /** Base unit name, for "12 tablets left". */
  unit: string;
  currency: string;
  expiryAlertDays: number | null;
  showEmpty: boolean;
  /** A row action for a pack, like the detail's ⋮ menu. */
  packAction?: (pack: StockPack, lot: StockLot) => ReactNode;
};

export function LotDrill({ lots, nextPick, unit, currency, expiryAlertDays, showEmpty, packAction }: Props) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState<string[]>([]);
  const today = localToday();
  const shown = lots.filter((lot) => showEmpty || lotBalance(lot).remaining > 0);

  if (shown.length === 0) {
    return (
      <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
        {lots.length > 0 ? 'Every pack is used up. Turn on Show empty packs to see them.' : 'No packs yet — stock arrives through a Stock receipt, or is added here.'}
      </Text>
    );
  }

  return (
    <View style={styles.root}>
      {shown.map((lot) => {
        const balance = lotBalance(lot);
        const packs = [...lot.packs].filter((pack) => showEmpty || pack.qty_remaining > 0).sort(packOrder);
        const all = expanded.includes(lot.id) || packs.length <= PACKS_SHOWN + 1;
        const visible = all ? packs : packs.slice(0, PACKS_SHOWN);
        const received = lot.receipt?.received_on ?? lot.created_at.slice(0, 10);
        return (
          <View key={lot.id} style={styles.lot}>
            <View style={styles.lotHead}>
              <View style={styles.lotTitle}>
                <Text variant="titleMedium" maxFontSizeMultiplier={1.3}>
                  {lot.code}
                </Text>
                <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
                  {lot.expires_on ? `exp ${displayDate(lot.expires_on)}` : 'no expiry'}
                </Text>
                <ExpiryBadge state={expiryState(lot.expires_on, expiryAlertDays, today)} />
                {lot.source === 'inventory' ? (
                  <Text variant="labelMedium" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
                    Added in Inventory
                  </Text>
                ) : null}
              </View>
              <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
                {`${balance.remaining} ${unit} left · ${balance.active} active${balance.empty ? ` · ${balance.empty} empty` : ''}`}
              </Text>
            </View>
            {visible.map((pack) => (
              <PackRow
                key={pack.id}
                pack={pack}
                nextPick={pack.id === nextPick}
                caption={[
                  caseLabel(lot, pack),
                  `rcvd ${displayDate(received)}`,
                  `${formatMoney(lot.unit_cost, currency)}/${unit}`,
                  pack.serial ? `SN ${pack.serial}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                action={packAction?.(pack, lot)}
              />
            ))}
            {!all ? (
              <Button mode="text" compact style={styles.more} onPress={() => setExpanded((ids) => [...ids, lot.id])}>
                {`+ ${packs.length - PACKS_SHOWN} more packs`}
              </Button>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const caseLabel = (lot: StockLot, pack: StockPack) => {
  const found = lot.case_rows.find((row) => row.id === pack.case_id);
  return found ? `Case ${found.code}` : 'No case';
};

/** Live packs before empty ones, then the pick order within a lot: open first, fewest left, pack code. */
function packOrder(a: StockPack, b: StockPack) {
  const live = Number(b.qty_remaining > 0) - Number(a.qty_remaining > 0);
  if (live !== 0) return live;
  const open = Number(b.qty_remaining < b.units) - Number(a.qty_remaining < a.units);
  if (open !== 0) return open;
  if (a.qty_remaining !== b.qty_remaining) return a.qty_remaining - b.qty_remaining;
  return a.code.localeCompare(b.code);
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  lot: { gap: spacing.xs },
  lotHead: { gap: spacing.xs, paddingVertical: spacing.xs },
  lotTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  more: { alignSelf: 'flex-start' },
});
