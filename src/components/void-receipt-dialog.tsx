import { useState } from 'react';

import { stockFailure, useVoidReceiptMutation } from '../features/stock-receipts/queries';
import { failureMessage, mutationNotice } from '../lib/errors';
import { ConfirmDialog } from './confirm-dialog';
import { HelperText } from './helper-text';
import { Text } from './text';
import { TextInput } from './text-input';

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
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const trimmed = reason.trim();
  const reasonError = trimmed === '' ? 'Say why this receipt is being voided.' : null;

  const submit = () => {
    setTried(true);
    if (reasonError) return;
    voidReceipt.mutate({ id: receipt.id, reason: trimmed }, { onSuccess: onDismiss });
  };

  return (
    <ConfirmDialog
      inSheet={inSheet}
      onDismiss={onDismiss}
      kicker="Void receipt"
      title={`Void ${receipt.code}?`}
      confirmLabel="Void receipt"
      onConfirm={submit}
      mutation={voidReceipt}
      notice={mutationNotice(voidReceipt, refusalText(stockFailure(voidReceipt.error)))}
    >
      <Text variant="bodyMedium">
        Every item on it goes back to what it was before this delivery. The receipt stays in the list, marked Void.
      </Text>
      <TextInput
        mode="outlined"
        dense
        label="Reason"
        value={reason}
        onChangeText={setReason}
        maxLength={500}
        multiline
        error={tried && reasonError !== null}
        accessibilityLabel="Reason for voiding"
      />
      <HelperText type="error" visible={tried && reasonError !== null} padding="none">
        {reasonError}
      </HelperText>
    </ConfirmDialog>
  );
}

function refusalText(failure: string | null) {
  if (failure === 'receipt_has_movements')
    return 'Stock from this receipt has already moved, so it cannot be voided. Correct the item with an adjustment instead.';
  if (failure === 'receipt_voided') return 'This receipt is already void.';
  return failureMessage("Couldn't void this receipt. Try again.");
}
