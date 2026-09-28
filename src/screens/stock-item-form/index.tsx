import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useController, useForm, useFormState, useWatch } from 'react-hook-form';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { CategoryPicker } from '../../components/category-picker';
import { DiscardDialog } from '../../components/discard-dialog';
import { FormFooter, FormNoticeText } from '../../components/form-footer';
import { ControlledSelect, ControlledSwitch, ControlledText, Field, FieldGrid, SectionHeading } from '../../components/form-fields';
import { PageHeader } from '../../components/page-header';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { Text } from '../../components/text';
import { useCategoriesQuery } from '../../features/categories/queries';
import { useProductGroupsQuery } from '../../features/product-groups/queries';
import { saveFailure, useSaveStockItemMutation } from '../../features/products/queries';
import type { ProductDetail } from '../../features/products/queries';
import { generateSku } from '../../features/products/schema';
import {
  SELL_BY_LABEL,
  STOCK_ROLE_LABEL,
  emptyStockItem,
  fromStockItem,
  stockItemSchema,
  stockRole,
  stockSellBy,
} from '../../features/products/stock-item';
import type { StockItemValues } from '../../features/products/stock-item';
import { stockFailure } from '../../features/stock-receipts/queries';
import { useShellWide } from '../../lib/columns';
import { INVALID_FORM, SKU_TAKEN, failureMessage, mutationNotice } from '../../lib/errors';
import type { Notice } from '../../lib/errors';
import { useAppTheme } from '../../lib/theme';
import { useLeaveGuard } from '../../lib/unsaved-guard';
import { spacing } from '../../themes';

type Props = { merchantId: string; product: ProductDetail | null };

// Keyed by the exception save_stock_item or guard_stock_item raises; stockFailure() hands back any
// snake_case message.
const FAILURE_COPY = new Map([
  ['stock_item_units_locked', 'Units per pack and serial numbers can change only while nothing is on hand.'],
  ['product_not_found', 'This item was archived or deleted elsewhere. Go back and open it again.'],
]);

const COPY = {
  new: { kicker: 'New item', save: 'Save item', discard: 'This item has not been saved.' },
  edit: { kicker: 'Edit item', save: 'Save changes', discard: 'Your edits to this item have not been saved.' },
};

const ROLE_BUTTONS = stockRole.options.map((value) => ({ value, label: STOCK_ROLE_LABEL[value] }));
const SELL_BY_BUTTONS = stockSellBy.options.map((value) => ({ value, label: SELL_BY_LABEL[value] }));

/**
 * An Inventory item (design.md §1, the Inventory.html create modal): what it is, how it is counted, and
 * when to warn. Saved through save_stock_item, which also keeps the register drafts the Sell by choice
 * wants — so a sellable item shows up in the register as a draft that needs its price.
 *
 * One scroll of five sections, not the product form's stepper: every field here fits on one phone
 * screen or two, and a stepper would hide the Base Unit fields that Pack Info depends on.
 */
export function StockItemForm({ merchantId, product }: Props) {
  const wide = useShellWide();
  const save = useSaveStockItemMutation({ merchantId });

  const form = useForm<StockItemValues>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: product ? fromStockItem(product) : emptyStockItem,
    mode: 'onTouched',
  });
  const { control, setValue } = form;
  const { isDirty } = useFormState({ control });

  // guard_stock_item refuses these with stock on hand; the form says so before the save does.
  const locked = (product?.qty_on_hand ?? 0) > 0;

  const editing = product !== null;
  const copy = COPY[editing ? 'edit' : 'new'];
  const guard = useLeaveGuard(isDirty, (id) => {
    if (editing) router.back();
    else router.replace({ pathname: '/systems/[id]/inventory/[productId]', params: { id: merchantId, productId: id } });
  });

  const [invalid, setInvalid] = useState(false);
  const submit = () => {
    void form.handleSubmit(
      (values) => {
        setInvalid(false);
        save.mutate({ values, product }, { onSuccess: guard.setSavedId });
      },
      () => setInvalid(true)
    )();
  };

  const notice = stockItemNotice(save, invalid);
  const saving = save.isPending && !save.isPaused;
  const actions = <SaveActions wide={wide} saving={saving} label={copy.save} onSave={submit} />;

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={copy.kicker}
        title={product?.name ?? 'Add an inventory item'}
        meta="Stock"
        onBack={() => router.back()}
        actions={wide ? actions : undefined}
      />

      <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {wide ? <FormNoticeText notice={notice} /> : null}

        <VariantSection merchantId={merchantId} control={control} setValue={setValue} />
        <PackInfoSection merchantId={merchantId} control={control} setValue={setValue} />
        <UnitSections control={control} locked={locked} />

        <SectionHeading title="Extra" hint="Optional" />
        <FieldGrid>
          <ControlledText control={control} name="description" label="Description" span="full" multiline maxLength={2000} />
          <ControlledText control={control} name="notes" label="Internal notes" span="full" multiline maxLength={2000} />
        </FieldGrid>
      </ScrollView>

      {wide ? null : <FormFooter notice={notice}>{actions}</FormFooter>}

      <DiscardDialog guard={guard} wide={wide} message={copy.discard} />
    </View>
  );
}

type SectionProps = {
  merchantId: string;
  control: Control<StockItemValues>;
  setValue: UseFormSetValue<StockItemValues>;
};

/** Variant setup: a variant joins an existing group, or names a new one. */
function VariantSection({ merchantId, control, setValue }: SectionProps) {
  const groups = useProductGroupsQuery({ merchantId });
  const [isVariant, newGroup] = useWatch({ control, name: ['isVariant', 'newGroup'] });
  const groupOptions = (groups.data ?? []).map((row) => ({ value: row.id, label: row.name }));

  return (
    <>
      <SectionHeading title="Variant setup" hint="Optional" />
      <FieldGrid>
        <ControlledSwitch
          control={control}
          name="isVariant"
          label="Variant"
          span="full"
          on="This is a variant of another item"
          off="A standalone item"
        />
        {isVariant ? (
          <>
            {newGroup ? (
              <ControlledText
                control={control}
                name="newGroupName"
                label="New group name"
                required
                maxLength={120}
                placeholder="e.g. Cotton T-shirt"
                action={{ label: 'Pick existing', onPress: () => setValue('newGroup', false) }}
              />
            ) : (
              <ControlledSelect
                control={control}
                name="groupId"
                label="Variant of"
                required
                options={groupOptions}
                placeholder={groups.isPending ? 'Loading…' : 'Choose a group'}
                createLabel="New group"
                onCreate={() => setValue('newGroup', true, { shouldDirty: true })}
              />
            )}
            <ControlledText
              control={control}
              name="attributes"
              label="Variant attributes"
              hint="Comma-separated"
              placeholder="Red, L"
              maxLength={200}
            />
          </>
        ) : null}
      </FieldGrid>
    </>
  );
}

/** Pack info: what the item is, how it is used, and where it is filed. */
function PackInfoSection({ merchantId, control, setValue }: SectionProps) {
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const category = useController({ control, name: 'categoryId' });
  const role = useController({ control, name: 'stockRole' });
  const sellBy = useController({ control, name: 'sellBy' });
  const categoryName = categories.data?.find((row) => row.id === category.field.value)?.name ?? '';

  return (
    <>
      <SectionHeading title="Pack info" hint="What it is and how it is used" />
      <FieldGrid>
        <ControlledText
          control={control}
          name="name"
          label="Pack name"
          required
          span="full"
          maxLength={120}
          placeholder="e.g. Coffee beans 1kg"
        />
        <ControlledText
          control={control}
          name="sku"
          label="SKU"
          maxLength={64}
          placeholder="Blank makes one"
          action={{
            label: 'Auto-generate',
            onPress: () => setValue('sku', generateSku('stock', categoryName), { shouldDirty: true, shouldValidate: true }),
          }}
        />
        <ControlledText control={control} name="barcode" label="Barcode" maxLength={64} />
        <Field label="Pack type" required span="full" error={role.fieldState.error?.message}>
          <SegmentedButtons
            value={role.field.value}
            onValueChange={(value) => role.field.onChange(stockRole.parse(value))}
            buttons={ROLE_BUTTONS}
          />
        </Field>
        {role.field.value === 'component' ? null : (
          <Field label="Sell by" required span="full" hint="Makes the register drafts" error={sellBy.fieldState.error?.message}>
            <SegmentedButtons
              value={sellBy.field.value}
              onValueChange={(value) => sellBy.field.onChange(stockSellBy.parse(value))}
              buttons={SELL_BY_BUTTONS}
            />
          </Field>
        )}
        <Field label="Category">
          <CategoryPicker
            merchantId={merchantId}
            scope="inventory"
            parentId={null}
            value={category.field.value}
            onChange={(id) => {
              category.field.onChange(id);
              // A subcategory belongs to one category; switching category drops it.
              setValue('subcategoryId', '', { shouldDirty: true });
            }}
            accessibilityLabel="Category"
            clearable
          />
        </Field>
        <SubcategoryField merchantId={merchantId} control={control} categoryId={category.field.value} />
      </FieldGrid>
    </>
  );
}

function SubcategoryField({ merchantId, control, categoryId }: Omit<SectionProps, 'setValue'> & { categoryId: string }) {
  const { colors } = useAppTheme();
  const subcategory = useController({ control, name: 'subcategoryId' });

  return (
    <Field label="Subcategory">
      {categoryId ? (
        <CategoryPicker
          merchantId={merchantId}
          scope="inventory"
          parentId={categoryId}
          value={subcategory.field.value}
          onChange={subcategory.field.onChange}
          accessibilityLabel="Subcategory"
          clearable
        />
      ) : (
        <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
          Choose a category first.
        </Text>
      )}
    </Field>
  );
}

/** Base unit and stock settings, which both name the units the merchant typed. */
function UnitSections({ control, locked }: { control: Control<StockItemValues>; locked: boolean }) {
  const [packUnit, baseUnit] = useWatch({ control, name: ['packUnit', 'baseUnit'] });
  const pack = packUnit || 'pack';
  const base = baseUnit || 'unit';

  return (
    <>
      <SectionHeading title="Base unit" hint="How one pack is counted" />
      <FieldGrid>
        <ControlledText control={control} name="packUnit" label="Pack unit" placeholder="box" maxLength={20} />
        <ControlledText control={control} name="baseUnit" label="Base unit" placeholder="pcs" maxLength={20} />
        <ControlledText
          control={control}
          name="unitsPerPack"
          label={`${base} per ${pack}`}
          required
          keyboardType="decimal-pad"
          disabled={locked}
          hint={locked ? 'Locked while stock is on hand' : undefined}
        />
        <ControlledSwitch
          control={control}
          name="serialTracked"
          label="Serial numbers"
          on={`Each ${pack} has a serial`}
          off="No serials"
          disabled={locked}
        />
      </FieldGrid>

      <SectionHeading title="Stock settings" hint="When to warn" />
      <FieldGrid>
        <ControlledText
          control={control}
          name="storageLocation"
          label="Storage location"
          maxLength={120}
          placeholder="Back room, shelf 2"
        />
        <ControlledText control={control} name="reorderAt" label="Reorder at" keyboardType="decimal-pad" suffix={base} />
        <ControlledText
          control={control}
          name="expiryAlertDays"
          label="Expiry alert"
          hint="Days before a lot expires"
          keyboardType="number-pad"
          suffix="days"
        />
      </FieldGrid>
    </>
  );
}

/** Wide, Cancel leads in the header; narrow, it follows Save in the footer. */
function SaveActions({ wide, saving, label, onSave }: { wide: boolean; saving: boolean; label: string; onSave: () => void }) {
  const cancel = (
    <Button mode="text" onPress={() => router.back()} disabled={saving}>
      Cancel
    </Button>
  );

  return (
    <>
      {wide ? cancel : null}
      <Button mode="contained" icon="check" onPress={onSave} loading={saving} disabled={saving}>
        {label}
      </Button>
      {wide ? null : cancel}
    </>
  );
}

function stockItemNotice(save: { isPaused: boolean; isError: boolean; error: Error | null }, invalid: boolean): Notice | null {
  const failure = stockFailure(save.error);
  const text =
    saveFailure(save.error) === 'sku'
      ? SKU_TAKEN
      : ((failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't save this item. Try again."));
  return mutationNotice(save, text, invalid ? INVALID_FORM : null);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
});
