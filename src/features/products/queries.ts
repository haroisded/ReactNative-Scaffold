import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables } from '../../lib/database.types';
import { postgrestError } from '../../lib/errors';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { productGroupsKey } from '../product-groups/queries';
import type { ResourceScope } from './resources';
import type { StockRole } from './stock-item';
import { fromProductDetail, toSavePayload } from './schema';
import type { ProductFormValues, ProductStatus, ProductType } from './schema';
import { toStockItemPayload } from './stock-item';
import type { StockItemValues } from './stock-item';

export type Product = Tables<'products'>;

export type ProductSort = 'name' | 'price' | 'stock' | 'created';

export type ProductFilters = {
  merchantId: string;
  /** Which Resources screen is asking. A list never shows another screen's items. */
  scope: ResourceScope;
  search: string;
  categoryId: string | null;
  type: ProductType | null;
  /** Inventory only: Sellable / Component / Both. */
  stockRole: StockRole | null;
  /** 'all' is every status except archived — archived products leave the list until asked for. */
  status: ProductStatus | 'all';
  lowStockOnly: boolean;
  sort: ProductSort;
};

export const productsKey = {
  all: ['products'],
  lists: () => [...productsKey.all, 'list'],
  list: (filters: ProductFilters) => [...productsKey.lists(), filters],
  details: () => [...productsKey.all, 'detail'],
  detail: (args: { id: string }) => [...productsKey.details(), args],
  options: (args: { merchantId: string }) => [...productsKey.all, 'options', args],
  stockOptions: (args: { merchantId: string }) => [...productsKey.all, 'stock-options', args],
  addables: (args: { merchantId: string }) => [...productsKey.all, 'addables', args],
  sourceItem: (args: { id: string }) => [...productsKey.all, 'source-item', args],
  faces: (args: { itemId: string }) => [...productsKey.all, 'faces', args],
};

// ilike's own wildcards first, then PostgREST's quoting: the search box's text is a literal, so a
// typed "%" or "_" must not match everything, and a typed comma or quote must not break out of the
// or() filter it is interpolated into.
function ilikeValue(search: string) {
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  return `"${pattern.replace(/["\\]/g, '\\$&')}"`;
}

export function useProductsQuery(filters: ProductFilters) {
  return useQuery({
    queryKey: productsKey.list(filters),
    queryFn: async () => {
      // ponytail: no pagination — one request returns the whole filtered catalogue. Add range() and
      // useInfiniteQuery when a merchant's catalogue outgrows a single response.
      let query = supabase
        .from('products')
        // group, lots and packs are the Inventory row's (src/screens/product-list/inventory-rows.tsx): the
        // variant group it is listed under, where its stock came from (the Source filter), and its live
        // packs — how many, how many open, and which lots' expiry the badge reads. Other screens' rows have
        // none of them, and the embeds come back null and empty.
        .select(
          '*, category:product_categories!products_category_fk(name), group:product_groups!products_group_fk(name), lots:stock_lots!stock_lots_product_fk(id, source, expires_on), packs:stock_packs!stock_packs_product_fk(lot_id, units, qty_remaining)'
        )
        .gt('packs.qty_remaining', 0)
        // Scoping to this system, not security — see the note in categories/queries.ts.
        .eq('merchant_id', filters.merchantId)
        // …and to this Resources screen. products.scope is written by the database from the type
        //, so this cannot disagree with what the row is.
        .eq('scope', filters.scope);

      const search = filters.search.trim();
      if (search !== '') {
        const value = ilikeValue(search);
        // ponytail: the row's own text columns. The group's name and the attributes array are not reached
        // by or(); searching them needs a generated search column.
        query = query.or(
          `name.ilike.${value},sku.ilike.${value},barcode.ilike.${value},storage_location.ilike.${value},description.ilike.${value},internal_notes.ilike.${value}`
        );
      }
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.stockRole) query = query.eq('stock_role', filters.stockRole);
      query = filters.status === 'all' ? query.neq('status', 'archived') : query.eq('status', filters.status);
      // is_low_stock is a generated column because PostgREST cannot compare two columns in a filter.
      if (filters.lowStockOnly) query = query.eq('is_low_stock', true);

      const ordered =
        filters.sort === 'price'
          ? query.order('selling_price', { nullsFirst: false })
          : filters.sort === 'stock'
            ? query.order('qty_on_hand', { nullsFirst: false })
            : filters.sort === 'created'
              ? query.order('created_at', { ascending: false })
              : query.order('name');

      // throwOnError() on every call in this file, so a failure rejects with a real PostgrestError and
      // saveFailure() / deleteRefusal() can read its code — see the note in merchants/queries.ts.
      const { data } = await ordered.throwOnError();
      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
    // Every keystroke in search and every filter is a new key. Without this the list would blank to
    // a spinner between each one; with it the previous rows stay until the new ones land.
    placeholderData: keepPreviousData,
  });
}

export type ProductListRow = NonNullable<ReturnType<typeof useProductsQuery>['data']>[number];

// Every embed names its foreign key. products has three relationships to product_categories and two
// to itself through product_components, so an unnamed embed is ambiguous and PostgREST refuses it.
const DETAIL_SELECT = `
  *,
  category:product_categories!products_category_fk(name),
  subcategory:product_categories!products_subcategory_fk(name),
  tax_class:tax_classes!products_tax_class_fk(name, rate),
  supplier:suppliers!products_supplier_fk(name, contact_person),
  rate_tiers:product_rate_tiers!product_rate_tiers_product_fk(*),
  operating_hours:product_operating_hours!product_operating_hours_product_fk(*),
  variant_attributes:product_variant_attributes!product_variant_attributes_product_fk(*),
  variants:product_variants!product_variants_product_fk(*),
  components:product_components!product_components_product_fk(
    *,
    component:products!product_components_component_fk(id, name, sku, cost_price, uom)
  ),
  custom_fields:product_custom_fields!product_custom_fields_product_fk(*)
`;

const byPosition = <Row extends { position: number }>(rows: Row[]) => [...rows].sort((a, b) => a.position - b.position);

/** The body of the detail query, named so its return type can be exported. Called from queryFn only. */
async function loadProduct(id: string) {
  const { data } = await supabase.from('products').select(DETAIL_SELECT).eq('id', id).maybeSingle().throwOnError();
  if (!data) return null;

  // Embedded rows arrive in no guaranteed order; position is the order the merchant arranged them in.
  return {
    ...data,
    rate_tiers: byPosition(data.rate_tiers),
    operating_hours: [...data.operating_hours].sort((a, b) => a.weekday - b.weekday),
    variant_attributes: byPosition(data.variant_attributes),
    variants: byPosition(data.variants),
    components: byPosition(data.components),
    custom_fields: byPosition(data.custom_fields),
  };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof loadProduct>>>;

export function useProductQuery({ id }: { id: string }) {
  return useQuery({
    queryKey: productsKey.detail({ id }),
    // Null for an id RLS hides or that was deleted; the screen renders "no longer available".
    queryFn: () => loadProduct(id),
    staleTime: STALE.SECONDS.THIRTY,
  });
}

/** The component picker's candidates: every product in this system that is not archived. */
export function useProductOptionsQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: productsKey.options({ merchantId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, cost_price, uom, type')
        .eq('merchant_id', merchantId)
        .neq('status', 'archived')
        .order('name')
        .throwOnError();

      return data;
    },
    staleTime: STALE.MINUTES.ONE,
  });
}

/** The receipt line's item picker: every stock item not archived, with what a line needs to count it. */
export function useStockItemOptionsQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: productsKey.stockOptions({ merchantId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select(
          'id, name, sku, conversion_factor, pack_unit_name, base_unit_name, attributes, sell_by, stock_role, perishable, reorder_threshold, storage_location'
        )
        .eq('merchant_id', merchantId)
        .eq('type', 'stock')
        .neq('status', 'archived')
        .order('name')
        .throwOnError();

      return data;
    },
    staleTime: STALE.MINUTES.ONE,
  });
}

export type StockItemOption = NonNullable<ReturnType<typeof useStockItemOptionsQuery>['data']>[number];

/**
 * The Inventory list's inline Type menu. A plain update: products_sync_register_faces makes, deletes or
 * archives the item's Products drafts to match (20260929100000_stock_items.sql §6).
 */
export function useSetStockRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stockRole }: { id: string; stockRole: StockRole }) => {
      await supabase.from('products').update({ stock_role: stockRole }).eq('id', id).throwOnError();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}

type FaceUnit = 'pack' | 'piece';

/** The Sell By units an item wants a Products draft for. */
function wantedUnits(sellBy: StockItemOption['sell_by']): FaceUnit[] {
  if (sellBy === 'both') return ['pack', 'piece'];
  return sellBy === 'base' ? ['piece'] : ['pack'];
}

/**
 * Products → "Add from Inventory": Sellable and Both items missing a draft or published face for a unit
 * they sell by. A face someone deleted, or one archived, is what this brings back.
 */
export function useInventoryAddablesQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: productsKey.addables({ merchantId }),
    queryFn: async () => {
      // Two reads rather than an embed: products points at itself through source_item_id, and an embed on
      // a self-referencing key reads in only one direction.
      const [items, faces] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sku, sell_by, pack_unit_name, base_unit_name')
          .eq('merchant_id', merchantId)
          .eq('type', 'stock')
          .neq('status', 'archived')
          .in('stock_role', ['sellable', 'both'])
          .order('name')
          .throwOnError(),
        supabase
          .from('products')
          .select('source_item_id, components:product_components!product_components_product_fk(unit)')
          .eq('merchant_id', merchantId)
          .not('source_item_id', 'is', null)
          .neq('status', 'archived')
          .throwOnError(),
      ]);

      const have = new Set(faces.data.flatMap((face) => face.components.map((c) => `${face.source_item_id}:${c.unit}`)));
      return items.data
        .map((item) => ({ ...item, missing: wantedUnits(item.sell_by).filter((unit) => !have.has(`${item.id}:${unit}`)) }))
        .filter((item) => item.missing.length > 0);
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

export type InventoryAddable = NonNullable<ReturnType<typeof useInventoryAddablesQuery>['data']>[number];

/** Makes an item's missing Products drafts (ensure_register_faces), and returns the drafts it now has. */
export function useEnsureRegisterFacesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      await supabase.rpc('ensure_register_faces', { p_item: itemId }).throwOnError();
      const { data } = await supabase
        .from('products')
        .select('id, name, status')
        .eq('source_item_id', itemId)
        .neq('status', 'archived')
        .order('name')
        .throwOnError();
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}

/** A Products draft's Inventory item: the name its "From Inventory" line shows. */
export function useSourceItemQuery({ id }: { id: string | null }) {
  return useQuery({
    queryKey: productsKey.sourceItem({ id: id ?? '' }),
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, sku').eq('id', id ?? '').maybeSingle().throwOnError();
      return data;
    },
    enabled: id !== null,
    staleTime: STALE.MINUTES.ONE,
  });
}

/** An item's Products drafts, for the Inventory detail's "Selling as" block. */
export function useItemFacesQuery({ itemId }: { itemId: string }) {
  return useQuery({
    queryKey: productsKey.faces({ itemId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, status, selling_price')
        .eq('source_item_id', itemId)
        .neq('status', 'archived')
        .order('name')
        .throwOnError();
      return data;
    },
    staleTime: STALE.SECONDS.THIRTY,
  });
}

/**
 * The copy for a failed save. The three cases a merchant can cause and fix get their own sentence;
 * everything else is the generic line, offline-aware through failureMessage at the call site.
 */
export function saveFailure(cause: Error | null): 'sku' | 'cycle' | 'variant' | null {
  const error = postgrestError(cause);
  if (!error) return null;
  if (error.code === '23505' && error.message.includes('products_sku_unique')) return 'sku';
  // Two attribute values typed the same produce two matrix rows with one label.
  if (error.code === '23505' && error.message.includes('product_variants_label_unique')) return 'variant';
  if (error.code === '23514' && error.message.includes('product_components_cycle')) return 'cycle';
  return null;
}

/**
 * Why a delete was refused, from the foreign key Postgres names: a bundle still lists the product as a
 * component, or an Inventory item has stock history — its lots and movements are the record of what
 * arrived and left, so they keep the item (stock_lots_product_fk has no cascade on purpose).
 */
export function deleteRefusal(cause: Error | null): 'bundle' | 'stock' | null {
  const error = postgrestError(cause);
  if (error?.code !== '23503') return null;
  return error.message.includes('stock_') ? 'stock' : 'bundle';
}

async function saveProduct(values: ProductFormValues, target: { merchantId: string; productId: string | null }) {
  // One RPC, one transaction: the product row and its six child sets land together or not at all.
  // RLS still gates every statement inside it — save_product is security invoker.
  const { data } = await supabase.rpc('save_product', { payload: toSavePayload(values, target) }).throwOnError();
  return data;
}

export function useSaveProductMutation({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values, productId }: { values: ProductFormValues; productId: string | null }) =>
      saveProduct(values, { merchantId, productId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}

/**
 * An Inventory item, through save_stock_item (20260929100000_stock_items.sql): the row, its group, its
 * optional opening stock, and — through the faces trigger — the Products drafts it wants, in one
 * transaction. Returns the item's id. Its refusals are named exceptions —
 * read them with stockFailure from stock-receipts/queries.ts; a duplicate SKU is still saveFailure's 'sku'.
 */
export function useSaveStockItemMutation({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ values, product }: { values: StockItemValues; product: ProductDetail | null }) => {
      const { data } = await supabase
        .rpc('save_stock_item', { payload: toStockItemPayload(values, { merchantId, product }) })
        .throwOnError();
      return data;
    },
    onSuccess: async () => {
      // productGroupsKey too: a new group name makes a group row.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsKey.all }),
        queryClient.invalidateQueries({ queryKey: productGroupsKey.all }),
      ]);
    },
  });
}

export function useDuplicateProductMutation({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (product: ProductDetail) => {
      const values = fromProductDetail(product);
      // A copy starts as a draft with no identifiers: SKU and barcodes are unique by intent, and a
      // copy that inherited them would either fail products_sku_unique or scan as the original.
      return saveProduct(
        {
          ...values,
          name: `${values.name} (copy)`.slice(0, 120),
          sku: '',
          barcode: '',
          status: 'draft',
          variants: values.variants.map((variant) => ({ ...variant, sku: '', barcode: '' })),
        },
        { merchantId, productId: null }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}

export function useSetProductStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ProductStatus }) => {
      await supabase.from('products').update({ status }).in('id', ids).throwOnError();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}

export function useDeleteProductsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Children go with each product through their cascades. A product still listed as a bundle's
      // component refuses with 23503 (product_components_component_fk has no cascade on purpose), and
      // the statement is atomic, so a bulk delete removes all of the selection or none of it.
      await supabase.from('products').delete().in('id', ids).throwOnError();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}
