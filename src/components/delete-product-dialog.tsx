import { deleteRefusal, useDeleteProductsMutation } from '../features/products/queries';
import { failureMessage, mutationNotice } from '../lib/errors';
import { ConfirmDialog } from './confirm-dialog';
import { NoteCallout } from './note-callout';
import { Text } from './text';

type Props = {
  /** One product from its row or detail header, or the bulk selection. */
  products: { id: string; name: string }[];
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/delete-product.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
  /** After the delete lands — the detail screen leaves, the list clears its selection. */
  onDone: () => void;
};

/**
 * Delete permanently. Archive is not offered here: it is its own button now, it writes immediately and
 * the snackbar carries the Undo (src/components/archive-undo.tsx). One dialog, one irreversible action.
 *
 * Delete is meant to be blocked once a product has order or recipe history. Orders do not exist yet, and a
 * product used as a bundle component is refused by the database (23503), so Delete is enabled and that
 * refusal is reported below rather than pre-checked.
 */
export function DeleteProductDialog({ products, inSheet, onDismiss, onDone }: Props) {
  const remove = useDeleteProductsMutation();
  const single = products.length === 1 ? products[0] : undefined;

  return (
    <ConfirmDialog
      inSheet={inSheet}
      onDismiss={onDismiss}
      kicker="Delete permanently"
      title={single ? `Delete ${single.name}?` : `Delete ${products.length} products?`}
      confirmLabel="Delete"
      onConfirm={() => remove.mutate(products.map((product) => product.id), { onSuccess: onDone })}
      mutation={remove}
      notice={mutationNotice(remove, refusalText(deleteRefusal(remove.error), single !== undefined))}
    >
      <Text variant="bodyMedium">
        {single ? 'This removes it' : 'This removes them'} with every variant, rate and component.
        Archive instead to keep the details and hide {single ? 'it' : 'them'} from the register.
      </Text>
      <NoteCallout tone="error">This can&apos;t be undone.</NoteCallout>
    </ConfirmDialog>
  );
}

function refusalText(refusal: ReturnType<typeof deleteRefusal>, single: boolean) {
  if (refusal === 'bundle')
    return `${single ? 'This product is' : 'One of these products is'} a component of a bundle. Remove it from the bundle first, or archive it instead.`;
  if (refusal === 'stock')
    return `${single ? 'This item has' : 'One of these items has'} stock history, so it cannot be deleted. Archive it once its stock is gone.`;
  return failureMessage("Couldn't delete. Try again.");
}
