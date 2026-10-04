import * as z from 'zod';

import { Constants } from '../../lib/database.types';
import type { Enums } from '../../lib/database.types';
import type { ProductDetail } from './queries';
import { optionalDate } from './schema';

// The Inventory item form (src/screens/stock-item-form/), saved through save_stock_item
// (20260929100000_stock_items.sql §7). Form input only; reads are typed by database.types.ts.

export type StockRole = Enums<'stock_role'>;
type StockSellBy = Enums<'stock_sell_by'>;

export const stockRole = z.enum(Constants.public.Enums.stock_role);
export const stockSellBy = z.enum(Constants.public.Enums.stock_sell_by);

export const STOCK_ROLE_LABEL = {
  sellable: 'Sellable',
  component: 'Component',
  both: 'Both',
} satisfies Record<StockRole, string>;

export const SELL_BY_LABEL = {
  pack: 'Pack',
  base: 'Base unit',
  both: 'Both',
} satisfies Record<StockSellBy, string>;

const text = (max: number, label: string) => z.string().trim().max(max, `${label} can be up to ${max} characters.`);
const amount = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^(\d{1,10}(\.\d{0,4})?)?$/, `${label} is a number, like 12 or 0.5.`);

export const stockItemSchema = z
  .object({
    /** Variant Setup: the item hangs under a group, picked or made here. */
    isVariant: z.boolean(),
    groupId: z.string(),
    newGroup: z.boolean(),
    newGroupName: text(120, 'Group name'),
    /** "Red, L" — one attribute per comma, stored as products.attributes. */
    attributes: text(200, 'Attributes'),
    name: text(120, 'Name').min(1, 'Enter a name.'),
    sku: text(64, 'SKU').min(1, 'Enter a SKU, or tap Auto-generate.'),
    barcode: text(64, 'Barcode'),
    stockRole,
    /** Anything but Pack opens the Base unit step. */
    sellBy: stockSellBy,
    categoryId: z.string(),
    subcategoryId: z.string(),
    packUnit: text(20, 'Pack unit'),
    baseUnit: text(20, 'Base unit'),
    unitsPerPack: amount('Units per pack'),
    /** products.perishable: when on, every receipt line for this item needs an expiry date. */
    hasExpiry: z.boolean(),
    storageLocation: text(120, 'Storage location'),
    reorderAt: amount('Reorder at'),
    /** products.expiry_alert_on, YYYY-MM-DD or '' for none: from that day its lots read Expiring. */
    expiryAlertOn: optionalDate,
    description: text(2000, 'Description'),
    /** Quantity on hand, create only and optional: Inventory-added stock with no receipt or supplier. */
    openingPacks: z.string().trim().regex(/^\d{0,6}$/, 'Packs is a whole number.'),
    openingLoose: amount('Loose units'),
    openingCost: amount('Cost per pack'),
  })
  .superRefine((item, ctx) => {
    // The Base unit step only shows while the item sells by more than the pack.
    const byBase = item.sellBy !== 'pack';
    if (byBase && !(Number(item.unitsPerPack) > 0))
      ctx.addIssue({ code: 'custom', path: ['unitsPerPack'], message: 'Enter how many base units one pack holds.' });
    if (byBase && item.openingLoose !== '' && Number(item.openingLoose) >= Number(item.unitsPerPack))
      ctx.addIssue({ code: 'custom', path: ['openingLoose'], message: 'Loose units must be fewer than one full pack.' });
    if (!item.isVariant) return;
    if (item.newGroup && item.newGroupName === '')
      ctx.addIssue({ code: 'custom', path: ['newGroupName'], message: 'Enter the variant group name.' });
    if (!item.newGroup && item.groupId === '')
      ctx.addIssue({ code: 'custom', path: ['groupId'], message: 'Choose the variant group.' });
  });

export type StockItemValues = z.infer<typeof stockItemSchema>;

export type StockSectionId = 'pack' | 'variant' | 'base' | 'review';

export const STOCK_SECTION_META = {
  pack: { name: 'Pack', hint: 'What it is, how it sells, and how many are here' },
  variant: { name: 'Variant', hint: 'Whether it is one version of another item' },
  base: { name: 'Base unit', hint: 'What one pack holds' },
  review: { name: 'Review', hint: 'Check it, then save' },
} satisfies Record<StockSectionId, { name: string; hint: string }>;

/** The receipt's Pack, Variant and Base unit steps, without the receipt. Base unit only when it sells by one. */
export const stockSections = (byBase: boolean): { id: StockSectionId; optional: boolean }[] => [
  { id: 'pack', optional: false },
  { id: 'variant', optional: true },
  ...(byBase ? [{ id: 'base' as const, optional: false }] : []),
  { id: 'review', optional: false },
];

/** The step each field is on, so a failed save opens the first step holding an error. */
export const STOCK_FIELD_SECTION = {
  name: 'pack',
  sku: 'pack',
  barcode: 'pack',
  stockRole: 'pack',
  categoryId: 'pack',
  subcategoryId: 'pack',
  sellBy: 'pack',
  packUnit: 'pack',
  storageLocation: 'pack',
  reorderAt: 'pack',
  hasExpiry: 'pack',
  expiryAlertOn: 'pack',
  description: 'pack',
  openingPacks: 'pack',
  openingCost: 'pack',
  baseUnit: 'base',
  unitsPerPack: 'base',
  openingLoose: 'base',
  isVariant: 'variant',
  groupId: 'variant',
  newGroup: 'variant',
  newGroupName: 'variant',
  attributes: 'variant',
} satisfies Record<keyof StockItemValues, StockSectionId>;

export const emptyStockItem: StockItemValues = {
  isVariant: false,
  groupId: '',
  newGroup: false,
  newGroupName: '',
  attributes: '',
  name: '',
  sku: '',
  barcode: '',
  stockRole: 'sellable',
  sellBy: 'pack',
  categoryId: '',
  subcategoryId: '',
  packUnit: '',
  baseUnit: 'pc',
  unitsPerPack: '1',
  hasExpiry: true,
  storageLocation: '',
  reorderAt: '',
  expiryAlertOn: '',
  description: '',
  openingPacks: '',
  openingLoose: '',
  openingCost: '',
};

const str = (value: number | string | null) => (value === null ? '' : String(value));

export function fromStockItem(product: ProductDetail): StockItemValues {
  return {
    isVariant: product.group_id !== null,
    groupId: product.group_id ?? '',
    newGroup: false,
    newGroupName: '',
    attributes: product.attributes.join(', '),
    name: product.name,
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    stockRole: product.stock_role ?? 'component',
    sellBy: product.sell_by ?? 'pack',
    categoryId: product.category_id ?? '',
    subcategoryId: product.subcategory_id ?? '',
    packUnit: product.pack_unit_name ?? '',
    baseUnit: product.base_unit_name ?? '',
    unitsPerPack: str(product.conversion_factor ?? 1),
    hasExpiry: product.perishable,
    storageLocation: product.storage_location ?? '',
    reorderAt: str(product.reorder_threshold),
    expiryAlertOn: product.expiry_alert_on ?? '',
    description: product.description ?? '',
    openingPacks: '',
    openingLoose: '',
    openingCost: '',
  };
}

const orNull = (value: string) => (value === '' ? null : value);
const numberOrNull = (value: string) => (value === '' ? null : Number(value));

/**
 * save_stock_item's payload. Every column its update writes is sent, because the update replaces them all
 * from the payload — a column left out would be cleared. Status is not on the form: a new item is active,
 * and an edit keeps what it had (Archive and Restore on the detail change it).
 */
export function toStockItemPayload(values: StockItemValues, target: { merchantId: string; product: ProductDetail | null }) {
  return {
    item: {
      id: target.product?.id ?? null,
      merchant_id: target.merchantId,
      status: target.product?.status ?? 'active',
      name: values.name,
      category_id: orNull(values.categoryId),
      subcategory_id: orNull(values.subcategoryId),
      // Blank is generated as SKU-##### by products_assign_sku.
      sku: orNull(values.sku),
      barcode: orNull(values.barcode),
      description: orNull(values.description),
      tags: target.product?.tags ?? [],
      storage_location: orNull(values.storageLocation),
      reorder_threshold: numberOrNull(values.reorderAt),
      // Hidden while the item does not expire, so a date left in the field is not saved.
      expiry_alert_on: values.hasExpiry ? orNull(values.expiryAlertOn) : null,
      pack_unit_name: orNull(values.packUnit),
      ...unitColumns(values),
      stock_role: values.stockRole,
      perishable: values.hasExpiry,
      ...variantColumns(values),
      // Not on this form; the product form writes it, so an edit here passes it through.
      internal_notes: target.product?.internal_notes ?? null,
    },
    group_name: values.isVariant && values.newGroup ? values.newGroupName : null,
    // A blank quantity is 0, which save_stock_item skips.
    opening: target.product === null ? openingStock(values) : null,
  };
}

/** Sold by the pack only: no base unit, so one pack is one unit. */
const unitColumns = (values: StockItemValues) =>
  values.sellBy === 'pack'
    ? { conversion_factor: 1, base_unit_name: null, sell_by: values.sellBy }
    : { conversion_factor: Number(values.unitsPerPack), base_unit_name: orNull(values.baseUnit), sell_by: values.sellBy };

/** "Red, L" is two attributes. Not a variant, the item joins no group. */
const variantColumns = (values: StockItemValues) =>
  values.isVariant
    ? {
        group_id: values.newGroup ? null : orNull(values.groupId),
        attributes: values.attributes
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      }
    : { group_id: null, attributes: [] };

const openingStock = (values: StockItemValues) => ({
  packs: Number(values.openingPacks || 0),
  loose_units: values.sellBy === 'pack' ? 0 : Number(values.openingLoose || 0),
  cost_per_pack: numberOrNull(values.openingCost),
});

/** "3 box + 4 pcs": whole packs and what is left over, from a quantity in base units. */
export function packsAndLoose(qty: number, unitsPerPack: number, packUnit: string | null, baseUnit: string | null) {
  const per = unitsPerPack > 0 ? unitsPerPack : 1;
  const packs = Math.floor(qty / per);
  const loose = Math.round((qty - packs * per) * 10000) / 10000;
  const pack = `${packs} ${packUnit ?? 'pack'}`;
  return loose > 0 ? `${pack} + ${loose} ${baseUnit ?? 'unit'}` : pack;
}

/**
 * A lot past its own date is expired; from the item's alert date on, a lot not yet expired is expiring.
 * A lot with no date never is. All three are YYYY-MM-DD, so they compare as strings.
 */
export function expiryState(expiresOn: string | null, alertOn: string | null, today: string): 'expired' | 'soon' | null {
  if (!expiresOn) return null;
  if (expiresOn < today) return 'expired';
  return alertOn !== null && today >= alertOn ? 'soon' : null;
}
