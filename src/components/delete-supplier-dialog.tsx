import { hasReceipts, useDeleteSupplierMutation } from '../features/suppliers/queries';
import type { Supplier } from '../features/suppliers/queries';
import { failureMessage, mutationNotice } from '../lib/errors';
import { ConfirmDialog } from './confirm-dialog';
import { Text } from './text';

type Props = {
  supplier: Supplier;
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/delete-supplier.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

/** Delete a supplier. Products using it lose the supplier (on delete set null); one with receipts is refused. */
export function DeleteSupplierDialog({ supplier, inSheet, onDismiss }: Props) {
  const remove = useDeleteSupplierMutation();

  return (
    <ConfirmDialog
      inSheet={inSheet}
      onDismiss={onDismiss}
      kicker="Delete supplier"
      title={`Delete ${supplier.name}?`}
      confirmLabel="Delete"
      onConfirm={() => remove.mutate(supplier.id, { onSuccess: onDismiss })}
      mutation={remove}
      notice={mutationNotice(
        remove,
        hasReceipts(remove.error)
          ? 'This supplier has receipts, so it can only be deactivated. Edit it and turn Active off.'
          : failureMessage("Couldn't delete this supplier. Try again.")
      )}
    >
      <Text variant="bodyMedium">Products using it keep everything else and lose their supplier.</Text>
    </ConfirmDialog>
  );
}
