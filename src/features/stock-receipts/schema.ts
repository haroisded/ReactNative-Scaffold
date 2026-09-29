import * as z from 'zod';

import { Constants } from '../../lib/database.types';
import type { StockItemOption } from '../products/queries';

// The New Stock Receipt wizard (src/screens/receipt-wizard/): General → Unit Load → Pallet → Case → Pack
// → Base Unit → Review (.claude/inventory-stock/Stock_Receiving.html). Every field is the text the
// merchant typed; toReceiptPayload turns it into save_receipt's payload
// (20260929100100_stock_ledger.sql §5) at the mutation boundary. Limits are stock_receipts_text_length and
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
  /** '' is a new item. */
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
  packs: count('Received packs'),
  costPerPack: amount('Cost per pack'),
  reorderAt: amount('Re-order at'),
  expiresOn: isoDate,
  baseUnit: optional(20, 'Base unit type'),
  unitsPerPack: amount('Base units per pack'),
  /** Units that arrived outside a full pack — one partial pack. */
  looseUnits: amount('Extra loose units'),
});

export type PackLineValues = z.infer<typeof packLineFields>;

type Issue = [path: string, message: string];

/** A new item names itself; an existing one brings its name and SKU. */
function identityIssues(line: PackLineValues): Issue[] {
  if (line.productId !== '') return [];
  const issues: Issue[] = [];
  if (line.name === '') issues.push(['name', 'Enter the pack name.']);
  if (line.sku === '') issues.push(['sku', 'Enter a SKU, or tap Auto-generate.']);
  return issues;
}

/** What arrived and at what cost — unless the Case tier already says (`fromCase`). */
function receivedIssues(line: PackLineValues, fromCase: boolean): Issue[] {
  if (fromCase) return [];
  const issues: Issue[] = [];
  if (!(Number(line.packs) > 0) && !(Number(line.looseUnits) > 0)) issues.push(['packs', 'Enter how many packs arrived.']);
  if (line.costPerPack === '') issues.push(['costPerPack', 'Enter the cost of one pack.']);
  return issues;
}

/** The Base Unit step's fields, while something is sold by the base unit. */
function baseUnitIssues(line: PackLineValues): Issue[] {
  if (line.sellBy === 'pack') return [];
  const upp = Number(line.unitsPerPack);
  if (!(upp > 0)) return [['unitsPerPack', 'Enter how many base units one pack holds.']];
  return Number(line.looseUnits || 0) >= upp ? [['looseUnits', 'Loose units must be fewer than one full pack.']] : [];
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
  if (serialList(receipt.line.serials).length > linePacks(receipt.line, fromCase ? receipt : null))
    add(['line', 'serials'], 'More serial numbers than packs.');
}

export const receiptSchema = receiptFields.superRefine((receipt, ctx) => {
  const add: AddIssue = (path, message) => ctx.addIssue({ code: 'custom', path, message });
  if (receipt.supplierId === '') add(['supplierId'], 'Choose the supplier.');
  if (receipt.receivedOn === '') add(['receivedOn'], 'Enter the date the stock arrived.');
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
  productId: '',
  name: '',
  sku: '',
  stockRole: 'sellable',
  sellBy: 'pack',
  hasExpiry: true,
  serials: '',
  lotCode: '',
  location: '',
  packs: '',
  costPerPack: '',
  reorderAt: '',
  expiresOn: '',
  baseUnit: 'pc',
  unitsPerPack: '1',
  looseUnits: '',
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
    receivedOn: localToday(),
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

/** Whole packs a line receives: the Case tier's total on a single-product receipt, else what was typed. */
export function linePacks(line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) {
  const fromCase = receipt && !receipt.multi ? caseTotals(receipt) : null;
  return fromCase ? fromCase.packs : Number(line.packs || 0);
}

/** Cost of one pack: the Case tier's cost ÷ packs per case, or what was typed. */
export function lineCostPerPack(line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) {
  const fromCase = receipt && !receipt.multi ? caseTotals(receipt) : null;
  return fromCase ? fromCase.costPerPack : Number(line.costPerPack || 0);
}

/** Loose units the line takes, which exist only when something is sold by the base unit. */
const lineLoose = (line: PackLineValues) => (line.sellBy === 'pack' ? 0 : Number(line.looseUnits || 0));

/** A line's value before freight: the sum stock_lots.line_cost stores. */
export function lineCost(line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) {
  const perPack = lineCostPerPack(line, receipt);
  return linePacks(line, receipt) * perPack + (lineLoose(line) * perPack) / unitsPerPack(line);
}

/** Base units a line receives. */
const lineUnits = (line: PackLineValues, receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null) =>
  linePacks(line, receipt) * unitsPerPack(line) + lineLoose(line);

/** The lines a receipt saves: the list on a multi-product receipt, else the one line. */
export const receiptLines = (receipt: ReceiptValues) => (receipt.multi ? receipt.lines : [receipt.line]);

/**
 * Each line's freight share and landed cost per base unit, split the way save_receipt splits it: by value,
 * or by quantity when every line cost nothing. A preview; the server's numbers are what is stored.
 */
export function landedCosts(receipt: ReceiptValues) {
  const lines = receiptLines(receipt);
  const freight = Number(receipt.freight || 0);
  const values = lines.map((line) => lineCost(line, receipt));
  const units = lines.map((line) => lineUnits(line, receipt));
  const valueTotal = values.reduce((sum, value) => sum + value, 0);
  const unitTotal = units.reduce((sum, value) => sum + value, 0);
  return lines.map((line, index) => {
    const share = freight === 0 ? 0 : valueTotal > 0 ? (freight * values[index]) / valueTotal : unitTotal > 0 ? (freight * units[index]) / unitTotal : 0;
    return { value: values[index], share, units: units[index], unitCost: units[index] > 0 ? (values[index] + share) / units[index] : 0 };
  });
}

const serialList = (serials: string) =>
  serials
    .split(',')
    .map((serial) => serial.trim())
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
    ...(line.productId === ''
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
            },
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
      : { packs: Number(line.packs || 0), cost_per_pack: Number(line.costPerPack) }),
    loose_units: lineLoose(line),
    lot_code: orNull(line.lotCode),
    expires_on: line.hasExpiry ? orNull(line.expiresOn) : null,
    location: orNull(line.location),
    serials: serialList(line.serials),
  };
}

export function toReceiptPayload(merchantId: string, receipt: ReceiptValues) {
  return {
    merchant_id: merchantId,
    supplier_id: receipt.supplierId,
    invoice_no: orNull(receipt.invoiceNo),
    received_on: receipt.receivedOn,
    received_by: orNull(receipt.receivedBy),
    location: orNull(receipt.location),
    freight: Number(receipt.freight || 0),
    notes: orNull(receipt.notes),
    lines: receiptLines(receipt).map((line) => linePayload(line, receipt)),
  };
}
