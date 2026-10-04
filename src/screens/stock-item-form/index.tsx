import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import type { Control, FieldErrors, UseFormReturn } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { DiscardDialog } from '../../components/discard-dialog';
import { FactGrid } from '../../components/fact-grid';
import type { Fact } from '../../components/fact-grid';
import { SectionHeading, displayDate } from '../../components/form-fields';
import { BaseUnitFields, PackFields } from '../../components/pack-fields';
import type { ItemFormMode } from '../../components/pack-fields';
import { PageHeader } from '../../components/page-header';
import { NarrowSteps, WideSections } from '../../components/section-stepper';
import { useCategoriesQuery } from '../../features/categories/queries';
import { useProductGroupsQuery } from '../../features/product-groups/queries';
import { saveFailure, useSaveStockItemMutation } from '../../features/products/queries';
import type { ProductDetail } from '../../features/products/queries';
import { SELL_BY_LABEL, STOCK_ROLE_LABEL, lineFromProduct } from '../../features/products/stock-item';
import { stockFailure } from '../../features/stock-receipts/queries';
import { emptyReceipt, itemFormSchema, unitsPerPack } from '../../features/stock-receipts/schema';
import type { PackLineValues, ReceiptValues } from '../../features/stock-receipts/schema';
import { useShellWide } from '../../lib/columns';
import { INVALID_FORM, SKU_TAKEN, failureMessage, mutationNotice } from '../../lib/errors';
import type { Notice } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useLeaveGuard } from '../../lib/unsaved-guard';

type Props = { merchantId: string; currency: string; product: ProductDetail | null };

// Keyed by the exception save_stock_item, guard_stock_item or create_lot raises; stockFailure() hands back
// any snake_case message.
const FAILURE_COPY = new Map([
  ['stock_item_units_locked', 'Units per pack can change only while nothing is on hand.'],
  ['receipt_line_quantity', 'Enter how many packs are on hand, or leave it blank.'],
  ['product_not_found', 'This item was archived or deleted elsewhere. Go back and open it again.'],
]);

const COPY = {
  new: { kicker: 'New item', save: 'Save item', discard: 'This item has not been saved.' },
  edit: { kicker: 'Edit item', save: 'Save changes', discard: 'Your edits to this item have not been saved.' },
};

type SectionId = 'pack' | 'base' | 'review';

const SECTION_META = {
  pack: { name: 'Pack', hint: 'What it is, how it sells, and how many are here' },
  base: { name: 'Base unit', hint: 'What one pack holds' },
  review: { name: 'Review', hint: 'Check it, then save' },
} satisfies Record<SectionId, { name: string; hint: string }>;

/** The line's fields on the Base unit step; every other field is on Pack. */
const BASE_FIELDS: ReadonlySet<string> = new Set(['baseUnit', 'unitsPerPack', 'unitsPerPackReceived', 'unitCost']);

/**
 * An Inventory item: the New Stock Receipt's Pack and Base Unit steps (src/components/pack-fields.tsx), the
 * same fields on the same line, with no supplier and no receipt. A new item's Pack quantity is its stock on
 * hand — a lot with no receipt, drawn down by the Register like any other. Saved through save_stock_item,
 * which also keeps the register drafts the Sell by choice wants.
 *
 * Rejected: the item form's own fields (2026-10-01 to 2026-10-04) — a second way to describe the same item
 * that drifted from the receipt's. The human asked for the receipt's steps, plus Category and Expiry alert.
 */
export function StockItemForm({ merchantId, currency, product }: Props) {
  const wide = useShellWide();
  const save = useSaveStockItemMutation({ merchantId });
  const editing = product !== null;
  // guard_stock_item refuses a new units per pack with stock on hand; the form says so before the save does.
  const mode: ItemFormMode = { creating: !editing, locked: (product?.qty_on_hand ?? 0) > 0 };

  const form = useForm<ReceiptValues>({
    resolver: zodResolver(itemFormSchema(!editing)),
    defaultValues: product ? { ...emptyReceipt(), line: lineFromProduct(product) } : emptyReceipt(),
    mode: 'onTouched',
  });
  // useFormState rather than form.formState: it returns a new object when a flag changes, which the
  // compiled component needs to see the change.
  const { isDirty, errors } = useFormState({ control: form.control });

  const copy = COPY[editing ? 'edit' : 'new'];
  const guard = useLeaveGuard(isDirty, (id) => leaveSaved(editing, merchantId, id));
  const { sections, current, index, setSectionId, openFailed } = useSections(form.control);
  const failedSections = sectionsWithErrors(errors.line);

  const [invalid, setInvalid] = useState(false);
  const submit = () => {
    void form.handleSubmit(
      (values) => {
        setInvalid(false);
        save.mutate({ line: values.line, product }, { onSuccess: guard.setSavedId });
      },
      (fieldErrors) => {
        setInvalid(true);
        openFailed(sectionsWithErrors(fieldErrors.line));
      }
    )();
  };

  const notice = stockItemNotice(save, invalid, failedSections);
  const actions = <SaveActions wide={wide} saving={save.isPending && !save.isPaused} label={copy.save} onSave={submit} />;

  const body = (
    <>
      <SectionHeading title={SECTION_META[current.id].name} hint={SECTION_META[current.id].hint} />
      <StepBody id={current.id} merchantId={merchantId} currency={currency} form={form} mode={mode} />
    </>
  );
  const steps = { sections, current, index, names: SECTION_META, failedSections, notice, body, onOpen: setSectionId };

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={copy.kicker}
        title={product?.name ?? 'Add an inventory item'}
        meta="Stock"
        onBack={() => router.back()}
        actions={wide ? actions : undefined}
      />
      {wide ? <WideSections {...steps} /> : <NarrowSteps {...steps} saveActions={actions} />}

      <DiscardDialog guard={guard} wide={wide} message={copy.discard} />
    </View>
  );
}

/** After a save: an edit goes back to the item, a new item opens on its page. */
function leaveSaved(editing: boolean, merchantId: string, productId: string) {
  if (editing) router.back();
  else router.replace({ pathname: '/systems/[id]/inventory/[productId]', params: { id: merchantId, productId } });
}

/** Pack, Base unit while it sells by one, Review — the receipt's steps 5 and 6 — and which is open. */
function useSections(control: Control<ReceiptValues>) {
  const sellBy = useWatch({ control, name: 'line.sellBy' });
  const sections: { id: SectionId; optional: boolean }[] = [
    { id: 'pack', optional: false },
    ...(sellBy !== 'pack' ? [{ id: 'base' as const, optional: false }] : []),
    { id: 'review', optional: false },
  ];
  const [sectionId, setSectionId] = useState<SectionId>('pack');
  const index = Math.max(0, sections.findIndex((entry) => entry.id === sectionId));
  // A failed save opens the first step at fault.
  const openFailed = (failed: ReadonlySet<SectionId>) =>
    setSectionId((open) => sections.find((entry) => failed.has(entry.id))?.id ?? open);
  return { sections, current: sections[index], index, setSectionId, openFailed };
}

/** The steps holding an error, from react-hook-form's errors under `line`. */
function sectionsWithErrors(lineErrors: FieldErrors<ReceiptValues>['line']): ReadonlySet<SectionId> {
  return new Set(Object.keys(lineErrors ?? {}).map((field): SectionId => (BASE_FIELDS.has(field) ? 'base' : 'pack')));
}

type StepBodyProps = { id: SectionId; merchantId: string; currency: string; form: UseFormReturn<ReceiptValues>; mode: ItemFormMode };

function StepBody({ id, merchantId, currency, form, mode }: StepBodyProps) {
  switch (id) {
    case 'pack':
      return <PackFields merchantId={merchantId} form={form} items={[]} currency={currency} fromCase={null} receivedOn="" itemForm={mode} />;
    case 'base':
      return <BaseUnitFields form={form} currency={currency} receipt={null} itemForm={mode} />;
    case 'review':
      return <ReviewSection merchantId={merchantId} currency={currency} control={form.control} />;
  }
}

/** Everything typed, before the save. Blank fields are left out (FactGrid). */
function ReviewSection({ merchantId, currency, control }: { merchantId: string; currency: string; control: Control<ReceiptValues> }) {
  // SAFETY: as in PackFields — every field of the line has a default, so the watched line is whole.
  const line = useWatch({ control, name: 'line' }) as PackLineValues;
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });
  const groups = useProductGroupsQuery({ merchantId });
  const group = line.isVariant && !line.newGroup ? groups.data?.find((row) => row.id === line.groupId) : undefined;
  // A picked group with a category files the item there (src/components/pack-fields.tsx, ItemCategoryFields).
  const filed = group?.category_id ? { category: group.category_id, sub: group.subcategory_id ?? '' } : { category: line.categoryId, sub: line.subcategoryId };
  const nameOf = (id: string) => categories.data?.find((row) => row.id === id)?.name;

  return (
    <FactGrid
      facts={[
        ...itemFacts(line),
        ['Category', nameOf(filed.category)],
        ['Subcategory', nameOf(filed.sub)],
        ['Variant group', line.isVariant ? (line.newGroup ? line.newGroupName : group?.name) : null],
        ['Variant name', line.isVariant ? line.attributes : null],
        ...stockFacts(line, currency),
      ]}
    />
  );
}

/** What the item is and how it sells. The unit stock is counted in: the base unit unless it sells by the pack. */
function itemFacts(line: PackLineValues): Fact[] {
  const byBase = line.sellBy !== 'pack';
  const unit = byBase ? line.baseUnit || 'unit' : 'pack';
  return [
    ['Pack name', line.name],
    ['SKU', line.sku],
    ['Pack type', STOCK_ROLE_LABEL[line.stockRole]],
    ['Storage location', line.location],
    ['Sell by', SELL_BY_LABEL[line.sellBy]],
    ['Base units qty', byBase ? `${line.unitsPerPack} ${unit} per pack` : null],
    ['Re-order at', line.reorderAt && `${line.reorderAt} ${unit}`],
  ];
}

/** Expiry, then a new item's packs on hand: how many, at what cost, and their date. */
function stockFacts(line: PackLineValues, currency: string): Fact[] {
  const packs = Number(line.packsExpected || 0);
  const units = line.sellBy === 'pack' ? '' : ` (${packs * unitsPerPack(line)} ${line.baseUnit || 'unit'})`;
  const stocked = packs > 0;
  return [
    ['Expiry', line.hasExpiry ? 'Has an expiration date' : 'Does not expire'],
    ['Expiry alert', line.hasExpiry && line.expiryAlertOn ? displayDate(line.expiryAlertOn) : null],
    ['Quantity on hand', stocked ? `${packs} pack${units}` : null],
    ['Cost per pack', stocked && line.costPerPack ? formatMoney(Number(line.costPerPack), currency) : null],
    ['Expiration date', stocked && line.hasExpiry && line.expiresOn ? displayDate(line.expiresOn) : null],
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

function stockItemNotice(
  save: { isPaused: boolean; isError: boolean; error: Error | null },
  submitted: boolean,
  failedSections: ReadonlySet<SectionId>
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
