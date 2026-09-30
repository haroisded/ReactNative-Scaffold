import { saleFailure, useVoidSaleMutation } from '../features/sales/queries';
import { failureMessage } from '../lib/errors';
import { VoidDialog } from './void-dialog';

type Props = {
  sale: { id: string; code: string };
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/void-sale.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

/**
 * Void a sale: every unit it drew goes back to the pack it came from, as a void movement each (void_sale,
 * 20260930110000_sales.sql §3). The sale stays in the list, marked Void — the history is not rewritten.
 */
export function VoidSaleDialog({ sale, inSheet, onDismiss }: Props) {
  const voidSale = useVoidSaleMutation();

  return (
    <VoidDialog
      noun="sale"
      code={sale.code}
      body="Everything it sold goes back into stock, to the packs it came from. Hand the cash back yourself."
      inSheet={inSheet}
      onDismiss={onDismiss}
      mutation={voidSale}
      errorText={refusalText(saleFailure(voidSale.error)?.name ?? null)}
      onVoid={(reason) => voidSale.mutate({ id: sale.id, reason }, { onSuccess: onDismiss })}
    />
  );
}

function refusalText(failure: string | null) {
  if (failure === 'sale_voided') return 'This sale is already void.';
  if (failure === 'pack_over_capacity')
    return "A pack this sale drew from can't take its units back. Correct the item with an adjustment instead.";
  return failureMessage("Couldn't void this sale. Try again.");
}
