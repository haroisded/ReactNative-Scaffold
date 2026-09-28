import * as z from 'zod';

// The receipt wizard (src/screens/receipt-wizard/). Every field is the text the merchant typed;
// toReceiptPayload turns it into save_receipt's payload (20260928100200_stock_receipts.sql §4) at the
// mutation boundary. The limits are stock_receipts_text_length and stock_lots_text_length, reported here
// before a round trip. What depends on the item — serials, units per pack — is checked against the item
// in the line editor, and save_receipt checks all of it again.

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
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Enter a date as YYYY-MM-DD.')
  .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), 'Enter a real date.');

export const receiptHeaderSchema = z.object({
  /** '' is "no supplier / opening stock". */
  supplierId: z.string(),
  invoiceNo: optional(64, 'Invoice / DR number'),
  receivedOn: isoDate.refine((value) => value !== '', 'Enter the date the stock arrived.'),
  receivedBy: optional(80, 'Received by'),
  location: optional(120, 'Receiving location'),
  freight: amount('Freight'),
  notes: optional(2000, 'Notes'),
});

export type ReceiptHeaderValues = z.infer<typeof receiptHeaderSchema>;

export const receiptLineSchema = z
  .object({
    /** 'existing' picks an item; 'new' makes one inside the receipt (design.md §3, "+ New item"). */
    mode: z.enum(['existing', 'new']),
    productId: z.string(),
    newName: optional(120, 'Name'),
    newPackUnit: optional(20, 'Pack unit'),
    newBaseUnit: optional(20, 'Base unit'),
    newUnitsPerPack: amount('Units per pack'),
    newSerialTracked: z.boolean(),
    /** The Case tier. Off: packs and a cost per pack. On: cases, packs per case and a cost per case. */
    useCases: z.boolean(),
    cases: count('Cases'),
    packsPerCase: count('Packs per case'),
    costPerCase: amount('Cost per case'),
    sscc: optional(64, 'SSCC'),
    packs: count('Packs'),
    costPerPack: amount('Cost per pack'),
    looseUnits: amount('Loose units'),
    lotCode: optional(64, 'Lot number'),
    expiresOn: isoDate,
    location: optional(120, 'Location'),
    notes: optional(2000, 'Notes'),
    /** One serial per line of text, serial-tracked items only. */
    serials: z.string(),
  })
  .superRefine((line, ctx) => {
    for (const [path, message] of [...itemIssues(line), ...amountIssues(line)])
      ctx.addIssue({ code: 'custom', path: [path], message });
  });

type LineIssue = [path: string, message: string];
const positive = (value: string) => Number(value) > 0;

/** What arrived: an existing item, or a new one named on the line. */
function itemIssues(line: ReceiptLineValues): LineIssue[] {
  if (line.mode === 'existing') return line.productId === '' ? [['productId', 'Choose an item.']] : [];
  const issues: LineIssue[] = [];
  if (line.newName === '') issues.push(['newName', 'Enter a name.']);
  if (!positive(line.newUnitsPerPack)) issues.push(['newUnitsPerPack', 'Enter how many base units one pack holds.']);
  return issues;
}

/** How much arrived and what it cost: by the case, or by the pack with loose units. */
function amountIssues(line: ReceiptLineValues): LineIssue[] {
  const issues: LineIssue[] = [];
  if (line.useCases) {
    if (!positive(line.cases)) issues.push(['cases', 'Enter the number of cases.']);
    if (!positive(line.packsPerCase)) issues.push(['packsPerCase', 'Enter the packs in one case.']);
    if (line.costPerCase === '') issues.push(['costPerCase', 'Enter the cost of one case.']);
    return issues;
  }
  if (line.costPerPack === '') issues.push(['costPerPack', 'Enter the cost of one pack.']);
  if (!positive(line.packs) && !positive(line.looseUnits)) issues.push(['packs', 'Enter how many packs arrived.']);
  return issues;
}

export type ReceiptLineValues = z.infer<typeof receiptLineSchema>;

export const emptyReceiptLine: ReceiptLineValues = {
  mode: 'existing',
  productId: '',
  newName: '',
  newPackUnit: '',
  newBaseUnit: '',
  newUnitsPerPack: '1',
  newSerialTracked: false,
  useCases: false,
  cases: '',
  packsPerCase: '',
  costPerCase: '',
  sscc: '',
  packs: '',
  costPerPack: '',
  looseUnits: '',
  lotCode: '',
  expiresOn: '',
  location: '',
  notes: '',
  serials: '',
};

/** Today on the device's calendar. `current_date` on the server is UTC, which is yesterday or tomorrow near midnight. */
export function localToday() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyReceiptHeader(): ReceiptHeaderValues {
  return { supplierId: '', invoiceNo: '', receivedOn: localToday(), receivedBy: '', location: '', freight: '', notes: '' };
}

export const serialList = (serials: string) =>
  serials
    .split('\n')
    .map((serial) => serial.trim())
    .filter(Boolean);

/** Whole packs on a line: cases × packs per case, or the packs typed. */
export function linePacks(line: ReceiptLineValues) {
  return line.useCases ? Number(line.cases) * Number(line.packsPerCase) : Number(line.packs || 0);
}

/** A line's value before freight, the same sum stock_lots.line_cost stores. */
export function lineCost(line: ReceiptLineValues, unitsPerPack: number) {
  const perPack = line.useCases ? Number(line.costPerCase) / Number(line.packsPerCase) : Number(line.costPerPack);
  return linePacks(line) * perPack + (Number(line.looseUnits || 0) * perPack) / unitsPerPack;
}

const orNull = (value: string) => (value === '' ? null : value);

export function toReceiptPayload(merchantId: string, header: ReceiptHeaderValues, lines: ReceiptLineValues[]) {
  return {
    merchant_id: merchantId,
    supplier_id: orNull(header.supplierId),
    invoice_no: orNull(header.invoiceNo),
    received_on: header.receivedOn,
    received_by: orNull(header.receivedBy),
    location: orNull(header.location),
    freight: Number(header.freight || 0),
    notes: orNull(header.notes),
    lines: lines.map((line) => ({
      ...(line.mode === 'new'
        ? {
            new_item: {
              item: {
                name: line.newName,
                conversion_factor: Number(line.newUnitsPerPack),
                pack_unit_name: orNull(line.newPackUnit),
                base_unit_name: orNull(line.newBaseUnit),
                serial_tracked: line.newSerialTracked,
                // A new item from a delivery starts as stock only; the Inventory form makes it sellable.
                sell_by: 'pack',
                stock_role: 'component',
              },
            },
          }
        : { product_id: line.productId }),
      ...(line.useCases
        ? {
            cases: Number(line.cases),
            packs_per_case: Number(line.packsPerCase),
            cost_per_case: Number(line.costPerCase),
            sscc: orNull(line.sscc),
          }
        : { packs: Number(line.packs || 0), cost_per_pack: Number(line.costPerPack) }),
      loose_units: Number(line.looseUnits || 0),
      lot_code: orNull(line.lotCode),
      expires_on: orNull(line.expiresOn),
      location: orNull(line.location),
      notes: orNull(line.notes),
      serials: serialList(line.serials),
    })),
  };
}
