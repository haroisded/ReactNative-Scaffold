import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { postgrestError } from '../../lib/errors';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { productsKey } from '../products/queries';
import { stockFailure, useInvalidateStock } from '../stock-receipts/queries';
import type { CartLine } from './cart';

// The Register and Receipts. Sales are read-only to the client: record_sale and void_sale are the
// writers (20260930110000_sales.sql). What the Register can sell and how much is left sit under the
// products key, so every stock writer — which already invalidates products — refreshes the tiles too.
const salesKey = {
  all: ['sales'],
  list: (args: { merchantId: string }) => [...salesKey.all, 'list', args],
  detail: (args: { id: string }) => [...salesKey.all, 'detail', args],
};

const registerKey = {
  products: (args: { merchantId: string }) => [...productsKey.all, 'register', args],
  stock: (args: { merchantId: string }) => [...productsKey.all, 'register-stock', args],
};

/** What the Register sells: the Products screen's published rows, the same test record_sale applies. */
export function useRegisterProductsQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: registerKey.products({ merchantId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select(
          'id, name, sku, barcode, selling_price, source_item_id, tax_class:tax_classes!products_tax_class_fk(rate), components:product_components!product_components_product_fk(component_id, unit)'
        )
        .eq('merchant_id', merchantId)
        .eq('type', 'flat')
        .eq('status', 'active')
        .eq('sold_directly', true)
        .order('name')
        .throwOnError();
      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type RegisterProduct = NonNullable<ReturnType<typeof useRegisterProductsQuery>['data']>[number];

/**
 * What each stock item can still sell, from the pick order (stock_pick_queue skips expired packs, as
 * draw_stock does): base units across every live pack, and sealed packs for a sale by the pack.
 */
export function useDrawableStockQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: registerKey.stock({ merchantId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_pick_queue')
        .select('product_id, qty_remaining, whole_rank')
        .eq('merchant_id', merchantId)
        .throwOnError();

      const drawable = new Map<string, { base: number; packs: number }>();
      for (const row of data) {
        if (row.product_id === null) continue;
        const entry = drawable.get(row.product_id) ?? { base: 0, packs: 0 };
        entry.base += row.qty_remaining ?? 0;
        if (row.whole_rank !== null) entry.packs += 1;
        drawable.set(row.product_id, entry);
      }
      return drawable;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

/**
 * How many of a face the shelf still holds — sealed packs for a pack face, base units for the other.
 * Null for anything that is not a face: a recipe's count depends on every component, and a plain product
 * draws nothing.
 */
export function faceStock(product: RegisterProduct, drawable: Map<string, { base: number; packs: number }> | undefined) {
  const own = product.components.find((component) => component.component_id === product.source_item_id);
  if (product.source_item_id === null || own === undefined || drawable === undefined) return null;
  const entry = drawable.get(product.source_item_id);
  return own.unit === 'pack' ? (entry?.packs ?? 0) : (entry?.base ?? 0);
}

export function useSalesQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: salesKey.list({ merchantId }),
    queryFn: async () => {
      // ponytail: no pagination — every sale in one response. Add range() when a merchant's history
      // outgrows it.
      const { data } = await supabase
        .from('sales')
        .select('id, code, total, voided_at, created_at, lines:sale_lines!sale_lines_sale_fk(qty)')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .throwOnError();
      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type SaleRow = NonNullable<ReturnType<typeof useSalesQuery>['data']>[number];

async function loadSale(id: string) {
  const { data: sale } = await supabase
    .from('sales')
    .select('*, lines:sale_lines!sale_lines_sale_fk(*)')
    .eq('id', id)
    .order('position', { referencedTable: 'lines' })
    .maybeSingle()
    .throwOnError();
  if (sale === null) return null;

  // Every movement the sale made carries its code as ref, and so does each one voiding it.
  const { data: movements } = await supabase
    .from('stock_movements')
    .select(
      'id, kind, qty, created_at, pack:stock_packs!stock_movements_pack_fk(code), product:products!stock_movements_product_fk(name, base_unit_name)'
    )
    .eq('merchant_id', sale.merchant_id)
    .eq('ref', sale.code)
    .in('kind', ['sale', 'consume', 'void'])
    .order('created_at')
    .throwOnError();

  return { ...sale, movements };
}

export function useSaleQuery({ id }: { id: string }) {
  return useQuery({
    queryKey: salesKey.detail({ id }),
    // Null for an id RLS hides; the screen renders "no longer available".
    queryFn: () => loadSale(id),
    staleTime: STALE.SECONDS.THIRTY,
  });
}

function useInvalidateSales() {
  const queryClient = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: salesKey.all }), invalidateStock()]);
}

export type RecordedSale = { id: string; code: string; total: number; tax_total: number; change_due: number };

export function useRecordSaleMutation({ merchantId }: { merchantId: string }) {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: async (sale: { clientKey: string; tendered: number; lines: CartLine[] }) => {
      // One RPC, one transaction: the sale, its lines and every stock draw land together or not at all.
      // Prices are the server's; the lines send only what and how many.
      const { data } = await supabase
        .rpc('record_sale', {
          payload: {
            merchant_id: merchantId,
            client_key: sale.clientKey,
            tendered: sale.tendered,
            lines: sale.lines.map((line) => ({ product_id: line.productId, qty: line.qty })),
          },
        })
        .throwOnError();
      // SAFETY: record_sale returns jsonb_build_object(id, code, total, tax_total, change_due) on every
      // path that does not raise (20260930110000_sales.sql §2); the generated type can only say Json.
      return data as RecordedSale;
    },
    onSuccess: invalidate,
  });
}

export function useVoidSaleMutation() {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await supabase.rpc('void_sale', { p_sale: id, p_reason: reason }).throwOnError();
    },
    onSuccess: invalidate,
  });
}

/** The named refusal record_sale or void_sale raised, and the product or item it names, if any. */
export function saleFailure(cause: Error | null) {
  const name = stockFailure(cause);
  return name === null ? null : { name, subject: postgrestError(cause)?.details || null };
}

/** A new idempotency key for record_sale: one per sale, kept across retries of that sale. */
export const newClientKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** "30 Sep 2026, 2:30 PM" for a sale's created_at, in the device's zone and locale. */
export const saleTime = (createdAt: string) =>
  new Date(createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
