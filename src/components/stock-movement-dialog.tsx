import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as z from 'zod';

import { useProductQuery } from '../features/products/queries';
import { useItemStockQuery, useRecordMovementMutation } from '../features/stock-movements/queries';
import type { MovementTarget } from '../features/stock-movements/queries';
import { WRITE_OFF_REASON_LABEL, movementKind, movementSchema, writeOffReason } from '../features/stock-movements/schema';
import type { ManualMovementKind, MovementValues } from '../features/stock-movements/schema';
import { stockFailure } from '../features/stock-receipts/queries';
import { useShellWide } from '../lib/columns';
import { failureMessage } from '../lib/errors';
import { spacing } from '../themes';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { Chip } from './chip';
import { HelperText } from './helper-text';
import { SegmentedButtons } from './segmented-buttons';
import { Text } from './text';
import { TextInput } from './text-input';

type Props = {
  productId: string;
  target: MovementTarget;
  /** The action the row's menu picked; the dialog can still switch between the three. */
  kind: ManualMovementKind;
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/stock-movement.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

type Notice = { type: 'error' | 'info'; text: string };
type FieldErrors = Partial<Record<keyof MovementValues, string[]>>;

const KIND_TITLE = {
  adjust: 'Adjust count',
  write_off: 'Write off',
  return_supplier: 'Return to supplier',
} satisfies Record<ManualMovementKind, string>;

// Keyed by the exception record_stock_movement raises; stockFailure() hands back any snake_case message.
const FAILURE_COPY = new Map([
  ['insufficient_stock', 'That is more than is left here. Enter a smaller amount.'],
  ['stock_target_too_high', 'Those units sit inside a case or an open pack. Choose the case or pack instead.'],
  ['stock_target_pack_required', 'This item is tracked by serial, so it moves one pack at a time. Choose the pack.'],
  ['receipt_has_no_supplier', 'This stock arrived with no supplier, so there is no one to return it to.'],
  ['receipt_voided', 'The receipt this stock came on has been voided.'],
  ['pack_over_capacity', 'A pack cannot hold more than its size.'],
]);

/**
 * Adjust, write off or return part of one lot, case or pack (design.md §6). record_stock_movement
 * (20260928100200_stock_receipts.sql §4) does the counting under a lock; this only states the change.
 * Finds its own lot in the item's stock query, so both callers — the Inventory detail and the sheet
 * route — pass ids alone.
 */
export function StockMovementDialog({ productId, target, kind: initialKind, inSheet, onDismiss }: Props) {
  const wide = useShellWide();
  const record = useRecordMovementMutation();
  const inFlight = record.isPending && !record.isPaused;
  const lots = useItemStockQuery({ productId }).data ?? [];
  const unit = useProductQuery({ id: productId }).data?.base_unit_name ?? 'units';

  const lot = lots.find((row) =>
    'lotId' in target
      ? row.id === target.lotId
      : 'caseId' in target
        ? row.cases.some((entry) => entry.id === target.caseId)
        : row.packs.some((entry) => entry.id === target.packId)
  );
  const where =
    'caseId' in target
      ? lot?.cases.find((entry) => entry.id === target.caseId)
      : 'packId' in target
        ? lot?.packs.find((entry) => entry.id === target.packId)
        : lot;
  const canReturn = lot?.receipt.supplier_id != null;

  const [values, setValues] = useState<MovementValues>({ kind: initialKind, qty: '', reason: '', note: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (patch: Partial<MovementValues>) => setValues((current) => ({ ...current, ...patch }));

  const failure = stockFailure(record.error);
  const notice: Notice | null = record.isPaused
    ? { type: 'info', text: 'Waiting for a connection. This finishes on its own when you reconnect.' }
    : record.isError
      ? { type: 'error', text: (failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't record this. Try again.") }
      : null;

  const submit = () => {
    const parsed = movementSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    record.mutate({ target, values: parsed.data }, { onSuccess: onDismiss });
  };

  return (
    <AdaptiveDialog
      wide={wide}
      inSheet={inSheet}
      onDismiss={onDismiss}
      dismissable={!inFlight}
      kicker={where ? `${where.code} · ${where.qty_remaining} ${unit} left` : 'Stock'}
      kickerTone={values.kind === 'adjust' ? 'accent' : 'error'}
      title={KIND_TITLE[values.kind]}
      actions={
        <>
          <Button mode="outlined" onPress={onDismiss} disabled={inFlight} contentStyle={styles.action}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={submit}
            loading={record.isPending}
            disabled={record.isPending || !where}
            contentStyle={styles.action}
          >
            {KIND_TITLE[values.kind]}
          </Button>
        </>
      }
    >
      <SegmentedButtons
        density="small"
        value={values.kind}
        onValueChange={(kind) => set({ kind: movementKind.parse(kind) })}
        buttons={[
          { value: 'adjust', label: 'Adjust' },
          { value: 'write_off', label: 'Write off' },
          { value: 'return_supplier', label: 'Return', disabled: !canReturn },
        ]}
      />

      <Text variant="labelMedium">
        {values.kind === 'adjust' ? `Change, in ${unit} (use − to remove)` : `How many ${unit} leave`}
      </Text>
      <TextInput
        mode="outlined"
        dense
        value={values.qty}
        onChangeText={(qty) => set({ qty })}
        // The number pad has no minus sign, and an adjust can be negative.
        keyboardType={values.kind === 'adjust' ? 'numbers-and-punctuation' : 'decimal-pad'}
        error={errors.qty !== undefined}
        accessibilityLabel="Quantity"
      />
      <HelperText type="error" visible={errors.qty !== undefined} padding="none">
        {errors.qty?.[0]}
      </HelperText>

      {values.kind === 'write_off' ? (
        <>
          <Text variant="labelMedium">Reason</Text>
          <View style={styles.chips}>
            {writeOffReason.options.map((reason) => (
              <Chip key={reason} compact selected={values.reason === reason} onPress={() => set({ reason })}>
                {WRITE_OFF_REASON_LABEL[reason]}
              </Chip>
            ))}
          </View>
          <HelperText type="error" visible={errors.reason !== undefined} padding="none">
            {errors.reason?.[0]}
          </HelperText>
        </>
      ) : null}

      <Text variant="labelMedium">{values.kind === 'return_supplier' ? 'Note (optional)' : 'Note'}</Text>
      <TextInput
        mode="outlined"
        dense
        multiline
        value={values.note}
        onChangeText={(note) => set({ note })}
        maxLength={500}
        error={errors.note !== undefined}
        accessibilityLabel="Note"
      />
      <HelperText type="error" visible={errors.note !== undefined} padding="none">
        {errors.note?.[0]}
      </HelperText>

      <HelperText type={notice?.type ?? 'error'} visible={notice !== null} padding="none">
        {notice?.text}
      </HelperText>
    </AdaptiveDialog>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
