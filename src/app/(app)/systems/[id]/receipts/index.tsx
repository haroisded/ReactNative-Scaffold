import { useShellMerchant } from '../../../../../features/merchants/queries';
import { Sales } from '../../../../../screens/sales';

export default function ReceiptsScreen() {
  // From the shell, not from this route's params: the rail navigates here with none.
  const merchant = useShellMerchant();

  return <Sales merchantId={merchant.id} merchantName={merchant.name} currency={merchant.currency} />;
}
