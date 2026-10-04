import * as z from 'zod';

import { Constants } from '../../lib/database.types';
import type { Enums } from '../../lib/database.types';
import { emptyPackLine, lineForItem, newItemColumns, typedUnitCost } from '../stock-receipts/schema';
import type { PackLineValues } from '../stock-receipts/schema';
import type { ProductDetail } from './queries';

// The Inventory item form (src/screens/stock-item-form/), saved through save_stock_item
// (20261004120000_expiry_alert_on.sql). Its fields are a receipt's Pack line (src/features/stock-receipts/
// schema.ts, itemFormSchema), so this file only maps an item to that line and the line to the payload.
// Reads are typed by database.types.ts.

export type StockRole = Enums<'stock_role'>;
type StockSellBy = Enums<'stock_sell_by'>;

export const stockRole = z.enum(Constants.public.Enums.stock_role);

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

/** A saved item as the form's line: a restock's fields (lineForItem), plus what only the item form edits. */
export function lineFromProduct(product: ProductDetail): PackLineValues {
  return {
    ...lineForItem(emptyPackLine, product),
    restock: false,
    isVariant: product.group_id !== null,
    groupId: product.group_id ?? '',
    attributes: product.attributes.join(', '),
    categoryId: product.category_id ?? '',
    subcategoryId: product.subcategory_id ?? '',
    expiryAlertOn: product.expiry_alert_on ?? '',
  };
}

const orNull = (value: string) => (value === '' ? null : value);
const numberOrNull = (value: string) => (value === '' ? null : Number(value));

/**
 * save_stock_item's payload. Every column its update writes is sent, because the update replaces them all
 * from the payload — a column left out would be cleared — so an edit passes through the columns this form
 * no longer shows. Status is not on the form: a new item is active, and an edit keeps what it had.
 */
export function toStockItemPayload(line: PackLineValues, target: { merchantId: string; product: ProductDetail | null }) {
  const { product } = target;
  // The columns a receipt's new item sends too, then what only this form edits.
  const { item, group_name } = newItemColumns(line);
  return {
    item: {
      ...item,
      id: product?.id ?? null,
      merchant_id: target.merchantId,
      status: product?.status ?? 'active',
      category_id: orNull(line.categoryId),
      subcategory_id: orNull(line.subcategoryId),
      // Hidden while the item does not expire, so a date left in the field is not saved.
      expiry_alert_on: line.hasExpiry ? orNull(line.expiryAlertOn) : null,
      // Not on this form; the product form and earlier versions of this one wrote them.
      barcode: product?.barcode ?? null,
      description: product?.description ?? null,
      pack_unit_name: product?.pack_unit_name ?? null,
      tags: product?.tags ?? [],
      internal_notes: product?.internal_notes ?? null,
    },
    group_name,
    // A blank Pack quantity is 0 packs, which save_stock_item skips.
    opening: product === null ? openingStock(line) : null,
  };
}

/** A new item's packs on hand, as add_inventory_stock takes them: a lot with no receipt (private.create_lot). */
const openingStock = (line: PackLineValues) => ({
  packs: Number(line.packsExpected || 0),
  cost_per_pack: numberOrNull(line.costPerPack),
  unit_cost: typedUnitCost(line),
  expires_on: line.hasExpiry ? orNull(line.expiresOn) : null,
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
