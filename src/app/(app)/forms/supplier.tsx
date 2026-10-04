import { router, useLocalSearchParams } from 'expo-router';

import { SupplierDialog } from '../../../components/supplier-dialog';
import { useSuppliersQuery } from '../../../features/suppliers/queries';
import { setSheetResult } from '../../../Store/sheet-result';

// Create or edit a supplier — a full page on a phone, a Dialog over the screen on a tablet (instruction_mds/frontend.md §4.4). A created
// row goes back to the picker that opened the page; `supplierId` opens the page on that supplier instead.
export default function SupplierPage() {
  const { merchantId, supplierId, resultKey } = useLocalSearchParams<{
    merchantId: string;
    supplierId?: string;
    resultKey?: string;
  }>();
  const suppliers = useSuppliersQuery({ merchantId });
  const supplier = supplierId ? suppliers.data?.find((row) => row.id === supplierId) : undefined;

  // The list the page was opened from is already cached, so this waits only on a deep link.
  if (supplierId && !supplier) return null;

  return (
    <SupplierDialog
      merchantId={merchantId}
      supplier={supplier}
      onDismiss={() => router.back()}
      onCreated={(row) => {
        if (resultKey) setSheetResult(resultKey, row.id);
      }}
    />
  );
}
