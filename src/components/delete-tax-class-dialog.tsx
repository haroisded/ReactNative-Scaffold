import { useDeleteTaxClassMutation } from '../features/tax-classes/queries';
import type { TaxClass } from '../features/tax-classes/queries';
import { failureMessage, mutationNotice } from '../lib/errors';
import { ConfirmDialog } from './confirm-dialog';
import { Text } from './text';

type Props = {
  taxClass: TaxClass;
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/delete-tax-class.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

/** Delete a tax class, from the Setup screen. Products using it lose the class (on delete set null). */
export function DeleteTaxClassDialog({ taxClass, inSheet, onDismiss }: Props) {
  const remove = useDeleteTaxClassMutation();

  return (
    <ConfirmDialog
      inSheet={inSheet}
      onDismiss={onDismiss}
      kicker="Delete tax class"
      title={`Delete ${taxClass.name}?`}
      confirmLabel="Delete"
      onConfirm={() => remove.mutate(taxClass.id, { onSuccess: onDismiss })}
      mutation={remove}
      notice={mutationNotice(remove, failureMessage("Couldn't delete this tax class. Try again."))}
    >
      <Text variant="bodyMedium">Products using it keep everything else and lose their tax class.</Text>
    </ConfirmDialog>
  );
}
