import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { postgrestError } from '../../lib/errors';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { productGroupsKey } from '../product-groups/queries';
import { productsKey } from '../products/queries';
import { toReceiptPayload } from './schema';
import type { ReceiptValues } from './schema';

// Stock → Receipts (src/screens/stock/), the receipt wizard and the receipt detail. The client only
// reads these tables: their policies are select-only, and save_receipt / void_receipt are the writers
// (20260929100100_stock_ledger.sql §5, §6).
const stockReceiptsKey = {
  all: ['stock-receipts'],
  lines: (args: { merchantId: string }) => [...stockReceiptsKey.all, 'lines', args],
  lotPacks: (args: { lotId: string }) => [...stockReceiptsKey.all, 'lot-packs', args],
  detail: (args: { id: string }) => [...stockReceiptsKey.all, 'detail', args],
};

/**
 * The Stock screen's rows: one per receipt line (a lot that came on a receipt), newest first, with what it
 * has left. Inventory-added stock has no receipt and is not listed here.
 */
export function useReceiptLinesQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: stockReceiptsKey.lines({ merchantId }),
    queryFn: async () => {
      // ponytail: no pagination — every receipt line in one response. Add range() when a merchant's
      // history outgrows it.
      const { data } = await supabase
        .from('stock_lot_lines')
        .select(
          'id, receipt_id, code, qty_received, qty_remaining, packs_total, packs_open, line_cost, freight_share, unit_cost, location, expires_on, created_at, receipt:stock_receipts!stock_lots_receipt_fk(code, received_on, voided_at, supplier:suppliers!stock_receipts_supplier_fk(name)), product:products!stock_lots_product_fk(name, base_unit_name, pack_unit_name, group:product_groups!products_group_fk(name))'
        )
        .eq('merchant_id', merchantId)
        .eq('source', 'stock')
        .order('created_at', { ascending: false })
        .order('position')
        .throwOnError();

      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type ReceiptLineRow = NonNullable<ReturnType<typeof useReceiptLinesQuery>['data']>[number];

/** A receipt line's packs, with the case each sits in: the Stock row's drill. */
export function useLotPacksQuery({ lotId }: { lotId: string }) {
  return useQuery({
    queryKey: stockReceiptsKey.lotPacks({ lotId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_packs')
        .select('id, code, serial, units, qty_remaining, case:stock_cases!stock_packs_case_fk(id, code, sscc)')
        .eq('lot_id', lotId)
        .order('code')
        .throwOnError();
      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type ReceiptStatus = 'full' | 'partial' | 'depleted' | 'void';

export const RECEIPT_STATUS_LABEL = {
  full: 'Full',
  partial: 'Partial',
  depleted: 'Depleted',
  void: 'Void',
} satisfies Record<ReceiptStatus, string>;

/** Full while nothing has left, Depleted once everything has, Partial between. */
export function lineStatus(line: { voided: boolean; received: number; remaining: number }): ReceiptStatus {
  if (line.voided) return 'void';
  if (line.remaining <= 0) return 'depleted';
  return line.remaining >= line.received ? 'full' : 'partial';
}

type DetailSource = {
  voided_at: string | null;
  freight: number;
  lots: { line_cost: number | null; qty_received: number | null; packs: { qty_remaining: number }[] }[];
};

/** A whole receipt's status, from its lines' packs. */
export function receiptStatus(receipt: DetailSource): ReceiptStatus {
  return lineStatus({
    voided: receipt.voided_at !== null,
    received: receipt.lots.reduce((sum, lot) => sum + (lot.qty_received ?? 0), 0),
    remaining: receipt.lots.reduce((sum, lot) => sum + lot.packs.reduce((acc, pack) => acc + pack.qty_remaining, 0), 0),
  });
}

/** The landed total: every line's value plus shipping. */
export function receiptTotal(receipt: DetailSource) {
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
    case_rows:stock_cases!stock_cases_lot_fk(*),
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
    .order('code', { referencedTable: 'lots.case_rows' })
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
  const queryClient = useQueryClient();
  const invalidate = useInvalidateStock();

  return useMutation({
    mutationFn: async (receipt: ReceiptValues) => {
      // One RPC, one transaction: the header, any new item, every lot, case and pack, the receive
      // movements land together or not at all.
      const { data } = await supabase
        .rpc('save_receipt', { payload: toReceiptPayload(merchantId, receipt) })
        .throwOnError();
      return data;
    },
    // productGroupsKey too: a new item's variant group name makes a group row.
    onSuccess: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: productGroupsKey.all })]),
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
 * 20260929100100_stock_ledger.sql — `raise exception 'receipt_in_use'` arrives as the message.
 * A screen picks its copy from this and never renders the message itself.
 */
export function stockFailure(cause: Error | null) {
  const message = postgrestError(cause)?.message ?? null;
  return message !== null && /^[a-z_]+$/.test(message) ? message : null;
}
