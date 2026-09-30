import { router } from 'expo-router';

import { childrenOf, topLevel, useCategoriesQuery } from '../features/categories/queries';
import type { ResourceScope } from '../features/products/resources';
import { useSheetResult } from '../Store/sheet-result';
import { MenuSelect } from './menu-select';

type Props = {
  merchantId: string;
  /** Which screen's categories to offer, and which list a new one is created in. */
  scope: ResourceScope;
  /** Pick a subcategory of this category. Null picks a top-level category. */
  parentId: string | null;
  value: string;
  onChange: (id: string) => void;
  accessibilityLabel: string;
  error?: boolean;
  /** A subcategory is optional, so its picker offers "None". */
  clearable?: boolean;
};

/**
 * The inline-create picker (instruction_mds/visual-language.md §5): a Select whose last row opens the create
 * dialog, and whatever is created comes back selected. The merchant never leaves the form to set up a
 * category first.
 *
 * Only this screen's categories are offered, and a new one is created in this screen's list — the
 * database refuses the other combination anyway.
 *
 * The create form is a full-page route at every width, so the row comes back through the sheet-result
 * slot under this picker's key.
 *
 * In src/components/ because the product form and the stock item form both use it.
 */
export function CategoryPicker({ merchantId, scope, parentId, value, onChange, accessibilityLabel, error, clearable }: Props) {
  const categories = useCategoriesQuery({ merchantId, scope });
  const resultKey = parentId ? 'subcategory' : 'category';
  useSheetResult(resultKey, onChange);

  const all = categories.data ?? [];
  // No category has a null id, so a top-level picker finds no parent.
  const parent = all.find((category) => category.id === parentId) ?? null;
  const rows = parentId ? childrenOf(all, parentId) : topLevel(all);
  const options = rows.map((category) => ({ value: category.id, label: category.name }));

  const create = () =>
    router.push({ pathname: '/forms/category', params: { merchantId, scope, resultKey, parentId: parent?.id } });

  return (
    <MenuSelect
      value={value}
      options={clearable ? [{ value: '', label: 'None' }, ...options] : options}
      onChange={onChange}
      placeholder={placeholder(categories, parentId !== null)}
      accessibilityLabel={accessibilityLabel}
      error={error}
      // A subcategory needs its parent picked first.
      disabled={parentId !== null && !parent}
      createLabel={`New ${resultKey}`}
      onCreate={create}
    />
  );
}

function placeholder(categories: { isError: boolean; isPending: boolean }, sub: boolean) {
  if (categories.isError) return "Couldn't load categories";
  if (categories.isPending) return 'Loading…';
  return sub ? 'Select subcategory' : 'Select category';
}
