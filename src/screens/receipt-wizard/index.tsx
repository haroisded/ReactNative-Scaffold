import { zodResolver } from '@hookform/resolvers/zod';
import { router, useNavigation } from 'expo-router';
import { StackActions, usePreventRemove } from 'expo-router/react-navigation';
import type { NavigationAction } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdaptiveDialog } from '../../components/adaptive-dialog';
import { Button } from '../../components/button';
import {
  AddButton,
  ControlledDate,
  ControlledSelect,
  ControlledText,
  FieldGrid,
  SectionHeading,
} from '../../components/form-fields';
import { HelperText } from '../../components/helper-text';
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
import { REVIEW_SIDEBAR, useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { useUnsavedGuard } from '../../lib/unsaved-guard';
import { useSheetResult } from '../../Store/sheet-result';
import { radius, spacing } from '../../themes';
import { LineEditor, lineItem, lineSummary } from './line-editor';
import { ReceiptReview } from './review';

type Props = { merchantId: string; currency: string };

type Step = 'header' | 'lines' | 'review';
const STEPS: Step[] = ['header', 'lines', 'review'];
const STEP_TITLE = { header: 'Delivery', lines: 'Lines', review: 'Review' } satisfies Record<Step, string>;

/** What a blocked exit was about to do: a removal from the stack, or a rail switch. */
type Leave = { kind: 'remove'; action: NavigationAction } | { kind: 'rail'; proceed: () => void };

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
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const navigation = useNavigation();
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

  const [lines, setLines] = useState<ReceiptLineValues[]>([]);
  /** The line open in the editor: an index into `lines`, or 'new'. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [step, setStep] = useState<Step>('header');
  const [problem, setProblem] = useState<string | null>(null);

  // Inactive suppliers are not offered (design.md §2); save_receipt refuses them anyway.
  const supplierOptions = [
    { value: '', label: 'No supplier (opening stock)' },
    ...(suppliers.data ?? []).filter((row) => row.active).map((row) => ({ value: row.id, label: row.name })),
  ];
  const supplierName = suppliers.data?.find((row) => row.id === header.supplierId)?.name ?? 'Opening stock';

  const pickSupplier = (id: string) => form.setValue('supplierId', id, { shouldDirty: true });
  useSheetResult(SHEET_KEY, pickSupplier);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const createSupplier = () => {
    if (wide) setCreatingSupplier(true);
    else router.push({ pathname: '/sheets/supplier', params: { merchantId, resultKey: SHEET_KEY } });
  };

  // The unsaved-changes guard, as in the product form (src/screens/product-form/index.tsx).
  const [blocked, setBlocked] = useState<Leave | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Leave | null>(null);
  const guarded = (isDirty || lines.length > 0 || editing !== null) && savedId === null && leaving === null;
  usePreventRemove(guarded, ({ data }) => setBlocked({ kind: 'remove', action: data.action }));

  const leaveGuard = useUnsavedGuard();
  useEffect(() => {
    if (!guarded) return;
    leaveGuard.current = (proceed) => setBlocked({ kind: 'rail', proceed });
    return () => {
      leaveGuard.current = null;
    };
  }, [guarded, leaveGuard]);

  // After the render in which savedId switched the guard off, so the guard does not catch its own exit.
  useEffect(() => {
    if (savedId === null) return;
    router.replace({ pathname: '/systems/[id]/stock/receipts/[receiptId]', params: { id: merchantId, receiptId: savedId } });
  }, [savedId, merchantId]);

  useEffect(() => {
    if (leaving?.kind !== 'rail') return;
    navigation.dispatch(StackActions.popToTop());
    leaving.proceed();
  }, [leaving, navigation]);

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

  const next = async () => {
    if (step === 'header') {
      if (await form.trigger()) setStep('lines');
      return;
    }
    if (step === 'lines' && linesReady()) setStep('review');
  };

  const submit = () => {
    void form.handleSubmit(
      (values) => {
        if (!linesReady()) {
          if (!wide) setStep('lines');
          return;
        }
        save.mutate({ header: values, lines }, { onSuccess: (id) => setSavedId(id) });
      },
      () => {
        if (!wide) setStep('header');
      }
    )();
  };

  const failure = stockFailure(save.error);
  const notice = save.isPaused
    ? { type: 'info' as const, text: 'Waiting for a connection. The receipt saves on its own when you reconnect.' }
    : save.isError
      ? { type: 'error' as const, text: (failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't save this receipt. Try again.") }
      : problem
        ? { type: 'error' as const, text: problem }
        : null;
  const saving = save.isPending && !save.isPaused;

  const headerFields = (
    <FieldGrid>
      <ControlledSelect
        control={form.control}
        name="supplierId"
        label="Supplier"
        span="full"
        options={supplierOptions}
        placeholder={suppliers.isPending ? 'Loading…' : 'Select supplier'}
        createLabel="New supplier"
        onCreate={createSupplier}
      />
      <ControlledText control={form.control} name="invoiceNo" label="Invoice / DR number" maxLength={64} />
      <ControlledDate control={form.control} name="receivedOn" label="Received on" required />
      <ControlledText control={form.control} name="receivedBy" label="Received by" maxLength={80} />
      <ControlledText control={form.control} name="location" label="Receiving location" maxLength={120} />
      <ControlledText
        control={form.control}
        name="freight"
        label="Freight"
        hint="Spread across lines by value"
        keyboardType="decimal-pad"
        prefix={currencySymbol(currency)}
      />
      <ControlledText control={form.control} name="notes" label="Notes" span="full" multiline maxLength={2000} />
    </FieldGrid>
  );

  const lineList = (
    <View style={styles.lines}>
      {lines.map((line, index) =>
        editing === index ? (
          <LineEditor
            key={index}
            currency={currency}
            items={items}
            initial={line}
            onSave={saveLine}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <LineRow
            key={index}
            line={line}
            items={items}
            currency={currency}
            disabled={editing !== null}
            onEdit={() => setEditing(index)}
            onRemove={() => setLines((current) => current.filter((_, at) => at !== index))}
          />
        )
      )}
      {editing === 'new' ? (
        <LineEditor currency={currency} items={items} initial={emptyReceiptLine} onSave={saveLine} onCancel={() => setEditing(null)} />
      ) : (
        <AddButton label="Add line" onPress={() => setEditing('new')} disabled={editing !== null} />
      )}
    </View>
  );

  const review = (
    <ReceiptReview header={header} supplierName={supplierName} lines={lines} items={items} currency={currency} />
  );

  const noticeText = notice ? (
    <HelperText type={notice.type} padding="none">
      {notice.text}
    </HelperText>
  ) : null;

  const index = STEPS.indexOf(step);

  return (
    <View style={styles.fill}>
      <PageHeader kicker="Stock" title="New receipt" meta={`${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`} onBack={() => router.back()} />

      {wide ? (
        <View style={[styles.split, { borderTopColor: colors.outlineVariant }]}>
          <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SectionHeading title="Delivery" hint="Who it came from and when" />
            {headerFields}
            <SectionHeading title="Lines" hint="One per item received" />
            {lineList}
          </ScrollView>
          <View style={[styles.sidebar, { borderLeftColor: colors.outlineVariant, backgroundColor: colors.surfaceSubtle }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <SectionHeading title="Review" />
              {review}
            </ScrollView>
            <View style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
              {noticeText}
              <Button mode="contained" icon="check" onPress={submit} loading={saving} disabled={saving}>
                Save receipt
              </Button>
              <Button mode="text" onPress={() => router.back()} disabled={saving}>
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.stepper}>
            <View style={styles.stepperRow}>
              <IconButton
                icon="chevron-left"
                disabled={index === 0}
                onPress={() => setStep(STEPS[index - 1] ?? 'header')}
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
          <ScrollView key={step} style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {step === 'header' ? headerFields : step === 'lines' ? lineList : review}
          </ScrollView>
          {/* SafeAreaView: the Android build is edge-to-edge, as in the product form. */}
          <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
            {noticeText}
            {step === 'review' ? (
              <>
                <Button mode="contained" icon="check" onPress={submit} loading={saving} disabled={saving}>
                  Save receipt
                </Button>
                <Button mode="text" onPress={() => router.back()} disabled={saving}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button mode="contained" icon="chevron-right" contentStyle={styles.trailingIcon} onPress={() => void next()}>
                Next
              </Button>
            )}
          </SafeAreaView>
        </>
      )}

      {creatingSupplier ? (
        <SupplierDialog
          merchantId={merchantId}
          onDismiss={() => setCreatingSupplier(false)}
          onCreated={(row) => pickSupplier(row.id)}
        />
      ) : null}

      {blocked ? (
        <AdaptiveDialog
          wide={wide}
          onDismiss={() => setBlocked(null)}
          kicker="Unsaved receipt"
          kickerTone="error"
          title="Discard this receipt?"
          actions={
            <>
              <Button mode="outlined" onPress={() => setBlocked(null)} contentStyle={styles.dialogAction}>
                Keep editing
              </Button>
              <Button
                mode="contained"
                buttonColor={colors.error}
                textColor={colors.onError}
                contentStyle={styles.dialogAction}
                onPress={() => {
                  const leave = blocked;
                  setBlocked(null);
                  if (leave.kind === 'remove') navigation.dispatch(leave.action);
                  else setLeaving(leave);
                }}
              >
                Discard
              </Button>
            </>
          }
        >
          <Text variant="bodyMedium">Nothing on this receipt has been saved, and no stock has been counted.</Text>
        </AdaptiveDialog>
      ) : null}
    </View>
  );
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
  dialogAction: { justifyContent: 'flex-start' },
});
