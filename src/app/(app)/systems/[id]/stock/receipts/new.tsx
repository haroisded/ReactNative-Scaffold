import { useShellMerchant } from '../../../../../../features/merchants/queries';
import { ReceiptWizard } from '../../../../../../screens/receipt-wizard';

export default function NewReceiptScreen() {
  const merchant = useShellMerchant();

  return <ReceiptWizard merchantId={merchant.id} currency={merchant.currency} />;
}
