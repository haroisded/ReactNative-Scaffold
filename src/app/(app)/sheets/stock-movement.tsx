import { router, useLocalSearchParams } from 'expo-router';

import { StockMovementDialog } from '../../../components/stock-movement-dialog';
import type { ManualMovementKind } from '../../../features/stock-movements/schema';

// Adjust, write off or return stock on a narrow container (instruction_mds/visual-language.md §4): the
// pack the merchant opened it from.
export default function StockMovementSheet() {
  const { productId, packId, kind } = useLocalSearchParams<{ productId: string; packId: string; kind: ManualMovementKind }>();

  return <StockMovementDialog productId={productId} packId={packId} kind={kind} inSheet onDismiss={() => router.back()} />;
}
