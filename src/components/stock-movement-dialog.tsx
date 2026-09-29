import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as z from 'zod';

import { useProductQuery } from '../features/products/queries';
import { useItemStockQuery, useRecordMovementMutation } from '../features/stock-movements/queries';
import { WRITE_OFF_REASON_LABEL, movementKind, movementSchema, writeOffReason } from '../features/stock-movements/schema';
import type { ManualMovementKind, MovementValues, WriteOffReason } from '../features/stock-movements/schema';
import { stockFailure } from '../features/stock-receipts/queries';
import { useShellWide } from '../lib/columns';
import { failureMessage, mutationNotice } from '../lib/errors';
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
  packId: string;
  /** The action the row's menu picked; the dialog can still switch between the three. */
  kind: ManualMovementKind;
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/stock-movement.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

type FieldErrors = Partial<Record<keyof MovementValues, string[]>>;

const KIND_TITLE = {
  adjust: 'Adjust count',
  write_off: 'Write off',
  return_supplier: 'Return to supplier',
} satisfies Record<ManualMovementKind, string>;

// Keyed by the exception record_stock_movement raises; stockFailure() hands back any snake_case message.
const FAILURE_COPY = new Map([
  ['insufficient_stock', 'That is more than is left here. Enter a smaller amount.'],
  ['receipt_has_no_supplier', 'This stock was added in Inventory, with no supplier to return it to.'],
  ['receipt_voided', 'The receipt this stock came on has been voided.'],
  ['pack_over_capacity', 'A pack cannot hold more than its size.'],
]);

/**
 * Adjust, write off or return part of one pack. record_stock_movement (20260929100100_stock_ledger.sql §5)
 * does the counting under a lock; this only states the change. Finds its own pack in the item's stock
 * query, so both callers — the Inventory detail and the sheet route — pass ids alone.
 */
export function StockMovementDialog({ productId, packId, kind: initialKind, inSheet, onDismiss }: Props) {
  const wide = useShellWide();
  const record = useRecordMovementMutation();
  const inFlight = record.isPending && !record.isPaused;
  const lots = useItemStockQuery({ productId }).data?.lots ?? [];
  const unit = useProductQuery({ id: productId }).data?.base_unit_name ?? 'units';

  const lot = lots.find((row) => row.packs.some((entry) => entry.id === packId));
  const where = lot?.packs.find((entry) => entry.id === packId);
  // Only stock that came on a receipt has a supplier to go back to.
  const canReturn = lot?.source === 'stock';

  const [values, setValues] = useState<MovementValues>({ kind: initialKind, qty: '', reason: '', note: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (patch: Partial<MovementValues>) => setValues((current) => ({ ...current, ...patch }));

  const notice = mutationNotice(record, movementFailure(record.error));

  const submit = () => {
    const parsed = movementSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    record.mutate({ packId, values: parsed.data }, { onSuccess: onDismiss });
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

      <MovementFields unit={unit} values={values} errors={errors} onChange={set} />

      <HelperText type={notice?.type ?? 'error'} visible={notice !== null} padding="none">
        {notice?.text}
      </HelperText>
    </AdaptiveDialog>
  );
}

/** Quantity, the write-off reason, and the note — each with the error submit found in it. */
function MovementFields({
  unit,
  values,
  errors,
  onChange: set,
}: {
  unit: string;
  values: MovementValues;
  errors: FieldErrors;
  onChange: (patch: Partial<MovementValues>) => void;
}) {
  return (
    <>
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

      {values.kind === 'write_off' ? <ReasonChips value={values.reason} error={errors.reason?.[0]} onChange={(reason) => set({ reason })} /> : null}

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
    </>
  );
}

function ReasonChips({ value, error, onChange }: { value: string; error?: string; onChange: (reason: WriteOffReason) => void }) {
  return (
    <>
      <Text variant="labelMedium">Reason</Text>
      <View style={styles.chips}>
        {writeOffReason.options.map((reason) => (
          <Chip key={reason} compact selected={value === reason} onPress={() => onChange(reason)}>
            {WRITE_OFF_REASON_LABEL[reason]}
          </Chip>
        ))}
      </View>
      <HelperText type="error" visible={error !== undefined} padding="none">
        {error}
      </HelperText>
    </>
  );
}

function movementFailure(error: Error | null) {
  const failure = stockFailure(error);
  return (failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't record this. Try again.");
}

const styles = StyleSheet.create({
  action: { justifyContent: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
