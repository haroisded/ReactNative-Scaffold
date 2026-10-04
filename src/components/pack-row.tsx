import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PACK_STATUS_LABEL, packStatus } from '../features/stock-movements/queries';
import type { PackStatus } from '../features/stock-movements/queries';
import { useAppTheme } from '../lib/theme';
import { radius, spacing } from '../themes';
import { ProgressBar } from './progress-bar';
import { Text } from './text';

// One physical pack, as the Stock row's drill and the Inventory row's drill both draw it
// (.claude/inventory-stock/Stock_Receiving.html, Inventory.html): code, a caption, its status, and a bar of
// what is left. Colours are instruction_mds/frontend.md §2.4 status scale: Open is the accent — the
// pack being drawn from — Sealed is ink, Empty is faint.

const STATUS_TONE = {
  sealed: 'onSurface',
  open: 'accent',
  empty: 'onSurfaceFaint',
} satisfies Record<PackStatus, 'onSurface' | 'accent' | 'onSurfaceFaint'>;

type Props = {
  pack: { code: string; units: number; qty_remaining: number };
  /** "Case CS-0003 · rcvd 09/20/2026 · ₱4.17/tablet" — the line under the code. */
  caption: string;
  /** The pack the next draw takes. */
  nextPick?: boolean;
  /** A row action, like the Inventory detail's ⋮ menu. */
  action?: ReactNode;
};

export function PackRow({ pack, caption, nextPick, action }: Props) {
  const { colors } = useAppTheme();
  const status = packStatus(pack);
  const share = pack.units > 0 ? pack.qty_remaining / pack.units : 0;

  return (
    <View
      style={[
        styles.row,
        { borderColor: colors.outlineVariant, backgroundColor: colors.surface },
        status === 'empty' && styles.faded,
      ]}
    >
      <View style={styles.text}>
        <View style={styles.headline}>
          <Text variant="titleMedium">
            {pack.code}
          </Text>
          <Text variant="labelMedium" style={{ color: colors[STATUS_TONE[status]] }}>
            {PACK_STATUS_LABEL[status]}
          </Text>
          {nextPick ? <NextPickBadge /> : null}
        </View>
        <Text variant="bodySmall" numberOfLines={2} style={{ color: colors.onSurfaceMuted }}>
          {caption}
        </Text>
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <ProgressBar progress={share} color={colors.accent} style={styles.bar} />
          </View>
          <Text variant="bodySmall">
            {`${pack.qty_remaining}/${pack.units}`}
          </Text>
        </View>
      </View>
      {action}
    </View>
  );
}

/** "Next pick": the pack the pick order (stock_pick_queue) draws from next. The accent on the accent's own fill. */
function NextPickBadge() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
      <Text variant="labelMedium" style={{ color: colors.onAccent }}>
        Next pick
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
  },
  faded: { opacity: 0.5 },
  text: { flex: 1, gap: spacing.xs },
  headline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barTrack: { flex: 1 },
  bar: { height: spacing.xs, borderRadius: radius.sm },
  badge: { borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});
