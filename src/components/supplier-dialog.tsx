import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import {
  isDuplicateType,
  useCreateSupplierTypeMutation,
  useDeleteSupplierTypeMutation,
  useSupplierTypesQuery,
} from '../features/supplier-types/queries';
import { isDuplicateCode, useSaveSupplierMutation } from '../features/suppliers/queries';
import type { Supplier } from '../features/suppliers/queries';
import { supplierSchema } from '../features/suppliers/schema';
import type { SupplierFormValues } from '../features/suppliers/schema';
import { useShellWide } from '../lib/columns';
import { failureMessage, mutationNotice } from '../lib/errors';
import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { HelperText } from './helper-text';
import { MenuSelect } from './menu-select';
import { Switch } from './switch';
import { Text } from './text';
import { TextInput } from './text-input';

type Props = {
  merchantId: string;
  /** Edit this supplier instead of creating one. */
  supplier?: Supplier;
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/supplier.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
  /** The created row, so an inline picker can select what was just made. */
  onCreated?: (supplier: { id: string; name: string }) => void;
};

type FieldName = Exclude<keyof SupplierFormValues, 'supplierTypeId' | 'active'>;

/**
 * Create or edit a supplier: Profile, Terms and Extra (.claude/inventory-stock/design.md §6). Supplier
 * types are managed from the Type field itself — a new one is typed in place, and the selected one can
 * be deleted — because a sheet cannot open a second sheet over itself.
 *
 * In src/components/ because three hosts render it: Stock → Suppliers and the product form's picker on
 * a wide shell, and the sheet route on a narrow one. Mounted only while open, so the form starts fresh.
 */
export function SupplierDialog({ merchantId, supplier, inSheet, onDismiss, onCreated }: Props) {
  const wide = useShellWide();
  const { colors } = useAppTheme();
  const save = useSaveSupplierMutation({ merchantId });
  const { control, handleSubmit, setValue, watch } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplierDefaults(supplier),
    mode: 'onTouched',
  });

  const inFlight = save.isPending && !save.isPaused;
  const notice = mutationNotice(
    save,
    isDuplicateCode(save.error)
      ? 'Another supplier already has this code. Clear it to have one issued.'
      : failureMessage("Couldn't save this supplier. Try again.")
  );

  const submit = handleSubmit((values) => {
    save.mutate(
      { values, supplierId: supplier?.id ?? null },
      {
        onSuccess: (row) => {
          if (!supplier) onCreated?.(row);
          onDismiss();
        },
      }
    );
  });

  return (
    <AdaptiveDialog
      wide={wide}
      inSheet={inSheet}
      onDismiss={onDismiss}
      dismissable={!inFlight}
      kicker={supplier ? supplier.code : 'Stock'}
      title={supplier ? 'Edit supplier' : 'New supplier'}
      actions={
        <>
          <Button mode="outlined" onPress={onDismiss} disabled={inFlight} contentStyle={styles.action}>
            Cancel
          </Button>
          <Button mode="contained" onPress={submit} loading={save.isPending} disabled={save.isPending} contentStyle={styles.action}>
            {supplier ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <Text variant="labelMedium" style={{ color: colors.onSurfaceMuted }}>
        Profile
      </Text>
      <Field control={control} name="name" label="Name" placeholder="e.g. Metro Wholesale" autoFocus={!supplier} />
      <Field control={control} name="code" label="Code" placeholder="Issued when left blank" autoCapitalize="characters" />
      <Field control={control} name="contactPerson" label="Contact person" />
      <Field control={control} name="phone" label="Phone" keyboardType="phone-pad" />
      <Field control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" />
      <Field control={control} name="address" label="Address" />
      <TypeField merchantId={merchantId} value={watch('supplierTypeId')} onChange={(value) => setValue('supplierTypeId', value)} />

      <Text variant="labelMedium" style={{ color: colors.onSurfaceMuted }}>
        Terms
      </Text>
      <Field control={control} name="paymentTerms" label="Payment terms" placeholder="e.g. Net 30, COD" />
      <Field control={control} name="leadTimeDays" label="Lead time (days)" keyboardType="number-pad" />
      <Field control={control} name="tin" label="TIN" placeholder="e.g. 123-456-789-000" />

      <Text variant="labelMedium" style={{ color: colors.onSurfaceMuted }}>
        Extra
      </Text>
      <Field control={control} name="notes" label="Notes" multiline />
      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <View style={styles.switchRow}>
            <Switch value={field.value} onValueChange={field.onChange} color={colors.accent} accessibilityLabel="Active" />
            <View style={styles.fill}>
              <Text variant="bodyMedium">Active</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
                An inactive supplier is left out of new receipts. Its receipts stay.
              </Text>
            </View>
          </View>
        )}
      />

      <HelperText type={notice?.type ?? 'error'} visible={notice !== null} padding="none">
        {notice?.text}
      </HelperText>
    </AdaptiveDialog>
  );
}

/**
 * The Type field, and the types themselves: a new one is typed in its place, and the selected one can be
 * deleted from beside it.
 */
function TypeField({ merchantId, value, onChange }: { merchantId: string; value: string; onChange: (value: string) => void }) {
  const { colors } = useAppTheme();
  const types = useSupplierTypesQuery({ merchantId });
  const createType = useCreateSupplierTypeMutation({ merchantId });
  const deleteType = useDeleteSupplierTypeMutation();
  // Null while the field shows its select; a string while a new type is being typed in its place.
  const [newType, setNewType] = useState<string | null>(null);
  const notice = typeFailure(createType, deleteType.isError);

  const addType = () => {
    const name = (newType ?? '').trim();
    if (name === '' || name.length > 40) return;
    createType.mutate(name, {
      onSuccess: (row) => {
        onChange(row.id);
        setNewType(null);
      },
    });
  };

  return (
    <>
      {newType === null ? (
        <View style={styles.typeRow}>
          <View style={styles.fill}>
            <MenuSelect
              value={value}
              options={[{ value: '', label: 'None' }, ...(types.data ?? []).map((type) => ({ value: type.id, label: type.name }))]}
              onChange={onChange}
              placeholder={types.isError ? "Couldn't load types" : 'Type'}
              accessibilityLabel="Supplier type"
              createLabel="New type"
              onCreate={() => setNewType('')}
            />
          </View>
          {value !== '' ? (
            <Button
              compact
              textColor={colors.error}
              loading={deleteType.isPending}
              disabled={deleteType.isPending}
              onPress={() => deleteType.mutate(value, { onSuccess: () => onChange('') })}
            >
              Delete type
            </Button>
          ) : null}
        </View>
      ) : (
        <View style={styles.typeRow}>
          <TextInput
            mode="outlined"
            dense
            autoFocus
            value={newType}
            onChangeText={setNewType}
            onSubmitEditing={addType}
            placeholder="e.g. Distributor"
            accessibilityLabel="New supplier type"
            maxLength={40}
            style={styles.fill}
          />
          <Button compact onPress={() => setNewType(null)}>
            Cancel
          </Button>
          <Button compact mode="contained" onPress={addType} loading={createType.isPending} disabled={createType.isPending}>
            Add
          </Button>
        </View>
      )}
      {notice ? (
        <HelperText type="error" padding="none">
          {notice}
        </HelperText>
      ) : null}
    </>
  );
}

function typeFailure(create: { isError: boolean; error: Error | null }, deleteFailed: boolean) {
  if (create.isError) {
    return isDuplicateType(create.error) ? 'There is already a type with this name.' : failureMessage("Couldn't add this type. Try again.");
  }
  return deleteFailed ? failureMessage("Couldn't delete this type. Try again.") : null;
}

function supplierDefaults(supplier: Supplier | undefined): SupplierFormValues {
  const text = (value: string | null | undefined) => value ?? '';
  return {
    name: text(supplier?.name),
    code: text(supplier?.code),
    contactPerson: text(supplier?.contact_person),
    phone: text(supplier?.phone),
    email: text(supplier?.email),
    address: text(supplier?.address),
    supplierTypeId: text(supplier?.supplier_type_id),
    paymentTerms: text(supplier?.payment_terms),
    leadTimeDays: text(supplier?.lead_time_days?.toString()),
    tin: text(supplier?.tin),
    notes: text(supplier?.notes),
    active: supplier?.active ?? true,
  };
}

type FieldProps = {
  control: Control<SupplierFormValues>;
  name: FieldName;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  keyboardType?: 'phone-pad' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'characters';
};

function Field({ control, name, label, ...input }: FieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View>
          <TextInput
            mode="outlined"
            dense
            label={label}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={!!fieldState.error}
            {...input}
          />
          {fieldState.error ? (
            <HelperText type="error" padding="none">
              {fieldState.error.message}
            </HelperText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  // Full width in the narrow sheet, so the label sits at the left edge (instruction_mds/visual-language.md §5).
  action: { justifyContent: 'flex-start' },
  fill: { flex: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
});
