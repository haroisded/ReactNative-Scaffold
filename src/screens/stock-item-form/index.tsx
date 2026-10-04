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
import { ControlledDate, ControlledSwitch, ControlledText, Field, FieldGrid, GroupHeading, SectionHeading, displayDate } from '../../components/form-fields';
import { PageHeader } from '../../components/page-header';
import { NarrowSteps, WideSections } from '../../components/section-stepper';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { Text } from '../../components/text';
import { VariantFields } from '../../components/variant-fields';
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
const SELL_BY_BUTTONS = stockSellBy.options.map((value) => ({ value, label: SELL_BY_LABEL[value] }));

/**
 * An Inventory item (design.md §1, the Inventory.html create modal): what it is, how it is counted, and
 * when to warn. Saved through save_stock_item, which also keeps the register drafts the Sell by choice
 * wants — so a sellable item shows up in the register as a draft that needs its price.
 *
 * Stepped like the receipt's Pack, Variant and Base unit steps, without the receipt's supplier, lot or
 * costs: Pack holds everything about the item plus an optional quantity on hand, and Base unit appears only
 * when Sell by asks for one. Nothing here touches a supplier or the Stock screen. Rejected: the seven steps
 * before 2026-10-01 (Stock settings, Stock on hand and Extra each their own step) — over-built for what is
 * mostly one screen of fields.
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
  const guard = useLeaveGuard(isDirty, (id) => leaveSaved(editing, merchantId, id));

  const sellBy = useWatch({ control, name: 'sellBy' });
  const sections = stockSections(sellBy !== 'pack');
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
        setSectionId((open) => sections.find((entry) => failed.has(entry.id))?.id ?? open);
      }
    )();
  };

  // Skip step undoes the step's switch, so a skipped step saves nothing.
  const skip = () => {
    if (current.id === 'variant') setValue('isVariant', false, { shouldDirty: true });
    setSectionId(sections[index + 1].id);
  };

  const notice = stockItemNotice(save, invalid, failedSections);
  const saving = isSaving(save);
  const actions = <SaveActions wide={wide} saving={saving} label={copy.save} onSave={submit} />;

  const body = (
    <>
      <SectionHeading title={STOCK_SECTION_META[current.id].name} hint={STOCK_SECTION_META[current.id].hint} />
      <StepBody
        id={current.id}
        merchantId={merchantId}
        currency={currency}
        control={control}
        setValue={setValue}
        locked={locked}
        creating={!editing}
      />
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

/** After a save: an edit goes back to the item, a new item opens on its page. */
function leaveSaved(editing: boolean, merchantId: string, productId: string) {
  if (editing) router.back();
  else router.replace({ pathname: '/systems/[id]/inventory/[productId]', params: { id: merchantId, productId } });
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

type StepBodyProps = SectionProps & { id: StockSectionId; currency: string; locked: boolean; creating: boolean };

function StepBody({ id, merchantId, currency, control, setValue, locked, creating }: StepBodyProps) {
  switch (id) {
    case 'pack':
      return (
        <>
          <PackInfoSection merchantId={merchantId} control={control} setValue={setValue} locked={locked} />
          <StockSettingsSection control={control} />
          {creating ? <QuantitySection control={control} currency={currency} /> : null}
        </>
      );
    case 'variant':
      return <VariantSection merchantId={merchantId} control={control} setValue={setValue} />;
    case 'base':
      return <BaseUnitSection control={control} locked={locked} creating={creating} />;
    case 'review':
      return <ReviewSection merchantId={merchantId} currency={currency} control={control} />;
  }
}

/**
 * The picked variant group's category, when it has one: the group owns it (20261001110000_group_category.sql),
 * so the item's own Category is shown as the group's and locked. A new group, or one with no category yet,
 * takes the item's.
 */
function useGroupCategory(merchantId: string, control: Control<StockItemValues>) {
  const groups = useProductGroupsQuery({ merchantId });
  const [isVariant, newGroup, groupId] = useWatch({ control, name: ['isVariant', 'newGroup', 'groupId'] });
  const group = isVariant && !newGroup ? groups.data?.find((row) => row.id === groupId) : undefined;
  return group?.category_id ? { categoryId: group.category_id, subcategoryId: group.subcategory_id ?? '' } : null;
}

/** Pack: what the item is, how it is used and sold, and where it is filed. */
function PackInfoSection({ merchantId, control, setValue, locked }: SectionProps & { locked: boolean }) {
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const category = useController({ control, name: 'categoryId' });
  const role = useController({ control, name: 'stockRole' });
  const sellBy = useController({ control, name: 'sellBy' });
  const fromGroup = useGroupCategory(merchantId, control);
  const categoryId = fromGroup?.categoryId ?? category.field.value;
  const categoryName = categories.data?.find((row) => row.id === categoryId)?.name ?? '';
  // guard_stock_item refuses a change of units per pack while stock is on hand; Pack to or from a base unit is one.
  const sellByButtons = SELL_BY_BUTTONS.map((button) => ({
    ...button,
    disabled: locked && (button.value === 'pack') !== (sellBy.field.value === 'pack'),
  }));

  return (
    <>
      <GroupHeading title="Product details" />
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
        <Field
          label="Sell by"
          required
          span="full"
          hint={locked ? 'Pack or a base unit is locked while stock is on hand' : 'Base unit or Both adds the Base unit step'}
          error={sellBy.fieldState.error?.message}
        >
          <SegmentedButtons value={sellBy.field.value} onValueChange={(value) => sellBy.field.onChange(stockSellBy.parse(value))} buttons={sellByButtons} />
        </Field>
        <Field label="Category" hint={fromGroup ? 'Set by the variant group' : undefined}>
          <CategoryPicker
            merchantId={merchantId}
            scope="inventory"
            parentId={null}
            value={categoryId}
            onChange={(id) => {
              category.field.onChange(id);
              // A subcategory belongs to one category; switching category drops it.
              setValue('subcategoryId', '', { shouldDirty: true });
            }}
            accessibilityLabel="Category"
            clearable
            disabled={fromGroup !== null}
          />
        </Field>
        <SubcategoryField merchantId={merchantId} control={control} categoryId={categoryId} fromGroup={fromGroup?.subcategoryId ?? null} />
      </FieldGrid>
    </>
  );
}

type SubcategoryFieldProps = Omit<SectionProps, 'setValue'> & { categoryId: string; fromGroup: string | null };

function SubcategoryField({ merchantId, control, categoryId, fromGroup }: SubcategoryFieldProps) {
  const { colors } = useAppTheme();
  const subcategory = useController({ control, name: 'subcategoryId' });

  return (
    <Field label="Subcategory">
      {categoryId ? (
        <CategoryPicker
          merchantId={merchantId}
          scope="inventory"
          parentId={categoryId}
          value={fromGroup ?? subcategory.field.value}
          onChange={subcategory.field.onChange}
          accessibilityLabel="Subcategory"
          clearable
          disabled={fromGroup !== null}
        />
      ) : (
        <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
          Choose a category first.
        </Text>
      )}
    </Field>
  );
}

/** The unit stock is counted and re-ordered in: the base unit unless it sells by the pack only. */
function useUnits(control: Control<StockItemValues>) {
  const [packUnit, baseUnit, sellBy] = useWatch({ control, name: ['packUnit', 'baseUnit', 'sellBy'] });
  const pack = packUnit || 'pack';
  const byBase = sellBy !== 'pack';
  return { pack, base: byBase ? baseUnit || 'unit' : pack, byBase };
}

function StockSettingsSection({ control }: { control: Control<StockItemValues> }) {
  const { base } = useUnits(control);
  const hasExpiry = useWatch({ control, name: 'hasExpiry' });

  return (
    <>
      <GroupHeading title="Stock settings" />
      <FieldGrid>
        <ControlledText control={control} name="packUnit" label="Pack unit name" placeholder="e.g. cup, box, tray" maxLength={20} />
        <ControlledText control={control} name="storageLocation" label="Storage location" maxLength={120} placeholder="Back room, shelf 2" />
        <ControlledText control={control} name="reorderAt" label="Re-order at" hint="In base units" keyboardType="decimal-pad" suffix={base} />
        <ControlledSwitch control={control} name="hasExpiry" label="Expiry" on="Has an expiration date" off="Does not expire" />
        {hasExpiry ? <ControlledDate control={control} name="expiryAlertOn" label="Expiry alert" hint="Date to start warning" clearable /> : null}
        <ControlledText control={control} name="description" label="Description" span="full" multiline maxLength={2000} />
      </FieldGrid>
    </>
  );
}

/** A new item's count on hand, optional: Inventory-added stock that sales draw down, never shown on Stock. */
function QuantitySection({ control, currency }: { control: Control<StockItemValues>; currency: string }) {
  const { pack } = useUnits(control);

  return (
    <>
      <GroupHeading title="Quantity on hand" />
      <FieldGrid>
        <ControlledText control={control} name="openingPacks" label={`${pack} on hand`} hint="Blank for none yet" keyboardType="number-pad" />
        <ControlledText control={control} name="openingCost" label={`Cost per ${pack}`} keyboardType="decimal-pad" prefix={currencySymbol(currency)} />
      </FieldGrid>
    </>
  );
}

/** What one pack holds, and a new item's loose units on hand. Only while it sells by a base unit. */
function BaseUnitSection({ control, locked, creating }: { control: Control<StockItemValues>; locked: boolean; creating: boolean }) {
  const { pack, base } = useUnits(control);

  return (
    <FieldGrid>
      <ControlledText control={control} name="baseUnit" label="Base unit type" placeholder="e.g. tablet" maxLength={20} />
      <ControlledText
        control={control}
        name="unitsPerPack"
        label={`${base} per ${pack}`}
        required
        keyboardType="decimal-pad"
        disabled={locked}
        hint={locked ? 'Locked while stock is on hand' : undefined}
      />
      {creating ? (
        <ControlledText control={control} name="openingLoose" label={`Loose ${base} on hand`} hint="Outside a full pack" keyboardType="decimal-pad" />
      ) : null}
    </FieldGrid>
  );
}

/** Variant: a variant joins an existing group, or names a new one. */
function VariantSection({ merchantId, control }: SectionProps) {
  return (
    <FieldGrid>
      <VariantFields
        merchantId={merchantId}
        control={control}
        names={{ isVariant: 'isVariant', newGroup: 'newGroup', groupId: 'groupId', newGroupName: 'newGroupName', attributes: 'attributes' }}
      />
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
  const fromGroup = useGroupCategory(merchantId, control);
  const nameOf = (rows: { id: string; name: string }[] | undefined, id: string) => rows?.find((row) => row.id === id)?.name;

  return (
    <FactGrid
      facts={[
        ['Pack name', item.name],
        ['SKU', item.sku],
        ['Barcode', item.barcode],
        ['Pack type', STOCK_ROLE_LABEL[item.stockRole]],
        ['Category', nameOf(categories.data, fromGroup?.categoryId ?? item.categoryId)],
        ['Subcategory', nameOf(categories.data, fromGroup?.subcategoryId ?? item.subcategoryId)],
        ...settingsFacts(item, units.base),
        ...unitFacts(item, units, currency),
        ['Variant group', item.isVariant ? (item.newGroup ? item.newGroupName : nameOf(groups.data, item.groupId)) : null],
        ['Variant name', item.isVariant ? item.attributes : null],
      ]}
    />
  );
}

const settingsFacts = (item: StockItemValues, base: string): Fact[] => [
  ['Pack unit', item.packUnit],
  ['Storage location', item.storageLocation],
  ['Re-order at', item.reorderAt && `${item.reorderAt} ${base}`],
  ['Expiry', item.hasExpiry ? 'Has an expiration date' : 'Does not expire'],
  ['Expiry alert', item.hasExpiry && item.expiryAlertOn ? displayDate(item.expiryAlertOn) : null],
  ['Description', item.description],
];

function unitFacts(item: StockItemValues, { pack, base }: { pack: string; base: string }, currency: string): Fact[] {
  const byBase = item.sellBy !== 'pack';
  const loose = byBase && Number(item.openingLoose) > 0 ? Number(item.openingLoose) : 0;
  const onHand = Number(item.openingPacks || 0) > 0 || loose > 0;
  return [
    ['Sell by', SELL_BY_LABEL[item.sellBy]],
    ['Units per pack', byBase ? `${item.unitsPerPack} ${base} per ${pack}` : null],
    ['Quantity on hand', onHand ? `${item.openingPacks || 0} ${pack}${loose > 0 ? ` + ${loose} ${base}` : ''}` : null],
    ['Cost per pack', onHand && item.openingCost ? formatMoney(Number(item.openingCost), currency) : null],
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

/** A paused save (queued offline) is not in flight. */
const isSaving = (save: { isPending: boolean; isPaused: boolean }) => save.isPending && !save.isPaused;

function stockItemNotice(
  save: { isPaused: boolean; isError: boolean; error: Error | null },
  submitted: boolean,
  failedSections: ReadonlySet<StockSectionId>
): Notice | null {
  const invalid = submitted && failedSections.size > 0;
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
