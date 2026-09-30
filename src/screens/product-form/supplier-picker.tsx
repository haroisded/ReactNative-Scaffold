import { router } from 'expo-router';

import { MenuSelect } from '../../components/menu-select';
import { useSuppliersQuery } from '../../features/suppliers/queries';
import { useSheetResult } from '../../Store/sheet-result';

type Props = {
  merchantId: string;
  value: string;
  onChange: (id: string) => void;
  accessibilityLabel: string;
};

/**
 * Supplier select with inline create. A product need not have a supplier, so "None" is offered.
 *
 * The create form is a full-page route at every width, whose row comes back through the sheet-result
 * slot (src/Store/sheet-result.ts).
 */
export function SupplierPicker({ merchantId, value, onChange, accessibilityLabel }: Props) {
  const suppliers = useSuppliersQuery({ merchantId });
  useSheetResult('supplier', onChange);

  return (
    <MenuSelect
      value={value}
      options={[
        { value: '', label: 'None' },
        ...(suppliers.data ?? []).map((supplier) => ({ value: supplier.id, label: supplier.name })),
      ]}
      onChange={onChange}
      placeholder={suppliers.isError ? "Couldn't load suppliers" : suppliers.isPending ? 'Loading…' : 'None'}
      accessibilityLabel={accessibilityLabel}
      createLabel="New supplier"
      onCreate={() => router.push({ pathname: '/forms/supplier', params: { merchantId, resultKey: 'supplier' } })}
    />
  );
}
