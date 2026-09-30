import { useLocalSearchParams } from 'expo-router';

import { useShellMerchant } from '../../../../../features/merchants/queries';
import { SaleDetailScreen } from '../../../../../screens/sale-detail';

export default function SaleScreen() {
  const merchant = useShellMerchant();
  // Every push to this route passes saleId, so it is always in this route's own params.
  const { saleId } = useLocalSearchParams<{ saleId: string }>();

  return <SaleDetailScreen currency={merchant.currency} id={saleId} />;
}
