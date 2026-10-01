import * as z from 'zod';

import { Constants } from '../../lib/database.types';
import type { StockItemOption } from '../products/queries';

// The New Stock Receipt wizard (src/screens/receipt-wizard/): Supplier → Unit Load → Pallet → Case → Pack
// → Base Unit → Review (.claude/inventory-stock/Stock_Receiving.html). Every field is the text the
// merchant typed; toReceiptPayload turns it into save_receipt's payload
// (20260929100100_stock_ledger.sql §5, reshaped by 20260930100000_receipt_inputs.sql) at the mutation boundary. Limits are stock_receipts_text_length and
// stock_lots_text_length's, reported before a round trip; save_receipt checks everything again.

const optional = (max: number, label: string) =>
  z.string().trim().max(max, `${label} can be up to ${max} characters.`);
const count = (label: string) => z.string().trim().regex(/^\d{0,6}$/, `${label} is a whole number.`);
const amount = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^(\d{1,10}(\.\d{0,4})?)?$/, `${label} is an amount, like 120 or 120.50.`);
const isoDate = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Enter the date as YYYY-MM-DD.')
  .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), 'Enter a real date.');

/**
 * One product arriving (the Pack and Base Unit steps). An existing item fills and locks its own fields —
 * name, SKU, type, Sell By, units, expiry rule and re-order point — from the item (lineForItem); a new
 * item is named here and made by save_receipt in the same transaction.
 */
const packLineFields = z.object({
  /** Restock item: on, an existing item (productId) arrives; off, a new one is named here. */
  restock: z.boolean(),
  productId: z.string(),
  name: optional(120, 'Pack name'),
  sku: optional(64, 'SKU'),
  stockRole: z.enum(Constants.public.Enums.stock_role),
  sellBy: z.enum(Constants.public.Enums.stock_sell_by),
  /** products.perishable: every receipt line for the item then needs an expiry date. */
  hasExpiry: z.boolean(),
  /** Manufacturer serials, comma-separated, one per pack in order. */
  serials: optional(4000, 'Serial numbers'),
  lotCode: optional(64, 'Lot / batch number'),
  location: optional(120, 'Storage location'),
  /** Pack quantity: the packs this delivery should hold. The Case tier's total stands in for it. */
  packsExpected: count('Pack quantity'),
  /** Received packs: what actually arrived. Blank, the expected count is taken as received. */
  packs: count('Received packs'),
  costPerPack: amount('Cost per pack'),
  reorderAt: amount('Re-order at'),
  expiresOn: isoDate,
  baseUnit: optional(20, 'Base unit type'),
  /** Base units qty: base units in one pack (products.conversion_factor). */
  unitsPerPack: amount('Base units qty'),
  /** Base units qty received: what was counted in one pack. A record only; stock uses unitsPerPack. */
  unitsPerPackReceived: amount('Base units qty received'),
  /** Cost per base unit, final when typed. Blank, it is the pack cost ÷ base units qty. */
  unitCost: amount('Cost per base unit'),
  /** A new item's variant group, picked or named (save_stock_item makes a named one). */
  isVariant: z.boolean(),
  groupId: z.string(),
  newGroup: z.boolean(),
  newGroupName: optional(120, 'Variant group name'),
  /** Variant name, "Red, L": one attribute per comma, stored as products.attributes. */
  attributes: optional(200, 'Variant name'),
});

export type PackLineValues = z.infer<typeof packLineFields>;

type Issue = [path: string, message: string];

/** A restock names its item; a new item names itself, and its variant group when it is a variant. */
function identityIssues(line: PackLineValues): Issue[] {
  if (line.restock) return line.productId === '' ? [['productId', 'Choose the item to restock.']] : [];
  const issues: Issue[] = [];
  if (line.name === '') issues.push(['name', 'Enter the pack name.']);
  if (line.sku === '') issues.push(['sku', 'Enter a SKU, or tap Auto-generate.']);
  if (line.isVariant && line.newGroup && line.newGroupName === '') issues.push(['newGroupName', 'Enter the variant group name.']);
  if (line.isVariant && !line.newGroup && line.groupId === '') issues.push(['groupId', 'Choose the variant group.']);
  return issues;
}

/** What should arrive and at what cost — unless the Case tier already says (`fromCase`) — and what did. */
function receivedIssues(line: PackLineValues, fromCase: boolean): Issue[] {
  const issues: Issue[] = [];
  if (!fromCase && !(Number(line.packsExpected) > 0)) issues.push(['packsExpected', 'Enter how many packs this delivery holds.']);
  if (!fromCase && line.costPerPack === '') issues.push(['costPerPack', 'Enter the cost of one pack.']);
  if (line.packs !== '' && !(Number(line.packs) > 0)) issues.push(['packs', 'Enter the packs that arrived, or leave it blank.']);
  return issues;
}

/** The Base Unit step's fields, while something is sold by the base unit. */
function baseUnitIssues(line: PackLineValues): Issue[] {
  if (line.sellBy === 'pack') return [];
  const issues: Issue[] = [];
  if (!(Number(line.unitsPerPack) > 0)) issues.push(['unitsPerPack', 'Enter how many base units one pack holds.']);
  if (line.unitsPerPackReceived !== '' && !(Number(line.unitsPerPackReceived) > 0))
    issues.push(['unitsPerPackReceived', 'Enter the base units counted, or leave it blank.']);
  return issues;
}

/** A line's own rules. `fromCase`: the Case tier already says how many packs arrived and what they cost. */
function packLineIssues(line: PackLineValues, fromCase: boolean): Issue[] {
  const expiry: Issue[] = line.hasExpiry && line.expiresOn === '' ? [['expiresOn', 'Enter the expiration date.']] : [];
  return [...identityIssues(line), ...receivedIssues(line, fromCase), ...expiry, ...baseUnitIssues(line)];
}

const tier = z.object({ sscc: optional(64, 'Container ID / SSCC'), received: count('Received'), per: count('Per') });

/** Every field the wizard holds. Shape only; the rules that depend on other fields are the superRefines below. */
const receiptFields = z.object({
  // General
  supplierId: z.string(),
  invoiceNo: optional(64, 'Invoice / DR number'),
  receivedOn: isoDate,
  receivedBy: optional(80, 'Received by'),
  location: optional(120, 'Receiving location'),
  freight: amount('Freight'),
  // Unit Load, Pallet and Case. Optional; each can be skipped.
  unitLoad: tier,
  pallet: tier,
  caseTier: tier.extend({ cost: amount('Cost per case') }),
  // Pack
  multi: z.boolean(),
  line: packLineFields,
  lines: z.array(packLineFields),
  // Review
  notes: optional(2000, 'Notes'),
});

export type ReceiptValues = z.infer<typeof receiptFields>;

type AddIssue = (path: (string | number)[], message: string) => void;

function lineRules(receipt: ReceiptValues, fromCase: boolean, add: AddIssue) {
  for (const [path, message] of packLineIssues(receipt.line, fromCase)) add(['line', path], message);
  if (commaList(receipt.line.serials).length > linePacks(receipt.line, fromCase ? receipt : null))
    add(['line', 'serials'], 'More serial numbers than packs.');
}

/** Both or neither: a supplier's delivery has a date, and a dated delivery came from someone. */
function supplierRules(receipt: ReceiptValues, add: AddIssue) {
  if (receipt.supplierId === '' && receipt.receivedOn !== '') add(['supplierId'], 'Choose the supplier, or clear the date.');
  if (receipt.receivedOn === '' && receipt.supplierId !== '') add(['receivedOn'], 'Enter the date the stock arrived.');
}

export const receiptSchema = receiptFields.superRefine((receipt, ctx) => {
  const add: AddIssue = (path, message) => ctx.addIssue({ code: 'custom', path, message });
  supplierRules(receipt, add);
  const c = receipt.caseTier;
  const caseUsed = c.received !== '' || c.per !== '' || c.cost !== '';
  if (caseUsed && !receipt.multi) {
    if (!(Number(c.received) > 0)) add(['caseTier', 'received'], 'Enter how many cases arrived.');
    if (!(Number(c.per) > 0)) add(['caseTier', 'per'], 'Enter the packs in one case.');
    if (c.cost === '') add(['caseTier', 'cost'], 'Enter the cost of one case.');
  }
  if (receipt.multi) {
    if (receipt.lines.length === 0) add(['lines'], 'Add at least one product.');
    return;
  }
  lineRules(receipt, caseUsed, add);
});

/**
 * The Add Product/Variant editor, for a receipt carrying several products. The same shape as the
 * receipt, so one set of fields serves both; only its `line` is checked.
 */
export const packLineFormSchema = receiptFields.superRefine((receipt, ctx) => {
  lineRules(receipt, false, (path, message) => ctx.addIssue({ code: 'custom', path, message }));
});



const emptyTier = { sscc: '', received: '', per: '' };

export const emptyPackLine: PackLineValues = {
  restock: false,
  productId: '',
  name: '',
  sku: '',
  stockRole: 'sellable',
  sellBy: 'pack',
  hasExpiry: true,
  serials: '',
  lotCode: '',
  location: '',
  packsExpected: '',
  packs: '',
  costPerPack: '',
  reorderAt: '',
  expiresOn: '',
  baseUnit: 'pc',
  unitsPerPack: '1',
  unitsPerPackReceived: '',
  unitCost: '',
  isVariant: false,
  groupId: '',
  newGroup: false,
  newGroupName: '',
  attributes: '',
};

/** Today on the device's calendar. `current_date` on the server is UTC, which is yesterday or tomorrow near midnight. */
export function localToday() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyReceipt(): ReceiptValues {
  return {
    supplierId: '',
    invoiceNo: '',
    // Blank: a date is asked for with a supplier, never assumed (receiptSchema).
    receivedOn: '',
    receivedBy: '',
    location: '',
    freight: '',
    unitLoad: emptyTier,
    pallet: emptyTier,
    caseTier: { ...emptyTier, cost: '' },
    multi: false,
    line: emptyPackLine,
    lines: [],
    notes: '',
  };
}

const str = (value: number | string | null) => (value === null ? '' : String(value));

/** A line switched to an existing item: its fields come from the item and lock. */
export function lineForItem(line: PackLineValues, item: StockItemOption): PackLineValues {
  return {
    ...line,
    productId: item.id,
    name: item.name,
    sku: item.sku ?? '',
    stockRole: item.stock_role ?? 'component',
    sellBy: item.sell_by ?? 'pack',
    hasExpiry: item.perishable,
    reorderAt: str(item.reorder_threshold),
    location: line.location === '' ? (item.storage_location ?? '') : line.location,
    baseUnit: item.base_unit_name ?? 'pc',
    unitsPerPack: str(item.conversion_factor ?? 1),
  };
}

/** Case tier totals, when the Case step was filled. */
export function caseTotals(receipt: Pick<ReceiptValues, 'caseTier'>) {
  const cases = Number(receipt.caseTier.received);
  const per = Number(receipt.caseTier.per);
  if (!(cases > 0) || !(per > 0)) return null;
  const cost = Number(receipt.caseTier.cost || 0);
  return { cases, per, packs: cases * per, costPerPack: cost / per, totalCost: cases * cost };
}

/** Base units in one pack. Sold by the pack only, a pack is one unit. */
export const unitsPerPack = (line: PackLineValues) => (line.sellBy === 'pack' ? 1 : Number(line.unitsPerPack) || 1);

/** Packs a line should hold: the Case tier's total on a single-product receipt, else the Pack quantity. */
export function lineExpected(line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) {
  const fromCase = receipt && !receipt.multi ? caseTotals(receipt) : null;
  return fromCase ? fromCase.packs : Number(line.packsExpected || 0);
}

/** Packs a line stocks: Received packs, or the expected count when that is blank (as create_lot does). */
export const linePacks = (line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) =>
  line.packs === '' ? lineExpected(line, receipt) : Number(line.packs);

/** Cost of one pack: the Case tier's cost ÷ packs per case, or what was typed. */
export function lineCostPerPack(line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) {
  const fromCase = receipt && !receipt.multi ? caseTotals(receipt) : null;
  return fromCase ? fromCase.costPerPack : Number(line.costPerPack || 0);
}

/** A line's value: the sum stock_lots.line_cost stores. */
export const lineCost = (line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) =>
  linePacks(line, receipt) * lineCostPerPack(line, receipt);

/** The typed cost per base unit, or null for create_lot's pack cost ÷ units. Sold by the pack, there is none to type. */
const typedUnitCost = (line: PackLineValues) => (line.sellBy === 'pack' || line.unitCost === '' ? null : Number(line.unitCost));

/** Cost per base unit as create_lot stores it: the typed one, else the pack cost ÷ base units qty. */
export const lineUnitCost = (line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) =>
  typedUnitCost(line) ?? lineCostPerPack(line, receipt) / unitsPerPack(line);

/** The lines a receipt saves: the list on a multi-product receipt, else the one line. */
export const receiptLines = (receipt: ReceiptValues) => (receipt.multi ? receipt.lines : [receipt.line]);

const commaList = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

/** A code to start from when the merchant has none: PREFIX-YYYYMMDD-NNNN. Uniqueness is the server's. */
export function generatedCode(prefix: string, date: string) {
  return `${prefix}-${(date || localToday()).replace(/-/g, '')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

const orNull = (value: string) => (value === '' ? null : value);
const numberOrNull = (value: string) => (value === '' ? null : Number(value));

function linePayload(line: PackLineValues, receipt: ReceiptValues) {
  const fromCase = !receipt.multi ? caseTotals(receipt) : null;
  const byPack = line.sellBy === 'pack';
  return {
    ...(!line.restock
      ? {
          new_item: {
            item: {
              name: line.name,
              sku: line.sku,
              stock_role: line.stockRole,
              sell_by: line.sellBy,
              perishable: line.hasExpiry,
              base_unit_name: byPack ? null : orNull(line.baseUnit),
              conversion_factor: unitsPerPack(line),
              reorder_threshold: numberOrNull(line.reorderAt),
              storage_location: orNull(line.location),
              ...(line.isVariant
                ? { group_id: line.newGroup ? null : orNull(line.groupId), attributes: commaList(line.attributes) }
                : { group_id: null, attributes: [] }),
            },
            group_name: line.isVariant && line.newGroup ? line.newGroupName : null,
          },
        }
      : { product_id: line.productId }),
    ...(fromCase
      ? {
          cases: fromCase.cases,
          packs_per_case: fromCase.per,
          cost_per_case: Number(receipt.caseTier.cost),
          case_sscc: orNull(receipt.caseTier.sscc),
          unit_loads: numberOrNull(receipt.unitLoad.received),
          pallets_per_unit_load: numberOrNull(receipt.unitLoad.per),
          unit_load_sscc: orNull(receipt.unitLoad.sscc),
          pallets: numberOrNull(receipt.pallet.received),
          cases_per_pallet: numberOrNull(receipt.pallet.per),
          pallet_sscc: orNull(receipt.pallet.sscc),
        }
      : { packs_expected: Number(line.packsExpected), cost_per_pack: Number(line.costPerPack) }),
    packs: numberOrNull(line.packs),
    units_per_pack_received: byPack ? null : numberOrNull(line.unitsPerPackReceived),
    unit_cost: typedUnitCost(line),
    lot_code: orNull(line.lotCode),
    expires_on: line.hasExpiry ? orNull(line.expiresOn) : null,
    location: orNull(line.location),
    serials: commaList(line.serials),
  };
}

export function toReceiptPayload(merchantId: string, receipt: ReceiptValues) {
  return {
    merchant_id: merchantId,
    supplier_id: orNull(receipt.supplierId),
    invoice_no: orNull(receipt.invoiceNo),
    // No date (and so no supplier): the delivery is today's, on the device's calendar rather than UTC.
    received_on: receipt.receivedOn || localToday(),
    received_by: orNull(receipt.receivedBy),
    location: orNull(receipt.location),
    freight: Number(receipt.freight || 0),
    notes: orNull(receipt.notes),
    lines: receiptLines(receipt).map((line) => linePayload(line, receipt)),
  };
}
