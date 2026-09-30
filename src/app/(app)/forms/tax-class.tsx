import { router, useLocalSearchParams } from 'expo-router';

import { TaxClassDialog } from '../../../components/tax-class-dialog';
import { setSheetResult } from '../../../Store/sheet-result';

// Create a tax class as a full page at every width (instruction_mds/visual-language.md §5); the new row goes back to the
// picker that opened the page.
export default function TaxClassPage() {
  const { merchantId, resultKey } = useLocalSearchParams<{ merchantId: string; resultKey?: string }>();

  return (
    <TaxClassDialog
      merchantId={merchantId}
      onDismiss={() => router.back()}
      onCreated={(row) => {
        if (resultKey) setSheetResult(resultKey, row.id);
      }}
    />
  );
}
