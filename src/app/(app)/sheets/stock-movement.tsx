import { router, useLocalSearchParams } from 'expo-router';

import { StockMovementDialog } from '../../../components/stock-movement-dialog';
import type { ManualMovementKind } from '../../../features/stock-movements/schema';

// Adjust, write off or return stock on a narrow container (instruction_mds/visual-language.md §5).
// Exactly one of lotId / caseId / packId is passed: the row the merchant opened it from.
export default function StockMovementSheet() {
  const { productId, lotId, caseId, packId, kind } = useLocalSearchParams<{
    productId: string;
    lotId?: string;
    caseId?: string;
    packId?: string;
    kind: ManualMovementKind;
  }>();
  const target = packId ? { packId } : caseId ? { caseId } : lotId ? { lotId } : null;

  if (!target) return null;

  return <StockMovementDialog productId={productId} target={target} kind={kind} inSheet onDismiss={() => router.back()} />;
}
