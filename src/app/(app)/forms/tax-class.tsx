import { router, useLocalSearchParams } from 'expo-router';

import { TaxClassDialog } from '../../../components/tax-class-dialog';
import { setSheetResult } from '../../../Store/sheet-result';

// Create a tax class — a full page on a phone, a Dialog over the screen on a tablet (instruction_mds/frontend.md §4.4); the new row goes back to the
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
