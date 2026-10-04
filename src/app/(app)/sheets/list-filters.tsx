import { router, useLocalSearchParams } from 'expo-router';

import { ListFiltersDialog } from '../../../components/list-filters-dialog';
import type { ResourceScope } from '../../../features/products/resources';

// A list's Filters panel on a narrow container (instruction_mds/frontend.md §5). The filters live in
// src/Store/list-filters.ts, so nothing comes back through a sheet result.
export default function ListFiltersSheet() {
  const { merchantId, scope } = useLocalSearchParams<{ merchantId: string; scope: ResourceScope }>();

  return <ListFiltersDialog merchantId={merchantId} scope={scope} inSheet onDismiss={() => router.back()} />;
}
