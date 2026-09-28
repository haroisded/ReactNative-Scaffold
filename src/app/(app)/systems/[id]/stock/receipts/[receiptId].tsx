import { useLocalSearchParams } from 'expo-router';

import { useShellMerchant } from '../../../../../../features/merchants/queries';
import { ReceiptDetailScreen } from '../../../../../../screens/receipt-detail';

export default function ReceiptScreen() {
  const merchant = useShellMerchant();
  // Every push to this route passes receiptId, so it is always in this route's own params.
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();

  return <ReceiptDetailScreen currency={merchant.currency} id={receiptId} />;
}
