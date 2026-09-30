import { router, useLocalSearchParams } from 'expo-router';

import { VoidSaleDialog } from '../../../components/void-sale-dialog';
import { useSaleQuery } from '../../../features/sales/queries';

// Void a sale on a narrow container (instruction_mds/visual-language.md §5).
export default function VoidSaleSheet() {
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const sale = useSaleQuery({ id: saleId }).data;

  if (!sale) return null;

  return <VoidSaleDialog sale={sale} inSheet onDismiss={() => router.back()} />;
}
