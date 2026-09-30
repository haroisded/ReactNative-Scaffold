import { stockFailure, useVoidReceiptMutation } from '../features/stock-receipts/queries';
import { failureMessage } from '../lib/errors';
import { VoidDialog } from './void-dialog';

type Props = {
  receipt: { id: string; code: string };
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/void-receipt.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

/**
 * Void a receipt: every lot back to zero with a void movement each (void_receipt,
 * 20260928100200_stock_receipts.sql §4). Refused once anything but the receive has touched its stock —
 * corrections after that are adjustments on the item, which keep the history.
 */
export function VoidReceiptDialog({ receipt, inSheet, onDismiss }: Props) {
  const voidReceipt = useVoidReceiptMutation();

  return (
    <VoidDialog
      noun="receipt"
      code={receipt.code}
      body="Every item on it goes back to what it was before this delivery. The receipt stays in the list, marked Void."
      inSheet={inSheet}
      onDismiss={onDismiss}
      mutation={voidReceipt}
      errorText={refusalText(stockFailure(voidReceipt.error))}
      onVoid={(reason) => voidReceipt.mutate({ id: receipt.id, reason }, { onSuccess: onDismiss })}
    />
  );
}

function refusalText(failure: string | null) {
  if (failure === 'receipt_has_movements')
    return 'Stock from this receipt has already moved, so it cannot be voided. Correct the item with an adjustment instead.';
  if (failure === 'receipt_voided') return 'This receipt is already void.';
  return failureMessage("Couldn't void this receipt. Try again.");
}
