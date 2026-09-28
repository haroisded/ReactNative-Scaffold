import { useShellMerchant } from '../../../../../features/merchants/queries';
import { StockItemForm } from '../../../../../screens/stock-item-form';

// Inventory creates stock items and nothing else, so there is nothing to ask first.
export default function NewItemScreen() {
  const merchant = useShellMerchant();

  return <StockItemForm merchantId={merchant.id} product={null} />;
}
