import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { stockFailure, useVoidReceiptMutation } from '../features/stock-receipts/queries';
import { useShellWide } from '../lib/columns';
import { failureMessage } from '../lib/errors';
import { useAppTheme } from '../lib/theme';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { HelperText } from './helper-text';
import { Text } from './text';
import { TextInput } from './text-input';

type Props = {
  receipt: { id: string; code: string };
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/void-receipt.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

type Notice = { type: 'error' | 'info'; text: string };

/**
 * Void a receipt: every lot back to zero with a void movement each (void_receipt,
 * 20260928100200_stock_receipts.sql §4). Refused once anything but the receive has touched its stock —
 * corrections after that are adjustments on the item, which keep the history.
 */
export function VoidReceiptDialog({ receipt, inSheet, onDismiss }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const voidReceipt = useVoidReceiptMutation();
  const inFlight = voidReceipt.isPending && !voidReceipt.isPaused;
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const trimmed = reason.trim();
  const reasonError = trimmed === '' ? 'Say why this receipt is being voided.' : null;

  const failure = stockFailure(voidReceipt.error);
  const notice: Notice | null = voidReceipt.isPaused
    ? { type: 'info', text: 'Waiting for a connection. This finishes on its own when you reconnect.' }
    : voidReceipt.isError
      ? {
          type: 'error',
          text:
            failure === 'receipt_has_movements'
              ? 'Stock from this receipt has already moved, so it cannot be voided. Correct the item with an adjustment instead.'
              : failure === 'receipt_voided'
                ? 'This receipt is already void.'
                : failureMessage("Couldn't void this receipt. Try again."),
        }
      : null;

  const submit = () => {
    setTried(true);
    if (reasonError) return;
    voidReceipt.mutate({ id: receipt.id, reason: trimmed }, { onSuccess: onDismiss });
  };

  return (
    <AdaptiveDialog
      wide={wide}
      inSheet={inSheet}
      onDismiss={onDismiss}
      dismissable={!inFlight}
      kicker="Void receipt"
      kickerTone="error"
      title={`Void ${receipt.code}?`}
      actions={
        <>
          <Button mode="outlined" onPress={onDismiss} disabled={inFlight} contentStyle={styles.action}>
            Cancel
          </Button>
          <Button
            mode="contained"
            buttonColor={colors.error}
            textColor={colors.onError}
            onPress={submit}
            loading={voidReceipt.isPending}
            disabled={voidReceipt.isPending}
            contentStyle={styles.action}
          >
            Void receipt
          </Button>
        </>
      }
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
      <HelperText type={notice?.type ?? 'error'} visible={notice !== null} padding="none">
        {notice?.text}
      </HelperText>
    </AdaptiveDialog>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: 'flex-start' },
});
