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
  open: 'Opened',
  adjust: 'Adjusted',
  write_off: 'Written off',
  return_supplier: 'Returned',
  void: 'Voided',
} satisfies Record<MovementKind, string>;

// Where an item's stock is and how it got there: the Inventory detail (src/screens/inventory-detail/).
// Keyed under products, so every stock writer — which already invalidates products because
// qty_on_hand moves — refetches these too, and nothing has to import this file to do it.
const stockMovementsKey = {
  all: [...productsKey.all, 'stock'],
  onHand: (args: { productId: string }) => [...stockMovementsKey.all, 'on-hand', args],
  history: (args: { productId: string }) => [...stockMovementsKey.all, 'history', args],
};

async function loadItemStock(productId: string) {
  // Voided receipts' lots are zeroed by void_receipt and stay only as history, so they are left out.
  const { data } = await supabase
    .from('stock_lots')
    .select(
      '*, receipt:stock_receipts!stock_lots_receipt_fk!inner(code, received_on, voided_at, supplier_id), cases:stock_cases!stock_cases_lot_fk(*), packs:stock_packs!stock_packs_lot_fk(*)'
    )
    .eq('product_id', productId)
    .is('receipt.voided_at', null)
    .order('expires_on', { nullsFirst: false })
    .order('created_at')
    .throwOnError();

  return data.map((lot) => ({
    ...lot,
    cases: [...lot.cases].sort((a, b) => a.code.localeCompare(b.code)),
    packs: [...lot.packs].sort((a, b) => a.code.localeCompare(b.code)),
  }));
}

export function useItemStockQuery({ productId }: { productId: string }) {
  return useQuery({
    queryKey: stockMovementsKey.onHand({ productId }),
    queryFn: () => loadItemStock(productId),
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export function useMovementHistoryQuery({ productId }: { productId: string }) {
  return useQuery({
    queryKey: stockMovementsKey.history({ productId }),
    queryFn: async () => {
      // ponytail: the latest 200 only. Add range() and "Load more" when an item's history needs it.
      const { data } = await supabase
        .from('stock_movements')
        .select(
          'id, kind, qty, reason, note, override, ref, created_at, lot:stock_lots!stock_movements_lot_fk(code), case:stock_cases!stock_movements_case_fk(code), pack:stock_packs!stock_movements_pack_fk(code, serial)'
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

/** Where a movement draws from: a lot, one of its cases, or one pack. */
export type MovementTarget = { lotId: string } | { caseId: string } | { packId: string };

export function useRecordMovementMutation() {
  const invalidate = useInvalidateStock();

  return useMutation({
    mutationFn: async ({ target, values }: { target: MovementTarget; values: MovementValues }) => {
      // record_stock_movement locks the row, checks what is left and writes the movement in one
      // transaction (20260928100200_stock_receipts.sql §6); the client never touches the counts.
      await supabase.rpc('record_stock_movement', { payload: toMovementPayload(target, values) }).throwOnError();
    },
    onSuccess: invalidate,
  });
}
