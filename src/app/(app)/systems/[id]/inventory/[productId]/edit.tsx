import { useLocalSearchParams } from 'expo-router';

import { useShellMerchant } from '../../../../../../features/merchants/queries';
import { ProductGate } from '../../../../../../screens/product-detail';
import { StockItemForm } from '../../../../../../screens/stock-item-form';

export default function EditItemScreen() {
  const merchant = useShellMerchant();
  const { productId } = useLocalSearchParams<{ productId: string }>();

  // The gate mounts the form only once the item has loaded, so its defaultValues are the saved item on
  // the first render.
  return (
    <ProductGate id={productId} scope="inventory">
      {(product) => <StockItemForm merchantId={merchant.id} product={product} />}
    </ProductGate>
  );
}
