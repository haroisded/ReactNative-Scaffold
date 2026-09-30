import * as z from 'zod';

// The Adjust / Write off / Return to supplier dialog (src/components/stock-movement-dialog.tsx). The
// rules are record_stock_movement's (20260929100100_stock_ledger.sql §5), reported here before a
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
    if (values.kind === 'write_off' && values.reason === '') need('reason', 'Choose a reason.');
    if (noteRequired(values) && values.note === '') {
      need('note', values.kind === 'adjust' ? 'Say why the count changed.' : 'Describe what happened.');
    }
  });

export type MovementValues = z.infer<typeof movementSchema>;

/** An adjust, and a write-off for "Other", must say why. Also marks the Note label "(required)". */
export function noteRequired(values: Pick<MovementValues, 'kind' | 'reason'>) {
  return values.kind === 'adjust' || (values.kind === 'write_off' && values.reason === 'other');
}

export function toMovementPayload(packId: string, values: MovementValues) {
  return {
    kind: values.kind,
    pack_id: packId,
    qty: Number(values.qty),
    reason: values.kind === 'write_off' ? values.reason : null,
    note: values.note === '' ? null : values.note,
  };
}
