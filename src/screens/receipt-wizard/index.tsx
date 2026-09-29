import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import type { FieldPath, UseFormReturn } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { DiscardDialog } from '../../components/discard-dialog';
import { FormFooter, FormNoticeText } from '../../components/form-footer';
import { AddButton, ControlledDate, ControlledSelect, ControlledSwitch, ControlledText, FieldGrid, SectionHeading } from '../../components/form-fields';
import { HelperText } from '../../components/helper-text';
import { IconButton } from '../../components/icon-button';
import { PageHeader } from '../../components/page-header';
import { StepHeader } from '../../components/step-header';
import { SupplierDialog } from '../../components/supplier-dialog';
import { Text } from '../../components/text';
import { useStockItemOptionsQuery } from '../../features/products/queries';
import { stockFailure, useSaveReceiptMutation } from '../../features/stock-receipts/queries';
import {
  caseTotals,
  emptyPackLine,
  emptyReceipt,
  landedCosts,
  lineCost,
  packLineFormSchema,
  receiptSchema,
} from '../../features/stock-receipts/schema';
import type { PackLineValues, ReceiptValues } from '../../features/stock-receipts/schema';
import { useSuppliersQuery } from '../../features/suppliers/queries';
import type { Supplier } from '../../features/suppliers/queries';
import { REVIEW_SIDEBAR, useShellWide } from '../../lib/columns';
import { SKU_TAKEN, failureMessage, mutationNotice, postgrestError } from '../../lib/errors';
import type { Notice } from '../../lib/errors';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { useLeaveGuard } from '../../lib/unsaved-guard';
import { useSheetResult } from '../../Store/sheet-result';
import { radius, spacing } from '../../themes';
import { BaseUnitFields, PackFields, ReadOnly } from './pack-fields';
import { ReceiptReview } from './review';

type Props = { merchantId: string; currency: string };

// The seven steps of .claude/inventory-stock/Stock_Receiving.html. Unit Load, Pallet and Case are
// optional tiers — a delivery arrives in whichever of them it arrives in — and Base Unit only exists while
// something is sold by the base unit.
type Step = 'general' | 'unitLoad' | 'pallet' | 'case' | 'pack' | 'base' | 'review';
const STEPS: Step[] = ['general', 'unitLoad', 'pallet', 'case', 'pack', 'base', 'review'];
const STEP_TITLE = {
  general: 'General',
  unitLoad: 'Unit Load',
  pallet: 'Pallet',
  case: 'Case',
  pack: 'Pack',
  base: 'Base Unit',
  review: 'Review',
} satisfies Record<Step, string>;
const OPTIONAL: Step[] = ['unitLoad', 'pallet', 'case'];

/** The fields a step owns, which Next validates before moving on. */
const STEP_FIELDS = {
  general: ['supplierId', 'invoiceNo', 'receivedOn', 'receivedBy', 'location', 'freight'],
  unitLoad: ['unitLoad'],
  pallet: ['pallet'],
  case: ['caseTier'],
  pack: ['line', 'lines'],
  base: ['line'],
  review: ['notes'],
} satisfies Record<Step, FieldPath<ReceiptValues>[]>;

// Keyed by the exception save_receipt raises (20260929100100_stock_ledger.sql §5); stockFailure() hands
// back any snake_case message.
const FAILURE_COPY = new Map([
  ['supplier_not_available', 'This supplier has been deactivated. Choose another, or reactivate it under Suppliers.'],
  ['receipt_has_no_lines', 'Add at least one product.'],
  ['stock_item_not_found', 'One of the items was archived or deleted. Pick the item again.'],
  ['receipt_line_case_tier', 'The Case step needs cases, packs per case and the cost of one case.'],
  ['receipt_line_quantity', 'Every product needs packs received, and loose units fewer than one full pack.'],
  ['receipt_line_expiry_required', 'Every product that expires needs its expiration date.'],
  ['receipt_line_serial_count', 'There are more serial numbers than packs.'],
]);

const SHEET_KEY = 'receipt-supplier';

/**
 * Receive stock: a delivery from one supplier, its tiers, and one product — or a list of them — saved in
 * one save_receipt call. A full-screen stepper on a phone; on a tablet every step scrolls on the left and
 * the review stays beside them. Nothing reaches the database until Save, and the receipt is fixed once it
 * does.
 */
export function ReceiptWizard({ merchantId, currency }: Props) {
  const wide = useShellWide();
  const save = useSaveReceiptMutation({ merchantId });
  const items = useStockItemOptionsQuery({ merchantId }).data;
  const suppliers = useSuppliersQuery({ merchantId });

  const form = useForm<ReceiptValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: emptyReceipt(),
    mode: 'onTouched',
  });
  const { isDirty } = useFormState({ control: form.control });
  // SAFETY: defaultValues sets every field and nothing unregisters one, so the watched object is whole;
  // useWatch types it DeepPartial only because it cannot know that.
  const receipt = useWatch({ control: form.control }) as ReceiptValues;

  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const { step, setStep, steps, move, next, skip } = useStepper(form, receipt, editing !== null);

  const pickSupplier = (id: string) => form.setValue('supplierId', id, { shouldDirty: true, shouldValidate: true });
  const { createSupplier, supplierDialog } = useNewSupplier(merchantId, wide, pickSupplier);

  const guard = useReceiptGuard(merchantId, isDirty || editing !== null);

  // Narrow, a failed save goes back to the first step at fault; wide, every step is on screen.
  const showFailed = (failed: string[]) => setStep(firstFailedStep(steps, failed, wide) ?? step);
  const saveReceipt = (values: ReceiptValues) => save.mutate(values, { onSuccess: guard.setSavedId });
  const submit = () => submitForm(form, saveReceipt, showFailed);

  const notice = receiptNotice(save, editingProblem(editing !== null && step === 'pack'));
  const saving = save.isPending && !save.isPaused;
  const pages = wizardPages({ form, receipt, items, currency, suppliers: suppliers.data, suppliersLoading: suppliers.isPending, createSupplier, editing, setEditing });
  const actions = <SaveActions saving={saving} onSave={submit} />;

  return (
    <View style={styles.fill}>
      <PageHeader kicker="Stock" title="New stock receipt" meta={productCount(receipt)} onBack={() => router.back()} />

      {wide ? (
        <WideSplit steps={steps} pages={pages} notice={notice} actions={actions} />
      ) : (
        <NarrowSteps
          step={step}
          steps={steps}
          pages={pages}
          notice={notice}
          actions={actions}
          onBack={() => move(-1)}
          onNext={() => void next()}
          onSkip={skip}
        />
      )}

      {supplierDialog}

      <DiscardDialog
        guard={guard}
        wide={wide}
        kicker="Unsaved receipt"
        title="Discard this receipt?"
        message="Nothing on this receipt has been saved, and no stock has been counted."
      />
    </View>
  );
}

type PagesArgs = {
  form: UseFormReturn<ReceiptValues>;
  receipt: ReceiptValues;
  items: PackStepProps['items'] | undefined;
  currency: string;
  suppliers: Supplier[] | undefined;
  suppliersLoading: boolean;
  createSupplier: () => void;
  editing: number | 'new' | null;
  setEditing: (editing: number | 'new' | null) => void;
};

/** Each step's page. The Case tier feeds the single product's pack count and cost. */
function wizardPages({ form, receipt, items, currency, suppliers, suppliersLoading, createSupplier, editing, setEditing }: PagesArgs) {
  const fromCase = receipt.multi ? null : caseTotals(receipt);
  const unitCost = landedCosts(receipt)[0]?.unitCost ?? 0;
  return {
    general: <GeneralFields form={form} currency={currency} suppliers={suppliers} loading={suppliersLoading} onCreateSupplier={createSupplier} />,
    unitLoad: <TierFields form={form} name="unitLoad" note="Unit Load (tier 5): skip if the delivery did not come in one." per="Pallets per unit load" total="Total pallets" />,
    pallet: <TierFields form={form} name="pallet" note="Pallet (tier 4): skip if the delivery did not come on pallets." per="Cases per pallet" total="Total cases" />,
    case: <CaseFields form={form} currency={currency} />,
    pack: <PackStep form={form} items={items ?? []} currency={currency} fromCase={fromCase} editing={editing} onEdit={setEditing} />,
    base: <BaseUnitFields form={form} currency={currency} unitCost={unitCost} fromCase={fromCase} />,
    review: (
      <>
        <ReceiptReview receipt={receipt} supplierName={supplierName(suppliers, receipt.supplierId)} currency={currency} />
        <ControlledText control={form.control} name="notes" label="Notes" span="full" multiline maxLength={2000} placeholder="e.g. damaged boxes, short delivery" />
      </>
    ),
  } satisfies Record<Step, ReactElement>;
}

/**
 * Which step is showing, the steps there are (Base Unit comes and goes with Sell By), and moving between
 * them: Next checks the step's own fields first; Skip tier clears a tier, since a skipped tier saves nothing.
 */
function useStepper(form: UseFormReturn<ReceiptValues>, receipt: ReceiptValues, editingLine: boolean) {
  const [step, setStep] = useState<Step>('general');
  const steps = STEPS.filter((candidate) => candidate !== 'base' || baseUnitNeeded(receipt));

  const move = (by: number) => setStep(steps[Math.min(Math.max(steps.indexOf(step) + by, 0), steps.length - 1)]);
  const next = async () => {
    if (step === 'pack' && editingLine) return;
    if (await form.trigger(STEP_FIELDS[step])) move(1);
  };
  const skip = () => {
    if (step === 'unitLoad' || step === 'pallet') form.setValue(step, { sscc: '', received: '', per: '' });
    if (step === 'case') form.setValue('caseTier', { sscc: '', received: '', per: '', cost: '' });
    form.clearErrors(STEP_FIELDS[step]);
    move(1);
  };
  return { step, setStep, steps, move, next, skip };
}

/** Validates, then saves — or hands over the names of the fields that failed. */
function submitForm(form: UseFormReturn<ReceiptValues>, onValid: (values: ReceiptValues) => void, onInvalid: (failed: string[]) => void) {
  void form.handleSubmit(onValid, (errors) => onInvalid(Object.keys(errors)))();
}

/** Why Next does nothing on the Pack step: a product is still open in its editor. */
const editingProblem = (blocked: boolean) => (blocked ? 'Save or cancel the product you are editing first.' : null);

/** Leaving with anything typed asks first; a saved receipt opens in place of the wizard. */
function useReceiptGuard(merchantId: string, dirty: boolean) {
  return useLeaveGuard(dirty, (id) =>
    router.replace({ pathname: '/systems/[id]/stock/receipts/[receiptId]', params: { id: merchantId, receiptId: id } })
  );
}

/** The first step owning a field that failed validation. */
const firstFailedStep = (steps: Step[], failed: string[], wide: boolean) =>
  wide ? undefined : steps.find((candidate) => STEP_FIELDS[candidate].some((field) => failed.includes(field.split('.')[0])));

type NarrowStepsProps = {
  step: Step;
  steps: Step[];
  pages: Record<Step, ReactElement>;
  notice: Notice | null;
  actions: ReactElement;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

/** Narrow, one step at a time: Next (and Skip tier on an optional tier) until the review, which saves. */
function NarrowSteps({ step, steps, pages, notice, actions, onBack, onNext, onSkip }: NarrowStepsProps) {
  const optional = OPTIONAL.includes(step);
  return (
    <>
      <StepHeader
        index={steps.indexOf(step)}
        count={steps.length}
        title={STEP_TITLE[step]}
        optional={optional}
        backLabel="Previous step"
        onBack={onBack}
      />
      <ScrollView key={step} style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {pages[step]}
      </ScrollView>
      <FormFooter notice={notice}>
        {step === 'review' ? (
          actions
        ) : (
          <>
            <Button mode="contained" icon="chevron-right" contentStyle={styles.trailingIcon} onPress={onNext}>
              Next
            </Button>
            {optional ? (
              <Button mode="text" onPress={onSkip}>
                Skip tier
              </Button>
            ) : null}
          </>
        )}
      </FormFooter>
    </>
  );
}

/** The Base Unit step exists while the single product sells by the base unit. A list of products carries it per product. */
const baseUnitNeeded = (receipt: ReceiptValues) => !receipt.multi && receipt.line.sellBy !== 'pack';

/** A new supplier from the Supplier field: a dialog on a tablet, the sheet route on a phone. */
function useNewSupplier(merchantId: string, wide: boolean, onCreated: (id: string) => void) {
  useSheetResult(SHEET_KEY, onCreated);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const createSupplier = () => {
    if (wide) setCreatingSupplier(true);
    else router.push({ pathname: '/sheets/supplier', params: { merchantId, resultKey: SHEET_KEY } });
  };
  const supplierDialog = creatingSupplier ? (
    <SupplierDialog merchantId={merchantId} onDismiss={() => setCreatingSupplier(false)} onCreated={(row) => onCreated(row.id)} />
  ) : null;
  return { createSupplier, supplierDialog };
}

type Form = UseFormReturn<ReceiptValues>;

type GeneralFieldsProps = {
  form: Form;
  currency: string;
  suppliers: Supplier[] | undefined;
  loading: boolean;
  onCreateSupplier: () => void;
};

function GeneralFields({ form, currency, suppliers, loading, onCreateSupplier }: GeneralFieldsProps) {
  // Only active suppliers can be picked when receiving; save_receipt refuses the rest anyway.
  const supplierOptions = (suppliers ?? []).filter((row) => row.active).map((row) => ({ value: row.id, label: row.name }));

  return (
    <FieldGrid>
      <ControlledSelect
        control={form.control}
        name="supplierId"
        label="Supplier"
        required
        span="full"
        options={supplierOptions}
        placeholder={loading ? 'Loading…' : 'Select supplier'}
        createLabel="New supplier"
        onCreate={onCreateSupplier}
      />
      <ControlledText control={form.control} name="invoiceNo" label="Invoice / DR No." placeholder="e.g. DR-4471" maxLength={64} />
      <ControlledDate control={form.control} name="receivedOn" label="Date received" required />
      <ControlledText control={form.control} name="receivedBy" label="Received by" placeholder="Staff name" maxLength={80} />
      <ControlledText control={form.control} name="location" label="Receiving location" placeholder="e.g. Main Warehouse" maxLength={120} />
      <ControlledText
        control={form.control}
        name="freight"
        label="Freight / other charges"
        hint="Spread by value into cost per base unit"
        keyboardType="decimal-pad"
        prefix={currencySymbol(currency)}
        span="full"
      />
    </FieldGrid>
  );
}

type TierFieldsProps = { form: Form; name: 'unitLoad' | 'pallet'; note: string; per: string; total: string };

/** Unit Load or Pallet: how the delivery came, kept as the lot's record. */
function TierFields({ form, name, note, per, total }: TierFieldsProps) {
  const tier = useWatch({ control: form.control, name });
  const count = Number(tier.received) * Number(tier.per);

  return (
    <>
      <OptionalNote text={note} />
      <FieldGrid>
        <ControlledText control={form.control} name={`${name}.sscc`} label="Container ID / SSCC" placeholder="Optional" span="full" maxLength={64} />
        <ControlledText control={form.control} name={`${name}.received`} label={`Received ${STEP_TITLE[name].toLowerCase()}s`} keyboardType="number-pad" />
        <ControlledText control={form.control} name={`${name}.per`} label={per} keyboardType="number-pad" />
        <ReadOnly label={total} value={count > 0 ? String(count) : '—'} />
      </FieldGrid>
    </>
  );
}

/** Case: each case gets its own CS-#### on save, and the pack count and cost follow from it. */
function CaseFields({ form, currency }: { form: Form; currency: string }) {
  const caseTier = useWatch({ control: form.control, name: 'caseTier' });
  const totals = caseTotals({ caseTier });

  return (
    <>
      <OptionalNote text="Case (tier 3): skip if the packs did not come in cases. Each case gets its own ID (CS-####) on save." />
      <FieldGrid>
        <ControlledText control={form.control} name="caseTier.sscc" label="Container ID / SSCC" placeholder="Optional" span="full" maxLength={64} />
        <ControlledText control={form.control} name="caseTier.received" label="Received cases" keyboardType="number-pad" />
        <ControlledText control={form.control} name="caseTier.per" label="Packs per case" keyboardType="number-pad" />
        <ControlledText control={form.control} name="caseTier.cost" label="Cost per case" keyboardType="decimal-pad" prefix={currencySymbol(currency)} />
        <ReadOnly label="Total cost" value={totals ? formatMoney(totals.totalCost, currency) : '—'} />
        <ReadOnly label="Total packs" value={totals ? String(totals.packs) : '—'} />
      </FieldGrid>
    </>
  );
}

function OptionalNote({ text }: { text: string }) {
  const { colors } = useAppTheme();
  return (
    <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
      {text}
    </Text>
  );
}

type PackStepProps = {
  form: Form;
  items: Parameters<typeof PackFields>[0]['items'];
  currency: string;
  fromCase: ReturnType<typeof caseTotals>;
  editing: number | 'new' | null;
  onEdit: (editing: number | 'new' | null) => void;
};

/** One product, or — with the switch on — a list of them, each added through its own editor. */
function PackStep({ form, items, currency, fromCase, editing, onEdit }: PackStepProps) {
  const multi = useWatch({ control: form.control, name: 'multi' });
  const lines = useWatch({ control: form.control, name: 'lines' });
  const receivedOn = useWatch({ control: form.control, name: 'receivedOn' });
  const linesError = form.formState.errors.lines?.message;

  const saveLine = (line: PackLineValues) => {
    const current = form.getValues('lines');
    form.setValue('lines', editing === 'new' ? [...current, line] : current.map((row, at) => (at === editing ? line : row)), {
      shouldDirty: true,
      shouldValidate: true,
    });
    onEdit(null);
  };

  return (
    <>
      <FieldGrid>
        <ControlledSwitch
          control={form.control}
          name="multi"
          label="Products in this delivery"
          span="full"
          on="This pack has other products / variants in it"
          off="One product"
        />
      </FieldGrid>
      {multi ? (
        <View style={styles.lines}>
          {fromCase ? <OptionalNote text="The Case, Pallet and Unit Load counts apply to one product, and are not saved with a list." /> : null}
          {lines.map((line, index) =>
            editing === index ? (
              <PackLineEditor key={index} items={items} currency={currency} initial={line} receivedOn={receivedOn} onSave={saveLine} onCancel={() => onEdit(null)} />
            ) : (
              <LineRow
                key={index}
                line={line}
                currency={currency}
                disabled={editing !== null}
                onEdit={() => onEdit(index)}
                onRemove={() => form.setValue('lines', lines.filter((_, at) => at !== index), { shouldDirty: true })}
              />
            )
          )}
          {editing === 'new' ? (
            <PackLineEditor items={items} currency={currency} initial={emptyPackLine} receivedOn={receivedOn} onSave={saveLine} onCancel={() => onEdit(null)} />
          ) : (
            <AddButton label="Add product / variant" onPress={() => onEdit('new')} disabled={editing !== null} />
          )}
          {linesError ? <HelperText type="error">{linesError}</HelperText> : null}
        </View>
      ) : (
        <PackFields form={form} items={items} currency={currency} fromCase={fromCase} receivedOn={receivedOn} />
      )}
    </>
  );
}

type EditorProps = {
  items: PackStepProps['items'];
  currency: string;
  initial: PackLineValues;
  receivedOn: string;
  onSave: (line: PackLineValues) => void;
  onCancel: () => void;
};

/**
 * Add Product/Variant: one product of a list, in a form of its own so a half-typed product never reaches
 * the receipt. The receipt's shape with only its `line` checked (packLineFormSchema), so it reuses the Pack
 * and Base Unit fields; the Base Unit block shows and hides with Sell By as it is changed.
 */
function PackLineEditor({ items, currency, initial, receivedOn, onSave, onCancel }: EditorProps) {
  const { colors } = useAppTheme();
  const form = useForm<ReceiptValues>({
    resolver: zodResolver(packLineFormSchema),
    defaultValues: { ...emptyReceipt(), receivedOn, line: initial },
    mode: 'onTouched',
  });
  const sellBy = useWatch({ control: form.control, name: 'line.sellBy' });
  // SAFETY: as in ReceiptWizard.
  const values = useWatch({ control: form.control }) as ReceiptValues;

  return (
    <View style={[styles.editor, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
      <PackFields form={form} items={items} currency={currency} fromCase={null} receivedOn={receivedOn} />
      {sellBy !== 'pack' ? <BaseUnitFields form={form} currency={currency} unitCost={landedCosts(values)[0]?.unitCost ?? 0} fromCase={null} /> : null}
      <View style={styles.editorActions}>
        <Button mode="contained" icon="check" onPress={() => void form.handleSubmit((receipt) => onSave(receipt.line))()}>
          Save to list
        </Button>
        <Button mode="text" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

type LineRowProps = { line: PackLineValues; currency: string; disabled: boolean; onEdit: () => void; onRemove: () => void };

function LineRow({ line, currency, disabled, onEdit, onRemove }: LineRowProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onEdit}
      disabled={disabled}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §4).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${line.name || 'product'}`}
      style={[styles.lineRow, { borderColor: colors.outlineVariant }]}
    >
      <View style={styles.fill}>
        <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {line.name || 'New item'}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {[line.sku, `${line.packs || 0} packs`, `${formatMoney(Number(line.costPerPack || 0), currency)}/pack`, line.productId === '' ? 'New item' : '']
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
        {formatMoney(lineCost(line, null), currency)}
      </Text>
      <IconButton icon="delete" onPress={onRemove} disabled={disabled} accessibilityLabel="Remove product" style={styles.removeLine} />
    </Pressable>
  );
}

type WideSplitProps = { steps: Step[]; pages: Record<Step, ReactElement>; notice: Notice | null; actions: ReactElement };

/** Wide, every step scrolls on the left and the review stays beside them. */
function WideSplit({ steps, pages, notice, actions }: WideSplitProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.split, { borderTopColor: colors.outlineVariant }]}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {steps
          .filter((step) => step !== 'review')
          .map((step, index) => (
            <View key={step} style={styles.section}>
              <SectionHeading title={`${index + 1}. ${STEP_TITLE[step]}`} hint={OPTIONAL.includes(step) ? 'Optional' : undefined} />
              {pages[step]}
            </View>
          ))}
      </ScrollView>
      <View style={[styles.sidebar, { borderLeftColor: colors.outlineVariant, backgroundColor: colors.surfaceSubtle }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <SectionHeading title="Review" />
          {pages.review}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
          <FormNoticeText notice={notice} />
          {actions}
        </View>
      </View>
    </View>
  );
}

function SaveActions({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <>
      <Button mode="contained" icon="check" onPress={onSave} loading={saving} disabled={saving}>
        Save receipt
      </Button>
      <Button mode="text" onPress={() => router.back()} disabled={saving}>
        Cancel
      </Button>
    </>
  );
}

function receiptNotice(save: { isPaused: boolean; isError: boolean; error: Error | null }, problem: string | null): Notice | null {
  const failure = stockFailure(save.error);
  const error = postgrestError(save.error);
  const duplicate =
    error?.code === '23505'
      ? error.message.includes('products_sku_unique')
        ? SKU_TAKEN
        : error.message.includes('stock_lots_code_unique')
          ? 'Another delivery already uses this lot number. Change it, or leave it blank for a new one.'
          : error.message.includes('stock_packs_serial_unique')
            ? 'One of these serial numbers is already on another pack.'
            : null
      : null;
  return mutationNotice(save, duplicate ?? (failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't save this receipt. Try again."), problem);
}

function productCount(receipt: ReceiptValues) {
  const count = receipt.multi ? receipt.lines.length : 1;
  return `${count} ${count === 1 ? 'product' : 'products'}`;
}

function supplierName(suppliers: Supplier[] | undefined, id: string) {
  return suppliers?.find((row) => row.id === id)?.name ?? '—';
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  split: { flex: 1, flexDirection: 'row', borderTopWidth: 1 },
  sidebar: { width: REVIEW_SIDEBAR, borderLeftWidth: 1 },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.md },
  lines: { gap: spacing.ms },
  editor: { gap: spacing.md, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', padding: spacing.md },
  editorActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  // IconButton ships a 6dp margin of its own; zeroed so the row's gap is the only spacing.
  removeLine: { margin: 0 },
  footer: { gap: spacing.sm, padding: spacing.ms, borderTopWidth: 1 },
  // row-reverse turns Paper's leading icon slot into a trailing one (instruction_mds/visual-language.md §4).
  trailingIcon: { flexDirection: 'row-reverse', justifyContent: 'flex-end' },
});
