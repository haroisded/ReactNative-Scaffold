import { useShellMerchant } from '../../../../../features/merchants/queries';
import { Stock } from '../../../../../screens/stock';

export default function StockScreen() {
  // From the shell, not from this route's params: the rail navigates here with none.
  const merchant = useShellMerchant();

  return <Stock merchantId={merchant.id} merchantName={merchant.name} currency={merchant.currency} />;
}
