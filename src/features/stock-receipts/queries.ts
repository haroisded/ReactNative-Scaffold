import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { postgrestError } from '../../lib/errors';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { productsKey } from '../products/queries';
import { toReceiptPayload } from './schema';
import type { ReceiptHeaderValues, ReceiptLineValues } from './schema';

// Stock → Receipts (src/screens/stock/), the receipt wizard and the receipt detail. The client only
// reads these tables: their policies are select-only, and save_receipt / void_receipt are the writers
// (20260928100200_stock_receipts.sql §4, §5).
const stockReceiptsKey = {
  all: ['stock-receipts'],
  list: (args: { merchantId: string }) => [...stockReceiptsKey.all, 'list', args],
  detail: (args: { id: string }) => [...stockReceiptsKey.all, 'detail', args],
};

export function useStockReceiptsQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: stockReceiptsKey.list({ merchantId }),
    queryFn: async () => {
      // ponytail: no pagination — every receipt in one response. Add range() when a merchant's history
      // outgrows it.
      const { data } = await supabase
        .from('stock_receipts')
        .select(
          'id, code, received_on, invoice_no, freight, voided_at, supplier:suppliers!stock_receipts_supplier_fk(name), lots:stock_lots!stock_lots_receipt_fk(line_cost, qty_received, qty_remaining)'
        )
        .eq('merchant_id', merchantId)
        .order('received_on', { ascending: false })
        .order('created_at', { ascending: false })
        .throwOnError();

      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type ReceiptListRow = NonNullable<ReturnType<typeof useStockReceiptsQuery>['data']>[number];

export type ReceiptStatus = 'full' | 'partial' | 'depleted' | 'void';

export const RECEIPT_STATUS_LABEL = {
  full: 'Full',
  partial: 'Partial',
  depleted: 'Depleted',
  void: 'Void',
} satisfies Record<ReceiptStatus, string>;

type StatusSource = {
  voided_at: string | null;
  freight: number;
  lots: { line_cost: number | null; qty_received: number | null; qty_remaining: number }[];
};

/** Full while nothing has left, Depleted once everything has, Partial between. */
export function receiptStatus(receipt: StatusSource): ReceiptStatus {
  if (receipt.voided_at) return 'void';
  const received = receipt.lots.reduce((sum, lot) => sum + (lot.qty_received ?? 0), 0);
  const remaining = receipt.lots.reduce((sum, lot) => sum + lot.qty_remaining, 0);
  if (remaining <= 0) return 'depleted';
  return remaining >= received ? 'full' : 'partial';
}

/** The landed total: every line's value plus freight. */
export function receiptTotal(receipt: StatusSource) {
  return receipt.lots.reduce((sum, lot) => sum + (lot.line_cost ?? 0), 0) + receipt.freight;
}

// Every embed names its key: stock_lots reaches products and stock_receipts, and stock_packs reaches
// both stock_lots and stock_cases, so an unnamed embed is ambiguous.
const DETAIL_SELECT = `
  *,
  supplier:suppliers!stock_receipts_supplier_fk(name, code),
  lots:stock_lots!stock_lots_receipt_fk(
    *,
    product:products!stock_lots_product_fk(name, sku, pack_unit_name, base_unit_name),
    cases:stock_cases!stock_cases_lot_fk(*),
    packs:stock_packs!stock_packs_lot_fk(*)
  )
`;

async function loadReceipt(id: string) {
  const { data } = await supabase
    .from('stock_receipts')
    .select(DETAIL_SELECT)
    .eq('id', id)
    // Embeds come back unordered; PostgREST orders them by alias path.
    .order('position', { referencedTable: 'lots' })
    .order('code', { referencedTable: 'lots.cases' })
    .order('code', { referencedTable: 'lots.packs' })
    .maybeSingle()
    .throwOnError();
  return data;
}

export type ReceiptDetail = NonNullable<Awaited<ReturnType<typeof loadReceipt>>>;

export function useStockReceiptQuery({ id }: { id: string }) {
  return useQuery({
    queryKey: stockReceiptsKey.detail({ id }),
    // Null for an id RLS hides; the screen renders "no longer available".
    queryFn: () => loadReceipt(id),
    staleTime: STALE.SECONDS.THIRTY,
  });
}

/**
 * Every stock writer moves quantities, costs and codes, so everything that reads them refetches:
 * receipts here, and products — whose key the item's lots and movement history also sit under
 * (stock-movements/queries.ts).
 */
export function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: stockReceiptsKey.all }),
      queryClient.invalidateQueries({ queryKey: productsKey.all }),
    ]);
}

export function useSaveReceiptMutation({ merchantId }: { merchantId: string }) {
  const invalidate = useInvalidateStock();

  return useMutation({
    mutationFn: async ({ header, lines }: { header: ReceiptHeaderValues; lines: ReceiptLineValues[] }) => {
      // One RPC, one transaction: the header, every lot, case and pack, the receive movements and the
      // freight split land together or not at all.
      const { data } = await supabase
        .rpc('save_receipt', { payload: toReceiptPayload(merchantId, header, lines) })
        .throwOnError();
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useVoidReceiptMutation() {
  const invalidate = useInvalidateStock();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await supabase.rpc('void_receipt', { p_receipt: id, p_reason: reason }).throwOnError();
    },
    onSuccess: invalidate,
  });
}

/**
 * The exception a writer raised, when it is one of the named refusals in
 * 20260928100200_stock_receipts.sql — `raise exception 'receipt_has_movements'` arrives as the message.
 * A screen picks its copy from this and never renders the message itself.
 */
export function stockFailure(cause: Error | null) {
  const message = postgrestError(cause)?.message ?? null;
  return message !== null && /^[a-z_]+$/.test(message) ? message : null;
}
