import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { DiscardDialog } from '../../components/discard-dialog';
import { FormFooter, FormNoticeText } from '../../components/form-footer';
import {
  AddButton,
  ControlledDate,
  ControlledSelect,
  ControlledText,
  FieldGrid,
  SectionHeading,
} from '../../components/form-fields';
import { IconButton } from '../../components/icon-button';
import { PageHeader } from '../../components/page-header';
import { ProgressBar } from '../../components/progress-bar';
import { SupplierDialog } from '../../components/supplier-dialog';
import { Text } from '../../components/text';
import { useStockItemOptionsQuery } from '../../features/products/queries';
import { stockFailure, useSaveReceiptMutation } from '../../features/stock-receipts/queries';
import { emptyReceiptHeader, emptyReceiptLine, lineCost, receiptHeaderSchema } from '../../features/stock-receipts/schema';
import type { ReceiptHeaderValues, ReceiptLineValues } from '../../features/stock-receipts/schema';
import { useSuppliersQuery } from '../../features/suppliers/queries';
import type { Supplier } from '../../features/suppliers/queries';
import { REVIEW_SIDEBAR, useShellWide } from '../../lib/columns';
import { failureMessage, mutationNotice } from '../../lib/errors';
import type { Notice } from '../../lib/errors';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { useLeaveGuard } from '../../lib/unsaved-guard';
import { useSheetResult } from '../../Store/sheet-result';
import { radius, spacing } from '../../themes';
import { LineEditor, lineItem, lineSummary } from './line-editor';
import { ReceiptReview } from './review';

type Props = { merchantId: string; currency: string };

type Step = 'header' | 'lines' | 'review';
const STEPS: Step[] = ['header', 'lines', 'review'];
const STEP_TITLE = { header: 'Delivery', lines: 'Lines', review: 'Review' } satisfies Record<Step, string>;

// Keyed by the exception save_receipt raises; stockFailure() hands back any snake_case message.
const FAILURE_COPY = new Map([
  ['supplier_inactive', 'This supplier has been deactivated. Choose another, or reactivate it under Suppliers.'],
  ['receipt_empty', 'Add at least one line.'],
  ['stock_item_not_found', 'One of the items was archived or deleted. Remove that line and pick the item again.'],
  ['receipt_line_serials', 'A serial-tracked line needs one serial per pack and no loose units.'],
  ['receipt_line_packs_per_case', 'Every line received in cases needs its packs per case.'],
  ['receipt_line_cost_required', 'Every line needs a cost.'],
]);

const SHEET_KEY = 'receipt-supplier';

/**
 * Receive stock (design.md §3, §6): a header, then an "Add line" loop, saved in one save_receipt call.
 * A full-screen stepper on a phone; on a tablet the header and lines scroll on the left and the review
 * stays beside them. Nothing reaches the database until Save — the receipt is fixed once it does.
 */
export function ReceiptWizard({ merchantId, currency }: Props) {
  const wide = useShellWide();
  const save = useSaveReceiptMutation({ merchantId });
  const items = useStockItemOptionsQuery({ merchantId }).data ?? [];
  const suppliers = useSuppliersQuery({ merchantId });

  const form = useForm<ReceiptHeaderValues>({
    resolver: zodResolver(receiptHeaderSchema),
    defaultValues: emptyReceiptHeader(),
    mode: 'onTouched',
  });
  const { isDirty } = useFormState({ control: form.control });
  // SAFETY: defaultValues sets every field and nothing unregisters one, so the watched object is whole;
  // useWatch types it DeepPartial only because it cannot know that.
  const header = useWatch({ control: form.control }) as ReceiptHeaderValues;

  const { lines, setLines, editing, setEditing, saveLine, problem, linesReady } = useLines();
  const [step, setStep] = useState<Step>('header');

  const pickSupplier = (id: string) => form.setValue('supplierId', id, { shouldDirty: true });
  const { createSupplier, supplierDialog } = useNewSupplier(merchantId, wide, pickSupplier);

  const guard = useLeaveGuard(isDirty || lines.length > 0 || editing !== null, (id) =>
    router.replace({ pathname: '/systems/[id]/stock/receipts/[receiptId]', params: { id: merchantId, receiptId: id } })
  );

  // Only the header and lines steps have a Next; each checks what it owns before moving on.
  const next = async () => {
    const ready = step === 'header' ? await form.trigger() : linesReady();
    if (ready) setStep(stepAfter(step));
  };

  // Wide, every step is on screen already; narrow, a failed save goes back to the step at fault.
  const backTo = (target: Step) => {
    if (!wide) setStep(target);
  };
  const submit = () => {
    void form.handleSubmit(
      (values) => {
        if (linesReady()) save.mutate({ header: values, lines }, { onSuccess: guard.setSavedId });
        else backTo('lines');
      },
      () => backTo('header')
    )();
  };

  const notice = receiptNotice(save, problem);
  const saving = save.isPending && !save.isPaused;

  const headerFields = (
    <HeaderFields
      control={form.control}
      currency={currency}
      suppliers={suppliers.data}
      loading={suppliers.isPending}
      onCreateSupplier={createSupplier}
    />
  );

  const lineList = (
    <LineList
      lines={lines}
      items={items}
      currency={currency}
      editing={editing}
      onEdit={setEditing}
      onSave={saveLine}
      onRemove={(index) => setLines((current) => current.filter((_, at) => at !== index))}
    />
  );

  const review = (
    <ReceiptReview header={header} supplierName={supplierName(suppliers.data, header.supplierId)} lines={lines} items={items} currency={currency} />
  );
  const actions = <SaveActions saving={saving} onSave={submit} />;

  return (
    <View style={styles.fill}>
      <PageHeader kicker="Stock" title="New receipt" meta={lineCount(lines.length)} onBack={() => router.back()} />

      {wide ? (
        <WideSplit pages={{ header: headerFields, lines: lineList, review }} notice={notice} actions={actions} />
      ) : (
        <NarrowSteps
          step={step}
          onStep={setStep}
          pages={{ header: headerFields, lines: lineList, review }}
          notice={notice}
          actions={actions}
          onNext={() => void next()}
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

/** The lines, the one open in the editor, and the problem that stops the merchant moving on. */
function useLines() {
  const [lines, setLines] = useState<ReceiptLineValues[]>([]);
  /** The line open in the editor: an index into `lines`, or 'new'. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const saveLine = (line: ReceiptLineValues) => {
    if (editing === null) return;
    setLines((current) => (editing === 'new' ? [...current, line] : current.map((row, at) => (at === editing ? line : row))));
    setEditing(null);
    setProblem(null);
  };

  /** Checks what the step owns; returns false and says why when the merchant cannot move on. */
  const linesReady = () => {
    if (editing !== null) {
      setProblem('Save or cancel the line you are editing first.');
      return false;
    }
    if (lines.length === 0) {
      setProblem('Add at least one line.');
      return false;
    }
    setProblem(null);
    return true;
  };

  return { lines, setLines, editing, setEditing, saveLine, problem, linesReady };
}

type HeaderFieldsProps = {
  control: Control<ReceiptHeaderValues>;
  currency: string;
  suppliers: Supplier[] | undefined;
  loading: boolean;
  onCreateSupplier: () => void;
};

function HeaderFields({ control, currency, suppliers, loading, onCreateSupplier }: HeaderFieldsProps) {
  // Inactive suppliers are not offered (design.md §2); save_receipt refuses them anyway.
  const supplierOptions = [
    { value: '', label: 'No supplier (opening stock)' },
    ...(suppliers ?? []).filter((row) => row.active).map((row) => ({ value: row.id, label: row.name })),
  ];

  return (
    <FieldGrid>
      <ControlledSelect
        control={control}
        name="supplierId"
        label="Supplier"
        span="full"
        options={supplierOptions}
        placeholder={loading ? 'Loading…' : 'Select supplier'}
        createLabel="New supplier"
        onCreate={onCreateSupplier}
      />
      <ControlledText control={control} name="invoiceNo" label="Invoice / DR number" maxLength={64} />
      <ControlledDate control={control} name="receivedOn" label="Received on" required />
      <ControlledText control={control} name="receivedBy" label="Received by" maxLength={80} />
      <ControlledText control={control} name="location" label="Receiving location" maxLength={120} />
      <ControlledText
        control={control}
        name="freight"
        label="Freight"
        hint="Spread across lines by value"
        keyboardType="decimal-pad"
        prefix={currencySymbol(currency)}
      />
      <ControlledText control={control} name="notes" label="Notes" span="full" multiline maxLength={2000} />
    </FieldGrid>
  );
}

type LineListProps = {
  lines: ReceiptLineValues[];
  items: LineRowProps['items'];
  currency: string;
  editing: number | 'new' | null;
  onEdit: (editing: number | 'new' | null) => void;
  onSave: (line: ReceiptLineValues) => void;
  onRemove: (index: number) => void;
};

/** The lines so far, one of them — or a new one — open in the editor. */
function LineList({ lines, items, currency, editing, onEdit, onSave, onRemove }: LineListProps) {
  return (
    <View style={styles.lines}>
      {lines.map((line, index) =>
        editing === index ? (
          <LineEditor key={index} currency={currency} items={items} initial={line} onSave={onSave} onCancel={() => onEdit(null)} />
        ) : (
          <LineRow
            key={index}
            line={line}
            items={items}
            currency={currency}
            disabled={editing !== null}
            onEdit={() => onEdit(index)}
            onRemove={() => onRemove(index)}
          />
        )
      )}
      {editing === 'new' ? (
        <LineEditor currency={currency} items={items} initial={emptyReceiptLine} onSave={onSave} onCancel={() => onEdit(null)} />
      ) : (
        <AddButton label="Add line" onPress={() => onEdit('new')} disabled={editing !== null} />
      )}
    </View>
  );
}

type PageProps = { pages: Record<Step, ReactElement>; notice: Notice | null; actions: ReactElement };

/** Wide, the header and lines scroll on the left and the review stays beside them. */
function WideSplit({ pages, notice, actions }: PageProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.split, { borderTopColor: colors.outlineVariant }]}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionHeading title="Delivery" hint="Who it came from and when" />
        {pages.header}
        <SectionHeading title="Lines" hint="One per item received" />
        {pages.lines}
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

type NarrowStepsProps = PageProps & { step: Step; onStep: (step: Step) => void; onNext: () => void };

/** Narrow, one step at a time: Next until the review, which saves. */
function NarrowSteps({ step, onStep, pages, notice, actions, onNext }: NarrowStepsProps) {
  return (
    <>
      <Stepper step={step} onBack={onStep} />
      <ScrollView key={step} style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {pages[step]}
      </ScrollView>
      <FormFooter notice={notice}>
        {step === 'review' ? (
          actions
        ) : (
          <Button mode="contained" icon="chevron-right" contentStyle={styles.trailingIcon} onPress={onNext}>
            Next
          </Button>
        )}
      </FormFooter>
    </>
  );
}

/** Narrow, the step the merchant is on, and the way back to the one before. */
function Stepper({ step, onBack }: { step: Step; onBack: (step: Step) => void }) {
  const { colors } = useAppTheme();
  const index = STEPS.indexOf(step);

  return (
    <View style={styles.stepper}>
      <View style={styles.stepperRow}>
        <IconButton
          icon="chevron-left"
          disabled={index === 0}
          onPress={() => onBack(STEPS[index - 1] ?? 'header')}
          accessibilityLabel="Previous step"
          style={styles.stepBack}
        />
        <View style={styles.fill}>
          <Text variant="labelMedium" style={{ color: colors.onSurfaceMuted }}>
            {`Step ${index + 1} of ${STEPS.length}`}
          </Text>
          <Text variant="titleMedium">{STEP_TITLE[step]}</Text>
        </View>
      </View>
      <ProgressBar progress={(index + 1) / STEPS.length} color={colors.accent} />
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
  const notice = mutationNotice(save, (failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't save this receipt. Try again."));
  return notice ?? (problem ? { type: 'error', text: problem } : null);
}

function stepAfter(step: Step) {
  return STEPS[STEPS.indexOf(step) + 1] ?? 'review';
}

function lineCount(count: number) {
  return `${count} ${count === 1 ? 'line' : 'lines'}`;
}

function supplierName(suppliers: Supplier[] | undefined, id: string) {
  return suppliers?.find((row) => row.id === id)?.name ?? 'Opening stock';
}

type LineRowProps = {
  line: ReceiptLineValues;
  items: Parameters<typeof lineItem>[1];
  currency: string;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

function LineRow({ line, items, currency, disabled, onEdit, onRemove }: LineRowProps) {
  const { colors } = useAppTheme();
  const item = lineItem(line, items);

  return (
    <Pressable
      onPress={onEdit}
      disabled={disabled}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${item?.name ?? 'line'}`}
      style={[styles.lineRow, { borderColor: colors.outlineVariant }]}
    >
      <View style={styles.fill}>
        <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {item?.name ?? 'Item no longer available'}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onSurfaceMuted }}>
          {[lineSummary(line, item), line.lotCode, line.mode === 'new' ? 'New item' : ''].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
        {formatMoney(lineCost(line, item?.unitsPerPack ?? 1), currency)}
      </Text>
      <IconButton icon="delete" onPress={onRemove} disabled={disabled} accessibilityLabel="Remove line" style={styles.stepBack} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  split: { flex: 1, flexDirection: 'row', borderTopWidth: 1 },
  sidebar: { width: REVIEW_SIDEBAR, borderLeftWidth: 1 },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  lines: { gap: spacing.ms },
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
  stepper: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // IconButton ships a 6dp margin of its own; zeroed so the row's gap is the only spacing.
  stepBack: { margin: 0 },
  footer: { gap: spacing.sm, padding: spacing.ms, borderTopWidth: 1 },
  // row-reverse turns Paper's leading icon slot into a trailing one (instruction_mds/visual-language.md §5).
  trailingIcon: { flexDirection: 'row-reverse', justifyContent: 'flex-end' },
});
