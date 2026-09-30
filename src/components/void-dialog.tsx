import { useState } from 'react';

import { mutationNotice } from '../lib/errors';
import { ConfirmDialog } from './confirm-dialog';
import { HelperText } from './helper-text';
import { Text } from './text';
import { TextInput } from './text-input';

type Props = {
  /** "receipt", "sale": reads "Void receipt", "Void RC-00012?", "Say why this receipt is being voided." */
  noun: string;
  code: string;
  /** What voiding does, in one or two sentences. */
  body: string;
  /** Rendered as the body of a narrow formSheet route (src/app/(app)/sheets/). */
  inSheet?: boolean;
  onDismiss: () => void;
  mutation: { isPending: boolean; isPaused: boolean; isError: boolean };
  /** The copy for the refusal the write raised, else failureMessage(). */
  errorText: string;
  onVoid: (reason: string) => void;
};

/** A void confirm with its required reason: Void receipt (Stock) and Void sale (Receipts). */
export function VoidDialog({ noun, code, body, inSheet, onDismiss, mutation, errorText, onVoid }: Props) {
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const trimmed = reason.trim();
  const reasonError = trimmed === '' ? `Say why this ${noun} is being voided.` : null;

  const submit = () => {
    setTried(true);
    if (!reasonError) onVoid(trimmed);
  };

  return (
    <ConfirmDialog
      inSheet={inSheet}
      onDismiss={onDismiss}
      kicker={`Void ${noun}`}
      title={`Void ${code}?`}
      confirmLabel={`Void ${noun}`}
      onConfirm={submit}
      mutation={mutation}
      notice={mutationNotice(mutation, errorText)}
    >
      <Text variant="bodyMedium">{body}</Text>
      <TextInput
        mode="outlined"
        dense
        label="Reason (required)"
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
