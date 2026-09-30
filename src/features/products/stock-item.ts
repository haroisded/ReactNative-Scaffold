import * as z from 'zod';

import { Constants } from '../../lib/database.types';
import type { Enums } from '../../lib/database.types';
import type { ProductDetail } from './queries';

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
    /** Base unit step's switch: off, the item is sold and counted by the pack alone (sell_by 'pack'). */
    byBase: z.boolean(),
    /** Base unit or Both, read only while byBase is on. */
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
    expiryAlertDays: z.string().trim().regex(/^\d{0,4}$/, 'Days is a whole number.'),
    description: text(2000, 'Description'),
    /** Stock on hand, create only: written as Inventory-added stock with no receipt or supplier. */
    addStock: z.boolean(),
    openingPacks: z.string().trim().regex(/^\d{0,6}$/, 'Packs is a whole number.'),
    openingLoose: amount('Loose units'),
    openingCost: amount('Cost per pack'),
  })
  .superRefine((item, ctx) => {
    // The base unit fields only show while the Base unit switch is on.
    if (item.byBase && !(Number(item.unitsPerPack) > 0))
      ctx.addIssue({ code: 'custom', path: ['unitsPerPack'], message: 'Enter how many base units one pack holds.' });
    if (item.addStock) {
      if (!(Number(item.openingPacks) > 0) && !(item.byBase && Number(item.openingLoose) > 0))
        ctx.addIssue({ code: 'custom', path: ['openingPacks'], message: 'Enter the packs on hand, or turn Add opening stock off.' });
      if (item.byBase && item.openingLoose !== '' && Number(item.openingLoose) >= Number(item.unitsPerPack))
        ctx.addIssue({ code: 'custom', path: ['openingLoose'], message: 'Loose units must be fewer than one full pack.' });
    }
    if (!item.isVariant) return;
    if (item.newGroup && item.newGroupName === '')
      ctx.addIssue({ code: 'custom', path: ['newGroupName'], message: 'Enter the group name.' });
    if (!item.newGroup && item.groupId === '')
      ctx.addIssue({ code: 'custom', path: ['groupId'], message: 'Choose the group this is a variant of.' });
  });

export type StockItemValues = z.infer<typeof stockItemSchema>;

export type StockSectionId = 'pack' | 'settings' | 'base' | 'opening' | 'variant' | 'extra' | 'review';

export const STOCK_SECTION_META = {
  pack: { name: 'Pack info', hint: 'What it is and how it is used' },
  settings: { name: 'Stock settings', hint: 'Where it is kept and when to warn' },
  base: { name: 'Base unit', hint: 'Whether it is sold or used by something inside the pack' },
  opening: { name: 'Stock on hand', hint: 'Stock already here, not tied to a supplier' },
  variant: { name: 'Variant setup', hint: 'Whether it is one version of another item' },
  extra: { name: 'Extra', hint: 'Anything else worth writing down' },
  review: { name: 'Review', hint: 'Check it, then save' },
} satisfies Record<StockSectionId, { name: string; hint: string }>;

/** The steps in order. Stock on hand is a new item's only: an edit changes stock through a movement. */
export const stockSections = (creating: boolean): { id: StockSectionId; optional: boolean }[] => [
  { id: 'pack', optional: false },
  { id: 'settings', optional: false },
  { id: 'base', optional: false },
  ...(creating ? [{ id: 'opening' as const, optional: true }] : []),
  { id: 'variant', optional: true },
  { id: 'extra', optional: true },
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
  packUnit: 'settings',
  storageLocation: 'settings',
  reorderAt: 'settings',
  hasExpiry: 'settings',
  expiryAlertDays: 'settings',
  byBase: 'base',
  sellBy: 'base',
  baseUnit: 'base',
  unitsPerPack: 'base',
  addStock: 'opening',
  openingPacks: 'opening',
  openingLoose: 'opening',
  openingCost: 'opening',
  isVariant: 'variant',
  groupId: 'variant',
  newGroup: 'variant',
  newGroupName: 'variant',
  attributes: 'variant',
  description: 'extra',
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
  byBase: false,
  sellBy: 'base',
  categoryId: '',
  subcategoryId: '',
  packUnit: '',
  baseUnit: 'pc',
  unitsPerPack: '1',
  hasExpiry: true,
  storageLocation: '',
  reorderAt: '',
  expiryAlertDays: '',
  description: '',
  addStock: false,
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
    byBase: (product.sell_by ?? 'pack') !== 'pack',
    sellBy: product.sell_by === 'both' ? 'both' : 'base',
    categoryId: product.category_id ?? '',
    subcategoryId: product.subcategory_id ?? '',
    packUnit: product.pack_unit_name ?? '',
    baseUnit: product.base_unit_name ?? '',
    unitsPerPack: str(product.conversion_factor ?? 1),
    hasExpiry: product.perishable,
    storageLocation: product.storage_location ?? '',
    reorderAt: str(product.reorder_threshold),
    expiryAlertDays: str(product.expiry_alert_days),
    description: product.description ?? '',
    addStock: false,
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
      expiry_alert_days: numberOrNull(values.expiryAlertDays),
      pack_unit_name: orNull(values.packUnit),
      ...unitColumns(values),
      stock_role: values.stockRole,
      perishable: values.hasExpiry,
      ...variantColumns(values),
      // Not on this form; the product form writes it, so an edit here passes it through.
      internal_notes: target.product?.internal_notes ?? null,
    },
    group_name: values.isVariant && values.newGroup ? values.newGroupName : null,
    opening: target.product === null && values.addStock ? openingStock(values) : null,
  };
}

/** The Base unit switch off is sold by the pack only: no base unit, so one pack is one unit. */
const unitColumns = (values: StockItemValues) =>
  values.byBase
    ? { conversion_factor: Number(values.unitsPerPack), base_unit_name: orNull(values.baseUnit), sell_by: values.sellBy }
    : { conversion_factor: 1, base_unit_name: null, sell_by: 'pack' as const };

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
  loose_units: values.byBase ? Number(values.openingLoose || 0) : 0,
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

/** A lot inside its alert window, or past its date. No date or no window is never expiring. */
export function expiryState(expiresOn: string | null, alertDays: number | null, today: string): 'expired' | 'soon' | null {
  if (!expiresOn) return null;
  if (expiresOn < today) return 'expired';
  if (alertDays === null) return null;
  const days = (Date.parse(expiresOn) - Date.parse(today)) / 86_400_000;
  return days <= alertDays ? 'soon' : null;
}
