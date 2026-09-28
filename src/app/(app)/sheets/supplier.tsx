import { router, useLocalSearchParams } from 'expo-router';

import { SupplierDialog } from '../../../components/supplier-dialog';
import { useSuppliersQuery } from '../../../features/suppliers/queries';
import { setSheetResult } from '../../../Store/sheet-result';

// Create or edit a supplier on a narrow container (instruction_mds/visual-language.md §5). A created
// row goes back to the picker that opened the sheet; `supplierId` opens it on that supplier instead.
export default function SupplierSheet() {
  const { merchantId, supplierId, resultKey } = useLocalSearchParams<{
    merchantId: string;
    supplierId?: string;
    resultKey?: string;
  }>();
  const suppliers = useSuppliersQuery({ merchantId });
  const supplier = supplierId ? suppliers.data?.find((row) => row.id === supplierId) : undefined;

  // The list the sheet was opened from is already cached, so this waits only on a deep link.
  if (supplierId && !supplier) return null;

  return (
    <SupplierDialog
      merchantId={merchantId}
      supplier={supplier}
      inSheet
      onDismiss={() => router.back()}
      onCreated={(row) => {
        if (resultKey) setSheetResult(resultKey, row.id);
      }}
    />
  );
}
