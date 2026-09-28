import { router, useLocalSearchParams } from 'expo-router';

import { VoidReceiptDialog } from '../../../components/void-receipt-dialog';
import { useStockReceiptQuery } from '../../../features/stock-receipts/queries';

// Void a receipt on a narrow container (instruction_mds/visual-language.md §5).
export default function VoidReceiptSheet() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const receipt = useStockReceiptQuery({ id: receiptId }).data;

  if (!receipt) return null;

  return <VoidReceiptDialog receipt={receipt} inSheet onDismiss={() => router.back()} />;
}
