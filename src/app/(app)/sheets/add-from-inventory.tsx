import { router, useLocalSearchParams } from 'expo-router';

import { AddFromInventoryDialog } from '../../../components/add-from-inventory-dialog';

// Assets → Add from Inventory on a narrow container (instruction_mds/visual-language.md §4).
export default function AddFromInventorySheet() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();

  return <AddFromInventoryDialog merchantId={merchantId} inSheet onDismiss={() => router.back()} />;
}
