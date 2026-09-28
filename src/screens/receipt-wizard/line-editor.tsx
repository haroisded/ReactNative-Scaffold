import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import {
  ControlledDate,
  ControlledSelect,
  ControlledSwitch,
  ControlledText,
  Field,
  FieldGrid,
  GroupHeading,
} from '../../components/form-fields';
import type { SelectOption } from '../../components/menu-select';
import { Text } from '../../components/text';
import { TextInput } from '../../components/text-input';
import type { StockItemOption } from '../../features/products/queries';
import { lineCost, linePacks, receiptLineSchema, serialList } from '../../features/stock-receipts/schema';
import type { ReceiptLineValues } from '../../features/stock-receipts/schema';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

/** What a line counts in: the picked item's units, or the ones typed for a new item. */
export type LineItem = { name: string; packUnit: string; baseUnit: string; unitsPerPack: number; serial: boolean };

export function lineItem(line: ReceiptLineValues, items: StockItemOption[]): LineItem | null {
  if (line.mode === 'new') {
    return {
      name: line.newName || 'New item',
      packUnit: line.newPackUnit || 'pack',
      baseUnit: line.newBaseUnit || 'unit',
      unitsPerPack: Number(line.newUnitsPerPack) || 1,
      serial: line.newSerialTracked,
    };
  }
  const item = items.find((row) => row.id === line.productId);
  if (!item) return null;
  return {
    name: item.name,
    packUnit: item.pack_unit_name ?? 'pack',
    baseUnit: item.base_unit_name ?? 'unit',
    unitsPerPack: item.conversion_factor ?? 1,
    serial: item.serial_tracked,
  };
}

/** "3 cases × 12 box + 4 pcs", "12 box". */
export function lineSummary(line: ReceiptLineValues, item: LineItem | null) {
  const packUnit = item?.packUnit ?? 'pack';
  const packs = line.useCases ? `${line.cases} cases × ${line.packsPerCase} ${packUnit}` : `${line.packs || 0} ${packUnit}`;
  const loose = Number(line.looseUnits || 0);
  return loose > 0 ? `${packs} + ${loose} ${item?.baseUnit ?? 'unit'}` : packs;
}

type Props = {
  currency: string;
  items: StockItemOption[];
  /** The line being edited, or emptyReceiptLine for a new one. */
  initial: ReceiptLineValues;
  onSave: (line: ReceiptLineValues) => void;
  onCancel: () => void;
};

/**
 * One receipt line (design.md §3). Its own form, so a half-typed line never reaches the receipt: the
 * wizard holds only lines that passed here. receiptLineSchema checks the shape; what depends on the item
 * — serials against packs — is checked in submit(), and save_receipt checks all of it again.
 */
export function LineEditor({ currency, items, initial, onSave, onCancel }: Props) {
  const { colors } = useAppTheme();
  const form = useForm<ReceiptLineValues>({
    resolver: zodResolver(receiptLineSchema),
    defaultValues: initial,
    mode: 'onTouched',
  });
  // SAFETY: defaultValues is a whole line and nothing unregisters a field, so the watched object is whole;
  // useWatch types it DeepPartial only because it cannot know that.
  const line = useWatch({ control: form.control }) as ReceiptLineValues;
  const item = lineItem(line, items);
  const serial = item?.serial ?? false;
  const packs = linePacks(line);
  const cost = item ? lineCost(line, item.unitsPerPack) : Number.NaN;

  const submit = form.handleSubmit((values) => {
    const issue = serial ? serialIssue(values) : null;
    if (issue) form.setError(issue[0], { message: issue[1] });
    else onSave(values);
  });

  const money = currencySymbol(currency);
  const options = items.map((row) => ({ value: row.id, label: row.sku ? `${row.name} · ${row.sku}` : row.name }));

  return (
    <View style={[styles.card, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
      <FieldGrid>
        <ItemFields form={form} line={line} item={item} options={options} />
      </FieldGrid>

      <GroupHeading title="Quantity and cost" />
      <FieldGrid>
        <ControlledSwitch
          control={form.control}
          name="useCases"
          label="Cases"
          span="full"
          on="Received in cases"
          off={`Received as ${item?.packUnit ?? 'pack'}`}
        />
        {line.useCases ? (
          <CaseFields form={form} item={item} money={money} />
        ) : (
          <>
            <ControlledText control={form.control} name="packs" label={item?.packUnit ?? 'Packs'} required keyboardType="number-pad" />
            <ControlledText
              control={form.control}
              name="costPerPack"
              label={`Cost per ${item?.packUnit ?? 'pack'}`}
              required
              keyboardType="decimal-pad"
              prefix={money}
            />
          </>
        )}
        {serial ? null : (
          <ControlledText
            control={form.control}
            name="looseUnits"
            label={`Loose ${item?.baseUnit ?? 'units'}`}
            hint="Makes one partial pack"
            keyboardType="decimal-pad"
          />
        )}
      </FieldGrid>

      {serial ? (
        <FieldGrid>
          <ControlledText
            control={form.control}
            name="serials"
            label="Serials"
            required
            span="full"
            hint={`${serialList(line.serials).length} of ${packs}, one per line`}
            multiline
          />
        </FieldGrid>
      ) : null}

      <GroupHeading title="Lot" />
      <FieldGrid>
        <ControlledText control={form.control} name="lotCode" label="Lot number" hint="Blank makes one" maxLength={64} />
        <ControlledDate control={form.control} name="expiresOn" label="Expires on" clearable />
        <ControlledText control={form.control} name="location" label="Location" maxLength={120} />
        <ControlledText control={form.control} name="notes" label="Notes" span="full" multiline maxLength={2000} />
      </FieldGrid>

      <View style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
        <Text variant="titleMedium" style={styles.fill}>
          {Number.isFinite(cost) ? formatMoney(cost, currency) : '—'}
        </Text>
        <Button mode="text" onPress={onCancel}>
          Cancel
        </Button>
        <Button mode="contained" icon="check" onPress={() => void submit()}>
          Save line
        </Button>
      </View>
    </View>
  );
}

type FormProps = { form: UseFormReturn<ReceiptLineValues>; item: LineItem | null };

/** The item a line receives: one picked from Inventory, or a new one typed here. */
function ItemFields({ form, line, item, options }: FormProps & { line: ReceiptLineValues; options: SelectOption[] }) {
  const { colors } = useAppTheme();

  return (
    <>
      {line.mode === 'existing' ? (
        <ControlledSelect
          control={form.control}
          name="productId"
          label="Item"
          required
          span="full"
          options={options}
          placeholder="Choose an item"
          createLabel="New item"
          onCreate={() => form.setValue('mode', 'new')}
        />
      ) : (
        <>
          <Field label="New item" span="full" action={{ label: 'Pick existing', onPress: () => form.setValue('mode', 'existing') }}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
              Created with this receipt as a stock item. Make it sellable later from Inventory.
            </Text>
          </Field>
          <ControlledText control={form.control} name="newName" label="Name" required span="full" maxLength={120} />
          <ControlledText control={form.control} name="newPackUnit" label="Pack unit" placeholder="box" maxLength={20} />
          <ControlledText control={form.control} name="newBaseUnit" label="Base unit" placeholder="pcs" maxLength={20} />
          <ControlledText
            control={form.control}
            name="newUnitsPerPack"
            label="Units per pack"
            required
            keyboardType="decimal-pad"
          />
          <ControlledSwitch
            control={form.control}
            name="newSerialTracked"
            label="Serial numbers"
            on="Each pack has a serial"
            off="No serials"
          />
        </>
      )}

      {line.mode === 'existing' && item ? (
        <Field label="Counted in" span="full">
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
            {`1 ${item.packUnit} = ${item.unitsPerPack} ${item.baseUnit}${item.serial ? ' · serial-tracked' : ''}`}
          </Text>
        </Field>
      ) : null}
    </>
  );
}

/** Received in cases, with the pallet calculator that fills Cases. */
function CaseFields({ form, item, money }: FormProps & { money: string }) {
  // The calculator's inputs; nothing else reads them, so they are not part of the line.
  const [pallets, setPallets] = useState('');
  const [casesPerPallet, setCasesPerPallet] = useState('');
  const fillCases = (nextPallets: string, nextPerPallet: string) => {
    setPallets(nextPallets);
    setCasesPerPallet(nextPerPallet);
    const total = Number(nextPallets) * Number(nextPerPallet);
    if (total > 0) form.setValue('cases', String(total), { shouldDirty: true, shouldValidate: true });
  };

  return (
    <>
      <Field label="Pallets" hint="Optional">
        <TextInput
          mode="outlined"
          dense
          value={pallets}
          onChangeText={(value) => fillCases(value, casesPerPallet)}
          keyboardType="number-pad"
          accessibilityLabel="Pallets"
        />
      </Field>
      <Field label="Cases per pallet" hint="Fills Cases">
        <TextInput
          mode="outlined"
          dense
          value={casesPerPallet}
          onChangeText={(value) => fillCases(pallets, value)}
          keyboardType="number-pad"
          accessibilityLabel="Cases per pallet"
        />
      </Field>
      <ControlledText control={form.control} name="cases" label="Cases" required keyboardType="number-pad" />
      <ControlledText
        control={form.control}
        name="packsPerCase"
        label={`${item?.packUnit ?? 'Packs'} per case`}
        required
        keyboardType="number-pad"
      />
      <ControlledText
        control={form.control}
        name="costPerCase"
        label="Cost per case"
        required
        keyboardType="decimal-pad"
        prefix={money}
      />
      <ControlledText control={form.control} name="sscc" label="SSCC" maxLength={64} />
    </>
  );
}

/** A serial-tracked item arrives in whole packs, one serial each. */
function serialIssue(values: ReceiptLineValues): ['looseUnits' | 'serials', string] | null {
  if (Number(values.looseUnits || 0) > 0) return ['looseUnits', 'A serial-tracked item arrives in whole packs only.'];
  const count = serialList(values.serials).length;
  const needed = linePacks(values);
  return count === needed ? null : ['serials', `Enter one serial per pack: ${needed} needed, ${count} entered.`];
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.ms, borderTopWidth: 1 },
});
