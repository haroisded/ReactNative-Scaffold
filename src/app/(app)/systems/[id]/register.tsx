import { useShellMerchant } from '../../../../features/merchants/queries';
import { Register } from '../../../../screens/register';

export default function RegisterScreen() {
  // From the shell, not from this route's params: the rail navigates here with none.
  const merchant = useShellMerchant();

  return <Register merchantId={merchant.id} merchantName={merchant.name} currency={merchant.currency} />;
}
