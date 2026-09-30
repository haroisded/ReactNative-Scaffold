import { router } from 'expo-router';

import { MenuSelect } from '../../components/menu-select';
import { taxClassLabel, useTaxClassesQuery } from '../../features/tax-classes/queries';
import { useSheetResult } from '../../Store/sheet-result';

type Props = {
  merchantId: string;
  value: string;
  onChange: (id: string) => void;
  accessibilityLabel: string;
  error?: boolean;
};

/**
 * Tax class select with inline create. "None" is offered: a product with no class is untaxed.
 *
 * The create form is a full-page route at every width, whose row comes back through the sheet-result
 * slot (src/Store/sheet-result.ts).
 */
export function TaxClassPicker({ merchantId, value, onChange, accessibilityLabel, error }: Props) {
  const taxClasses = useTaxClassesQuery({ merchantId });
  useSheetResult('tax-class', onChange);

  return (
    <MenuSelect
      value={value}
      options={[
        { value: '', label: 'None' },
        ...(taxClasses.data ?? []).map((taxClass) => ({ value: taxClass.id, label: taxClassLabel(taxClass) })),
      ]}
      onChange={onChange}
      placeholder={taxClasses.isError ? "Couldn't load tax classes" : taxClasses.isPending ? 'Loading…' : 'None'}
      accessibilityLabel={accessibilityLabel}
      error={error}
      createLabel="New tax class"
      onCreate={() => router.push({ pathname: '/forms/tax-class', params: { merchantId, resultKey: 'tax-class' } })}
    />
  );
}
