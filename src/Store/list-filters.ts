import { create } from 'zustand';

import type { ProductSort } from '../features/products/queries';
import type { ResourceScope } from '../features/products/resources';
import type { ProductStatus, ProductType } from '../features/products/schema';
import type { StockRole } from '../features/products/stock-item';

/** Inventory only: where an item's stock came from. */
export type InventorySource = 'all' | 'stock' | 'inventory';

export type ListFilters = {
  categoryId: string;
  type: ProductType | '';
  status: ProductStatus | 'all';
  lowStockOnly: boolean;
  // Inventory only: the item's type, where its stock came from, and whether the lot drill lists used-up packs.
  role: StockRole | '';
  source: InventorySource;
  showEmpty: boolean;
  sort: ProductSort;
};

export const NO_FILTERS: ListFilters = {
  categoryId: '',
  type: '',
  status: 'all',
  lowStockOnly: false,
  role: '',
  source: 'all',
  showEmpty: false,
  sort: 'name',
};

/**
 * A list screen's filters (src/screens/product-list/), per system and screen. Held here, not in the screen,
 * because two things outside it share them: every folder level is its own pushed screen, and the narrow
 * Filters panel is a formSheet route (src/app/(app)/sheets/list-filters.tsx).
 *
 * Rejected: carrying the filters in each folder's route params — a change made three folders deep would be
 * lost on Back.
 */
const useListFiltersStore = create<Record<string, ListFilters>>(() => ({}));

export function useListFilters(merchantId: string, scope: ResourceScope) {
  const key = `${merchantId}:${scope}`;
  const filters = useListFiltersStore((state) => state[key] ?? NO_FILTERS);
  const patch = (next: Partial<ListFilters>) =>
    useListFiltersStore.setState((state) => ({ [key]: { ...(state[key] ?? NO_FILTERS), ...next } }));
  return [filters, patch] as const;
}
