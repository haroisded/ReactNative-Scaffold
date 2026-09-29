import { useMutation, useQuery } from '@tanstack/react-query';

import type { Database } from '../../lib/database.types';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { productsKey } from '../products/queries';
import { useInvalidateStock } from '../stock-receipts/queries';
import { toMovementPayload } from './schema';
import type { MovementValues } from './schema';

type MovementKind = Database['public']['Enums']['stock_movement_kind'];

export const MOVEMENT_KIND_LABEL = {
  receive: 'Received',
  sale: 'Sold',
  consume: 'Used',
  adjust: 'Adjusted',
  write_off: 'Written off',
  return_supplier: 'Returned',
  void: 'Voided',
} satisfies Record<MovementKind, string>;

// Where an item's stock is and how it got there: the Inventory list's lot drill and the Inventory
// detail. Keyed under products, so every stock writer — which already invalidates products because
// qty_on_hand moves — refetches these too, and nothing has to import this file to do it.
const stockMovementsKey = {
  all: [...productsKey.all, 'stock'],
  onHand: (args: { productId: string }) => [...stockMovementsKey.all, 'on-hand', args],
  history: (args: { productId: string }) => [...stockMovementsKey.all, 'history', args],
};

async function loadItemStock(productId: string) {
  // A lot added on the Inventory screen has no receipt, so the receipt embed is a left join. A voided
  // receipt's packs are all zero, and the screen hides empty lots unless asked. What a lot has left is
  // the sum of its packs (lotRemaining), which are all here anyway.
  const [lots, queue] = await Promise.all([
    supabase
      .from('stock_lots')
      .select(
        '*, receipt:stock_receipts!stock_lots_receipt_fk(code, received_on, voided_at, supplier_id), case_rows:stock_cases!stock_cases_lot_fk(id, code, sscc), packs:stock_packs!stock_packs_lot_fk(*)'
      )
      .eq('product_id', productId)
      .order('expires_on', { nullsFirst: false })
      .order('created_at')
      // Embeds come back unordered; PostgREST orders them by alias.
      .order('code', { referencedTable: 'packs' })
      .throwOnError(),
    // The pick order lives in one place, the stock_pick_queue view (20260929100100_stock_ledger.sql §3).
    supabase
      .from('stock_pick_queue')
      .select('pack_id, pick_rank, whole_rank')
      .eq('product_id', productId)
      .or('pick_rank.eq.1,whole_rank.eq.1')
      .throwOnError(),
  ]);

  return {
    lots: lots.data,
    /** The pack a loose-unit draw opens next, and the sealed pack a by-the-pack draw takes next. */
    nextPick: {
      base: queue.data.find((row) => row.pick_rank === 1)?.pack_id ?? null,
      pack: queue.data.find((row) => row.whole_rank === 1)?.pack_id ?? null,
    },
  };
}

export type ItemStock = Awaited<ReturnType<typeof loadItemStock>>;
export type StockLot = ItemStock['lots'][number];
export type StockPack = StockLot['packs'][number];

export function useItemStockQuery({ productId }: { productId: string }) {
  return useQuery({
    queryKey: stockMovementsKey.onHand({ productId }),
    queryFn: () => loadItemStock(productId),
    staleTime: STALE.SECONDS.THIRTY,
  });
}

/** Base units a lot still holds, and how many of its packs are live and open. */
export function lotBalance(lot: { packs: { units: number; qty_remaining: number }[] }) {
  const live = lot.packs.filter((pack) => pack.qty_remaining > 0);
  return {
    remaining: live.reduce((sum, pack) => sum + pack.qty_remaining, 0),
    active: live.length,
    open: live.filter((pack) => pack.qty_remaining < pack.units).length,
    empty: lot.packs.length - live.length,
  };
}

export type PackStatus = 'sealed' | 'open' | 'empty';

/** Sealed while nothing has left the pack, open below that, empty at zero. Never stored. */
export function packStatus(pack: { units: number; qty_remaining: number }): PackStatus {
  if (pack.qty_remaining <= 0) return 'empty';
  return pack.qty_remaining < pack.units ? 'open' : 'sealed';
}

export const PACK_STATUS_LABEL = { sealed: 'Sealed', open: 'Open', empty: 'Empty' } satisfies Record<PackStatus, string>;

export function useMovementHistoryQuery({ productId }: { productId: string }) {
  return useQuery({
    queryKey: stockMovementsKey.history({ productId }),
    queryFn: async () => {
      // ponytail: the latest 200 only. Add range() and "Load more" when an item's history needs it.
      const { data } = await supabase
        .from('stock_movements')
        .select(
          'id, kind, qty, reason, note, ref, created_at, lot:stock_lots!stock_movements_lot_fk(code, location), pack:stock_packs!stock_movements_pack_fk(code, serial)'
        )
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(200)
        .throwOnError();

      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type MovementRow = NonNullable<ReturnType<typeof useMovementHistoryQuery>['data']>[number];

export function useRecordMovementMutation() {
  const invalidate = useInvalidateStock();

  return useMutation({
    mutationFn: async ({ packId, values }: { packId: string; values: MovementValues }) => {
      // record_stock_movement locks the pack, checks what is left and writes the movement in one
      // transaction (20260929100100_stock_ledger.sql §5); the client never touches the counts.
      await supabase.rpc('record_stock_movement', { payload: toMovementPayload(packId, values) }).throwOnError();
    },
    onSuccess: invalidate,
  });
}
