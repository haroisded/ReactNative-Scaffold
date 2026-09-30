import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useController, useForm, useFormState, useWatch } from 'react-hook-form';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { CategoryPicker } from '../../components/category-picker';
import { DiscardDialog } from '../../components/discard-dialog';
import { FactGrid } from '../../components/fact-grid';
import type { Fact } from '../../components/fact-grid';
import { ControlledSelect, ControlledSwitch, ControlledText, Field, FieldGrid, SectionHeading } from '../../components/form-fields';
import { PageHeader } from '../../components/page-header';
import { NarrowSteps, WideSections } from '../../components/section-stepper';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { Text } from '../../components/text';
import { useCategoriesQuery } from '../../features/categories/queries';
import { useProductGroupsQuery } from '../../features/product-groups/queries';
import { saveFailure, useSaveStockItemMutation } from '../../features/products/queries';
import type { ProductDetail } from '../../features/products/queries';
import { generateBarcode, generateSku } from '../../features/products/schema';
import {
  SELL_BY_LABEL,
  STOCK_FIELD_SECTION,
  STOCK_ROLE_LABEL,
  STOCK_SECTION_META,
  emptyStockItem,
  fromStockItem,
  stockItemSchema,
  stockRole,
  stockSections,
  stockSellBy,
} from '../../features/products/stock-item';
import type { StockItemValues, StockSectionId } from '../../features/products/stock-item';
import { stockFailure } from '../../features/stock-receipts/queries';
import { useShellWide } from '../../lib/columns';
import { INVALID_FORM, SKU_TAKEN, failureMessage, mutationNotice } from '../../lib/errors';
import type { Notice } from '../../lib/errors';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { useLeaveGuard } from '../../lib/unsaved-guard';

type Props = { merchantId: string; currency: string; product: ProductDetail | null };

// Keyed by the exception save_stock_item or guard_stock_item raises; stockFailure() hands back any
// snake_case message.
const FAILURE_COPY = new Map([
  ['stock_item_units_locked', 'Units per pack can change only while nothing is on hand.'],
  ['receipt_line_quantity', 'Loose units must be fewer than one full pack.'],
  ['product_not_found', 'This item was archived or deleted elsewhere. Go back and open it again.'],
]);

const COPY = {
  new: { kicker: 'New item', save: 'Save item', discard: 'This item has not been saved.' },
  edit: { kicker: 'Edit item', save: 'Save changes', discard: 'Your edits to this item have not been saved.' },
};

const ROLE_BUTTONS = stockRole.options.map((value) => ({ value, label: STOCK_ROLE_LABEL[value] }));
// Pack is the Base unit switch turned off, so the choice under it is between the other two.
const SELL_BY_BUTTONS = stockSellBy.options.filter((value) => value !== 'pack').map((value) => ({ value, label: SELL_BY_LABEL[value] }));

/**
 * An Inventory item (design.md §1, the Inventory.html create modal): what it is, how it is counted, and
 * when to warn. Saved through save_stock_item, which also keeps the register drafts the Sell by choice
 * wants — so a sellable item shows up in the register as a draft that needs its price.
 *
 * Stepped like the product form, through the same section-stepper: once the Base unit and Stock on hand
 * each became a switch with fields under it, one scroll ran to four phone screens. Base unit comes before
 * Stock on hand, so the loose-units field knows whether it exists. Rejected: one scroll of sections (the
 * form before 2026-09-30) — the fields Pack info depends on were three screens away from it.
 */
export function StockItemForm({ merchantId, currency, product }: Props) {
  const wide = useShellWide();
  const save = useSaveStockItemMutation({ merchantId });

  const form = useForm<StockItemValues>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: product ? fromStockItem(product) : emptyStockItem,
    mode: 'onTouched',
  });
  const { control, setValue } = form;
  // useFormState rather than form.formState: it returns a new object when a flag changes, which the
  // compiled component needs to see the change.
  const { isDirty, errors } = useFormState({ control });

  // guard_stock_item refuses these with stock on hand; the form says so before the save does.
  const locked = (product?.qty_on_hand ?? 0) > 0;

  const editing = product !== null;
  const copy = COPY[editing ? 'edit' : 'new'];
  const guard = useLeaveGuard(isDirty, (id) => {
    if (editing) router.back();
    else router.replace({ pathname: '/systems/[id]/inventory/[productId]', params: { id: merchantId, productId: id } });
  });

  const sections = stockSections(!editing);
  const [sectionId, setSectionId] = useState<StockSectionId>('pack');
  const index = Math.max(0, sections.findIndex((entry) => entry.id === sectionId));
  const current = sections[index];
  const failedSections = sectionsWithErrors(Object.keys(errors));

  const [invalid, setInvalid] = useState(false);
  const submit = () => {
    void form.handleSubmit(
      (values) => {
        setInvalid(false);
        save.mutate({ values, product }, { onSuccess: guard.setSavedId });
      },
      (fieldErrors) => {
        setInvalid(true);
        const failed = sectionsWithErrors(Object.keys(fieldErrors));
        const first = sections.find((entry) => failed.has(entry.id));
        if (first) setSectionId(first.id);
      }
    )();
  };

  // Skip step undoes the step's switch, so a skipped step saves nothing.
  const skip = () => {
    if (current.id === 'variant') setValue('isVariant', false, { shouldDirty: true });
    if (current.id === 'opening') setValue('addStock', false, { shouldDirty: true });
    setSectionId(sections[index + 1].id);
  };

  const notice = stockItemNotice(save, invalid && failedSections.size > 0);
  const saving = save.isPending && !save.isPaused;
  const actions = <SaveActions wide={wide} saving={saving} label={copy.save} onSave={submit} />;

  const body = (
    <>
      <SectionHeading title={STOCK_SECTION_META[current.id].name} hint={STOCK_SECTION_META[current.id].hint} />
      <StepBody id={current.id} merchantId={merchantId} currency={currency} control={control} setValue={setValue} locked={locked} />
    </>
  );
  const steps = { sections, current, index, names: STOCK_SECTION_META, failedSections, notice, body, onOpen: setSectionId };

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={copy.kicker}
        title={product?.name ?? 'Add an inventory item'}
        meta="Stock"
        onBack={() => router.back()}
        actions={wide ? actions : undefined}
      />
      {wide ? <WideSections {...steps} /> : <NarrowSteps {...steps} saveActions={actions} onSkip={skip} />}

      <DiscardDialog guard={guard} wide={wide} message={copy.discard} />
    </View>
  );
}

/** The steps holding any of these fields. */
function sectionsWithErrors(fields: string[]): ReadonlySet<StockSectionId> {
  // SAFETY: the keys of react-hook-form's errors are field names of the form; one not in the map drops out.
  return new Set(fields.map((field) => STOCK_FIELD_SECTION[field as keyof StockItemValues]).filter(Boolean));
}

type SectionProps = {
  merchantId: string;
  control: Control<StockItemValues>;
  setValue: UseFormSetValue<StockItemValues>;
};

type StepBodyProps = SectionProps & { id: StockSectionId; currency: string; locked: boolean };

function StepBody({ id, merchantId, currency, control, setValue, locked }: StepBodyProps) {
  switch (id) {
    case 'pack':
      return <PackInfoSection merchantId={merchantId} control={control} setValue={setValue} />;
    case 'settings':
      return <StockSettingsSection control={control} />;
    case 'base':
      return <BaseUnitSection control={control} locked={locked} />;
    case 'opening':
      return <StockOnHandSection control={control} currency={currency} />;
    case 'variant':
      return <VariantSection merchantId={merchantId} control={control} setValue={setValue} />;
    case 'extra':
      return (
        <FieldGrid>
          <ControlledText control={control} name="description" label="Description" span="full" multiline maxLength={2000} />
        </FieldGrid>
      );
    case 'review':
      return <ReviewSection merchantId={merchantId} currency={currency} control={control} />;
  }
}

/** Pack info: what the item is, how it is used, and where it is filed. */
function PackInfoSection({ merchantId, control, setValue }: SectionProps) {
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const category = useController({ control, name: 'categoryId' });
  const role = useController({ control, name: 'stockRole' });
  const categoryName = categories.data?.find((row) => row.id === category.field.value)?.name ?? '';

  return (
    <FieldGrid>
      <ControlledText control={control} name="name" label="Pack name" required span="full" maxLength={120} placeholder="e.g. Coffee beans 1kg" />
      <ControlledText
        control={control}
        name="sku"
        label="SKU"
        required
        maxLength={64}
        action={{
          label: 'Auto-generate',
          onPress: () => setValue('sku', generateSku('stock', categoryName), { shouldDirty: true, shouldValidate: true }),
        }}
      />
      <ControlledText
        control={control}
        name="barcode"
        label="Barcode"
        maxLength={64}
        keyboardType="number-pad"
        action={{ label: 'Auto-generate', onPress: () => setValue('barcode', generateBarcode(), { shouldDirty: true, shouldValidate: true }) }}
      />
      <Field label="Pack type" required span="full" error={role.fieldState.error?.message}>
        <SegmentedButtons value={role.field.value} onValueChange={(value) => role.field.onChange(stockRole.parse(value))} buttons={ROLE_BUTTONS} />
      </Field>
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

/** The unit stock is counted and re-ordered in: the base unit while the switch is on, else the pack. */
function useUnits(control: Control<StockItemValues>) {
  const [packUnit, baseUnit, byBase] = useWatch({ control, name: ['packUnit', 'baseUnit', 'byBase'] });
  const pack = packUnit || 'pack';
  return { pack, base: byBase ? baseUnit || 'unit' : pack, byBase };
}

function StockSettingsSection({ control }: { control: Control<StockItemValues> }) {
  const { base } = useUnits(control);

  return (
    <FieldGrid>
      <ControlledText control={control} name="packUnit" label="Pack unit name" placeholder="e.g. cup, box, tray" maxLength={20} />
      <ControlledText control={control} name="storageLocation" label="Storage location" maxLength={120} placeholder="Back room, shelf 2" />
      <ControlledText control={control} name="reorderAt" label="Re-order at" hint="In base units" keyboardType="decimal-pad" suffix={base} />
      <ControlledSwitch control={control} name="hasExpiry" label="Expiry" on="Has an expiration date" off="Does not expire" />
      <ControlledText control={control} name="expiryAlertDays" label="Expiry alert" hint="Days before a lot expires" keyboardType="number-pad" suffix="days" />
    </FieldGrid>
  );
}

/** The Base unit switch drives Sell by: off is sold by the pack alone, on asks what one pack holds. */
function BaseUnitSection({ control, locked }: { control: Control<StockItemValues>; locked: boolean }) {
  const { pack, base, byBase } = useUnits(control);
  const role = useWatch({ control, name: 'stockRole' });
  const sellBy = useController({ control, name: 'sellBy' });
  const lockedHint = locked ? 'Locked while stock is on hand' : undefined;

  return (
    <FieldGrid>
      <ControlledSwitch
        control={control}
        name="byBase"
        label="Base unit"
        span="full"
        on="Sold or used by the base unit"
        off="Sold and counted by the pack only"
        disabled={locked}
        hint={lockedHint}
      />
      {byBase ? (
        <>
          <Field
            label="Sell by"
            required
            span="full"
            hint={role === 'component' ? 'How it is counted' : 'Makes its Products drafts'}
            error={sellBy.fieldState.error?.message}
          >
            <SegmentedButtons
              value={sellBy.field.value}
              onValueChange={(value) => sellBy.field.onChange(stockSellBy.parse(value))}
              buttons={SELL_BY_BUTTONS}
            />
          </Field>
          <ControlledText control={control} name="baseUnit" label="Base unit type" placeholder="e.g. tablet" maxLength={20} />
          <ControlledText
            control={control}
            name="unitsPerPack"
            label={`${base} per ${pack}`}
            required
            keyboardType="decimal-pad"
            disabled={locked}
            hint={lockedHint}
          />
        </>
      ) : null}
    </FieldGrid>
  );
}

/** A new item's opening stock, behind its switch. */
function StockOnHandSection({ control, currency }: { control: Control<StockItemValues>; currency: string }) {
  const { pack, base, byBase } = useUnits(control);
  const addStock = useWatch({ control, name: 'addStock' });

  return (
    <FieldGrid>
      <ControlledSwitch control={control} name="addStock" label="Opening stock" span="full" on="Add opening stock" off="No stock yet" />
      {addStock ? (
        <>
          <ControlledText control={control} name="openingPacks" label={`${pack} on hand`} keyboardType="number-pad" />
          {byBase ? (
            <ControlledText control={control} name="openingLoose" label={`Loose ${base}`} hint="Outside a full pack" keyboardType="decimal-pad" />
          ) : null}
          <ControlledText control={control} name="openingCost" label={`Cost per ${pack}`} keyboardType="decimal-pad" prefix={currencySymbol(currency)} />
        </>
      ) : null}
    </FieldGrid>
  );
}

/** Variant setup: a variant joins an existing group, or names a new one. */
function VariantSection({ merchantId, control, setValue }: SectionProps) {
  const groups = useProductGroupsQuery({ merchantId });
  const [isVariant, newGroup] = useWatch({ control, name: ['isVariant', 'newGroup'] });
  const groupOptions = (groups.data ?? []).map((row) => ({ value: row.id, label: row.name }));

  return (
    <FieldGrid>
      <ControlledSwitch control={control} name="isVariant" label="Variant" span="full" on="This is a variant of another item" off="A standalone item" />
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
          <ControlledText control={control} name="attributes" label="Variant attributes" hint="Comma-separated" placeholder="Red, L" maxLength={200} />
        </>
      ) : null}
    </FieldGrid>
  );
}

/** Everything typed, before the save. Blank fields are left out (FactGrid). */
function ReviewSection({ merchantId, currency, control }: { merchantId: string; currency: string; control: Control<StockItemValues> }) {
  // SAFETY: useWatch with no name returns the whole form, typed as a deep partial; every field has a default.
  const item = useWatch({ control }) as StockItemValues;
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const groups = useProductGroupsQuery({ merchantId });
  const units = useUnits(control);
  const nameOf = (rows: { id: string; name: string }[] | undefined, id: string) => rows?.find((row) => row.id === id)?.name;

  return (
    <FactGrid
      facts={[
        ['Pack name', item.name],
        ['SKU', item.sku],
        ['Barcode', item.barcode],
        ['Pack type', STOCK_ROLE_LABEL[item.stockRole]],
        ['Category', nameOf(categories.data, item.categoryId)],
        ['Subcategory', nameOf(categories.data, item.subcategoryId)],
        ...settingsFacts(item, units.base),
        ...unitFacts(item, units, currency),
        ['Variant of', item.isVariant ? (item.newGroup ? item.newGroupName : nameOf(groups.data, item.groupId)) : null],
        ['Variant attributes', item.isVariant ? item.attributes : null],
        ['Description', item.description],
      ]}
    />
  );
}

const settingsFacts = (item: StockItemValues, base: string): Fact[] => [
  ['Pack unit', item.packUnit],
  ['Storage location', item.storageLocation],
  ['Re-order at', item.reorderAt && `${item.reorderAt} ${base}`],
  ['Expiry', item.hasExpiry ? 'Has an expiration date' : 'Does not expire'],
  ['Expiry alert', item.expiryAlertDays && `${item.expiryAlertDays} days`],
];

function unitFacts(item: StockItemValues, { pack, base }: { pack: string; base: string }, currency: string): Fact[] {
  const loose = item.byBase && Number(item.openingLoose) > 0 ? ` + ${item.openingLoose} ${base}` : '';
  return [
    ['Sell by', SELL_BY_LABEL[item.byBase ? item.sellBy : 'pack']],
    ['Units per pack', item.byBase ? `${item.unitsPerPack} ${base} per ${pack}` : null],
    ['Opening stock', item.addStock ? `${item.openingPacks || 0} ${pack}${loose}` : null],
    ['Cost per pack', item.addStock && item.openingCost ? formatMoney(Number(item.openingCost), currency) : null],
  ];
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
});
