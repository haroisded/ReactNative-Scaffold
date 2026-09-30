import { router, useLocalSearchParams } from 'expo-router';

import { StockMovementDialog } from '../../../components/stock-movement-dialog';
import type { ManualMovementKind } from '../../../features/stock-movements/schema';

// Adjust, write off or return stock as a full page at every width (instruction_mds/visual-language.md §5): the
// pack the merchant opened it from.
export default function StockMovementPage() {
  const { productId, packId, kind } = useLocalSearchParams<{ productId: string; packId: string; kind: ManualMovementKind }>();

  return <StockMovementDialog productId={productId} packId={packId} kind={kind} onDismiss={() => router.back()} />;
}
