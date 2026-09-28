import { useLocalSearchParams } from 'expo-router';

import { useShellMerchant } from '../../../../../../features/merchants/queries';
import { InventoryDetail } from '../../../../../../screens/inventory-detail';
import { ProductGate } from '../../../../../../screens/product-detail';

export default function InventoryDetailScreen() {
  const merchant = useShellMerchant();
  // Every push to this route passes productId, so it is always in this route's own params.
  const { productId } = useLocalSearchParams<{ productId: string }>();

  return (
    <ProductGate id={productId} scope="inventory">
      {(product) => <InventoryDetail merchantId={merchant.id} product={product} />}
    </ProductGate>
  );
}
