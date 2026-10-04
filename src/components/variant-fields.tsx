import { useController, useWatch } from 'react-hook-form';
import type { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import { useCategoriesQuery } from '../features/categories/queries';
import { useProductGroupsQuery } from '../features/product-groups/queries';
import { ControlledSelect, ControlledSwitch, ControlledText } from './form-fields';

type Props<T extends FieldValues> = {
  merchantId: string;
  control: Control<T>;
  /** Where the five fields sit in the form: a receipt's `line`, which the Inventory item form holds too. */
  names: {
    isVariant: FieldPathByValue<T, boolean>;
    newGroup: FieldPathByValue<T, boolean>;
    groupId: FieldPathByValue<T, string>;
    newGroupName: FieldPathByValue<T, string>;
    attributes: FieldPathByValue<T, string>;
  };
};

/**
 * A new item's variant fields, inside the caller's FieldGrid: a variant joins a variant group picked or
 * named here (save_stock_item makes a named one). Shared by the Inventory item form and the receipt's Pack step.
 */
export function VariantFields<T extends FieldValues>({ merchantId, control, names }: Props<T>) {
  const groups = useProductGroupsQuery({ merchantId });
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const [isVariant, groupId] = useWatch({ control, name: [names.isVariant, names.groupId] });
  const { field: newGroup } = useController({ control, name: names.newGroup });
  const groupOptions = (groups.data ?? []).map((row) => ({ value: row.id, label: row.name }));
  // The group owns its category (20261001110000_group_category.sql), so a variant is filed where it is.
  const groupCategory = groups.data?.find((row) => row.id === groupId)?.category_id;
  const filedUnder = categories.data?.find((row) => row.id === groupCategory)?.name;

  return (
    <>
      <ControlledSwitch control={control} name={names.isVariant} label="Variant" span="full" on="This is a variant" off="A standalone item" />
      {isVariant ? (
        <>
          {newGroup.value ? (
            <ControlledText
              control={control}
              name={names.newGroupName}
              label="Variant group name"
              required
              maxLength={120}
              placeholder="e.g. Cotton T-shirt"
              action={{ label: 'Pick existing', onPress: () => newGroup.onChange(false) }}
            />
          ) : (
            <ControlledSelect
              control={control}
              name={names.groupId}
              label="Variant group name"
              required
              options={groupOptions}
              hint={filedUnder ? `Filed under ${filedUnder}` : undefined}
              placeholder={groups.isPending ? 'Loading…' : 'Choose a group'}
              createLabel="New group"
              onCreate={() => newGroup.onChange(true)}
            />
          )}
          <ControlledText control={control} name={names.attributes} label="Variant name" hint="Comma-separated" placeholder="e.g. Red, L" maxLength={200} />
        </>
      ) : null}
    </>
  );
}
