import * as z from 'zod';

import type { MovementTarget } from './queries';

// The Adjust / Write off / Return to supplier dialog (src/components/stock-movement-dialog.tsx). The
// rules are record_stock_movement's (20260928100200_stock_receipts.sql §6), reported here before a
// round trip: an adjust needs a note, a write-off needs a reason, and "Other" needs a note as well.

export const movementKind = z.enum(['adjust', 'write_off', 'return_supplier']);
export type ManualMovementKind = z.infer<typeof movementKind>;

export const writeOffReason = z.enum(['expired', 'damaged', 'lost', 'other']);
export type WriteOffReason = z.infer<typeof writeOffReason>;

export const WRITE_OFF_REASON_LABEL = {
  expired: 'Expired',
  damaged: 'Damaged',
  lost: 'Lost',
  other: 'Other',
} satisfies Record<WriteOffReason, string>;

export const movementSchema = z
  .object({
    kind: movementKind,
    /** Base units. An adjust is signed — "-3" takes three away; the other two are always an amount removed. */
    qty: z.string().trim(),
    reason: writeOffReason.or(z.literal('')),
    note: z.string().trim().max(500, 'A note can be up to 500 characters.'),
  })
  .superRefine((values, ctx) => {
    const need = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    const pattern = values.kind === 'adjust' ? /^-?\d{1,10}(\.\d{0,4})?$/ : /^\d{1,10}(\.\d{0,4})?$/;
    if (!pattern.test(values.qty) || Number(values.qty) === 0) {
      need('qty', values.kind === 'adjust' ? 'Enter the change, like 5 or -3.' : 'Enter how many units leave.');
    }
    if (values.kind === 'adjust' && values.note === '') need('note', 'Say why the count changed.');
    if (values.kind === 'write_off' && values.reason === '') need('reason', 'Choose a reason.');
    if (values.kind === 'write_off' && values.reason === 'other' && values.note === '') need('note', 'Describe what happened.');
  });

export type MovementValues = z.infer<typeof movementSchema>;

export function toMovementPayload(target: MovementTarget, values: MovementValues) {
  return {
    kind: values.kind,
    ...('lotId' in target ? { lot_id: target.lotId } : 'caseId' in target ? { case_id: target.caseId } : { pack_id: target.packId }),
    qty: Number(values.qty),
    reason: values.kind === 'write_off' ? values.reason : null,
    note: values.note === '' ? null : values.note,
  };
}
